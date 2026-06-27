import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodingAgentRunnerInvocationFile,
  buildCodingAgentRunnerInvocationPackage,
  serializeCodingAgentRunnerInvocationFileMarkdown,
  serializeCodingAgentRunnerInvocationPackageMarkdown
} from "../src/domain/codingAgentRunnerInvocation";
import type {
  CodingAgentRunnerInvocationPackage,
  CodingAgentRunnerInvocationDrillSummary,
  CodingAgentRunnerManifest
} from "../src/domain/types";

interface RunnerInvocationOptions {
  manifestDir: string;
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

interface RunnerInvocationCase {
  invocationPackage: CodingAgentRunnerInvocationPackage;
  invocationFilesWritten: number;
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

  const summary: CodingAgentRunnerInvocationDrillSummary = {
    schema: "naikaku.coding-agent-runner-invocation-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: valid.invocationPackage.operatorLocale,
    source: {
      runnerManifestDecision: valid.invocationPackage.sourceDecision,
      readyTasks: valid.invocationPackage.items.filter((item) => item.manifestTaskStatus === "ready-for-runner").length,
      runnerTasks: valid.invocationPackage.items.filter((item) => item.manifestTaskStatus === "ready-for-runner").length,
      receiptDraftPaths: valid.invocationPackage.summary.receiptDraftPaths
    },
    valid: invocationSummary(valid.invocationPackage),
    productionHeld: {
      decision: productionHeld.invocationPackage.decision,
      readyInvocations: productionHeld.invocationPackage.summary.readyInvocations,
      heldInvocations: productionHeld.invocationPackage.summary.heldInvocations,
      blockedInvocations: productionHeld.invocationPackage.summary.blockedInvocations,
      invocationFiles: productionHeld.invocationPackage.summary.invocationFiles,
      receiptDraftPaths: productionHeld.invocationPackage.summary.receiptDraftPaths,
      unsafePaths: productionHeld.invocationPackage.summary.unsafePaths
    },
    checks: checksFor(valid, productionHeld),
    honestyClaim: {
      level: "runner-invocation-package",
      claim: "This drill writes runner-consumable coding-agent invocation files from runner manifests without executing implementation work.",
      limitations: [
        "It reads local runner manifest files and writes invocation handoff files only.",
        "It does not run shell commands, browsers, desktops, MCP tools, external coding agents, providers, deploy targets, or Git remotes.",
        "Invocation-ready files still require completed receipts, transcripts, evidence artifacts, and artifact audits before work can be accepted."
      ],
      productionRequirements: [
        "Hand invocation files only to governed sandbox executor profiles or equivalent isolated coding workspaces.",
        "Replace pending command contracts with real execution evidence after runner execution.",
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
}): Promise<RunnerInvocationCase> {
  const manifest = await loadManifest(path.join(manifestDir, name, "runner-manifest.json"));
  const caseDir = path.join(outputDir, name);
  const invocationDir = path.join(caseDir, "invocations");
  const invocationPackage = buildCodingAgentRunnerInvocationPackage({
    manifest,
    invocationBasePath: relativePath(invocationDir),
    generatedAt
  });

  await mkdir(invocationDir, { recursive: true });
  await writeJson(path.join(caseDir, "runner-invocation-package.json"), invocationPackage);
  await writeFile(
    path.join(caseDir, "runner-invocation-package.md"),
    serializeCodingAgentRunnerInvocationPackageMarkdown(invocationPackage),
    "utf8"
  );

  const invocationFilesWritten = await writeInvocationFiles(invocationPackage);

  return {
    invocationPackage,
    invocationFilesWritten
  };
}

async function loadManifest(filePath: string): Promise<CodingAgentRunnerManifest> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as CodingAgentRunnerManifest;
  if (parsed.schema !== "naikaku.coding-agent-runner-manifest.v1") {
    throw new Error(`Runner manifest must use schema naikaku.coding-agent-runner-manifest.v1: ${filePath}`);
  }
  return parsed;
}

async function writeInvocationFiles(invocationPackage: CodingAgentRunnerInvocationPackage) {
  let written = 0;

  for (const item of invocationPackage.items) {
    if (item.invocationStatus !== "invocation-ready" || !item.invocationPath) {
      continue;
    }

    const invocationFile = buildCodingAgentRunnerInvocationFile({
      invocationPackage,
      item
    });
    const jsonPath = path.resolve(item.invocationPath);
    const markdownPath = jsonPath.replace(/\.json$/, ".md");
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeJson(jsonPath, invocationFile);
    await writeFile(markdownPath, serializeCodingAgentRunnerInvocationFileMarkdown(invocationFile), "utf8");
    written += 1;
  }

  return written;
}

function invocationSummary(
  invocationPackage: CodingAgentRunnerInvocationPackage
): CodingAgentRunnerInvocationDrillSummary["valid"] {
  return {
    decision: invocationPackage.decision,
    readyInvocations: invocationPackage.summary.readyInvocations,
    heldInvocations: invocationPackage.summary.heldInvocations,
    blockedInvocations: invocationPackage.summary.blockedInvocations,
    invocationFiles: invocationPackage.summary.invocationFiles,
    commandContracts: invocationPackage.summary.commandContracts,
    receiptDraftPaths: invocationPackage.summary.receiptDraftPaths,
    expectedEvidenceArtifacts: invocationPackage.summary.expectedEvidenceArtifacts,
    unsafePaths: invocationPackage.summary.unsafePaths,
    stopConditions: invocationPackage.summary.stopConditions
  };
}

function checksFor(valid: RunnerInvocationCase, productionHeld: RunnerInvocationCase) {
  return {
    validPackageReady:
      valid.invocationPackage.decision === "package-ready" &&
      valid.invocationPackage.summary.readyInvocations > 0 &&
      valid.invocationPackage.summary.readyInvocations === valid.invocationPackage.summary.invocationFiles,
    invocationFilesWritten:
      valid.invocationFilesWritten === valid.invocationPackage.summary.readyInvocations &&
      valid.invocationFilesWritten === valid.invocationPackage.summary.invocationFiles,
    pendingCommandsOnly:
      valid.invocationPackage.items.every((item) =>
        item.invocationStatus !== "invocation-ready" ||
        item.commands.every((command) => command.status === "pending-real-execution" && command.exitCode === null)
      ),
    runnerInstructionsAttached:
      valid.invocationPackage.items.every((item) =>
        item.invocationStatus !== "invocation-ready" ||
        item.runnerInstructions.some((instruction) => instruction.includes("Return the completed receipt"))
      ),
    safePaths:
      valid.invocationPackage.summary.unsafePaths === 0 &&
      productionHeld.invocationPackage.summary.unsafePaths === 0,
    noExecutionClaim:
      valid.invocationPackage.honestyClaim.limitations.some((limitation) =>
        limitation.includes("does not read prompt file contents")
      ) &&
      valid.invocationPackage.items.every((item) => item.commands.every((command) => command.exitCode === null)),
    productionHeldNotPackaged:
      productionHeld.invocationPackage.decision === "needs-review" &&
      productionHeld.invocationPackage.summary.readyInvocations === 0 &&
      productionHeld.invocationPackage.summary.invocationFiles === 0 &&
      productionHeld.invocationFilesWritten === 0,
    productionHeldNoReceiptDraftPaths:
      productionHeld.invocationPackage.summary.receiptDraftPaths === 0
  };
}

function summaryMarkdown(summary: CodingAgentRunnerInvocationDrillSummary) {
  return [
    "# Coding Agent Runner Invocation Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Invocation Package",
    "",
    `- Decision: ${summary.valid.decision}`,
    `- Ready invocations: ${summary.valid.readyInvocations}`,
    `- Invocation files: ${summary.valid.invocationFiles}`,
    `- Command contracts: ${summary.valid.commandContracts}`,
    `- Expected evidence artifacts: ${summary.valid.expectedEvidenceArtifacts}`,
    `- Receipt draft paths: ${summary.valid.receiptDraftPaths}`,
    `- Stop conditions: ${summary.valid.stopConditions}`,
    `- Unsafe paths: ${summary.valid.unsafePaths}`,
    "",
    "## Production-Held Invocation Package",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Ready invocations: ${summary.productionHeld.readyInvocations}`,
    `- Invocation files: ${summary.productionHeld.invocationFiles}`,
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

function parseArgs(args: string[]): RunnerInvocationOptions {
  const options: RunnerInvocationOptions = {
    manifestDir: "output/coding-agent-runner-manifest",
    outputDir: "output/coding-agent-runner-invocation",
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
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function printHelp() {
  console.log(`Naikaku coding-agent runner invocation

Usage:
  npm run coding-agent:runner-invocation -- [options]

Options:
  --manifest-dir <dir>  Read runner manifest drill output. Default: output/coding-agent-runner-manifest
  --out <dir>           Write invocation package output. Default: output/coding-agent-runner-invocation
  --generated-at <iso>  Use a stable timestamp.
  --help                Show this help.

The drill writes package summaries plus one invocation JSON/Markdown file per
ready runner task. Held and production-held tasks stay visible but receive no
executable invocation file.`);
}

function printSummary(summary: CodingAgentRunnerInvocationDrillSummary) {
  const checkEntries = Object.entries(summary.checks);
  const passed = checkEntries.filter(([, ok]) => ok).length;
  const failed = checkEntries.length - passed;
  console.log("Coding agent runner invocation drill: passed");
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.valid.decision}, ready invocations ${summary.valid.readyInvocations}, ` +
    `files ${summary.valid.invocationFiles}, command contracts ${summary.valid.commandContracts}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.decision}, ready ${summary.productionHeld.readyInvocations}, ` +
    `files ${summary.productionHeld.invocationFiles}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent runner invocation failure.");
  process.exitCode = 1;
});
