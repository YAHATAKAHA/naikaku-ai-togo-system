import type {
  AutomationActionStatus,
  CabinetRole,
  ExecutorProfile,
  ExecutorProfileId,
  RiskLevel,
  SandboxCapabilityAction,
  SandboxCapabilityCard,
  SandboxCapabilityReadinessCheck,
  SandboxCapabilityRunnerReadiness,
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
  const runnerReadiness = buildRunnerReadiness({
    profile,
    actions,
    status,
    rolesUsingProfile,
    sandboxPolicy
  });

  return {
    profileId: profile.id,
    label: profile.label,
    purpose: profile.purpose,
    isolation: profile.isolation,
    controls: profile.controls,
    runnerContract: runnerContracts[profile.id],
    evidenceRequired: evidenceByProfile[profile.id],
    rolesUsingProfile,
    runnerReadiness,
    actions,
    status,
    riskNotes: riskNotes(profile.id, runnerReadiness, rolesUsingProfile.length)
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

function buildRunnerReadiness({
  profile,
  actions,
  status,
  rolesUsingProfile,
  sandboxPolicy
}: {
  profile: ExecutorProfile;
  actions: SandboxCapabilityAction[];
  status: SandboxCapabilityStatus;
  rolesUsingProfile: SandboxCapabilityCard["rolesUsingProfile"];
  sandboxPolicy: SandboxPolicy;
}): SandboxCapabilityRunnerReadiness {
  const requiredApprovals = actions
    .filter((action) => action.status === "needs-approval")
    .map((action) => `${action.action}: ${action.reason}`);
  const blockedReasons = actions
    .filter((action) => action.status === "blocked")
    .map((action) => `${action.action}: ${action.reason}`);
  const checks: SandboxCapabilityReadinessCheck[] = [
    {
      id: "kill-switch",
      label: "Kill switch",
      status: sandboxPolicy.killSwitchArmed ? "pass" : "block",
      summary: sandboxPolicy.killSwitchArmed
        ? "Global kill switch is armed for controlled sandbox execution."
        : "Global kill switch is open, so no runner handoff is allowed.",
      evidence: [`killSwitchArmed=${sandboxPolicy.killSwitchArmed}`],
      nextAction: sandboxPolicy.killSwitchArmed
        ? "Keep the kill switch visible before runner handoff."
        : "Arm the kill switch before any runner handoff."
    },
    {
      id: "role-coverage",
      label: "Role coverage",
      status: rolesUsingProfile.length > 0 ? "pass" : "warn",
      summary: rolesUsingProfile.length > 0
        ? `${rolesUsingProfile.length} enabled role(s) route to this profile.`
        : "No enabled role currently routes to this profile.",
      evidence: rolesUsingProfile.map((role) => `${role.roleId}:${role.roleName}`),
      nextAction: rolesUsingProfile.length > 0
        ? "Keep role routing explicit in the cabinet workspace."
        : "Assign a role to this profile before treating it as live runner capacity."
    },
    {
      id: "policy-actions",
      label: "Policy actions",
      status: blockedReasons.length > 0 ? "block" : requiredApprovals.length > 0 ? "warn" : "pass",
      summary: `${actions.length} representative action(s), ${requiredApprovals.length} approval gate(s), ${blockedReasons.length} blocker(s).`,
      evidence: actions.map((action) => `${action.action}:${action.status}`),
      nextAction: blockedReasons.length > 0
        ? "Resolve blocked representative actions before enabling this runner profile."
        : requiredApprovals.length > 0
          ? "Keep exact-payload approval records attached for gated actions."
          : "Representative actions are policy-ready for dry-run handoff."
    },
    {
      id: "evidence-contract",
      label: "Evidence contract",
      status: evidenceByProfile[profile.id].length > 0 ? "pass" : "block",
      summary: `${evidenceByProfile[profile.id].length} evidence artifact type(s) required for this runner.`,
      evidence: evidenceByProfile[profile.id],
      nextAction: "Require these artifacts before accepting runner completion evidence."
    },
    {
      id: "isolation-contract",
      label: "Isolation contract",
      status: profile.controls.length > 0 && profile.isolation.trim().length > 0 ? "pass" : "block",
      summary: profile.isolation,
      evidence: profile.controls,
      nextAction: "Keep the isolation contract visible in every runner handoff."
    }
  ];

  return {
    decision: status,
    checks,
    requiredApprovals,
    blockedReasons,
    supportedEvidenceArtifacts: evidenceByProfile[profile.id],
    nextAction: runnerReadinessNextAction(status, requiredApprovals.length, blockedReasons.length)
  };
}

function runnerReadinessNextAction(
  status: SandboxCapabilityStatus,
  requiredApprovals: number,
  blockedReasons: number
) {
  if (status === "blocked" || blockedReasons > 0) {
    return "Fix blocked checks before a real runner can consume this profile.";
  }
  if (status === "needs-approval" || requiredApprovals > 0) {
    return "Collect exact human approval and evidence artifacts before executing gated actions.";
  }
  return "Profile is ready for dry-run runner handoff with evidence capture.";
}

function riskNotes(
  profileId: ExecutorProfileId,
  runnerReadiness: SandboxCapabilityRunnerReadiness,
  roleCount: number
) {
  const notes: string[] = [];
  const status = runnerReadiness.decision;

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

  if (runnerReadiness.requiredApprovals.length > 0) {
    notes.push(`${runnerReadiness.requiredApprovals.length} action(s) require exact approval records.`);
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
    readinessChecks: summary.readinessChecks + card.runnerReadiness.checks.length,
    passedReadinessChecks:
      summary.passedReadinessChecks +
      card.runnerReadiness.checks.filter((check) => check.status === "pass").length,
    warningReadinessChecks:
      summary.warningReadinessChecks +
      card.runnerReadiness.checks.filter((check) => check.status === "warn").length,
    blockedReadinessChecks:
      summary.blockedReadinessChecks +
      card.runnerReadiness.checks.filter((check) => check.status === "block").length,
    requiredApprovals: summary.requiredApprovals + card.runnerReadiness.requiredApprovals.length,
    evidenceArtifacts: summary.evidenceArtifacts + card.runnerReadiness.supportedEvidenceArtifacts.length,
    killSwitchArmed
  }), {
    profiles: 0,
    rolesCovered,
    dryRunReady: 0,
    needsApproval: 0,
    blocked: 0,
    approvalActions: 0,
    blockedActions: 0,
    readinessChecks: 0,
    passedReadinessChecks: 0,
    warningReadinessChecks: 0,
    blockedReadinessChecks: 0,
    requiredApprovals: 0,
    evidenceArtifacts: 0,
    killSwitchArmed
  });
}
