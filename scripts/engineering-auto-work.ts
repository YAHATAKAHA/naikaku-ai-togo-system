import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  externalRunnerAdapterIds,
  type ExternalRunnerAdapterId
} from "../src/domain/externalRunnerAdapters";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

interface EngineeringAutoWorkOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  adapterId: ExternalRunnerAdapterId;
  adapterReady: boolean;
  commandOverride: string | null;
  argOverride: string[];
  maxJobs: number;
  timeoutMs: number;
  worktreeDir: string;
  requireReceipt: boolean;
  generatedAt: string;
  help: boolean;
}

interface CommandRun {
  label: string;
  command: string;
  exitCode: number;
  durationMs: number;
}

interface EngineeringAutoWorkSummary {
  schema: "naikaku.engineering-auto-work.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  locale: SupportedLocale;
  adapterId: ExternalRunnerAdapterId;
  mode: "prepared-only" | "external-run-attempted";
  commandOverride: string | null;
  maxJobs: number;
  worktreeDir: string;
  commands: CommandRun[];
  decisions: {
    simulation: string;
    handoff: string;
    adapterRun: string;
    adapterReview: string;
  };
  claims: {
    handoffPrepared: boolean;
    adapterMarkedReadyForThisRun: boolean;
    externalRunnerStarted: boolean;
    externalReceiptImported: boolean;
    implementationEvidenceAccepted: boolean;
    artifactAuditVerified: boolean;
    completion: boolean;
    macDesktopControl: boolean;
    gitPushOrDeploy: boolean;
  };
  counts: {
    handoffTaskFiles: number;
    handoffJobFiles: number;
    handoffReadyTaskFiles: number;
    adapterJobs: number;
    adapterCompletedJobs: number;
    adapterReviewReadyJobs: number;
    importedReceipts: number;
    verifiedReceipts: number;
    acceptedEvidence: number;
    verifiedArtifactPaths: number;
  };
  files: {
    simulationSummary: string;
    handoffSummary: string;
    adapterRunSummary: string | null;
    adapterReviewSummary: string | null;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    claim: string;
    limitations: string[];
    nextActions: string[];
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const simulationDir = path.join(outputDir, "simulate");
  const handoffDir = path.join(outputDir, "handoff");
  const adapterRunDir = path.join(outputDir, "adapter-run");
  const adapterReviewDir = path.join(outputDir, "adapter-review");
  const mission = await missionFrom(options);
  const commandRuns: CommandRun[] = [];

  await mkdir(outputDir, { recursive: true });

  commandRuns.push(await runCommand({
    label: "engineering-simulate",
    args: [
      "exec",
      "--",
      "tsx",
      "scripts/engineering-simulate.ts",
      "--mission",
      mission,
      "--locale",
      options.locale,
      "--out",
      relativePath(simulationDir),
      "--generated-at",
      options.generatedAt
    ]
  }));
  commandRuns.push(await runCommand({
    label: "engineering-handoff",
    args: [
      "exec",
      "--",
      "tsx",
      "scripts/engineering-handoff.ts",
      "--input",
      relativePath(simulationDir),
      "--out",
      relativePath(handoffDir),
      "--adapter",
      options.adapterId,
      ...(options.adapterReady ? [
        "--license-reviewed",
        options.adapterId,
        "--installed",
        options.adapterId,
        "--approved",
        options.adapterId
      ] : []),
      "--generated-at",
      options.generatedAt
    ]
  }));

  const simulation = await readJsonIfExists<{
    decisions: { selfSimulation: string; launchQueue: string };
    capabilities: { canControlMacDesktop: boolean };
  }>(path.join(simulationDir, "summary.json"));
  const handoff = await readJsonIfExists<{
    decision: string;
    canStartExternalRunner: boolean;
    summary: {
      handoffTaskFiles: number;
      adapterJobFiles: number;
      readyTaskFiles: number;
    };
  }>(path.join(handoffDir, "summary.json"));
  const shouldRunExternal = Boolean(options.commandOverride);
  const canRunExternal = Boolean(shouldRunExternal && handoff?.canStartExternalRunner);

  if (canRunExternal) {
    commandRuns.push(await runCommand({
      label: "engineering-run-adapter",
      args: [
        "exec",
        "--",
        "tsx",
        "scripts/engineering-run-adapter.ts",
        "--handoff",
        relativePath(handoffDir),
        "--out",
        relativePath(adapterRunDir),
        "--max-jobs",
        String(options.maxJobs),
        "--timeout-ms",
        String(options.timeoutMs),
        "--command",
        options.commandOverride || "",
        ...options.argOverride.flatMap((arg) => ["--arg", arg]),
        ...(options.requireReceipt ? ["--require-receipt"] : []),
        "--generated-at",
        options.generatedAt
      ]
    }));
  }

  const adapterRun = await readJsonIfExists<{
    summary: {
      total: number;
      completed: number;
      readyForImplementationReview: number;
    };
  }>(path.join(adapterRunDir, "summary.json"));
  const shouldReviewAdapter = Boolean(adapterRun && adapterRun.summary.readyForImplementationReview > 0);

  if (shouldReviewAdapter) {
    commandRuns.push(await runCommand({
      label: "engineering-review-adapter-run",
      args: [
        "exec",
        "--",
        "tsx",
        "scripts/engineering-review-adapter-run.ts",
        "--bundle",
        relativePath(path.join(simulationDir, "session-bundle.json")),
        "--adapter-run",
        relativePath(path.join(adapterRunDir, "summary.json")),
        "--out",
        relativePath(adapterReviewDir),
        "--worktree",
        options.worktreeDir,
        "--generated-at",
        options.generatedAt
      ]
    }));
  }

  const adapterReview = await readJsonIfExists<{
    receipt: { decision: string; verified: number };
    evidence: { decision: string; accepted: number };
    artifactAudit: { decision: string; verifiedPaths: number };
    adapterReceipts: { loadedReceipts: number; reviewReadyJobs: number };
    checks: Record<string, boolean>;
  }>(path.join(adapterReviewDir, "summary.json"));
  const summary = buildSummary({
    options,
    outputDir,
    mission,
    commandRuns,
    simulation,
    handoff,
    shouldRunExternal,
    canRunExternal,
    adapterRun,
    adapterReview,
    simulationDir,
    handoffDir,
    adapterRunDir,
    adapterReviewDir
  });

  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 2;
  }
}

function buildSummary({
  options,
  outputDir,
  mission,
  commandRuns,
  simulation,
  handoff,
  shouldRunExternal,
  canRunExternal,
  adapterRun,
  adapterReview,
  simulationDir,
  handoffDir,
  adapterRunDir,
  adapterReviewDir
}: {
  options: EngineeringAutoWorkOptions;
  outputDir: string;
  mission: string;
  commandRuns: CommandRun[];
  simulation: {
    decisions: { selfSimulation: string; launchQueue: string };
    capabilities: { canControlMacDesktop: boolean };
  } | null;
  handoff: {
    decision: string;
    canStartExternalRunner: boolean;
    summary: {
      handoffTaskFiles: number;
      adapterJobFiles: number;
      readyTaskFiles: number;
    };
  } | null;
  shouldRunExternal: boolean;
  canRunExternal: boolean;
  adapterRun: {
    summary: {
      total: number;
      completed: number;
      readyForImplementationReview: number;
    };
  } | null;
  adapterReview: {
    receipt: { decision: string; verified: number };
    evidence: { decision: string; accepted: number };
    artifactAudit: { decision: string; verifiedPaths: number };
    adapterReceipts: { loadedReceipts: number; reviewReadyJobs: number };
    checks: Record<string, boolean>;
  } | null;
  simulationDir: string;
  handoffDir: string;
  adapterRunDir: string;
  adapterReviewDir: string;
}): EngineeringAutoWorkSummary {
  const adapterReviewPassed = adapterReview
    ? Object.values(adapterReview.checks).every(Boolean)
    : false;
  const checks = {
    simulationSucceeded: Boolean(simulation),
    handoffPrepared: Boolean(handoff && handoff.summary.handoffTaskFiles > 0),
    externalRunOnlyWhenRequested: shouldRunExternal ? canRunExternal : true,
    adapterRunCompletedWhenRequested: shouldRunExternal
      ? Boolean(adapterRun && adapterRun.summary.completed > 0)
      : true,
    adapterReceiptReadyWhenRequested: shouldRunExternal
      ? Boolean(adapterRun && adapterRun.summary.readyForImplementationReview > 0)
      : true,
    adapterReviewVerifiedWhenReceiptReturned: adapterRun?.summary.readyForImplementationReview
      ? Boolean(adapterReview && adapterReviewPassed)
      : !shouldRunExternal,
    noStageCommandFailures: commandRuns.every((run) => run.exitCode === 0)
  };

  return {
    schema: "naikaku.engineering-auto-work.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission,
    locale: options.locale,
    adapterId: options.adapterId,
    mode: shouldRunExternal ? "external-run-attempted" : "prepared-only",
    commandOverride: options.commandOverride,
    maxJobs: options.maxJobs,
    worktreeDir: options.worktreeDir,
    commands: commandRuns,
    decisions: {
      simulation: simulation ? `${simulation.decisions.selfSimulation}/${simulation.decisions.launchQueue}` : "missing",
      handoff: handoff?.decision ?? "missing",
      adapterRun: adapterRun
        ? `${adapterRun.summary.completed}/${adapterRun.summary.total} completed`
        : shouldRunExternal ? "not-run" : "not-requested",
      adapterReview: adapterReview?.artifactAudit.decision ?? (adapterRun ? "not-ready" : "not-requested")
    },
    claims: {
      handoffPrepared: Boolean(handoff && handoff.summary.handoffTaskFiles > 0),
      adapterMarkedReadyForThisRun: options.adapterReady,
      externalRunnerStarted: Boolean(adapterRun && adapterRun.summary.total > 0),
      externalReceiptImported: Boolean(adapterReview && adapterReview.adapterReceipts.loadedReceipts > 0),
      implementationEvidenceAccepted: adapterReview?.evidence.decision === "accepted-for-handoff",
      artifactAuditVerified: adapterReview?.artifactAudit.decision === "verified",
      completion: false,
      macDesktopControl: false,
      gitPushOrDeploy: false
    },
    counts: {
      handoffTaskFiles: handoff?.summary.handoffTaskFiles ?? 0,
      handoffJobFiles: handoff?.summary.adapterJobFiles ?? 0,
      handoffReadyTaskFiles: handoff?.summary.readyTaskFiles ?? 0,
      adapterJobs: adapterRun?.summary.total ?? 0,
      adapterCompletedJobs: adapterRun?.summary.completed ?? 0,
      adapterReviewReadyJobs: adapterRun?.summary.readyForImplementationReview ?? 0,
      importedReceipts: adapterReview?.adapterReceipts.loadedReceipts ?? 0,
      verifiedReceipts: adapterReview?.receipt.verified ?? 0,
      acceptedEvidence: adapterReview?.evidence.accepted ?? 0,
      verifiedArtifactPaths: adapterReview?.artifactAudit.verifiedPaths ?? 0
    },
    files: {
      simulationSummary: relativePath(path.join(simulationDir, "summary.json")),
      handoffSummary: relativePath(path.join(handoffDir, "summary.json")),
      adapterRunSummary: adapterRun ? relativePath(path.join(adapterRunDir, "summary.json")) : null,
      adapterReviewSummary: adapterReview ? relativePath(path.join(adapterReviewDir, "summary.json")) : null
    },
    checks,
    honestyClaim: {
      claim: "This command chains mission simulation, external-runner handoff, optional user-installed CLI execution, and automatic receipt/evidence/artifact review.",
      limitations: [
        "It does not install upstream runners or review third-party licenses for the operator.",
        "The --adapter-ready flag records this adapter as installed, license-reviewed, and approved only for this local run.",
        "It does not grant macOS desktop control, push Git, deploy, send messages, or claim project completion.",
        "External implementation is accepted only when the runner writes a fresh Naikaku receipt and artifact audit verifies local evidence."
      ],
      nextActions: shouldRunExternal
        ? [
            "Inspect adapter-run and adapter-review summaries.",
            "Run release verification before accepting real Development Board completion."
          ]
        : [
            "Add --adapter-ready --command <cli> --arg ... to launch a user-installed adapter.",
            "Keep --max-jobs 1 until the adapter reliably returns Naikaku receipts."
          ]
    }
  };
}

async function runCommand({
  label,
  args
}: {
  label: string;
  args: string[];
}): Promise<CommandRun> {
  const startedAt = Date.now();
  const command = ["npm", ...args].join(" ");

  return new Promise((resolve) => {
    const child = spawn("npm", args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "1"
      }
    });

    child.on("close", (code) => {
      resolve({
        label,
        command,
        exitCode: code ?? 1,
        durationMs: Date.now() - startedAt
      });
    });
    child.on("error", () => {
      resolve({
        label,
        command,
        exitCode: 1,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

async function missionFrom(options: EngineeringAutoWorkOptions) {
  if (options.missionFile) {
    return (await readFile(path.resolve(options.missionFile), "utf8")).trim();
  }
  if (options.mission?.trim()) return options.mission.trim();
  return "Prepare a governed external-runner coding task, run the adapter when configured, and review returned evidence.";
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function summaryMarkdown(summary: EngineeringAutoWorkSummary) {
  return [
    "# Engineering Auto Work",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Locale: ${summary.locale}`,
    `Adapter: ${summary.adapterId}`,
    `Mode: ${summary.mode}`,
    `Mission: ${summary.mission}`,
    "",
    "## Decisions",
    "",
    ...Object.entries(summary.decisions).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Claims",
    "",
    ...Object.entries(summary.claims).map(([key, value]) => `- ${key}: ${value ? "yes" : "no"}`),
    "",
    "## Counts",
    "",
    ...Object.entries(summary.counts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Commands",
    "",
    ...summary.commands.map((item) =>
      `- ${item.label}: exit ${item.exitCode}, ${item.durationMs}ms, \`${item.command}\``
    ),
    "",
    "## Files",
    "",
    ...Object.entries(summary.files).map(([key, value]) => `- ${key}: ${value ?? "not-written"}`),
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([key, value]) => `- ${value ? "pass" : "fail"}: ${key}`),
    "",
    "## Honesty Boundary",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.nextActions.map((item) => `- Next action: ${item}`)
  ].join("\n");
}

function printSummary(summary: EngineeringAutoWorkSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;

  console.log("Engineering auto work complete.");
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- mode: ${summary.mode}`);
  console.log(`- handoff: ${summary.decisions.handoff}`);
  console.log(`- adapter run: ${summary.decisions.adapterRun}`);
  console.log(`- adapter review: ${summary.decisions.adapterReview}`);
  console.log(`- imported receipts: ${summary.counts.importedReceipts}`);
  console.log(`- accepted evidence: ${summary.counts.acceptedEvidence}`);
  console.log(`- artifact paths verified: ${summary.counts.verifiedArtifactPaths}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): EngineeringAutoWorkOptions {
  const options: EngineeringAutoWorkOptions = {
    mission: null,
    missionFile: null,
    outputDir: "output/engineering-auto-work",
    locale: "ja",
    adapterId: "openhands-coding-agent",
    adapterReady: false,
    commandOverride: null,
    argOverride: [],
    maxJobs: 1,
    timeoutMs: 180_000,
    worktreeDir: ".",
    requireReceipt: true,
    generatedAt: new Date().toISOString(),
    help: false
  };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--mission" || arg === "-m") {
      options.mission = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--mission-file") {
      options.missionFile = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--locale") {
      options.locale = parseLocale(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--adapter") {
      options.adapterId = parseAdapterId(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--adapter-ready") {
      options.adapterReady = true;
    } else if (arg === "--command") {
      options.commandOverride = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--arg") {
      options.argOverride.push(requireArgValue(args, index, arg));
      index += 1;
    } else if (arg === "--max-jobs") {
      options.maxJobs = Number(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--worktree") {
      options.worktreeDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--no-require-receipt") {
      options.requireReceipt = false;
    } else if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
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

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function requireArgValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (typeof value !== "string") {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function parseAdapterId(value: string): ExternalRunnerAdapterId {
  if (externalRunnerAdapterIds.includes(value as ExternalRunnerAdapterId)) {
    return value as ExternalRunnerAdapterId;
  }
  throw new Error(`Unsupported adapter id: ${value}. Use one of ${externalRunnerAdapterIds.join(", ")}.`);
}

function parseLocale(value: string): SupportedLocale {
  if (supportedLocales.some((locale) => locale.code === value)) {
    return value as SupportedLocale;
  }
  throw new Error(`Unsupported locale: ${value}. Use one of ${supportedLocales.map((item) => item.code).join(", ")}.`);
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:auto-work -- --mission \"Implement X and run npm test\"",
    "",
    "Prepared-only mode:",
    "  npm run engineering:auto-work -- --mission \"Implement X\"",
    "",
    "External CLI mode:",
    "  npm run engineering:auto-work -- --mission \"Implement X\" --adapter-ready --command openhands --arg --always-approve --arg -f --arg {taskPath}",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory. Default: output/engineering-auto-work.",
    `  --adapter <id>             Adapter id. Default: openhands-coding-agent.`,
    "  --adapter-ready            Record selected adapter as installed, license-reviewed, and approved for this run.",
    "  --command <cmd>            User-installed external runner CLI to invoke.",
    "  --arg <arg>                Repeatable runner arg. Supports {jobPath}, {taskPath}, {receiptDraftPath}, {sessionId}.",
    "  --max-jobs <number>        Max adapter jobs to launch. Default: 1.",
    "  --worktree <dir>           Git worktree for changed-file audit. Default: current repo.",
    "  --timeout-ms <number>      Per-adapter command timeout. Default: 180000.",
    "  --no-require-receipt       Do not fail adapter execution when a receipt is missing.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This command is the simplest non-interactive path from mission text to external CLI adapter execution and receipt review. It does not install tools, grant Mac control, commit, push, deploy, or call providers."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering auto-work failure.");
  process.exitCode = 1;
});
