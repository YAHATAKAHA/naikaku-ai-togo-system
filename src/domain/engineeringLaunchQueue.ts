import type {
  CodingAgentRunnerIntakeAudit,
  CodingAgentRunnerIntakeAuditItem,
  CodingAgentRunnerInvocationItem,
  CodingAgentRunnerInvocationPackage,
  CodingAgentRunnerManifest,
  CodingAgentRunnerManifestTask,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestItem,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerPreflightItem,
  ExecutorProfileId
} from "./types";

export type EngineeringLaunchQueueDecision =
  | "not-prepared"
  | "queue-ready"
  | "preflight-ready"
  | "needs-review"
  | "blocked";

export type EngineeringLaunchQueueItemStatus =
  | "ready-to-run"
  | "ready-to-handoff"
  | "held"
  | "blocked";

export interface EngineeringLaunchQueueCommand {
  command: string;
  transcriptRef: string | null;
  status: "allowed" | "pending" | "blocked" | "not-runnable";
  reason: string;
}

export interface EngineeringLaunchQueueItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  runnerId: string;
  status: EngineeringLaunchQueueItemStatus;
  promptPath: string | null;
  invocationPath: string | null;
  receiptDraftPath: string | null;
  evidenceArtifactPrefix: string;
  commands: EngineeringLaunchQueueCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  blockers: string[];
  operatorSteps: string[];
  nextAction: string;
}

export interface EngineeringLaunchQueue {
  schema: "naikaku.engineering-launch-queue.v1";
  generatedAt: string;
  decision: EngineeringLaunchQueueDecision;
  runId?: string;
  operatorLocale: string;
  canHandToCodingAgent: boolean;
  canRunLocalVerification: boolean;
  canClaimCompletion: boolean;
  items: EngineeringLaunchQueueItem[];
  summary: {
    total: number;
    readyToRun: number;
    readyToHandoff: number;
    held: number;
    blocked: number;
    invocationFiles: number;
    acceptedIntakes: number;
    allowedCommands: number;
    pendingCommands: number;
    blockedCommands: number;
    expectedEvidenceArtifacts: number;
  };
  operatorChecklist: string[];
  honestyClaim: {
    level: "engineering-launch-queue";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface BuildEngineeringLaunchQueueInput {
  runnerManifest: CodingAgentRunnerManifest | null;
  runnerInvocation?: CodingAgentRunnerInvocationPackage | null;
  runnerIntake?: CodingAgentRunnerIntakeAudit | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  generatedAt?: string;
}

export function buildEngineeringLaunchQueue({
  runnerManifest,
  runnerInvocation = null,
  runnerIntake = null,
  runnerSelfTest = null,
  sandboxRunnerPreflight = null,
  generatedAt = new Date().toISOString()
}: BuildEngineeringLaunchQueueInput): EngineeringLaunchQueue {
  if (!runnerManifest) {
    return emptyQueue({ generatedAt });
  }

  const invocationBySession = mapBySession(runnerInvocation?.items || []);
  const intakeBySession = mapBySession(runnerIntake?.items || []);
  const selfTestBySession = mapBySession(runnerSelfTest?.items || []);
  const preflightBySession = mapBySession(sandboxRunnerPreflight?.items || []);
  const items = runnerManifest.items.map((task) =>
    queueItemFor({
      task,
      invocation: invocationBySession.get(task.sessionId) || null,
      intake: intakeBySession.get(task.sessionId) || null,
      selfTest: selfTestBySession.get(task.sessionId) || null,
      preflight: preflightBySession.get(task.sessionId) || null
    })
  );
  const readyToRun = items.filter((item) => item.status === "ready-to-run").length;
  const readyToHandoff = items.filter((item) => item.status === "ready-to-handoff").length;
  const held = items.filter((item) => item.status === "held").length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const allowedCommands = items.reduce((total, item) =>
    total + item.commands.filter((command) => command.status === "allowed").length,
  0);
  const pendingCommands = items.reduce((total, item) =>
    total + item.commands.filter((command) => command.status === "pending").length,
  0);
  const blockedCommands = items.reduce((total, item) =>
    total + item.commands.filter((command) => command.status === "blocked").length,
  0);

  return {
    schema: "naikaku.engineering-launch-queue.v1",
    generatedAt,
    decision: decisionFor({
      total: items.length,
      readyToRun,
      readyToHandoff,
      held,
      blocked
    }),
    runId: runnerManifest.runId,
    operatorLocale: runnerManifest.operatorLocale,
    canHandToCodingAgent: blocked === 0 && readyToHandoff + readyToRun > 0,
    canRunLocalVerification: blocked === 0 && readyToRun > 0,
    canClaimCompletion: false,
    items,
    summary: {
      total: items.length,
      readyToRun,
      readyToHandoff,
      held,
      blocked,
      invocationFiles: items.filter((item) => Boolean(item.invocationPath)).length,
      acceptedIntakes: runnerIntake?.summary.acceptedIntakes || 0,
      allowedCommands,
      pendingCommands,
      blockedCommands,
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0)
    },
    operatorChecklist: operatorChecklistFor({
      canRunLocalVerification: blocked === 0 && readyToRun > 0,
      canHandToCodingAgent: blocked === 0 && readyToHandoff + readyToRun > 0
    }),
    honestyClaim: {
      level: "engineering-launch-queue",
      claim: "This queue prepares coding-agent work orders and local verification contracts; it does not execute implementation work or prove completion.",
      limitations: [
        "It does not edit files, run shell commands, control macOS, call MCP tools, call providers, commit, push, deploy, or send external messages.",
        "Ready-to-run items mean command contracts passed local preflight; completed receipts still require real runner transcripts and artifact audits.",
        "Completion remains false until a governed runner returns changed files, command results, evidence artifacts, and a reviewed receipt."
      ],
      productionRequirements: [
        "Give each work order only to a scoped coding runner with repository-limited file access.",
        "Record exact commands, transcripts, exit codes, changed files, and evidence artifacts before accepting work.",
        "Keep Git push, deploy, external writes, Mac desktop control, and production credentials behind exact human approval."
      ]
    }
  };
}

export function serializeEngineeringLaunchQueue(report: EngineeringLaunchQueue) {
  return JSON.stringify(report, null, 2);
}

export function serializeEngineeringLaunchQueueMarkdown(report: EngineeringLaunchQueue) {
  return [
    "# Engineering Launch Queue",
    "",
    `Decision: ${report.decision}`,
    `Locale: ${report.operatorLocale}`,
    `Run: ${report.runId || "workspace"}`,
    `Generated: ${report.generatedAt}`,
    `Can hand to coding agent: ${report.canHandToCodingAgent ? "yes" : "no"}`,
    `Can run local verification: ${report.canRunLocalVerification ? "yes" : "no"}`,
    `Can claim completion: ${report.canClaimCompletion ? "yes" : "no"}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Total work orders: ${report.summary.total}`,
    `- Ready to run: ${report.summary.readyToRun}`,
    `- Ready to handoff: ${report.summary.readyToHandoff}`,
    `- Held: ${report.summary.held}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Invocation files: ${report.summary.invocationFiles}`,
    `- Accepted intakes: ${report.summary.acceptedIntakes}`,
    `- Allowed commands: ${report.summary.allowedCommands}`,
    `- Pending commands: ${report.summary.pendingCommands}`,
    `- Blocked commands: ${report.summary.blockedCommands}`,
    `- Expected evidence artifacts: ${report.summary.expectedEvidenceArtifacts}`,
    "",
    "## Operator Checklist",
    "",
    ...report.operatorChecklist.map((item) => `- ${item}`),
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function emptyQueue({ generatedAt }: { generatedAt: string }): EngineeringLaunchQueue {
  return {
    schema: "naikaku.engineering-launch-queue.v1",
    generatedAt,
    decision: "not-prepared",
    operatorLocale: "ja",
    canHandToCodingAgent: false,
    canRunLocalVerification: false,
    canClaimCompletion: false,
    items: [],
    summary: {
      total: 0,
      readyToRun: 0,
      readyToHandoff: 0,
      held: 0,
      blocked: 0,
      invocationFiles: 0,
      acceptedIntakes: 0,
      allowedCommands: 0,
      pendingCommands: 0,
      blockedCommands: 0,
      expectedEvidenceArtifacts: 0
    },
    operatorChecklist: operatorChecklistFor({
      canHandToCodingAgent: false,
      canRunLocalVerification: false
    }),
    honestyClaim: {
      level: "engineering-launch-queue",
      claim: "No runner manifest has been prepared yet.",
      limitations: [
        "No coding-agent work orders exist yet.",
        "No local runner command contracts have been created.",
        "No completion claim can be made from an empty queue."
      ],
      productionRequirements: [
        "Run the cabinet and prepare the engineering pack before handing work to a coding runner."
      ]
    }
  };
}

function queueItemFor({
  task,
  invocation,
  intake,
  selfTest,
  preflight
}: {
  task: CodingAgentRunnerManifestTask;
  invocation: CodingAgentRunnerInvocationItem | null;
  intake: CodingAgentRunnerIntakeAuditItem | null;
  selfTest: CodingAgentRunnerSelfTestItem | null;
  preflight: CodingAgentSandboxRunnerPreflightItem | null;
}): EngineeringLaunchQueueItem {
  const blockers = blockersFor({ task, invocation, intake, selfTest, preflight });
  const commands = commandsFor({ task, selfTest, preflight });
  const status = statusFor({ task, invocation, intake, selfTest, preflight, blockers });

  return {
    sessionId: task.sessionId,
    sourceItemId: task.sourceItemId,
    title: task.title,
    executorProfileId: task.executorProfileId,
    runnerId: task.runnerId,
    status,
    promptPath: invocation?.promptPath || task.promptPath,
    invocationPath: invocation?.invocationPath || null,
    receiptDraftPath: invocation?.receiptDraftPath || task.receiptDraftPath,
    evidenceArtifactPrefix: task.evidenceArtifactPrefix,
    commands,
    expectedEvidenceArtifacts: preflight?.expectedEvidenceArtifacts ||
      selfTest?.expectedEvidenceArtifacts ||
      task.expectedEvidenceArtifacts,
    blockers,
    operatorSteps: operatorStepsFor({ status, invocationPath: invocation?.invocationPath || null }),
    nextAction: nextActionFor({ status, task, invocation, intake, selfTest, preflight })
  };
}

function commandsFor({
  task,
  selfTest,
  preflight
}: {
  task: CodingAgentRunnerManifestTask;
  selfTest: CodingAgentRunnerSelfTestItem | null;
  preflight: CodingAgentSandboxRunnerPreflightItem | null;
}): EngineeringLaunchQueueCommand[] {
  if (preflight) {
    return preflight.commands.map((command) => ({
      command: command.command,
      transcriptRef: command.transcriptRef,
      status: command.status === "allowed" ? "allowed" : command.status,
      reason: command.reason
    }));
  }
  if (selfTest) {
    return selfTest.commands.map((command) => ({
      command: command.command,
      transcriptRef: command.transcriptRef,
      status: "pending",
      reason: command.evidenceNote
    }));
  }
  return task.commands.map((command) => ({
    command: command.command,
    transcriptRef: command.transcriptRef,
    status: "pending",
    reason: "Command contract is pending runner self-test and local preflight."
  }));
}

function blockersFor({
  task,
  invocation,
  intake,
  selfTest,
  preflight
}: {
  task: CodingAgentRunnerManifestTask;
  invocation: CodingAgentRunnerInvocationItem | null;
  intake: CodingAgentRunnerIntakeAuditItem | null;
  selfTest: CodingAgentRunnerSelfTestItem | null;
  preflight: CodingAgentSandboxRunnerPreflightItem | null;
}) {
  const blockers = [
    ...blockedCheckSummaries("manifest", task.checks),
    ...blockedCheckSummaries("invocation", invocation?.checks || []),
    ...blockedCheckSummaries("intake", intake?.checks || []),
    ...blockedCheckSummaries("self-test", selfTest?.checks || []),
    ...blockedCheckSummaries("preflight", preflight?.checks || [])
  ];

  if (!invocation) {
    blockers.push("Invocation package has not been prepared for this session.");
  }
  if (!intake) {
    blockers.push("Runner intake audit has not accepted this session.");
  }
  if (!selfTest) {
    blockers.push("Local runner self-test has not been generated for this session.");
  }
  if (preflight?.commands.some((command) => command.status === "blocked")) {
    blockers.push("One or more commands are blocked by local runner preflight.");
  }

  return blockers;
}

function statusFor({
  task,
  invocation,
  intake,
  selfTest,
  preflight,
  blockers
}: {
  task: CodingAgentRunnerManifestTask;
  invocation: CodingAgentRunnerInvocationItem | null;
  intake: CodingAgentRunnerIntakeAuditItem | null;
  selfTest: CodingAgentRunnerSelfTestItem | null;
  preflight: CodingAgentSandboxRunnerPreflightItem | null;
  blockers: string[];
}): EngineeringLaunchQueueItemStatus {
  const hasHardBlocker = blockers.some((blocker) =>
    blocker.startsWith("manifest:") ||
    blocker.startsWith("invocation:") ||
    blocker.startsWith("intake:") ||
    blocker.startsWith("self-test:") ||
    blocker.startsWith("preflight:") ||
    blocker.startsWith("One or more commands")
  );

  if (
    task.status === "blocked" ||
    invocation?.invocationStatus === "blocked" ||
    intake?.intakeStatus === "blocked" ||
    selfTest?.selfTestStatus === "blocked" ||
    preflight?.preflightStatus === "blocked" ||
    hasHardBlocker
  ) {
    return "blocked";
  }
  if (preflight?.preflightStatus === "ready") {
    return "ready-to-run";
  }
  if (
    task.status === "ready-for-runner" &&
    invocation?.invocationStatus === "invocation-ready" &&
    intake?.intakeStatus === "accepted-for-runner" &&
    selfTest?.selfTestStatus === "would-run"
  ) {
    return "ready-to-handoff";
  }
  return "held";
}

function nextActionFor({
  status,
  task,
  invocation,
  intake,
  selfTest,
  preflight
}: {
  status: EngineeringLaunchQueueItemStatus;
  task: CodingAgentRunnerManifestTask;
  invocation: CodingAgentRunnerInvocationItem | null;
  intake: CodingAgentRunnerIntakeAuditItem | null;
  selfTest: CodingAgentRunnerSelfTestItem | null;
  preflight: CodingAgentSandboxRunnerPreflightItem | null;
}) {
  if (status === "ready-to-run") {
    return "Run only the allowed local verification commands in the scoped sandbox, then return completed receipts and evidence.";
  }
  if (status === "ready-to-handoff") {
    return "Hand the invocation file to a governed coding runner, then run local preflight before executing commands.";
  }
  if (status === "blocked") {
    return task.nextAction ||
      invocation?.nextAction ||
      intake?.nextAction ||
      selfTest?.nextAction ||
      preflight?.nextAction ||
      "Fix blocked queue checks before handing this work to a runner.";
  }
  return preflight?.nextAction ||
    selfTest?.nextAction ||
    intake?.nextAction ||
    invocation?.nextAction ||
    task.nextAction;
}

function operatorStepsFor({
  status,
  invocationPath
}: {
  status: EngineeringLaunchQueueItemStatus;
  invocationPath: string | null;
}) {
  if (status === "ready-to-run") {
    return [
      "Open the invocation payload in a scoped coding-agent workspace.",
      "Apply code changes only inside the repository or sandbox mount.",
      "Run the allowlisted commands and write transcripts to the declared evidence paths.",
      "Return the completed receipt for artifact audit and completion-gate review."
    ];
  }
  if (status === "ready-to-handoff") {
    return [
      `Prepare the invocation payload${invocationPath ? ` at ${invocationPath}` : ""}.`,
      "Confirm runner identity and repository scope before starting.",
      "Run sandbox preflight before any command execution.",
      "Keep completion claims blocked until real transcripts and artifacts exist."
    ];
  }
  return [
    "Review blocked or missing queue prerequisites.",
    "Regenerate the engineering pack after fixing the source issue.",
    "Do not hand this session to a runner until queue status is ready."
  ];
}

function operatorChecklistFor({
  canHandToCodingAgent,
  canRunLocalVerification
}: {
  canHandToCodingAgent: boolean;
  canRunLocalVerification: boolean;
}) {
  if (canRunLocalVerification) {
    return [
      "Use the ready-to-run work orders as the local coding-agent queue.",
      "Execute only allowed commands and write transcripts to their declared paths.",
      "Attach changed file summaries, evidence artifacts, and completed receipts before claiming completion.",
      "Keep Git push, deploy, external writes, and Mac desktop control behind exact human approval."
    ];
  }
  if (canHandToCodingAgent) {
    return [
      "Hand ready work orders to a governed coding agent with repository-limited file access.",
      "Run local sandbox preflight before executing any command contracts.",
      "Return completed receipts, transcripts, changed files, and evidence artifacts.",
      "Keep completion claims disabled until artifact audit accepts the real runner output."
    ];
  }
  return [
    "Run the cabinet and prepare the engineering pack from the mission brief.",
    "Resolve held or blocked runner checks before handing work to a coding agent.",
    "Do not claim code changes or completion from planning-only artifacts."
  ];
}

function decisionFor({
  total,
  readyToRun,
  readyToHandoff,
  held,
  blocked
}: {
  total: number;
  readyToRun: number;
  readyToHandoff: number;
  held: number;
  blocked: number;
}): EngineeringLaunchQueueDecision {
  if (total === 0) return "not-prepared";
  if (blocked > 0) return "blocked";
  if (readyToRun > 0 && held === 0) return "preflight-ready";
  if (readyToRun + readyToHandoff > 0) return "queue-ready";
  return "needs-review";
}

function itemMarkdown(item: EngineeringLaunchQueueItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session: ${item.sessionId}`,
    `- Status: ${item.status}`,
    `- Executor: ${item.executorProfileId}`,
    `- Runner: ${item.runnerId}`,
    `- Prompt: ${item.promptPath || "not-attached"}`,
    `- Invocation: ${item.invocationPath || "not-attached"}`,
    `- Receipt draft: ${item.receiptDraftPath || "not-attached"}`,
    `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
    "",
    "### Commands",
    "",
    ...item.commands.map((command) =>
      `- ${command.status}: ${command.command} -> ${command.transcriptRef || "no transcript"}`
    ),
    "",
    "### Evidence",
    "",
    ...item.expectedEvidenceArtifacts.map((artifact) => `- ${artifact.label}: ${artifact.path}`),
    "",
    "### Operator Steps",
    "",
    ...item.operatorSteps.map((step) => `- ${step}`),
    "",
    ...(item.blockers.length
      ? [
        "### Blockers",
        "",
        ...item.blockers.map((blocker) => `- ${blocker}`),
        ""
      ]
      : [])
  ];
}

function blockedCheckSummaries(
  source: string,
  checks: Array<{ status: "pass" | "warn" | "block"; summary: string }>
) {
  return checks
    .filter((check) => check.status === "block")
    .map((check) => `${source}: ${check.summary}`);
}

function mapBySession<T extends { sessionId: string }>(items: T[]) {
  return new Map(items.map((item) => [item.sessionId, item]));
}
