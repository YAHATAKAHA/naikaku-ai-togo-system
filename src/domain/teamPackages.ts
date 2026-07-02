import { cabinetStages, executorProfiles } from "../data/defaultCabinet";
import { dataClassificationLabels, dataResidencyLabels } from "./dataAccessPolicy";
import type {
  AutomationAction,
  CabinetRole,
  CabinetRun,
  CabinetStageId,
  CabinetWorkspace,
  TeamHandoff,
  TeamPackageStatus,
  TeamWorkPackage
} from "./types";

type TeamPackageSummaryCounts = Pick<
  TeamHandoff["summary"],
  "ready" | "needsApproval" | "blocked" | "templates"
>;

const stageOrder: CabinetStageId[] = [
  "intake",
  "planning",
  "execution",
  "critique",
  "supervision",
  "scoring",
  "iteration"
];

const stageTasks: Record<CabinetStageId, string[]> = {
  intake: [
    "Keep the mission brief concrete and measurable.",
    "Confirm role ownership and evidence gates before execution begins."
  ],
  planning: [
    "Break the mission into milestones that can be tested independently.",
    "Keep owners, risks, and acceptance gates visible to downstream teams."
  ],
  execution: [
    "Implement only bounded tasks that have a clear rollback path.",
    "Attach command output, diffs, screenshots, or logs as evidence."
  ],
  critique: [
    "Challenge missing evidence, weak assumptions, and fragile UX paths.",
    "Return actionable findings with severity and reproduction notes."
  ],
  supervision: [
    "Check sandbox scope, approval records, and prompt-injection exposure.",
    "Block unsafe tool paths until policy and audit evidence are present."
  ],
  scoring: [
    "Score readiness, safety, execution quality, and critique coverage.",
    "Explain revise or block decisions with direct evidence."
  ],
  iteration: [
    "Record reusable lessons, rejected decisions, and next-cycle tasks.",
    "Keep retained memory reviewable and consent-tagged."
  ]
};

export function buildTeamHandoff({
  workspace,
  run,
  generatedAt = new Date().toISOString()
}: {
  workspace: CabinetWorkspace;
  run?: CabinetRun | null;
  generatedAt?: string;
}): TeamHandoff {
  const roles = workspace.roles.filter((role) => role.enabled);
  const packages = roles.map((role) =>
    buildTeamWorkPackage({
      role,
      workspace,
      run,
      generatedAt
    })
  );
  const summary = packages.reduce<TeamPackageSummaryCounts>((next, workPackage) => {
    const key = summaryKey(workPackage.status);
    return {
      ...next,
      [key]: next[key] + 1
    };
  }, {
    ready: 0,
    needsApproval: 0,
    blocked: 0,
    templates: 0
  });

  return {
    schema: "naikaku.team-handoff.v1",
    generatedAt,
    mission: run?.mission || workspace.mission,
    runId: run?.id,
    packages,
    summary: {
      roles: packages.length,
      ...summary,
      tracks: Array.from(new Set(packages.map((workPackage) => workPackage.ministry)))
    }
  };
}

export function serializeTeamHandoff(handoff: TeamHandoff) {
  return JSON.stringify(handoff, null, 2);
}

function buildTeamWorkPackage({
  role,
  workspace,
  run,
  generatedAt
}: {
  role: CabinetRole;
  workspace: CabinetWorkspace;
  run?: CabinetRun | null;
  generatedAt: string;
}): TeamWorkPackage {
  const stage = cabinetStages.find((candidate) => candidate.id === role.stage);
  const artifact = run?.artifacts.find((candidate) => candidate.roleId === role.id);
  const actions = (run?.automationActions || []).filter((action) => action.roleId === role.id);
  const executor = executorProfiles.find((candidate) => candidate.id === role.executorProfileId);

  return {
    id: `${role.id}-work-package`,
    roleId: role.id,
    roleName: role.name,
    ministry: role.ministry,
    stageId: role.stage,
    mission: run?.mission || workspace.mission,
    status: packageStatus(run || null, actions),
    provider: {
      ...role.provider,
      apiKeyAlias: role.provider.apiKeyAlias.trim()
    },
    executorProfileId: role.executorProfileId,
    permissions: role.permissions,
    dataAccess: role.dataAccess,
    objectives: [
      role.mandate,
      stage?.objective || "Own the assigned cabinet responsibility.",
      artifact?.title || "Prepare the role implementation path."
    ],
    tasks: packageTasks(role.stage, actions),
    acceptanceCriteria: acceptanceCriteria(role, actions),
    dependencies: packageDependencies(role, workspace.roles),
    deliverables: [
      `docs/team-packages/${role.id}.md`,
      `src/${role.stage}/${role.id}`,
      `${role.provider.apiKeyAlias.trim() || "ROLE_API_KEY_ALIAS"} configured outside exported JSON`
    ],
    securityNotes: [
      "Use provider aliases only; never place raw API keys in workspace exports.",
      `Executor boundary: ${executor?.label || role.executorProfileId}.`,
      `Data access: allowed ${classificationList(role.dataAccess.allowedClassifications)}; denied ${classificationList(role.dataAccess.deniedClassifications)}; residency ${dataResidencyLabels[role.dataAccess.defaultResidency]}.`,
      role.permissions.requiresApprovalForHighImpact
        ? "High-impact actions must keep explicit human approval."
        : "Review whether high-impact approval should be enabled before production."
    ],
    automationActionIds: actions.map((action) => action.id),
    sourceRunId: run?.id,
    generatedAt
  };
}

function packageTasks(stageId: CabinetStageId, actions: AutomationAction[]) {
  const actionTasks = actions.map((action) =>
    `${action.title}: ${action.action} -> ${action.target}`
  );
  return [...stageTasks[stageId], ...actionTasks];
}

function acceptanceCriteria(role: CabinetRole, actions: AutomationAction[]) {
  const criteria = [
    `${role.name} can validate provider ${role.provider.provider}/${role.provider.model} through the local gateway.`,
    "No raw session secret appears in exported workspace or team package JSON.",
    "Every produced artifact links to run evidence, tests, screenshots, or audit logs."
  ];

  if (actions.some((action) => action.status === "needs-approval")) {
    criteria.push("Approval-gated actions show an explicit decision before executor handoff.");
  }

  if (actions.some((action) => action.status === "blocked")) {
    criteria.push("Blocked actions include a policy reason and do not reach executor-ready state.");
  }

  return criteria;
}

function packageDependencies(role: CabinetRole, roles: CabinetRole[]) {
  const roleStageIndex = stageOrder.indexOf(role.stage);
  if (roleStageIndex <= 0) {
    return ["Mission owner approval"];
  }

  const upstreamStages = new Set(stageOrder.slice(0, roleStageIndex));
  return roles
    .filter((candidate) => candidate.enabled && upstreamStages.has(candidate.stage))
    .map((candidate) => `${candidate.name} (${candidate.ministry})`);
}

function classificationList(classifications: CabinetRole["dataAccess"]["allowedClassifications"]) {
  return classifications.length
    ? classifications.map((classification) => dataClassificationLabels[classification]).join(", ")
    : "none";
}

function packageStatus(
  run: CabinetRun | null,
  actions: AutomationAction[]
): TeamPackageStatus {
  if (!run || actions.length === 0) {
    return "template";
  }

  if (actions.some((action) => action.status === "blocked")) {
    return "blocked";
  }

  if (actions.some((action) => action.status === "needs-approval")) {
    return "needs-approval";
  }

  return "ready";
}

function summaryKey(status: TeamPackageStatus): keyof TeamPackageSummaryCounts {
  if (status === "needs-approval") return "needsApproval";
  if (status === "template") return "templates";
  return status;
}
