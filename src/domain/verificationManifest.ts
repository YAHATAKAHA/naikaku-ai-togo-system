import type {
  CodingAgentReceiptDrillSummary,
  ExecutorContractDrillSummary,
  ExecutorProfileId,
  LocalizationDrillSummary,
  ProductionBoundaryDrillSummary,
  ReleaseVerificationReport,
  VerificationManifest,
  VerificationManifestCheck
} from "./types";

const expectedLocales = ["ja", "en", "zh-Hans", "zh-Hant", "ko"];
const expectedExecutorProfiles: ExecutorProfileId[] = [
  "browser-sandbox",
  "desktop-vm",
  "shell-container",
  "mcp-proxy",
  "human-approval"
];

export interface BuildVerificationManifestInput {
  codingAgentReport: CodingAgentReceiptDrillSummary;
  localizationDrill: LocalizationDrillSummary;
  executorContractDrill: ExecutorContractDrillSummary;
  productionBoundaryDrill: ProductionBoundaryDrillSummary;
  releaseVerification: ReleaseVerificationReport;
  generatedAt?: string;
  inputs: {
    codingAgentReceiptDrill: string;
    localizationDrill: string;
    executorContractDrill: string;
    productionBoundaryDrill: string;
    releaseVerification: string;
  };
}

export function buildVerificationManifest({
  codingAgentReport,
  localizationDrill,
  executorContractDrill,
  productionBoundaryDrill,
  releaseVerification,
  generatedAt = new Date().toISOString(),
  inputs
}: BuildVerificationManifestInput): VerificationManifest {
  const checks = [
    codingAgentValidCheck(codingAgentReport),
    codingAgentMismatchCheck(codingAgentReport),
    localizationDrillCheck(localizationDrill),
    executorContractDrillCheck(executorContractDrill),
    releaseVerificationCheck(releaseVerification),
    dryRunBoundaryCheck(releaseVerification),
    productionBoundaryDrillCheck(productionBoundaryDrill)
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
      localizationGeneratedAt: localizationDrill.generatedAt,
      executorContractGeneratedAt: executorContractDrill.generatedAt,
      productionBoundaryGeneratedAt: productionBoundaryDrill.generatedAt,
      releaseVerificationGeneratedAt: releaseVerification.generatedAt,
      localizationLocales: localizationDrill.locales.map((locale) => locale.locale),
      executorProfiles: executorContractDrill.profiles.map((profile) => profile.profileId),
      productionBoundaryExitCode: productionBoundaryDrill.observedExitCode,
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
        "It is valid only with the referenced localization, executor, production boundary, receipt, and release verification source reports attached."
      ],
      productionRequirements: [
        "Attach authenticated production runner evidence before external handoff.",
        "Run production-mode release verification before claiming production readiness.",
        "Keep the referenced drill and release verification reports with this manifest."
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

function localizationDrillCheck(report: LocalizationDrillSummary): VerificationManifestCheck {
  const locales = report.locales.map((locale) => locale.locale);
  const checksPassed = report.locales.every((locale) =>
    Object.values(locale.checks).every(Boolean) && locale.failures.length === 0
  );
  const ok = report.schema === "naikaku.localization-drill.v1"
    && report.defaultLocale === "ja"
    && report.summary.failed === 0
    && report.summary.total === expectedLocales.length
    && expectedLocales.every((locale, index) => locales[index] === locale)
    && checksPassed;

  return {
    id: "localization-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Japanese-first localization drill preserved coding-agent handoff contracts in every supported locale."
      : "Localization drill did not prove every supported locale and machine contract.",
    evidence: [
      `Schema: ${report.schema}`,
      `Default locale: ${report.defaultLocale}`,
      `Locales: ${locales.join(", ")}`,
      `Passed: ${report.summary.passed}/${report.summary.total}`,
      `Failed: ${report.summary.failed}`,
      `Ready sessions: ${report.summary.readySessions}`,
      `Would assign: ${report.summary.wouldAssign}`,
      `Pending receipt items: ${report.summary.pendingReceiptItems}`,
      `Session contract stable: ${report.locales.every((locale) => Boolean(locale.checks.sessionContractStable)) ? "yes" : "no"}`
    ],
    nextAction: ok
      ? "Keep the localization drill summary attached to language release evidence."
      : "Rerun localization drill and fix locale order, prompt language instructions, or stable machine contracts."
  };
}

function executorContractDrillCheck(report: ExecutorContractDrillSummary): VerificationManifestCheck {
  const profiles = report.profiles.map((profile) => profile.profileId);
  const checksPassed = Object.values(report.checks).every(Boolean)
    && report.profiles.every((profile) => profile.failures.length === 0);
  const ok = report.schema === "naikaku.executor-contract-drill.v1"
    && report.mode === "dry-run"
    && report.summary.failed === 0
    && report.summary.profiles === expectedExecutorProfiles.length
    && expectedExecutorProfiles.every((profile) => profiles.includes(profile))
    && report.blockedAction.status === "blocked"
    && report.blockedAction.held
    && !report.blockedAction.executed
    && checksPassed;

  return {
    id: "executor-contract-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Executor contract drill covered every sandbox profile and kept blocked production actions held."
      : "Executor contract drill did not prove every profile or blocked-action boundary.",
    evidence: [
      `Schema: ${report.schema}`,
      `Mode: ${report.mode}`,
      `Profiles: ${profiles.join(", ")}`,
      `Passed: ${report.summary.passed}/${report.summary.profiles}`,
      `Failed: ${report.summary.failed}`,
      `Ready actions: ${report.summary.readyActions}`,
      `Held actions: ${report.summary.heldActions}`,
      `Evidence items: ${report.summary.evidenceItems}`,
      `Blocked action: ${report.blockedAction.action} / held=${report.blockedAction.held} / executed=${report.blockedAction.executed}`
    ],
    nextAction: ok
      ? "Keep the executor contract drill summary attached to runner handoff evidence."
      : "Rerun executor drill and restore scoped commands, replayable evidence, dry-run identity, or blocked-action handling."
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

function productionBoundaryDrillCheck(report: ProductionBoundaryDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.production-boundary-drill.v1"
    && report.expectedExitCode === 4
    && report.observedExitCode === 4
    && report.decision === "not-production-ready"
    && report.scope === "production"
    && report.requireProductionEvidence
    && report.failedChecks.includes("production-evidence-required")
    && checksPassed;

  return {
    id: "production-boundary-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Production boundary drill confirmed dry-run evidence is rejected with exit code 4."
      : "Production boundary drill did not prove dry-run evidence is blocked from production claims.",
    evidence: [
      `Schema: ${report.schema}`,
      `Command: ${report.command}`,
      `Expected exit: ${report.expectedExitCode}`,
      `Observed exit: ${report.observedExitCode}`,
      `Decision: ${report.decision}`,
      `Scope: ${report.scope}`,
      `Require production evidence: ${report.requireProductionEvidence ? "yes" : "no"}`,
      `Failed checks: ${report.failedChecks.join(", ") || "none"}`
    ],
    nextAction: ok
      ? "Keep this negative boundary drill attached until authenticated production evidence exists."
      : "Restore production verification so dry-run evidence returns not-production-ready with exit code 4."
  };
}
