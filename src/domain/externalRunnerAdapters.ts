export type ExternalRunnerAdapterId =
  | "naikaku-local-engineering-runner"
  | "codex-cli-runner"
  | "claude-code-runner"
  | "qwen-code-runner"
  | "openhands-coding-agent"
  | "openclaw-desktop-runner"
  | "browser-use-runner"
  | "playwright-browser-runner"
  | "hammerspoon-mac-adapter"
  | "e2b-open-computer-use"
  | "mcp-tool-runner"
  | "hermes-agent-runtime";

export const externalRunnerAdapterIds: ExternalRunnerAdapterId[] = [
  "naikaku-local-engineering-runner",
  "codex-cli-runner",
  "claude-code-runner",
  "qwen-code-runner",
  "openhands-coding-agent",
  "openclaw-desktop-runner",
  "browser-use-runner",
  "playwright-browser-runner",
  "hammerspoon-mac-adapter",
  "e2b-open-computer-use",
  "mcp-tool-runner",
  "hermes-agent-runtime"
];

export type ExternalRunnerCapability =
  | "repo-coding"
  | "allowlisted-shell"
  | "browser-automation"
  | "mac-desktop-control"
  | "terminal-automation"
  | "mcp-tools"
  | "memory-learning"
  | "sandboxed-desktop";

export type ExternalRunnerRisk = "low" | "medium" | "high" | "critical";

export type ExternalRunnerInstallMode =
  | "built-in-local-cli"
  | "user-installed-cli"
  | "user-installed-app"
  | "external-sandbox-service"
  | "mcp-server";

export type ExternalRunnerAdapterStatus =
  | "available-now"
  | "contract-ready"
  | "needs-install"
  | "needs-license-review"
  | "approval-required"
  | "blocked-by-default";

export interface ExternalRunnerAdapter {
  id: ExternalRunnerAdapterId;
  label: string;
  projectUrl: string;
  license: string;
  licenseUrl: string;
  installMode: ExternalRunnerInstallMode;
  status: ExternalRunnerAdapterStatus;
  risk: ExternalRunnerRisk;
  capabilities: ExternalRunnerCapability[];
  contractInput: string;
  receiptOutput: string;
  installHint: string;
  permissionsRequired: string[];
  prohibitedByDefault: string[];
  evidenceRequired: string[];
  stopConditions: string[];
  safetyNotes: string[];
  nextAction: string;
}

export interface ExternalRunnerAdapterRegistry {
  schema: "naikaku.external-runner-adapter-registry.v1";
  generatedAt: string;
  adapters: ExternalRunnerAdapter[];
  summary: {
    total: number;
    availableNow: number;
    contractReady: number;
    needsInstall: number;
    needsLicenseReview: number;
    approvalRequired: number;
    blockedByDefault: number;
    highOrCriticalRisk: number;
    capabilityCoverage: Record<ExternalRunnerCapability, number>;
  };
  integrationPolicy: {
    defaultMode: "adapter-process";
    rules: string[];
  };
}

export function buildExternalRunnerAdapterRegistry({
  generatedAt = new Date().toISOString(),
  installedAdapterIds = [],
  licenseReviewedAdapterIds = [],
  approvedAdapterIds = []
}: {
  generatedAt?: string;
  installedAdapterIds?: ExternalRunnerAdapterId[];
  licenseReviewedAdapterIds?: ExternalRunnerAdapterId[];
  approvedAdapterIds?: ExternalRunnerAdapterId[];
} = {}): ExternalRunnerAdapterRegistry {
  const installed = new Set(installedAdapterIds);
  const licenseReviewed = new Set(licenseReviewedAdapterIds);
  const approved = new Set(approvedAdapterIds);
  const adapters = baseAdapters.map((adapter) => ({
    ...adapter,
    status: statusFor(adapter, installed, licenseReviewed, approved)
  }));

  return {
    schema: "naikaku.external-runner-adapter-registry.v1",
    generatedAt,
    adapters,
    summary: summarize(adapters),
    integrationPolicy: {
      defaultMode: "adapter-process",
      rules: [
        "Prefer user-installed upstream runners invoked through scoped CLI/API adapter processes.",
        "Do not vendor third-party code until license notices, dependency obligations, and security posture are reviewed.",
        "Every adapter receives a scoped contract and must return receipts with command results, logs, artifacts, stop reasons, and risk notes.",
        "Git push, deploy, purchases, messages, host secrets, cookies, keychain access, and broad desktop control stay blocked until exact human approval.",
        "Mac desktop adapters must require Accessibility or Screen Recording approval, action logs, redaction review, and a kill switch before use."
      ]
    }
  };
}

export function serializeExternalRunnerAdapterRegistry(report: ExternalRunnerAdapterRegistry) {
  return JSON.stringify(report, null, 2);
}

export function serializeExternalRunnerAdapterRegistryMarkdown(report: ExternalRunnerAdapterRegistry) {
  return [
    "# External Runner Adapter Registry",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total adapters: ${report.summary.total}`,
    `- Available now: ${report.summary.availableNow}`,
    `- Contract ready: ${report.summary.contractReady}`,
    `- Needs install: ${report.summary.needsInstall}`,
    `- Needs license review: ${report.summary.needsLicenseReview}`,
    `- Approval required: ${report.summary.approvalRequired}`,
    `- Blocked by default: ${report.summary.blockedByDefault}`,
    `- High or critical risk: ${report.summary.highOrCriticalRisk}`,
    "",
    "## Integration Policy",
    "",
    ...report.integrationPolicy.rules.map((rule) => `- ${rule}`),
    "",
    "## Adapters",
    "",
    ...report.adapters.flatMap((adapter) => adapterMarkdown(adapter))
  ].join("\n");
}

const baseAdapters: Array<Omit<ExternalRunnerAdapter, "status">> = [
  {
    id: "naikaku-local-engineering-runner",
    label: "Naikaku local engineering runner",
    projectUrl: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
    license: "project license",
    licenseUrl: "LICENSE",
    installMode: "built-in-local-cli",
    risk: "low",
    capabilities: ["repo-coding", "allowlisted-shell"],
    contractInput: "output/engineering-simulate/{session-bundle,runner-self-test,sandbox-preflight,launch-queue}.json",
    receiptOutput: "output/engineering-run-local/{sandbox-runner-report,receipt-review,execution-receipt}.json",
    installHint: "Run npm run engineering:simulate, then npm run engineering:run-local.",
    permissionsRequired: [
      "repository worktree read/write only when --patch-file is explicitly supplied",
      "allowlisted shell verification commands",
      "output and session evidence directories"
    ],
    prohibitedByDefault: [
      "Mac desktop control",
      "browser control",
      "Git push",
      "deploy",
      "external messages",
      "host secrets"
    ],
    evidenceRequired: [
      "command transcripts",
      "receipt review",
      "implementation evidence",
      "artifact audit",
      "execution receipt"
    ],
    stopConditions: [
      "preflight is not ready",
      "command is not allowlisted",
      "patch touches blocked paths",
      "command exits non-zero"
    ],
    safetyNotes: [
      "This is the built-in minimal runner and does not generate code by itself.",
      "Without --patch-file it can prove a local verification run, not code changes or completion."
    ],
    nextAction: "Use as the default smoke runner before connecting external coding or desktop adapters."
  },
  {
    id: "openhands-coding-agent",
    label: "OpenHands coding agent",
    projectUrl: "https://github.com/OpenHands/openhands",
    license: "MIT for open-source core; verify enterprise and dependency notices before vendoring",
    licenseUrl: "https://github.com/OpenHands/openhands/blob/main/LICENSE",
    installMode: "user-installed-cli",
    risk: "high",
    capabilities: ["repo-coding", "allowlisted-shell", "browser-automation"],
    contractInput: "naikaku.coding-agent-runner-invocation.v1",
    receiptOutput: "naikaku.coding-agent-session-receipt.v1",
    installHint: "Install and run OpenHands separately, then point it at a scoped workspace and Naikaku invocation file.",
    permissionsRequired: [
      "scoped repository worktree",
      "allowlisted shell commands",
      "session evidence prefix"
    ],
    prohibitedByDefault: [
      "host-wide filesystem access",
      "raw environment dumps",
      "Git push",
      "deploy",
      "external writes"
    ],
    evidenceRequired: [
      "changed files",
      "diff summary",
      "command transcripts",
      "risk notes",
      "receipt JSON"
    ],
    stopConditions: [
      "unsafe command",
      "credential prompt",
      "unapproved network target",
      "missing receipt path"
    ],
    safetyNotes: [
      "Treat as the preferred external coding adapter candidate, not as a trusted core dependency.",
      "Run in a container or scoped workspace before accepting implementation evidence."
    ],
    nextAction: "Build a thin adapter that writes an OpenHands task from Naikaku invocation JSON and imports its receipt."
  },
  {
    id: "codex-cli-runner",
    label: "Codex CLI runner",
    projectUrl: "https://github.com/openai/codex",
    license: "Apache-2.0 for open-source CLI; verify installed plugin and runtime notices before distribution",
    licenseUrl: "https://github.com/openai/codex/blob/main/LICENSE",
    installMode: "user-installed-cli",
    risk: "high",
    capabilities: ["repo-coding", "allowlisted-shell", "terminal-automation"],
    contractInput: "naikaku.coding-agent-runner-invocation.v1 or a scoped role prompt",
    receiptOutput: "Naikaku session receipt plus Codex transcript and final message",
    installHint: "Install Codex CLI separately and run it through a wrapper that writes Naikaku receipts.",
    permissionsRequired: [
      "scoped repository worktree",
      "sandbox mode",
      "approval policy",
      "transcript/evidence output path"
    ],
    prohibitedByDefault: [
      "danger-full-access without outer sandbox",
      "unreviewed Git push",
      "deploy",
      "external messages",
      "host secrets"
    ],
    evidenceRequired: [
      "Codex transcript",
      "final message",
      "sandbox mode",
      "command results",
      "Naikaku receipt JSON"
    ],
    stopConditions: [
      "missing Codex auth",
      "unsafe sandbox request",
      "unapproved command",
      "missing receipt path"
    ],
    safetyNotes: [
      "Codex CLI is a strong coding runner candidate once wrapped with Naikaku receipt output.",
      "Use read-only role calls for cabinet proposal/audit before allowing workspace-write implementation."
    ],
    nextAction: "Use npm run cabinet:codex-smoke to prove separated role calls, then build a receipt-writing wrapper before implementation runs."
  },
  {
    id: "claude-code-runner",
    label: "Claude Code runner",
    projectUrl: "https://docs.anthropic.com/en/docs/claude-code",
    license: "proprietary CLI terms; verify Anthropic terms and local install before integration",
    licenseUrl: "https://docs.anthropic.com/en/docs/claude-code",
    installMode: "user-installed-cli",
    risk: "high",
    capabilities: ["repo-coding", "allowlisted-shell", "terminal-automation"],
    contractInput: "naikaku.coding-agent-runner-invocation.v1 or a scoped role prompt",
    receiptOutput: "Naikaku session receipt plus Claude transcript and structured output",
    installHint: "Install Claude Code separately, authenticate it, and run it through a Naikaku receipt wrapper.",
    permissionsRequired: [
      "scoped repository worktree",
      "permission mode",
      "allowed tools list",
      "transcript/evidence output path"
    ],
    prohibitedByDefault: [
      "bypass permissions outside an outer sandbox",
      "unreviewed Git push",
      "deploy",
      "external messages",
      "host secrets"
    ],
    evidenceRequired: [
      "Claude transcript",
      "structured final output",
      "permission mode",
      "command results",
      "Naikaku receipt JSON"
    ],
    stopConditions: [
      "missing Claude auth",
      "unsafe permission mode",
      "unapproved tool request",
      "missing receipt path"
    ],
    safetyNotes: [
      "Claude Code can be a separate cabinet role or implementation runner, but Naikaku should still own audit and vote decisions.",
      "Authentication or subscription failures should be reported as readiness, not hidden behind fallback claims."
    ],
    nextAction: "Authenticate Claude Code and wrap --print structured output into Naikaku receipts before implementation runs."
  },
  {
    id: "qwen-code-runner",
    label: "Qwen Code runner",
    projectUrl: "https://github.com/QwenLM/qwen-code",
    license: "upstream license; verify the installed Qwen Code release and dependency notices before distribution",
    licenseUrl: "https://github.com/QwenLM/qwen-code/blob/main/LICENSE",
    installMode: "user-installed-cli",
    risk: "high",
    capabilities: ["repo-coding", "allowlisted-shell", "terminal-automation"],
    contractInput: "naikaku.coding-agent-runner-invocation.v1 or a scoped role prompt",
    receiptOutput: "Naikaku session receipt plus Qwen Code JSON output and command transcripts",
    installHint: "Install Qwen Code separately, authenticate it through /auth with Alibaba Cloud Coding Plan or another supported provider, and run it through a Naikaku receipt wrapper.",
    permissionsRequired: [
      "scoped repository worktree",
      "Qwen Code approval mode",
      "transcript/evidence output path",
      "local Qwen authentication managed outside the browser"
    ],
    prohibitedByDefault: [
      "YOLO approval mode",
      "unreviewed Git push",
      "deploy",
      "external messages",
      "host secrets"
    ],
    evidenceRequired: [
      "Qwen Code JSON output",
      "command transcripts",
      "approval mode",
      "command results",
      "Naikaku receipt JSON"
    ],
    stopConditions: [
      "missing Qwen Code authentication",
      "unsafe approval mode",
      "unapproved command",
      "missing receipt path"
    ],
    safetyNotes: [
      "Qwen Code uses the operator's local Coding Plan or provider authentication; Naikaku never receives that credential in the browser.",
      "The fixed template uses Qwen Code Auto mode, never YOLO mode, and Naikaku still owns the review and vote decision."
    ],
    nextAction: "Authenticate Qwen Code with /auth, then enable the fixed qwen-code-local runner template before one scoped run."
  },
  {
    id: "openclaw-desktop-runner",
    label: "OpenClaw desktop runner",
    projectUrl: "https://github.com/openclaw/openclaw",
    license: "MIT; verify upstream license and plugin dependencies before install",
    licenseUrl: "https://github.com/openclaw/openclaw/blob/main/LICENSE",
    installMode: "user-installed-app",
    risk: "critical",
    capabilities: ["mac-desktop-control", "browser-automation", "terminal-automation"],
    contractInput: "naikaku.engineering-mac-runner-contract.v1",
    receiptOutput: "mac-runner-receipt.json plus action log and screenshots",
    installHint: "Install OpenClaw separately and run it only behind a scoped Mac runner contract.",
    permissionsRequired: [
      "Accessibility",
      "Screen Recording",
      "Automation scope",
      "action log directory",
      "kill switch"
    ],
    prohibitedByDefault: [
      "host secrets",
      "unapproved apps",
      "out-of-scope windows",
      "payment or message send",
      "Git push",
      "deploy"
    ],
    evidenceRequired: [
      "screenshot/frame evidence",
      "input-event log",
      "redaction report",
      "stop reason",
      "adapter receipt"
    ],
    stopConditions: [
      "unknown app target",
      "unapproved URL",
      "credential prompt",
      "external write prompt",
      "kill switch activation"
    ],
    safetyNotes: [
      "High-power desktop control must be optional and disabled by default.",
      "Treat upstream skills/plugins as untrusted inputs until reviewed."
    ],
    nextAction: "Keep as contract-ready only; require explicit install, license review, and operator approval before execution."
  },
  {
    id: "browser-use-runner",
    label: "browser-use runner",
    projectUrl: "https://github.com/browser-use/browser-use",
    license: "MIT; verify upstream license before vendoring",
    licenseUrl: "https://github.com/browser-use/browser-use/blob/main/LICENSE",
    installMode: "user-installed-cli",
    risk: "high",
    capabilities: ["browser-automation"],
    contractInput: "approved URL/action contract",
    receiptOutput: "browser transcript, screenshots, and result summary",
    installHint: "Install browser-use separately and run it in an isolated browser profile.",
    permissionsRequired: [
      "isolated browser profile",
      "domain allowlist",
      "screenshot/evidence directory"
    ],
    prohibitedByDefault: [
      "payments",
      "messages",
      "account changes",
      "credential extraction",
      "unapproved downloads"
    ],
    evidenceRequired: [
      "visited URL list",
      "screenshots",
      "action transcript",
      "external-write review"
    ],
    stopConditions: [
      "unapproved domain",
      "login wall",
      "payment or send button",
      "captcha or identity challenge"
    ],
    safetyNotes: [
      "Browser content is untrusted input and may contain prompt injection.",
      "Use for web workflows after URL and external-write gates are explicit."
    ],
    nextAction: "Add a browser contract adapter that maps Naikaku approval records to browser-use tasks."
  },
  {
    id: "playwright-browser-runner",
    label: "Playwright browser runner",
    projectUrl: "https://github.com/microsoft/playwright",
    license: "Apache-2.0; verify upstream license before vendoring",
    licenseUrl: "https://github.com/microsoft/playwright/blob/main/LICENSE",
    installMode: "user-installed-cli",
    risk: "medium",
    capabilities: ["browser-automation"],
    contractInput: "deterministic browser test plan",
    receiptOutput: "trace, screenshots, console/network summary",
    installHint: "Use Playwright as a deterministic browser evidence runner or test backend.",
    permissionsRequired: [
      "isolated browser profile",
      "approved URL scope",
      "trace/screenshot output directory"
    ],
    prohibitedByDefault: [
      "unapproved downloads",
      "credential harvesting",
      "payments",
      "messages"
    ],
    evidenceRequired: [
      "trace path",
      "screenshots",
      "test result",
      "console or network summary"
    ],
    stopConditions: [
      "unapproved URL",
      "credential prompt",
      "external write attempt"
    ],
    safetyNotes: [
      "Good deterministic engine under AI browser workflows.",
      "AI decision-making should stay in Naikaku or a governed browser agent, not hidden inside raw Playwright calls."
    ],
    nextAction: "Use for repeatable UI smoke tests and screenshot evidence."
  },
  {
    id: "hammerspoon-mac-adapter",
    label: "Hammerspoon Mac adapter",
    projectUrl: "https://github.com/Hammerspoon/hammerspoon",
    license: "MIT-style; verify upstream license before vendoring",
    licenseUrl: "https://github.com/Hammerspoon/hammerspoon/blob/master/LICENSE",
    installMode: "user-installed-app",
    risk: "critical",
    capabilities: ["mac-desktop-control", "terminal-automation"],
    contractInput: "naikaku.engineering-mac-runner-contract.v1",
    receiptOutput: "action receipt, event log, screenshots where applicable",
    installHint: "Install Hammerspoon separately and load only Naikaku-scoped Lua actions.",
    permissionsRequired: [
      "Accessibility",
      "Automation for named bundle ids",
      "optional Screen Recording when observing"
    ],
    prohibitedByDefault: [
      "global hotkey takeover",
      "unapproved app control",
      "clipboard exfiltration",
      "host secrets",
      "external writes"
    ],
    evidenceRequired: [
      "target app",
      "action log",
      "payload summary",
      "stop reason"
    ],
    stopConditions: [
      "unknown bundle id",
      "clipboard contains sensitive-looking data",
      "credential prompt",
      "kill switch activation"
    ],
    safetyNotes: [
      "macOS automation is powerful; keep disabled until exact permissions are approved.",
      "Best used for narrow hotkey/window/app actions, not broad visual autonomy."
    ],
    nextAction: "Create a minimal Lua adapter only after Mac approval UX and action-log import are ready."
  },
  {
    id: "e2b-open-computer-use",
    label: "E2B Open Computer Use sandbox",
    projectUrl: "https://github.com/e2b-dev/open-computer-use",
    license: "verify upstream license before integration",
    licenseUrl: "https://github.com/e2b-dev/open-computer-use",
    installMode: "external-sandbox-service",
    risk: "high",
    capabilities: ["sandboxed-desktop", "browser-automation", "allowlisted-shell"],
    contractInput: "desktop sandbox task contract",
    receiptOutput: "sandbox action transcript and artifacts",
    installHint: "Run as an isolated desktop sandbox provider rather than host desktop control.",
    permissionsRequired: [
      "sandbox credentials",
      "network/domain policy",
      "artifact export path"
    ],
    prohibitedByDefault: [
      "host desktop control",
      "host secrets",
      "external writes without approval"
    ],
    evidenceRequired: [
      "sandbox transcript",
      "screenshots",
      "download/artifact manifest",
      "stop reason"
    ],
    stopConditions: [
      "sandbox escape attempt",
      "metadata service access",
      "unapproved external send"
    ],
    safetyNotes: [
      "Prefer sandboxed desktops over direct Mac control for risky browsing or GUI workflows.",
      "Provider credentials still need local secret handling."
    ],
    nextAction: "Keep as a safer desktop-control target once sandbox credentials and adapter API are chosen."
  },
  {
    id: "mcp-tool-runner",
    label: "MCP tool runner",
    projectUrl: "https://modelcontextprotocol.io/",
    license: "tool-specific; review each MCP server",
    licenseUrl: "https://modelcontextprotocol.io/",
    installMode: "mcp-server",
    risk: "high",
    capabilities: ["mcp-tools"],
    contractInput: "tool name, arguments, approval record, and sandbox policy",
    receiptOutput: "tool call result summary and audit event",
    installHint: "Register only explicitly approved MCP servers and tool names.",
    permissionsRequired: [
      "named server allowlist",
      "tool allowlist",
      "argument review",
      "audit event storage"
    ],
    prohibitedByDefault: [
      "filesystem-wide tools",
      "secret managers",
      "deployment tools",
      "messaging tools",
      "payment tools"
    ],
    evidenceRequired: [
      "server name",
      "tool name",
      "argument hash",
      "result summary",
      "operator approval if high impact"
    ],
    stopConditions: [
      "unlisted server",
      "unlisted tool",
      "argument drift",
      "credential/control-plane finding"
    ],
    safetyNotes: [
      "MCP is a capability boundary, not a trust boundary.",
      "Each server needs independent license and security review."
    ],
    nextAction: "Use the existing MCP proxy executor profile after tool allowlists are explicit."
  },
  {
    id: "hermes-agent-runtime",
    label: "Hermes Agent runtime",
    projectUrl: "https://github.com/NousResearch/Hermes-Agent",
    license: "MIT or upstream open-source license; verify before vendoring",
    licenseUrl: "https://github.com/NousResearch/Hermes-Agent/blob/main/LICENSE",
    installMode: "user-installed-cli",
    risk: "medium",
    capabilities: ["memory-learning", "terminal-automation"],
    contractInput: "reviewed learning or terminal task contract",
    receiptOutput: "memory proposal, transcript, and review notes",
    installHint: "Use as a reference or optional runtime for learning loops and terminal backends.",
    permissionsRequired: [
      "scoped memory directory",
      "terminal command allowlist",
      "reviewed persistence target"
    ],
    prohibitedByDefault: [
      "silent memory writes",
      "host secrets",
      "unreviewed command execution",
      "external writes"
    ],
    evidenceRequired: [
      "learning proposal",
      "terminal transcript",
      "review decision",
      "memory diff"
    ],
    stopConditions: [
      "unreviewed memory persistence",
      "unsafe terminal command",
      "credential/control-plane finding"
    ],
    safetyNotes: [
      "Good reference for learning loops, but Naikaku should keep Memory Secretary review before durable persistence.",
      "Do not let a self-improvement loop bypass cabinet scoring."
    ],
    nextAction: "Keep as reference or optional adapter after memory-review import/export is stable."
  }
];

function statusFor(
  adapter: Omit<ExternalRunnerAdapter, "status">,
  installed: Set<ExternalRunnerAdapterId>,
  licenseReviewed: Set<ExternalRunnerAdapterId>,
  approved: Set<ExternalRunnerAdapterId>
): ExternalRunnerAdapterStatus {
  if (adapter.installMode === "built-in-local-cli") return "available-now";
  if (!licenseReviewed.has(adapter.id) && adapter.license.toLowerCase().includes("verify")) {
    return "needs-license-review";
  }
  if (!installed.has(adapter.id)) return "needs-install";
  const needsApproval = adapter.risk === "critical" || adapter.prohibitedByDefault.includes("external writes");
  if (needsApproval && !approved.has(adapter.id)) return "approval-required";
  return "contract-ready";
}

function summarize(adapters: ExternalRunnerAdapter[]): ExternalRunnerAdapterRegistry["summary"] {
  const capabilityCoverage = capabilityKeys().reduce((record, capability) => {
    record[capability] = adapters.filter((adapter) => adapter.capabilities.includes(capability)).length;
    return record;
  }, {} as Record<ExternalRunnerCapability, number>);

  return {
    total: adapters.length,
    availableNow: adapters.filter((adapter) => adapter.status === "available-now").length,
    contractReady: adapters.filter((adapter) => adapter.status === "contract-ready").length,
    needsInstall: adapters.filter((adapter) => adapter.status === "needs-install").length,
    needsLicenseReview: adapters.filter((adapter) => adapter.status === "needs-license-review").length,
    approvalRequired: adapters.filter((adapter) => adapter.status === "approval-required").length,
    blockedByDefault: adapters.filter((adapter) => adapter.status === "blocked-by-default").length,
    highOrCriticalRisk: adapters.filter((adapter) =>
      adapter.risk === "high" || adapter.risk === "critical"
    ).length,
    capabilityCoverage
  };
}

function capabilityKeys(): ExternalRunnerCapability[] {
  return [
    "repo-coding",
    "allowlisted-shell",
    "browser-automation",
    "mac-desktop-control",
    "terminal-automation",
    "mcp-tools",
    "memory-learning",
    "sandboxed-desktop"
  ];
}

function adapterMarkdown(adapter: ExternalRunnerAdapter) {
  return [
    `### ${adapter.label}`,
    "",
    `- ID: ${adapter.id}`,
    `- Status: ${adapter.status}`,
    `- Risk: ${adapter.risk}`,
    `- Project: ${adapter.projectUrl}`,
    `- License: ${adapter.license}`,
    `- Install mode: ${adapter.installMode}`,
    `- Contract input: ${adapter.contractInput}`,
    `- Receipt output: ${adapter.receiptOutput}`,
    `- Install hint: ${adapter.installHint}`,
    `- Next action: ${adapter.nextAction}`,
    "",
    "Permissions:",
    ...adapter.permissionsRequired.map((item) => `- ${item}`),
    "",
    "Prohibited by default:",
    ...adapter.prohibitedByDefault.map((item) => `- ${item}`),
    "",
    "Evidence:",
    ...adapter.evidenceRequired.map((item) => `- ${item}`),
    "",
    "Stop conditions:",
    ...adapter.stopConditions.map((item) => `- ${item}`),
    ""
  ];
}
