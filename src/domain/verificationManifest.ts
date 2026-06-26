import type {
  CodingAgentReceiptDrillSummary,
  ReleaseVerificationReport,
  VerificationManifest,
  VerificationManifestCheck
} from "./types";

export interface BuildVerificationManifestInput {
  codingAgentReport: CodingAgentReceiptDrillSummary;
  releaseVerification: ReleaseVerificationReport;
  generatedAt?: string;
  inputs: {
    codingAgentReceiptDrill: string;
    releaseVerification: string;
  };
}

export function buildVerificationManifest({
  codingAgentReport,
  releaseVerification,
  generatedAt = new Date().toISOString(),
  inputs
}: BuildVerificationManifestInput): VerificationManifest {
  const checks = [
    codingAgentValidCheck(codingAgentReport),
    codingAgentMismatchCheck(codingAgentReport),
    releaseVerificationCheck(releaseVerification),
    dryRunBoundaryCheck(releaseVerification)
  ];
  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.length - passed;

  return {
    schema: "naikaku.verification-manifest.v1",
    generatedAt,
    decision: failed === 0 ? "verified" : "invalid",
    inputs,
    source: {
      codingAgentGeneratedAt: codingAgentReport.generatedAt,
      releaseVerificationGeneratedAt: releaseVerification.generatedAt,
      releaseRunId: releaseVerification.sourceRunId,
      releaseScope: releaseVerification.scope
    },
    checks,
    summary: {
      total: checks.length,
      passed,
      failed
    },
    honestyClaim: {
      claim: "This manifest aggregates local verification gates without replacing the original evidence reports.",
      limitations: [
        "It reads existing local drill outputs and release verification output; it does not rerun commands itself.",
        "It does not prove production runner, provider, browser, deploy target, external service, or Git remote execution.",
        "It is valid only with the referenced source reports attached."
      ],
      productionRequirements: [
        "Attach authenticated production runner evidence before external handoff.",
        "Run production-mode release verification before claiming production readiness.",
        "Keep the referenced receipt drill and release verification reports with this manifest."
      ]
    }
  };
}

export function serializeVerificationManifest(manifest: VerificationManifest) {
  return JSON.stringify(manifest, null, 2);
}

function codingAgentValidCheck(report: CodingAgentReceiptDrillSummary): VerificationManifestCheck {
  const ok = report.valid.receiptDecision === "verified"
    && report.valid.evidenceDecision === "accepted-for-handoff"
    && report.valid.artifactAuditDecision === "verified"
    && report.valid.transcriptContentMismatches === 0
    && report.valid.boardItemsApplied === report.source.boardItems
    && report.valid.boardItemsSkipped === 0;

  return {
    id: "coding-agent-valid-receipt",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Valid coding-agent receipt verified and applied every Development Board item."
      : "Valid coding-agent receipt did not fully verify or reconcile.",
    evidence: [
      `Receipt: ${report.valid.receiptDecision}`,
      `Implementation evidence: ${report.valid.evidenceDecision}`,
      `Artifact audit: ${report.valid.artifactAuditDecision}`,
      `Transcript mismatches: ${report.valid.transcriptContentMismatches}`,
      `Board applied: ${report.valid.boardItemsApplied}/${report.source.boardItems}`,
      `Board skipped: ${report.valid.boardItemsSkipped}`
    ],
    nextAction: ok
      ? "Keep the valid receipt drill summary attached to release evidence."
      : "Fix the coding-agent receipt, evidence, artifact audit, or reconciliation gate before release verification."
  };
}

function codingAgentMismatchCheck(report: CodingAgentReceiptDrillSummary): VerificationManifestCheck {
  const missingEvidence = report.mismatched.firstMissingEvidence || "";
  const ok = report.mismatched.receiptDecision === "needs-evidence"
    && report.mismatched.pendingEvidence > 0
    && report.mismatched.evidenceDecision === "needs-evidence"
    && report.mismatched.artifactAuditDecision === "needs-artifacts"
    && report.mismatched.boardItemsApplied === 0
    && missingEvidence.includes("Evidence artifact is required for:");

  return {
    id: "coding-agent-mismatched-receipt",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Mismatched coding-agent evidence stayed blocked and did not update the Development Board."
      : "Mismatched coding-agent evidence was not blocked correctly.",
    evidence: [
      `Receipt: ${report.mismatched.receiptDecision}`,
      `Pending evidence: ${report.mismatched.pendingEvidence}`,
      `Implementation evidence: ${report.mismatched.evidenceDecision}`,
      `Artifact audit: ${report.mismatched.artifactAuditDecision}`,
      `Board applied: ${report.mismatched.boardItemsApplied}`,
      `First missing: ${report.mismatched.firstMissingEvidence || "none"}`
    ],
    nextAction: ok
      ? "Keep this anti-fake drill in the release verification path."
      : "Restore evidence coverage checks so unrelated artifacts cannot satisfy receipt requirements."
  };
}

function releaseVerificationCheck(report: ReleaseVerificationReport): VerificationManifestCheck {
  const ok = report.schema === "naikaku.release-verification.v1"
    && report.decision === "verified"
    && report.summary.failed === 0;

  return {
    id: "release-verification",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Release verification passed for the requested dry-run scope."
      : "Release verification did not pass.",
    evidence: [
      `Schema: ${report.schema}`,
      `Decision: ${report.decision}`,
      `Scope: ${report.scope}`,
      `Passed: ${report.summary.passed}`,
      `Failed: ${report.summary.failed}`
    ],
    nextAction: ok
      ? "Attach the release verification report to operator handoff evidence."
      : "Review failed release verification checks before handoff."
  };
}

function dryRunBoundaryCheck(report: ReleaseVerificationReport): VerificationManifestCheck {
  const productionCheck = report.checks.find((check) => check.id === "production-evidence-required");
  const ok = report.scope === "dry-run"
    && !report.requireProductionEvidence
    && productionCheck?.status === "pass"
    && productionCheck.evidence.some((item) => item.includes("Required production evidence: no"));

  return {
    id: "dry-run-boundary",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Verification manifest preserves the dry-run versus production evidence boundary."
      : "Dry-run versus production evidence boundary is unclear.",
    evidence: [
      `Scope: ${report.scope}`,
      `Require production evidence: ${report.requireProductionEvidence ? "yes" : "no"}`,
      `Production check: ${productionCheck?.status || "missing"}`
    ],
    nextAction: ok
      ? "Use production verification before claiming external production readiness."
      : "Regenerate release verification with explicit production-evidence requirements."
  };
}
