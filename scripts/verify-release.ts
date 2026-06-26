import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildReleaseVerification,
  serializeReleaseVerification
} from "../src/domain/releaseVerification";
import type {
  ReleaseRehearsalReport,
  ReleaseVerificationReport
} from "../src/domain/types";

interface VerifyReleaseOptions {
  reportPath: string;
  outputPath?: string;
  requireProductionEvidence: boolean;
  generatedAt?: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const report = await loadRehearsalReport(options.reportPath);
  const verification = buildReleaseVerification({
    report,
    requireProductionEvidence: options.requireProductionEvidence,
    generatedAt: options.generatedAt
  });

  if (options.outputPath) {
    await writeVerification(verification, options.outputPath);
  }

  printSummary(verification, options.outputPath);

  if (verification.decision === "invalid") {
    process.exitCode = 2;
    return;
  }

  if (verification.decision === "not-production-ready") {
    process.exitCode = 4;
  }
}

function parseArgs(args: string[]): VerifyReleaseOptions {
  const options: VerifyReleaseOptions = {
    reportPath: "output/rehearsal-drill/release-rehearsal-latest.json",
    requireProductionEvidence: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--report") {
      options.reportPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.outputPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--require-production") {
      options.requireProductionEvidence = true;
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

async function loadRehearsalReport(reportPath: string): Promise<ReleaseRehearsalReport> {
  const raw = await readFile(reportPath, "utf8");
  const parsed = JSON.parse(raw) as ReleaseRehearsalReport;

  if (parsed.schema !== "naikaku.release-rehearsal.v1") {
    throw new Error("Report must use schema naikaku.release-rehearsal.v1.");
  }

  return parsed;
}

async function writeVerification(
  verification: ReleaseVerificationReport,
  outputPath: string
) {
  const absolutePath = path.resolve(outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, serializeReleaseVerification(verification));
}

function printSummary(
  verification: ReleaseVerificationReport,
  outputPath?: string
) {
  console.log(`Release verification: ${verification.decision}`);
  console.log(`Run: ${verification.sourceRunId}`);
  console.log(
    `Scope: ${verification.scope}${verification.requireProductionEvidence ? " / production required" : ""}`
  );
  console.log(`Checks: ${verification.summary.passed} pass, ${verification.summary.failed} fail`);

  if (outputPath) {
    console.log(`Report: ${path.resolve(outputPath)}`);
  }

  console.log("");
  for (const check of verification.checks) {
    console.log(`[${check.status}] ${check.id}: ${check.summary}`);
    console.log(`  Next: ${check.nextAction}`);
  }

  if (verification.decision === "not-production-ready") {
    console.log("");
    console.log("Exit: production evidence is required; returning code 4.");
  }

  if (verification.decision === "invalid") {
    console.log("");
    console.log("Exit: release verification failed; returning code 2.");
  }
}

function requireValue(args: string[], index: number, label: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${label} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Naikaku release verification

Usage:
  npm run release:verify -- [options]

Options:
  --report <path>           Read a release rehearsal report. Default: output/rehearsal-drill/release-rehearsal-latest.json
  --out <path>              Write a naikaku.release-verification.v1 JSON report.
  --require-production      Fail unless the evidence claim level is production.
  --generated-at <iso>      Use a fixed generatedAt timestamp for deterministic verification.
  --help                    Show this help.

Exit codes:
  0  Verification passed for the requested scope.
  2  Report is invalid, has warnings/blockers, or leaked secrets.
  4  Report is internally valid but not production-ready.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown release verification failure.");
  process.exitCode = 1;
});
