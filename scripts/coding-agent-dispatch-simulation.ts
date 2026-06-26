import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "../src/domain/codingAgentDispatchManifest";
import {
  buildCodingAgentDispatchSimulation,
  serializeCodingAgentDispatchSimulation,
  serializeCodingAgentDispatchSimulationMarkdown
} from "../src/domain/codingAgentDispatchSimulation";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type {
  CodingAgentDispatchSimulation,
  CodingAgentDispatchSimulationSummary,
  CodingAgentSessionBundle
} from "../src/domain/types";

interface SimulationOptions {
  outputDir: string;
  generatedAt: string;
  locale: string;
  help: boolean;
}

interface SimulationCase {
  simulation: CodingAgentDispatchSimulation;
  manifest: ReturnType<typeof buildCodingAgentDispatchManifest>;
  receiptDraftFilesWritten: number;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativeOutputDir(outputDir);
  const context = buildContext({
    locale: options.locale,
    generatedAt: options.generatedAt
  });
  const productionHeldBundle = buildCodingAgentSessionBundle({
    briefs: context.briefs,
    requireProductionEvidence: true,
    generatedAt: options.generatedAt
  });

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const valid = await runCase({
    name: "valid",
    bundle: context.bundle,
    outputDir,
    generatedAt: options.generatedAt
  });
  const productionHeld = await runCase({
    name: "production-held",
    bundle: productionHeldBundle,
    outputDir,
    generatedAt: options.generatedAt
  });

  const summary: CodingAgentDispatchSimulationSummary = {
    schema: "naikaku.coding-agent-dispatch-simulation.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: options.locale,
    source: {
      dispatchDecision: valid.manifest.decision,
      archiveAuditDecision: valid.simulation.archiveAuditDecision || "not-attached",
      readyItems: valid.manifest.summary.ready,
      heldItems: valid.manifest.summary.held,
      promptFiles: valid.manifest.summary.promptFiles,
      receiptTemplates: valid.manifest.summary.receiptTemplates
    },
    simulation: simulationSummary(valid),
    productionHeld: {
      decision: productionHeld.simulation.decision,
      readyForAgent: productionHeld.simulation.summary.readyForAgent,
      held: productionHeld.simulation.summary.held,
      blocked: productionHeld.simulation.summary.blocked,
      promptFiles: productionHeld.manifest.summary.promptFiles,
      receiptDraftItems: productionHeld.simulation.summary.receiptDraftItems,
      receiptDraftFilesWritten: productionHeld.receiptDraftFilesWritten
    },
    checks: checksFor(valid, productionHeld),
    honestyClaim: {
      level: "local-drill",
      claim: "This drill self-simulates coding-agent dispatch execution planning without running implementation work.",
      limitations: [
        "It does not call model providers, external coding agents, shell runners, browsers, deploy targets, external services, or Git remotes.",
        "It creates pending receipt drafts only; those drafts must be replaced by real changed files, command transcripts, evidence artifacts, and risks.",
        "The production-held case proves held sessions stay visible but do not become assignable execution plans."
      ],
      productionRequirements: [
        "Run ready prompts inside governed coding workspaces before accepting completion.",
        "Attach completed receipts and local artifact audits before updating Development Board items.",
        "Run production-mode release verification before external handoff."
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

function buildContext({
  locale,
  generatedAt
}: {
  locale: string;
  generatedAt: string;
}) {
  const workspace = createDefaultWorkspace();
  const handoff = buildTeamHandoff({
    workspace,
    generatedAt
  });
  const board = buildDevelopmentBoard({
    handoff,
    generatedAt
  });
  const briefs = buildCodingAgentBriefs({
    board,
    operatorLocale: locale,
    generatedAt
  });
  const review = buildCodingAgentBriefReview({
    briefs,
    generatedAt
  });
  const bundle = buildCodingAgentSessionBundle({
    briefs,
    review,
    generatedAt
  });

  return {
    briefs,
    review,
    bundle
  };
}

async function runCase({
  name,
  bundle,
  outputDir,
  generatedAt
}: {
  name: string;
  bundle: CodingAgentSessionBundle;
  outputDir: string;
  generatedAt: string;
}): Promise<SimulationCase> {
  const drill = buildCodingAgentSessionDrill({
    bundle,
    generatedAt
  });
  const manifest = buildCodingAgentDispatchManifest({
    bundle,
    drill,
    generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest,
    generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest,
    archiveAudit,
    generatedAt
  });

  const caseDir = path.join(outputDir, name);
  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "dispatch-simulation.json"), simulation);
  await writeFile(
    path.join(caseDir, "dispatch-simulation.md"),
    serializeCodingAgentDispatchSimulationMarkdown(simulation),
    "utf8"
  );
  const receiptDraftFilesWritten = await writeReceiptDraftFiles({
    caseDir,
    simulation
  });

  return {
    simulation,
    manifest,
    receiptDraftFilesWritten
  };
}

async function writeReceiptDraftFiles({
  caseDir,
  simulation
}: {
  caseDir: string;
  simulation: CodingAgentDispatchSimulation;
}) {
  const draftItems = simulation.items.filter((item) => item.receiptDraft);
  if (draftItems.length === 0) {
    return 0;
  }

  const draftDir = path.join(caseDir, "receipt-drafts");
  await mkdir(draftDir, { recursive: true });

  await Promise.all(draftItems.map((item, index) =>
    writeJson(
      path.join(draftDir, `${String(index + 1).padStart(2, "0")}-${safeFileStem(item.sessionId)}.json`),
      {
        schema: "naikaku.coding-agent-dispatch-simulation-receipt-draft.v1",
        generatedAt: simulation.generatedAt,
        mode: simulation.mode,
        status: "pending-real-execution",
        sessionId: item.sessionId,
        sourceItemId: item.sourceItemId,
        promptPath: item.promptPath,
        receiptTemplatePath: item.receiptTemplatePath,
        evidenceArtifactPrefix: item.evidenceArtifactPrefix,
        plannedSteps: item.plannedSteps,
        receiptDraft: item.receiptDraft,
        honestyClaim: {
          level: simulation.honestyClaim.level,
          claim: "This file is a pending local simulation draft for a real coding-agent receipt.",
          limitations: [
            "No implementation work, shell command, browser action, commit, push, deploy, or production call has been executed for this draft.",
            "All command results must remain pending until replaced by real transcripts and exit codes from the governed workspace."
          ],
          productionRequirements: [
            "Replace this draft with the completed receipt after real coding-agent execution.",
            "Attach changed files, command transcripts, evidence artifacts, and remaining risks before receipt review."
          ]
        }
      }
    )
  ));

  return draftItems.length;
}

function safeFileStem(value: string) {
  const stem = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "session";
}

function simulationSummary(
  simulationCase: SimulationCase
): CodingAgentDispatchSimulationSummary["simulation"] {
  const { simulation } = simulationCase;
  return {
    decision: simulation.decision,
    readyForAgent: simulation.summary.readyForAgent,
    held: simulation.summary.held,
    blocked: simulation.summary.blocked,
    plannedCommands: simulation.summary.plannedCommands,
    expectedEvidenceArtifacts: simulation.summary.expectedEvidenceArtifacts,
    receiptDraftItems: simulation.summary.receiptDraftItems,
    receiptDraftFilesWritten: simulationCase.receiptDraftFilesWritten,
    unsafePaths: simulation.summary.unsafePaths
  };
}

function checksFor(valid: SimulationCase, productionHeld: SimulationCase) {
  return {
    validDispatchable: valid.manifest.decision === "dispatchable" && valid.manifest.summary.ready > 0,
    validSimulationReady:
      valid.simulation.decision === "ready-for-real-agent" &&
      valid.simulation.summary.readyForAgent === valid.manifest.summary.ready,
    receiptDraftsCreated:
      valid.simulation.summary.receiptDraftItems === valid.manifest.summary.ready &&
      valid.simulation.items.every((item) => Boolean(item.receiptDraft)),
    receiptDraftFilesWritten:
      valid.receiptDraftFilesWritten === valid.simulation.summary.receiptDraftItems,
    receiptDraftsPending:
      valid.simulation.items.every((item) =>
        !item.receiptDraft ||
        (
          item.receiptDraft.commandResults.every((result) =>
            result.exitCode === null &&
            result.outputSummary.includes("did not run this command")
          ) &&
          item.receiptDraft.changedFiles.length === 0
        )
      ),
    plannedCommandsCovered:
      valid.simulation.summary.plannedCommands === valid.manifest.items.reduce(
        (total, item) => total + item.verificationCommands.length,
        0
      ),
    evidenceArtifactsCovered:
      valid.simulation.summary.expectedEvidenceArtifacts === valid.manifest.items.reduce(
        (total, item) => total + item.expectedEvidenceArtifacts.length,
        0
      ),
    pathsSafe: valid.simulation.summary.unsafePaths === 0 && productionHeld.simulation.summary.unsafePaths === 0,
    noExecutionClaim:
      serializeCodingAgentDispatchSimulation(valid.simulation).includes("did not run this command") &&
      valid.simulation.honestyClaim.limitations.some((limitation) => limitation.includes("does not edit files")),
    productionHeldNotReady:
      productionHeld.manifest.decision === "blocked" &&
      productionHeld.simulation.decision === "needs-review" &&
      productionHeld.simulation.summary.readyForAgent === 0,
    productionHeldNoReceiptDrafts: productionHeld.simulation.summary.receiptDraftItems === 0,
    productionHeldNoReceiptDraftFiles: productionHeld.receiptDraftFilesWritten === 0
  };
}

function summaryMarkdown(summary: CodingAgentDispatchSimulationSummary) {
  return [
    "# Coding Agent Dispatch Simulation Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Dispatch Simulation",
    "",
    `- Decision: ${summary.simulation.decision}`,
    `- Ready for real agent: ${summary.simulation.readyForAgent}`,
    `- Planned commands: ${summary.simulation.plannedCommands}`,
    `- Expected evidence artifacts: ${summary.simulation.expectedEvidenceArtifacts}`,
    `- Receipt draft items: ${summary.simulation.receiptDraftItems}`,
    `- Receipt draft files written: ${summary.simulation.receiptDraftFilesWritten}`,
    `- Unsafe paths: ${summary.simulation.unsafePaths}`,
    "",
    "## Production-Held Simulation",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Ready for real agent: ${summary.productionHeld.readyForAgent}`,
    `- Held: ${summary.productionHeld.held}`,
    `- Receipt draft items: ${summary.productionHeld.receiptDraftItems}`,
    `- Receipt draft files written: ${summary.productionHeld.receiptDraftFilesWritten}`,
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

function parseArgs(args: string[]): SimulationOptions {
  const options: SimulationOptions = {
    outputDir: "output/coding-agent-dispatch-simulation",
    generatedAt: new Date().toISOString(),
    locale: "ja",
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
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

    if (arg === "--locale") {
      options.locale = requireValue(args, index, arg);
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

function relativeOutputDir(outputDir: string) {
  const relative = path.relative(process.cwd(), outputDir).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : outputDir;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function printHelp() {
  console.log(`Naikaku coding-agent dispatch simulation

Usage:
  npm run coding-agent:simulate -- [options]

Options:
  --out <dir>             Output directory. Default: output/coding-agent-dispatch-simulation
  --locale <locale>      Operator locale for generated coding briefs. Default: ja
  --generated-at <iso>   Stable timestamp for generated artifacts.
  -h, --help             Show this help.

The drill self-simulates the next execution handoff from a dispatch package.
It writes pending receipt drafts and fails if held sessions become assignable.`);
}

function printSummary(summary: CodingAgentDispatchSimulationSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Coding agent dispatch simulation: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.simulation.decision}, ready ${summary.simulation.readyForAgent}, ` +
    `receipt drafts ${summary.simulation.receiptDraftItems}, files ${summary.simulation.receiptDraftFilesWritten}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.decision}, ready ${summary.productionHeld.readyForAgent}, ` +
    `receipt drafts ${summary.productionHeld.receiptDraftItems}, files ${summary.productionHeld.receiptDraftFilesWritten}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent dispatch simulation failure.");
  process.exitCode = 1;
});
