import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildEngineeringRunnerPresetRegistry,
  findEngineeringRunnerPreset
} from "../server/engineeringRunnerPresets";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

interface EngineeringRunnerKitOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  generatedAt: string;
  timeoutMs: number;
  help: boolean;
}

interface CommandRun {
  label: string;
  command: string;
  exitCode: number;
  durationMs: number;
}

interface EngineeringRunnerKitSummary {
  schema: "naikaku.engineering-runner-kit.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  locale: SupportedLocale;
  runnerPresetId: "local-wrapper-example";
  files: {
    wrapperExample: string;
    presetExample: string;
    quickstart: string;
    simulateSummary: string;
    handoffSummary: string;
    smokeSummary: string;
  };
  commands: CommandRun[];
  counts: {
    handoffTaskFiles: number;
    handoffJobFiles: number;
    handoffReadyTaskFiles: number;
    smokeCompletedJobs: number;
    smokeImportedReceipts: number;
    smokeAcceptedEvidence: number;
    smokeVerifiedArtifactPaths: number;
  };
  checks: {
    wrapperWritten: boolean;
    presetValid: boolean;
    handoffReady: boolean;
    sampleJobWritten: boolean;
    smokeExternalRunnerStarted: boolean;
    smokeReceiptImported: boolean;
    smokeEvidenceAccepted: boolean;
    smokeArtifactAuditVerified: boolean;
    noCompletionClaim: boolean;
    noMacDesktopControl: boolean;
    noGitPushOrDeploy: boolean;
    noStageCommandFailures: boolean;
  };
  claimBoundary: string[];
}

const presetId = "local-wrapper-example" as const;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const mission = await missionFrom(options);
  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);

  const simulateDir = path.join(outputDir, "sample-simulate");
  const handoffDir = path.join(outputDir, "sample-handoff");
  const smokeDir = path.join(outputDir, "sample-smoke");
  const worktreeDir = path.join(outputDir, "sample-worktree");
  const wrapperPath = path.join(outputDir, "runner-wrapper-example.mjs");
  const presetPath = path.join(outputDir, "runner-preset.example.json");
  const quickstartPath = path.join(outputDir, "README.md");
  const commandRuns: CommandRun[] = [];

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const presetJson = JSON.stringify([
    {
      id: presetId,
      label: "Local wrapper example",
      adapterId: "openhands-coding-agent",
      command: "node",
      args: [
        relativePath(wrapperPath),
        "--job",
        "{jobPath}",
        "--worktree",
        relativePath(worktreeDir),
        "--generated-at",
        options.generatedAt
      ],
      commandCandidates: ["node"],
      nextAction: "Replace the wrapper body with a real local CLI runner while preserving the Naikaku receipt contract."
    }
  ], null, 2);

  await writeFile(wrapperPath, wrapperExampleSource(), "utf8");
  await writeFile(presetPath, `${presetJson}\n`, "utf8");

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
      relativePath(simulateDir),
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
      relativePath(simulateDir),
      "--out",
      relativePath(handoffDir),
      "--adapter",
      "openhands-coding-agent",
      "--installed",
      "openhands-coding-agent",
      "--license-reviewed",
      "openhands-coding-agent",
      "--approved",
      "openhands-coding-agent",
      "--generated-at",
      options.generatedAt
    ]
  }));
  commandRuns.push(await runCommand({
    label: "engineering-auto-work configured wrapper smoke",
    args: [
      "run",
      "engineering:auto-work",
      "--",
      "--mission",
      mission,
      "--locale",
      options.locale,
      "--adapter-ready",
      "--runner-preset",
      presetId,
      "--out",
      relativePath(smokeDir),
      "--worktree",
      relativePath(worktreeDir),
      "--timeout-ms",
      String(options.timeoutMs),
      "--generated-at",
      options.generatedAt
    ],
    env: {
      NAIKAKU_ENGINEERING_RUNNER_PRESETS: presetJson
    }
  }));

  const registry = buildEngineeringRunnerPresetRegistry({
    generatedAt: options.generatedAt,
    envValue: presetJson,
    configPath: ""
  });
  const handoff = await readJsonIfExists<{
    decision?: string;
    canStartExternalRunner?: boolean;
    tasks?: Array<{ jobPath?: string | null; status?: string }>;
    summary?: {
      handoffTaskFiles?: number;
      adapterJobFiles?: number;
      readyTaskFiles?: number;
    };
  }>(path.join(handoffDir, "summary.json"));
  const smoke = await readJsonIfExists<{
    counts?: {
      adapterCompletedJobs?: number;
      importedReceipts?: number;
      acceptedEvidence?: number;
      verifiedArtifactPaths?: number;
    };
    claims?: {
      externalRunnerStarted?: boolean;
      completion?: boolean;
      macDesktopControl?: boolean;
      gitPushOrDeploy?: boolean;
    };
    checks?: Record<string, boolean>;
  }>(path.join(smokeDir, "summary.json"));
  const sampleJobPath = handoff?.tasks?.find((task) => task.jobPath && task.status === "ready-for-adapter")?.jobPath || null;
  const smokeCounts = smoke?.counts || {};
  const smokeClaims = smoke?.claims || {};
  const summary: EngineeringRunnerKitSummary = {
    schema: "naikaku.engineering-runner-kit.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission,
    locale: options.locale,
    runnerPresetId: presetId,
    files: {
      wrapperExample: relativePath(wrapperPath),
      presetExample: relativePath(presetPath),
      quickstart: relativePath(quickstartPath),
      simulateSummary: relativePath(path.join(simulateDir, "summary.json")),
      handoffSummary: relativePath(path.join(handoffDir, "summary.json")),
      smokeSummary: relativePath(path.join(smokeDir, "summary.json"))
    },
    commands: commandRuns,
    counts: {
      handoffTaskFiles: handoff?.summary?.handoffTaskFiles || 0,
      handoffJobFiles: handoff?.summary?.adapterJobFiles || 0,
      handoffReadyTaskFiles: handoff?.summary?.readyTaskFiles || 0,
      smokeCompletedJobs: smokeCounts.adapterCompletedJobs || 0,
      smokeImportedReceipts: smokeCounts.importedReceipts || 0,
      smokeAcceptedEvidence: smokeCounts.acceptedEvidence || 0,
      smokeVerifiedArtifactPaths: smokeCounts.verifiedArtifactPaths || 0
    },
    checks: {
      wrapperWritten: existsSync(wrapperPath),
      presetValid: Boolean(findEngineeringRunnerPreset(presetId, registry)),
      handoffReady: handoff?.decision === "handoff-ready" && handoff.canStartExternalRunner === true,
      sampleJobWritten: Boolean(sampleJobPath && existsSync(path.resolve(sampleJobPath))),
      smokeExternalRunnerStarted: smokeClaims.externalRunnerStarted === true && (smokeCounts.adapterCompletedJobs || 0) >= 1,
      smokeReceiptImported: (smokeCounts.importedReceipts || 0) >= 1,
      smokeEvidenceAccepted: (smokeCounts.acceptedEvidence || 0) >= 1,
      smokeArtifactAuditVerified: (smokeCounts.verifiedArtifactPaths || 0) >= 1,
      noCompletionClaim: smokeClaims.completion === false,
      noMacDesktopControl: smokeClaims.macDesktopControl === false,
      noGitPushOrDeploy: smokeClaims.gitPushOrDeploy === false,
      noStageCommandFailures: commandRuns.every((run) => run.exitCode === 0)
    },
    claimBoundary: [
      "This kit proves a fixed local wrapper can consume Naikaku adapter job JSON and return a receipt/evidence package.",
      "The wrapper example is a deterministic local adapter scaffold, not a real OpenHands, OpenClaw, Hammerspoon, browser, MCP, or model run.",
      "Replace the wrapper internals with a user-installed CLI while preserving scoped job input, transcript paths, receipt output, risk notes, and artifact audit evidence.",
      "The kit does not grant desktop permissions, push Git, deploy, call providers, install upstream tools, or claim real backlog completion."
    ]
  };

  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  await writeFile(quickstartPath, quickstartMarkdown(summary, presetJson), "utf8");
  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

async function runCommand({
  label,
  args,
  env = {}
}: {
  label: string;
  args: string[];
  env?: Record<string, string>;
}): Promise<CommandRun> {
  const startedAt = Date.now();
  const command = ["npm", ...args].join(" ");

  return new Promise((resolve) => {
    const child = spawn("npm", args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        ...env,
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

async function missionFrom(options: EngineeringRunnerKitOptions) {
  if (options.missionFile) {
    return (await readFile(path.resolve(options.missionFile), "utf8")).trim();
  }
  if (options.mission?.trim()) return options.mission.trim();
  return "Prepare a local wrapper adapter, run one governed coding task, and return Naikaku receipt evidence.";
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function summaryMarkdown(summary: EngineeringRunnerKitSummary) {
  return [
    "# Engineering Runner Kit",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Locale: ${summary.locale}`,
    `Preset: ${summary.runnerPresetId}`,
    `Mission: ${summary.mission}`,
    "",
    "## Files",
    "",
    ...Object.entries(summary.files).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Counts",
    "",
    ...Object.entries(summary.counts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([key, value]) => `- ${value ? "pass" : "fail"}: ${key}`),
    "",
    "## Commands",
    "",
    ...summary.commands.map((item) =>
      `- ${item.label}: exit ${item.exitCode}, ${item.durationMs}ms, \`${item.command}\``
    ),
    "",
    "## Claim Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function quickstartMarkdown(summary: EngineeringRunnerKitSummary, presetJson: string) {
  return [
    "# Local Runner Wrapper Kit",
    "",
    "This directory is a minimal, runnable example for connecting a user-installed CLI runner to Naikaku.",
    "The included wrapper is deterministic and local-only. Replace its internals with OpenHands, OpenClaw, Hammerspoon, browser-use, Playwright, MCP, or another approved CLI while keeping the same receipt contract.",
    "",
    "## Files",
    "",
    `- Wrapper example: \`${summary.files.wrapperExample}\``,
    `- Preset example: \`${summary.files.presetExample}\``,
    `- Sample handoff: \`${summary.files.handoffSummary}\``,
    `- Self-test smoke: \`${summary.files.smokeSummary}\``,
    "",
    "## Preset JSON",
    "",
    "```json",
    presetJson,
    "```",
    "",
    "## Run The Example",
    "",
    "```bash",
    `NAIKAKU_ENGINEERING_RUNNER_PRESETS="$(cat ${summary.files.presetExample})" \\`,
    "  npm run engineering:auto-work -- \\",
    "  --mission \"Run a scoped local wrapper and return Naikaku evidence\" \\",
    "  --adapter-ready \\",
    "  --runner-preset local-wrapper-example",
    "```",
    "",
    "The browser and CLI select only the preset id. The fixed command and args live in the local gateway or environment config.",
    "",
    "## Receipt Contract",
    "",
    "A real runner must write `naikaku.coding-agent-session-receipt.v1` to the job's `receiptDraftPath` and include changed files, command exit codes, transcript artifact refs, evidence artifact refs, and risk notes.",
    "Naikaku then imports that receipt and runs receipt review, implementation evidence, and artifact audit before any work can be accepted.",
    "",
    "## Safety Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function wrapperExampleSource() {
  return `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const job = readJson(path.resolve(options.jobPath));
const taskText = readFileSync(path.resolve(job.taskPath), "utf8");
const worktreeDir = path.resolve(options.worktreeDir);
const changedFile = path.join(worktreeDir, "src", safeFileStem(job.sessionId) + ".txt");
const changedFileRelative = relativePath(changedFile);

initializeFixtureWorktree(worktreeDir, changedFile);
writeFileSync(changedFile, [
  "session=" + job.sessionId,
  "title=" + job.title,
  "generatedAt=" + options.generatedAt,
  "This file was modified by the local runner wrapper example.",
  ""
].join("\\n"), "utf8");

const commandResults = pendingCommandsFrom(taskText).map((item) => {
  writeArtifact(path.resolve(item.transcriptRef), [
    "command: " + item.command,
    "exit code: 0",
    "exitCode: 0",
    "session: " + job.sessionId,
    "note: local runner wrapper example transcript",
    ""
  ].join("\\n"));
  return {
    command: item.command,
    exitCode: 0,
    outputSummary: "Local wrapper example recorded success for " + item.command + ".",
    transcriptRef: item.transcriptRef
  };
});

const evidence = (job.evidence.expectedArtifacts || []).map((artifact, index) => {
  writeArtifact(path.resolve(artifact.path), [
    "Evidence " + (index + 1) + ": " + artifact.label,
    "Session: " + job.sessionId,
    "Changed file: " + changedFileRelative,
    "Local wrapper example evidence for adapter integration testing.",
    ""
  ].join("\\n"));
  return artifact.label + " -> " + artifact.path;
});

if (!job.receiptDraftPath) {
  throw new Error("Adapter job is missing receiptDraftPath.");
}

writeArtifact(path.resolve(job.receiptDraftPath), JSON.stringify({
  schema: "naikaku.coding-agent-session-receipt.v1",
  generatedAt: options.generatedAt,
  mode: "evidence-review",
  sourceSchema: "naikaku.coding-agent-session-bundle.v1",
  bundleDecision: "ready",
  decision: "needs-evidence",
  operatorLocale: "ja",
  items: [{
    sessionId: job.sessionId,
    title: job.title,
    sessionStatus: "ready-for-agent",
    receiptStatus: "pending-evidence",
    changedFiles: [changedFileRelative],
    commandResults,
    evidence,
    risks: [
      "Local wrapper example only.",
      "No provider, browser, desktop, deploy target, Git remote, or external service was used."
    ],
    missing: [],
    nextAction: "Import this receipt through Naikaku adapter-run review."
  }],
  honestyClaim: {
    level: "submitted-evidence-review",
    claim: "This wrapper writes a Naikaku receipt to prove adapter integration plumbing.",
    limitations: [
      "It does not implement a real product task.",
      "It does not run an upstream coding model."
    ],
    productionRequirements: [
      "Replace the wrapper body with a user-installed approved CLI runner."
    ]
  },
  summary: {
    total: 1,
    verified: 0,
    pendingEvidence: 1,
    failed: 0,
    held: 0,
    changedFiles: 1,
    commandResults: commandResults.length,
    evidenceItems: evidence.length,
    risks: 2
  }
}, null, 2) + "\\n");

console.log("Local runner wrapper wrote " + job.receiptDraftPath);

function parseArgs(args) {
  const parsed = {
    jobPath: "",
    worktreeDir: "output/engineering-runner-kit/sample-worktree",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--job") {
      parsed.jobPath = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--worktree") {
      parsed.worktreeDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--generated-at") {
      parsed.generatedAt = requireValue(args, index, arg);
      index += 1;
    } else if (!parsed.jobPath) {
      parsed.jobPath = arg;
    } else {
      throw new Error("Unknown option: " + arg);
    }
  }

  if (!parsed.jobPath) {
    throw new Error("--job is required.");
  }
  return parsed;
}

function requireValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(name + " requires a value.");
  }
  return value;
}

function pendingCommandsFrom(taskText) {
  const matches = [...taskText.matchAll(/^- (.+?) -> transcript (.+?); exit code/mg)];
  if (!matches.length) {
    return [{
      command: "local runner wrapper example",
      transcriptRef: "output/engineering-runner-kit/wrapper-transcript.log"
    }];
  }
  return matches.map((match) => ({
    command: match[1].trim(),
    transcriptRef: match[2].trim()
  }));
}

function initializeFixtureWorktree(worktreeDir, changedFile) {
  mkdirSync(path.dirname(changedFile), { recursive: true });
  if (!existsSync(path.join(worktreeDir, ".git"))) {
    mkdirSync(worktreeDir, { recursive: true });
    assertGitOk(runGit(["init"], worktreeDir), "git init");
  }

  if (!existsSync(changedFile)) {
    writeFileSync(changedFile, "baseline local wrapper file\\n", "utf8");
  }

  if (!runGit(["rev-parse", "--verify", "HEAD"], worktreeDir).ok) {
    assertGitOk(runGit(["add", "."], worktreeDir), "git add");
    assertGitOk(runGit([
      "-c",
      "user.name=Naikaku Local Wrapper",
      "-c",
      "user.email=local-wrapper@example.invalid",
      "commit",
      "-m",
      "local wrapper baseline"
    ], worktreeDir), "git commit");
  }
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    shell: false,
    encoding: "utf8",
    maxBuffer: 2_000_000
  });
  return {
    ok: result.status === 0,
    output: (result.stdout || "") + (result.stderr || "")
  };
}

function assertGitOk(result, label) {
  if (!result.ok) {
    throw new Error(label + " failed: " + (result.output.trim() || "unknown Git error"));
  }
}

function writeArtifact(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\\n") ? content : content + "\\n", "utf8");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function safeFileStem(value) {
  return String(value || "session").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "session";
}

function relativePath(filePath) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\\\/g, "/");
}

function printHelp() {
  console.log("Usage: node runner-wrapper-example.mjs --job <adapter-job.json> --worktree <dir>");
}
`;
}

function parseArgs(args: string[]): EngineeringRunnerKitOptions {
  const options: EngineeringRunnerKitOptions = {
    mission: null,
    missionFile: null,
    outputDir: "output/engineering-runner-kit",
    locale: "ja",
    generatedAt: new Date().toISOString(),
    timeoutMs: 60_000,
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
    } else if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
        throw new Error("--timeout-ms must be a positive number.");
      }
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

function parseLocale(value: string): SupportedLocale {
  if (supportedLocales.some((locale) => locale.code === value)) {
    return value as SupportedLocale;
  }
  throw new Error(`Unsupported locale: ${value}. Use one of ${supportedLocales.map((item) => item.code).join(", ")}.`);
}

function assertSafeOutputDir(outputDir: string) {
  const outputRoot = path.resolve("output");
  const relative = path.relative(outputRoot, outputDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must point to a subdirectory under output/.");
  }
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printSummary(summary: EngineeringRunnerKitSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log("Engineering runner kit: " + (failed === 0 ? "verified" : "needs-review"));
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- wrapper: ${summary.files.wrapperExample}`);
  console.log(`- preset: ${summary.files.presetExample}`);
  console.log(`- smoke receipts: ${summary.counts.smokeImportedReceipts}`);
  console.log(`- smoke evidence: ${summary.counts.smokeAcceptedEvidence}`);
  console.log(`- smoke artifacts: ${summary.counts.smokeVerifiedArtifactPaths}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:runner-kit -- --mission \"Run a local wrapper adapter\"",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory under output/. Default: output/engineering-runner-kit.",
    "  --timeout-ms <number>      Wrapper smoke timeout. Default: 60000.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This command writes a runnable local runner wrapper kit and smokes it through engineering:auto-work. It does not install upstream tools, call providers, grant Mac control, commit, push, or deploy."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering runner kit failure.");
  process.exitCode = 1;
});
