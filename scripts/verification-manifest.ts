import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReleaseVerificationReport } from "../src/domain/types";

interface VerificationManifestOptions {
  codingAgentReportPath: string;
  releaseVerificationPath: string;
  outputPath: string;
  generatedAt?: string;
  help: boolean;
}

interface CodingAgentReceiptDrillSummary {
  schema: "naikaku.coding-agent-receipt-drill.v1";
  generatedAt: string;
  operatorLocale: string;
  outputDir: string;
  source: {
    boardItems: number;
    briefs: number;
    reviewDecision: string;
    bundleDecision: string;
    readySessions: number;
    heldSessions: number;
  };
  valid: {
    receiptDecision: string;
    evidenceDecision: string;
    artifactAuditDecision: string;
    transcriptContentMismatches: number;
    boardItemsApplied: number;
    boardItemsSkipped: number;
  };
  mismatched: {
    receiptDecision: string;
    pendingEvidence: number;
    evidenceDecision: string;
    artifactAuditDecision: string;
    boardItemsApplied: number;
    boardItemsSkipped: number;
    firstMissingEvidence: string | null;
  };
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

interface VerificationManifestCheck {
  id: string;
  status: "pass" | "fail";
  summary: string;
  evidence: string[];
  nextAction: string;
}

interface VerificationManifest {
  schema: "naikaku.verification-manifest.v1";
  generatedAt: string;
  decision: "verified" | "invalid";
  inputs: {
    codingAgentReceiptDrill: string;
    releaseVerification: string;
  };
  source: {
    codingAgentGeneratedAt: string;
    releaseVerificationGeneratedAt: string;
    releaseRunId: string;
    releaseScope: string;
  };
  checks: VerificationManifestCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const codingAgentReport = await loadCodingAgentReport(options.codingAgentReportPath);
  const releaseVerification = await loadReleaseVerification(options.releaseVerificationPath);
  const manifest = buildManifest({
    codingAgentReport,
    releaseVerification,
    options
  });

  await writeManifest(manifest, options.outputPath);
  printSummary(manifest, options.outputPath);

  if (manifest.decision !== "verified") {
    process.exitCode = 2;
  }
}

function buildManifest({
  codingAgentReport,
  releaseVerification,
  options
}: {
  codingAgentReport: CodingAgentReceiptDrillSummary;
  releaseVerification: ReleaseVerificationReport;
  options: VerificationManifestOptions;
}): VerificationManifest {
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
    generatedAt: options.generatedAt || new Date().toISOString(),
    decision: failed === 0 ? "verified" : "invalid",
    inputs: {
      codingAgentReceiptDrill: options.codingAgentReportPath,
      releaseVerification: options.releaseVerificationPath
    },
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

async function loadCodingAgentReport(reportPath: string): Promise<CodingAgentReceiptDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentReceiptDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-receipt-drill.v1") {
    throw new Error("Coding-agent report must use schema naikaku.coding-agent-receipt-drill.v1.");
  }
  return parsed;
}

async function loadReleaseVerification(reportPath: string): Promise<ReleaseVerificationReport> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as ReleaseVerificationReport;
  if (parsed.schema !== "naikaku.release-verification.v1") {
    throw new Error("Release verification must use schema naikaku.release-verification.v1.");
  }
  return parsed;
}

async function writeManifest(manifest: VerificationManifest, outputPath: string) {
  const absolutePath = path.resolve(outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function printSummary(manifest: VerificationManifest, outputPath: string) {
  console.log(`Verification manifest: ${manifest.decision}`);
  console.log(`Checks: ${manifest.summary.passed} pass, ${manifest.summary.failed} fail`);
  console.log(`Report: ${path.resolve(outputPath)}`);
  console.log("");

  for (const check of manifest.checks) {
    console.log(`[${check.status}] ${check.id}: ${check.summary}`);
    console.log(`  Next: ${check.nextAction}`);
  }
}

function parseArgs(args: string[]): VerificationManifestOptions {
  const options: VerificationManifestOptions = {
    codingAgentReportPath: "output/coding-agent-receipt-drill/summary.json",
    releaseVerificationPath: "output/rehearsal-drill/release-verification-latest.json",
    outputPath: "output/verification/verification-manifest-latest.json",
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--coding-agent-report") {
      options.codingAgentReportPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--release-verification") {
      options.releaseVerificationPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.outputPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Naikaku verification manifest

Usage:
  npm run verification:manifest -- [options]

Options:
  --coding-agent-report <path>   Read coding-agent receipt drill summary.
  --release-verification <path>  Read release verification JSON.
  --out <path>                   Write naikaku.verification-manifest.v1 JSON.
  --generated-at <iso>           Use a stable timestamp.
  --help                         Show this help.

Exit codes:
  0  Both local verification gates are proven by the referenced reports.
  2  One or more manifest checks failed.
`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown verification manifest failure.");
  process.exitCode = 1;
});
