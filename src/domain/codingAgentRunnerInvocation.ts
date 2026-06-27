import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentRunnerInvocationFile,
  CodingAgentRunnerInvocationItem,
  CodingAgentRunnerInvocationItemStatus,
  CodingAgentRunnerInvocationPackage,
  CodingAgentRunnerInvocationPackageDecision,
  CodingAgentRunnerManifest,
  CodingAgentRunnerManifestTask
} from "./types";

export interface BuildCodingAgentRunnerInvocationPackageInput {
  manifest: CodingAgentRunnerManifest;
  invocationBasePath?: string;
  generatedAt?: string;
}

export function buildCodingAgentRunnerInvocationPackage({
  manifest,
  invocationBasePath = "output/coding-agent-runner-invocation/valid/invocations",
  generatedAt = new Date().toISOString()
}: BuildCodingAgentRunnerInvocationPackageInput): CodingAgentRunnerInvocationPackage {
  const normalizedInvocationBasePath = invocationBasePath.replace(/\/+$/, "");
  const items = manifest.items.map((task, index) =>
    invocationItemFor({
      task,
      invocationPath: task.status === "ready-for-runner"
        ? `${normalizedInvocationBasePath}/${String(index + 1).padStart(2, "0")}-${safeFileStem(task.sessionId)}.json`
        : null
    })
  );
  const readyInvocations = items.filter((item) => item.invocationStatus === "invocation-ready").length;
  const heldInvocations = items.filter((item) => item.invocationStatus === "held").length;
  const blockedInvocations = items.filter((item) => item.invocationStatus === "blocked").length;
  const unsafePaths = items.reduce((total, item) =>
    total + item.checks.filter((check) => check.id.endsWith("-path") && check.status === "block").length,
  0);

  return {
    schema: "naikaku.coding-agent-runner-invocation-package.v1",
    generatedAt,
    mode: "runner-invocation-package",
    sourceSchema: manifest.schema,
    sourceDecision: manifest.decision,
    decision: decisionFor({
      manifest,
      readyInvocations,
      blockedInvocations
    }),
    runId: manifest.runId,
    operatorLocale: manifest.operatorLocale,
    invocationBasePath: normalizedInvocationBasePath,
    items,
    summary: {
      total: items.length,
      readyInvocations,
      heldInvocations,
      blockedInvocations,
      invocationFiles: items.filter((item) => item.invocationStatus === "invocation-ready" && item.invocationPath).length,
      commandContracts: items.reduce((total, item) => total + item.commands.length, 0),
      receiptDraftPaths: items.filter((item) => Boolean(item.receiptDraftPath)).length,
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0),
      unsafePaths,
      stopConditions: items.reduce((total, item) => total + item.stopConditions.length, 0)
    },
    honestyClaim: {
      level: "runner-invocation-package",
      claim: "This package writes runner-consumable coding-agent invocation files without executing implementation work.",
      limitations: [
        "It does not read prompt file contents, edit files, run commands, open browsers, control desktops, call MCP tools, call providers, commit, push, deploy, or inspect production systems.",
        "Invocation files contain pending command contracts and evidence targets only; they are not completed receipts or implementation evidence.",
        "A package-ready decision means ready tasks have executable handoff files for a governed runner, not that a real coding agent has executed them."
      ],
      productionRequirements: [
        "Run each invocation only inside the named sandbox executor profile or an equivalent governed coding workspace.",
        "Replace pending command contracts with real transcripts, exit codes, changed files, evidence artifacts, and remaining risks.",
        "Review completed receipts and artifact audits before reconciling the Development Board or claiming release readiness."
      ]
    }
  };
}

export function buildCodingAgentRunnerInvocationFile({
  invocationPackage,
  item
}: {
  invocationPackage: CodingAgentRunnerInvocationPackage;
  item: CodingAgentRunnerInvocationItem;
}): CodingAgentRunnerInvocationFile {
  return {
    schema: "naikaku.coding-agent-runner-invocation.v1",
    generatedAt: invocationPackage.generatedAt,
    packageSchema: invocationPackage.schema,
    packageDecision: invocationPackage.decision,
    operatorLocale: invocationPackage.operatorLocale,
    runId: invocationPackage.runId,
    item,
    honestyClaim: invocationPackage.honestyClaim
  };
}

export function serializeCodingAgentRunnerInvocationPackage(invocationPackage: CodingAgentRunnerInvocationPackage) {
  return JSON.stringify(invocationPackage, null, 2);
}

export function serializeCodingAgentRunnerInvocationFile(file: CodingAgentRunnerInvocationFile) {
  return JSON.stringify(file, null, 2);
}

export function serializeCodingAgentRunnerInvocationPackageMarkdown(
  invocationPackage: CodingAgentRunnerInvocationPackage
) {
  return [
    "# Coding Agent Runner Invocation Package",
    "",
    `Mode: ${invocationPackage.mode}`,
    `Decision: ${invocationPackage.decision}`,
    `Source decision: ${invocationPackage.sourceDecision}`,
    `Locale: ${invocationPackage.operatorLocale}`,
    `Run: ${invocationPackage.runId || "workspace"}`,
    `Generated: ${invocationPackage.generatedAt}`,
    `Invocation base path: ${invocationPackage.invocationBasePath}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${invocationPackage.honestyClaim.claim}`,
    ...invocationPackage.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...invocationPackage.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Total tasks: ${invocationPackage.summary.total}`,
    `- Ready invocations: ${invocationPackage.summary.readyInvocations}`,
    `- Held invocations: ${invocationPackage.summary.heldInvocations}`,
    `- Blocked invocations: ${invocationPackage.summary.blockedInvocations}`,
    `- Invocation files: ${invocationPackage.summary.invocationFiles}`,
    `- Command contracts: ${invocationPackage.summary.commandContracts}`,
    `- Expected evidence artifacts: ${invocationPackage.summary.expectedEvidenceArtifacts}`,
    `- Receipt draft paths: ${invocationPackage.summary.receiptDraftPaths}`,
    `- Unsafe paths: ${invocationPackage.summary.unsafePaths}`,
    "",
    ...invocationPackage.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

export function serializeCodingAgentRunnerInvocationFileMarkdown(file: CodingAgentRunnerInvocationFile) {
  const item = file.item;
  return [
    "# Coding Agent Runner Invocation",
    "",
    `Session: ${item.sessionId}`,
    `Title: ${item.title}`,
    `Status: ${item.invocationStatus}`,
    `Executor: ${item.executorProfileId}`,
    `Runner: ${item.runnerId}`,
    `Locale: ${file.operatorLocale}`,
    `Generated: ${file.generatedAt}`,
    "",
    "## Runner Instructions",
    "",
    ...item.runnerInstructions.map((instruction) => `- ${instruction}`),
    "",
    "## Pending Commands",
    "",
    ...item.commands.map((command) =>
      `- ${command.command} -> ${command.transcriptRef || "missing transcript target"}`
    ),
    "",
    "## Evidence Targets",
    "",
    ...item.expectedEvidenceArtifacts.map((artifact) => `- ${artifact.label}: ${artifact.path}`),
    "",
    "## Stop Conditions",
    "",
    ...item.stopConditions.map((condition) => `- ${condition}`),
    ""
  ].join("\n");
}

function invocationItemFor({
  task,
  invocationPath
}: {
  task: CodingAgentRunnerManifestTask;
  invocationPath: string | null;
}): CodingAgentRunnerInvocationItem {
  const checks = checksFor(task, invocationPath);
  const invocationStatus = statusFor(task, checks);

  return {
    sessionId: task.sessionId,
    sourceItemId: task.sourceItemId,
    title: task.title,
    executorProfileId: task.executorProfileId,
    runnerId: task.runnerId,
    manifestTaskStatus: task.status,
    invocationStatus,
    invocationPath,
    promptPath: task.promptPath,
    receiptDraftPath: task.receiptDraftPath,
    receiptTemplatePath: task.receiptTemplatePath,
    evidenceArtifactPrefix: task.evidenceArtifactPrefix,
    plannedSteps: task.plannedSteps,
    commands: task.commands.map((command) => ({
      command: command.command,
      transcriptRef: command.transcriptRef,
      status: "pending-real-execution",
      exitCode: null
    })),
    expectedEvidenceArtifacts: task.expectedEvidenceArtifacts,
    runnerInstructions: runnerInstructionsFor(task, invocationStatus),
    stopConditions: task.stopConditions,
    checks,
    nextAction: nextActionFor(invocationStatus)
  };
}

function checksFor(task: CodingAgentRunnerManifestTask, invocationPath: string | null) {
  const ready = task.status === "ready-for-runner";
  const transcriptRefs = task.commands.map((command) => command.transcriptRef).filter(Boolean) as string[];
  const transcriptRefsSafe = transcriptRefs.length === task.commands.length &&
    transcriptRefs.every((ref) => isSafeRelativeArtifactPath(ref) && ref.startsWith(task.evidenceArtifactPrefix));
  const commandsPending = task.commands.every((command) =>
    command.status === "pending-real-execution" &&
    command.exitCode === null &&
    Boolean(command.transcriptRef)
  );
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
        ? "Runner manifest task is ready for invocation packaging."
        : `Runner manifest task is ${task.status} and must not receive an executable invocation file.`
    },
    {
      id: "invocation-path",
      status: ready && invocationPath && isSafeRelativeArtifactPath(invocationPath)
        ? "pass" as const
        : ready ? "block" as const : invocationPath ? "block" as const : "pass" as const,
      summary: invocationPath ? `Invocation path is ${invocationPath}.` : "Invocation file is not written."
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
      id: "receipt-template-path",
      status: ready && task.receiptTemplatePath && isSafeRelativeArtifactPath(task.receiptTemplatePath)
        ? "pass" as const
        : ready ? "block" as const : task.receiptTemplatePath ? "block" as const : "pass" as const,
      summary: task.receiptTemplatePath
        ? `Receipt template path is ${task.receiptTemplatePath}.`
        : "Receipt template path is not attached."
    },
    {
      id: "evidence-prefix-path",
      status: isSafeRelativeArtifactPath(task.evidenceArtifactPrefix) ? "pass" as const : "block" as const,
      summary: `Evidence prefix is ${task.evidenceArtifactPrefix}.`
    },
    {
      id: "pending-command-contract",
      status: ready && commandsPending ? "pass" as const : ready ? "block" as const : "pass" as const,
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
      id: "stop-conditions",
      status: hasStopConditions ? "pass" as const : "block" as const,
      summary: `${task.stopConditions.length} stop conditions are attached.`
    },
    {
      id: "no-real-execution",
      status: task.commands.every((command) => command.exitCode === null) ? "pass" as const : "block" as const,
      summary: "Invocation package observes no completed command exit codes."
    }
  ];
}

function statusFor(
  task: CodingAgentRunnerManifestTask,
  checks: ReturnType<typeof checksFor>
): CodingAgentRunnerInvocationItemStatus {
  if (task.status !== "ready-for-runner") {
    return task.status === "blocked" ? "blocked" : "held";
  }
  if (checks.some((check) => check.status === "block")) {
    return "blocked";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "held";
  }
  return "invocation-ready";
}

function decisionFor({
  manifest,
  readyInvocations,
  blockedInvocations
}: {
  manifest: CodingAgentRunnerManifest;
  readyInvocations: number;
  blockedInvocations: number;
}): CodingAgentRunnerInvocationPackageDecision {
  if (manifest.decision === "runner-ready" && readyInvocations > 0 && blockedInvocations === 0) {
    return "package-ready";
  }
  if (manifest.decision === "blocked" || blockedInvocations > 0) {
    return "blocked";
  }
  return "needs-review";
}

function runnerInstructionsFor(
  task: CodingAgentRunnerManifestTask,
  invocationStatus: CodingAgentRunnerInvocationItemStatus
) {
  if (invocationStatus !== "invocation-ready") {
    return [
      "Do not execute this invocation until the runner manifest and invocation checks are fixed.",
      task.nextAction
    ];
  }

  return [
    `Open prompt ${task.promptPath} inside ${task.executorProfileId}.`,
    "Keep all code and evidence work inside the assigned governed workspace.",
    "Do not read host secrets, browser cookies, unapproved credentials, or production systems.",
    `Run each pending command only after implementation changes and save transcripts under ${task.evidenceArtifactPrefix}.`,
    `Update pending receipt draft ${task.receiptDraftPath} with changed files, exit codes, transcript refs, evidence artifacts, and remaining risks.`,
    "Return the completed receipt for review; do not deploy, push, or reconcile the Development Board from this package."
  ];
}

function nextActionFor(invocationStatus: CodingAgentRunnerInvocationItemStatus) {
  if (invocationStatus === "invocation-ready") {
    return "Hand this invocation file to a governed coding runner, then require a completed receipt and artifact audit before accepting work.";
  }
  if (invocationStatus === "blocked") {
    return "Fix blocked invocation checks before any runner can consume this task.";
  }
  return "Keep this task visible but unassigned until the held runner conditions are resolved.";
}

function itemMarkdown(item: CodingAgentRunnerInvocationItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session: ${item.sessionId}`,
    `- Status: ${item.invocationStatus}`,
    `- Executor: ${item.executorProfileId}`,
    `- Runner: ${item.runnerId}`,
    `- Invocation file: ${item.invocationPath || "not written"}`,
    `- Prompt: ${item.promptPath || "not attached"}`,
    `- Receipt draft: ${item.receiptDraftPath || "not attached"}`,
    `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
    "",
    "### Runner Instructions",
    "",
    ...item.runnerInstructions.map((instruction) => `- ${instruction}`),
    "",
    "### Pending Commands",
    "",
    ...item.commands.map((command) =>
      `- ${command.command} -> ${command.transcriptRef || "missing transcript target"}`
    ),
    "",
    "### Checks",
    "",
    ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
    ""
  ];
}

function safeFileStem(value: string) {
  const stem = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "session";
}
