import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchive";
import { buildCodingAgentDispatchManifest } from "../src/domain/codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "../src/domain/codingAgentDispatchSimulation";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentRunnerIntakeAudit } from "../src/domain/codingAgentRunnerIntakeAudit";
import { buildCodingAgentRunnerInvocationPackage } from "../src/domain/codingAgentRunnerInvocation";
import { buildCodingAgentRunnerManifest } from "../src/domain/codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "../src/domain/codingAgentRunnerSelfTest";
import { buildCodingAgentSandboxRunnerPreflight } from "../src/domain/codingAgentSandboxRunnerPreflight";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { buildEngineeringExecutionReceipt } from "../src/domain/engineeringExecutionReceipt";
import { buildEngineeringLaunchProfile } from "../src/domain/engineeringLaunchProfile";
import { buildEngineeringLaunchQueue } from "../src/domain/engineeringLaunchQueue";
import { buildEngineeringMacRunnerContract } from "../src/domain/engineeringMacRunnerContract";
import { buildEngineeringMacRunnerReadiness } from "../src/domain/engineeringMacRunnerReadiness";
import { buildEngineeringSelfSimulationReport } from "../src/domain/engineeringSelfSimulation";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

interface EngineeringSimulateOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  generatedAt: string;
  help: boolean;
}

interface EngineeringSimulateSummary {
  schema: "naikaku.engineering-cli-simulation.v1";
  generatedAt: string;
  outputDir: string;
  locale: SupportedLocale;
  missionFingerprint: string;
  decisions: {
    launchProfile: string;
    dispatch: string;
    runnerManifest: string;
    runnerInvocation: string;
    runnerIntake: string;
    runnerSelfTest: string;
    sandboxPreflight: string;
    launchQueue: string;
    selfSimulation: string;
    executionReceipt: string;
    macReadiness: string;
    macContract: string;
  };
  capabilities: {
    canPrepareEngineering: boolean;
    canRunLocalSandbox: boolean;
    canClaimCompletion: boolean;
    canControlMacDesktop: boolean;
    canExecuteMacWithoutApproval: boolean;
  };
  counts: {
    briefs: number;
    readySessions: number;
    runnerTasks: number;
    allowedCommands: number;
    blockedCommands: number;
    expectedEvidenceArtifacts: number;
    macActions: number;
  };
  files: Record<string, string>;
  honestyClaim: {
    claim: string;
    limitations: string[];
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativeOutputDir(outputDir);
  const mission = await missionFrom(options);
  const workspace = {
    ...createDefaultWorkspace(),
    mission
  };
  const activeRoles = workspace.roles.filter((role) => role.enabled).length;

  await mkdir(outputDir, { recursive: true });

  const teamHandoff = buildTeamHandoff({
    workspace,
    generatedAt: options.generatedAt
  });
  const board = buildDevelopmentBoard({
    handoff: teamHandoff,
    generatedAt: options.generatedAt
  });
  const briefs = buildCodingAgentBriefs({
    board,
    operatorLocale: options.locale,
    generatedAt: options.generatedAt
  });
  const review = buildCodingAgentBriefReview({
    briefs,
    generatedAt: options.generatedAt
  });
  const bundle = buildCodingAgentSessionBundle({
    briefs,
    review,
    generatedAt: options.generatedAt
  });
  const drill = buildCodingAgentSessionDrill({
    bundle,
    generatedAt: options.generatedAt
  });
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill,
    generatedAt: options.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest: dispatch,
    generatedAt: options.generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: options.generatedAt
  });
  const dispatchSimulation = buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit,
    generatedAt: options.generatedAt
  });
  const runnerManifest = buildCodingAgentRunnerManifest({
    simulation: dispatchSimulation,
    receiptDraftPaths: receiptDraftPathsFor(dispatchSimulation, outputRelativeDir),
    generatedAt: options.generatedAt
  });
  const runnerInvocation = buildCodingAgentRunnerInvocationPackage({
    manifest: runnerManifest,
    invocationBasePath: `${outputRelativeDir}/runner-invocations`,
    generatedAt: options.generatedAt
  });
  const runnerIntake = buildCodingAgentRunnerIntakeAudit({
    invocationPackage: runnerInvocation,
    generatedAt: options.generatedAt
  });
  const runnerSelfTest = buildCodingAgentRunnerSelfTest({
    manifest: runnerManifest,
    generatedAt: options.generatedAt
  });
  const sandboxPreflight = buildCodingAgentSandboxRunnerPreflight({
    selfTest: runnerSelfTest,
    bundle,
    generatedAt: options.generatedAt
  });
  const launchQueue = buildEngineeringLaunchQueue({
    runnerManifest,
    runnerInvocation,
    runnerIntake,
    runnerSelfTest,
    sandboxRunnerPreflight: sandboxPreflight,
    generatedAt: options.generatedAt
  });
  const executionReceipt = buildEngineeringExecutionReceipt({
    launchQueue,
    generatedAt: options.generatedAt
  });
  const profile = buildEngineeringLaunchProfile({
    mission,
    activeRoles,
    briefs,
    sessionBundle: bundle,
    runnerManifest,
    runnerSelfTest,
    sandboxRunnerPreflight: sandboxPreflight,
    generatedAt: options.generatedAt
  });
  const selfSimulation = buildEngineeringSelfSimulationReport({
    profile,
    briefs,
    sessionBundle: bundle,
    dispatchSimulation,
    runnerManifest,
    runnerSelfTest,
    sandboxRunnerPreflight: sandboxPreflight,
    generatedAt: options.generatedAt
  });
  const macReadiness = buildEngineeringMacRunnerReadiness({
    profile,
    selfSimulation,
    launchQueue,
    executionReceipt,
    generatedAt: options.generatedAt
  });
  const macContract = buildEngineeringMacRunnerContract({
    profile,
    readiness: macReadiness,
    generatedAt: options.generatedAt
  });
  const files = {
    summary: "summary.json",
    markdown: "summary.md",
    launchProfile: "launch-profile.json",
    selfSimulation: "self-simulation.json",
    launchQueue: "launch-queue.json",
    executionReceipt: "execution-receipt.json",
    macReadiness: "mac-runner-readiness.json",
    macContract: "mac-runner-contract.json",
    sessionBundle: "session-bundle.json",
    runnerManifest: "runner-manifest.json",
    runnerInvocation: "runner-invocation.json",
    runnerSelfTest: "runner-self-test.json",
    sandboxPreflight: "sandbox-preflight.json"
  };
  const summary: EngineeringSimulateSummary = {
    schema: "naikaku.engineering-cli-simulation.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    locale: options.locale,
    missionFingerprint: profile.missionFingerprint,
    decisions: {
      launchProfile: profile.stage,
      dispatch: dispatch.decision,
      runnerManifest: runnerManifest.decision,
      runnerInvocation: runnerInvocation.decision,
      runnerIntake: runnerIntake.decision,
      runnerSelfTest: runnerSelfTest.decision,
      sandboxPreflight: sandboxPreflight.decision,
      launchQueue: launchQueue.decision,
      selfSimulation: selfSimulation.decision,
      executionReceipt: executionReceipt.decision,
      macReadiness: macReadiness.decision,
      macContract: macContract.decision
    },
    capabilities: {
      canPrepareEngineering: selfSimulation.capabilityGap.canPrepareEngineering,
      canRunLocalSandbox: launchQueue.canRunLocalVerification,
      canClaimCompletion: executionReceipt.canClaimCompletion,
      canControlMacDesktop: macReadiness.canControlMacDesktop,
      canExecuteMacWithoutApproval: macContract.canExecuteWithoutApproval
    },
    counts: {
      briefs: briefs.summary.total,
      readySessions: bundle.summary.ready,
      runnerTasks: runnerManifest.summary.runnerTasks,
      allowedCommands: sandboxPreflight.summary.allowedCommands,
      blockedCommands: sandboxPreflight.summary.blockedCommands,
      expectedEvidenceArtifacts: sandboxPreflight.summary.expectedEvidenceArtifacts,
      macActions: macContract.summary.totalActions
    },
    files,
    honestyClaim: {
      claim: "This CLI prepares supervised engineering contracts and self-simulation artifacts without editing code, running commands, controlling the Mac, committing, pushing, deploying, or sending external messages.",
      limitations: [
        "Runner-ready means handoff contracts are prepared; it is not proof that implementation work ran.",
        "Completion remains unclaimable until a real runner returns receipts, changed files, transcripts, and evidence.",
        "Mac desktop control and external writes stay blocked or approval-gated."
      ]
    }
  };

  await writeJson(path.join(outputDir, files.summary), summary);
  await writeFile(path.join(outputDir, files.markdown), summaryMarkdown(summary), "utf8");
  await writeJson(path.join(outputDir, files.launchProfile), profile);
  await writeJson(path.join(outputDir, files.selfSimulation), selfSimulation);
  await writeJson(path.join(outputDir, files.launchQueue), launchQueue);
  await writeJson(path.join(outputDir, files.executionReceipt), executionReceipt);
  await writeJson(path.join(outputDir, files.macReadiness), macReadiness);
  await writeJson(path.join(outputDir, files.macContract), macContract);
  await writeJson(path.join(outputDir, files.sessionBundle), bundle);
  await writeJson(path.join(outputDir, files.runnerManifest), runnerManifest);
  await writeJson(path.join(outputDir, files.runnerInvocation), runnerInvocation);
  await writeJson(path.join(outputDir, files.runnerSelfTest), runnerSelfTest);
  await writeJson(path.join(outputDir, files.sandboxPreflight), sandboxPreflight);

  printSummary(summary);

  if (!summary.capabilities.canPrepareEngineering || summary.counts.blockedCommands > 0) {
    process.exitCode = 2;
  }
}

function receiptDraftPathsFor(
  simulation: ReturnType<typeof buildCodingAgentDispatchSimulation>,
  outputRelativeDir: string
) {
  return Object.fromEntries(
    simulation.items
      .filter((item) => item.receiptDraft)
      .map((item) => [
        item.sessionId,
        `${outputRelativeDir}/receipts/${safeFileStem(item.sessionId)}.json`
      ])
  );
}

async function missionFrom(options: EngineeringSimulateOptions) {
  if (options.missionFile) {
    const fileMission = await readFile(path.resolve(options.missionFile), "utf8");
    return fileMission.trim();
  }
  if (options.mission?.trim()) return options.mission.trim();
  return createDefaultWorkspace().mission;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function summaryMarkdown(summary: EngineeringSimulateSummary) {
  return [
    "# Engineering CLI Simulation",
    "",
    `Generated: ${summary.generatedAt}`,
    `Locale: ${summary.locale}`,
    `Output: ${summary.outputDir}`,
    `Mission fingerprint: ${summary.missionFingerprint}`,
    "",
    "## Decisions",
    "",
    ...Object.entries(summary.decisions).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Capabilities",
    "",
    ...Object.entries(summary.capabilities).map(([key, value]) => `- ${key}: ${value ? "yes" : "no"}`),
    "",
    "## Counts",
    "",
    ...Object.entries(summary.counts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Files",
    "",
    ...Object.entries(summary.files).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Honesty Boundary",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`)
  ].join("\n");
}

function printSummary(summary: EngineeringSimulateSummary) {
  console.log("Engineering CLI simulation complete.");
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- self-simulation: ${summary.decisions.selfSimulation}`);
  console.log(`- launch queue: ${summary.decisions.launchQueue}`);
  console.log(`- can run local sandbox: ${summary.capabilities.canRunLocalSandbox ? "yes" : "no"}`);
  console.log(`- can claim completion: ${summary.capabilities.canClaimCompletion ? "yes" : "no"}`);
  console.log(`- can control Mac desktop: ${summary.capabilities.canControlMacDesktop ? "yes" : "no"}`);
  console.log(`- mac actions: ${summary.counts.macActions}`);
}

function parseArgs(args: string[]): EngineeringSimulateOptions {
  const options: EngineeringSimulateOptions = {
    mission: null,
    missionFile: null,
    outputDir: "output/engineering-simulate",
    locale: "ja",
    generatedAt: new Date().toISOString(),
    help: false
  };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--mission" || arg === "-m") {
      options.mission = args[index + 1] || "";
      index += 1;
    } else if (arg === "--mission-file") {
      options.missionFile = args[index + 1] || "";
      index += 1;
    } else if (arg === "--out") {
      options.outputDir = args[index + 1] || options.outputDir;
      index += 1;
    } else if (arg === "--locale") {
      options.locale = parseLocale(args[index + 1] || options.locale);
      index += 1;
    } else if (arg === "--generated-at") {
      options.generatedAt = args[index + 1] || options.generatedAt;
      index += 1;
    } else {
      positional.push(arg);
    }
  }

  if (!options.mission && positional.length) {
    options.mission = positional.join(" ");
  }

  return options;
}

function parseLocale(value: string): SupportedLocale {
  if (supportedLocales.some((locale) => locale.code === value)) {
    return value as SupportedLocale;
  }
  throw new Error(`Unsupported locale: ${value}. Use one of ${supportedLocales.map((item) => item.code).join(", ")}.`);
}

function relativeOutputDir(outputDir: string) {
  const relative = path.relative(process.cwd(), outputDir).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : outputDir.replace(/\\/g, "/");
}

function safeFileStem(value: string) {
  const stem = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "session";
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:simulate -- --mission \"Implement feature and run npm test\"",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory. Default: output/engineering-simulate.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This command prepares contracts and self-simulation artifacts only. It does not edit files, run implementation commands, control macOS, commit, push, deploy, or send messages."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering simulation failure.");
  process.exitCode = 1;
});
