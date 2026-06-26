import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentCommandResult,
  CodingAgentDispatchArchiveAudit,
  CodingAgentDispatchManifest,
  CodingAgentDispatchManifestItem,
  CodingAgentDispatchSimulation,
  CodingAgentDispatchSimulationDecision,
  CodingAgentDispatchSimulationItem,
  CodingAgentDispatchSimulationItemStatus
} from "./types";

export interface BuildCodingAgentDispatchSimulationInput {
  manifest: CodingAgentDispatchManifest;
  archiveAudit?: CodingAgentDispatchArchiveAudit | null;
  generatedAt?: string;
}

export function buildCodingAgentDispatchSimulation({
  manifest,
  archiveAudit,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentDispatchSimulationInput): CodingAgentDispatchSimulation {
  const items = manifest.items.map((item) =>
    simulationItemFor({
      item,
      archiveAudit
    })
  );
  const readyForAgent = items.filter((item) => item.simulationStatus === "ready-for-agent").length;
  const held = items.filter((item) => item.simulationStatus === "held").length;
  const blocked = items.filter((item) => item.simulationStatus === "blocked").length;
  const archiveAuditBlockers = archiveAudit?.summary.blockers || 0;
  const archiveAuditWarnings = archiveAudit?.summary.warnings || 0;

  return {
    schema: "naikaku.coding-agent-dispatch-simulation.v1",
    generatedAt,
    mode: "local-simulation",
    sourceSchema: manifest.schema,
    archiveAuditSchema: archiveAudit?.schema,
    dispatchDecision: manifest.decision,
    archiveAuditDecision: archiveAudit?.decision,
    decision: simulationDecision({
      readyForAgent,
      blocked,
      archiveAudit,
      items
    }),
    runId: manifest.runId,
    operatorLocale: manifest.operatorLocale,
    items,
    summary: {
      total: items.length,
      readyForAgent,
      held,
      blocked,
      plannedCommands: items.reduce((total, item) => total + item.verificationCommands.length, 0),
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0),
      receiptDraftItems: items.filter((item) => Boolean(item.receiptDraft)).length,
      unsafePaths: items.reduce((total, item) =>
        total + item.checks.filter((check) => check.id.endsWith("-path") && check.status === "block").length,
      0),
      archiveAuditBlockers,
      archiveAuditWarnings
    },
    honestyClaim: {
      level: "local-dispatch-simulation",
      claim: "This report simulates the next coding-agent execution handoff from a dispatch manifest without executing implementation work.",
      limitations: [
        "It does not edit files, run shell commands, open a browser, call a model provider, commit, push, deploy, or inspect production systems.",
        "Receipt drafts contain pending placeholders and must be replaced with real changed files, command transcripts, evidence artifacts, and risks.",
        "A ready simulation means the handoff contract is internally prepared, not that implementation has completed."
      ],
      productionRequirements: [
        "Run each ready prompt inside a governed coding workspace or sandbox executor profile.",
        "Attach real transcripts and evidence under the expected session evidence prefix.",
        "Review the completed receipt and local artifacts before updating the Development Board.",
        "Run production-mode release verification before external production handoff."
      ]
    }
  };
}

export function serializeCodingAgentDispatchSimulation(report: CodingAgentDispatchSimulation) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentDispatchSimulationMarkdown(report: CodingAgentDispatchSimulation) {
  return [
    "# Coding Agent Dispatch Simulation",
    "",
    `Mode: ${report.mode}`,
    `Decision: ${report.decision}`,
    `Dispatch decision: ${report.dispatchDecision}`,
    `Archive audit: ${report.archiveAuditDecision || "not-attached"}`,
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
    `- Total items: ${report.summary.total}`,
    `- Ready for real agent: ${report.summary.readyForAgent}`,
    `- Held: ${report.summary.held}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Planned commands: ${report.summary.plannedCommands}`,
    `- Expected evidence artifacts: ${report.summary.expectedEvidenceArtifacts}`,
    `- Receipt draft items: ${report.summary.receiptDraftItems}`,
    `- Unsafe paths: ${report.summary.unsafePaths}`,
    `- Archive audit blockers: ${report.summary.archiveAuditBlockers}`,
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function simulationItemFor({
  item,
  archiveAudit
}: {
  item: CodingAgentDispatchManifestItem;
  archiveAudit?: CodingAgentDispatchArchiveAudit | null;
}): CodingAgentDispatchSimulationItem {
  const checks = checksFor(item, archiveAudit);
  const simulationStatus = statusFor(item, checks);
  const receiptDraft = simulationStatus === "ready-for-agent"
    ? {
      sessionId: item.sessionId,
      receiptTemplatePath: item.receiptTemplatePath,
      changedFiles: [],
      commandResults: commandResultsFor(item),
      evidence: item.expectedEvidenceArtifacts.map((artifact) => artifact.path),
      risks: ["Pending real coding-agent execution; replace this simulation draft before receipt review."],
      missing: [
        "Changed files summary from the real coding workspace.",
        ...item.verificationCommands.map((command) => `Real command output and exit code for: ${command}`),
        ...item.expectedEvidenceArtifacts.map((artifact) => `Evidence artifact content for: ${artifact.label}`)
      ]
    }
    : null;

  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    dispatchStatus: item.dispatchStatus,
    simulationStatus,
    executorProfileId: item.executorProfileId,
    promptPath: item.promptPath,
    receiptTemplatePath: item.receiptTemplatePath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    plannedSteps: plannedStepsFor(item, simulationStatus),
    verificationCommands: item.verificationCommands,
    expectedTranscriptRefs: item.expectedTranscriptRefs,
    expectedEvidenceArtifacts: item.expectedEvidenceArtifacts,
    receiptDraft,
    safetyStops: item.safetyStops,
    checks,
    nextAction: nextActionFor(item, simulationStatus, archiveAudit)
  };
}

function checksFor(
  item: CodingAgentDispatchManifestItem,
  archiveAudit?: CodingAgentDispatchArchiveAudit | null
) {
  const ready = item.dispatchStatus === "ready-to-dispatch";
  return [
    {
      id: "dispatch-status",
      status: ready ? "pass" as const : "warn" as const,
      summary: ready
        ? "Session is ready to dispatch."
        : `Session is ${item.dispatchStatus} and must not receive a runnable prompt.`
    },
    {
      id: "archive-audit",
      status: archiveAuditStatus(archiveAudit),
      summary: archiveAudit
        ? `Archive audit decision is ${archiveAudit.decision}.`
        : "Archive audit is not attached to this simulation."
    },
    {
      id: "prompt-path",
      status: dispatchPathStatus(item.promptPath, ready),
      summary: dispatchPathSummary("Prompt", item.promptPath, ready)
    },
    {
      id: "receipt-path",
      status: dispatchPathStatus(item.receiptTemplatePath, ready),
      summary: dispatchPathSummary("Receipt template", item.receiptTemplatePath, ready)
    },
    {
      id: "evidence-prefix-path",
      status: isSafeRelativeArtifactPath(item.evidenceArtifactPrefix) ? "pass" as const : "block" as const,
      summary: `Evidence prefix is ${item.evidenceArtifactPrefix}.`
    },
    {
      id: "transcript-path",
      status: item.expectedTranscriptRefs.every(isSafeRelativeArtifactPath) ? "pass" as const : "block" as const,
      summary: `${item.expectedTranscriptRefs.length} expected transcript paths checked.`
    },
    {
      id: "evidence-artifact-path",
      status: item.expectedEvidenceArtifacts.every((artifact) => isSafeRelativeArtifactPath(artifact.path))
        ? "pass" as const
        : "block" as const,
      summary: `${item.expectedEvidenceArtifacts.length} expected evidence artifact paths checked.`
    },
    {
      id: "verification-commands",
      status: item.verificationCommands.length > 0 ? "pass" as const : "block" as const,
      summary: `${item.verificationCommands.length} verification commands are planned.`
    },
    {
      id: "required-evidence",
      status: item.requiredEvidence.length > 0 ? "pass" as const : "block" as const,
      summary: `${item.requiredEvidence.length} required evidence labels are planned.`
    }
  ];
}

function archiveAuditStatus(archiveAudit?: CodingAgentDispatchArchiveAudit | null) {
  if (!archiveAudit) return "warn" as const;
  if (archiveAudit.decision === "blocked") return "block" as const;
  if (archiveAudit.decision === "needs-review") return "warn" as const;
  return "pass" as const;
}

function statusFor(
  item: CodingAgentDispatchManifestItem,
  checks: ReturnType<typeof checksFor>
): CodingAgentDispatchSimulationItemStatus {
  if (item.dispatchStatus !== "ready-to-dispatch") {
    return "held";
  }
  if (checks.some((check) => check.status === "block")) {
    return "blocked";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "held";
  }
  return "ready-for-agent";
}

function commandResultsFor(item: CodingAgentDispatchManifestItem): CodingAgentCommandResult[] {
  return item.verificationCommands.map((command, index) => ({
    command,
    exitCode: null,
    outputSummary: "Pending real execution; local dispatch simulation did not run this command.",
    transcriptRef: item.expectedTranscriptRefs[index]
  }));
}

function plannedStepsFor(
  item: CodingAgentDispatchManifestItem,
  status: CodingAgentDispatchSimulationItemStatus
) {
  if (status !== "ready-for-agent") {
    return [
      "Keep this session visible to the operator but do not assign it to a coding agent.",
      item.nextAction
    ];
  }

  return [
    `Open the prompt file ${item.promptPath} inside a governed ${item.executorProfileId} workspace.`,
    "Apply only the allowed implementation actions described in the prompt and sandbox contract.",
    "Stop immediately if a safety stop, production deploy, external credential, or unapproved host action is required.",
    "Run each verification command and save the transcript under the expected session evidence prefix.",
    "Write required evidence artifacts under the expected session evidence prefix.",
    `Complete ${item.receiptTemplatePath} with real changed files, command exit codes, evidence artifacts, and remaining risks.`
  ];
}

function nextActionFor(
  item: CodingAgentDispatchManifestItem,
  status: CodingAgentDispatchSimulationItemStatus,
  archiveAudit?: CodingAgentDispatchArchiveAudit | null
) {
  if (status === "ready-for-agent") {
    return "Hand the prompt and receipt draft to a governed coding agent, then require completed evidence before receipt review.";
  }
  if (status === "blocked") {
    return archiveAudit?.decision === "blocked"
      ? "Fix the dispatch archive audit blockers before simulating or assigning this session."
      : "Fix unsafe or incomplete dispatch paths before simulating this session.";
  }
  return item.nextAction;
}

function simulationDecision({
  readyForAgent,
  blocked,
  archiveAudit,
  items
}: {
  readyForAgent: number;
  blocked: number;
  archiveAudit?: CodingAgentDispatchArchiveAudit | null;
  items: CodingAgentDispatchSimulationItem[];
}): CodingAgentDispatchSimulationDecision {
  if (blocked > 0 || archiveAudit?.decision === "blocked") {
    return "blocked";
  }
  if (!archiveAudit || archiveAudit.decision === "needs-review" || readyForAgent === 0) {
    return "needs-review";
  }
  if (items.some((item) => item.checks.some((check) => check.status === "warn"))) {
    return "needs-review";
  }
  return "ready-for-real-agent";
}

function dispatchPathStatus(path: string | null, ready: boolean) {
  if (ready) {
    return path && isSafeRelativeArtifactPath(path) ? "pass" as const : "block" as const;
  }
  return path ? "block" as const : "pass" as const;
}

function dispatchPathSummary(label: string, path: string | null, ready: boolean) {
  if (ready) {
    return path ? `${label} path is ${path}.` : `${label} path is missing for a ready session.`;
  }
  return path
    ? `${label} path is unexpectedly written for a held session: ${path}.`
    : `${label} path is not written for this held item.`;
}

function itemMarkdown(item: CodingAgentDispatchSimulationItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Simulation status: ${item.simulationStatus}`,
    `- Dispatch status: ${item.dispatchStatus}`,
    `- Executor: ${item.executorProfileId}`,
    `- Prompt path: ${item.promptPath || "not-written"}`,
    `- Receipt template: ${item.receiptTemplatePath || "not-written"}`,
    `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
    `- Next action: ${item.nextAction}`,
    "",
    "### Planned Steps",
    "",
    ...item.plannedSteps.map((step) => `- ${step}`),
    "",
    "### Verification Commands",
    "",
    ...item.verificationCommands.map((command) => `- \`${command}\``),
    "",
    "### Expected Evidence",
    "",
    ...item.expectedEvidenceArtifacts.map((artifact) => `- ${artifact.label}: ${artifact.path}`),
    "",
    "### Checks",
    "",
    ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
    ""
  ];
}
