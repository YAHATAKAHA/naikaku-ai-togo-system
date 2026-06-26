import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "../src/domain/codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "../src/domain/codingAgentDispatchSimulation";
import { buildCodingAgentRunnerManifest } from "../src/domain/codingAgentRunnerManifest";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import { buildCodingAgentSessionReceiptTemplate } from "../src/domain/codingAgentSessionReceipt";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type { SupportedLocale } from "../src/i18n";
import { getCopy, htmlLang, supportedLocales } from "../src/i18n";

interface LocalizationDrillOptions {
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

interface LocaleDrillResult {
  locale: SupportedLocale;
  nativeLabel: string;
  htmlLang: string;
  expectedLanguage: string;
  briefs: number;
  reviewDecision: string;
  bundleDecision: string;
  drillDecision: string;
  dispatchDecision: string;
  archiveAuditDecision: string;
  simulationDecision: string;
  runnerManifestDecision: string;
  receiptDecision: string;
  readySessions: number;
  heldSessions: number;
  wouldAssign: number;
  dispatchReady: number;
  dispatchPromptFiles: number;
  simulationReadyForAgent: number;
  simulationReceiptDrafts: number;
  runnerReadyTasks: number;
  runnerTasks: number;
  pendingReceiptItems: number;
  checks: {
    localeIsCarried: boolean;
    promptLanguageInstruction: boolean;
    machineContractStable: boolean;
    sessionContractStable: boolean;
    dispatchContractStable: boolean;
    archiveAuditVerified: boolean;
    simulationContractStable: boolean;
    runnerManifestContractStable: boolean;
    copyReady: boolean;
    reviewReady: boolean;
    bundleReady: boolean;
    drillAssignable: boolean;
    receiptNeedsEvidence: boolean;
  };
  failures: string[];
}

interface LocalizationDrillSummary {
  schema: "naikaku.localization-drill.v1";
  generatedAt: string;
  outputDir: string;
  defaultLocale: SupportedLocale;
  locales: LocaleDrillResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    readySessions: number;
    wouldAssign: number;
    dispatchReady: number;
    simulationReadyForAgent: number;
    simulationReceiptDrafts: number;
    runnerReadyTasks: number;
    runnerTasks: number;
    pendingReceiptItems: number;
  };
  honestyClaim: {
    level: "local-drill";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

const expectedLocaleOrder: SupportedLocale[] = ["ja", "en", "zh-Hans", "zh-Hant", "ko"];
const expectedLanguageByLocale: Record<SupportedLocale, string> = {
  ja: "Japanese",
  en: "English",
  "zh-Hans": "Simplified Chinese",
  "zh-Hant": "Traditional Chinese",
  ko: "Korean"
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  assertSupportedLocaleContract();

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativeOutputDir(outputDir);
  const workspace = createDefaultWorkspace();
  const handoff = buildTeamHandoff({
    workspace,
    generatedAt: options.generatedAt
  });
  const board = buildDevelopmentBoard({
    handoff,
    generatedAt: options.generatedAt
  });

  await mkdir(outputDir, { recursive: true });

  const locales: LocaleDrillResult[] = [];
  for (const option of supportedLocales) {
    const result = await runLocaleDrill({
      locale: option.code,
      nativeLabel: option.nativeLabel,
      board,
      outputDir,
      generatedAt: options.generatedAt
    });
    locales.push(result);
  }

  const summary: LocalizationDrillSummary = {
    schema: "naikaku.localization-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    defaultLocale: "ja",
    locales,
    summary: {
      total: locales.length,
      passed: locales.filter((item) => item.failures.length === 0).length,
      failed: locales.filter((item) => item.failures.length > 0).length,
      readySessions: locales.reduce((total, item) => total + item.readySessions, 0),
      wouldAssign: locales.reduce((total, item) => total + item.wouldAssign, 0),
      dispatchReady: locales.reduce((total, item) => total + item.dispatchReady, 0),
      simulationReadyForAgent: locales.reduce((total, item) => total + item.simulationReadyForAgent, 0),
      simulationReceiptDrafts: locales.reduce((total, item) => total + item.simulationReceiptDrafts, 0),
      runnerReadyTasks: locales.reduce((total, item) => total + item.runnerReadyTasks, 0),
      runnerTasks: locales.reduce((total, item) => total + item.runnerTasks, 0),
      pendingReceiptItems: locales.reduce((total, item) => total + item.pendingReceiptItems, 0)
    },
    honestyClaim: {
      level: "local-drill",
      claim: "This drill verifies that every supported operator locale can generate coding-agent briefs, review reports, session bundles, dispatch manifests, dispatch simulations, runner manifests, assignment drills, and receipt templates without changing machine contracts.",
      limitations: [
        "It does not run a browser UI screenshot pass.",
        "It does not call model providers, external coding agents, runners, deploy targets, or Git remotes.",
        "It verifies locale contract structure and generated prompts; it does not certify human translation quality."
      ],
      productionRequirements: [
        "Review Japanese-first product copy with native speakers before production release.",
        "Capture desktop and mobile screenshots for every supported locale before a production-language release.",
        "Keep commands, paths, JSON schema keys, and evidence artifact paths stable when adding new localized UI copy."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary));

  printSummary(summary);

  if (summary.summary.failed > 0) {
    process.exitCode = 1;
  }
}

async function runLocaleDrill({
  locale,
  nativeLabel,
  board,
  outputDir,
  generatedAt
}: {
  locale: SupportedLocale;
  nativeLabel: string;
  board: ReturnType<typeof buildDevelopmentBoard>;
  outputDir: string;
  generatedAt: string;
}): Promise<LocaleDrillResult> {
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
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill,
    generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest: dispatch,
    generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit,
    generatedAt
  });
  const runnerManifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: receiptDraftPathsFor(simulation, locale),
    generatedAt
  });
  const receipt = buildCodingAgentSessionReceiptTemplate({
    bundle,
    generatedAt
  });

  const expectedLanguage = expectedLanguageByLocale[locale];
  const checks = {
    localeIsCarried:
      briefs.operatorLocale === locale &&
      review.operatorLocale === locale &&
      bundle.operatorLocale === locale &&
      drill.operatorLocale === locale &&
      receipt.operatorLocale === locale,
    promptLanguageInstruction: briefs.briefs.every((brief) =>
      brief.prompt.includes(`Operator language: ${locale}.`) &&
      brief.prompt.includes(`Write operator-facing summaries, risks, and next actions in ${expectedLanguage}.`)
    ),
    machineContractStable: briefs.briefs.every((brief) =>
      brief.prompt.includes("Keep commands, file paths, JSON schema keys, and evidence artifact paths unchanged.") &&
      brief.verificationCommands.includes("npm run test") &&
      brief.verificationCommands.includes("npm run build") &&
      brief.sandbox.allowedActions.length > 0 &&
      brief.sandbox.prohibitedActions.includes("unreviewed-git-push") &&
      brief.evidenceRequired.some((item) => item.includes("Changed files"))
    ),
    sessionContractStable:
      bundle.sessions.every((session) =>
        session.sandboxContract.boundary === "sandbox-only" &&
        session.sandboxContract.executorProfileId === session.executorProfileId &&
        session.sandboxContract.allowedActions.length > 0 &&
        session.sandboxContract.prohibitedActions.includes("unreviewed-git-push") &&
        session.sandboxContract.evidenceArtifactPrefix.startsWith("output/coding-agent/") &&
        session.sandboxContract.receiptSchema === "naikaku.coding-agent-session-receipt.v1" &&
        session.handoffMarkdown.includes("## Sandbox Contract")
      ) &&
      drill.items.every((item) =>
        item.sandboxContract.executorProfileId === item.executorProfileId &&
        item.sandboxContract.receiptSchema === "naikaku.coding-agent-session-receipt.v1"
      ),
    dispatchContractStable:
      dispatch.operatorLocale === locale &&
      dispatch.decision === "dispatchable" &&
      dispatch.summary.ready === bundle.summary.ready &&
      dispatch.summary.promptFiles === bundle.summary.ready &&
      dispatch.summary.unsafePaths === 0 &&
      dispatch.receiptTemplatePath === "receipt-template.json" &&
      dispatch.items.every((item) =>
        item.dispatchStatus === "ready-to-dispatch" &&
        item.promptPath?.startsWith("prompts/") &&
        item.receiptTemplatePath === "receipt-template.json" &&
        item.evidenceArtifactPrefix.startsWith("output/coding-agent/") &&
        item.expectedTranscriptRefs.every((ref) => ref.startsWith(item.evidenceArtifactPrefix)) &&
        item.expectedEvidenceArtifacts.every((artifact) => artifact.path.startsWith(item.evidenceArtifactPrefix))
      ),
    archiveAuditVerified:
      archive.operatorLocale === locale &&
      archiveAudit.operatorLocale === locale &&
      archiveAudit.decision === "verified" &&
      archiveAudit.summary.blockers === 0 &&
      archiveAudit.summary.missingPromptFiles === 0 &&
      archiveAudit.summary.unexpectedPromptFiles === 0,
    simulationContractStable:
      simulation.operatorLocale === locale &&
      simulation.dispatchDecision === "dispatchable" &&
      simulation.archiveAuditDecision === "verified" &&
      simulation.decision === "ready-for-real-agent" &&
      simulation.summary.readyForAgent === dispatch.summary.ready &&
      simulation.summary.receiptDraftItems === dispatch.summary.ready &&
      simulation.summary.unsafePaths === 0 &&
      simulation.items.every((item) =>
        item.simulationStatus === "ready-for-agent" &&
        item.receiptDraft?.commandResults.every((result) =>
          result.exitCode === null &&
          result.outputSummary.includes("did not run this command") &&
          Boolean(result.transcriptRef?.startsWith(item.evidenceArtifactPrefix))
        ) &&
        item.receiptDraft?.evidence.every((path) => path.startsWith(item.evidenceArtifactPrefix))
      ),
    runnerManifestContractStable:
      runnerManifest.operatorLocale === locale &&
      runnerManifest.simulationDecision === "ready-for-real-agent" &&
      runnerManifest.decision === "runner-ready" &&
      runnerManifest.summary.readyTasks === simulation.summary.readyForAgent &&
      runnerManifest.summary.runnerTasks === runnerManifest.summary.readyTasks &&
      runnerManifest.summary.receiptDraftPaths === simulation.summary.receiptDraftItems &&
      runnerManifest.summary.unsafePaths === 0 &&
      runnerManifest.items.every((item) =>
        item.status === "ready-for-runner" &&
        item.receiptDraftPath?.startsWith(`output/localization-drill/${locale}/receipt-drafts/`) &&
        item.commands.every((command) =>
          command.status === "pending-real-execution" &&
          command.exitCode === null &&
          Boolean(command.transcriptRef?.startsWith(item.evidenceArtifactPrefix))
        ) &&
        item.expectedEvidenceArtifacts.every((artifact) => artifact.path.startsWith(item.evidenceArtifactPrefix))
      ),
    copyReady: copyHasCoreStrings(locale),
    reviewReady: review.decision === "ready",
    bundleReady: bundle.decision === "ready" && bundle.summary.held === 0,
    drillAssignable: drill.decision === "assignable" && drill.summary.wouldAssign === bundle.summary.ready,
    receiptNeedsEvidence:
      receipt.decision === "needs-evidence" &&
      receipt.summary.pendingEvidence === bundle.summary.ready &&
      receipt.summary.verified === 0
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  const result: LocaleDrillResult = {
    locale,
    nativeLabel,
    htmlLang: htmlLang(locale),
    expectedLanguage,
    briefs: briefs.briefs.length,
    reviewDecision: review.decision,
    bundleDecision: bundle.decision,
    drillDecision: drill.decision,
    dispatchDecision: dispatch.decision,
    archiveAuditDecision: archiveAudit.decision,
    simulationDecision: simulation.decision,
    runnerManifestDecision: runnerManifest.decision,
    receiptDecision: receipt.decision,
    readySessions: bundle.summary.ready,
    heldSessions: bundle.summary.held,
    wouldAssign: drill.summary.wouldAssign,
    dispatchReady: dispatch.summary.ready,
    dispatchPromptFiles: dispatch.summary.promptFiles,
    simulationReadyForAgent: simulation.summary.readyForAgent,
    simulationReceiptDrafts: simulation.summary.receiptDraftItems,
    runnerReadyTasks: runnerManifest.summary.readyTasks,
    runnerTasks: runnerManifest.summary.runnerTasks,
    pendingReceiptItems: receipt.summary.pendingEvidence,
    checks,
    failures
  };

  const localeDir = path.join(outputDir, locale);
  await mkdir(localeDir, { recursive: true });
  await writeJson(path.join(localeDir, "coding-briefs.json"), briefs);
  await writeJson(path.join(localeDir, "brief-review.json"), review);
  await writeJson(path.join(localeDir, "session-bundle.json"), bundle);
  await writeJson(path.join(localeDir, "dispatch-manifest.json"), dispatch);
  await writeJson(path.join(localeDir, "dispatch-archive-audit.json"), archiveAudit);
  await writeJson(path.join(localeDir, "dispatch-simulation.json"), simulation);
  await writeJson(path.join(localeDir, "runner-manifest.json"), runnerManifest);
  await writeJson(path.join(localeDir, "session-drill.json"), drill);
  await writeJson(path.join(localeDir, "receipt-template.json"), receipt);

  return result;
}

function receiptDraftPathsFor(
  simulation: ReturnType<typeof buildCodingAgentDispatchSimulation>,
  locale: SupportedLocale
) {
  return Object.fromEntries(simulation.items
    .filter((item) => item.receiptDraft)
    .map((item, index) => [
      item.sessionId,
      `output/localization-drill/${locale}/receipt-drafts/${String(index + 1).padStart(2, "0")}-${safeFileStem(item.sessionId)}.json`
    ]));
}

function safeFileStem(value: string) {
  const stem = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "session";
}

function assertSupportedLocaleContract() {
  const actual = supportedLocales.map((locale) => locale.code);
  const expected = expectedLocaleOrder;
  if (actual.length !== expected.length || actual.some((locale, index) => locale !== expected[index])) {
    throw new Error(`Supported locales must stay Japanese-first and exactly ${expected.join(", ")}; got ${actual.join(", ")}.`);
  }
}

function copyHasCoreStrings(locale: SupportedLocale) {
  const copy = getCopy(locale);
  return [
    copy.brandSubtitle,
    copy.language,
    copy.missionTitle,
    copy.runCabinet,
    copy.releaseRehearsal.title,
    copy.codingBriefs.title,
    copy.codingBriefs.receiptTemplate,
    copy.codingBriefs.drillReady,
    copy.codingBriefs.dispatchSimulation,
    copy.codingBriefs.runnerManifest,
    copy.codingBriefs.downloadDispatchSimulationJson,
    copy.codingBriefs.downloadRunnerManifestJson,
    copy.codingBriefs.dispatchSimulationDecisionLabel("ready-for-real-agent"),
    copy.codingBriefs.runnerManifestDecisionLabel("runner-ready"),
    copy.codingBriefs.dispatchSimulationSummary(1, 0, 0),
    copy.codingBriefs.runnerManifestSummary(1, 1, 0)
  ].every((value) => value.trim().length > 0);
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function summaryMarkdown(summary: LocalizationDrillSummary) {
  return [
    "# Localization Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Default locale: ${summary.defaultLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Summary",
    "",
    `- Locales: ${summary.summary.total}`,
    `- Passed: ${summary.summary.passed}`,
    `- Failed: ${summary.summary.failed}`,
    `- Ready sessions: ${summary.summary.readySessions}`,
    `- Would assign: ${summary.summary.wouldAssign}`,
    `- Dispatch ready: ${summary.summary.dispatchReady}`,
    `- Simulation ready for agent: ${summary.summary.simulationReadyForAgent}`,
    `- Simulation receipt drafts: ${summary.summary.simulationReceiptDrafts}`,
    `- Runner ready tasks: ${summary.summary.runnerReadyTasks}`,
    `- Runner tasks: ${summary.summary.runnerTasks}`,
    `- Pending receipt items: ${summary.summary.pendingReceiptItems}`,
    "",
    "## Locale Results",
    "",
    ...summary.locales.flatMap((item) => [
      `### ${item.locale} / ${item.nativeLabel}`,
      "",
      `- HTML lang: ${item.htmlLang}`,
      `- Expected operator language: ${item.expectedLanguage}`,
      `- Briefs: ${item.briefs}`,
      `- Review: ${item.reviewDecision}`,
      `- Bundle: ${item.bundleDecision} (${item.readySessions} ready, ${item.heldSessions} held)`,
      `- Drill: ${item.drillDecision} (${item.wouldAssign} would assign)`,
      `- Dispatch: ${item.dispatchDecision} (${item.dispatchReady} ready, ${item.dispatchPromptFiles} prompt files)`,
      `- Archive audit: ${item.archiveAuditDecision}`,
      `- Simulation: ${item.simulationDecision} (${item.simulationReadyForAgent} ready, ${item.simulationReceiptDrafts} receipt drafts)`,
      `- Runner manifest: ${item.runnerManifestDecision} (${item.runnerReadyTasks} ready, ${item.runnerTasks} runner tasks)`,
      `- Receipt: ${item.receiptDecision} (${item.pendingReceiptItems} pending)`,
      `- Failures: ${item.failures.length ? item.failures.join(", ") : "none"}`,
      ""
    ]),
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function relativeOutputDir(outputDir: string) {
  const relative = path.relative(process.cwd(), outputDir);
  return relative && !relative.startsWith("..") ? relative : outputDir;
}

function parseArgs(args: string[]): LocalizationDrillOptions {
  const options: LocalizationDrillOptions = {
    outputDir: "output/localization-drill",
    generatedAt: new Date().toISOString(),
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

function printHelp() {
  console.log(`Usage: npm run localization:drill -- [options]

Options:
  --out <dir>             Output directory. Default: output/localization-drill
  --generated-at <iso>    Stable generatedAt timestamp.
  -h, --help              Show this help.

The drill verifies Japanese-first locale order and runs the coding-agent handoff,
dispatch archive audit, dispatch simulation, and runner manifest chain for ja,
en, zh-Hans, zh-Hant, and ko without executing real agents.`);
}

function printSummary(summary: LocalizationDrillSummary) {
  console.log("Localization drill:", summary.summary.failed ? "failed" : "passed");
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Locales: ${summary.summary.passed}/${summary.summary.total} passed`);
  for (const item of summary.locales) {
    const status = item.failures.length ? "fail" : "pass";
    console.log(
      `[${status}] ${item.locale}: ${item.briefs} briefs, ${item.readySessions} ready sessions, ` +
      `${item.wouldAssign} would assign, ${item.dispatchReady} dispatch ready, ` +
      `${item.simulationReadyForAgent} simulation ready, ${item.runnerTasks} runner tasks, receipt ${item.receiptDecision}` +
      (item.failures.length ? `, failures: ${item.failures.join(", ")}` : "")
    );
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown localization drill failure.");
  process.exitCode = 1;
});
