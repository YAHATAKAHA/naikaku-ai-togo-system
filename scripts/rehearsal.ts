import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildProviderReadinessMatrix } from "../src/domain/providerReadiness";
import { buildReleaseRehearsalReport, serializeReleaseRehearsalReport } from "../src/domain/releaseRehearsal";
import { createDefaultWorkspace, parseWorkspaceExport } from "../src/domain/storage";
import type { CabinetWorkspace, ProviderReadinessMatrix, ReleaseRehearsalReport } from "../src/domain/types";

interface RehearsalCliOptions {
  workspacePath?: string;
  providerReadinessPath?: string;
  outputDir: string;
  strict: boolean;
  noWrite: boolean;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const workspace = await loadWorkspace(options.workspacePath);
  const providerReadiness = await loadProviderReadiness(
    options.providerReadinessPath,
    workspace
  );
  const report = buildReleaseRehearsalReport({
    workspace,
    providerReadiness
  });
  const outputPath = options.noWrite
    ? null
    : await writeReport(report, options.outputDir);

  printSummary(report, outputPath, options.strict);

  if (report.summary.blockers > 0) {
    process.exitCode = 2;
    return;
  }

  if (options.strict && report.summary.warnings > 0) {
    process.exitCode = 3;
  }
}

function parseArgs(args: string[]): RehearsalCliOptions {
  const options: RehearsalCliOptions = {
    outputDir: "output/rehearsal",
    strict: false,
    noWrite: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg === "--no-write") {
      options.noWrite = true;
      continue;
    }

    if (arg === "--workspace") {
      options.workspacePath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--provider-readiness") {
      options.providerReadinessPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

async function loadWorkspace(workspacePath?: string): Promise<CabinetWorkspace> {
  if (!workspacePath) {
    return createDefaultWorkspace();
  }

  const raw = await readFile(workspacePath, "utf8");
  return parseWorkspaceExport(raw);
}

async function loadProviderReadiness(
  providerReadinessPath: string | undefined,
  workspace: CabinetWorkspace
): Promise<ProviderReadinessMatrix> {
  if (!providerReadinessPath) {
    return buildProviderReadinessMatrix({ roles: workspace.roles });
  }

  const raw = await readFile(providerReadinessPath, "utf8");
  const parsed = JSON.parse(raw) as ProviderReadinessMatrix;

  if (parsed.schema !== "naikaku.provider-readiness.v1") {
    throw new Error("Provider readiness file must use schema naikaku.provider-readiness.v1.");
  }

  return parsed;
}

async function writeReport(report: ReleaseRehearsalReport, outputDir: string) {
  const absoluteDir = path.resolve(outputDir);
  const runSlug = report.runId.replace(/[^a-z0-9-]/gi, "-");
  const reportPath = path.join(absoluteDir, `release-rehearsal-${runSlug}.json`);
  const latestPath = path.join(absoluteDir, "release-rehearsal-latest.json");
  const serialized = serializeReleaseRehearsalReport(report);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(reportPath, serialized);
  await writeFile(latestPath, serialized);

  return reportPath;
}

function printSummary(
  report: ReleaseRehearsalReport,
  outputPath: string | null,
  strict: boolean
) {
  console.log(`Release rehearsal: ${report.decision} (${report.score}/100)`);
  console.log(`Run: ${report.runId} / ${report.sourceRun}`);
  console.log(
    `Checks: ${report.summary.passed} pass, ${report.summary.warnings} warn, ${report.summary.blockers} block`
  );
  console.log(
    `Artifacts: ${report.summary.releaseArtifacts} release, ${report.summary.evidenceItems} evidence, ${report.summary.readyActions} ready actions, ${report.summary.heldActions} held actions`
  );
  console.log(`Secret leak detected: ${report.summary.secretLeakDetected ? "yes" : "no"}`);

  if (outputPath) {
    console.log(`Report: ${outputPath}`);
  } else {
    console.log("Report: not written (--no-write)");
  }

  console.log("");
  for (const check of report.checks) {
    console.log(`[${check.status}] ${check.label}: ${check.summary}`);
    console.log(`  Next: ${check.nextAction}`);
  }

  if (report.summary.blockers > 0) {
    console.log("");
    console.log("Exit: blockers detected; returning code 2.");
    return;
  }

  if (strict && report.summary.warnings > 0) {
    console.log("");
    console.log("Exit: strict mode treats warnings as failures; returning code 3.");
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
  console.log(`Naikaku release rehearsal

Usage:
  npm run rehearsal -- [options]

Options:
  --workspace <path>            Read a workspace JSON export instead of the default workspace.
  --provider-readiness <path>   Read a provider readiness JSON export.
  --out <dir>                   Write reports to this directory. Default: output/rehearsal
  --strict                      Exit with code 3 when warnings remain.
  --no-write                    Print results without writing report files.
  --help                        Show this help.

Exit codes:
  0  No blockers, or report mode with warnings.
  2  One or more blockers detected.
  3  Strict mode detected warnings.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown rehearsal failure.");
  process.exitCode = 1;
});
