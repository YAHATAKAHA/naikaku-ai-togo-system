import type {
  AutomationActionStatus,
  CabinetRole,
  ExecutorProfile,
  ExecutorProfileId,
  RiskLevel,
  SandboxCapabilityAction,
  SandboxCapabilityCard,
  SandboxCapabilityRegistry,
  SandboxCapabilityStatus,
  SandboxPolicy
} from "./types";
import { evaluateSandboxAction } from "./sandboxPolicy";

interface CapabilityActionTemplate {
  action: string;
  label: string;
  target: string;
  riskLevel: RiskLevel;
}

interface BuildSandboxCapabilityRegistryInput {
  profiles: ExecutorProfile[];
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
  generatedAt?: string;
}

const actionTemplates: Record<ExecutorProfileId, CapabilityActionTemplate[]> = {
  "browser-sandbox": [
    {
      action: "open_url",
      label: "Open approved research URL",
      target: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
      riskLevel: "low"
    },
    {
      action: "submit_form",
      label: "Submit reviewed browser form",
      target: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system/issues",
      riskLevel: "high"
    }
  ],
  "desktop-vm": [
    {
      action: "open_app",
      label: "Open disposable desktop app",
      target: "vm://desktop/app",
      riskLevel: "medium"
    },
    {
      action: "install_software",
      label: "Install package inside VM image",
      target: "vm://desktop/package",
      riskLevel: "high"
    }
  ],
  "shell-container": [
    {
      action: "run_shell",
      label: "Run bounded verification command",
      target: "/workspace:npm run test",
      riskLevel: "high"
    },
    {
      action: "write_file",
      label: "Write sandbox artifact",
      target: "/tmp/naikaku/executor-artifact.json",
      riskLevel: "medium"
    }
  ],
  "mcp-proxy": [
    {
      action: "call_mcp_tool",
      label: "Call scoped MCP tool",
      target: "mcp://github/issues",
      riskLevel: "high"
    },
    {
      action: "write_memory",
      label: "Prepare reviewed memory proposal",
      target: "/tmp/naikaku/memory-proposal.json",
      riskLevel: "medium"
    }
  ],
  "human-approval": [
    {
      action: "request_approval",
      label: "Request exact payload approval",
      target: "human://mission-owner/approval",
      riskLevel: "medium"
    },
    {
      action: "deploy_production",
      label: "Review blocked production deployment",
      target: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system/actions",
      riskLevel: "critical"
    }
  ]
};

const runnerContracts: Record<ExecutorProfileId, string> = {
  "browser-sandbox": "Browser runner accepts URL actions, emits screenshots, DOM/action replay, and never shares host cookies by default.",
  "desktop-vm": "Desktop runner accepts keyboard, mouse, and screenshot actions inside a disposable VM identity with a server-side kill switch.",
  "shell-container": "Shell runner accepts allowlisted commands in scoped mounts, empty environment, bounded CPU/memory/time, and artifact export only.",
  "mcp-proxy": "MCP runner accepts schema-validated tool calls with per-tool credential scope, rate limits, and audited request/response hashes.",
  "human-approval": "Approval runner records exact payload preview, operator decision, timestamp, and timeout before any high-impact handoff proceeds."
};

const evidenceByProfile: Record<ExecutorProfileId, string[]> = {
  "browser-sandbox": ["Screenshot", "URL log", "DOM action replay"],
  "desktop-vm": ["Screenshot stream", "Keyboard/mouse log", "VM snapshot id"],
  "shell-container": ["Command transcript", "Exit code", "Artifact manifest"],
  "mcp-proxy": ["Tool schema", "Credential scope", "Response checksum"],
  "human-approval": ["Payload preview", "Operator identity", "Decision record"]
};

export function buildSandboxCapabilityRegistry({
  profiles,
  roles,
  sandboxPolicy,
  generatedAt = new Date().toISOString()
}: BuildSandboxCapabilityRegistryInput): SandboxCapabilityRegistry {
  const cards = profiles.map((profile) =>
    buildCapabilityCard({
      profile,
      roles,
      sandboxPolicy
    })
  );

  return {
    schema: "naikaku.sandbox-capabilities.v1",
    generatedAt,
    cards,
    summary: summarizeCards(cards, sandboxPolicy.killSwitchArmed)
  };
}

export function serializeSandboxCapabilityRegistry(registry: SandboxCapabilityRegistry) {
  return JSON.stringify(registry, null, 2);
}

function buildCapabilityCard({
  profile,
  roles,
  sandboxPolicy
}: {
  profile: ExecutorProfile;
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
}): SandboxCapabilityCard {
  const actions = (actionTemplates[profile.id] || []).map((template) =>
    evaluateCapabilityAction({
      profileId: profile.id,
      template,
      sandboxPolicy
    })
  );
  const rolesUsingProfile = roles
    .filter((role) => role.enabled && role.executorProfileId === profile.id)
    .map((role) => ({
      roleId: role.id,
      roleName: role.name
    }));
  const status = capabilityStatus(actions, sandboxPolicy.killSwitchArmed);

  return {
    profileId: profile.id,
    label: profile.label,
    purpose: profile.purpose,
    isolation: profile.isolation,
    controls: profile.controls,
    runnerContract: runnerContracts[profile.id],
    evidenceRequired: evidenceByProfile[profile.id],
    rolesUsingProfile,
    actions,
    status,
    riskNotes: riskNotes(profile.id, status, rolesUsingProfile.length)
  };
}

function evaluateCapabilityAction({
  profileId,
  template,
  sandboxPolicy
}: {
  profileId: ExecutorProfileId;
  template: CapabilityActionTemplate;
  sandboxPolicy: SandboxPolicy;
}): SandboxCapabilityAction {
  const decision = evaluateSandboxAction(
    {
      executorProfileId: profileId,
      action: template.action,
      target: template.target,
      risk: template.riskLevel
    },
    sandboxPolicy
  );
  const status = actionStatus(decision.allowed, decision.approvalRequired);

  return {
    action: template.action,
    label: template.label,
    target: template.target,
    riskLevel: template.riskLevel,
    status,
    approvalRequired: decision.approvalRequired,
    reason: decision.reason,
    auditTags: decision.auditTags
  };
}

function actionStatus(
  allowed: boolean,
  approvalRequired: boolean
): AutomationActionStatus {
  if (!allowed) return "blocked";
  return approvalRequired ? "needs-approval" : "allowed";
}

function capabilityStatus(
  actions: SandboxCapabilityAction[],
  killSwitchArmed: boolean
): SandboxCapabilityStatus {
  if (!killSwitchArmed || actions.every((action) => action.status === "blocked")) {
    return "blocked";
  }

  if (actions.some((action) => action.status === "needs-approval" || action.status === "blocked")) {
    return "needs-approval";
  }

  return "dry-run-ready";
}

function riskNotes(
  profileId: ExecutorProfileId,
  status: SandboxCapabilityStatus,
  roleCount: number
) {
  const notes: string[] = [];

  if (roleCount === 0) {
    notes.push("No enabled role currently routes to this profile.");
  }

  if (status === "blocked") {
    notes.push("Runner handoff is blocked until policy and kill switch state are corrected.");
  }

  if (status === "needs-approval") {
    notes.push("At least one representative action needs human approval or is policy-blocked.");
  }

  if (profileId === "desktop-vm") {
    notes.push("Desktop control must run in a disposable VM, never the operator host.");
  }

  if (profileId === "shell-container") {
    notes.push("Shell commands require scoped mounts and an empty environment by default.");
  }

  return notes.length ? notes : ["Representative actions are dry-run ready under current policy."];
}

function summarizeCards(
  cards: SandboxCapabilityCard[],
  killSwitchArmed: boolean
): SandboxCapabilityRegistry["summary"] {
  const rolesCovered = new Set(
    cards.flatMap((card) => card.rolesUsingProfile.map((role) => role.roleId))
  ).size;

  return cards.reduce<SandboxCapabilityRegistry["summary"]>((summary, card) => ({
    profiles: summary.profiles + 1,
    rolesCovered,
    dryRunReady: summary.dryRunReady + (card.status === "dry-run-ready" ? 1 : 0),
    needsApproval: summary.needsApproval + (card.status === "needs-approval" ? 1 : 0),
    blocked: summary.blocked + (card.status === "blocked" ? 1 : 0),
    approvalActions:
      summary.approvalActions +
      card.actions.filter((action) => action.status === "needs-approval").length,
    blockedActions:
      summary.blockedActions +
      card.actions.filter((action) => action.status === "blocked").length,
    killSwitchArmed
  }), {
    profiles: 0,
    rolesCovered,
    dryRunReady: 0,
    needsApproval: 0,
    blocked: 0,
    approvalActions: 0,
    blockedActions: 0,
    killSwitchArmed
  });
}
