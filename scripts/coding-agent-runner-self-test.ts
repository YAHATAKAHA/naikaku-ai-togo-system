import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodingAgentRunnerSelfTest,
  serializeCodingAgentRunnerSelfTestMarkdown
} from "../src/domain/codingAgentRunnerSelfTest";
import type {
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestDrillSummary
} from "../src/domain/types";

interface RunnerSelfTestOptions {
  manifestDir: string;
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const manifestDir = path.resolve(options.manifestDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const valid = await runCase({
    name: "valid",
    manifestDir,
    outputDir,
    generatedAt: options.generatedAt
  });
  const productionHeld = await runCase({
    name: "production-held",
    manifestDir,
    outputDir,
    generatedAt: options.generatedAt
  });

  const summary: CodingAgentRunnerSelfTestDrillSummary = {
    schema: "naikaku.coding-agent-runner-self-test-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: valid.operatorLocale,
    source: {
      runnerManifestDecision: valid.sourceDecision,
      readyTasks: valid.summary.readyRunnerTasks,
      runnerTasks: valid.summary.readyRunnerTasks,
      receiptDraftPaths: valid.summary.receiptDraftPaths
    },
    valid: selfTestSummary(valid),
    productionHeld: {
      decision: productionHeld.decision,
      wouldRun: productionHeld.summary.wouldRun,
      held: productionHeld.summary.held,
      blocked: productionHeld.summary.blocked,
      notExecutedCommands: productionHeld.summary.notExecutedCommands,
      receiptDraftPaths: productionHeld.summary.receiptDraftPaths,
      unsafePaths: productionHeld.summary.unsafePaths
    },
    checks: checksFor(valid, productionHeld),
    honestyClaim: {
      level: "local-runner-self-test",
      claim: "This drill consumes runner manifests and verifies local runner preflight contracts without executing implementation work.",
      limitations: [
        "It reads local runner manifest files only.",
        "It does not run shell commands, browsers, desktops, MCP tools, external coding agents, providers, deploy targets, or Git remotes.",
        "Self-test-ready tasks still require real completed receipts, transcripts, evidence artifacts, and artifact audits before work can be accepted."
      ],
      productionRequirements: [
        "Run would-run tasks only inside governed sandbox executor profiles or equivalent isolated coding workspaces.",
        "Replace self-test placeholders with real completed receipts after execution.",
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
  manifestDir,
  outputDir,
  generatedAt
}: {
  name: string;
  manifestDir: string;
  outputDir: string;
  generatedAt: string;
}) {
  const manifest = await loadManifest(path.join(manifestDir, name, "runner-manifest.json"));
  const report = buildCodingAgentRunnerSelfTest({
    manifest,
    generatedAt
  });
  const caseDir = path.join(outputDir, name);

  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "runner-self-test.json"), report);
  await writeFile(
    path.join(caseDir, "runner-self-test.md"),
    serializeCodingAgentRunnerSelfTestMarkdown(report),
    "utf8"
  );

  return report;
}

async function loadManifest(filePath: string): Promise<CodingAgentRunnerManifest> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as CodingAgentRunnerManifest;
  if (parsed.schema !== "naikaku.coding-agent-runner-manifest.v1") {
    throw new Error(`Runner manifest must use schema naikaku.coding-agent-runner-manifest.v1: ${filePath}`);
  }
  return parsed;
}

function selfTestSummary(report: CodingAgentRunnerSelfTest): CodingAgentRunnerSelfTestDrillSummary["valid"] {
  return {
    decision: report.decision,
    wouldRun: report.summary.wouldRun,
    held: report.summary.held,
    blocked: report.summary.blocked,
    simulatedActions: report.summary.simulatedActions,
    pendingCommands: report.summary.pendingCommands,
    notExecutedCommands: report.summary.notExecutedCommands,
    expectedEvidenceArtifacts: report.summary.expectedEvidenceArtifacts,
    receiptDraftPaths: report.summary.receiptDraftPaths,
    unsafePaths: report.summary.unsafePaths,
    stopConditions: report.summary.stopConditions
  };
}

function checksFor(valid: CodingAgentRunnerSelfTest, productionHeld: CodingAgentRunnerSelfTest) {
  return {
    validSelfTestReady:
      valid.decision === "self-test-ready" &&
      valid.summary.wouldRun > 0 &&
      valid.summary.wouldRun === valid.summary.readyRunnerTasks,
    wouldRunMatchesReceiptDrafts:
      valid.summary.wouldRun === valid.summary.receiptDraftPaths,
    commandsNotExecuted:
      valid.summary.pendingCommands === valid.summary.notExecutedCommands &&
      valid.items.every((item) => item.commands.every((command) =>
        command.status === "not-executed" && command.exitCode === null
      )),
    simulatedActionsAttached:
      valid.items.every((item) => item.selfTestStatus !== "would-run" || item.simulatedActions.length >= 4),
    safePaths:
      valid.summary.unsafePaths === 0 &&
      productionHeld.summary.unsafePaths === 0,
    stopConditionsPreserved:
      valid.summary.stopConditions >= valid.summary.wouldRun,
    noExecutionClaim:
      valid.honestyClaim.limitations.some((limitation) => limitation.includes("does not read prompt file contents")) &&
      valid.items.every((item) => item.commands.every((command) => command.exitCode === null)),
    productionHeldNotRun:
      productionHeld.decision === "needs-review" &&
      productionHeld.summary.wouldRun === 0 &&
      productionHeld.items.every((item) =>
        item.selfTestStatus !== "would-run" &&
        item.commands.every((command) => command.status === "not-executed" && command.exitCode === null)
      ),
    productionHeldNoReceiptDraftPaths:
      productionHeld.summary.receiptDraftPaths === 0
  };
}

function summaryMarkdown(summary: CodingAgentRunnerSelfTestDrillSummary) {
  return [
    "# Coding Agent Runner Self-Test Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Runner Self-Test",
    "",
    `- Decision: ${summary.valid.decision}`,
    `- Would run: ${summary.valid.wouldRun}`,
    `- Not-executed commands: ${summary.valid.notExecutedCommands}`,
    `- Simulated actions: ${summary.valid.simulatedActions}`,
    `- Expected evidence artifacts: ${summary.valid.expectedEvidenceArtifacts}`,
    `- Receipt draft paths: ${summary.valid.receiptDraftPaths}`,
    `- Unsafe paths: ${summary.valid.unsafePaths}`,
    "",
    "## Production-Held Runner Self-Test",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Would run: ${summary.productionHeld.wouldRun}`,
    `- Held: ${summary.productionHeld.held}`,
    `- Not-executed commands: ${summary.productionHeld.notExecutedCommands}`,
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

function parseArgs(args: string[]): RunnerSelfTestOptions {
  const options: RunnerSelfTestOptions = {
    manifestDir: "output/coding-agent-runner-manifest",
    outputDir: "output/coding-agent-runner-self-test",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--manifest-dir") {
      options.manifestDir = requireValue(args, index, arg);
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
  console.log(`Naikaku coding-agent runner self-test

Usage:
  npm run coding-agent:runner-self-test -- [options]

Options:
  --manifest-dir <dir> Read runner manifest artifacts. Default: output/coding-agent-runner-manifest
  --out <dir>          Output directory. Default: output/coding-agent-runner-self-test
  --generated-at <iso> Stable timestamp for generated artifacts.
  -h, --help           Show this help.

The drill self-tests runner handoff manifests without executing coding-agent work.`);
}

function printSummary(summary: CodingAgentRunnerSelfTestDrillSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Coding agent runner self-test: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.valid.decision}, would-run ${summary.valid.wouldRun}, ` +
    `not-executed commands ${summary.valid.notExecutedCommands}, receipt draft paths ${summary.valid.receiptDraftPaths}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.decision}, would-run ${summary.productionHeld.wouldRun}, ` +
    `held ${summary.productionHeld.held}, not-executed commands ${summary.productionHeld.notExecutedCommands}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent runner self-test failure.");
  process.exitCode = 1;
});
