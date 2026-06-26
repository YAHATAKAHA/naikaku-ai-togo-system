import type {
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionDrillAction,
  CodingAgentSessionDrillDecision,
  CodingAgentSessionDrillItem,
  CodingAgentSessionDrillReport
} from "./types";

export interface BuildCodingAgentSessionDrillInput {
  bundle: CodingAgentSessionBundle;
  generatedAt?: string;
}

export function buildCodingAgentSessionDrill({
  bundle,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentSessionDrillInput): CodingAgentSessionDrillReport {
  const items = bundle.sessions.map((session) => sessionToDrillItem(session, bundle));
  const wouldAssign = items.filter((item) => item.action === "would-assign").length;
  const notAssigned = items.filter((item) => item.action === "not-assigned").length;
  const needsReview = items.filter((item) => item.action === "needs-operator-review").length;

  return {
    schema: "naikaku.coding-agent-session-drill.v1",
    generatedAt,
    mode: "dry-run",
    sourceSchema: bundle.schema,
    bundleDecision: bundle.decision,
    decision: drillDecision(bundle, items),
    runId: bundle.runId,
    operatorLocale: bundle.operatorLocale,
    items,
    honestyClaim: {
      level: "dry-run",
      claim: "This drill only simulates coding-agent session assignment decisions.",
      limitations: [
        "No code was edited, generated, tested, committed, pushed, deployed, browsed, or executed.",
        "No model provider or external coding agent was called.",
        "Ready sessions still require a receiving agent to return real changed files, command output, and remaining risks."
      ],
      productionRequirements: [
        "Run assigned sessions in a governed coding workspace.",
        "Attach real command output and exit codes for every required verification command.",
        "Attach changed file summaries and evidence before claiming implementation complete.",
        "Run production-mode release verification before external handoff."
      ]
    },
    summary: {
      total: items.length,
      wouldAssign,
      notAssigned,
      needsReview,
      blocked: items.filter((item) => item.action !== "would-assign").length,
      requiredCommands: new Set(items.flatMap((item) => item.requiredCommands)).size,
      requiredEvidence: new Set(items.flatMap((item) => item.requiredEvidence)).size
    }
  };
}

export function serializeCodingAgentSessionDrill(report: CodingAgentSessionDrillReport) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentSessionDrillMarkdown(report: CodingAgentSessionDrillReport) {
  return [
    "# Coding Agent Session Drill",
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
    `- Would assign: ${report.summary.wouldAssign}`,
    `- Not assigned: ${report.summary.notAssigned}`,
    `- Needs operator review: ${report.summary.needsReview}`,
    "",
    ...report.items.flatMap((item, index) => itemMarkdown(item, index + 1))
  ].join("\n");
}

function sessionToDrillItem(
  session: CodingAgentSession,
  bundle: CodingAgentSessionBundle
): CodingAgentSessionDrillItem {
  const action = actionFor(session, bundle);

  return {
    sessionId: session.id,
    title: session.title,
    status: session.status,
    action,
    executorProfileId: session.executorProfileId,
    reason: reasonFor(session, action),
    simulatedPromptBytes: new TextEncoder().encode(session.handoffMarkdown).byteLength,
    requiredCommands: session.verificationCommands,
    requiredEvidence: session.evidenceRequired,
    safetyStops: session.safetyStops,
    nextAction: action === "would-assign"
      ? "Assign this prompt to a sandboxed coding agent and wait for real evidence before marking complete."
      : session.nextAction
  };
}

function actionFor(
  session: CodingAgentSession,
  bundle: CodingAgentSessionBundle
): CodingAgentSessionDrillAction {
  if (session.status === "ready-for-agent" && bundle.decision === "ready") {
    return "would-assign";
  }
  if (session.status === "held-for-review") {
    return "needs-operator-review";
  }
  return "not-assigned";
}

function reasonFor(
  session: CodingAgentSession,
  action: CodingAgentSessionDrillAction
) {
  if (action === "would-assign") {
    return "Session is ready and the bundle review is clear.";
  }
  if (action === "needs-operator-review") {
    return "Session is held until an operator clears the review or source work item.";
  }
  if (session.status === "held-for-production-evidence") {
    return "Session is held because production evidence is required before assignment.";
  }
  return "Session is not assignable in the current bundle state.";
}

function drillDecision(
  bundle: CodingAgentSessionBundle,
  items: CodingAgentSessionDrillItem[]
): CodingAgentSessionDrillDecision {
  if (bundle.decision === "blocked" || items.some((item) => item.action === "not-assigned")) {
    return "blocked";
  }
  if (bundle.decision === "needs-review" || items.some((item) => item.action === "needs-operator-review")) {
    return "held";
  }
  return "assignable";
}

function itemMarkdown(item: CodingAgentSessionDrillItem, index: number) {
  return [
    `## ${index}. ${item.title}`,
    "",
    `- Action: ${item.action}`,
    `- Status: ${item.status}`,
    `- Executor: ${item.executorProfileId}`,
    `- Reason: ${item.reason}`,
    `- Simulated prompt bytes: ${item.simulatedPromptBytes}`,
    `- Next action: ${item.nextAction}`,
    "",
    "### Required Commands",
    "",
    ...item.requiredCommands.map((command) => `- \`${command}\``),
    "",
    "### Required Evidence",
    "",
    ...item.requiredEvidence.map((evidence) => `- ${evidence}`),
    "",
    "### Safety Stops",
    "",
    ...item.safetyStops.map((stop) => `- ${stop}`),
    ""
  ];
}
