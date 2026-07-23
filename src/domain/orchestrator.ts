import { cabinetStages } from "../data/defaultCabinet";
import type {
  CabinetArtifact,
  CabinetLogEntry,
  CabinetRole,
  CabinetRun,
  CabinetScore,
  CabinetStageId,
  RiskLevel,
  SandboxPolicy
} from "./types";
import { buildAutomationPlan } from "./automation";

const riskWeight: Record<RiskLevel, number> = {
  low: 0,
  medium: 8,
  high: 16,
  critical: 24
};

export interface RunCabinetMissionInput {
  mission: string;
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
}

export function runCabinetMission(input: RunCabinetMissionInput): CabinetRun {
  const mission = input.mission.trim();
  const startedAt = new Date().toISOString();
  const activeRoles = input.roles.filter((role) => role.enabled);
  const artifacts = cabinetStages.map((stage, index) =>
    buildArtifact({
      stageId: stage.id,
      mission,
      roles: activeRoles,
      sandboxPolicy: input.sandboxPolicy,
      index
    })
  );
  const logs = buildLogs(mission, artifacts, input.sandboxPolicy);
  const score = scoreCabinetRun(artifacts, activeRoles, input.sandboxPolicy);

  const run: CabinetRun = {
    id: `run-${startedAt}`,
    mission,
    startedAt,
    completedAt: new Date().toISOString(),
    artifacts,
    logs,
    score,
    nextIteration: buildNextIteration(score, artifacts)
  };

  return {
    ...run,
    automationActions: buildAutomationPlan({
      run,
      roles: activeRoles,
      sandboxPolicy: input.sandboxPolicy
    })
  };
}

export function scoreCabinetRun(
  artifacts: CabinetArtifact[],
  roles: CabinetRole[],
  sandboxPolicy: SandboxPolicy
): CabinetScore {
  const enabledStageCoverage = new Set(roles.map((role) => role.stage)).size;
  const coverageScore = Math.min(100, 50 + enabledStageCoverage * 8);
  const averageImpact =
    artifacts.reduce((sum, artifact) => sum + artifact.scoreImpact, 0) /
    Math.max(1, artifacts.length);
  const highestRiskPenalty = Math.max(
    ...roles.map((role) => riskWeight[role.riskLevel]),
    0
  );
  const sandboxBonus =
    sandboxPolicy.killSwitchArmed && sandboxPolicy.requireHumanApproval ? 12 : -10;
  const allowlistBonus =
    sandboxPolicy.networkAllowlist.length > 0 && sandboxPolicy.blockedActions.length > 0
      ? 8
      : -8;
  const unavailableLiveArtifacts = artifacts.filter(
    (artifact) => artifact.providerStatus === "skipped" || artifact.providerStatus === "failed"
  ).length;
  const providerPenalty = unavailableLiveArtifacts * 12;

  const readiness = clamp(Math.round(coverageScore + averageImpact / 3 - providerPenalty));
  const safety = clamp(88 + sandboxBonus + allowlistBonus - highestRiskPenalty);
  const execution = clamp(
    60 +
      roles.filter((role) => role.permissions.canUseFiles || role.permissions.canUseShell).length * 7 -
      providerPenalty * 2
  );
  const critique = clamp(
    65 +
      roles.filter((role) => role.stage === "critique" || role.stage === "supervision").length * 11 -
      providerPenalty
  );
  const overall = clamp(Math.round((readiness + safety + execution + critique) / 4));
  const decision =
    safety < 70
      ? "block"
      : unavailableLiveArtifacts > 0
        ? "revise"
        : overall >= 84
          ? "ship"
          : "revise";

  return {
    readiness,
    safety,
    execution,
    critique,
    overall,
    decision
  };
}

function buildArtifact({
  stageId,
  mission,
  roles,
  sandboxPolicy,
  index
}: {
  stageId: CabinetStageId;
  mission: string;
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
  index: number;
}): CabinetArtifact {
  const stage = cabinetStages.find((candidate) => candidate.id === stageId)!;
  const role =
    roles.find((candidate) => candidate.id === stage.ownerRoleId) ||
    roles.find((candidate) => candidate.stage === stageId) ||
    roles[0];

  const riskLevel = role?.riskLevel || "medium";
  const providerLine = role
    ? `${role.provider.provider}/${role.provider.model}`
    : "unassigned/mock";
  const executorLine = role
    ? role.executorProfileId
    : sandboxPolicy.defaultExecutorProfileId;

  return {
    id: `${stageId}-${index}`,
    stageId,
    roleId: role?.id || "unassigned",
    title: `${stage.label}: ${stage.objective}`,
    body: [
      `Mission focus: ${mission || "No mission entered."}`,
      `Owner: ${role?.name || "Unassigned"} using ${providerLine}.`,
      `Executor boundary: ${executorLine}.`,
      stageSpecificOutput(stageId, sandboxPolicy)
    ].join("\n"),
    riskLevel,
    scoreImpact: 16 - riskWeight[riskLevel] / 4 + index
  };
}

function stageSpecificOutput(stageId: CabinetStageId, sandboxPolicy: SandboxPolicy) {
  switch (stageId) {
    case "intake":
      return "Agenda created with explicit deliverable, role ownership, and evidence gates.";
    case "planning":
      return "Plan split into UI, orchestration, provider adapters, sandbox runners, memory, and audit streams.";
    case "execution":
      return `Execution constrained by ${sandboxPolicy.defaultExecutorProfileId}, ${sandboxPolicy.networkAllowlist.length} network allowlist entries, and ${sandboxPolicy.blockedActions.length} blocked actions.`;
    case "critique":
      return "Critique requires proof from tests, screenshots, logs, and policy checks before accepting output.";
    case "supervision":
      return sandboxPolicy.killSwitchArmed
        ? "Kill switch is armed and high-impact actions require human approval."
        : "Warning: kill switch is not armed.";
    case "scoring":
      return "Scoring combines readiness, execution quality, critique coverage, and safety posture.";
    case "iteration":
      return "Lessons are recorded as reusable skills, rejected decisions, and next-cycle tasks.";
    default:
      return "Stage completed.";
  }
}

function buildLogs(
  mission: string,
  artifacts: CabinetArtifact[],
  sandboxPolicy: SandboxPolicy
): CabinetLogEntry[] {
  const now = Date.now();
  const baseLogs: CabinetLogEntry[] = [
    {
      id: "log-mission-accepted",
      timestamp: new Date(now).toISOString(),
      level: mission ? "success" : "warning",
      message: mission
        ? "Mission accepted by Prime Minister."
        : "Mission is empty; cabinet produced a structural dry run."
    },
    {
      id: "log-sandbox",
      timestamp: new Date(now + 1000).toISOString(),
      level: sandboxPolicy.killSwitchArmed ? "success" : "error",
      message: sandboxPolicy.killSwitchArmed
        ? "Sandbox kill switch armed."
        : "Sandbox kill switch is not armed."
    }
  ];

  return [
    ...baseLogs,
    ...artifacts.map((artifact, index) => ({
      id: `log-${artifact.stageId}`,
      timestamp: new Date(now + (index + 2) * 1000).toISOString(),
      level: artifact.riskLevel === "critical" ? "warning" : "info",
      message: `${artifact.title} completed by ${artifact.roleId}.`
    }) satisfies CabinetLogEntry)
  ];
}

function buildNextIteration(score: CabinetScore, artifacts: CabinetArtifact[]) {
  const tasks = [
    "Wire real provider adapters behind the existing ProviderConfig contract.",
    "Connect sandbox gateway to Browser Sandbox, Desktop VM, and Shell Container executors.",
    "Add durable audit storage for artifacts, logs, approvals, and score history."
  ];

  if (score.decision === "block") {
    tasks.unshift("Resolve safety blockers before any external action is allowed.");
  }

  if (artifacts.some((artifact) => artifact.riskLevel === "critical")) {
    tasks.push("Require two-step approval for critical roles before they execute tools.");
  }

  return tasks;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
