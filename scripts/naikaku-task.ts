import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

type TaskMode = "prepare" | "self-test" | "runner";

interface NaikakuTaskOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  mode: TaskMode | null;
  selfTest: boolean;
  runnerPreset: string | null;
  adapterReady: boolean;
  worktreeDir: string | null;
  timeoutMs: number;
  generatedAt: string;
  help: boolean;
}

interface CommandRun {
  label: string;
  command: string;
  exitCode: number;
  durationMs: number;
}

interface AutoWorkSummary {
  mode?: "prepared-only" | "external-run-attempted";
  runnerPreset?: string | null;
  adapterId?: string;
  decisions?: {
    handoff?: string;
    adapterRun?: string;
    adapterReview?: string;
  };
  claims?: {
    handoffPrepared?: boolean;
    externalRunnerStarted?: boolean;
    externalReceiptImported?: boolean;
    implementationEvidenceAccepted?: boolean;
    artifactAuditVerified?: boolean;
    completion?: boolean;
    macDesktopControl?: boolean;
    gitPushOrDeploy?: boolean;
  };
  counts?: {
    handoffTaskFiles?: number;
    handoffJobFiles?: number;
    handoffReadyTaskFiles?: number;
    adapterCompletedJobs?: number;
    importedReceipts?: number;
    acceptedEvidence?: number;
    verifiedArtifactPaths?: number;
  };
  files?: {
    simulationSummary?: string;
    handoffSummary?: string;
    adapterRunSummary?: string | null;
    adapterReviewSummary?: string | null;
  };
  checks?: Record<string, boolean>;
}

interface NaikakuTaskSummary {
  schema: "naikaku.task-entry.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  locale: SupportedLocale;
  mode: TaskMode;
  runnerPreset: string | null;
  command: CommandRun;
  autoWorkSummaryPath: string;
  decisions: {
    handoff: string;
    adapterRun: string;
    adapterReview: string;
  };
  counts: {
    handoffTaskFiles: number;
    handoffJobFiles: number;
    handoffReadyTaskFiles: number;
    adapterCompletedJobs: number;
    importedReceipts: number;
    acceptedEvidence: number;
    verifiedArtifactPaths: number;
  };
  claims: {
    handoffPrepared: boolean;
    externalRunnerStarted: boolean;
    externalReceiptImported: boolean;
    implementationEvidenceAccepted: boolean;
    artifactAuditVerified: boolean;
    completion: boolean;
    macDesktopControl: boolean;
    gitPushOrDeploy: boolean;
  };
  files: {
    autoWorkSummary: string;
    handoffSummary: string | null;
    adapterRunSummary: string | null;
    adapterReviewSummary: string | null;
  };
  checks: {
    autoWorkExitedZero: boolean;
    handoffPrepared: boolean;
    prepareModeDidNotStartRunner: boolean;
    requestedRunnerStarted: boolean;
    requestedReceiptImported: boolean;
    noCompletionClaim: boolean;
    noMacDesktopControl: boolean;
    noGitPushOrDeploy: boolean;
    autoWorkChecksPassed: boolean;
  };
  nextActions: string[];
  claimBoundary: string[];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const mission = await missionFrom(options);
  const mode = modeFor(options);
  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);
  const autoWorkDir = path.join(outputDir, "auto-work");
  const autoWorkArgs = buildAutoWorkArgs({ options, mission, mode, autoWorkDir });
  await mkdir(outputDir, { recursive: true });

  const command = await runCommand({
    label: "engineering-auto-work",
    args: autoWorkArgs
  });
  const autoWorkSummaryPath = path.join(autoWorkDir, "summary.json");
  const autoWork = await readJsonIfExists<AutoWorkSummary>(autoWorkSummaryPath);
  const summary = buildSummary({
    options,
    mission,
    mode,
    outputDir,
    autoWorkDir,
    autoWork,
    command
  });

  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function buildAutoWorkArgs({
  options,
  mission,
  mode,
  autoWorkDir
}: {
  options: NaikakuTaskOptions;
  mission: string;
  mode: TaskMode;
  autoWorkDir: string;
}) {
  const worktree = options.worktreeDir || path.join(options.outputDir, mode === "self-test" ? "fixture-worktree" : "worktree");
  const args = [
    "run",
    "engineering:auto-work",
    "--",
    "--mission",
    mission,
    "--locale",
    options.locale,
    "--out",
    relativePath(autoWorkDir),
    "--worktree",
    normalizePath(worktree),
    "--timeout-ms",
    String(options.timeoutMs),
    "--generated-at",
    options.generatedAt
  ];

  if (mode === "self-test") {
    args.push("--runner-preset", "fixture");
  } else if (mode === "runner" && options.runnerPreset) {
    args.push("--runner-preset", options.runnerPreset);
  }
  if (options.adapterReady) {
    args.push("--adapter-ready");
  }
  return args;
}

function buildSummary({
  options,
  mission,
  mode,
  outputDir,
  autoWorkDir,
  autoWork,
  command
}: {
  options: NaikakuTaskOptions;
  mission: string;
  mode: TaskMode;
  outputDir: string;
  autoWorkDir: string;
  autoWork: AutoWorkSummary | null;
  command: CommandRun;
}) {
  const counts = autoWork?.counts || {};
  const claims = autoWork?.claims || {};
  const decisions = autoWork?.decisions || {};
  const autoWorkChecksPassed = Boolean(autoWork?.checks && Object.values(autoWork.checks).every(Boolean));
  const requestedRunner = mode !== "prepare";
  const summary: NaikakuTaskSummary = {
    schema: "naikaku.task-entry.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission,
    locale: options.locale,
    mode,
    runnerPreset: mode === "self-test" ? "fixture" : options.runnerPreset,
    command,
    autoWorkSummaryPath: relativePath(path.join(autoWorkDir, "summary.json")),
    decisions: {
      handoff: decisions.handoff || "missing",
      adapterRun: decisions.adapterRun || "missing",
      adapterReview: decisions.adapterReview || "missing"
    },
    counts: {
      handoffTaskFiles: counts.handoffTaskFiles || 0,
      handoffJobFiles: counts.handoffJobFiles || 0,
      handoffReadyTaskFiles: counts.handoffReadyTaskFiles || 0,
      adapterCompletedJobs: counts.adapterCompletedJobs || 0,
      importedReceipts: counts.importedReceipts || 0,
      acceptedEvidence: counts.acceptedEvidence || 0,
      verifiedArtifactPaths: counts.verifiedArtifactPaths || 0
    },
    claims: {
      handoffPrepared: claims.handoffPrepared === true,
      externalRunnerStarted: claims.externalRunnerStarted === true,
      externalReceiptImported: claims.externalReceiptImported === true,
      implementationEvidenceAccepted: claims.implementationEvidenceAccepted === true,
      artifactAuditVerified: claims.artifactAuditVerified === true,
      completion: claims.completion === true,
      macDesktopControl: claims.macDesktopControl === true,
      gitPushOrDeploy: claims.gitPushOrDeploy === true
    },
    files: {
      autoWorkSummary: relativePath(path.join(autoWorkDir, "summary.json")),
      handoffSummary: autoWork?.files?.handoffSummary || null,
      adapterRunSummary: autoWork?.files?.adapterRunSummary || null,
      adapterReviewSummary: autoWork?.files?.adapterReviewSummary || null
    },
    checks: {
      autoWorkExitedZero: command.exitCode === 0,
      handoffPrepared: claims.handoffPrepared === true && (counts.handoffTaskFiles || 0) > 0,
      prepareModeDidNotStartRunner: mode === "prepare" ? claims.externalRunnerStarted !== true : true,
      requestedRunnerStarted: requestedRunner ? claims.externalRunnerStarted === true : true,
      requestedReceiptImported: requestedRunner ? claims.externalReceiptImported === true : true,
      noCompletionClaim: claims.completion === false,
      noMacDesktopControl: claims.macDesktopControl === false,
      noGitPushOrDeploy: claims.gitPushOrDeploy === false,
      autoWorkChecksPassed
    },
    nextActions: nextActionsFor({ mode, runnerPreset: options.runnerPreset, outputDir: relativePath(outputDir) }),
    claimBoundary: [
      "This command is the simplest operator CLI entry for turning one mission into a governed Naikaku engineering run.",
      "Prepare mode writes supervised handoff artifacts but does not start external tools or claim implementation.",
      "Self-test mode uses the deterministic fixture runner to prove automation plumbing, not real backlog completion.",
      "Runner mode starts only a configured preset and still requires returned receipts, evidence, artifact audit, and release verification before work can be accepted.",
      "No mode grants Mac desktop permission, Git push, deploy, external send, provider access, or host-secret access by itself."
    ]
  };
  return summary;
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

function summaryMarkdown(summary: NaikakuTaskSummary) {
  return [
    "# Naikaku Task Entry",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Locale: ${summary.locale}`,
    `Mode: ${summary.mode}`,
    `Runner preset: ${summary.runnerPreset || "none"}`,
    `Mission: ${summary.mission}`,
    "",
    "## Decisions",
    "",
    ...Object.entries(summary.decisions).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Counts",
    "",
    ...Object.entries(summary.counts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Claims",
    "",
    ...Object.entries(summary.claims).map(([key, value]) => `- ${key}: ${value ? "yes" : "no"}`),
    "",
    "## Files",
    "",
    ...Object.entries(summary.files).map(([key, value]) => `- ${key}: ${value || "not-written"}`),
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([key, value]) => `- ${value ? "pass" : "fail"}: ${key}`),
    "",
    "## Next Actions",
    "",
    ...summary.nextActions.map((item) => `- ${item}`),
    "",
    "## Claim Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function nextActionsFor({
  mode,
  runnerPreset,
  outputDir
}: {
  mode: TaskMode;
  runnerPreset: string | null;
  outputDir: string;
}) {
  if (mode === "prepare") {
    return [
      `Review ${outputDir}/auto-work/summary.md and the generated handoff tasks.`,
      "Run `npm run naikaku:task -- --self-test \"your mission\"` to prove the local fixture automation path.",
      "Configure a fixed runner preset, then rerun with `--runner-preset <id> --adapter-ready` when a real local CLI is installed and approved."
    ];
  }
  if (mode === "self-test") {
    return [
      `Inspect ${outputDir}/summary.md for fixture receipt/evidence/artifact counts.`,
      "Use `npm run engineering:runner-kit` to build a wrapper for a real external CLI.",
      "Do not mark real backlog work complete from fixture evidence."
    ];
  }
  return [
    `Inspect ${outputDir}/auto-work/adapter-review/summary.json before accepting any evidence.`,
    `Confirm preset ${runnerPreset || "unknown"} ran in the intended worktree with approved permissions.`,
    "Run release verification before reconciling accepted evidence into the Development Board."
  ];
}

async function missionFrom(options: NaikakuTaskOptions) {
  if (options.missionFile) {
    return (await readFile(path.resolve(options.missionFile), "utf8")).trim();
  }
  if (options.mission?.trim()) return options.mission.trim();
  return "Prepare a governed Naikaku engineering task and return reviewable evidence.";
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function modeFor(options: NaikakuTaskOptions): TaskMode {
  if (options.mode) return options.mode;
  if (options.selfTest) return "self-test";
  if (options.runnerPreset) return "runner";
  return "prepare";
}

function parseArgs(args: string[]): NaikakuTaskOptions {
  const options: NaikakuTaskOptions = {
    mission: null,
    missionFile: null,
    outputDir: "output/naikaku-task",
    locale: "ja",
    mode: null,
    selfTest: false,
    runnerPreset: null,
    adapterReady: false,
    worktreeDir: null,
    timeoutMs: 60_000,
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
    } else if (arg === "--mode") {
      options.mode = parseMode(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--self-test") {
      options.selfTest = true;
    } else if (arg === "--runner-preset") {
      options.runnerPreset = parsePresetId(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--adapter-ready") {
      options.adapterReady = true;
    } else if (arg === "--worktree") {
      options.worktreeDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
        throw new Error("--timeout-ms must be a positive number.");
      }
      index += 1;
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
  if (options.mode === "runner" && !options.runnerPreset) {
    throw new Error("--mode runner requires --runner-preset <id>.");
  }
  return options;
}

function parseMode(value: string): TaskMode {
  if (value === "prepare" || value === "self-test" || value === "runner") return value;
  throw new Error("Unsupported mode. Use prepare, self-test, or runner.");
}

function parsePresetId(value: string) {
  const preset = value.trim();
  if (/^[a-z0-9][a-z0-9._-]{1,63}$/.test(preset)) return preset;
  throw new Error("Unsupported runner preset id. Use 2-64 lowercase letters, numbers, dot, underscore, or hyphen.");
}

function parseLocale(value: string): SupportedLocale {
  if (supportedLocales.some((locale) => locale.code === value)) {
    return value as SupportedLocale;
  }
  throw new Error(`Unsupported locale: ${value}. Use one of ${supportedLocales.map((item) => item.code).join(", ")}.`);
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function assertSafeOutputDir(outputDir: string) {
  const outputRoot = path.resolve("output");
  const relative = path.relative(outputRoot, outputDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must point to a subdirectory under output/.");
  }
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printSummary(summary: NaikakuTaskSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log("Naikaku task entry: " + (failed === 0 ? "ready" : "needs-review"));
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- mode: ${summary.mode}`);
  console.log(`- handoff: ${summary.decisions.handoff}`);
  console.log(`- adapter run: ${summary.decisions.adapterRun}`);
  console.log(`- receipts: ${summary.counts.importedReceipts}`);
  console.log(`- evidence: ${summary.counts.acceptedEvidence}`);
  console.log(`- artifacts: ${summary.counts.verifiedArtifactPaths}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run naikaku:task -- \"Implement a settings panel and run npm test\"",
    "  npm run naikaku:task -- --self-test \"Prove the local fixture automation path\"",
    "  npm run naikaku:task -- --runner-preset local-wrapper-example --adapter-ready \"Run my configured local wrapper\"",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --mode <name>              prepare, self-test, or runner. Default: prepare unless a runner flag is present.",
    "  --self-test                Shortcut for fixture self-test mode.",
    "  --runner-preset <id>       Fixed local runner preset id for runner mode.",
    "  --adapter-ready            Record selected adapter as installed, license-reviewed, and approved for this run.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory under output/. Default: output/naikaku-task.",
    "  --worktree <dir>           Worktree for changed-file audit.",
    "  --timeout-ms <number>      Per-adapter timeout. Default: 60000.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This is the operator-facing CLI entry. It delegates to engineering:auto-work and keeps the claim boundary explicit."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown Naikaku task failure.");
  process.exitCode = 1;
});
