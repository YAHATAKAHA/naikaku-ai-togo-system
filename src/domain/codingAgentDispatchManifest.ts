import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentDispatchDecision,
  CodingAgentDispatchItemStatus,
  CodingAgentDispatchManifest,
  CodingAgentDispatchManifestItem,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionDrillReport
} from "./types";

export interface BuildCodingAgentDispatchManifestInput {
  bundle: CodingAgentSessionBundle;
  drill?: CodingAgentSessionDrillReport | null;
  generatedAt?: string;
}

const receiptTemplatePath = "receipt-template.json";

export function buildCodingAgentDispatchManifest({
  bundle,
  drill,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentDispatchManifestInput): CodingAgentDispatchManifest {
  const items = bundle.sessions.map((session) =>
    sessionToDispatchItem({
      session,
      bundle,
      drill
    })
  );
  const ready = items.filter((item) => item.dispatchStatus === "ready-to-dispatch").length;
  const held = items.length - ready;
  const productionHeld = items.filter((item) => item.dispatchStatus === "held-for-production-evidence").length;
  const unsafePaths = items.reduce((total, item) => total + unsafePathCount(item), 0);

  return {
    schema: "naikaku.coding-agent-dispatch-manifest.v1",
    generatedAt,
    mode: "dry-run-dispatch",
    sourceSchema: bundle.schema,
    drillSchema: drill?.schema,
    bundleDecision: bundle.decision,
    drillDecision: drill?.decision,
    decision: dispatchDecision(items),
    mission: bundle.mission,
    runId: bundle.runId,
    operatorLocale: bundle.operatorLocale,
    receiptTemplatePath: ready > 0 ? receiptTemplatePath : null,
    items,
    summary: {
      total: items.length,
      ready,
      held,
      productionHeld,
      promptFiles: items.filter((item) => Boolean(item.promptPath)).length,
      receiptTemplates: ready > 0 ? 1 : 0,
      uniqueEvidencePrefixes: new Set(items.map((item) => item.evidenceArtifactPrefix)).size,
      unsafePaths,
      humanApprovalRequired: items.filter((item) => item.requiresHumanApproval).length
    },
    honestyClaim: {
      level: "dry-run-dispatch",
      claim: "This manifest prepares a local coding-agent dispatch package without executing implementation work.",
      limitations: [
        "It writes reviewed prompts and receipt instructions only; it does not edit code, run commands, browse, deploy, commit, push, or call providers.",
        "Ready-to-dispatch items still require a receiving coding agent to return changed files, command transcripts, evidence artifacts, and risks.",
        "Held items are listed for operator visibility but do not receive prompt paths in the dispatch package."
      ],
      productionRequirements: [
        "Run dispatched prompts inside governed coding workspaces or sandbox executor profiles.",
        "Attach real transcript and evidence files under each session evidence prefix before receipt review.",
        "Run production-mode release verification before any external production handoff."
      ]
    }
  };
}

export function serializeCodingAgentDispatchManifest(manifest: CodingAgentDispatchManifest) {
  return JSON.stringify(manifest, null, 2);
}

export function serializeCodingAgentDispatchManifestMarkdown(manifest: CodingAgentDispatchManifest) {
  return [
    "# Coding Agent Dispatch Manifest",
    "",
    `Mission: ${manifest.mission}`,
    `Mode: ${manifest.mode}`,
    `Decision: ${manifest.decision}`,
    `Bundle decision: ${manifest.bundleDecision}`,
    `Drill decision: ${manifest.drillDecision || "not-attached"}`,
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
    `- Total items: ${manifest.summary.total}`,
    `- Ready to dispatch: ${manifest.summary.ready}`,
    `- Held: ${manifest.summary.held}`,
    `- Held for production evidence: ${manifest.summary.productionHeld}`,
    `- Prompt files: ${manifest.summary.promptFiles}`,
    `- Receipt template: ${manifest.receiptTemplatePath || "not written"}`,
    `- Unsafe paths: ${manifest.summary.unsafePaths}`,
    "",
    ...manifest.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function sessionToDispatchItem({
  session,
  bundle,
  drill
}: {
  session: CodingAgentSession;
  bundle: CodingAgentSessionBundle;
  drill?: CodingAgentSessionDrillReport | null;
}): CodingAgentDispatchManifestItem {
  const drillItem = drill?.items.find((item) => item.sessionId === session.id);
  const dispatchStatus = dispatchStatusFor(session, bundle, drillItem?.action);
  const promptPath = dispatchStatus === "ready-to-dispatch"
    ? `prompts/${session.promptFileName}`
    : null;
  const itemReceiptTemplatePath = dispatchStatus === "ready-to-dispatch"
    ? receiptTemplatePath
    : null;

  return {
    sessionId: session.id,
    briefId: session.briefId,
    sourceItemId: session.sourceItemId,
    title: session.title,
    sessionStatus: session.status,
    dispatchStatus,
    executorProfileId: session.executorProfileId,
    promptPath,
    receiptTemplatePath: itemReceiptTemplatePath,
    evidenceArtifactPrefix: normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix),
    requiresHumanApproval: session.sandboxContract.requiresHumanApproval,
    expectedTranscriptRefs: session.verificationCommands.map((_, index) =>
      `${normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix)}transcript-${index + 1}.log`
    ),
    expectedEvidenceArtifacts: session.evidenceRequired.map((label, index) => ({
      label,
      path: `${normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix)}evidence-${index + 1}.txt`
    })),
    verificationCommands: session.verificationCommands,
    requiredEvidence: session.evidenceRequired,
    allowedActions: session.sandboxContract.allowedActions,
    prohibitedActions: session.sandboxContract.prohibitedActions,
    safetyStops: session.safetyStops,
    nextAction: dispatchStatus === "ready-to-dispatch"
      ? "Send the prompt file to a governed coding agent and require the receipt template plus evidence artifacts before marking complete."
      : session.nextAction
  };
}

function dispatchStatusFor(
  session: CodingAgentSession,
  bundle: CodingAgentSessionBundle,
  drillAction?: string
): CodingAgentDispatchItemStatus {
  if (session.status === "held-for-production-evidence") return "held-for-production-evidence";
  if (session.status === "held-for-review") return "held-for-review";
  if (bundle.decision === "ready" && (!drillAction || drillAction === "would-assign")) {
    return "ready-to-dispatch";
  }
  return "not-dispatchable";
}

function dispatchDecision(items: CodingAgentDispatchManifestItem[]): CodingAgentDispatchDecision {
  if (items.some((item) =>
    item.dispatchStatus === "held-for-production-evidence" || item.dispatchStatus === "not-dispatchable"
  )) {
    return "blocked";
  }
  if (items.some((item) => item.dispatchStatus === "held-for-review")) {
    return "held";
  }
  return "dispatchable";
}

function unsafePathCount(item: CodingAgentDispatchManifestItem) {
  const paths = [
    item.promptPath,
    item.receiptTemplatePath,
    item.evidenceArtifactPrefix,
    ...item.expectedTranscriptRefs,
    ...item.expectedEvidenceArtifacts.map((artifact) => artifact.path)
  ].filter((path): path is string => Boolean(path));

  return paths.filter((path) => !isSafeRelativeArtifactPath(path)).length;
}

function normalizedPrefix(prefix: string) {
  const normalized = prefix.trim().replace(/^\.\/+/, "").replace(/\/+/g, "/");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function itemMarkdown(item: CodingAgentDispatchManifestItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Dispatch status: ${item.dispatchStatus}`,
    `- Session status: ${item.sessionStatus}`,
    `- Session: ${item.sessionId}`,
    `- Source item: ${item.sourceItemId}`,
    `- Executor: ${item.executorProfileId}`,
    `- Prompt path: ${item.promptPath || "not written"}`,
    `- Receipt template: ${item.receiptTemplatePath || "not written"}`,
    `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
    `- Human approval required: ${item.requiresHumanApproval ? "yes" : "no"}`,
    `- Next action: ${item.nextAction}`,
    "",
    "### Expected Transcript Refs",
    "",
    ...item.expectedTranscriptRefs.map((path) => `- ${path}`),
    "",
    "### Expected Evidence Artifacts",
    "",
    ...item.expectedEvidenceArtifacts.map((artifact) => `- ${artifact.label}: ${artifact.path}`),
    "",
    "### Verification Commands",
    "",
    ...item.verificationCommands.map((command) => `- \`${command}\``),
    "",
    "### Prohibited Actions",
    "",
    ...item.prohibitedActions.map((action) => `- ${action}`),
    ""
  ];
}
