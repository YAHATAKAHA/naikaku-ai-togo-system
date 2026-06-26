import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentRunnerManifest,
  CodingAgentRunnerManifestTask,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestDecision,
  CodingAgentRunnerSelfTestItem,
  CodingAgentRunnerSelfTestItemStatus
} from "./types";

export interface BuildCodingAgentRunnerSelfTestInput {
  manifest: CodingAgentRunnerManifest;
  generatedAt?: string;
}

export function buildCodingAgentRunnerSelfTest({
  manifest,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentRunnerSelfTestInput): CodingAgentRunnerSelfTest {
  const items = manifest.items.map(selfTestItemFor);
  const wouldRun = items.filter((item) => item.selfTestStatus === "would-run").length;
  const held = items.filter((item) => item.selfTestStatus === "held").length;
  const blocked = items.filter((item) => item.selfTestStatus === "blocked").length;
  const unsafePaths = items.reduce((total, item) =>
    total + item.checks.filter((check) => check.id.endsWith("-path") && check.status === "block").length,
  0);

  return {
    schema: "naikaku.coding-agent-runner-self-test.v1",
    generatedAt,
    mode: "local-runner-self-test",
    sourceSchema: manifest.schema,
    sourceDecision: manifest.decision,
    decision: decisionFor({
      manifest,
      wouldRun,
      blocked
    }),
    runId: manifest.runId,
    operatorLocale: manifest.operatorLocale,
    items,
    summary: {
      total: items.length,
      wouldRun,
      held,
      blocked,
      readyRunnerTasks: manifest.summary.readyTasks,
      simulatedActions: items.reduce((total, item) => total + item.simulatedActions.length, 0),
      pendingCommands: manifest.summary.plannedCommands,
      notExecutedCommands: items.reduce((total, item) => total + item.commands.length, 0),
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0),
      receiptDraftPaths: items.filter((item) => Boolean(item.receiptDraftPath)).length,
      unsafePaths,
      stopConditions: manifest.summary.stopConditions
    },
    honestyClaim: {
      level: "local-runner-self-test",
      claim: "This self-test simulates runner preflight consumption of a coding-agent runner manifest without executing implementation work.",
      limitations: [
        "It does not read prompt file contents, edit files, run commands, open browsers, control desktops, call MCP tools, call providers, commit, push, deploy, or inspect production systems.",
        "Command results stay not-executed with null exit codes; any completed receipt must come from a real governed runner workspace.",
        "A self-test-ready decision means the runner handoff contract is internally consumable, not that implementation work is done."
      ],
      productionRequirements: [
        "Run each would-run task inside the named sandbox executor profile or an equivalent governed coding workspace.",
        "Replace self-test command placeholders with real transcripts, exit codes, changed files, evidence artifacts, and remaining risks.",
        "Review completed receipts and artifact audits before reconciling the Development Board or claiming release readiness."
      ]
    }
  };
}

export function serializeCodingAgentRunnerSelfTest(report: CodingAgentRunnerSelfTest) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentRunnerSelfTestMarkdown(report: CodingAgentRunnerSelfTest) {
  return [
    "# Coding Agent Runner Self-Test",
    "",
    `Mode: ${report.mode}`,
    `Decision: ${report.decision}`,
    `Source decision: ${report.sourceDecision}`,
    `Locale: ${report.operatorLocale}`,
    `Run: ${report.runId || "workspace"}`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Total tasks: ${report.summary.total}`,
    `- Would run in sandbox: ${report.summary.wouldRun}`,
    `- Held: ${report.summary.held}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Simulated actions: ${report.summary.simulatedActions}`,
    `- Pending commands: ${report.summary.pendingCommands}`,
    `- Not-executed commands: ${report.summary.notExecutedCommands}`,
    `- Expected evidence artifacts: ${report.summary.expectedEvidenceArtifacts}`,
    `- Receipt draft paths: ${report.summary.receiptDraftPaths}`,
    `- Unsafe paths: ${report.summary.unsafePaths}`,
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function selfTestItemFor(task: CodingAgentRunnerManifestTask): CodingAgentRunnerSelfTestItem {
  const checks = checksFor(task);
  const selfTestStatus = statusFor(task, checks);

  return {
    sessionId: task.sessionId,
    sourceItemId: task.sourceItemId,
    title: task.title,
    executorProfileId: task.executorProfileId,
    runnerId: task.runnerId,
    manifestTaskStatus: task.status,
    selfTestStatus,
    promptPath: task.promptPath,
    receiptDraftPath: task.receiptDraftPath,
    evidenceArtifactPrefix: task.evidenceArtifactPrefix,
    commands: task.commands.map((command) => ({
      command: command.command,
      transcriptRef: command.transcriptRef,
      status: "not-executed",
      exitCode: null,
      evidenceNote: "Self-test verified the command contract only; a real runner must execute and attach the transcript."
    })),
    expectedEvidenceArtifacts: task.expectedEvidenceArtifacts,
    simulatedActions: simulatedActionsFor(task, selfTestStatus),
    checks,
    nextAction: nextActionFor(task, selfTestStatus)
  };
}

function checksFor(task: CodingAgentRunnerManifestTask) {
  const ready = task.status === "ready-for-runner";
  const pendingCommandsOnly = task.commands.every((command) =>
    command.status === "pending-real-execution" &&
    command.exitCode === null &&
    Boolean(command.transcriptRef)
  );
  const transcriptRefs = task.commands.map((command) => command.transcriptRef).filter(Boolean) as string[];
  const transcriptRefsSafe = transcriptRefs.length === task.commands.length &&
    transcriptRefs.every((ref) => isSafeRelativeArtifactPath(ref) && ref.startsWith(task.evidenceArtifactPrefix));
  const evidencePathsSafe = task.expectedEvidenceArtifacts.every((artifact) =>
    isSafeRelativeArtifactPath(artifact.path) && artifact.path.startsWith(task.evidenceArtifactPrefix)
  );
  const hasStopConditions = task.stopConditions.some((condition) => condition.includes("host secrets")) &&
    task.stopConditions.some((condition) => condition.includes("production deploy")) &&
    task.stopConditions.some((condition) => condition.includes("Git push"));

  return [
    {
      id: "runner-task-status",
      status: ready ? "pass" as const : task.status === "blocked" ? "block" as const : "warn" as const,
      summary: ready
        ? "Runner task is ready for sandbox preflight."
        : `Runner task is ${task.status} and must not be simulated as runnable.`
    },
    {
      id: "prompt-path",
      status: ready && task.promptPath && isSafeRelativeArtifactPath(task.promptPath)
        ? "pass" as const
        : ready ? "block" as const : task.promptPath ? "block" as const : "pass" as const,
      summary: task.promptPath ? `Prompt path is ${task.promptPath}.` : "Prompt path is not attached."
    },
    {
      id: "receipt-draft-path",
      status: ready && task.receiptDraftPath && isSafeRelativeArtifactPath(task.receiptDraftPath)
        ? "pass" as const
        : ready ? "block" as const : task.receiptDraftPath ? "block" as const : "pass" as const,
      summary: task.receiptDraftPath ? `Receipt draft path is ${task.receiptDraftPath}.` : "Receipt draft path is not attached."
    },
    {
      id: "evidence-prefix-path",
      status: isSafeRelativeArtifactPath(task.evidenceArtifactPrefix) ? "pass" as const : "block" as const,
      summary: `Evidence prefix is ${task.evidenceArtifactPrefix}.`
    },
    {
      id: "pending-command-contract",
      status: ready && pendingCommandsOnly ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: `${task.commands.length} command contracts remain pending real execution.`
    },
    {
      id: "transcript-scope-path",
      status: ready && transcriptRefsSafe ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: `${transcriptRefs.length} transcript refs stay under the evidence prefix.`
    },
    {
      id: "evidence-artifact-path",
      status: evidencePathsSafe ? "pass" as const : "block" as const,
      summary: `${task.expectedEvidenceArtifacts.length} expected evidence artifact paths checked.`
    },
    {
      id: "planned-command-count",
      status: task.commands.length > 0 ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: `${task.commands.length} commands are present for a real runner.`
    },
    {
      id: "stop-conditions",
      status: hasStopConditions ? "pass" as const : "block" as const,
      summary: `${task.stopConditions.length} stop conditions are available to the runner.`
    },
    {
      id: "no-real-execution",
      status: task.commands.every((command) => command.exitCode === null) ? "pass" as const : "block" as const,
      summary: "Self-test observes no completed command exit codes."
    }
  ];
}

function statusFor(
  task: CodingAgentRunnerManifestTask,
  checks: ReturnType<typeof checksFor>
): CodingAgentRunnerSelfTestItemStatus {
  if (task.status !== "ready-for-runner") {
    return task.status === "blocked" ? "blocked" : "held";
  }
  if (checks.some((check) => check.status === "block")) {
    return "blocked";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "held";
  }
  return "would-run";
}

function simulatedActionsFor(
  task: CodingAgentRunnerManifestTask,
  selfTestStatus: CodingAgentRunnerSelfTestItemStatus
) {
  if (selfTestStatus !== "would-run") {
    return [
      "Do not queue this task for runner execution until the manifest checks are fixed.",
      task.nextAction
    ];
  }

  return [
    `Would open prompt ${task.promptPath} inside ${task.executorProfileId}.`,
    `Would keep ${task.commands.length} commands pending for real sandbox execution.`,
    `Would require transcripts and artifacts under ${task.evidenceArtifactPrefix}.`,
    `Would update pending receipt draft ${task.receiptDraftPath} only after real execution evidence exists.`
  ];
}

function nextActionFor(
  task: CodingAgentRunnerManifestTask,
  selfTestStatus: CodingAgentRunnerSelfTestItemStatus
) {
  if (selfTestStatus === "would-run") {
    return "Self-test passed. Hand this task to a governed runner, then require a completed receipt and artifact audit before accepting work.";
  }
  if (selfTestStatus === "blocked") {
    return "Fix blocked self-test checks before this task can enter any runner queue.";
  }
  return task.nextAction;
}

function decisionFor({
  manifest,
  wouldRun,
  blocked
}: {
  manifest: CodingAgentRunnerManifest;
  wouldRun: number;
  blocked: number;
}): CodingAgentRunnerSelfTestDecision {
  if (blocked > 0 || manifest.decision === "blocked") {
    return "blocked";
  }
  if (manifest.decision !== "runner-ready") {
    return "needs-review";
  }
  return wouldRun > 0 ? "self-test-ready" : "needs-review";
}

function itemMarkdown(item: CodingAgentRunnerSelfTestItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session: ${item.sessionId}`,
    `- Runner: ${item.runnerId}`,
    `- Executor: ${item.executorProfileId}`,
    `- Manifest status: ${item.manifestTaskStatus}`,
    `- Self-test status: ${item.selfTestStatus}`,
    `- Prompt: ${item.promptPath || "not-attached"}`,
    `- Receipt draft: ${item.receiptDraftPath || "not-attached"}`,
    "",
    "### Simulated Actions",
    "",
    ...item.simulatedActions.map((action) => `- ${action}`),
    "",
    "### Not-Executed Commands",
    "",
    ...item.commands.map((command) =>
      `- ${command.command} -> ${command.status}; transcript: ${command.transcriptRef || "not-attached"}`
    ),
    "",
    "### Checks",
    "",
    ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
    ""
  ];
}
