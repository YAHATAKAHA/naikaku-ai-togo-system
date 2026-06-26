import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildVerificationManifest,
  serializeVerificationManifest
} from "../src/domain/verificationManifest";
import type {
  CodingAgentReceiptDrillSummary,
  ReleaseVerificationReport,
  VerificationManifest
} from "../src/domain/types";

interface VerificationManifestOptions {
  codingAgentReportPath: string;
  releaseVerificationPath: string;
  outputPath: string;
  generatedAt?: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const codingAgentReport = await loadCodingAgentReport(options.codingAgentReportPath);
  const releaseVerification = await loadReleaseVerification(options.releaseVerificationPath);
  const manifest = buildVerificationManifest({
    codingAgentReport,
    releaseVerification,
    generatedAt: options.generatedAt,
    inputs: {
      codingAgentReceiptDrill: options.codingAgentReportPath,
      releaseVerification: options.releaseVerificationPath
    }
  });

  await writeManifest(manifest, options.outputPath);
  printSummary(manifest, options.outputPath);

  if (manifest.decision !== "verified") {
    process.exitCode = 2;
  }
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
  await writeFile(absolutePath, `${serializeVerificationManifest(manifest)}\n`, "utf8");
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
