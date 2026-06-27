import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentRunnerIntakeAudit,
  CodingAgentRunnerIntakeAuditDecision,
  CodingAgentRunnerIntakeAuditItem,
  CodingAgentRunnerIntakeAuditItemStatus,
  CodingAgentRunnerInvocationItem,
  CodingAgentRunnerInvocationPackage
} from "./types";

export interface BuildCodingAgentRunnerIntakeAuditInput {
  invocationPackage: CodingAgentRunnerInvocationPackage;
  generatedAt?: string;
}

export function buildCodingAgentRunnerIntakeAudit({
  invocationPackage,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentRunnerIntakeAuditInput): CodingAgentRunnerIntakeAudit {
  const items = invocationPackage.items.map((item) => intakeItemFor(item));
  const acceptedIntakes = items.filter((item) => item.intakeStatus === "accepted-for-runner").length;
  const heldIntakes = items.filter((item) => item.intakeStatus === "held").length;
  const blockedIntakes = items.filter((item) => item.intakeStatus === "blocked").length;
  const unsafePaths = items.reduce((total, item) =>
    total + item.checks.filter((check) => check.id.endsWith("-path") && check.status === "block").length,
  0);
  const sourceBlockedChecks = invocationPackage.items.reduce((total, item) =>
    total + item.checks.filter((check) => check.status === "block").length,
  0);
  const completedCommandResults = items.reduce((total, item) =>
    total + item.commands.filter((command) => command.exitCode !== null).length,
  0);
  const missingRunnerInstructions = items.filter((item) =>
    item.invocationStatus === "invocation-ready" &&
    !item.runnerInstructions.some((instruction) => instruction.includes("Return the completed receipt"))
  ).length;

  return {
    schema: "naikaku.coding-agent-runner-intake-audit.v1",
    generatedAt,
    mode: "runner-invocation-intake-audit",
    sourceSchema: invocationPackage.schema,
    sourceDecision: invocationPackage.decision,
    decision: decisionFor({
      invocationPackage,
      acceptedIntakes,
      blockedIntakes
    }),
    runId: invocationPackage.runId,
    operatorLocale: invocationPackage.operatorLocale,
    items,
    summary: {
      total: items.length,
      acceptedIntakes,
      heldIntakes,
      blockedIntakes,
      invocationFiles: items.filter((item) => item.intakeStatus === "accepted-for-runner" && item.invocationPath).length,
      commandContracts: items.reduce((total, item) => total + item.commands.length, 0),
      receiptDraftPaths: items.filter((item) => Boolean(item.receiptDraftPath)).length,
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0),
      unsafePaths,
      sourceBlockedChecks,
      completedCommandResults,
      missingRunnerInstructions
    },
    honestyClaim: {
      level: "runner-invocation-intake-audit",
      claim: "This audit checks whether runner invocation files are safe to hand to a governed coding runner without executing implementation work.",
      limitations: [
        "It does not read prompt file contents, edit files, run commands, open browsers, control desktops, call MCP tools, call providers, commit, push, deploy, or inspect production systems.",
        "It validates package shape, pending command contracts, safety stops, and artifact path scope only; it is not a completed receipt.",
        "An accepted-for-runner decision means the invocation can be consumed by a governed runner, not that the runner has implemented the task."
      ],
      productionRequirements: [
        "Run accepted invocations only inside the named sandbox executor profile or an equivalent governed coding workspace.",
        "Attach real changed files, command transcripts, exit codes, evidence artifacts, and remaining risks after runner execution.",
        "Review completed receipts, local artifact audits, and production-mode release verification before claiming implementation completion."
      ]
    }
  };
}

export function serializeCodingAgentRunnerIntakeAudit(report: CodingAgentRunnerIntakeAudit) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentRunnerIntakeAuditMarkdown(report: CodingAgentRunnerIntakeAudit) {
  return [
    "# Coding Agent Runner Intake Audit",
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
    `- Accepted intakes: ${report.summary.acceptedIntakes}`,
    `- Held intakes: ${report.summary.heldIntakes}`,
    `- Blocked intakes: ${report.summary.blockedIntakes}`,
    `- Invocation files: ${report.summary.invocationFiles}`,
    `- Command contracts: ${report.summary.commandContracts}`,
    `- Receipt draft paths: ${report.summary.receiptDraftPaths}`,
    `- Expected evidence artifacts: ${report.summary.expectedEvidenceArtifacts}`,
    `- Unsafe paths: ${report.summary.unsafePaths}`,
    `- Source blocked checks: ${report.summary.sourceBlockedChecks}`,
    `- Completed command results observed: ${report.summary.completedCommandResults}`,
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function intakeItemFor(item: CodingAgentRunnerInvocationItem): CodingAgentRunnerIntakeAuditItem {
  const checks = checksFor(item);
  const intakeStatus = statusFor(item, checks);

  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    executorProfileId: item.executorProfileId,
    runnerId: item.runnerId,
    invocationStatus: item.invocationStatus,
    intakeStatus,
    invocationPath: item.invocationPath,
    promptPath: item.promptPath,
    receiptDraftPath: item.receiptDraftPath,
    receiptTemplatePath: item.receiptTemplatePath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    commands: item.commands,
    expectedEvidenceArtifacts: item.expectedEvidenceArtifacts,
    runnerInstructions: item.runnerInstructions,
    stopConditions: item.stopConditions,
    checks,
    nextAction: nextActionFor(intakeStatus)
  };
}

function checksFor(item: CodingAgentRunnerInvocationItem) {
  const ready = item.invocationStatus === "invocation-ready";
  const sourceBlockedChecks = item.checks.filter((check) => check.status === "block").length;
  const transcriptRefs = item.commands.map((command) => command.transcriptRef).filter(Boolean) as string[];
  const transcriptRefsSafe = transcriptRefs.length === item.commands.length &&
    transcriptRefs.every((ref) => isSafeRelativeArtifactPath(ref) && ref.startsWith(item.evidenceArtifactPrefix));
  const commandsPending = item.commands.every((command) =>
    command.status === "pending-real-execution" &&
    command.exitCode === null &&
    Boolean(command.transcriptRef)
  );
  const evidencePathsSafe = item.expectedEvidenceArtifacts.every((artifact) =>
    isSafeRelativeArtifactPath(artifact.path) && artifact.path.startsWith(item.evidenceArtifactPrefix)
  );
  const hasRunnerReceiptInstruction = item.runnerInstructions.some((instruction) =>
    instruction.includes("Return the completed receipt")
  );
  const hasStopConditions = item.stopConditions.some((condition) => condition.includes("host secrets")) &&
    item.stopConditions.some((condition) => condition.includes("production deploy")) &&
    item.stopConditions.some((condition) => condition.includes("Git push"));

  return [
    {
      id: "source-invocation-status",
      status: ready ? "pass" as const : item.invocationStatus === "blocked" ? "block" as const : "warn" as const,
      summary: ready
        ? "Invocation item is ready for runner intake."
        : `Invocation item is ${item.invocationStatus} and must not be accepted by a runner.`
    },
    {
      id: "source-invocation-checks",
      status: sourceBlockedChecks === 0 ? "pass" as const : "block" as const,
      summary: `${sourceBlockedChecks} blocked checks were inherited from invocation packaging.`
    },
    {
      id: "invocation-file-path",
      status: ready && item.invocationPath && isSafeRelativeArtifactPath(item.invocationPath)
        ? "pass" as const
        : ready ? "block" as const : item.invocationPath ? "block" as const : "pass" as const,
      summary: item.invocationPath ? `Invocation file is ${item.invocationPath}.` : "Invocation file is not attached."
    },
    {
      id: "prompt-path",
      status: ready && item.promptPath && isSafeRelativeArtifactPath(item.promptPath)
        ? "pass" as const
        : ready ? "block" as const : item.promptPath ? "block" as const : "pass" as const,
      summary: item.promptPath ? `Prompt path is ${item.promptPath}.` : "Prompt path is not attached."
    },
    {
      id: "receipt-draft-path",
      status: ready && item.receiptDraftPath && isSafeRelativeArtifactPath(item.receiptDraftPath)
        ? "pass" as const
        : ready ? "block" as const : item.receiptDraftPath ? "block" as const : "pass" as const,
      summary: item.receiptDraftPath ? `Receipt draft path is ${item.receiptDraftPath}.` : "Receipt draft path is not attached."
    },
    {
      id: "receipt-template-path",
      status: ready && item.receiptTemplatePath && isSafeRelativeArtifactPath(item.receiptTemplatePath)
        ? "pass" as const
        : ready ? "block" as const : item.receiptTemplatePath ? "block" as const : "pass" as const,
      summary: item.receiptTemplatePath
        ? `Receipt template path is ${item.receiptTemplatePath}.`
        : "Receipt template path is not attached."
    },
    {
      id: "evidence-prefix-path",
      status: isSafeRelativeArtifactPath(item.evidenceArtifactPrefix) ? "pass" as const : "block" as const,
      summary: `Evidence prefix is ${item.evidenceArtifactPrefix}.`
    },
    {
      id: "pending-command-contract",
      status: ready && commandsPending ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: `${item.commands.length} command contracts remain pending real execution.`
    },
    {
      id: "transcript-scope-path",
      status: ready && transcriptRefsSafe ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: `${transcriptRefs.length} transcript refs stay under the evidence prefix.`
    },
    {
      id: "evidence-artifact-path",
      status: evidencePathsSafe ? "pass" as const : "block" as const,
      summary: `${item.expectedEvidenceArtifacts.length} expected evidence artifact paths checked.`
    },
    {
      id: "runner-receipt-instruction",
      status: ready && hasRunnerReceiptInstruction ? "pass" as const : ready ? "block" as const : "pass" as const,
      summary: hasRunnerReceiptInstruction
        ? "Runner must return a completed receipt."
        : "Runner receipt return instruction is missing."
    },
    {
      id: "stop-conditions",
      status: hasStopConditions ? "pass" as const : "block" as const,
      summary: `${item.stopConditions.length} stop conditions are attached.`
    },
    {
      id: "no-real-execution",
      status: item.commands.every((command) => command.exitCode === null) ? "pass" as const : "block" as const,
      summary: "Runner intake observes no completed command exit codes."
    }
  ];
}

function statusFor(
  item: CodingAgentRunnerInvocationItem,
  checks: ReturnType<typeof checksFor>
): CodingAgentRunnerIntakeAuditItemStatus {
  if (item.invocationStatus !== "invocation-ready") {
    return item.invocationStatus === "blocked" ? "blocked" : "held";
  }
  if (checks.some((check) => check.status === "block")) {
    return "blocked";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "held";
  }
  return "accepted-for-runner";
}

function decisionFor({
  invocationPackage,
  acceptedIntakes,
  blockedIntakes
}: {
  invocationPackage: CodingAgentRunnerInvocationPackage;
  acceptedIntakes: number;
  blockedIntakes: number;
}): CodingAgentRunnerIntakeAuditDecision {
  if (invocationPackage.decision === "package-ready" && acceptedIntakes > 0 && blockedIntakes === 0) {
    return "accepted-for-runner";
  }
  if (invocationPackage.decision === "blocked" || blockedIntakes > 0) {
    return "blocked";
  }
  return "needs-review";
}

function nextActionFor(status: CodingAgentRunnerIntakeAuditItemStatus) {
  if (status === "accepted-for-runner") {
    return "A governed coding runner may consume this invocation; require a completed receipt and artifact audit before accepting work.";
  }
  if (status === "blocked") {
    return "Fix blocked intake checks before any runner consumes this invocation.";
  }
  return "Keep this invocation visible but unassigned until held conditions are resolved.";
}

function itemMarkdown(item: CodingAgentRunnerIntakeAuditItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session: ${item.sessionId}`,
    `- Intake: ${item.intakeStatus}`,
    `- Invocation: ${item.invocationStatus}`,
    `- Executor: ${item.executorProfileId}`,
    `- Runner: ${item.runnerId}`,
    `- Invocation file: ${item.invocationPath || "not attached"}`,
    `- Prompt: ${item.promptPath || "not attached"}`,
    `- Receipt draft: ${item.receiptDraftPath || "not attached"}`,
    `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
    "",
    "### Checks",
    "",
    ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
    ""
  ];
}
