import type {
  ReleaseRehearsalReport,
  ReleaseVerificationCheck,
  ReleaseVerificationDecision,
  ReleaseVerificationReport
} from "./types";

export interface BuildReleaseVerificationInput {
  report: ReleaseRehearsalReport;
  requireProductionEvidence?: boolean;
  generatedAt?: string;
}

export function buildReleaseVerification({
  report,
  requireProductionEvidence = false,
  generatedAt = new Date().toISOString()
}: BuildReleaseVerificationInput): ReleaseVerificationReport {
  const checks = [
    schemaCheck(report),
    rehearsalGateCheck(report),
    secretRedactionCheck(report),
    evidenceClaimCheck(report),
    productionEvidenceCheck(report, requireProductionEvidence)
  ];
  const summary = {
    total: checks.length,
    passed: checks.filter((check) => check.status === "pass").length,
    failed: checks.filter((check) => check.status === "fail").length
  };

  return {
    schema: "naikaku.release-verification.v1",
    generatedAt,
    sourceRunId: report.runId,
    scope: requireProductionEvidence ? "production" : report.evidenceClaim.level,
    requireProductionEvidence,
    decision: verificationDecision(checks, requireProductionEvidence),
    checks,
    summary
  };
}

export function serializeReleaseVerification(report: ReleaseVerificationReport) {
  return JSON.stringify(report, null, 2);
}

function schemaCheck(report: ReleaseRehearsalReport): ReleaseVerificationCheck {
  const ok = report.schema === "naikaku.release-rehearsal.v1" && Boolean(report.runId);

  return check({
    id: "rehearsal-schema",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Release rehearsal report uses the expected schema."
      : "Release rehearsal report is missing the expected schema or run id.",
    evidence: [
      `Schema: ${report.schema}`,
      `Run: ${report.runId || "missing"}`
    ],
    nextAction: ok
      ? "Use this report as the verification source."
      : "Regenerate the rehearsal report before verification."
  });
}

function rehearsalGateCheck(report: ReleaseRehearsalReport): ReleaseVerificationCheck {
  const ok = report.decision === "release-ready" && report.summary.warnings === 0 && report.summary.blockers === 0;

  return check({
    id: "rehearsal-gates-clear",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Release rehearsal gates are clear."
      : "Release rehearsal still has warnings, blockers, or a non-ready decision.",
    evidence: [
      `Decision: ${report.decision}`,
      `Warnings: ${report.summary.warnings}`,
      `Blockers: ${report.summary.blockers}`,
      `Score: ${report.score}/100`
    ],
    nextAction: ok
      ? "Keep the report attached to handoff evidence."
      : "Resolve remediation items and rerun strict rehearsal."
  });
}

function secretRedactionCheck(report: ReleaseRehearsalReport): ReleaseVerificationCheck {
  const ok = !report.summary.secretLeakDetected;

  return check({
    id: "secret-redaction",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Release rehearsal did not detect secret leakage."
      : "Release rehearsal detected a secret-like value.",
    evidence: [
      `Secret leak detected: ${report.summary.secretLeakDetected ? "yes" : "no"}`
    ],
    nextAction: ok
      ? "Keep raw provider and runner secrets outside exported artifacts."
      : "Stop release and remove raw secrets from exported artifacts."
  });
}

function evidenceClaimCheck(report: ReleaseRehearsalReport): ReleaseVerificationCheck {
  const claim = report.evidenceClaim;
  const ok = Boolean(claim?.level && claim.claim && claim.limitations.length && claim.productionRequirements.length);

  return check({
    id: "evidence-claim-present",
    status: ok ? "pass" : "fail",
    summary: ok
      ? `Evidence claim is explicit at ${claim.level} scope.`
      : "Evidence claim is incomplete.",
    evidence: [
      `Level: ${claim?.level || "missing"}`,
      `Limitations: ${claim?.limitations.length || 0}`,
      `Production requirements: ${claim?.productionRequirements.length || 0}`
    ],
    nextAction: ok
      ? "Review the claim before using the report outside the sandbox drill."
      : "Regenerate rehearsal with an explicit evidence claim."
  });
}

function productionEvidenceCheck(
  report: ReleaseRehearsalReport,
  requireProductionEvidence: boolean
): ReleaseVerificationCheck {
  const production = report.evidenceClaim.level === "production";
  const ok = !requireProductionEvidence || production;

  return check({
    id: "production-evidence-required",
    status: ok ? "pass" : "fail",
    summary: production
      ? "Production evidence is present."
      : requireProductionEvidence
        ? "Production evidence was required, but the report only proves dry-run scope."
        : "Dry-run evidence is accepted for sandbox drill verification only.",
    evidence: [
      `Required production evidence: ${requireProductionEvidence ? "yes" : "no"}`,
      `Evidence level: ${report.evidenceClaim.level}`,
      `Claim: ${report.evidenceClaim.claim}`
    ],
    nextAction: production
      ? "Proceed only after operator review of production artifacts."
      : requireProductionEvidence
        ? "Attach authenticated runner evidence before production handoff."
        : "Use --require-production before any real release or external handoff."
  });
}

function verificationDecision(
  checks: ReleaseVerificationCheck[],
  requireProductionEvidence: boolean
): ReleaseVerificationDecision {
  const failures = checks.filter((check) => check.status === "fail");
  if (!failures.length) return "verified";

  const onlyProductionEvidenceFailed =
    requireProductionEvidence &&
    failures.length === 1 &&
    failures[0]?.id === "production-evidence-required";

  return onlyProductionEvidenceFailed ? "not-production-ready" : "invalid";
}

function check(input: ReleaseVerificationCheck): ReleaseVerificationCheck {
  return input;
}
