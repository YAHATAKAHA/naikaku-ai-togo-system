import type {
  CodingAgentBrief,
  CodingAgentBriefs,
  CodingAgentMode,
  DevelopmentBoard,
  DevelopmentWorkItem,
  ExecutorProfileId,
  ReleaseVerificationReport
} from "./types";

export interface BuildCodingAgentBriefsInput {
  board: DevelopmentBoard;
  operatorLocale?: string;
  releaseVerification?: ReleaseVerificationReport | null;
  generatedAt?: string;
}

const executorProfileIds: ExecutorProfileId[] = [
  "browser-sandbox",
  "desktop-vm",
  "shell-container",
  "mcp-proxy",
  "human-approval"
];

export function buildCodingAgentBriefs({
  board,
  operatorLocale = "ja",
  releaseVerification,
  generatedAt = board.generatedAt
}: BuildCodingAgentBriefsInput): CodingAgentBriefs {
  const briefs = board.items
    .slice()
    .sort(compareItems)
    .map((item) => itemToBrief({
      item,
      board,
      operatorLocale,
      releaseVerification: releaseVerification || null,
      generatedAt
    }));

  return {
    schema: "naikaku.coding-agent-briefs.v1",
    generatedAt,
    mission: board.mission,
    runId: board.runId,
    operatorLocale,
    developmentBoardSchema: board.schema,
    releaseVerificationSchema: releaseVerification?.schema,
    briefs,
    summary: {
      total: briefs.length,
      implementable: briefs.filter((brief) => brief.mode === "implement").length,
      blocked: briefs.filter((brief) => brief.mode === "blocked-review").length,
      humanReview: briefs.filter((brief) => brief.sandbox.requiresHumanApproval).length,
      highPriority: briefs.filter((brief) => brief.priority === "critical" || brief.priority === "high").length,
      productionEvidenceRequired: Boolean(releaseVerification?.requireProductionEvidence)
    }
  };
}

export function serializeCodingAgentBriefs(briefs: CodingAgentBriefs) {
  return JSON.stringify(briefs, null, 2);
}

export function serializeCodingAgentBriefsMarkdown(briefs: CodingAgentBriefs) {
  return [
    "# Coding Agent Briefs",
    "",
    `Mission: ${briefs.mission}`,
    `Locale: ${briefs.operatorLocale}`,
    `Run: ${briefs.runId || "workspace"}`,
    `Generated: ${briefs.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total briefs: ${briefs.summary.total}`,
    `- Implementable: ${briefs.summary.implementable}`,
    `- Blocked review: ${briefs.summary.blocked}`,
    `- Human review required: ${briefs.summary.humanReview}`,
    `- High priority: ${briefs.summary.highPriority}`,
    `- Production evidence required: ${briefs.summary.productionEvidenceRequired ? "yes" : "no"}`,
    "",
    ...briefs.briefs.flatMap((brief, index) => briefMarkdown(brief, index + 1))
  ].join("\n");
}

function itemToBrief({
  item,
  board,
  operatorLocale,
  releaseVerification,
  generatedAt
}: {
  item: DevelopmentWorkItem;
  board: DevelopmentBoard;
  operatorLocale: string;
  releaseVerification: ReleaseVerificationReport | null;
  generatedAt: string;
}): CodingAgentBrief {
  const executorProfileId = inferExecutorProfile(item);
  const mode = modeForItem(item);
  const verificationCommands = verificationForItem(item, releaseVerification);
  const releaseGateRequired = shouldRequireReleaseGate(item, releaseVerification);
  const releaseGateNextAction = releaseVerification?.checks.find((check) => check.status === "fail")?.nextAction
    || "Attach test, build, and review evidence before marking the brief complete.";

  return {
    id: `coding-brief-${item.id}`,
    sourceItemId: item.id,
    title: item.title,
    roleId: item.roleId,
    roleName: item.roleName,
    stageId: item.stageId,
    priority: item.priority,
    status: item.status,
    mode,
    operatorLocale,
    objective: compactBody(item.body),
    prompt: buildPrompt({
      item,
      board,
      mode,
      executorProfileId,
      verificationCommands,
      releaseGateRequired,
      releaseGateNextAction,
      operatorLocale
    }),
    context: [
      `Mission: ${board.mission}`,
      `Source: ${item.source} / ${item.sourceId}`,
      item.roleName ? `Role: ${item.roleName}` : "Role: cross-role",
      item.stageId ? `Stage: ${item.stageId}` : "Stage: cross-stage",
      board.runId ? `Run: ${board.runId}` : "Run: workspace template"
    ],
    constraints: [
      "Work only inside the checked-out repository or explicitly provided sandbox workspace.",
      "Do not read, print, export, or persist raw provider secrets or runner tokens.",
      "Do not deploy, purchase, delete remote resources, send external messages, or push Git changes unless the operator explicitly asks.",
      "Do not claim production readiness from dry-run evidence."
    ],
    acceptanceCriteria: item.acceptanceCriteria.length
      ? item.acceptanceCriteria
      : ["Define acceptance criteria with the operator before implementation."],
    deliverables: item.deliverables.length
      ? item.deliverables
      : ["Code, docs, or test changes plus a verification note."],
    verificationCommands,
    evidenceRequired: [
      "Changed files summary.",
      "Relevant command output with exit codes.",
      "Browser screenshot or DOM evidence for UI changes.",
      releaseGateRequired
        ? "Release rehearsal or verifier output attached before handoff."
        : "Reason release verification is not required for this brief."
    ],
    sandbox: {
      executorProfileId,
      allowedActions: allowedActionsForExecutor(executorProfileId),
      prohibitedActions: [
        "raw-secret-export",
        "production-deploy",
        "remote-delete",
        "purchase",
        "external-message-send",
        "unreviewed-git-push"
      ],
      requiresHumanApproval: executorProfileId === "human-approval" || item.priority === "critical" || item.status === "blocked"
    },
    releaseGate: {
      required: releaseGateRequired,
      verificationDecision: releaseVerification?.decision,
      productionEvidenceRequired: Boolean(releaseVerification?.requireProductionEvidence),
      nextAction: releaseGateNextAction
    },
    generatedAt
  };
}

function buildPrompt({
  item,
  board,
  mode,
  executorProfileId,
  verificationCommands,
  releaseGateRequired,
  releaseGateNextAction,
  operatorLocale
}: {
  item: DevelopmentWorkItem;
  board: DevelopmentBoard;
  mode: CodingAgentMode;
  executorProfileId: ExecutorProfileId;
  verificationCommands: string[];
  releaseGateRequired: boolean;
  releaseGateNextAction: string;
  operatorLocale: string;
}) {
  const languageInstruction = operatorLanguageInstruction(operatorLocale);

  return [
    "You are a sandboxed coding agent for Naikaku AI Togo.",
    `Operator language: ${operatorLocale}.`,
    `Write operator-facing summaries, risks, and next actions in ${languageInstruction}. Keep commands, file paths, JSON schema keys, and evidence artifact paths unchanged.`,
    `Mission: ${board.mission}`,
    `Task: ${item.title}`,
    `Mode: ${mode}. Priority: ${item.priority}. Status: ${item.status}.`,
    `Executor boundary: ${executorProfileId}.`,
    "",
    "Work:",
    `- ${compactBody(item.body)}`,
    ...item.deliverables.map((deliverable) => `- Deliver: ${deliverable}`),
    "",
    "Acceptance:",
    ...item.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    "",
    "Verification:",
    ...verificationCommands.map((command) => `- Run \`${command}\` when relevant and report the exit code.`),
    releaseGateRequired ? `- Release gate: ${releaseGateNextAction}` : "- Release gate: explain why release verification is not required.",
    "",
    "Safety:",
    "- Keep raw secrets out of prompts, logs, files, and exports.",
    "- Use dry-run evidence honestly; never call it production evidence.",
    "- Do not push or deploy unless the operator explicitly asks after review.",
    "",
    "Return a concise summary, files changed, verification evidence, and remaining risks."
  ].join("\n");
}

function operatorLanguageInstruction(locale: string) {
  if (locale === "en") return "English";
  if (locale === "zh-Hans") return "Simplified Chinese";
  if (locale === "zh-Hant") return "Traditional Chinese";
  if (locale === "ko") return "Korean";
  return "Japanese";
}

function briefMarkdown(brief: CodingAgentBrief, index: number) {
  return [
    `## ${index}. ${brief.title}`,
    "",
    `- Mode: ${brief.mode}`,
    `- Priority: ${brief.priority}`,
    `- Status: ${brief.status}`,
    `- Role: ${brief.roleName || "cross-role"}`,
    `- Executor: ${brief.sandbox.executorProfileId}`,
    `- Release gate: ${brief.releaseGate.required ? "required" : "not required"}`,
    "",
    "### Prompt",
    "",
    "```text",
    brief.prompt,
    "```",
    "",
    "### Verification Commands",
    "",
    ...brief.verificationCommands.map((command) => `- \`${command}\``),
    "",
    "### Evidence Required",
    "",
    ...brief.evidenceRequired.map((item) => `- ${item}`),
    ""
  ];
}

function modeForItem(item: DevelopmentWorkItem): CodingAgentMode {
  if (item.status === "blocked") return "blocked-review";
  if (item.status === "done") return "verify";
  if (item.status === "in-progress") return "review";
  return "implement";
}

function inferExecutorProfile(item: DevelopmentWorkItem): ExecutorProfileId {
  const match = item.tags.find((tag) => executorProfileIds.includes(tag as ExecutorProfileId));
  if (match) return match as ExecutorProfileId;
  if (item.source === "release-remediation") return "human-approval";
  return "shell-container";
}

function verificationForItem(
  item: DevelopmentWorkItem,
  releaseVerification: ReleaseVerificationReport | null
) {
  const commands = ["npm run test", "npm run build"];

  if (item.source === "release-remediation" || item.priority === "critical" || item.priority === "high") {
    commands.push("npm run rehearsal:strict -- --no-write");
  }

  if (releaseVerification || item.source === "release-remediation") {
    commands.push("npm run release:verify");
  }

  return Array.from(new Set(commands));
}

function shouldRequireReleaseGate(
  item: DevelopmentWorkItem,
  releaseVerification: ReleaseVerificationReport | null
) {
  return Boolean(releaseVerification) || item.source === "release-remediation" || item.priority === "critical";
}

function allowedActionsForExecutor(executorProfileId: ExecutorProfileId) {
  if (executorProfileId === "browser-sandbox") {
    return ["inspect approved URLs", "capture screenshots", "record DOM evidence", "prepare browser-run notes"];
  }
  if (executorProfileId === "desktop-vm") {
    return ["operate disposable desktop session", "capture screenshots", "record input log", "export VM evidence"];
  }
  if (executorProfileId === "mcp-proxy") {
    return ["call allowlisted MCP tools", "validate schemas", "record request hashes", "prepare memory proposals"];
  }
  if (executorProfileId === "human-approval") {
    return ["prepare exact payload preview", "request operator approval", "record approval decision"];
  }
  return ["edit repository files", "run bounded local commands", "write sandbox artifacts", "attach command transcripts"];
}

function compareItems(a: DevelopmentWorkItem, b: DevelopmentWorkItem) {
  return priorityWeight(b.priority) - priorityWeight(a.priority)
    || statusWeight(b.status) - statusWeight(a.status)
    || a.title.localeCompare(b.title);
}

function priorityWeight(priority: DevelopmentWorkItem["priority"]) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function statusWeight(status: DevelopmentWorkItem["status"]) {
  if (status === "blocked") return 4;
  if (status === "todo") return 3;
  if (status === "in-progress") return 2;
  return 1;
}

function compactBody(value: string) {
  const body = value.replace(/\s+/g, " ").trim();
  return body.length > 240 ? `${body.slice(0, 237)}...` : body;
}
