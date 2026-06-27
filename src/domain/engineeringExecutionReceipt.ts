import type {
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentImplementationReconciliation,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionReceipt
} from "./types";
import type { EngineeringLaunchQueue } from "./engineeringLaunchQueue";

export type EngineeringExecutionReceiptDecision =
  | "not-started"
  | "runner-reported"
  | "needs-evidence"
  | "needs-artifacts"
  | "accepted"
  | "blocked";

export type EngineeringExecutionReceiptItemStatus =
  | "not-run"
  | "reported"
  | "needs-evidence"
  | "needs-artifacts"
  | "accepted"
  | "blocked";

export interface EngineeringExecutionReceiptItem {
  sessionId: string;
  title: string;
  status: EngineeringExecutionReceiptItemStatus;
  queueStatus: string | null;
  runStatus: string | null;
  receiptStatus: string | null;
  evidenceAccepted: boolean;
  artifactDecision: string | null;
  reconciliationApplied: boolean;
  changedFiles: number;
  commandResults: number;
  evidenceItems: number;
  missing: string[];
  nextAction: string;
}

export interface EngineeringExecutionReceipt {
  schema: "naikaku.engineering-execution-receipt.v1";
  generatedAt: string;
  decision: EngineeringExecutionReceiptDecision;
  runId?: string;
  operatorLocale: string;
  canClaimLocalRun: boolean;
  canClaimCodeChanged: boolean;
  canClaimCompletion: boolean;
  canUpdateBoard: boolean;
  summary: {
    queueItems: number;
    executedTasks: number;
    verifiedReceipts: number;
    acceptedEvidence: number;
    verifiedArtifacts: number;
    boardApplied: number;
    changedFiles: number;
    commandResults: number;
    evidenceItems: number;
    failedCommands: number;
    missingArtifacts: number;
    uncheckedArtifacts: number;
    blocked: number;
  };
  items: EngineeringExecutionReceiptItem[];
  allowedClaims: string[];
  blockedClaims: string[];
  nextAction: string;
  honestyClaim: {
    level: "engineering-execution-receipt";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface BuildEngineeringExecutionReceiptInput {
  launchQueue?: EngineeringLaunchQueue | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
  sessionReceipt?: CodingAgentSessionReceipt | null;
  implementationEvidence?: CodingAgentImplementationEvidence | null;
  artifactAudit?: CodingAgentImplementationArtifactAudit | null;
  reconciliation?: CodingAgentImplementationReconciliation | null;
  generatedAt?: string;
}

export function buildEngineeringExecutionReceipt({
  launchQueue = null,
  sandboxRunnerReport = null,
  sessionReceipt = null,
  implementationEvidence = null,
  artifactAudit = null,
  reconciliation = null,
  generatedAt = new Date().toISOString()
}: BuildEngineeringExecutionReceiptInput): EngineeringExecutionReceipt {
  const sessionIds = orderedSessionIds({
    launchQueue,
    sandboxRunnerReport,
    sessionReceipt,
    implementationEvidence,
    artifactAudit,
    reconciliation
  });
  const items = sessionIds.map((sessionId) =>
    itemFor({
      sessionId,
      launchQueue,
      sandboxRunnerReport,
      sessionReceipt,
      implementationEvidence,
      artifactAudit,
      reconciliation
    })
  );
  const canClaimLocalRun = Boolean(
    sandboxRunnerReport?.decision === "sandbox-runner-verified" &&
    sessionReceipt?.decision === "verified"
  );
  const canClaimCodeChanged = Boolean(
    sessionReceipt?.decision === "verified" &&
    implementationEvidence?.summary.changedFiles &&
    implementationEvidence.summary.commandResults > 0
  );
  const canClaimCompletion = Boolean(
    canClaimLocalRun &&
    implementationEvidence?.decision === "accepted-for-handoff" &&
    artifactAudit?.decision === "verified"
  );
  const canUpdateBoard = Boolean(reconciliation && reconciliation.summary.applied > 0);
  const blocked = items.filter((item) => item.status === "blocked").length;

  return {
    schema: "naikaku.engineering-execution-receipt.v1",
    generatedAt,
    decision: decisionFor({
      hasQueue: Boolean(launchQueue),
      sandboxRunnerReport,
      sessionReceipt,
      implementationEvidence,
      artifactAudit,
      blocked,
      canClaimCompletion
    }),
    runId: runIdFor(launchQueue, sandboxRunnerReport, sessionReceipt, implementationEvidence, artifactAudit, reconciliation),
    operatorLocale: operatorLocaleFor(launchQueue, sandboxRunnerReport, sessionReceipt, implementationEvidence),
    canClaimLocalRun,
    canClaimCodeChanged,
    canClaimCompletion,
    canUpdateBoard,
    summary: {
      queueItems: launchQueue?.summary.total || 0,
      executedTasks: sandboxRunnerReport?.summary.executedTasks || 0,
      verifiedReceipts: sessionReceipt?.summary.verified || 0,
      acceptedEvidence: implementationEvidence?.summary.accepted || 0,
      verifiedArtifacts: artifactAudit?.summary.verified || 0,
      boardApplied: reconciliation?.summary.applied || 0,
      changedFiles: implementationEvidence?.summary.changedFiles || sessionReceipt?.summary.changedFiles || 0,
      commandResults: implementationEvidence?.summary.commandResults || sessionReceipt?.summary.commandResults || 0,
      evidenceItems: implementationEvidence?.summary.evidenceItems || sessionReceipt?.summary.evidenceItems || 0,
      failedCommands: implementationEvidence?.summary.failedCommands || sandboxRunnerReport?.summary.failedCommands || 0,
      missingArtifacts: artifactAudit?.summary.missingPaths || 0,
      uncheckedArtifacts: artifactAudit?.summary.uncheckedPaths || 0,
      blocked
    },
    items,
    allowedClaims: allowedClaimsFor({
      canClaimLocalRun,
      canClaimCodeChanged,
      canClaimCompletion,
      canUpdateBoard,
      artifactAudit
    }),
    blockedClaims: blockedClaimsFor({
      canClaimLocalRun,
      canClaimCodeChanged,
      canClaimCompletion,
      canUpdateBoard,
      artifactAudit
    }),
    nextAction: nextActionFor({
      launchQueue,
      sandboxRunnerReport,
      sessionReceipt,
      implementationEvidence,
      artifactAudit,
      canClaimCompletion
    }),
    honestyClaim: {
      level: "engineering-execution-receipt",
      claim: "This receipt summarizes real runner output only when completed receipts, evidence, and artifact audits are attached.",
      limitations: [
        "It does not execute commands, edit files, control macOS, call providers, commit, push, deploy, or send external messages.",
        "It cannot prove code changed unless a reviewed receipt includes changed files, command results, and evidence artifacts.",
        "Artifact verification depends on the supplied artifact audit; without gateway filesystem access, paths may remain not-checked."
      ],
      productionRequirements: [
        "Attach authenticated runner receipts with transcript refs, exit codes, changed files, evidence artifacts, and risk notes.",
        "Verify local artifact paths and, for production release, re-run production-mode release verification.",
        "Keep Git push, deploy, external writes, and Mac desktop control behind exact human approval."
      ]
    }
  };
}

export function serializeEngineeringExecutionReceipt(report: EngineeringExecutionReceipt) {
  return JSON.stringify(report, null, 2);
}

export function serializeEngineeringExecutionReceiptMarkdown(report: EngineeringExecutionReceipt) {
  return [
    "# Engineering Execution Receipt",
    "",
    `Decision: ${report.decision}`,
    `Locale: ${report.operatorLocale}`,
    `Run: ${report.runId || "workspace"}`,
    `Generated: ${report.generatedAt}`,
    `Can claim local run: ${report.canClaimLocalRun ? "yes" : "no"}`,
    `Can claim code changed: ${report.canClaimCodeChanged ? "yes" : "no"}`,
    `Can claim completion: ${report.canClaimCompletion ? "yes" : "no"}`,
    `Can update board: ${report.canUpdateBoard ? "yes" : "no"}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Queue items: ${report.summary.queueItems}`,
    `- Executed tasks: ${report.summary.executedTasks}`,
    `- Verified receipts: ${report.summary.verifiedReceipts}`,
    `- Accepted evidence: ${report.summary.acceptedEvidence}`,
    `- Verified artifacts: ${report.summary.verifiedArtifacts}`,
    `- Board applied: ${report.summary.boardApplied}`,
    `- Changed files: ${report.summary.changedFiles}`,
    `- Command results: ${report.summary.commandResults}`,
    `- Evidence items: ${report.summary.evidenceItems}`,
    `- Missing artifacts: ${report.summary.missingArtifacts}`,
    `- Unchecked artifacts: ${report.summary.uncheckedArtifacts}`,
    "",
    "## Allowed Claims",
    "",
    ...(report.allowedClaims.length ? report.allowedClaims : ["None yet."]).map((item) => `- ${item}`),
    "",
    "## Blocked Claims",
    "",
    ...(report.blockedClaims.length ? report.blockedClaims : ["None."]).map((item) => `- ${item}`),
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function itemFor({
  sessionId,
  launchQueue,
  sandboxRunnerReport,
  sessionReceipt,
  implementationEvidence,
  artifactAudit,
  reconciliation
}: Required<Pick<BuildEngineeringExecutionReceiptInput, "launchQueue" | "sandboxRunnerReport" | "sessionReceipt" | "implementationEvidence" | "artifactAudit" | "reconciliation">> & {
  sessionId: string;
}): EngineeringExecutionReceiptItem {
  const queueItem = launchQueue?.items.find((item) => item.sessionId === sessionId) || null;
  const runItem = sandboxRunnerReport?.items.find((item) => item.sessionId === sessionId) || null;
  const receiptItem = sessionReceipt?.items.find((item) => item.sessionId === sessionId) || null;
  const evidenceItem = implementationEvidence?.items.find((item) => item.sessionId === sessionId) || null;
  const auditItem = artifactAudit?.items.find((item) => item.sessionId === sessionId) || null;
  const reconciliationItem = reconciliation?.items.find((item) => item.sessionId === sessionId) || null;
  const missing = [
    ...(receiptItem?.missing || []),
    ...(evidenceItem?.missing || []),
    ...(auditItem?.missing || []),
    ...(reconciliationItem && !reconciliationItem.applied ? [reconciliationItem.reason] : [])
  ];
  const status = itemStatusFor({
    runStatus: runItem?.runStatus || null,
    receiptStatus: receiptItem?.receiptStatus || null,
    evidenceAccepted: Boolean(evidenceItem?.accepted),
    artifactDecision: auditItem?.decision || null,
    missing
  });

  return {
    sessionId,
    title: queueItem?.title || runItem?.title || receiptItem?.title || evidenceItem?.title || auditItem?.title || "Unknown session",
    status,
    queueStatus: queueItem?.status || null,
    runStatus: runItem?.runStatus || null,
    receiptStatus: receiptItem?.receiptStatus || null,
    evidenceAccepted: Boolean(evidenceItem?.accepted),
    artifactDecision: auditItem?.decision || null,
    reconciliationApplied: Boolean(reconciliationItem?.applied),
    changedFiles: evidenceItem?.changedFiles.length || receiptItem?.changedFiles.length || 0,
    commandResults: evidenceItem?.commandResults.filter((result) => result.exitCode !== null).length ||
      receiptItem?.commandResults.filter((result) => result.exitCode !== null).length ||
      runItem?.commandResults.filter((result) => result.exitCode !== null).length ||
      0,
    evidenceItems: evidenceItem?.evidence.length || receiptItem?.evidence.length || runItem?.evidence.length || 0,
    missing,
    nextAction: itemNextActionFor(status, receiptItem?.nextAction || evidenceItem?.nextAction || runItem?.nextAction)
  };
}

function itemStatusFor({
  runStatus,
  receiptStatus,
  evidenceAccepted,
  artifactDecision,
  missing
}: {
  runStatus: string | null;
  receiptStatus: string | null;
  evidenceAccepted: boolean;
  artifactDecision: string | null;
  missing: string[];
}): EngineeringExecutionReceiptItemStatus {
  if (runStatus === "blocked" || runStatus === "failed" || receiptStatus === "failed" || artifactDecision === "blocked") {
    return "blocked";
  }
  if (artifactDecision === "verified" && evidenceAccepted && receiptStatus === "verified") {
    return "accepted";
  }
  if (evidenceAccepted && artifactDecision !== "verified") {
    return "needs-artifacts";
  }
  if (receiptStatus === "verified" || missing.length > 0) {
    return "needs-evidence";
  }
  if (runStatus === "executed") {
    return "reported";
  }
  return "not-run";
}

function decisionFor({
  hasQueue,
  sandboxRunnerReport,
  sessionReceipt,
  implementationEvidence,
  artifactAudit,
  blocked,
  canClaimCompletion
}: {
  hasQueue: boolean;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  sessionReceipt: CodingAgentSessionReceipt | null;
  implementationEvidence: CodingAgentImplementationEvidence | null;
  artifactAudit: CodingAgentImplementationArtifactAudit | null;
  blocked: number;
  canClaimCompletion: boolean;
}): EngineeringExecutionReceiptDecision {
  if (blocked > 0 || sessionReceipt?.decision === "blocked" || implementationEvidence?.decision === "blocked" || artifactAudit?.decision === "blocked") {
    return "blocked";
  }
  if (canClaimCompletion) return "accepted";
  if (artifactAudit && artifactAudit.decision !== "verified") return "needs-artifacts";
  if (sessionReceipt || implementationEvidence) return "needs-evidence";
  if (sandboxRunnerReport) return "runner-reported";
  if (hasQueue) return "not-started";
  return "not-started";
}

function nextActionFor({
  launchQueue,
  sandboxRunnerReport,
  sessionReceipt,
  implementationEvidence,
  artifactAudit,
  canClaimCompletion
}: {
  launchQueue: EngineeringLaunchQueue | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  sessionReceipt: CodingAgentSessionReceipt | null;
  implementationEvidence: CodingAgentImplementationEvidence | null;
  artifactAudit: CodingAgentImplementationArtifactAudit | null;
  canClaimCompletion: boolean;
}) {
  if (canClaimCompletion) {
    return "Review release gates and human approvals before any Git push, deploy, or external handoff.";
  }
  if (artifactAudit && artifactAudit.decision !== "verified") {
    return "Attach or verify missing local artifacts before accepting runner output.";
  }
  if (sessionReceipt && sessionReceipt.decision !== "verified") {
    return "Complete the receipt with changed files, command transcripts, evidence artifacts, and risk notes.";
  }
  if (implementationEvidence && implementationEvidence.decision !== "accepted-for-handoff") {
    return "Resolve implementation evidence gaps before claiming code changes.";
  }
  if (sandboxRunnerReport) {
    return "Review or import the completed receipt and run artifact audit before claiming completion.";
  }
  if (launchQueue?.canRunLocalVerification) {
    return "Run a governed local runner or import a completed receipt for the ready queue items.";
  }
  return "Prepare the engineering launch queue before expecting execution evidence.";
}

function itemNextActionFor(status: EngineeringExecutionReceiptItemStatus, fallback?: string) {
  if (status === "accepted") return "Ready for final release-gate review.";
  if (status === "needs-artifacts") return "Verify local artifact paths and transcript references.";
  if (status === "needs-evidence") return fallback || "Attach changed files, command results, evidence artifacts, and risks.";
  if (status === "reported") return "Review the runner receipt and evidence package.";
  if (status === "blocked") return fallback || "Resolve blocked execution or evidence checks.";
  return fallback || "Run or import a completed coding-agent receipt.";
}

function allowedClaimsFor({
  canClaimLocalRun,
  canClaimCodeChanged,
  canClaimCompletion,
  canUpdateBoard,
  artifactAudit
}: {
  canClaimLocalRun: boolean;
  canClaimCodeChanged: boolean;
  canClaimCompletion: boolean;
  canUpdateBoard: boolean;
  artifactAudit: CodingAgentImplementationArtifactAudit | null;
}) {
  return [
    canClaimLocalRun ? "A governed runner returned verified local command results." : null,
    canClaimCodeChanged ? "Submitted evidence includes changed files and command results." : null,
    artifactAudit?.decision === "verified" ? "Local artifact references passed the artifact audit." : null,
    canUpdateBoard ? "Accepted evidence can update matching development-board items." : null,
    canClaimCompletion ? "Implementation completion can be claimed for accepted local evidence, subject to release gates." : null
  ].filter(Boolean) as string[];
}

function blockedClaimsFor({
  canClaimLocalRun,
  canClaimCodeChanged,
  canClaimCompletion,
  canUpdateBoard,
  artifactAudit
}: {
  canClaimLocalRun: boolean;
  canClaimCodeChanged: boolean;
  canClaimCompletion: boolean;
  canUpdateBoard: boolean;
  artifactAudit: CodingAgentImplementationArtifactAudit | null;
}) {
  return [
    canClaimLocalRun ? null : "Do not claim a real local coding run completed.",
    canClaimCodeChanged ? null : "Do not claim code files changed.",
    artifactAudit?.decision === "verified" ? null : "Do not claim artifact references are verified.",
    canUpdateBoard ? null : "Do not mark development-board items done automatically.",
    canClaimCompletion ? null : "Do not claim implementation is complete.",
    "Do not claim Git push, deploy, external write, or Mac desktop control without exact human approval."
  ].filter(Boolean) as string[];
}

function orderedSessionIds({
  launchQueue,
  sandboxRunnerReport,
  sessionReceipt,
  implementationEvidence,
  artifactAudit,
  reconciliation
}: {
  launchQueue: EngineeringLaunchQueue | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  sessionReceipt: CodingAgentSessionReceipt | null;
  implementationEvidence: CodingAgentImplementationEvidence | null;
  artifactAudit: CodingAgentImplementationArtifactAudit | null;
  reconciliation: CodingAgentImplementationReconciliation | null;
}) {
  const ids = new Set<string>();
  [
    ...(launchQueue?.items || []),
    ...(sandboxRunnerReport?.items || []),
    ...(sessionReceipt?.items || []),
    ...(implementationEvidence?.items || []),
    ...(artifactAudit?.items || []),
    ...(reconciliation?.items || [])
  ].forEach((item) => ids.add(item.sessionId));
  return [...ids];
}

function runIdFor(
  launchQueue: EngineeringLaunchQueue | null,
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null,
  sessionReceipt: CodingAgentSessionReceipt | null,
  implementationEvidence: CodingAgentImplementationEvidence | null,
  artifactAudit: CodingAgentImplementationArtifactAudit | null,
  reconciliation: CodingAgentImplementationReconciliation | null
) {
  return launchQueue?.runId ||
    sandboxRunnerReport?.runId ||
    sessionReceipt?.runId ||
    implementationEvidence?.runId ||
    artifactAudit?.runId ||
    reconciliation?.runId;
}

function operatorLocaleFor(
  launchQueue: EngineeringLaunchQueue | null,
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null,
  sessionReceipt: CodingAgentSessionReceipt | null,
  implementationEvidence: CodingAgentImplementationEvidence | null
) {
  return launchQueue?.operatorLocale ||
    sandboxRunnerReport?.operatorLocale ||
    sessionReceipt?.operatorLocale ||
    implementationEvidence?.operatorLocale ||
    "ja";
}

function itemMarkdown(item: EngineeringExecutionReceiptItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session: ${item.sessionId}`,
    `- Status: ${item.status}`,
    `- Queue: ${item.queueStatus || "not-prepared"}`,
    `- Run: ${item.runStatus || "not-reported"}`,
    `- Receipt: ${item.receiptStatus || "not-submitted"}`,
    `- Evidence accepted: ${item.evidenceAccepted ? "yes" : "no"}`,
    `- Artifact audit: ${item.artifactDecision || "not-run"}`,
    `- Board applied: ${item.reconciliationApplied ? "yes" : "no"}`,
    `- Changed files: ${item.changedFiles}`,
    `- Command results: ${item.commandResults}`,
    `- Evidence items: ${item.evidenceItems}`,
    `- Next action: ${item.nextAction}`,
    "",
    "### Missing",
    "",
    ...(item.missing.length ? item.missing : ["none"]).map((missing) => `- ${missing}`),
    ""
  ];
}
