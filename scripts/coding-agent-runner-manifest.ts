import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodingAgentRunnerManifest,
  serializeCodingAgentRunnerManifestMarkdown
} from "../src/domain/codingAgentRunnerManifest";
import type {
  CodingAgentDispatchSimulation,
  CodingAgentRunnerManifest,
  CodingAgentRunnerManifestDrillSummary
} from "../src/domain/types";

interface RunnerManifestOptions {
  simulationDir: string;
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

interface RunnerManifestCase {
  manifest: CodingAgentRunnerManifest;
  receiptDraftFilesRead: number;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const simulationDir = path.resolve(options.simulationDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const valid = await runCase({
    name: "valid",
    simulationDir,
    outputDir,
    generatedAt: options.generatedAt
  });
  const productionHeld = await runCase({
    name: "production-held",
    simulationDir,
    outputDir,
    generatedAt: options.generatedAt
  });

  const summary: CodingAgentRunnerManifestDrillSummary = {
    schema: "naikaku.coding-agent-runner-manifest-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: valid.manifest.operatorLocale,
    source: {
      simulationDecision: valid.manifest.simulationDecision,
      readyForAgent: valid.manifest.summary.total - valid.manifest.summary.heldTasks - valid.manifest.summary.blockedTasks,
      held: valid.manifest.summary.heldTasks,
      blocked: valid.manifest.summary.blockedTasks,
      receiptDraftFilesWritten: valid.receiptDraftFilesRead
    },
    valid: runnerSummary(valid.manifest),
    productionHeld: {
      decision: productionHeld.manifest.decision,
      readyTasks: productionHeld.manifest.summary.readyTasks,
      heldTasks: productionHeld.manifest.summary.heldTasks,
      blockedTasks: productionHeld.manifest.summary.blockedTasks,
      runnerTasks: productionHeld.manifest.summary.runnerTasks,
      receiptDraftPaths: productionHeld.manifest.summary.receiptDraftPaths,
      unsafePaths: productionHeld.manifest.summary.unsafePaths
    },
    checks: checksFor(valid, productionHeld),
    honestyClaim: {
      level: "runner-handoff-planning",
      claim: "This drill converts dispatch simulation artifacts into runner-facing coding-agent task manifests without executing implementation work.",
      limitations: [
        "It reads local simulation reports and pending receipt draft files only.",
        "It does not run shell commands, browsers, desktops, MCP tools, external coding agents, providers, deploy targets, or Git remotes.",
        "Runner-ready tasks still require completed receipts, transcripts, evidence artifacts, and artifact audits before work can be accepted."
      ],
      productionRequirements: [
        "Run the manifest tasks only inside governed sandbox executor profiles or equivalent isolated coding workspaces.",
        "Replace pending receipt drafts with real completed receipts after execution.",
        "Run release verification and production boundary checks before external handoff."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

async function runCase({
  name,
  simulationDir,
  outputDir,
  generatedAt
}: {
  name: string;
  simulationDir: string;
  outputDir: string;
  generatedAt: string;
}): Promise<RunnerManifestCase> {
  const simulation = await loadSimulation(path.join(simulationDir, name, "dispatch-simulation.json"));
  const receiptDraftPaths = await loadReceiptDraftPaths(path.join(simulationDir, name, "receipt-drafts"));
  const manifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths,
    generatedAt
  });
  const caseDir = path.join(outputDir, name);

  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "runner-manifest.json"), manifest);
  await writeFile(
    path.join(caseDir, "runner-manifest.md"),
    serializeCodingAgentRunnerManifestMarkdown(manifest),
    "utf8"
  );

  return {
    manifest,
    receiptDraftFilesRead: Object.keys(receiptDraftPaths).length
  };
}

async function loadSimulation(filePath: string): Promise<CodingAgentDispatchSimulation> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as CodingAgentDispatchSimulation;
  if (parsed.schema !== "naikaku.coding-agent-dispatch-simulation.v1") {
    throw new Error(`Dispatch simulation must use schema naikaku.coding-agent-dispatch-simulation.v1: ${filePath}`);
  }
  return parsed;
}

async function loadReceiptDraftPaths(draftDir: string) {
  const entries = await readdir(draftDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const draftPaths: Record<string, string> = {};

  for (const entry of entries.filter((item) => item.endsWith(".json")).sort()) {
    const filePath = path.join(draftDir, entry);
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as { sessionId?: string };
    if (!parsed.sessionId) {
      throw new Error(`Receipt draft is missing sessionId: ${filePath}`);
    }
    draftPaths[parsed.sessionId] = relativePath(filePath);
  }

  return draftPaths;
}

function runnerSummary(manifest: CodingAgentRunnerManifest): CodingAgentRunnerManifestDrillSummary["valid"] {
  return {
    decision: manifest.decision,
    readyTasks: manifest.summary.readyTasks,
    heldTasks: manifest.summary.heldTasks,
    blockedTasks: manifest.summary.blockedTasks,
    runnerTasks: manifest.summary.runnerTasks,
    plannedCommands: manifest.summary.plannedCommands,
    expectedEvidenceArtifacts: manifest.summary.expectedEvidenceArtifacts,
    receiptDraftPaths: manifest.summary.receiptDraftPaths,
    unsafePaths: manifest.summary.unsafePaths,
    stopConditions: manifest.summary.stopConditions
  };
}

function checksFor(valid: RunnerManifestCase, productionHeld: RunnerManifestCase) {
  return {
    validRunnerReady:
      valid.manifest.decision === "runner-ready" &&
      valid.manifest.summary.readyTasks > 0 &&
      valid.manifest.summary.runnerTasks === valid.manifest.summary.readyTasks,
    receiptDraftPathsAttached:
      valid.manifest.summary.receiptDraftPaths === valid.manifest.summary.readyTasks &&
      valid.receiptDraftFilesRead === valid.manifest.summary.readyTasks,
    pendingCommandsOnly:
      valid.manifest.items.every((item) =>
        item.status !== "ready-for-runner" ||
        item.commands.every((command) => command.status === "pending-real-execution" && command.exitCode === null)
      ),
    stopConditionsAttached:
      valid.manifest.items.every((item) =>
        item.status !== "ready-for-runner" ||
        item.stopConditions.some((condition) => condition.includes("production deploy"))
      ),
    safePaths: valid.manifest.summary.unsafePaths === 0 && productionHeld.manifest.summary.unsafePaths === 0,
    noExecutionClaim:
      valid.manifest.honestyClaim.limitations.some((limitation) => limitation.includes("does not run shell commands")) &&
      valid.manifest.items.every((item) => item.commands.every((command) => command.exitCode === null)),
    productionHeldNotQueued:
      productionHeld.manifest.decision === "needs-review" &&
      productionHeld.manifest.summary.readyTasks === 0 &&
      productionHeld.manifest.summary.runnerTasks === 0,
    productionHeldNoReceiptDraftPaths:
      productionHeld.manifest.summary.receiptDraftPaths === 0 &&
      productionHeld.receiptDraftFilesRead === 0
  };
}

function summaryMarkdown(summary: CodingAgentRunnerManifestDrillSummary) {
  return [
    "# Coding Agent Runner Manifest Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Runner Manifest",
    "",
    `- Decision: ${summary.valid.decision}`,
    `- Ready tasks: ${summary.valid.readyTasks}`,
    `- Runner tasks: ${summary.valid.runnerTasks}`,
    `- Planned commands: ${summary.valid.plannedCommands}`,
    `- Expected evidence artifacts: ${summary.valid.expectedEvidenceArtifacts}`,
    `- Receipt draft paths: ${summary.valid.receiptDraftPaths}`,
    `- Stop conditions: ${summary.valid.stopConditions}`,
    `- Unsafe paths: ${summary.valid.unsafePaths}`,
    "",
    "## Production-Held Runner Manifest",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Ready tasks: ${summary.productionHeld.readyTasks}`,
    `- Runner tasks: ${summary.productionHeld.runnerTasks}`,
    `- Receipt draft paths: ${summary.productionHeld.receiptDraftPaths}`,
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function parseArgs(args: string[]): RunnerManifestOptions {
  const options: RunnerManifestOptions = {
    simulationDir: "output/coding-agent-dispatch-simulation",
    outputDir: "output/coding-agent-runner-manifest",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--simulation-dir") {
      options.simulationDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
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

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function printHelp() {
  console.log(`Naikaku coding-agent runner manifest

Usage:
  npm run coding-agent:runner-manifest -- [options]

Options:
  --simulation-dir <dir> Read dispatch simulation artifacts. Default: output/coding-agent-dispatch-simulation
  --out <dir>            Output directory. Default: output/coding-agent-runner-manifest
  --generated-at <iso>   Stable timestamp for generated artifacts.
  -h, --help             Show this help.

The drill turns pending dispatch simulation receipt drafts into runner-facing
task manifests. It does not execute any coding-agent work.`);
}

function printSummary(summary: CodingAgentRunnerManifestDrillSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Coding agent runner manifest: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.valid.decision}, ready ${summary.valid.readyTasks}, ` +
    `runner tasks ${summary.valid.runnerTasks}, receipt draft paths ${summary.valid.receiptDraftPaths}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.decision}, ready ${summary.productionHeld.readyTasks}, ` +
    `runner tasks ${summary.productionHeld.runnerTasks}, receipt draft paths ${summary.productionHeld.receiptDraftPaths}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent runner manifest failure.");
  process.exitCode = 1;
});
