import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../src/data/defaultCabinet";
import { decideGuidedCycleContinuation, type GuidedCycleStopReason } from "../src/domain/guidedEngineeringCycle";
import { runCabinetMission } from "../src/domain/orchestrator";
import type { CabinetScore } from "../src/domain/types";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

type GuidedExecutor = "codex-smoke" | "auto-work";
type GuidedCabinetMode = "local" | "api-mock" | "api";

interface GuidedEngineeringOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  maxLoops: number;
  cabinetMode: GuidedCabinetMode;
  cabinetProvider: string;
  cabinetEndpoint: string | null;
  cabinetModel: string | null;
  cabinetApiKeyAlias: string | null;
  executor: GuidedExecutor;
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
  schema: "naikaku.engineering-auto-work.v1";
  outputDir: string;
  mode: "prepared-only" | "external-run-attempted";
  runnerPreset: string | null;
  decisions: {
    handoff: string;
    adapterRun: string;
    adapterReview: string;
  };
  claims: {
    externalRunnerStarted: boolean;
    externalReceiptImported: boolean;
    implementationEvidenceAccepted: boolean;
    artifactAuditVerified: boolean;
    completion: boolean;
    macDesktopControl: boolean;
    gitPushOrDeploy: boolean;
  };
  counts: {
    adapterCompletedJobs: number;
    importedReceipts: number;
    acceptedEvidence: number;
    verifiedArtifactPaths: number;
  };
  checks: Record<string, boolean>;
}

interface CodexEngineerSmokeSummary {
  schema: "naikaku.codex-engineer-smoke.v1";
  outputDir: string;
  codex: {
    exitCode: number;
  };
  tests: {
    baselineExitCode: number;
    finalExitCode: number;
  };
  files: {
    changedFiles: string[];
    receiptPath: string;
    diffPath: string;
    codexTranscript: string;
  };
  checks: Record<string, boolean>;
}

interface ApiRoleSmokeSummary {
  schema: "naikaku.cabinet-api-role-smoke.v1";
  mode: "mock" | "live-provider";
  outputDir: string;
  roles: unknown[];
  decision: {
    decision: "approved" | "revise" | "blocked";
    reason: string;
    executionAuthorized: boolean;
  } | null;
  checks: Record<string, boolean>;
}

interface CabinetCycleDecision {
  id: string;
  path: string;
  mode: GuidedCabinetMode;
  decision: CabinetScore["decision"];
  overall: number;
  executionAuthorized: boolean;
  reason: string;
  command: CommandRun | null;
}

interface GuidedCycleItem {
  cycle: number;
  cabinetRunId: string;
  cabinetRunPath: string;
  cabinetMode: GuidedCabinetMode;
  cabinetDecision: CabinetScore["decision"];
  cabinetOverall: number;
  cabinetExecutionAuthorized: boolean;
  cabinetReason: string;
  cabinetCommand: CommandRun | null;
  executor: GuidedExecutor;
  runnerPreset: string | null;
  executionAttempted: boolean;
  executionOk: boolean;
  command: CommandRun | null;
  executorSummaryPath: string | null;
  executorDecision: string;
  outputDir: string | null;
  stopReason: GuidedCycleStopReason;
}

interface GuidedEngineeringSummary {
  schema: "naikaku.guided-engineering-cycle.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  locale: SupportedLocale;
  maxLoops: number;
  cabinetMode: GuidedCabinetMode;
  executor: GuidedExecutor;
  runnerPreset: string | null;
  cycles: GuidedCycleItem[];
  final: {
    decision: CabinetScore["decision"] | "not-run";
    stopReason: GuidedCycleStopReason;
    cyclesCompleted: number;
    executionAttempts: number;
    successfulExecutions: number;
  };
  checks: Record<string, boolean>;
  claimBoundary: string[];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const mission = await missionFrom(options);
  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);
  await mkdir(outputDir, { recursive: true });

  const cycles: GuidedCycleItem[] = [];
  let finalDecision: CabinetScore["decision"] | "not-run" = "not-run";
  let finalStopReason: GuidedCycleStopReason = "limit-reached";

  for (let cycle = 1; cycle <= options.maxLoops; cycle += 1) {
    const cycleDir = path.join(outputDir, `cycle-${String(cycle).padStart(2, "0")}`);
    await mkdir(cycleDir, { recursive: true });

    const cabinet = await runCabinetCycle({
      cycle,
      mission: cycleMission(mission, cycles),
      cycleDir,
      options
    });
    finalDecision = cabinet.decision;

    if (!cabinet.executionAuthorized || cabinet.decision === "block") {
      const stopped = stopBeforeExecution({
        cycle,
        cabinet,
        options,
        stopReason: "cabinet-blocked"
      });
      cycles.push(stopped);
      finalStopReason = stopped.stopReason;
      break;
    }

    const execution = await runExecutorCycle({
      cycle,
      mission,
      cycleDir,
      options
    });
    const continuation = decideGuidedCycleContinuation({
      cabinetDecision: cabinet.decision,
      executionOk: execution.executionOk,
      cycle,
      maxCycles: options.maxLoops
    });

    cycles.push({
      cycle,
      cabinetRunId: cabinet.id,
      cabinetRunPath: cabinet.path,
      cabinetMode: cabinet.mode,
      cabinetDecision: cabinet.decision,
      cabinetOverall: cabinet.overall,
      cabinetExecutionAuthorized: cabinet.executionAuthorized,
      cabinetReason: cabinet.reason,
      cabinetCommand: cabinet.command,
      executor: options.executor,
      runnerPreset: execution.runnerPreset,
      executionAttempted: true,
      executionOk: execution.executionOk,
      command: execution.command,
      executorSummaryPath: execution.executorSummaryPath,
      executorDecision: execution.executorDecision,
      outputDir: execution.outputDir,
      stopReason: continuation.stopReason
    });
    finalStopReason = continuation.stopReason;

    if (!continuation.shouldContinue) {
      break;
    }
  }

  const summary = buildSummary({
    options,
    mission,
    outputDir,
    cycles,
    finalDecision,
    finalStopReason
  });
  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

async function runCabinetCycle({
  cycle,
  mission,
  cycleDir,
  options
}: {
  cycle: number;
  mission: string;
  cycleDir: string;
  options: GuidedEngineeringOptions;
}): Promise<CabinetCycleDecision> {
  if (options.cabinetMode === "local") {
    const cabinetRun = runCabinetMission({
      mission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const cabinetRunPath = path.join(cycleDir, "cabinet-run.json");
    await writeFile(cabinetRunPath, `${JSON.stringify(cabinetRun, null, 2)}\n`, "utf8");
    return {
      id: cabinetRun.id,
      path: relativePath(cabinetRunPath),
      mode: "local",
      decision: cabinetRun.score.decision,
      overall: cabinetRun.score.overall,
      executionAuthorized: cabinetRun.score.decision !== "block",
      reason: `local-score-${cabinetRun.score.decision}`,
      command: null
    };
  }

  return runApiCabinetCycle({
    cycle,
    mission,
    cycleDir,
    options
  });
}

async function runApiCabinetCycle({
  cycle,
  mission,
  cycleDir,
  options
}: {
  cycle: number;
  mission: string;
  cycleDir: string;
  options: GuidedEngineeringOptions;
}): Promise<CabinetCycleDecision> {
  const cabinetDir = path.join(cycleDir, "api-cabinet");
  const args = [
    "run",
    "cabinet:api-role-smoke",
    "--",
    "--mission",
    mission,
    "--out",
    relativePath(cabinetDir),
    "--generated-at",
    options.generatedAt
  ];

  if (options.cabinetMode === "api-mock") {
    args.push("--mock");
  } else {
    args.push("--provider", options.cabinetProvider);
    if (options.cabinetEndpoint) {
      args.push("--endpoint", options.cabinetEndpoint);
    }
    if (options.cabinetModel) {
      args.push("--model", options.cabinetModel);
    }
    if (options.cabinetApiKeyAlias) {
      args.push("--api-key-alias", options.cabinetApiKeyAlias);
    }
  }

  const command = await runCommand({
    label: "cabinet-api-role-smoke",
    args
  });
  const summaryPath = path.join(cabinetDir, "summary.json");
  const summary = await readJsonIfExists<ApiRoleSmokeSummary>(summaryPath);
  const checksPassed = allChecksPassed(summary?.checks);
  const decision = summary?.decision;
  const executionAuthorized = command.exitCode === 0 &&
    checksPassed &&
    decision?.decision === "approved" &&
    decision.executionAuthorized;

  return {
    id: `api-cabinet-cycle-${cycle}`,
    path: relativePath(summaryPath),
    mode: options.cabinetMode,
    decision: executionAuthorized ? "revise" : "block",
    overall: executionAuthorized ? 72 : 0,
    executionAuthorized,
    reason: decision?.reason || (summary ? "api-cabinet-not-authorized" : "missing-api-cabinet-summary"),
    command
  };
}

function stopBeforeExecution({
  cycle,
  cabinet,
  options,
  stopReason
}: {
  cycle: number;
  cabinet: CabinetCycleDecision;
  options: GuidedEngineeringOptions;
  stopReason: GuidedCycleStopReason;
}): GuidedCycleItem {
  return {
    cycle,
    cabinetRunId: cabinet.id,
    cabinetRunPath: cabinet.path,
    cabinetMode: cabinet.mode,
    cabinetDecision: cabinet.decision,
    cabinetOverall: cabinet.overall,
    cabinetExecutionAuthorized: cabinet.executionAuthorized,
    cabinetReason: cabinet.reason,
    cabinetCommand: cabinet.command,
    executor: options.executor,
    runnerPreset: options.runnerPreset,
    executionAttempted: false,
    executionOk: false,
    command: null,
    executorSummaryPath: null,
    executorDecision: "not-run-cabinet-blocked",
    outputDir: null,
    stopReason
  };
}

async function runExecutorCycle({
  cycle,
  mission,
  cycleDir,
  options
}: {
  cycle: number;
  mission: string;
  cycleDir: string;
  options: GuidedEngineeringOptions;
}) {
  if (options.executor === "auto-work") {
    return runAutoWorkCycle({ cycle, mission, cycleDir, options });
  }
  return runCodexSmokeCycle({ cycle, mission, cycleDir, options });
}

async function runCodexSmokeCycle({
  mission,
  cycleDir,
  options
}: {
  cycle: number;
  mission: string;
  cycleDir: string;
  options: GuidedEngineeringOptions;
}) {
  const executorDir = path.join(cycleDir, "codex-engineer-smoke");
  const command = await runCommand({
    label: "codex-engineer-smoke",
    args: [
      "run",
      "codex:engineer-smoke",
      "--",
      "--mission",
      mission,
      "--out",
      relativePath(executorDir),
      "--generated-at",
      options.generatedAt
    ]
  });
  const summaryPath = path.join(executorDir, "summary.json");
  const summary = await readJsonIfExists<CodexEngineerSmokeSummary>(summaryPath);
  const checksPassed = allChecksPassed(summary?.checks);

  return {
    runnerPreset: "codex-cli",
    executionOk: command.exitCode === 0 && checksPassed,
    command,
    executorSummaryPath: relativePath(summaryPath),
    executorDecision: summary
      ? `codex ${summary.codex.exitCode}, test ${summary.tests.baselineExitCode}->${summary.tests.finalExitCode}`
      : "missing-codex-summary",
    outputDir: summary?.outputDir || relativePath(executorDir)
  };
}

async function runAutoWorkCycle({
  mission,
  cycleDir,
  options
}: {
  cycle: number;
  mission: string;
  cycleDir: string;
  options: GuidedEngineeringOptions;
}) {
  const executorDir = path.join(cycleDir, "auto-work");
  const args = [
    "run",
    "engineering:auto-work",
    "--",
    "--mission",
    mission,
    "--locale",
    options.locale,
    "--out",
    relativePath(executorDir),
    "--timeout-ms",
    String(options.timeoutMs),
    "--generated-at",
    options.generatedAt
  ];
  if (options.runnerPreset) {
    args.push("--runner-preset", options.runnerPreset);
  }
  if (options.adapterReady) {
    args.push("--adapter-ready");
  }
  if (options.worktreeDir) {
    args.push("--worktree", options.worktreeDir);
  }

  const command = await runCommand({
    label: "engineering-auto-work",
    args
  });
  const summaryPath = path.join(executorDir, "summary.json");
  const summary = await readJsonIfExists<AutoWorkSummary>(summaryPath);
  const checksPassed = allChecksPassed(summary?.checks);

  return {
    runnerPreset: summary?.runnerPreset || options.runnerPreset,
    executionOk: command.exitCode === 0 && checksPassed,
    command,
    executorSummaryPath: relativePath(summaryPath),
    executorDecision: summary
      ? `${summary.mode}, ${summary.decisions.adapterRun}, ${summary.decisions.adapterReview}`
      : "missing-auto-work-summary",
    outputDir: summary?.outputDir || relativePath(executorDir)
  };
}

function buildSummary({
  options,
  mission,
  outputDir,
  cycles,
  finalDecision,
  finalStopReason
}: {
  options: GuidedEngineeringOptions;
  mission: string;
  outputDir: string;
  cycles: GuidedCycleItem[];
  finalDecision: CabinetScore["decision"] | "not-run";
  finalStopReason: GuidedCycleStopReason;
}): GuidedEngineeringSummary {
  const executionAttempts = cycles.filter((cycle) => cycle.executionAttempted).length;
  const successfulExecutions = cycles.filter((cycle) => cycle.executionOk).length;
  const cyclesCompleted = cycles.filter((cycle) => cycle.executionOk).length;
  const checks = {
    missionPresent: mission.trim().length > 0,
    maxLoopsWithinLimit: options.maxLoops >= 1 && options.maxLoops <= 3,
    cabinetVotedEveryCycle: cycles.length > 0 && cycles.every((cycle) => Boolean(cycle.cabinetRunId)),
    cabinetModeRecorded: cycles.length > 0 && cycles.every((cycle) => cycle.cabinetMode === options.cabinetMode),
    noUnboundedLoop: cycles.length <= options.maxLoops,
    executionOnlyAfterCabinetApproval: cycles.every((cycle) =>
      cycle.executionAttempted ? cycle.cabinetExecutionAuthorized && cycle.cabinetDecision !== "block" : true
    ),
    apiCabinetEvidenceWrittenWhenUsed: options.cabinetMode === "local" || cycles.every((cycle) =>
      cycle.cabinetRunPath.endsWith("summary.json") && Boolean(cycle.cabinetCommand)
    ),
    executorEvidenceWrittenWhenAttempted: cycles.every((cycle) =>
      cycle.executionAttempted ? Boolean(cycle.executorSummaryPath) : true
    ),
    successfulExecutionsHavePassingChecks: cycles.every((cycle) =>
      cycle.executionAttempted ? cycle.executionOk : true
    ),
    stoppedWithKnownReason: finalStopReason !== "continue",
    noCompletionClaim: true,
    noMacDesktopControl: true,
    noGitPushOrDeploy: true
  };

  return {
    schema: "naikaku.guided-engineering-cycle.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission,
    locale: options.locale,
    maxLoops: options.maxLoops,
    cabinetMode: options.cabinetMode,
    executor: options.executor,
    runnerPreset: options.executor === "codex-smoke" ? "codex-cli" : options.runnerPreset,
    cycles,
    final: {
      decision: finalDecision,
      stopReason: finalStopReason,
      cyclesCompleted,
      executionAttempts,
      successfulExecutions
    },
    checks,
    claimBoundary: [
      "This command is the non-interactive cabinet loop: one mission enters, cabinet votes, an approved executor runs, then the loop decides whether to continue.",
      "Every cycle writes a local cabinet run or separated API-role cabinet summary before any executor command starts.",
      "API cabinet mode blocks execution when provider calls fail, role JSON cannot be parsed, the audit blocks, or the motion is not execution-authorized.",
      "Codex mode is scoped to a generated tiny project; auto-work mode can launch only a configured fixed runner preset or prepare handoff files.",
      "The loop stops on cabinet block, failed execution evidence, ship, or the configured max loop count.",
      "It does not grant arbitrary Mac control, host-secret access, Git push, deploy, purchases, external sends, or product backlog completion by itself."
    ]
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

function cycleMission(mission: string, previousCycles: GuidedCycleItem[]) {
  if (!previousCycles.length) return mission;
  const last = previousCycles[previousCycles.length - 1];
  return [
    mission,
    "",
    `Previous cycle ${last.cycle} decision: cabinet ${last.cabinetDecision}, executor ${last.executorDecision}.`,
    "Continue only with bounded, auditable local work and keep the receipt/evidence contract attached."
  ].join("\n");
}

async function missionFrom(options: GuidedEngineeringOptions) {
  if (options.missionFile) {
    return (await readFile(path.resolve(options.missionFile), "utf8")).trim();
  }
  return options.mission?.trim() || defaultMission;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function allChecksPassed(checks: Record<string, boolean> | undefined) {
  return checks ? Object.values(checks).every(Boolean) : false;
}

function summaryMarkdown(summary: GuidedEngineeringSummary) {
  return [
    "# Guided Engineering Cycle",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Locale: ${summary.locale}`,
    `Cabinet mode: ${summary.cabinetMode}`,
    `Executor: ${summary.executor}`,
    `Runner preset: ${summary.runnerPreset || "none"}`,
    `Max loops: ${summary.maxLoops}`,
    `Mission: ${summary.mission}`,
    "",
    "## Final",
    "",
    `- decision: ${summary.final.decision}`,
    `- stop reason: ${summary.final.stopReason}`,
    `- cycles completed: ${summary.final.cyclesCompleted}`,
    `- execution attempts: ${summary.final.executionAttempts}`,
    `- successful executions: ${summary.final.successfulExecutions}`,
    "",
    "## Cycles",
    "",
    ...summary.cycles.flatMap((cycle) => [
      `### Cycle ${cycle.cycle}`,
      "",
      `- cabinet mode: ${cycle.cabinetMode}`,
      `- cabinet: ${cycle.cabinetDecision} (${cycle.cabinetOverall})`,
      `- cabinet authorized: ${cycle.cabinetExecutionAuthorized ? "yes" : "no"}`,
      `- cabinet reason: ${cycle.cabinetReason}`,
      `- executor: ${cycle.executor}`,
      `- runner preset: ${cycle.runnerPreset || "none"}`,
      `- execution attempted: ${cycle.executionAttempted ? "yes" : "no"}`,
      `- execution ok: ${cycle.executionOk ? "yes" : "no"}`,
      `- executor decision: ${cycle.executorDecision}`,
      `- stop reason: ${cycle.stopReason}`,
      `- cabinet run: ${cycle.cabinetRunPath}`,
      `- cabinet command: ${cycle.cabinetCommand ? cycle.cabinetCommand.command : "local"}`,
      `- executor summary: ${cycle.executorSummaryPath || "not-run"}`,
      ""
    ]),
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([key, value]) => `- ${value ? "pass" : "fail"}: ${key}`),
    "",
    "## Claim Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function printSummary(summary: GuidedEngineeringSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log("Guided engineering cycle: " + (failed === 0 ? "ready" : "needs-review"));
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- cabinet mode: ${summary.cabinetMode}`);
  console.log(`- executor: ${summary.executor}`);
  console.log(`- final: ${summary.final.decision} / ${summary.final.stopReason}`);
  console.log(`- cycles: ${summary.cycles.length}/${summary.maxLoops}`);
  console.log(`- successful executions: ${summary.final.successfulExecutions}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): GuidedEngineeringOptions {
  const options: GuidedEngineeringOptions = {
    mission: null,
    missionFile: null,
    outputDir: "output/engineering-guided",
    locale: "ja",
    maxLoops: 1,
    cabinetMode: "local",
    cabinetProvider: "openai",
    cabinetEndpoint: null,
    cabinetModel: null,
    cabinetApiKeyAlias: null,
    executor: "codex-smoke",
    runnerPreset: null,
    adapterReady: false,
    worktreeDir: null,
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
    } else if (arg === "--max-loops" || arg === "--loops") {
      options.maxLoops = parseMaxLoops(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--cabinet-mode") {
      options.cabinetMode = parseCabinetMode(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--api-cabinet") {
      options.cabinetMode = "api";
    } else if (arg === "--api-cabinet-mock") {
      options.cabinetMode = "api-mock";
    } else if (arg === "--cabinet-provider") {
      options.cabinetProvider = parseProviderId(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--cabinet-endpoint") {
      options.cabinetEndpoint = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--cabinet-model") {
      options.cabinetModel = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--cabinet-api-key-alias") {
      const alias = requireValue(args, index, arg);
      assertEnvAlias(alias, arg);
      options.cabinetApiKeyAlias = alias;
      index += 1;
    } else if (arg === "--executor") {
      options.executor = parseExecutor(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--codex-smoke") {
      options.executor = "codex-smoke";
    } else if (arg === "--runner-preset") {
      options.runnerPreset = parsePresetId(requireValue(args, index, arg));
      options.executor = "auto-work";
      index += 1;
    } else if (arg === "--adapter-ready") {
      options.adapterReady = true;
    } else if (arg === "--worktree") {
      options.worktreeDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = parsePositiveNumber(requireValue(args, index, arg), "--timeout-ms");
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
  if (options.executor === "auto-work" && options.adapterReady && !options.runnerPreset) {
    throw new Error("--adapter-ready requires --runner-preset when using --executor auto-work.");
  }
  return options;
}

function parseExecutor(value: string): GuidedExecutor {
  if (value === "codex-smoke" || value === "auto-work") return value;
  throw new Error("Unsupported executor. Use codex-smoke or auto-work.");
}

function parseCabinetMode(value: string): GuidedCabinetMode {
  if (value === "local" || value === "api-mock" || value === "api") return value;
  throw new Error("Unsupported cabinet mode. Use local, api-mock, or api.");
}

function parseProviderId(value: string) {
  if (["openai", "anthropic", "openrouter", "aliyun", "google", "local", "custom"].includes(value)) {
    return value;
  }
  throw new Error("--cabinet-provider must be one of openai, anthropic, openrouter, aliyun, google, local, custom.");
}

function assertEnvAlias(value: string, name: string) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
    throw new Error(`${name} must be an environment variable name, not a raw secret.`);
  }
}

function parseMaxLoops(value: string) {
  const parsed = parsePositiveNumber(value, "--max-loops");
  if (parsed > 3) {
    throw new Error("--max-loops is intentionally capped at 3 for unattended safety.");
  }
  return parsed;
}

function parsePositiveNumber(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
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

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run engineering:guided -- --mission \"Implement X and run npm test\"",
    "  npm run engineering:guided -- --max-loops 3 --codex-smoke \"Prove governed Codex coding\"",
    "  npm run engineering:guided -- --runner-preset fixture --adapter-ready \"Run the safe fixture adapter\"",
    "  npm run engineering:guided -- --cabinet-mode api-mock --runner-preset fixture --adapter-ready \"Run separated mock roles before execution\"",
    "  npm run engineering:guided -- --cabinet-mode api --cabinet-provider aliyun --cabinet-model qwen-turbo --cabinet-api-key-alias DASHSCOPE_API_KEY --runner-preset fixture --adapter-ready \"Run separated provider roles before execution\"",
    "  npm run engineering:guided -- --runner-preset openclaw-local --adapter-ready \"Run my approved OpenClaw preset\"",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --max-loops, --loops <n>   1, 2, or 3. Default: 1.",
    "  --cabinet-mode <mode>      local, api-mock, or api. Default: local.",
    "  --api-cabinet              Shortcut for --cabinet-mode api.",
    "  --api-cabinet-mock         Shortcut for --cabinet-mode api-mock.",
    "  --cabinet-provider <kind>  openai, anthropic, openrouter, aliyun, google, local, or custom. Default: openai.",
    "  --cabinet-endpoint <url>   Provider endpoint override for API cabinet mode.",
    "  --cabinet-model <name>     Provider model for API cabinet mode.",
    "  --cabinet-api-key-alias <ENV> Environment variable name containing the API key.",
    "  --executor <name>          codex-smoke or auto-work. Default: codex-smoke.",
    "  --codex-smoke              Shortcut for --executor codex-smoke.",
    "  --runner-preset <id>       Fixed auto-work runner preset id; switches executor to auto-work.",
    "  --adapter-ready            Mark the selected fixed preset installed, license-reviewed, and approved for this run.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory under output/. Default: output/engineering-guided.",
    "  --worktree <dir>           Worktree for auto-work changed-file audit.",
    "  --timeout-ms <number>      Per-adapter timeout for auto-work. Default: 180000.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This command runs the same cabinet idea without the browser: vote through a local or separated API-role cabinet, execute a governed runner, inspect evidence, and continue only within the configured loop limit."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown guided engineering cycle failure.");
  process.exitCode = 1;
});
