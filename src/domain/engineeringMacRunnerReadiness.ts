import type { EngineeringLaunchProfile } from "./engineeringLaunchProfile";
import type { EngineeringExecutionReceipt } from "./engineeringExecutionReceipt";
import type { EngineeringLaunchQueue } from "./engineeringLaunchQueue";
import type { EngineeringSelfSimulationReport } from "./engineeringSelfSimulation";

export type EngineeringMacRunnerDecision =
  | "needs-mission"
  | "code-ready"
  | "approval-required"
  | "runtime-needed"
  | "evidence-ready";

export type EngineeringMacRunnerCapabilityId =
  | "repo-coding"
  | "allowlisted-shell"
  | "browser-automation"
  | "screen-observation"
  | "keyboard-mouse"
  | "app-window-control"
  | "clipboard"
  | "mcp-tools"
  | "external-writes";

export type EngineeringMacRunnerCapabilityStatus =
  | "ready"
  | "planned"
  | "approval-required"
  | "needs-runtime"
  | "blocked"
  | "not-requested";

export type EngineeringMacRunnerPermissionId =
  | "repo-worktree"
  | "output-directory"
  | "shell-allowlist"
  | "browser-profile"
  | "mac-accessibility"
  | "mac-screen-recording"
  | "mac-automation"
  | "mcp-allowlist"
  | "external-write-approval"
  | "host-secrets";

export type EngineeringMacRunnerPermissionStatus =
  | "granted-by-policy"
  | "ask-before-use"
  | "not-requested"
  | "denied-by-default"
  | "missing";

export type EngineeringMacRunnerAdapterId =
  | "codex-style-coding-agent"
  | "browser-profile-runner"
  | "hammerspoon-adapter"
  | "openclaw-style-desktop"
  | "mcp-tool-runner"
  | "external-write-gateway";

export type EngineeringMacRunnerAdapterStatus =
  | "available-now"
  | "paperwork-ready"
  | "approval-required"
  | "needs-runtime"
  | "denied-by-default"
  | "not-requested";

export type EngineeringMacRunnerNextActionId =
  | "write-mission"
  | "prepare-dispatch-package"
  | "approve-browser-profile"
  | "connect-mac-adapter"
  | "allowlist-mcp-tools"
  | "approve-external-writes"
  | "run-or-import-receipts"
  | "review-accepted-evidence";

export interface EngineeringMacRunnerCapability {
  id: EngineeringMacRunnerCapabilityId;
  status: EngineeringMacRunnerCapabilityStatus;
  current: string;
  requiredForRealUse: string;
}

export interface EngineeringMacRunnerPermission {
  id: EngineeringMacRunnerPermissionId;
  status: EngineeringMacRunnerPermissionStatus;
  scope: string;
  evidenceRequired: string;
}

export interface EngineeringMacRunnerAdapter {
  id: EngineeringMacRunnerAdapterId;
  status: EngineeringMacRunnerAdapterStatus;
  purpose: string;
  stopCondition: string;
}

export interface EngineeringMacRunnerReadiness {
  schema: "naikaku.engineering-mac-runner-readiness.v1";
  generatedAt: string;
  missionFingerprint: string;
  decision: EngineeringMacRunnerDecision;
  macRequested: boolean;
  canPrepareCodingWork: boolean;
  canRunCodeSandbox: boolean;
  canControlMacDesktop: boolean;
  capabilities: EngineeringMacRunnerCapability[];
  permissions: EngineeringMacRunnerPermission[];
  adapters: EngineeringMacRunnerAdapter[];
  summary: {
    readyCapabilities: number;
    approvalRequired: number;
    runtimeNeeded: number;
    deniedByDefault: number;
    availableAdapters: number;
  };
  nextActions: EngineeringMacRunnerNextActionId[];
  honestyClaim: {
    claim: string;
    limitations: string[];
  };
}

export interface BuildEngineeringMacRunnerReadinessInput {
  profile: EngineeringLaunchProfile;
  selfSimulation?: EngineeringSelfSimulationReport | null;
  launchQueue?: EngineeringLaunchQueue | null;
  executionReceipt?: EngineeringExecutionReceipt | null;
  generatedAt?: string;
}

export function buildEngineeringMacRunnerReadiness({
  profile,
  selfSimulation,
  launchQueue,
  executionReceipt,
  generatedAt = new Date().toISOString()
}: BuildEngineeringMacRunnerReadinessInput): EngineeringMacRunnerReadiness {
  const signals = new Set(profile.signals);
  const macRequested = signals.has("mac-control-requested");
  const browserRequested = signals.has("browser-requested") || macRequested;
  const mcpRequested = signals.has("mcp-requested");
  const externalWriteRequested = signals.has("external-write-requested");
  const queueReady = Boolean(
    launchQueue && (launchQueue.decision === "queue-ready" || launchQueue.decision === "preflight-ready")
  );
  const evidenceAccepted = executionReceipt?.decision === "accepted";
  const canRunCodeSandbox = queueReady || evidenceAccepted;
  const canPrepareCodingWork = profile.missionReady;
  const canControlMacDesktop = Boolean(
    selfSimulation?.capabilityGap.canControlMacDesktop && macRequested
  );

  const capabilities = capabilityRows({
    profileReady: profile.missionReady,
    browserRequested,
    macRequested,
    mcpRequested,
    externalWriteRequested,
    canRunCodeSandbox,
    canControlMacDesktop
  });
  const permissions = permissionRows({
    profileReady: profile.missionReady,
    browserRequested,
    macRequested,
    mcpRequested,
    externalWriteRequested
  });
  const adapters = adapterRows({
    profileReady: profile.missionReady,
    queueReady,
    browserRequested,
    macRequested,
    mcpRequested,
    externalWriteRequested
  });
  const summary = {
    readyCapabilities: capabilities.filter((item) => item.status === "ready").length,
    approvalRequired: [
      ...capabilities.filter((item) => item.status === "approval-required"),
      ...permissions.filter((item) => item.status === "ask-before-use"),
      ...adapters.filter((item) => item.status === "approval-required")
    ].length,
    runtimeNeeded: [
      ...capabilities.filter((item) => item.status === "needs-runtime"),
      ...adapters.filter((item) => item.status === "needs-runtime")
    ].length,
    deniedByDefault: permissions.filter((item) => item.status === "denied-by-default").length +
      adapters.filter((item) => item.status === "denied-by-default").length,
    availableAdapters: adapters.filter((item) =>
      item.status === "available-now" || item.status === "paperwork-ready"
    ).length
  };

  return {
    schema: "naikaku.engineering-mac-runner-readiness.v1",
    generatedAt,
    missionFingerprint: profile.missionFingerprint,
    decision: decisionFor({
      missionReady: profile.missionReady,
      macRequested,
      browserRequested,
      mcpRequested,
      externalWriteRequested,
      evidenceAccepted,
      summary
    }),
    macRequested,
    canPrepareCodingWork,
    canRunCodeSandbox,
    canControlMacDesktop,
    capabilities,
    permissions,
    adapters,
    summary,
    nextActions: nextActionsFor({
      missionReady: profile.missionReady,
      queueReady,
      macRequested,
      browserRequested,
      mcpRequested,
      externalWriteRequested,
      evidenceAccepted
    }),
    honestyClaim: {
      claim: canControlMacDesktop
        ? "A governed Mac desktop runner is approved for this mission scope."
        : "Naikaku can prepare supervised coding work now; Mac desktop control remains a governed runner integration until permissions, adapter runtime, action logs, and receipts exist.",
      limitations: [
        "This readiness report does not grant Accessibility, Screen Recording, Automation, MCP, Git push, deploy, or external-send permission.",
        "OpenClaw/Hammerspoon-style control is treated as an adapter contract, not as unbounded host control.",
        "Completion still requires runner output, receipts, artifact audit, and evidence review."
      ]
    }
  };
}

export function serializeEngineeringMacRunnerReadiness(report: EngineeringMacRunnerReadiness) {
  return JSON.stringify(report, null, 2);
}

export function serializeEngineeringMacRunnerReadinessMarkdown(report: EngineeringMacRunnerReadiness) {
  return [
    "# Engineering Mac Runner Readiness",
    "",
    `- Decision: ${report.decision}`,
    `- Mission fingerprint: ${report.missionFingerprint}`,
    `- Can prepare coding work: ${yesNo(report.canPrepareCodingWork)}`,
    `- Can run code sandbox: ${yesNo(report.canRunCodeSandbox)}`,
    `- Can control Mac desktop: ${yesNo(report.canControlMacDesktop)}`,
    "",
    "## Capabilities",
    ...report.capabilities.map((item) =>
      `- ${item.id}: ${item.status} - ${item.current}`
    ),
    "",
    "## Permissions",
    ...report.permissions.map((item) =>
      `- ${item.id}: ${item.status} - ${item.scope}`
    ),
    "",
    "## Adapters",
    ...report.adapters.map((item) =>
      `- ${item.id}: ${item.status} - ${item.purpose}`
    ),
    "",
    "## Next Actions",
    ...report.nextActions.map((item) => `- ${item}`),
    "",
    "## Honesty Claim",
    report.honestyClaim.claim,
    ...report.honestyClaim.limitations.map((item) => `- ${item}`)
  ].join("\n");
}

function capabilityRows({
  profileReady,
  browserRequested,
  macRequested,
  mcpRequested,
  externalWriteRequested,
  canRunCodeSandbox,
  canControlMacDesktop
}: {
  profileReady: boolean;
  browserRequested: boolean;
  macRequested: boolean;
  mcpRequested: boolean;
  externalWriteRequested: boolean;
  canRunCodeSandbox: boolean;
  canControlMacDesktop: boolean;
}): EngineeringMacRunnerCapability[] {
  return [
    {
      id: "repo-coding",
      status: profileReady ? "ready" : "planned",
      current: profileReady
        ? "Mission can be turned into coding-agent briefs and runner paperwork."
        : "Waiting for a mission brief before coding work is prepared.",
      requiredForRealUse: "A scoped repository worktree and completion receipt."
    },
    {
      id: "allowlisted-shell",
      status: canRunCodeSandbox ? "ready" : profileReady ? "planned" : "not-requested",
      current: canRunCodeSandbox
        ? "Runner queue or accepted evidence exists for allowlisted verification commands."
        : "Shell use is limited to declared verification commands until preflight passes.",
      requiredForRealUse: "Command allowlist, transcript path, exit code, and artifact audit."
    },
    {
      id: "browser-automation",
      status: browserRequested ? "approval-required" : "not-requested",
      current: browserRequested
        ? "Browser automation is requested but needs an isolated profile and approval."
        : "Browser automation is not part of the current mission.",
      requiredForRealUse: "Isolated browser profile, URL scope, transcript, screenshots, and stop condition."
    },
    {
      id: "screen-observation",
      status: macRequested
        ? canControlMacDesktop ? "ready" : "approval-required"
        : "not-requested",
      current: macRequested
        ? "Screen observation needs Screen Recording approval for the approved runner session."
        : "Screen observation is not part of the current mission.",
      requiredForRealUse: "Screen Recording approval, screenshot retention policy, and visual evidence path."
    },
    {
      id: "keyboard-mouse",
      status: macRequested
        ? canControlMacDesktop ? "ready" : "needs-runtime"
        : "not-requested",
      current: macRequested
        ? "Keyboard and mouse control need a governed Mac adapter plus Accessibility approval."
        : "Keyboard and mouse control are not part of the current mission.",
      requiredForRealUse: "Accessibility approval, action log, kill switch, and bounded target app."
    },
    {
      id: "app-window-control",
      status: macRequested ? "needs-runtime" : "not-requested",
      current: macRequested
        ? "App focus, window movement, and basic desktop actions require a Mac runner adapter."
        : "App/window control is not part of the current mission.",
      requiredForRealUse: "Hammerspoon-style adapter, Automation approval where needed, and action receipts."
    },
    {
      id: "clipboard",
      status: macRequested ? "approval-required" : "not-requested",
      current: macRequested
        ? "Clipboard use is sensitive and must be scoped to the runner session."
        : "Clipboard access is not part of the current mission.",
      requiredForRealUse: "Clipboard redaction policy, action log, and operator approval."
    },
    {
      id: "mcp-tools",
      status: mcpRequested ? "approval-required" : "not-requested",
      current: mcpRequested
        ? "MCP tools must be named in an explicit allowlist."
        : "MCP tools are not part of the current mission.",
      requiredForRealUse: "Tool allowlist, arguments, dry-run or approval mode, and audit event."
    },
    {
      id: "external-writes",
      status: externalWriteRequested ? "blocked" : "not-requested",
      current: externalWriteRequested
        ? "Git push, deploy, issue creation, and external sends are denied until approved."
        : "External writes are not part of the current mission.",
      requiredForRealUse: "Exact target, payload, reviewer approval, rollback or stop condition, and receipt."
    }
  ];
}

function permissionRows({
  profileReady,
  browserRequested,
  macRequested,
  mcpRequested,
  externalWriteRequested
}: {
  profileReady: boolean;
  browserRequested: boolean;
  macRequested: boolean;
  mcpRequested: boolean;
  externalWriteRequested: boolean;
}): EngineeringMacRunnerPermission[] {
  return [
    {
      id: "repo-worktree",
      status: profileReady ? "granted-by-policy" : "not-requested",
      scope: "Read and write only inside the selected repository worktree.",
      evidenceRequired: "Changed file list and diff summary."
    },
    {
      id: "output-directory",
      status: profileReady ? "granted-by-policy" : "not-requested",
      scope: "Write transcripts, screenshots, receipts, and evidence under output/.",
      evidenceRequired: "Artifact paths that resolve under the evidence prefix."
    },
    {
      id: "shell-allowlist",
      status: profileReady ? "granted-by-policy" : "not-requested",
      scope: "Run only preflight-approved verification commands.",
      evidenceRequired: "Command transcript, exit code, and stop condition."
    },
    {
      id: "browser-profile",
      status: browserRequested ? "ask-before-use" : "not-requested",
      scope: "Use an isolated browser profile for approved URLs only.",
      evidenceRequired: "URL scope, screenshots, and browser action transcript."
    },
    {
      id: "mac-accessibility",
      status: macRequested ? "ask-before-use" : "not-requested",
      scope: "Allow keyboard, mouse, and app focus actions only inside a governed Mac runner.",
      evidenceRequired: "Action log with target app, coordinates or shortcut, and stop condition."
    },
    {
      id: "mac-screen-recording",
      status: macRequested ? "ask-before-use" : "not-requested",
      scope: "Allow visual verification only for the approved runner session.",
      evidenceRequired: "Screenshot or frame artifact plus redaction review."
    },
    {
      id: "mac-automation",
      status: macRequested ? "ask-before-use" : "not-requested",
      scope: "Allow app automation only for named bundle ids and actions.",
      evidenceRequired: "Automation target, payload summary, and operator approval."
    },
    {
      id: "mcp-allowlist",
      status: mcpRequested ? "ask-before-use" : "not-requested",
      scope: "Call only explicitly named MCP tools with reviewed arguments.",
      evidenceRequired: "Tool name, arguments, result summary, and audit event."
    },
    {
      id: "external-write-approval",
      status: externalWriteRequested ? "ask-before-use" : "not-requested",
      scope: "Approve GitHub writes, deploys, purchases, messages, and external sends one by one.",
      evidenceRequired: "Exact target, payload, approver, and rollback or stop condition."
    },
    {
      id: "host-secrets",
      status: "denied-by-default",
      scope: "Do not expose host-wide secrets, cookies, keychains, or raw environment dumps.",
      evidenceRequired: "Secret redaction check and absence of secret artifacts."
    }
  ];
}

function adapterRows({
  profileReady,
  queueReady,
  browserRequested,
  macRequested,
  mcpRequested,
  externalWriteRequested
}: {
  profileReady: boolean;
  queueReady: boolean;
  browserRequested: boolean;
  macRequested: boolean;
  mcpRequested: boolean;
  externalWriteRequested: boolean;
}): EngineeringMacRunnerAdapter[] {
  return [
    {
      id: "codex-style-coding-agent",
      status: queueReady ? "available-now" : profileReady ? "paperwork-ready" : "not-requested",
      purpose: "Consume reviewed coding briefs, edit repository files, run allowlisted tests, and return receipts.",
      stopCondition: "Stop on failed preflight, missing receipt path, unsafe command, or unreviewed external write."
    },
    {
      id: "browser-profile-runner",
      status: browserRequested ? "approval-required" : "not-requested",
      purpose: "Operate an isolated browser session for approved web verification tasks.",
      stopCondition: "Stop on unapproved URL, login wall, payment, message send, or credential prompt."
    },
    {
      id: "hammerspoon-adapter",
      status: macRequested ? "needs-runtime" : "not-requested",
      purpose: "Provide Mac hotkey, window, keyboard, mouse, and app-control primitives behind policy.",
      stopCondition: "Stop on missing Accessibility, missing action log, unknown app target, or kill switch."
    },
    {
      id: "openclaw-style-desktop",
      status: macRequested ? "needs-runtime" : "not-requested",
      purpose: "Provide visual desktop loop primitives such as observe, click, type, and screenshot.",
      stopCondition: "Stop on missing Screen Recording, uncontrolled desktop scope, or unredacted evidence."
    },
    {
      id: "mcp-tool-runner",
      status: mcpRequested ? "approval-required" : "not-requested",
      purpose: "Call explicitly allowed tools with reviewed arguments and audit events.",
      stopCondition: "Stop on unlisted tool, changed payload, or control-plane/credential finding."
    },
    {
      id: "external-write-gateway",
      status: externalWriteRequested ? "denied-by-default" : "not-requested",
      purpose: "Hold Git push, deploy, issue creation, messages, and external sends for exact approval.",
      stopCondition: "Stop until target, payload, approver, and rollback condition are recorded."
    }
  ];
}

function decisionFor({
  missionReady,
  macRequested,
  browserRequested,
  mcpRequested,
  externalWriteRequested,
  evidenceAccepted,
  summary
}: {
  missionReady: boolean;
  macRequested: boolean;
  browserRequested: boolean;
  mcpRequested: boolean;
  externalWriteRequested: boolean;
  evidenceAccepted: boolean;
  summary: EngineeringMacRunnerReadiness["summary"];
}): EngineeringMacRunnerDecision {
  if (!missionReady) return "needs-mission";
  if (evidenceAccepted) return "evidence-ready";
  if (macRequested || summary.runtimeNeeded > 0) return "runtime-needed";
  if (browserRequested || mcpRequested || externalWriteRequested || summary.approvalRequired > 0) {
    return "approval-required";
  }
  return "code-ready";
}

function nextActionsFor({
  missionReady,
  queueReady,
  macRequested,
  browserRequested,
  mcpRequested,
  externalWriteRequested,
  evidenceAccepted
}: {
  missionReady: boolean;
  queueReady: boolean;
  macRequested: boolean;
  browserRequested: boolean;
  mcpRequested: boolean;
  externalWriteRequested: boolean;
  evidenceAccepted: boolean;
}) {
  const actions: EngineeringMacRunnerNextActionId[] = [];
  if (!missionReady) {
    actions.push("write-mission");
  }
  if (missionReady && !queueReady && !evidenceAccepted) {
    actions.push("prepare-dispatch-package");
  }
  if (browserRequested) {
    actions.push("approve-browser-profile");
  }
  if (macRequested) {
    actions.push("connect-mac-adapter");
  }
  if (mcpRequested) {
    actions.push("allowlist-mcp-tools");
  }
  if (externalWriteRequested) {
    actions.push("approve-external-writes");
  }
  if (queueReady && !evidenceAccepted) {
    actions.push("run-or-import-receipts");
  }
  if (evidenceAccepted) {
    actions.push("review-accepted-evidence");
  }
  return actions;
}

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}
