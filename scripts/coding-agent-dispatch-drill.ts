import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import {
  buildCodingAgentDispatchManifest,
  serializeCodingAgentDispatchManifest,
  serializeCodingAgentDispatchManifestMarkdown
} from "../src/domain/codingAgentDispatchManifest";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import {
  buildCodingAgentSessionReceiptTemplate,
  serializeCodingAgentSessionReceipt
} from "../src/domain/codingAgentSessionReceipt";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type {
  CodingAgentDispatchDrillSummary,
  CodingAgentDispatchManifest,
  CodingAgentSessionBundle
} from "../src/domain/types";

interface DispatchDrillOptions {
  outputDir: string;
  generatedAt: string;
  locale: string;
  help: boolean;
}

interface DispatchPackageWriteResult {
  promptFilesWritten: number;
  receiptTemplateWritten: boolean;
}

interface DispatchCaseResult {
  manifest: CodingAgentDispatchManifest;
  writeResult: DispatchPackageWriteResult;
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

  await mkdir(outputDir, { recursive: true });

  const valid = await runCase({
    name: "valid",
    bundle: context.bundle,
    outputDir,
    generatedAt: options.generatedAt
  });
  const productionHeldBundle = buildCodingAgentSessionBundle({
    briefs: context.briefs,
    requireProductionEvidence: true,
    generatedAt: options.generatedAt
  });
  const productionHeld = await runCase({
    name: "production-held",
    bundle: productionHeldBundle,
    outputDir,
    generatedAt: options.generatedAt
  });

  const checks = checksFor(valid, productionHeld);
  const summary: CodingAgentDispatchDrillSummary = {
    schema: "naikaku.coding-agent-dispatch-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: options.locale,
    source: {
      boardItems: context.board.items.length,
      briefs: context.briefs.briefs.length,
      reviewDecision: context.review.decision,
      bundleDecision: context.bundle.decision,
      drillDecision: context.drill.decision,
      readySessions: context.bundle.summary.ready,
      heldSessions: context.bundle.summary.held
    },
    valid: caseSummary(valid),
    productionHeld: productionHeldSummary(productionHeld),
    checks,
    honestyClaim: {
      level: "local-drill",
      claim: "This drill writes a local coding-agent dispatch package and verifies held sessions are not made assignable.",
      limitations: [
        "It does not call model providers, external coding agents, runners, browsers, deploy targets, external services, or Git remotes.",
        "It writes prompt and receipt files only for ready dry-run sessions; this is not proof that implementation work happened.",
        "The production-held case intentionally proves that dry-run dispatch packaging cannot bypass production evidence requirements."
      ],
      productionRequirements: [
        "Run ready prompts inside governed coding workspaces before accepting completion.",
        "Attach real command transcripts, evidence artifacts, and receipt review output before updating Development Board items.",
        "Run production-mode release verification before external handoff."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(checks).every(Boolean)) {
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
  const drill = buildCodingAgentSessionDrill({
    bundle,
    generatedAt
  });

  return {
    board,
    briefs,
    review,
    bundle,
    drill
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
}): Promise<DispatchCaseResult> {
  const drill = buildCodingAgentSessionDrill({
    bundle,
    generatedAt
  });
  const manifest = buildCodingAgentDispatchManifest({
    bundle,
    drill,
    generatedAt
  });
  const writeResult = await writeDispatchPackage({
    packageDir: path.join(outputDir, name),
    manifest,
    bundle,
    generatedAt
  });

  return {
    manifest,
    writeResult
  };
}

async function writeDispatchPackage({
  packageDir,
  manifest,
  bundle,
  generatedAt
}: {
  packageDir: string;
  manifest: CodingAgentDispatchManifest;
  bundle: CodingAgentSessionBundle;
  generatedAt: string;
}): Promise<DispatchPackageWriteResult> {
  await rm(packageDir, { recursive: true, force: true });
  await mkdir(packageDir, { recursive: true });
  await writeFile(
    path.join(packageDir, "dispatch-manifest.json"),
    `${serializeCodingAgentDispatchManifest(manifest)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(packageDir, "dispatch-manifest.md"),
    serializeCodingAgentDispatchManifestMarkdown(manifest),
    "utf8"
  );
  await writeFile(path.join(packageDir, "README.md"), packageReadme(manifest), "utf8");

  let promptFilesWritten = 0;
  for (const item of manifest.items) {
    if (!item.promptPath) continue;
    const session = bundle.sessions.find((candidate) => candidate.id === item.sessionId);
    if (!session) continue;
    const promptPath = path.join(packageDir, item.promptPath);
    await mkdir(path.dirname(promptPath), { recursive: true });
    await writeFile(promptPath, session.handoffMarkdown, "utf8");
    promptFilesWritten += 1;
  }

  let receiptTemplateWritten = false;
  if (manifest.receiptTemplatePath) {
    const receiptTemplate = buildCodingAgentSessionReceiptTemplate({
      bundle,
      generatedAt
    });
    await writeFile(
      path.join(packageDir, manifest.receiptTemplatePath),
      `${serializeCodingAgentSessionReceipt(receiptTemplate)}\n`,
      "utf8"
    );
    receiptTemplateWritten = true;
  }

  return {
    promptFilesWritten,
    receiptTemplateWritten
  };
}

function checksFor(valid: DispatchCaseResult, productionHeld: DispatchCaseResult) {
  return {
    validDispatchable: valid.manifest.decision === "dispatchable" && valid.manifest.summary.ready > 0,
    validPromptFilesWritten: valid.writeResult.promptFilesWritten === valid.manifest.summary.promptFiles,
    validReceiptTemplateWritten: valid.writeResult.receiptTemplateWritten,
    evidencePrefixesUnique:
      valid.manifest.summary.uniqueEvidencePrefixes === valid.manifest.summary.total &&
      productionHeld.manifest.summary.uniqueEvidencePrefixes === productionHeld.manifest.summary.total,
    pathsSafe: valid.manifest.summary.unsafePaths === 0 && productionHeld.manifest.summary.unsafePaths === 0,
    productionHeldBlocked:
      productionHeld.manifest.decision === "blocked" &&
      productionHeld.manifest.summary.ready === 0 &&
      productionHeld.manifest.summary.productionHeld > 0,
    productionHeldNotWritten:
      productionHeld.writeResult.promptFilesWritten === 0 &&
      !productionHeld.writeResult.receiptTemplateWritten
  };
}

function caseSummary(result: DispatchCaseResult): CodingAgentDispatchDrillSummary["valid"] {
  return {
    dispatchDecision: result.manifest.decision,
    totalItems: result.manifest.summary.total,
    readyItems: result.manifest.summary.ready,
    heldItems: result.manifest.summary.held,
    promptFiles: result.manifest.summary.promptFiles,
    promptFilesWritten: result.writeResult.promptFilesWritten,
    receiptTemplateWritten: result.writeResult.receiptTemplateWritten,
    uniqueEvidencePrefixes: result.manifest.summary.uniqueEvidencePrefixes,
    unsafePaths: result.manifest.summary.unsafePaths
  };
}

function productionHeldSummary(result: DispatchCaseResult): CodingAgentDispatchDrillSummary["productionHeld"] {
  return {
    dispatchDecision: result.manifest.decision,
    totalItems: result.manifest.summary.total,
    readyItems: result.manifest.summary.ready,
    heldItems: result.manifest.summary.held,
    productionHeldItems: result.manifest.summary.productionHeld,
    promptFiles: result.manifest.summary.promptFiles,
    promptFilesWritten: result.writeResult.promptFilesWritten,
    receiptTemplateWritten: result.writeResult.receiptTemplateWritten,
    unsafePaths: result.manifest.summary.unsafePaths
  };
}

function packageReadme(manifest: CodingAgentDispatchManifest) {
  return [
    "# Coding Agent Dispatch Package",
    "",
    `Decision: ${manifest.decision}`,
    `Locale: ${manifest.operatorLocale}`,
    `Receipt template: ${manifest.receiptTemplatePath || "not written"}`,
    "",
    "This package is a reviewed handoff surface for governed coding-agent work. It does not prove implementation.",
    "",
    "Only items marked `ready-to-dispatch` have prompt files. Held items must stay with the operator until their next action is resolved.",
    "",
    "Expected evidence must return under the session evidence prefixes listed in `dispatch-manifest.json`."
  ].join("\n");
}

function summaryMarkdown(summary: CodingAgentDispatchDrillSummary) {
  return [
    "# Coding Agent Dispatch Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Package",
    "",
    `- Decision: ${summary.valid.dispatchDecision}`,
    `- Ready items: ${summary.valid.readyItems}/${summary.valid.totalItems}`,
    `- Prompt files written: ${summary.valid.promptFilesWritten}/${summary.valid.promptFiles}`,
    `- Receipt template written: ${summary.valid.receiptTemplateWritten ? "yes" : "no"}`,
    `- Unsafe paths: ${summary.valid.unsafePaths}`,
    "",
    "## Production-Held Package",
    "",
    `- Decision: ${summary.productionHeld.dispatchDecision}`,
    `- Ready items: ${summary.productionHeld.readyItems}/${summary.productionHeld.totalItems}`,
    `- Production-held items: ${summary.productionHeld.productionHeldItems}`,
    `- Prompt files written: ${summary.productionHeld.promptFilesWritten}`,
    `- Receipt template written: ${summary.productionHeld.receiptTemplateWritten ? "yes" : "no"}`,
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

function parseArgs(args: string[]): DispatchDrillOptions {
  const options: DispatchDrillOptions = {
    outputDir: "output/coding-agent-dispatch-drill",
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
  console.log(`Naikaku coding-agent dispatch drill

Usage:
  npm run coding-agent:dispatch -- [options]

Options:
  --out <dir>             Output directory. Default: output/coding-agent-dispatch-drill
  --locale <locale>      Operator locale for generated coding briefs. Default: ja
  --generated-at <iso>   Stable timestamp for generated artifacts.
  -h, --help             Show this help.

The drill writes a dispatchable prompt package and a production-held negative
package, then fails if held sessions become assignable or ready prompt files
are missing.`);
}

function printSummary(summary: CodingAgentDispatchDrillSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Coding agent dispatch drill: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.valid.dispatchDecision}, prompts ${summary.valid.promptFilesWritten}/${summary.valid.promptFiles}, ` +
    `receipt ${summary.valid.receiptTemplateWritten ? "written" : "missing"}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.dispatchDecision}, ready ${summary.productionHeld.readyItems}, ` +
    `held ${summary.productionHeld.productionHeldItems}, prompts written ${summary.productionHeld.promptFilesWritten}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent dispatch drill failure.");
  process.exitCode = 1;
});
