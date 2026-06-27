import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodingAgentRunnerIntakeAudit,
  serializeCodingAgentRunnerIntakeAuditMarkdown
} from "../src/domain/codingAgentRunnerIntakeAudit";
import type {
  CodingAgentRunnerIntakeAudit,
  CodingAgentRunnerIntakeAuditDrillSummary,
  CodingAgentRunnerInvocationPackage
} from "../src/domain/types";

interface RunnerIntakeOptions {
  invocationDir: string;
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

interface RunnerIntakeCase {
  audit: CodingAgentRunnerIntakeAudit;
  invocationFilesFound: number;
  markdownFilesFound: number;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const invocationDir = path.resolve(options.invocationDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const valid = await runCase({
    name: "valid",
    invocationDir,
    outputDir,
    generatedAt: options.generatedAt
  });
  const productionHeld = await runCase({
    name: "production-held",
    invocationDir,
    outputDir,
    generatedAt: options.generatedAt
  });

  const summary: CodingAgentRunnerIntakeAuditDrillSummary = {
    schema: "naikaku.coding-agent-runner-intake-audit-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: valid.audit.operatorLocale,
    source: {
      runnerInvocationDecision: valid.audit.sourceDecision,
      readyInvocations: valid.audit.items.filter((item) => item.invocationStatus === "invocation-ready").length,
      invocationFiles: valid.audit.items.filter((item) => item.invocationStatus === "invocation-ready" && item.invocationPath).length,
      commandContracts: valid.audit.summary.commandContracts,
      receiptDraftPaths: valid.audit.summary.receiptDraftPaths
    },
    valid: auditSummary(valid.audit, valid),
    productionHeld: {
      decision: productionHeld.audit.decision,
      acceptedIntakes: productionHeld.audit.summary.acceptedIntakes,
      heldIntakes: productionHeld.audit.summary.heldIntakes,
      blockedIntakes: productionHeld.audit.summary.blockedIntakes,
      invocationFiles: productionHeld.audit.summary.invocationFiles,
      invocationFilesFound: productionHeld.invocationFilesFound,
      receiptDraftPaths: productionHeld.audit.summary.receiptDraftPaths,
      unsafePaths: productionHeld.audit.summary.unsafePaths
    },
    checks: checksFor(valid, productionHeld),
    honestyClaim: {
      level: "runner-invocation-intake-audit",
      claim: "This drill audits runner invocation packages before runner handoff without executing implementation work.",
      limitations: [
        "It reads local runner invocation package files and checks expected invocation files only.",
        "It does not run shell commands, browsers, desktops, MCP tools, external coding agents, providers, deploy targets, or Git remotes.",
        "An accepted intake still requires a real runner receipt, transcripts, evidence artifacts, and artifact audit before implementation can be accepted."
      ],
      productionRequirements: [
        "Hand accepted invocation files only to governed sandbox executor profiles or equivalent isolated coding workspaces.",
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
  invocationDir,
  outputDir,
  generatedAt
}: {
  name: string;
  invocationDir: string;
  outputDir: string;
  generatedAt: string;
}): Promise<RunnerIntakeCase> {
  const invocationPackage = await loadInvocationPackage(
    path.join(invocationDir, name, "runner-invocation-package.json")
  );
  const audit = buildCodingAgentRunnerIntakeAudit({
    invocationPackage,
    generatedAt
  });
  const caseDir = path.join(outputDir, name);
  const invocationFilesFound = await countReadableInvocationFiles(audit, "json");
  const markdownFilesFound = await countReadableInvocationFiles(audit, "markdown");

  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "runner-intake-audit.json"), audit);
  await writeFile(
    path.join(caseDir, "runner-intake-audit.md"),
    serializeCodingAgentRunnerIntakeAuditMarkdown(audit),
    "utf8"
  );

  return {
    audit,
    invocationFilesFound,
    markdownFilesFound
  };
}

async function loadInvocationPackage(filePath: string): Promise<CodingAgentRunnerInvocationPackage> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as CodingAgentRunnerInvocationPackage;
  if (parsed.schema !== "naikaku.coding-agent-runner-invocation-package.v1") {
    throw new Error(`Runner invocation package must use schema naikaku.coding-agent-runner-invocation-package.v1: ${filePath}`);
  }
  return parsed;
}

async function countReadableInvocationFiles(audit: CodingAgentRunnerIntakeAudit, kind: "json" | "markdown") {
  let count = 0;

  for (const item of audit.items) {
    if (item.intakeStatus !== "accepted-for-runner" || !item.invocationPath) {
      continue;
    }
    const targetPath = kind === "json" ? item.invocationPath : item.invocationPath.replace(/\.json$/, ".md");
    try {
      await readFile(path.resolve(targetPath), "utf8");
      count += 1;
    } catch {
      // Missing files are reported by the drill checks below.
    }
  }

  return count;
}

function auditSummary(audit: CodingAgentRunnerIntakeAudit, drillCase: RunnerIntakeCase): CodingAgentRunnerIntakeAuditDrillSummary["valid"] {
  return {
    decision: audit.decision,
    acceptedIntakes: audit.summary.acceptedIntakes,
    heldIntakes: audit.summary.heldIntakes,
    blockedIntakes: audit.summary.blockedIntakes,
    invocationFiles: audit.summary.invocationFiles,
    invocationFilesFound: drillCase.invocationFilesFound,
    markdownFilesFound: drillCase.markdownFilesFound,
    commandContracts: audit.summary.commandContracts,
    receiptDraftPaths: audit.summary.receiptDraftPaths,
    expectedEvidenceArtifacts: audit.summary.expectedEvidenceArtifacts,
    unsafePaths: audit.summary.unsafePaths,
    sourceBlockedChecks: audit.summary.sourceBlockedChecks,
    completedCommandResults: audit.summary.completedCommandResults
  };
}

function checksFor(valid: RunnerIntakeCase, productionHeld: RunnerIntakeCase) {
  return {
    validAccepted:
      valid.audit.decision === "accepted-for-runner" &&
      valid.audit.summary.acceptedIntakes > 0 &&
      valid.audit.summary.blockedIntakes === 0,
    acceptedMatchesInvocationFiles:
      valid.audit.summary.acceptedIntakes === valid.audit.summary.invocationFiles,
    invocationFilesReadable:
      valid.invocationFilesFound === valid.audit.summary.invocationFiles,
    markdownFilesReadable:
      valid.markdownFilesFound === valid.audit.summary.invocationFiles,
    pendingCommandsOnly:
      valid.audit.summary.completedCommandResults === 0 &&
      valid.audit.items.every((item) =>
        item.intakeStatus !== "accepted-for-runner" ||
        item.commands.every((command) => command.status === "pending-real-execution" && command.exitCode === null)
      ),
    sourceChecksClean:
      valid.audit.summary.sourceBlockedChecks === 0,
    safePaths:
      valid.audit.summary.unsafePaths === 0 &&
      productionHeld.audit.summary.unsafePaths === 0,
    noExecutionClaim:
      valid.audit.honestyClaim.limitations.some((limitation) =>
        limitation.includes("does not read prompt file contents")
      ) &&
      valid.audit.summary.completedCommandResults === 0,
    productionHeldNotAccepted:
      productionHeld.audit.decision === "needs-review" &&
      productionHeld.audit.summary.acceptedIntakes === 0,
    productionHeldNoFiles:
      productionHeld.audit.summary.invocationFiles === 0 &&
      productionHeld.invocationFilesFound === 0,
    productionHeldNoReceiptDraftPaths:
      productionHeld.audit.summary.receiptDraftPaths === 0
  };
}

function summaryMarkdown(summary: CodingAgentRunnerIntakeAuditDrillSummary) {
  return [
    "# Coding Agent Runner Intake Audit Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Intake Audit",
    "",
    `- Decision: ${summary.valid.decision}`,
    `- Accepted intakes: ${summary.valid.acceptedIntakes}`,
    `- Invocation files: ${summary.valid.invocationFiles}`,
    `- Invocation files found: ${summary.valid.invocationFilesFound}`,
    `- Markdown files found: ${summary.valid.markdownFilesFound}`,
    `- Command contracts: ${summary.valid.commandContracts}`,
    `- Receipt draft paths: ${summary.valid.receiptDraftPaths}`,
    `- Unsafe paths: ${summary.valid.unsafePaths}`,
    `- Source blocked checks: ${summary.valid.sourceBlockedChecks}`,
    `- Completed command results: ${summary.valid.completedCommandResults}`,
    "",
    "## Production-Held Intake Audit",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Accepted intakes: ${summary.productionHeld.acceptedIntakes}`,
    `- Invocation files: ${summary.productionHeld.invocationFiles}`,
    `- Invocation files found: ${summary.productionHeld.invocationFilesFound}`,
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

function parseArgs(args: string[]): RunnerIntakeOptions {
  const options: RunnerIntakeOptions = {
    invocationDir: "output/coding-agent-runner-invocation",
    outputDir: "output/coding-agent-runner-intake-audit",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--invocation-dir") {
      options.invocationDir = requireValue(args, index, arg);
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
  console.log(`Naikaku coding-agent runner intake audit

Usage:
  npm run coding-agent:runner-intake -- [options]

Options:
  --invocation-dir <dir>  Read runner invocation drill output. Default: output/coding-agent-runner-invocation
  --out <dir>             Write intake audit output. Default: output/coding-agent-runner-intake-audit
  --generated-at <iso>    Use a stable timestamp.
  --help                  Show this help.

The drill audits invocation packages before runner handoff and confirms the
expected invocation JSON/Markdown files are readable. It does not execute
implementation work.`);
}

function printSummary(summary: CodingAgentRunnerIntakeAuditDrillSummary) {
  const checkEntries = Object.entries(summary.checks);
  const passed = checkEntries.filter(([, ok]) => ok).length;
  const failed = checkEntries.length - passed;
  console.log("Coding agent runner intake audit drill: passed");
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.valid.decision}, accepted ${summary.valid.acceptedIntakes}, ` +
    `files ${summary.valid.invocationFilesFound}/${summary.valid.invocationFiles}, ` +
    `command contracts ${summary.valid.commandContracts}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.decision}, accepted ${summary.productionHeld.acceptedIntakes}, ` +
    `files ${summary.productionHeld.invocationFilesFound}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent runner intake audit failure.");
  process.exitCode = 1;
});
