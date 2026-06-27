import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type { EngineeringLaunchProfile } from "./engineeringLaunchProfile";
import type {
  EngineeringMacRunnerAdapterId,
  EngineeringMacRunnerPermissionId,
  EngineeringMacRunnerReadiness
} from "./engineeringMacRunnerReadiness";

export type EngineeringMacRunnerContractDecision =
  | "not-requested"
  | "draft-ready"
  | "approval-required"
  | "runtime-needed"
  | "blocked";

export type EngineeringMacRunnerActionId =
  | "observe-screen"
  | "click"
  | "type-text"
  | "press-hotkey"
  | "focus-app"
  | "move-window"
  | "clipboard-read"
  | "clipboard-write"
  | "browser-open-url"
  | "external-write";

export type EngineeringMacRunnerActionStatus =
  | "ready-for-approval"
  | "needs-runtime"
  | "blocked"
  | "not-requested";

export type EngineeringMacRunnerContractCheckStatus = "pass" | "warn" | "block";

export type EngineeringMacRunnerDeniedActionId =
  | "host-secrets"
  | "out-of-scope-control"
  | "bypass-evidence"
  | "kill-switch-bypass"
  | "unapproved-external-write";

export type EngineeringMacRunnerInstructionId =
  | "do-not-start"
  | "audit-only"
  | "require-approval"
  | "load-scoped-runtime"
  | "write-evidence"
  | "return-receipt"
  | "stop-on-risk";

export interface EngineeringMacRunnerEvidenceTarget {
  id: string;
  path: string;
  required: boolean;
  description: string;
}

export interface EngineeringMacRunnerActionContract {
  id: EngineeringMacRunnerActionId;
  title: string;
  adapterId: EngineeringMacRunnerAdapterId;
  status: EngineeringMacRunnerActionStatus;
  risk: "medium" | "high" | "critical";
  permissions: EngineeringMacRunnerPermissionId[];
  parameterSchema: Record<string, string>;
  evidenceTargets: EngineeringMacRunnerEvidenceTarget[];
  stopConditions: string[];
  nextAction: string;
}

export interface EngineeringMacRunnerContractCheck {
  id: string;
  status: EngineeringMacRunnerContractCheckStatus;
  summary: string;
}

export interface EngineeringMacRunnerContract {
  schema: "naikaku.engineering-mac-runner-contract.v1";
  generatedAt: string;
  missionFingerprint: string;
  decision: EngineeringMacRunnerContractDecision;
  sourceReadinessSchema: EngineeringMacRunnerReadiness["schema"];
  sourceReadinessDecision: EngineeringMacRunnerReadiness["decision"];
  actionPrefix: string;
  receiptPath: string;
  canExecuteWithoutApproval: false;
  actions: EngineeringMacRunnerActionContract[];
  deniedActions: EngineeringMacRunnerDeniedActionId[];
  checks: EngineeringMacRunnerContractCheck[];
  runnerInstructions: EngineeringMacRunnerInstructionId[];
  summary: {
    totalActions: number;
    readyForApproval: number;
    needsRuntime: number;
    blocked: number;
    evidenceTargets: number;
    requiredPermissions: number;
    deniedActions: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface BuildEngineeringMacRunnerContractInput {
  profile: EngineeringLaunchProfile;
  readiness: EngineeringMacRunnerReadiness;
  generatedAt?: string;
}

export function buildEngineeringMacRunnerContract({
  profile,
  readiness,
  generatedAt = new Date().toISOString()
}: BuildEngineeringMacRunnerContractInput): EngineeringMacRunnerContract {
  const actionPrefix = `output/mac-runner/${profile.missionFingerprint}`;
  const receiptPath = `${actionPrefix}/mac-runner-receipt.json`;
  const actions = actionsFor(readiness, actionPrefix);
  const checks = checksFor({
    readiness,
    actions,
    actionPrefix,
    receiptPath
  });
  const summary = {
    totalActions: actions.length,
    readyForApproval: actions.filter((action) => action.status === "ready-for-approval").length,
    needsRuntime: actions.filter((action) => action.status === "needs-runtime").length,
    blocked: actions.filter((action) => action.status === "blocked").length,
    evidenceTargets: actions.reduce((total, action) => total + action.evidenceTargets.length, 0),
    requiredPermissions: new Set(actions.flatMap((action) => action.permissions)).size,
    deniedActions: deniedActionsFor(readiness).length
  };

  return {
    schema: "naikaku.engineering-mac-runner-contract.v1",
    generatedAt,
    missionFingerprint: profile.missionFingerprint,
    decision: decisionFor({
      readiness,
      actions,
      checks
    }),
    sourceReadinessSchema: readiness.schema,
    sourceReadinessDecision: readiness.decision,
    actionPrefix,
    receiptPath,
    canExecuteWithoutApproval: false,
    actions,
    deniedActions: deniedActionsFor(readiness),
    checks,
    runnerInstructions: runnerInstructionsFor(readiness),
    summary,
    honestyClaim: {
      claim: readiness.macRequested
        ? "This contract is a governed Mac runner handoff draft; it does not control the Mac by itself."
        : "No Mac desktop actions are requested, so this contract remains a non-executable placeholder.",
      limitations: [
        "It does not grant Accessibility, Screen Recording, Automation, browser, MCP, Git push, deploy, or external-send permission.",
        "All desktop actions remain pending until a governed adapter runtime, exact approvals, action logs, receipts, and artifact audit exist.",
        "OpenClaw/Hammerspoon-style adapters must consume this contract without expanding scope or reading host secrets."
      ],
      productionRequirements: [
        "Record exact approvals before any action with ask-before-use permissions.",
        "Write screenshots, input-event logs, redaction reports, and receipts under the action prefix.",
        "Stop on unknown app targets, unapproved URLs, credential prompts, external writes, or kill-switch activation."
      ]
    }
  };
}

export function serializeEngineeringMacRunnerContract(report: EngineeringMacRunnerContract) {
  return JSON.stringify(report, null, 2);
}

export function serializeEngineeringMacRunnerContractMarkdown(report: EngineeringMacRunnerContract) {
  return [
    "# Engineering Mac Runner Contract",
    "",
    `Decision: ${report.decision}`,
    `Source readiness: ${report.sourceReadinessDecision}`,
    `Mission fingerprint: ${report.missionFingerprint}`,
    `Action prefix: ${report.actionPrefix}`,
    `Receipt path: ${report.receiptPath}`,
    `Can execute without approval: ${report.canExecuteWithoutApproval ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- Total actions: ${report.summary.totalActions}`,
    `- Ready for approval: ${report.summary.readyForApproval}`,
    `- Needs runtime: ${report.summary.needsRuntime}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Evidence targets: ${report.summary.evidenceTargets}`,
    `- Required permissions: ${report.summary.requiredPermissions}`,
    `- Denied actions: ${report.summary.deniedActions}`,
    "",
    "## Actions",
    "",
    ...report.actions.flatMap((action) => actionMarkdown(action)),
    "",
    "## Denied Actions",
    "",
    ...report.deniedActions.map((item) => `- ${item}`),
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => `- ${check.id}: ${check.status} - ${check.summary}`),
    "",
    "## Runner Instructions",
    "",
    ...report.runnerInstructions.map((instruction) => `- ${instruction}`),
    "",
    "## Honesty Boundary",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`)
  ].join("\n");
}

function actionsFor(
  readiness: EngineeringMacRunnerReadiness,
  actionPrefix: string
): EngineeringMacRunnerActionContract[] {
  if (!readiness.macRequested) {
    return [];
  }

  const desktopRuntime = readiness.adapters.some((adapter) =>
    (adapter.id === "hammerspoon-adapter" || adapter.id === "openclaw-style-desktop") &&
    adapter.status === "available-now"
  );
  const desktopStatus: EngineeringMacRunnerActionStatus = desktopRuntime
    ? "ready-for-approval"
    : "needs-runtime";
  const browserStatus: EngineeringMacRunnerActionStatus = readiness.permissions.some((permission) =>
    permission.id === "browser-profile" && permission.status === "ask-before-use"
  )
    ? "ready-for-approval"
    : "not-requested";
  const externalStatus: EngineeringMacRunnerActionStatus = readiness.permissions.some((permission) =>
    permission.id === "external-write-approval" && permission.status === "ask-before-use"
  )
    ? "blocked"
    : "not-requested";

  return [
    desktopAction({
      id: "observe-screen",
      title: "Observe current screen",
      adapterId: "openclaw-style-desktop",
      status: desktopStatus,
      risk: "high",
      permissions: ["mac-screen-recording"],
      actionPrefix,
      parameterSchema: {
        targetApp: "bundle id or approved app label",
        cropRegion: "optional bounded screen region",
        redaction: "required redaction profile id"
      }
    }),
    desktopAction({
      id: "click",
      title: "Click approved coordinate or UI target",
      adapterId: "openclaw-style-desktop",
      status: desktopStatus,
      risk: "high",
      permissions: ["mac-accessibility", "mac-screen-recording"],
      actionPrefix,
      parameterSchema: {
        targetApp: "bundle id or approved app label",
        x: "screen x coordinate",
        y: "screen y coordinate",
        reason: "operator-visible reason"
      }
    }),
    desktopAction({
      id: "type-text",
      title: "Type reviewed text",
      adapterId: "hammerspoon-adapter",
      status: desktopStatus,
      risk: "high",
      permissions: ["mac-accessibility", "mac-screen-recording"],
      actionPrefix,
      parameterSchema: {
        targetApp: "bundle id or approved app label",
        textRef: "path to reviewed text payload under action prefix",
        maxChars: "bounded character count"
      }
    }),
    desktopAction({
      id: "press-hotkey",
      title: "Press approved hotkey",
      adapterId: "hammerspoon-adapter",
      status: desktopStatus,
      risk: "medium",
      permissions: ["mac-accessibility"],
      actionPrefix,
      parameterSchema: {
        targetApp: "bundle id or approved app label",
        hotkey: "approved key chord",
        reason: "operator-visible reason"
      }
    }),
    desktopAction({
      id: "focus-app",
      title: "Focus approved app",
      adapterId: "hammerspoon-adapter",
      status: desktopStatus,
      risk: "medium",
      permissions: ["mac-accessibility", "mac-automation"],
      actionPrefix,
      parameterSchema: {
        targetApp: "bundle id or approved app label",
        windowTitlePattern: "optional reviewed window title pattern"
      }
    }),
    desktopAction({
      id: "move-window",
      title: "Move or resize approved window",
      adapterId: "hammerspoon-adapter",
      status: desktopStatus,
      risk: "medium",
      permissions: ["mac-accessibility", "mac-automation"],
      actionPrefix,
      parameterSchema: {
        targetApp: "bundle id or approved app label",
        operation: "move or resize",
        bounds: "bounded rectangle"
      }
    }),
    desktopAction({
      id: "clipboard-read",
      title: "Read scoped clipboard",
      adapterId: "hammerspoon-adapter",
      status: desktopStatus,
      risk: "high",
      permissions: ["mac-accessibility"],
      actionPrefix,
      parameterSchema: {
        maxChars: "bounded character count",
        redaction: "required redaction profile id"
      }
    }),
    desktopAction({
      id: "clipboard-write",
      title: "Write reviewed clipboard text",
      adapterId: "hammerspoon-adapter",
      status: desktopStatus,
      risk: "high",
      permissions: ["mac-accessibility"],
      actionPrefix,
      parameterSchema: {
        textRef: "path to reviewed text payload under action prefix",
        maxChars: "bounded character count"
      }
    }),
    desktopAction({
      id: "browser-open-url",
      title: "Open approved URL in isolated browser profile",
      adapterId: "browser-profile-runner",
      status: browserStatus,
      risk: "high",
      permissions: ["browser-profile"],
      actionPrefix,
      parameterSchema: {
        url: "approved URL",
        profileId: "isolated browser profile id",
        maxNavigationDepth: "bounded navigation depth"
      }
    }),
    desktopAction({
      id: "external-write",
      title: "External write gateway",
      adapterId: "external-write-gateway",
      status: externalStatus,
      risk: "critical",
      permissions: ["external-write-approval"],
      actionPrefix,
      parameterSchema: {
        target: "exact external target",
        payloadRef: "reviewed payload path under action prefix",
        approvalRecordId: "human approval record id"
      }
    })
  ];
}

function desktopAction({
  id,
  title,
  adapterId,
  status,
  risk,
  permissions,
  actionPrefix,
  parameterSchema
}: {
  id: EngineeringMacRunnerActionId;
  title: string;
  adapterId: EngineeringMacRunnerAdapterId;
  status: EngineeringMacRunnerActionStatus;
  risk: EngineeringMacRunnerActionContract["risk"];
  permissions: EngineeringMacRunnerPermissionId[];
  actionPrefix: string;
  parameterSchema: Record<string, string>;
}): EngineeringMacRunnerActionContract {
  return {
    id,
    title,
    adapterId,
    status,
    risk,
    permissions,
    parameterSchema,
    evidenceTargets: evidenceTargetsFor(id, actionPrefix),
    stopConditions: stopConditionsFor(id),
    nextAction: nextActionFor(status)
  };
}

function evidenceTargetsFor(
  id: EngineeringMacRunnerActionId,
  actionPrefix: string
): EngineeringMacRunnerEvidenceTarget[] {
  const base = `${actionPrefix}/${id}`;
  return [
    {
      id: "action-log",
      path: `${base}/action-log.jsonl`,
      required: true,
      description: "Append-only action log with timestamp, target app, parameters, and policy decision."
    },
    {
      id: "receipt",
      path: `${base}/receipt.json`,
      required: true,
      description: "Action receipt returned by the adapter after execution or refusal."
    },
    {
      id: "redaction-report",
      path: `${base}/redaction-report.json`,
      required: id === "observe-screen" || id === "clipboard-read",
      description: "Redaction report for screen, clipboard, or reviewed text payloads."
    },
    {
      id: "visual-proof",
      path: `${base}/screenshot.png`,
      required: id === "observe-screen" || id === "click" || id === "browser-open-url",
      description: "Screenshot evidence after visual or browser actions."
    }
  ];
}

function stopConditionsFor(id: EngineeringMacRunnerActionId) {
  const common = [
    "Stop when the kill switch is armed.",
    "Stop when the target app, URL, or bundle id differs from the approved scope.",
    "Stop on credential prompts, keychain access, host secrets, payment, message send, or production deploy.",
    "Stop when evidence cannot be written under the action prefix."
  ];
  if (id === "external-write") {
    return [
      "Stop until exact human approval is attached.",
      "Stop when target or payload changes after approval.",
      ...common
    ];
  }
  if (id === "clipboard-read" || id === "clipboard-write") {
    return [
      "Stop when clipboard content exceeds the approved character limit.",
      "Stop when redaction policy is missing.",
      ...common
    ];
  }
  return common;
}

function checksFor({
  readiness,
  actions,
  actionPrefix,
  receiptPath
}: {
  readiness: EngineeringMacRunnerReadiness;
  actions: EngineeringMacRunnerActionContract[];
  actionPrefix: string;
  receiptPath: string;
}): EngineeringMacRunnerContractCheck[] {
  const evidencePaths = actions.flatMap((action) => action.evidenceTargets.map((target) => target.path));
  const permissionSet = new Set(actions.flatMap((action) => action.permissions));
  const askBeforeUse = readiness.permissions.filter((permission) =>
    permissionSet.has(permission.id) && permission.status === "ask-before-use"
  );

  return [
    {
      id: "mac-requested",
      status: readiness.macRequested ? "pass" : "warn",
      summary: readiness.macRequested
        ? "Mission requests Mac desktop control."
        : "Mission does not request Mac desktop control."
    },
    {
      id: "adapter-runtime",
      status: readiness.summary.runtimeNeeded > 0 ? "warn" : "pass",
      summary: readiness.summary.runtimeNeeded > 0
        ? `${readiness.summary.runtimeNeeded} runtime gaps remain before Mac actions can execute.`
        : "No Mac runtime gaps are reported by readiness."
    },
    {
      id: "approval-boundary",
      status: askBeforeUse.length > 0 ? "warn" : actions.length ? "block" : "pass",
      summary: actions.length
        ? `${askBeforeUse.length} ask-before-use permissions are required.`
        : "No executable Mac action permissions are requested."
    },
    {
      id: "path-scope",
      status: isSafeRelativeArtifactPath(actionPrefix) &&
        isSafeRelativeArtifactPath(receiptPath) &&
        evidencePaths.every((path) => isSafeRelativeArtifactPath(path) && path.startsWith(actionPrefix))
        ? "pass"
        : "block",
      summary: `${evidencePaths.length} action evidence paths stay under ${actionPrefix}.`
    },
    {
      id: "no-unapproved-execution",
      status: actions.every((action) => action.status !== "ready-for-approval" || action.permissions.length > 0)
        ? "pass"
        : "block",
      summary: "All ready-for-approval actions still carry explicit permissions."
    },
    {
      id: "host-secrets-denied",
      status: readiness.permissions.some((permission) =>
        permission.id === "host-secrets" && permission.status === "denied-by-default"
      )
        ? "pass"
        : "block",
      summary: "Host secrets must remain denied by default."
    }
  ];
}

function decisionFor({
  readiness,
  actions,
  checks
}: {
  readiness: EngineeringMacRunnerReadiness;
  actions: EngineeringMacRunnerActionContract[];
  checks: EngineeringMacRunnerContractCheck[];
}): EngineeringMacRunnerContractDecision {
  if (!readiness.macRequested) return "not-requested";
  if (checks.some((check) => check.status === "block")) return "blocked";
  if (actions.some((action) => action.status === "blocked")) return "blocked";
  if (actions.some((action) => action.status === "needs-runtime")) return "runtime-needed";
  if (actions.some((action) => action.status === "ready-for-approval")) return "approval-required";
  return "draft-ready";
}

function deniedActionsFor(readiness: EngineeringMacRunnerReadiness): EngineeringMacRunnerDeniedActionId[] {
  const denied: EngineeringMacRunnerDeniedActionId[] = [
    "host-secrets",
    "out-of-scope-control",
    "bypass-evidence",
    "kill-switch-bypass"
  ];
  if (readiness.permissions.some((permission) => permission.id === "external-write-approval" && permission.status === "ask-before-use")) {
    denied.push("unapproved-external-write");
  }
  return denied;
}

function runnerInstructionsFor(readiness: EngineeringMacRunnerReadiness): EngineeringMacRunnerInstructionId[] {
  if (!readiness.macRequested) {
    return [
      "do-not-start",
      "audit-only"
    ];
  }
  return [
    "require-approval",
    "load-scoped-runtime",
    "write-evidence",
    "return-receipt",
    "stop-on-risk"
  ];
}

function nextActionFor(status: EngineeringMacRunnerActionStatus) {
  if (status === "ready-for-approval") return "Collect exact approval before handing this action to a Mac runner.";
  if (status === "needs-runtime") return "Connect and verify the governed Mac adapter runtime first.";
  if (status === "blocked") return "Remove the action or attach exact human approval and rollback conditions.";
  return "No action requested for this mission.";
}

function actionMarkdown(action: EngineeringMacRunnerActionContract) {
  return [
    `### ${action.title}`,
    "",
    `- ID: ${action.id}`,
    `- Adapter: ${action.adapterId}`,
    `- Status: ${action.status}`,
    `- Risk: ${action.risk}`,
    `- Permissions: ${action.permissions.join(", ") || "none"}`,
    `- Next action: ${action.nextAction}`,
    "- Evidence:",
    ...action.evidenceTargets.map((target) =>
      `  - ${target.id}: ${target.path}${target.required ? " (required)" : ""}`
    ),
    "- Stop conditions:",
    ...action.stopConditions.map((condition) => `  - ${condition}`),
    ""
  ];
}
