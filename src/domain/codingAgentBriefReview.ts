import type {
  CodingAgentBrief,
  CodingAgentBriefReviewCheck,
  CodingAgentBriefReviewDecision,
  CodingAgentBriefReviewReport,
  CodingAgentBriefs,
  ReleaseVerificationReport
} from "./types";

export interface BuildCodingAgentBriefReviewInput {
  briefs: CodingAgentBriefs;
  releaseVerification?: ReleaseVerificationReport | null;
  requireProductionEvidence?: boolean;
  generatedAt?: string;
}

const requiredProhibitedActions = [
  "raw-secret-export",
  "production-deploy",
  "remote-delete",
  "purchase",
  "external-message-send",
  "unreviewed-git-push"
];

export function buildCodingAgentBriefReview({
  briefs,
  releaseVerification,
  requireProductionEvidence = false,
  generatedAt = new Date().toISOString()
}: BuildCodingAgentBriefReviewInput): CodingAgentBriefReviewReport {
  const checks = [
    schemaCheck(briefs),
    promptCompletenessCheck(briefs),
    verificationCommandCheck(briefs),
    sandboxBoundaryCheck(briefs),
    releaseGateTruthfulnessCheck(briefs, releaseVerification || null, requireProductionEvidence)
  ];
  const summary = {
    total: checks.length,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    blockers: checks.filter((check) => check.status === "block").length,
    briefs: briefs.briefs.length,
    implementable: briefs.summary.implementable,
    humanReview: briefs.summary.humanReview
  };

  return {
    schema: "naikaku.coding-agent-brief-review.v1",
    generatedAt,
    sourceSchema: briefs.schema,
    operatorLocale: briefs.operatorLocale,
    runId: briefs.runId,
    decision: decisionFor(checks),
    checks,
    summary
  };
}

export function serializeCodingAgentBriefReview(report: CodingAgentBriefReviewReport) {
  return JSON.stringify(report, null, 2);
}

function schemaCheck(briefs: CodingAgentBriefs): CodingAgentBriefReviewCheck {
  const ok = briefs.schema === "naikaku.coding-agent-briefs.v1" && briefs.briefs.length > 0;

  return check({
    id: "coding-brief-schema",
    label: "Brief schema and count",
    status: ok ? "pass" : "block",
    summary: ok
      ? "Coding agent briefs use the expected schema and include at least one brief."
      : "Coding agent briefs are missing, empty, or use an unexpected schema.",
    evidence: [
      `Schema: ${briefs.schema}`,
      `Briefs: ${briefs.briefs.length}`,
      `Locale: ${briefs.operatorLocale}`
    ],
    nextAction: ok
      ? "Use the brief set as the review source."
      : "Regenerate coding agent briefs from the Development Board."
  });
}

function promptCompletenessCheck(briefs: CodingAgentBriefs): CodingAgentBriefReviewCheck {
  const incomplete = briefs.briefs.filter((brief) =>
    !brief.prompt.trim()
    || !brief.objective.trim()
    || !brief.context.length
    || !brief.acceptanceCriteria.length
    || !brief.deliverables.length
    || !brief.evidenceRequired.length
  );

  return check({
    id: "coding-brief-prompt-completeness",
    label: "Prompt completeness",
    status: incomplete.length ? "block" : "pass",
    summary: incomplete.length
      ? `${incomplete.length} briefs are missing prompt, objective, context, acceptance, deliverable, or evidence data.`
      : "Every brief has prompt, objective, context, acceptance, deliverable, and evidence data.",
    evidence: [
      `Complete briefs: ${briefs.briefs.length - incomplete.length}/${briefs.briefs.length}`,
      ...sampleIds(incomplete)
    ],
    nextAction: incomplete.length
      ? "Regenerate briefs or complete missing task fields before assigning to an agent."
      : "Briefs are ready for operator review."
  });
}

function verificationCommandCheck(briefs: CodingAgentBriefs): CodingAgentBriefReviewCheck {
  const missingCore = briefs.briefs.filter((brief) =>
    !hasCommand(brief, "npm run test") || !hasCommand(brief, "npm run build")
  );
  const releaseGateMissing = briefs.briefs.filter((brief) =>
    brief.releaseGate.required && !hasCommand(brief, "npm run release:verify")
  );
  const highPriorityMissingStrict = briefs.briefs.filter((brief) =>
    (brief.priority === "critical" || brief.priority === "high") &&
    !brief.verificationCommands.some((command) => command.includes("rehearsal:strict"))
  );
  const blockers = missingCore.length + releaseGateMissing.length;
  const warnings = highPriorityMissingStrict.length;

  return check({
    id: "coding-brief-verification-commands",
    label: "Verification commands",
    status: blockers ? "block" : warnings ? "warn" : "pass",
    summary: blockers
      ? "Some briefs are missing core build/test or release verification commands."
      : warnings
        ? "Some high-priority briefs do not include strict rehearsal verification."
        : "Brief verification commands cover test, build, strict rehearsal when needed, and release gate checks.",
    evidence: [
      `Missing core test/build: ${missingCore.length}`,
      `Release-gated without release verify: ${releaseGateMissing.length}`,
      `High priority without strict rehearsal: ${highPriorityMissingStrict.length}`,
      ...sampleIds([...missingCore, ...releaseGateMissing, ...highPriorityMissingStrict])
    ],
    nextAction: blockers
      ? "Add required verification commands before handing the brief to a coding agent."
      : warnings
        ? "Add strict rehearsal to high-priority briefs before final handoff."
        : "Require agents to return command output and exit codes."
  });
}

function sandboxBoundaryCheck(briefs: CodingAgentBriefs): CodingAgentBriefReviewCheck {
  const missingExecutor = briefs.briefs.filter((brief) => !brief.sandbox.executorProfileId);
  const missingAllowedActions = briefs.briefs.filter((brief) => !brief.sandbox.allowedActions.length);
  const missingProhibitions = briefs.briefs.filter((brief) =>
    requiredProhibitedActions.some((action) => !brief.sandbox.prohibitedActions.includes(action))
  );
  const missingApproval = briefs.briefs.filter((brief) =>
    (brief.priority === "critical" || brief.status === "blocked" || brief.sandbox.executorProfileId === "human-approval") &&
    !brief.sandbox.requiresHumanApproval
  );
  const blockers = missingExecutor.length + missingAllowedActions.length + missingProhibitions.length + missingApproval.length;

  return check({
    id: "coding-brief-sandbox-boundary",
    label: "Sandbox boundary",
    status: blockers ? "block" : "pass",
    summary: blockers
      ? "Some briefs are missing executor identity, allowed actions, prohibited actions, or required human approval flags."
      : "Every brief names an executor boundary, allowed actions, prohibited actions, and human approval requirements.",
    evidence: [
      `Missing executor: ${missingExecutor.length}`,
      `Missing allowed actions: ${missingAllowedActions.length}`,
      `Missing prohibited actions: ${missingProhibitions.length}`,
      `Missing human approval: ${missingApproval.length}`,
      `Required prohibited actions: ${requiredProhibitedActions.join(", ")}`
    ],
    nextAction: blockers
      ? "Regenerate briefs with full sandbox restrictions before any agent receives them."
      : "Keep these boundaries visible when copying prompts to coding agents."
  });
}

function releaseGateTruthfulnessCheck(
  briefs: CodingAgentBriefs,
  releaseVerification: ReleaseVerificationReport | null,
  requireProductionEvidence: boolean
): CodingAgentBriefReviewCheck {
  const requiredByBrief = briefs.briefs.filter((brief) => brief.releaseGate.required).length;
  const releaseGatedWithoutDecision = briefs.briefs.filter((brief) =>
    brief.releaseGate.required && !brief.releaseGate.verificationDecision && !releaseVerification
  );
  const productionRequired = requireProductionEvidence || briefs.summary.productionEvidenceRequired;
  const productionBlocked =
    productionRequired &&
    (!releaseVerification || releaseVerification.decision !== "verified" || releaseVerification.scope !== "production");
  const dryRunTruthful = briefs.briefs.every((brief) =>
    !brief.releaseGate.productionEvidenceRequired || brief.releaseGate.nextAction.toLowerCase().includes("production")
  );

  return check({
    id: "coding-brief-release-gate-truthfulness",
    label: "Release gate truthfulness",
    status: productionBlocked ? "block" : releaseGatedWithoutDecision.length || !dryRunTruthful ? "warn" : "pass",
    summary: productionBlocked
      ? "Production evidence is required, but the attached release verification does not prove production readiness."
      : releaseGatedWithoutDecision.length
        ? "Some release-gated briefs do not carry an attached release verification decision."
        : "Brief release-gate language keeps dry-run and production evidence separate.",
    evidence: [
      `Release-gated briefs: ${requiredByBrief}`,
      `Release-gated without decision: ${releaseGatedWithoutDecision.length}`,
      `Production evidence required: ${productionRequired ? "yes" : "no"}`,
      `Attached verification: ${releaseVerification?.decision || "none"} / ${releaseVerification?.scope || "none"}`
    ],
    nextAction: productionBlocked
      ? "Attach verified production evidence before using these briefs for production handoff."
      : releaseGatedWithoutDecision.length || !dryRunTruthful
        ? "Attach release verification or make the dry-run limitation explicit before handoff."
        : "Use dry-run briefs honestly and require production verification before external release."
  });
}

function decisionFor(checks: CodingAgentBriefReviewCheck[]): CodingAgentBriefReviewDecision {
  if (checks.some((check) => check.status === "block")) return "blocked";
  if (checks.some((check) => check.status === "warn")) return "needs-review";
  return "ready";
}

function check(input: CodingAgentBriefReviewCheck): CodingAgentBriefReviewCheck {
  return input;
}

function hasCommand(brief: CodingAgentBrief, command: string) {
  return brief.verificationCommands.includes(command);
}

function sampleIds(briefs: CodingAgentBrief[]) {
  return briefs.slice(0, 3).map((brief) => `Brief: ${brief.id}`);
}
