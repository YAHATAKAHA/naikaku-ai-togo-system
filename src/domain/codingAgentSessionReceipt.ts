import type {
  CodingAgentCommandResult,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptDecision,
  CodingAgentSessionReceiptItem,
  CodingAgentSessionReceiptStatus
} from "./types";

export interface BuildCodingAgentSessionReceiptTemplateInput {
  bundle: CodingAgentSessionBundle;
  generatedAt?: string;
}

export interface ReviewCodingAgentSessionReceiptInput {
  bundle: CodingAgentSessionBundle;
  receipt: CodingAgentSessionReceipt;
  generatedAt?: string;
}

export function buildCodingAgentSessionReceiptTemplate({
  bundle,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentSessionReceiptTemplateInput): CodingAgentSessionReceipt {
  const items = bundle.sessions.map((session) => templateItemFor(session));
  return receiptFromItems({ bundle, items, generatedAt });
}

export function reviewCodingAgentSessionReceipt({
  bundle,
  receipt,
  generatedAt = new Date().toISOString()
}: ReviewCodingAgentSessionReceiptInput): CodingAgentSessionReceipt {
  const submitted = new Map(receipt.items.map((item) => [item.sessionId, item]));
  const items = bundle.sessions.map((session) =>
    reviewItemFor(session, submitted.get(session.id))
  );

  return receiptFromItems({ bundle, items, generatedAt });
}

export function serializeCodingAgentSessionReceipt(report: CodingAgentSessionReceipt) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentSessionReceiptMarkdown(report: CodingAgentSessionReceipt) {
  return [
    "# Coding Agent Session Receipt",
    "",
    `Mode: ${report.mode}`,
    `Decision: ${report.decision}`,
    `Bundle decision: ${report.bundleDecision}`,
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
    `- Verified: ${report.summary.verified}`,
    `- Pending evidence: ${report.summary.pendingEvidence}`,
    `- Failed: ${report.summary.failed}`,
    `- Held: ${report.summary.held}`,
    `- Changed files: ${report.summary.changedFiles}`,
    `- Command results: ${report.summary.commandResults}`,
    `- Evidence items: ${report.summary.evidenceItems}`,
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function templateItemFor(session: CodingAgentSession): CodingAgentSessionReceiptItem {
  if (session.status !== "ready-for-agent") {
    return {
      sessionId: session.id,
      briefId: session.briefId,
      sourceItemId: session.sourceItemId,
      title: session.title,
      sessionStatus: session.status,
      receiptStatus: "held",
      changedFiles: [],
      commandResults: session.verificationCommands.map((command) => pendingCommand(command)),
      evidence: [],
      risks: [],
      missing: ["Session is not ready for coding-agent assignment."],
      nextAction: session.nextAction
    };
  }

  const missing = missingEvidenceFor({
    session,
    changedFiles: [],
    commandResults: session.verificationCommands.map((command) => pendingCommand(command)),
    evidence: [],
    risks: []
  });

  return {
    sessionId: session.id,
    briefId: session.briefId,
    sourceItemId: session.sourceItemId,
    title: session.title,
    sessionStatus: session.status,
    receiptStatus: "pending-evidence",
    changedFiles: [],
    commandResults: session.verificationCommands.map((command) => pendingCommand(command)),
    evidence: [],
    risks: [],
    missing,
    nextAction: "Attach changed files, command output, evidence artifacts, and risk notes from the real coding-agent run."
  };
}

function reviewItemFor(
  session: CodingAgentSession,
  submitted?: CodingAgentSessionReceiptItem
): CodingAgentSessionReceiptItem {
  if (session.status !== "ready-for-agent") {
    return {
      sessionId: session.id,
      briefId: session.briefId,
      sourceItemId: session.sourceItemId,
      title: session.title,
      sessionStatus: session.status,
      receiptStatus: "held",
      changedFiles: submitted?.changedFiles || [],
      commandResults: normalizeCommands(session, submitted?.commandResults),
      evidence: submitted?.evidence || [],
      risks: submitted?.risks || [],
      missing: ["Session is not ready for coding-agent assignment."],
      nextAction: session.nextAction
    };
  }

  const changedFiles = submitted?.changedFiles || [];
  const commandResults = normalizeCommands(session, submitted?.commandResults);
  const evidence = submitted?.evidence || [];
  const risks = submitted?.risks || [];
  const missing = missingEvidenceFor({
    session,
    changedFiles,
    commandResults,
    evidence,
    risks
  });
  const failedCommands = commandResults.filter((result) =>
    typeof result.exitCode === "number" && result.exitCode !== 0
  );
  const receiptStatus = statusFor({ missing, failedCommands });

  return {
    sessionId: session.id,
    briefId: session.briefId,
    sourceItemId: session.sourceItemId,
    title: session.title,
    sessionStatus: session.status,
    receiptStatus,
    changedFiles,
    commandResults,
    evidence,
    risks,
    missing,
    nextAction: nextActionFor(receiptStatus)
  };
}

function receiptFromItems({
  bundle,
  items,
  generatedAt
}: {
  bundle: CodingAgentSessionBundle;
  items: CodingAgentSessionReceiptItem[];
  generatedAt: string;
}): CodingAgentSessionReceipt {
  const summary = {
    total: items.length,
    verified: items.filter((item) => item.receiptStatus === "verified").length,
    pendingEvidence: items.filter((item) => item.receiptStatus === "pending-evidence").length,
    failed: items.filter((item) => item.receiptStatus === "failed").length,
    held: items.filter((item) => item.receiptStatus === "held").length,
    changedFiles: new Set(items.flatMap((item) => item.changedFiles)).size,
    commandResults: items.flatMap((item) => item.commandResults)
      .filter((result) => result.exitCode !== null).length,
    evidenceItems: items.flatMap((item) => item.evidence).length,
    risks: items.flatMap((item) => item.risks).length
  };

  return {
    schema: "naikaku.coding-agent-session-receipt.v1",
    generatedAt,
    mode: "evidence-review",
    sourceSchema: bundle.schema,
    bundleDecision: bundle.decision,
    decision: receiptDecision(items),
    runId: bundle.runId,
    operatorLocale: bundle.operatorLocale,
    items,
    honestyClaim: {
      level: "submitted-evidence-review",
      claim: "This receipt reviews submitted coding-agent evidence and does not execute the work itself.",
      limitations: [
        "No command was run by this receipt builder.",
        "No file was inspected or modified by this receipt builder.",
        "No model provider, browser, deploy target, external service, or Git remote was called.",
        "A verified receipt means the submitted evidence is structurally complete, not that Naikaku independently re-executed it."
      ],
      productionRequirements: [
        "Attach real changed-file summaries from the coding workspace.",
        "Attach command transcripts with exit codes from the actual run.",
        "Attach evidence artifacts for every required evidence item.",
        "Run production-mode release verification before external handoff."
      ]
    },
    summary
  };
}

function missingEvidenceFor({
  session,
  changedFiles,
  commandResults,
  evidence,
  risks
}: {
  session: CodingAgentSession;
  changedFiles: string[];
  commandResults: CodingAgentCommandResult[];
  evidence: string[];
  risks: string[];
}) {
  const missing: string[] = [];
  if (!changedFiles.length) {
    missing.push("Changed files summary is required.");
  }

  const byCommand = new Map(commandResults.map((result) => [result.command, result]));
  for (const command of session.verificationCommands) {
    const result = byCommand.get(command);
    if (!result || result.exitCode === null) {
      missing.push(`Command result is required: ${command}`);
    } else if (!result.outputSummary.trim()) {
      missing.push(`Command output summary is required: ${command}`);
    }
  }

  if (evidence.length < session.evidenceRequired.length) {
    missing.push("Evidence artifacts are required for every session evidence item.");
  }

  if (!risks.length) {
    missing.push("Remaining risk note is required, even when no risks remain.");
  }

  return missing;
}

function normalizeCommands(
  session: CodingAgentSession,
  submitted: CodingAgentCommandResult[] = []
) {
  const byCommand = new Map(submitted.map((result) => [result.command, result]));
  return session.verificationCommands.map((command) => {
    const result = byCommand.get(command);
    if (!result) return pendingCommand(command);
    return {
      command,
      exitCode: typeof result.exitCode === "number" ? result.exitCode : null,
      outputSummary: result.outputSummary || "",
      transcriptRef: result.transcriptRef
    };
  });
}

function statusFor({
  missing,
  failedCommands
}: {
  missing: string[];
  failedCommands: CodingAgentCommandResult[];
}): CodingAgentSessionReceiptStatus {
  if (failedCommands.length) return "failed";
  if (missing.length) return "pending-evidence";
  return "verified";
}

function receiptDecision(items: CodingAgentSessionReceiptItem[]): CodingAgentSessionReceiptDecision {
  if (items.some((item) => item.receiptStatus === "failed" || item.receiptStatus === "held")) {
    return "blocked";
  }
  if (items.some((item) => item.receiptStatus === "pending-evidence")) {
    return "needs-evidence";
  }
  return "verified";
}

function nextActionFor(status: CodingAgentSessionReceiptStatus) {
  if (status === "verified") {
    return "Attach this receipt to release verification and operator handoff.";
  }
  if (status === "failed") {
    return "Fix failing commands in the coding workspace, rerun them, and resubmit the receipt.";
  }
  if (status === "held") {
    return "Resolve the held session before accepting implementation evidence.";
  }
  return "Attach the missing implementation evidence before claiming completion.";
}

function pendingCommand(command: string): CodingAgentCommandResult {
  return {
    command,
    exitCode: null,
    outputSummary: "pending real command output"
  };
}

function itemMarkdown(item: CodingAgentSessionReceiptItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Session status: ${item.sessionStatus}`,
    item.sourceItemId ? `- Source item: ${item.sourceItemId}` : "- Source item: unknown",
    `- Receipt status: ${item.receiptStatus}`,
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
    "### Missing",
    "",
    ...(item.missing.length ? item.missing : ["none"]).map((missing) => `- ${missing}`),
    ""
  ];
}
