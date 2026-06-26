import type {
  CodingAgentImplementationEvidence,
  CodingAgentImplementationEvidenceDecision,
  CodingAgentImplementationEvidenceItem,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem
} from "./types";

export interface BuildCodingAgentImplementationEvidenceInput {
  receipt: CodingAgentSessionReceipt;
  generatedAt?: string;
}

export function buildCodingAgentImplementationEvidence({
  receipt,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentImplementationEvidenceInput): CodingAgentImplementationEvidence {
  const items = receipt.items.map((item) => evidenceItemFor(item));
  const failedCommands = items.flatMap((item) => item.commandResults)
    .filter((result) => typeof result.exitCode === "number" && result.exitCode !== 0).length;

  return {
    schema: "naikaku.coding-agent-implementation-evidence.v1",
    generatedAt,
    sourceSchema: receipt.schema,
    sourceDecision: receipt.decision,
    decision: evidenceDecision(receipt),
    runId: receipt.runId,
    operatorLocale: receipt.operatorLocale,
    items,
    summary: {
      total: items.length,
      accepted: items.filter((item) => item.accepted).length,
      needsEvidence: items.filter((item) => item.receiptStatus === "pending-evidence").length,
      blocked: items.filter((item) => item.receiptStatus === "failed" || item.receiptStatus === "held").length,
      changedFiles: new Set(items.flatMap((item) => item.changedFiles)).size,
      commandResults: items.flatMap((item) => item.commandResults)
        .filter((result) => result.exitCode !== null).length,
      failedCommands,
      evidenceItems: items.flatMap((item) => item.evidence).length,
      riskNotes: items.flatMap((item) => item.risks).length
    },
    honestyClaim: {
      level: "implementation-evidence-summary",
      claim: "This artifact summarizes reviewed coding-agent implementation evidence for operator handoff.",
      limitations: [
        "It is derived from a submitted receipt and does not rerun commands.",
        "It does not inspect changed files or verify artifact paths independently.",
        "It does not call model providers, browsers, deploy targets, external services, or Git remotes.",
        "Accepted evidence means the receipt was structurally complete, not that production execution was independently proven."
      ],
      productionRequirements: [
        "Attach authenticated runner transcripts for production handoff.",
        "Attach real changed-file diffs or review links from the coding workspace.",
        "Attach replayable evidence artifacts for each required evidence item.",
        "Run production-mode release verification before external delivery."
      ]
    }
  };
}

export function serializeCodingAgentImplementationEvidence(report: CodingAgentImplementationEvidence) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentImplementationEvidenceMarkdown(report: CodingAgentImplementationEvidence) {
  return [
    "# Coding Agent Implementation Evidence",
    "",
    `Decision: ${report.decision}`,
    `Source receipt: ${report.sourceDecision}`,
    `Run: ${report.runId || "workspace"}`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Honesty Claim",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Total sessions: ${report.summary.total}`,
    `- Accepted: ${report.summary.accepted}`,
    `- Needs evidence: ${report.summary.needsEvidence}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Changed files: ${report.summary.changedFiles}`,
    `- Command results: ${report.summary.commandResults}`,
    `- Failed commands: ${report.summary.failedCommands}`,
    `- Evidence items: ${report.summary.evidenceItems}`,
    `- Risk notes: ${report.summary.riskNotes}`,
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function evidenceItemFor(item: CodingAgentSessionReceiptItem): CodingAgentImplementationEvidenceItem {
  return {
    sessionId: item.sessionId,
    title: item.title,
    receiptStatus: item.receiptStatus,
    accepted: item.receiptStatus === "verified",
    changedFiles: item.changedFiles,
    commandResults: item.commandResults,
    evidence: item.evidence,
    risks: item.risks,
    missing: item.missing,
    nextAction: item.receiptStatus === "verified"
      ? "Attach this implementation evidence summary to release handoff."
      : item.nextAction
  };
}

function evidenceDecision(receipt: CodingAgentSessionReceipt): CodingAgentImplementationEvidenceDecision {
  if (receipt.decision === "verified") return "accepted-for-handoff";
  if (receipt.decision === "blocked") return "blocked";
  return "needs-evidence";
}

function itemMarkdown(item: CodingAgentImplementationEvidenceItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session: ${item.sessionId}`,
    `- Receipt status: ${item.receiptStatus}`,
    `- Accepted: ${item.accepted ? "yes" : "no"}`,
    `- Next action: ${item.nextAction}`,
    "",
    "### Changed Files",
    "",
    ...(item.changedFiles.length ? item.changedFiles : ["pending"]).map((file) => `- ${file}`),
    "",
    "### Command Results",
    "",
    ...item.commandResults.map((result) =>
      `- \`${result.command}\` -> ${result.exitCode === null ? "pending" : result.exitCode}: ${result.outputSummary}`
    ),
    "",
    "### Evidence",
    "",
    ...(item.evidence.length ? item.evidence : ["pending"]).map((evidence) => `- ${evidence}`),
    "",
    "### Risks",
    "",
    ...(item.risks.length ? item.risks : ["pending"]).map((risk) => `- ${risk}`),
    "",
    "### Missing",
    "",
    ...(item.missing.length ? item.missing : ["none"]).map((missing) => `- ${missing}`),
    ""
  ];
}
