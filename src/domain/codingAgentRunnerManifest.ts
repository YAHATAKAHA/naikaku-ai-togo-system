import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentDispatchSimulation,
  CodingAgentDispatchSimulationItem,
  CodingAgentRunnerManifest,
  CodingAgentRunnerManifestDecision,
  CodingAgentRunnerManifestTask,
  CodingAgentRunnerTaskStatus
} from "./types";

export interface BuildCodingAgentRunnerManifestInput {
  simulation: CodingAgentDispatchSimulation;
  receiptDraftPaths?: Record<string, string>;
  generatedAt?: string;
}

export function buildCodingAgentRunnerManifest({
  simulation,
  receiptDraftPaths = {},
  generatedAt = new Date().toISOString()
}: BuildCodingAgentRunnerManifestInput): CodingAgentRunnerManifest {
  const items = simulation.items.map((item) =>
    taskFor({
      item,
      receiptDraftPath: receiptDraftPaths[item.sessionId] || null
    })
  );
  const readyTasks = items.filter((item) => item.status === "ready-for-runner").length;
  const heldTasks = items.filter((item) => item.status === "held").length;
  const blockedTasks = items.filter((item) => item.status === "blocked").length;

  return {
    schema: "naikaku.coding-agent-runner-manifest.v1",
    generatedAt,
    mode: "runner-handoff-planning",
    sourceSchema: simulation.schema,
    simulationDecision: simulation.decision,
    decision: decisionFor({
      simulation,
      readyTasks,
      blockedTasks,
      items
    }),
    runId: simulation.runId,
    operatorLocale: simulation.operatorLocale,
    items,
    summary: {
      total: items.length,
      readyTasks,
      heldTasks,
      blockedTasks,
      runnerTasks: readyTasks,
      plannedCommands: items.reduce((total, item) => total + item.commands.length, 0),
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0),
      receiptDraftPaths: items.filter((item) => Boolean(item.receiptDraftPath)).length,
      unsafePaths: items.reduce((total, item) =>
        total + item.checks.filter((check) => check.id.endsWith("-path") && check.status === "block").length,
      0),
      stopConditions: items.reduce((total, item) => total + item.stopConditions.length, 0)
    },
    honestyClaim: {
      level: "runner-handoff-planning",
      claim: "This manifest prepares runner-facing coding-agent handoff tasks without executing implementation work.",
      limitations: [
        "It does not run shell commands, open browsers, control desktops, call providers, edit files, commit, push, deploy, or inspect production systems.",
        "Ready runner tasks point to pending receipt drafts; they are not completed receipts or implementation evidence.",
        "A runner-ready decision means the task contract is prepared for a governed workspace, not that a real coding agent has executed it."
      ],
      productionRequirements: [
        "Run each task only inside the named sandbox executor profile or an equivalent governed coding workspace.",
        "Replace pending command results with real transcripts, exit codes, changed files, evidence artifacts, and remaining risks.",
        "Review completed receipts and artifact audits before reconciling the Development Board or claiming release readiness."
      ]
    }
  };
}

export function serializeCodingAgentRunnerManifest(manifest: CodingAgentRunnerManifest) {
  return JSON.stringify(manifest, null, 2);
}

export function serializeCodingAgentRunnerManifestMarkdown(manifest: CodingAgentRunnerManifest) {
  return [
    "# Coding Agent Runner Manifest",
    "",
    `Mode: ${manifest.mode}`,
    `Decision: ${manifest.decision}`,
    `Simulation decision: ${manifest.simulationDecision}`,
    `Locale: ${manifest.operatorLocale}`,
    `Run: ${manifest.runId || "workspace"}`,
    `Generated: ${manifest.generatedAt}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${manifest.honestyClaim.claim}`,
    ...manifest.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...manifest.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Total tasks: ${manifest.summary.total}`,
    `- Ready runner tasks: ${manifest.summary.readyTasks}`,
    `- Held tasks: ${manifest.summary.heldTasks}`,
    `- Blocked tasks: ${manifest.summary.blockedTasks}`,
    `- Planned commands: ${manifest.summary.plannedCommands}`,
    `- Expected evidence artifacts: ${manifest.summary.expectedEvidenceArtifacts}`,
    `- Receipt draft paths: ${manifest.summary.receiptDraftPaths}`,
    `- Unsafe paths: ${manifest.summary.unsafePaths}`,
    "",
    ...manifest.items.flatMap((item, index) => taskMarkdown(item, index + 1))
  ].join("\n");
}

function taskFor({
  item,
  receiptDraftPath
}: {
  item: CodingAgentDispatchSimulationItem;
  receiptDraftPath: string | null;
}): CodingAgentRunnerManifestTask {
  const checks = checksFor(item, receiptDraftPath);
  const status = statusFor(item, checks);

  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    executorProfileId: item.executorProfileId,
    runnerId: `naikaku.${item.executorProfileId}.coding-agent-runner`,
    status,
    promptPath: item.promptPath,
    receiptDraftPath,
    receiptTemplatePath: item.receiptTemplatePath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    plannedSteps: item.plannedSteps,
    commands: item.verificationCommands.map((command, index) => ({
      command,
      transcriptRef: item.expectedTranscriptRefs[index] || null,
      status: "pending-real-execution",
      exitCode: null
    })),
    expectedEvidenceArtifacts: item.expectedEvidenceArtifacts,
    stopConditions: stopConditionsFor(item),
    checks,
    nextAction: nextActionFor(item, status)
  };
}

function checksFor(item: CodingAgentDispatchSimulationItem, receiptDraftPath: string | null) {
  const ready = item.simulationStatus === "ready-for-agent";
  const pendingReceipt = Boolean(item.receiptDraft) &&
    item.receiptDraft?.changedFiles.length === 0 &&
    item.receiptDraft?.commandResults.every((result) =>
      result.exitCode === null &&
      result.outputSummary.includes("did not run this command") &&
      Boolean(result.transcriptRef?.startsWith(item.evidenceArtifactPrefix))
    );

  return [
    {
      id: "simulation-status",
      status: ready ? "pass" as const : "warn" as const,
      summary: ready
        ? "Simulation item is ready for a governed runner."
        : `Simulation item is ${item.simulationStatus} and must not be queued for a runner.`
    },
    {
      id: "prompt-path",
      status: ready && item.promptPath && isSafeRelativeArtifactPath(item.promptPath)
        ? "pass" as const
        : ready ? "block" as const : item.promptPath ? "block" as const : "pass" as const,
      summary: item.promptPath ? `Prompt path is ${item.promptPath}.` : "Prompt path is not written."
    },
    {
      id: "receipt-draft-path",
      status: ready && receiptDraftPath && isSafeRelativeArtifactPath(receiptDraftPath)
        ? "pass" as const
        : ready ? "block" as const : receiptDraftPath ? "block" as const : "pass" as const,
      summary: receiptDraftPath
        ? `Receipt draft path is ${receiptDraftPath}.`
        : "Receipt draft path is not written."
    },
    {
      id: "pending-receipt-draft",
      status: ready && pendingReceipt ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: pendingReceipt
        ? "Receipt draft is pending real execution."
        : "Receipt draft is missing or already claims execution."
    },
    {
      id: "evidence-prefix-path",
      status: isSafeRelativeArtifactPath(item.evidenceArtifactPrefix) ? "pass" as const : "block" as const,
      summary: `Evidence prefix is ${item.evidenceArtifactPrefix}.`
    },
    {
      id: "transcript-path",
      status: item.expectedTranscriptRefs.every(isSafeRelativeArtifactPath) ? "pass" as const : "block" as const,
      summary: `${item.expectedTranscriptRefs.length} transcript refs checked.`
    },
    {
      id: "evidence-artifact-path",
      status: item.expectedEvidenceArtifacts.every((artifact) => isSafeRelativeArtifactPath(artifact.path))
        ? "pass" as const
        : "block" as const,
      summary: `${item.expectedEvidenceArtifacts.length} evidence artifact paths checked.`
    },
    {
      id: "planned-commands",
      status: item.verificationCommands.length > 0 ? "pass" as const : "block" as const,
      summary: `${item.verificationCommands.length} commands stay pending for real execution.`
    },
    {
      id: "stop-conditions",
      status: item.safetyStops.length > 0 ? "pass" as const : "block" as const,
      summary: `${item.safetyStops.length} safety stops are attached.`
    }
  ];
}

function statusFor(
  item: CodingAgentDispatchSimulationItem,
  checks: ReturnType<typeof checksFor>
): CodingAgentRunnerTaskStatus {
  if (item.simulationStatus !== "ready-for-agent") {
    return item.simulationStatus === "blocked" ? "blocked" : "held";
  }
  if (checks.some((check) => check.status === "block")) {
    return "blocked";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "held";
  }
  return "ready-for-runner";
}

function stopConditionsFor(item: CodingAgentDispatchSimulationItem) {
  return [
    ...item.safetyStops,
    "Stop before reading or using host secrets, browser cookies, unapproved credentials, or production systems.",
    "Stop before any production deploy, external write, irreversible action, or unreviewed Git push.",
    `Stop if command transcripts or evidence artifacts cannot be written under ${item.evidenceArtifactPrefix}.`
  ];
}

function nextActionFor(
  item: CodingAgentDispatchSimulationItem,
  status: CodingAgentRunnerTaskStatus
) {
  if (status === "ready-for-runner") {
    return "Queue this task for a governed coding-agent runner and require a completed receipt plus artifact audit before accepting work.";
  }
  if (status === "blocked") {
    return "Fix blocked runner handoff checks before this session can enter a runner queue.";
  }
  return item.nextAction;
}

function decisionFor({
  simulation,
  readyTasks,
  blockedTasks,
  items
}: {
  simulation: CodingAgentDispatchSimulation;
  readyTasks: number;
  blockedTasks: number;
  items: CodingAgentRunnerManifestTask[];
}): CodingAgentRunnerManifestDecision {
  if (blockedTasks > 0 || simulation.decision === "blocked") {
    return "blocked";
  }
  if (
    simulation.decision !== "ready-for-real-agent" ||
    readyTasks === 0 ||
    items.some((item) => item.checks.some((check) => check.status === "warn"))
  ) {
    return "needs-review";
  }
  return "runner-ready";
}

function taskMarkdown(item: CodingAgentRunnerManifestTask, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Status: ${item.status}`,
    `- Session: ${item.sessionId}`,
    `- Source item: ${item.sourceItemId}`,
    `- Executor: ${item.executorProfileId}`,
    `- Runner: ${item.runnerId}`,
    `- Prompt: ${item.promptPath || "not-written"}`,
    `- Receipt draft: ${item.receiptDraftPath || "not-written"}`,
    `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
    `- Next action: ${item.nextAction}`,
    "",
    "### Pending Commands",
    "",
    ...item.commands.map((command) =>
      `- ${command.command} -> ${command.transcriptRef || "transcript-missing"} (${command.status})`
    ),
    "",
    "### Stop Conditions",
    "",
    ...item.stopConditions.map((condition) => `- ${condition}`),
    "",
    "### Checks",
    "",
    ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
    ""
  ];
}
