import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { serializeDevelopmentIssueDrafts, serializeDevelopmentIssueGhScript } from "../src/domain/developmentIssues";
import { buildProviderReadinessMatrix } from "../src/domain/providerReadiness";
import {
  buildReleaseRehearsalReport,
  serializeReleaseRehearsalReport,
  serializeReleaseRemediationMarkdown
} from "../src/domain/releaseRehearsal";
import { buildReleaseRemediationIssueDrafts } from "../src/domain/releaseRemediationIssues";
import { createDefaultWorkspace, parseWorkspaceExport } from "../src/domain/storage";
import type {
  AutomationApprovalRecord,
  AuditEvent,
  CabinetRun,
  CabinetWorkspace,
  DevelopmentWorkItem,
  MemoryEntry,
  ProviderReadinessMatrix,
  ReleaseRehearsalReport
} from "../src/domain/types";

interface RehearsalCliOptions {
  workspacePath?: string;
  runPath?: string;
  providerReadinessPath?: string;
  approvalsPath?: string;
  auditPath?: string;
  memoryPath?: string;
  savedItemsPath?: string;
  secretProbeValues: string[];
  generatedAt?: string;
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
  const run = await loadRun(options.runPath);
  const providerReadiness = await loadProviderReadiness(
    options.providerReadinessPath,
    workspace
  );
  const approvalRecords = await loadArrayFile<AutomationApprovalRecord>(
    options.approvalsPath,
    "approvalRecords"
  );
  const auditEvents = await loadArrayFile<AuditEvent>(
    options.auditPath,
    "events"
  );
  const memoryEntries = await loadArrayFile<MemoryEntry>(
    options.memoryPath,
    "entries"
  );
  const savedItems = await loadArrayFile<DevelopmentWorkItem>(
    options.savedItemsPath,
    "items"
  );
  const report = buildReleaseRehearsalReport({
    workspace,
    providerReadiness,
    run,
    approvalRecords,
    auditEvents,
    memoryEntries,
    savedItems,
    secretProbeValues: options.secretProbeValues,
    generatedAt: options.generatedAt
  });
  const output = options.noWrite
    ? null
    : await writeReports(report, options.outputDir);

  printSummary(report, output, options.strict, {
    run: Boolean(run),
    approvals: approvalRecords.length,
    audit: auditEvents.length,
    memory: memoryEntries.length,
    savedItems: savedItems.length,
    secretProbes: options.secretProbeValues.length
  });

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
    secretProbeValues: [],
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

    if (arg === "--run") {
      options.runPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--provider-readiness") {
      options.providerReadinessPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--approvals") {
      options.approvalsPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--audit") {
      options.auditPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--memory") {
      options.memoryPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--saved-items") {
      options.savedItemsPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--secret-probe") {
      options.secretProbeValues.push(requireValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
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

async function loadRun(runPath?: string): Promise<CabinetRun | null> {
  if (!runPath) {
    return null;
  }

  const raw = await readFile(runPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const run = isRecord(parsed) && "run" in parsed
    ? (parsed.run as CabinetRun)
    : (parsed as CabinetRun);

  if (!run?.id || !Array.isArray(run.artifacts) || !Array.isArray(run.logs)) {
    throw new Error("Run file must contain a CabinetRun or { run } envelope.");
  }

  return run;
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

async function loadArrayFile<T>(
  filePath: string | undefined,
  envelopeKey: string
): Promise<T[]> {
  if (!filePath) {
    return [];
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const value = isRecord(parsed) && envelopeKey in parsed
    ? parsed[envelopeKey]
    : parsed;

  if (!Array.isArray(value)) {
    throw new Error(`${filePath} must contain an array or { ${envelopeKey}: [...] } envelope.`);
  }

  return value as T[];
}

async function writeReports(report: ReleaseRehearsalReport, outputDir: string) {
  const absoluteDir = path.resolve(outputDir);
  const runSlug = report.runId.replace(/[^a-z0-9-]/gi, "-");
  const reportPath = path.join(absoluteDir, `release-rehearsal-${runSlug}.json`);
  const remediationPath = path.join(absoluteDir, `release-remediation-${runSlug}.md`);
  const issueDraftsPath = path.join(absoluteDir, `release-remediation-issues-${runSlug}.json`);
  const issueScriptPath = path.join(absoluteDir, `release-remediation-gh-issues-${runSlug}.sh`);
  const latestPath = path.join(absoluteDir, "release-rehearsal-latest.json");
  const latestRemediationPath = path.join(absoluteDir, "release-remediation-latest.md");
  const latestIssueDraftsPath = path.join(absoluteDir, "release-remediation-issues-latest.json");
  const latestIssueScriptPath = path.join(absoluteDir, "release-remediation-gh-issues-latest.sh");
  const serialized = serializeReleaseRehearsalReport(report);
  const remediation = serializeReleaseRemediationMarkdown(report);
  const issueDrafts = buildReleaseRemediationIssueDrafts({
    report,
    generatedAt: report.generatedAt
  });
  const serializedIssueDrafts = serializeDevelopmentIssueDrafts(issueDrafts);
  const issueScript = serializeDevelopmentIssueGhScript(issueDrafts);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(reportPath, serialized);
  await writeFile(remediationPath, remediation);
  await writeFile(issueDraftsPath, serializedIssueDrafts);
  await writeFile(issueScriptPath, issueScript, { mode: 0o755 });
  await writeFile(latestPath, serialized);
  await writeFile(latestRemediationPath, remediation);
  await writeFile(latestIssueDraftsPath, serializedIssueDrafts);
  await writeFile(latestIssueScriptPath, issueScript, { mode: 0o755 });

  return {
    reportPath,
    remediationPath,
    issueDraftsPath,
    issueScriptPath,
    issueDrafts: issueDrafts.summary.total
  };
}

function printSummary(
  report: ReleaseRehearsalReport,
  output: {
    reportPath: string;
    remediationPath: string;
    issueDraftsPath: string;
    issueScriptPath: string;
    issueDrafts: number;
  } | null,
  strict: boolean,
  inputs: {
    run: boolean;
    approvals: number;
    audit: number;
    memory: number;
    savedItems: number;
    secretProbes: number;
  }
) {
  console.log(`Release rehearsal: ${report.decision} (${report.score}/100)`);
  console.log(`Run: ${report.runId} / ${report.sourceRun}`);
  console.log(
    `Inputs: ${inputs.run ? "provided run" : "simulated run"}, ${inputs.approvals} approvals, ${inputs.audit} audit events, ${inputs.memory} memory entries, ${inputs.savedItems} saved items, ${inputs.secretProbes} secret probes`
  );
  console.log(
    `Checks: ${report.summary.passed} pass, ${report.summary.warnings} warn, ${report.summary.blockers} block`
  );
  console.log(
    `Artifacts: ${report.summary.releaseArtifacts} release, ${report.summary.evidenceItems} evidence, ${report.summary.readyActions} ready actions, ${report.summary.heldActions} held actions`
  );
  console.log(`Secret leak detected: ${report.summary.secretLeakDetected ? "yes" : "no"}`);

  if (output) {
    console.log(`Report: ${output.reportPath}`);
    console.log(`Remediation: ${output.remediationPath}`);
    console.log(`Issue drafts: ${output.issueDraftsPath} (${output.issueDrafts})`);
    console.log(`Issue script: ${output.issueScriptPath}`);
  } else {
    console.log("Report: not written (--no-write)");
  }

  console.log("");
  for (const check of report.checks) {
    console.log(`[${check.status}] ${check.label}: ${check.summary}`);
    console.log(`  Next: ${check.nextAction}`);
  }

  if (report.remediation.items.length) {
    console.log("");
    console.log("Remediation queue:");
    for (const item of report.remediation.items.slice(0, 5)) {
      console.log(`[${item.priority}] ${item.owner}: ${item.title}`);
      console.log(`  Verify: ${item.verificationCommand}`);
    }
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
  --run <path>                  Read a CabinetRun JSON file or { run } envelope instead of simulating one.
  --provider-readiness <path>   Read a provider readiness JSON export.
  --approvals <path>            Read approval records from an array or { approvalRecords } envelope.
  --audit <path>                Read audit events from an array or { events } envelope.
  --memory <path>               Read memory entries from an array or { entries } envelope.
  --saved-items <path>          Read saved development items from an array or { items } envelope.
  --secret-probe <value>        Assert this raw value does not appear in exported artifacts. Repeatable.
  --generated-at <iso>          Use a fixed generatedAt timestamp for deterministic reports.
  --out <dir>                   Write JSON, Markdown, issue drafts, and gh script to this directory. Default: output/rehearsal
  --strict                      Exit with code 3 when warnings remain.
  --no-write                    Print results without writing report files.
  --help                        Show this help.

Exit codes:
  0  No blockers, or report mode with warnings.
  2  One or more blockers detected.
  3  Strict mode detected warnings.
`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown rehearsal failure.");
  process.exitCode = 1;
});
