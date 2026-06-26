import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReleaseVerificationReport } from "../src/domain/types";

interface ProductionBoundaryOptions {
  verificationPath: string;
  outputPath: string;
  expectedExitCode: number;
  generatedAt: string;
  help: boolean;
}

interface ProductionBoundarySummary {
  schema: "naikaku.production-boundary-drill.v1";
  generatedAt: string;
  command: string;
  expectedExitCode: number;
  observedExitCode: number;
  verificationPath: string;
  sourceRunId: string;
  decision: string;
  scope: string;
  requireProductionEvidence: boolean;
  failedChecks: string[];
  checks: {
    expectedExitCodeObserved: boolean;
    productionNotReady: boolean;
    dryRunEvidenceRejected: boolean;
  };
  honestyClaim: {
    level: "local-drill";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const command = `${npmCommand} run release:verify:production`;
  const observedExitCode = await runProductionVerification();
  const verification = await loadVerification(options.verificationPath);
  const summary = buildSummary({
    options,
    command,
    observedExitCode,
    verification
  });

  await writeJson(options.outputPath, summary);
  printSummary(summary, options.outputPath);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 2;
  }
}

function runProductionVerification() {
  return new Promise<number>((resolve) => {
    const child = spawn(npmCommand, ["run", "release:verify:production"], {
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      console.error(error instanceof Error ? error.message : error);
      resolve(1);
    });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function loadVerification(verificationPath: string): Promise<ReleaseVerificationReport> {
  const parsed = JSON.parse(await readFile(verificationPath, "utf8")) as ReleaseVerificationReport;
  if (parsed.schema !== "naikaku.release-verification.v1") {
    throw new Error("Production boundary verification must use schema naikaku.release-verification.v1.");
  }
  return parsed;
}

function buildSummary({
  options,
  command,
  observedExitCode,
  verification
}: {
  options: ProductionBoundaryOptions;
  command: string;
  observedExitCode: number;
  verification: ReleaseVerificationReport;
}): ProductionBoundarySummary {
  const productionCheck = verification.checks.find((check) => check.id === "production-evidence-required");
  const failedChecks = verification.checks.filter((check) => check.status === "fail").map((check) => check.id);
  const checks = {
    expectedExitCodeObserved: observedExitCode === options.expectedExitCode,
    productionNotReady: verification.decision === "not-production-ready" && verification.scope === "production",
    dryRunEvidenceRejected:
      verification.requireProductionEvidence &&
      productionCheck?.status === "fail" &&
      productionCheck.evidence.some((item) => item.includes("Evidence level: dry-run"))
  };

  return {
    schema: "naikaku.production-boundary-drill.v1",
    generatedAt: options.generatedAt,
    command,
    expectedExitCode: options.expectedExitCode,
    observedExitCode,
    verificationPath: options.verificationPath,
    sourceRunId: verification.sourceRunId,
    decision: verification.decision,
    scope: verification.scope,
    requireProductionEvidence: verification.requireProductionEvidence,
    failedChecks,
    checks,
    honestyClaim: {
      level: "local-drill",
      claim: "This drill proves the production verification command rejects dry-run evidence with the expected boundary exit code.",
      limitations: [
        "It reuses the latest local rehearsal report.",
        "It does not attach real production runner evidence.",
        "It is a negative gate, not a production readiness claim."
      ],
      productionRequirements: [
        "Attach authenticated production runner evidence.",
        "Rerun production-mode release verification and require exit code 0.",
        "Keep this negative boundary drill with the verification manifest until production evidence exists."
      ]
    }
  };
}

async function writeJson(outputPath: string, value: unknown) {
  const absolutePath = path.resolve(outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(args: string[]): ProductionBoundaryOptions {
  const options: ProductionBoundaryOptions = {
    verificationPath: "output/rehearsal-drill/release-verification-production-latest.json",
    outputPath: "output/verification/production-boundary-latest.json",
    expectedExitCode: 4,
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--verification") {
      options.verificationPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--out") {
      options.outputPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--expected-exit-code") {
      options.expectedExitCode = Number(requireValue(args, index, arg));
      index += 1;
      continue;
    }
    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printSummary(summary: ProductionBoundarySummary, outputPath: string) {
  console.log("Production boundary drill:", Object.values(summary.checks).every(Boolean) ? "passed" : "failed");
  console.log(`Observed exit: ${summary.observedExitCode}, expected: ${summary.expectedExitCode}`);
  console.log(`Decision: ${summary.decision} / scope: ${summary.scope}`);
  console.log(`Failed checks: ${summary.failedChecks.join(", ") || "none"}`);
  console.log(`Report: ${path.resolve(outputPath)}`);
}

function printHelp() {
  console.log(`Usage: npm run production:boundary -- [options]

Options:
  --verification <path>       Production verification JSON path.
  --out <path>                Output naikaku.production-boundary-drill.v1 summary.
  --expected-exit-code <code> Expected production verifier exit code. Default: 4.
  --generated-at <iso>        Stable generatedAt timestamp.
  -h, --help                  Show this help.

The drill succeeds only when production verification rejects dry-run evidence
with the expected boundary exit code.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown production boundary drill failure.");
  process.exitCode = 1;
});
