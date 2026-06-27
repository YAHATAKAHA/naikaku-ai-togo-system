import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

interface EngineeringMvpOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  patchFile: string | null;
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

interface EngineeringMvpSummary {
  schema: "naikaku.engineering-mvp-run.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  locale: SupportedLocale;
  patchFile: string | null;
  commands: CommandRun[];
  decisions: {
    adapterRegistry: string;
    simulation: string;
    externalHandoff: string;
    localRunner: string;
    fixtureCoding: string;
    executionReceipt: string;
  };
  claims: {
    localRun: boolean;
    externalRunnerStarted: boolean;
    fixtureCodingLoop: boolean;
    codeChanged: boolean;
    completion: boolean;
    macDesktopControl: boolean;
    gitPushOrDeploy: boolean;
  };
  counts: {
    adapters: number;
    availableAdapters: number;
    readyTasks: number;
    commandsExecuted: number;
    failedCommands: number;
    handoffTaskFiles: number;
    handoffJobFiles: number;
    handoffReadyTaskFiles: number;
    handoffBlockers: number;
    fixtureBaselineExitCode: number;
    fixtureFinalExitCode: number;
    fixtureChangedFiles: number;
    changedFiles: number;
  };
  files: {
    adapterRegistry: string;
    externalHandoffSummary: string;
    simulationSummary: string;
    localRunnerSummary: string;
    fixtureCodingSummary: string;
    executionReceipt: string;
  };
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
  const adapterDir = path.join(outputDir, "adapters");
  const simulationDir = path.join(outputDir, "simulate");
  const handoffDir = path.join(outputDir, "handoff");
  const localRunDir = path.join(outputDir, "run-local");
  const fixtureCodingDir = path.join(outputDir, "fixture-coding");
  const mission = await missionFrom(options);
  const commandRuns: CommandRun[] = [];

  await mkdir(outputDir, { recursive: true });

  commandRuns.push(await runCommand({
    label: "adapter-registry",
    args: [
      "exec",
      "--",
      "tsx",
      "scripts/engineering-adapters.ts",
      "--out",
      relativePath(adapterDir),
      "--generated-at",
      options.generatedAt
    ]
  }));
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
      "openhands-coding-agent",
      "--generated-at",
      options.generatedAt
    ]
  }));
  commandRuns.push(await runCommand({
    label: "engineering-run-local",
    args: [
      "exec",
      "--",
      "tsx",
      "scripts/engineering-run-local.ts",
      "--input",
      relativePath(simulationDir),
      "--out",
      relativePath(localRunDir),
      "--timeout-ms",
      String(options.timeoutMs),
      "--generated-at",
      options.generatedAt,
      ...(options.patchFile ? ["--patch-file", options.patchFile] : [])
    ]
  }));
  commandRuns.push(await runCommand({
    label: "fixture-coding-loop",
    args: [
      "exec",
      "--",
      "tsx",
      "scripts/coding-agent-engineering-self-simulation.ts",
      "--out",
      relativePath(fixtureCodingDir),
      "--locale",
      options.locale,
      "--generated-at",
      options.generatedAt
    ]
  }));

  const adapterRegistry = await readJson<{
    schema: string;
    summary: { total: number; availableNow: number };
  }>(path.join(adapterDir, "adapter-registry.json"));
  const simulation = await readJson<{
    schema: string;
    decisions: { selfSimulation: string; launchQueue: string };
    capabilities: { canControlMacDesktop: boolean };
  }>(path.join(simulationDir, "summary.json"));
  const externalHandoff = await readJson<{
    schema: string;
    decision: string;
    canStartExternalRunner: boolean;
    summary: { handoffTaskFiles: number; adapterJobFiles: number; readyTaskFiles: number; blockers: number };
  }>(path.join(handoffDir, "summary.json"));
  const localRunner = await readJson<{
    schema: string;
    decisions: { runnerReport: string; executionReceipt: string };
    claims: {
      localRun: boolean;
      codeChanged: boolean;
      completion: boolean;
      macDesktopControl: boolean;
      gitPushOrDeploy: boolean;
    };
    counts: { readyTasks: number; commandsExecuted: number; failedCommands: number; changedFiles: number };
  }>(path.join(localRunDir, "summary.json"));
  const fixtureCoding = await readJson<{
    schema: string;
    fixture: { baselineTestExitCode: number; finalTestExitCode: number; changedFile: string };
    receipt: { decision: string };
    evidence: { decision: string; changedFiles: number };
    artifactAudit: { decision: string };
    checks: Record<string, boolean>;
  }>(path.join(fixtureCodingDir, "summary.json"));
  const fixtureCodingLoop = Object.values(fixtureCoding.checks).every(Boolean);

  const summary: EngineeringMvpSummary = {
    schema: "naikaku.engineering-mvp-run.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission,
    locale: options.locale,
    patchFile: options.patchFile ? relativePath(path.resolve(options.patchFile)) : null,
    commands: commandRuns,
    decisions: {
      adapterRegistry: adapterRegistry.schema,
      simulation: `${simulation.decisions.selfSimulation}/${simulation.decisions.launchQueue}`,
      externalHandoff: externalHandoff.decision,
      localRunner: localRunner.decisions.runnerReport,
      fixtureCoding: `${fixtureCoding.receipt.decision}/${fixtureCoding.evidence.decision}/${fixtureCoding.artifactAudit.decision}`,
      executionReceipt: localRunner.decisions.executionReceipt
    },
    claims: {
      localRun: localRunner.claims.localRun,
      externalRunnerStarted: false,
      fixtureCodingLoop,
      codeChanged: localRunner.claims.codeChanged,
      completion: localRunner.claims.completion,
      macDesktopControl: localRunner.claims.macDesktopControl || simulation.capabilities.canControlMacDesktop,
      gitPushOrDeploy: localRunner.claims.gitPushOrDeploy
    },
    counts: {
      adapters: adapterRegistry.summary.total,
      availableAdapters: adapterRegistry.summary.availableNow,
      readyTasks: localRunner.counts.readyTasks,
      commandsExecuted: localRunner.counts.commandsExecuted,
      failedCommands: localRunner.counts.failedCommands,
      handoffTaskFiles: externalHandoff.summary.handoffTaskFiles,
      handoffJobFiles: externalHandoff.summary.adapterJobFiles,
      handoffReadyTaskFiles: externalHandoff.summary.readyTaskFiles,
      handoffBlockers: externalHandoff.summary.blockers,
      fixtureBaselineExitCode: fixtureCoding.fixture.baselineTestExitCode,
      fixtureFinalExitCode: fixtureCoding.fixture.finalTestExitCode,
      fixtureChangedFiles: fixtureCoding.evidence.changedFiles,
      changedFiles: localRunner.counts.changedFiles
    },
    files: {
      adapterRegistry: relativePath(path.join(adapterDir, "adapter-registry.json")),
      externalHandoffSummary: relativePath(path.join(handoffDir, "summary.json")),
      simulationSummary: relativePath(path.join(simulationDir, "summary.json")),
      localRunnerSummary: relativePath(path.join(localRunDir, "summary.json")),
      fixtureCodingSummary: relativePath(path.join(fixtureCodingDir, "summary.json")),
      executionReceipt: relativePath(path.join(localRunDir, "execution-receipt.json"))
    },
    honestyClaim: {
      claim: "This one-command MVP run prepares adapter contracts, prepares supervised engineering work, runs preflight-allowed local verification commands, runs a fixture-only coding loop, and summarizes what can be honestly claimed.",
      limitations: [
        "It does not install or launch OpenClaw, OpenHands, browser-use, Playwright, Hammerspoon, E2B, MCP servers, or Hermes runtimes.",
        "It writes an external runner handoff package for review, but externalRunnerStarted remains false until a user-installed adapter is actually launched and returns a receipt.",
        "It does not call model providers, control macOS, browse, commit, push, deploy, or send external messages.",
        "The fixture coding loop edits only generated files under the MVP output directory and is not real product backlog completion.",
        "Without --patch-file it can claim local command execution, not code changes or implementation completion."
      ]
    }
  };

  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (commandRuns.some((run) => run.exitCode !== 0) || summary.counts.failedCommands > 0) {
    process.exitCode = 1;
  }
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

async function missionFrom(options: EngineeringMvpOptions) {
  if (options.missionFile) {
    return (await readFile(path.resolve(options.missionFile), "utf8")).trim();
  }
  if (options.mission?.trim()) return options.mission.trim();
  return "Prepare supervised adapter-first engineering work, run local verification, and report honest MVP claims.";
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function summaryMarkdown(summary: EngineeringMvpSummary) {
  return [
    "# Engineering MVP Run",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Locale: ${summary.locale}`,
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
    ...Object.entries(summary.files).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Honesty Boundary",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`)
  ].join("\n");
}

function printSummary(summary: EngineeringMvpSummary) {
  console.log("Engineering MVP run complete.");
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- adapters: ${summary.counts.adapters} (${summary.counts.availableAdapters} available now)`);
  console.log(`- external handoff: ${summary.decisions.externalHandoff}`);
  console.log(`- external runner started: ${summary.claims.externalRunnerStarted ? "yes" : "no"}`);
  console.log(`- handoff task files: ${summary.counts.handoffTaskFiles}`);
  console.log(`- handoff job files: ${summary.counts.handoffJobFiles}`);
  console.log(`- commands executed: ${summary.counts.commandsExecuted}`);
  console.log(`- failed commands: ${summary.counts.failedCommands}`);
  console.log(`- local run claim: ${summary.claims.localRun ? "yes" : "no"}`);
  console.log(`- fixture coding loop: ${summary.claims.fixtureCodingLoop ? "yes" : "no"}`);
  console.log(`- fixture test: ${summary.counts.fixtureBaselineExitCode} -> ${summary.counts.fixtureFinalExitCode}`);
  console.log(`- code changed claim: ${summary.claims.codeChanged ? "yes" : "no"}`);
  console.log(`- completion claim: ${summary.claims.completion ? "yes" : "no"}`);
  console.log(`- Mac desktop control claim: ${summary.claims.macDesktopControl ? "yes" : "no"}`);
}

function parseArgs(args: string[]): EngineeringMvpOptions {
  const options: EngineeringMvpOptions = {
    mission: null,
    missionFile: null,
    outputDir: "output/engineering-mvp",
    locale: "ja",
    patchFile: null,
    timeoutMs: 180_000,
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
    } else if (arg === "--patch-file") {
      options.patchFile = args[index + 1] || "";
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(args[index + 1] || options.timeoutMs);
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

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:mvp -- --mission \"Run local checks\"",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory. Default: output/engineering-mvp.",
    "  --patch-file <path>        Optional explicit unified diff to apply before verification.",
    "  --timeout-ms <number>      Per-command timeout for local runner. Default: 180000.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This command chains engineering:adapters, engineering:simulate, engineering:handoff, engineering:run-local, and a fixture-only coding self-simulation. It writes reviewable external-runner handoff tasks but does not install external runners, control macOS, commit, push, deploy, or call model providers."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering MVP failure.");
  process.exitCode = 1;
});
