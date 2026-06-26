import { buildCodingAgentBriefReview } from "./codingAgentBriefReview";
import type {
  CodingAgentBrief,
  CodingAgentBriefReviewCheck,
  CodingAgentBriefReviewReport,
  CodingAgentBriefs,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionBundleDecision,
  CodingAgentSessionSandboxContract,
  CodingAgentSessionStatus,
  ReleaseVerificationReport
} from "./types";

export interface BuildCodingAgentSessionBundleInput {
  briefs: CodingAgentBriefs;
  review?: CodingAgentBriefReviewReport | null;
  releaseVerification?: ReleaseVerificationReport | null;
  requireProductionEvidence?: boolean;
  generatedAt?: string;
}

export function buildCodingAgentSessionBundle({
  briefs,
  review,
  releaseVerification,
  requireProductionEvidence = false,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentSessionBundleInput): CodingAgentSessionBundle {
  const effectiveReview = review?.schema === "naikaku.coding-agent-brief-review.v1" && !requireProductionEvidence
    ? review
    : buildCodingAgentBriefReview({
      briefs,
      releaseVerification,
      requireProductionEvidence,
      generatedAt
    });
  const sessions = briefs.briefs.map((brief, index) =>
    briefToSession({
      brief,
      index,
      review: effectiveReview,
      requireProductionEvidence
    })
  );
  const ready = sessions.filter((session) => session.status === "ready-for-agent").length;
  const productionHeld = sessions.filter((session) => session.status === "held-for-production-evidence").length;

  return {
    schema: "naikaku.coding-agent-session-bundle.v1",
    generatedAt,
    mode: "dry-run",
    mission: briefs.mission,
    runId: briefs.runId,
    operatorLocale: briefs.operatorLocale,
    sourceSchema: briefs.schema,
    requireProductionEvidence,
    review: effectiveReview,
    decision: bundleDecision(effectiveReview, sessions),
    sessions,
    summary: {
      total: sessions.length,
      ready,
      held: sessions.length - ready,
      humanApproval: sessions.filter((session) =>
        session.safetyStops.some((stop) => stop.includes("human approval"))
      ).length,
      productionHeld,
      verificationCommands: new Set(sessions.flatMap((session) => session.verificationCommands)).size,
      evidenceItems: new Set(sessions.flatMap((session) => session.evidenceRequired)).size
    }
  };
}

export function serializeCodingAgentSessionBundle(bundle: CodingAgentSessionBundle) {
  return JSON.stringify(bundle, null, 2);
}

export function serializeCodingAgentSessionBundleMarkdown(bundle: CodingAgentSessionBundle) {
  return [
    "# Coding Agent Session Bundle",
    "",
    `Mission: ${bundle.mission}`,
    `Mode: ${bundle.mode}`,
    `Decision: ${bundle.decision}`,
    `Review: ${bundle.review.decision}`,
    `Locale: ${bundle.operatorLocale}`,
    `Run: ${bundle.runId || "workspace"}`,
    `Generated: ${bundle.generatedAt}`,
    "",
    "## Honesty Boundary",
    "",
    "- This bundle does not execute code, run shell commands, browse, deploy, send messages, or push Git.",
    "- It packages reviewed prompts for a later coding agent session.",
    "- Ready sessions still require the receiving agent to return changed files, command output, and remaining risks.",
    "- Held sessions must not be assigned until their next action is completed.",
    "",
    "## Summary",
    "",
    `- Total sessions: ${bundle.summary.total}`,
    `- Ready for agent: ${bundle.summary.ready}`,
    `- Held: ${bundle.summary.held}`,
    `- Held for production evidence: ${bundle.summary.productionHeld}`,
    `- Human approval flags: ${bundle.summary.humanApproval}`,
    "",
    ...bundle.sessions.flatMap((session, index) => sessionMarkdown(session, index + 1))
  ].join("\n");
}

function briefToSession({
  brief,
  index,
  review,
  requireProductionEvidence
}: {
  brief: CodingAgentBrief;
  index: number;
  review: CodingAgentBriefReviewReport;
  requireProductionEvidence: boolean;
}): CodingAgentSession {
  const actionableCheck = firstActionableCheck(review.checks);
  const status = sessionStatus({
    brief,
    review,
    actionableCheck,
    requireProductionEvidence
  });
  const nextAction = nextActionFor({
    brief,
    review,
    actionableCheck,
    status
  });

  return {
    id: `coding-session-${brief.id}`,
    briefId: brief.id,
    sourceItemId: brief.sourceItemId,
    title: brief.title,
    roleId: brief.roleId,
    roleName: brief.roleName,
    mode: brief.mode,
    priority: brief.priority,
    executorProfileId: brief.sandbox.executorProfileId,
    status,
    promptFileName: `${String(index + 1).padStart(2, "0")}-${slugify(brief.title)}.md`,
    sandboxContract: sandboxContractFor(brief),
    handoffMarkdown: handoffMarkdown({ brief, status, nextAction }),
    verificationCommands: brief.verificationCommands,
    evidenceRequired: brief.evidenceRequired,
    safetyStops: safetyStopsFor(brief, review, requireProductionEvidence),
    nextAction
  };
}

function sandboxContractFor(brief: CodingAgentBrief): CodingAgentSessionSandboxContract {
  return {
    boundary: "sandbox-only",
    executorProfileId: brief.sandbox.executorProfileId,
    allowedActions: brief.sandbox.allowedActions,
    prohibitedActions: brief.sandbox.prohibitedActions,
    requiresHumanApproval: brief.sandbox.requiresHumanApproval,
    evidenceArtifactPrefix: `output/coding-agent/${brief.id}/`,
    receiptSchema: "naikaku.coding-agent-session-receipt.v1"
  };
}

function sessionStatus({
  brief,
  review,
  actionableCheck,
  requireProductionEvidence
}: {
  brief: CodingAgentBrief;
  review: CodingAgentBriefReviewReport;
  actionableCheck: CodingAgentBriefReviewCheck | null;
  requireProductionEvidence: boolean;
}): CodingAgentSessionStatus {
  if (
    actionableCheck?.id === "coding-brief-release-gate-truthfulness" &&
    (requireProductionEvidence || brief.releaseGate.productionEvidenceRequired)
  ) {
    return "held-for-production-evidence";
  }
  if (review.decision !== "ready" || brief.mode === "blocked-review") {
    return "held-for-review";
  }
  return "ready-for-agent";
}

function nextActionFor({
  brief,
  review,
  actionableCheck,
  status
}: {
  brief: CodingAgentBrief;
  review: CodingAgentBriefReviewReport;
  actionableCheck: CodingAgentBriefReviewCheck | null;
  status: CodingAgentSessionStatus;
}) {
  if (status === "held-for-production-evidence") {
    return actionableCheck?.nextAction || "Attach verified production evidence before assigning this coding agent session.";
  }
  if (status === "held-for-review") {
    if (brief.mode === "blocked-review") {
      return "Resolve the source development item or record explicit operator approval before assigning this session.";
    }
    return actionableCheck?.nextAction || "Clear coding-agent brief review warnings before assigning this session.";
  }
  if (review.decision === "ready") {
    return "Assign to a sandboxed coding agent and require changed files, command output, and remaining risk notes.";
  }
  return "Review the generated prompt before assignment.";
}

function safetyStopsFor(
  brief: CodingAgentBrief,
  review: CodingAgentBriefReviewReport,
  requireProductionEvidence: boolean
) {
  return [
    `Executor boundary: ${brief.sandbox.executorProfileId}`,
    `Prohibited actions: ${brief.sandbox.prohibitedActions.join(", ")}`,
    brief.sandbox.requiresHumanApproval
      ? "Stop for human approval before high-impact, blocked, or approval-gated work."
      : "Stop if the task expands into high-impact or irreversible work.",
    brief.releaseGate.required
      ? `Release gate required: ${brief.releaseGate.nextAction}`
      : "Release gate optional: agent must explain why release verification is not required.",
    requireProductionEvidence
      ? "Production evidence is required before external handoff."
      : "Dry-run evidence must not be described as production evidence.",
    `Brief review decision: ${review.decision}`
  ];
}

function handoffMarkdown({
  brief,
  status,
  nextAction
}: {
  brief: CodingAgentBrief;
  status: CodingAgentSessionStatus;
  nextAction: string;
}) {
  return [
    `# ${brief.title}`,
    "",
    `Status: ${status}`,
    `Executor: ${brief.sandbox.executorProfileId}`,
    `Priority: ${brief.priority}`,
    `Mode: ${brief.mode}`,
    "",
    "## Prompt",
    "",
    "```text",
    brief.prompt,
    "```",
    "",
    "## Verification",
    "",
    ...brief.verificationCommands.map((command) => `- \`${command}\``),
    "",
    "## Evidence Required",
    "",
    ...brief.evidenceRequired.map((item) => `- ${item}`),
    "",
    "## Sandbox Contract",
    "",
    `- Boundary: sandbox-only`,
    `- Executor profile: ${brief.sandbox.executorProfileId}`,
    `- Receipt schema: naikaku.coding-agent-session-receipt.v1`,
    `- Evidence artifact prefix: output/coding-agent/${brief.id}/`,
    `- Human approval required: ${brief.sandbox.requiresHumanApproval ? "yes" : "no"}`,
    "",
    "### Allowed Actions",
    "",
    ...brief.sandbox.allowedActions.map((action) => `- ${action}`),
    "",
    "### Prohibited Actions",
    "",
    ...brief.sandbox.prohibitedActions.map((action) => `- ${action}`),
    "",
    "## Safety Stops",
    "",
    ...brief.sandbox.prohibitedActions.map((action) => `- Do not perform: ${action}`),
    brief.sandbox.requiresHumanApproval
      ? "- Human approval is required before this task can proceed."
      : "- Stop if the task asks for deployment, external messages, purchases, remote deletes, raw secrets, or unreviewed Git push.",
    "",
    "## Next Action",
    "",
    nextAction,
    ""
  ].join("\n");
}

function sessionMarkdown(session: CodingAgentSession, index: number) {
  return [
    `## ${index}. ${session.title}`,
    "",
    `- Status: ${session.status}`,
    `- Source item: ${session.sourceItemId}`,
    `- Executor: ${session.executorProfileId}`,
    `- Prompt file: ${session.promptFileName}`,
    `- Sandbox boundary: ${session.sandboxContract.boundary}`,
    `- Receipt schema: ${session.sandboxContract.receiptSchema}`,
    `- Evidence prefix: ${session.sandboxContract.evidenceArtifactPrefix}`,
    `- Next action: ${session.nextAction}`,
    "",
    "### Allowed Actions",
    "",
    ...session.sandboxContract.allowedActions.map((action) => `- ${action}`),
    "",
    "### Prohibited Actions",
    "",
    ...session.sandboxContract.prohibitedActions.map((action) => `- ${action}`),
    "",
    "### Verification Commands",
    "",
    ...session.verificationCommands.map((command) => `- \`${command}\``),
    "",
    "### Safety Stops",
    "",
    ...session.safetyStops.map((stop) => `- ${stop}`),
    ""
  ];
}

function bundleDecision(
  review: CodingAgentBriefReviewReport,
  sessions: CodingAgentSession[]
): CodingAgentSessionBundleDecision {
  if (review.decision === "blocked" || sessions.some((session) => session.status === "held-for-production-evidence")) {
    return "blocked";
  }
  if (review.decision === "needs-review" || sessions.some((session) => session.status === "held-for-review")) {
    return "needs-review";
  }
  return "ready";
}

function firstActionableCheck(checks: CodingAgentBriefReviewCheck[]) {
  return checks.find((check) => check.status === "block")
    || checks.find((check) => check.status === "warn")
    || null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70) || "coding-agent-session";
}
