import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

type TaskMode = "prepare" | "self-test" | "runner" | "codex-smoke" | "guided";
type GuidedCabinetMode = "local" | "api-mock" | "api";

interface NaikakuTaskOptions {
  mission: string | null;
  missionFile: string | null;
  outputDir: string;
  locale: SupportedLocale;
  mode: TaskMode | null;
  selfTest: boolean;
  codexSmoke: boolean;
  guided: boolean;
  guidedCabinetMode: GuidedCabinetMode;
  guidedMaxLoops: number;
  cabinetProvider: string;
  cabinetEndpoint: string | null;
  cabinetModel: string | null;
  cabinetApiKeyAlias: string | null;
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

interface CodexEngineerSmokeSummary {
  schema: "naikaku.codex-engineer-smoke.v1";
  mission: string;
  outputDir: string;
  worktreeDir: string;
  codex: {
    commandPath: string | null;
    exitCode: number;
    finalMessagePath: string;
  };
  tests: {
    baselineExitCode: number;
    finalExitCode: number;
  };
  files: {
    changedFiles: string[];
    changedFilesPath: string;
    diffPath: string;
    baselineTranscript: string;
    finalTranscript: string;
    codexTranscript: string;
    receiptPath: string;
  };
  checks: Record<string, boolean>;
  claimBoundary: string[];
}

interface GuidedEngineeringSummary {
  schema: "naikaku.guided-engineering-cycle.v1";
  cabinetMode: GuidedCabinetMode;
  executor: string;
  runnerPreset: string | null;
  maxLoops: number;
  cycles: Array<{
    cabinetMode: GuidedCabinetMode;
    cabinetExecutionAuthorized: boolean;
    executionAttempted: boolean;
    executionOk: boolean;
    executorSummaryPath: string | null;
  }>;
  final: {
    decision: string;
    stopReason: string;
    cyclesCompleted: number;
    executionAttempts: number;
    successfulExecutions: number;
  };
  checks: Record<string, boolean>;
}

interface GuidedEvidenceCounts {
  handoffTaskFiles: number;
  handoffJobFiles: number;
  handoffReadyTaskFiles: number;
  adapterCompletedJobs: number;
  importedReceipts: number;
  acceptedEvidence: number;
  verifiedArtifactPaths: number;
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
  autoWorkSummaryPath: string | null;
  codexSmokeSummaryPath: string | null;
  guidedSummaryPath: string | null;
  guided: {
    cabinetMode: GuidedCabinetMode;
    executor: string;
    runnerPreset: string | null;
    maxLoops: number;
    cycles: number;
    stopReason: string;
    executionAttempts: number;
    successfulExecutions: number;
  } | null;
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
    autoWorkSummary: string | null;
    handoffSummary: string | null;
    adapterRunSummary: string | null;
    adapterReviewSummary: string | null;
    codexSmokeSummary: string | null;
    codexSmokeReceipt: string | null;
    codexSmokeDiff: string | null;
    codexSmokeTranscript: string | null;
    guidedSummary: string | null;
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
    codexSmokeChecksPassed: boolean;
    guidedChecksPassed: boolean;
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
  const codexSmokeDir = path.join(outputDir, "codex-engineer-smoke");
  const guidedDir = path.join(outputDir, "guided");
  await mkdir(outputDir, { recursive: true });

  const command = mode === "codex-smoke"
    ? await runCommand({
        label: "codex-engineer-smoke",
        args: buildCodexSmokeArgs({ options, mission, codexSmokeDir })
      })
    : mode === "guided"
      ? await runCommand({
          label: "guided-engineering-cycle",
          args: buildGuidedArgs({ options, mission, guidedDir })
        })
    : await runCommand({
        label: "engineering-auto-work",
        args: buildAutoWorkArgs({ options, mission, mode, autoWorkDir })
      });
  const autoWorkSummaryPath = path.join(autoWorkDir, "summary.json");
  const codexSmokeSummaryPath = path.join(codexSmokeDir, "summary.json");
  const guidedSummaryPath = path.join(guidedDir, "summary.json");
  const autoWork = mode === "codex-smoke"
    ? null
    : mode === "guided"
      ? null
    : await readJsonIfExists<AutoWorkSummary>(autoWorkSummaryPath);
  const codexSmoke = mode === "codex-smoke"
    ? await readJsonIfExists<CodexEngineerSmokeSummary>(codexSmokeSummaryPath)
    : null;
  const guided = mode === "guided"
    ? await readJsonIfExists<GuidedEngineeringSummary>(guidedSummaryPath)
    : null;
  const guidedEvidence = guided ? await readGuidedEvidenceCounts(guided) : emptyGuidedEvidenceCounts();
  const summary = buildSummary({
    options,
    mission,
    mode,
    outputDir,
    autoWorkDir,
    codexSmokeDir,
    guidedDir,
    autoWork,
    codexSmoke,
    guided,
    guidedEvidence,
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

function buildCodexSmokeArgs({
  options,
  mission,
  codexSmokeDir
}: {
  options: NaikakuTaskOptions;
  mission: string;
  codexSmokeDir: string;
}) {
  return [
    "run",
    "codex:engineer-smoke",
    "--",
    "--mission",
    mission,
    "--out",
    relativePath(codexSmokeDir),
    "--generated-at",
    options.generatedAt
  ];
}

function buildGuidedArgs({
  options,
  mission,
  guidedDir
}: {
  options: NaikakuTaskOptions;
  mission: string;
  guidedDir: string;
}) {
  const runnerPreset = options.runnerPreset || "fixture";
  const adapterReady = options.adapterReady || runnerPreset === "fixture";
  const args = [
    "run",
    "engineering:guided",
    "--",
    "--mission",
    mission,
    "--locale",
    options.locale,
    "--cabinet-mode",
    options.guidedCabinetMode,
    "--max-loops",
    String(options.guidedMaxLoops),
    "--runner-preset",
    runnerPreset,
    "--out",
    relativePath(guidedDir),
    "--timeout-ms",
    String(options.timeoutMs),
    "--generated-at",
    options.generatedAt
  ];

  if (options.worktreeDir) {
    args.push("--worktree", normalizePath(options.worktreeDir));
  }
  if (adapterReady) {
    args.push("--adapter-ready");
  }
  if (options.guidedCabinetMode === "api") {
    args.push("--cabinet-provider", options.cabinetProvider);
    if (options.cabinetEndpoint) {
      args.push("--cabinet-endpoint", options.cabinetEndpoint);
    }
    if (options.cabinetModel) {
      args.push("--cabinet-model", options.cabinetModel);
    }
    if (options.cabinetApiKeyAlias) {
      assertEnvAlias(options.cabinetApiKeyAlias, "--cabinet-api-key-alias");
      args.push("--cabinet-api-key-alias", options.cabinetApiKeyAlias);
    }
  }

  return args;
}

function buildSummary({
  options,
  mission,
  mode,
  outputDir,
  autoWorkDir,
  codexSmokeDir,
  guidedDir,
  autoWork,
  codexSmoke,
  guided,
  guidedEvidence,
  command
}: {
  options: NaikakuTaskOptions;
  mission: string;
  mode: TaskMode;
  outputDir: string;
  autoWorkDir: string;
  codexSmokeDir: string;
  guidedDir: string;
  autoWork: AutoWorkSummary | null;
  codexSmoke: CodexEngineerSmokeSummary | null;
  guided: GuidedEngineeringSummary | null;
  guidedEvidence: GuidedEvidenceCounts;
  command: CommandRun;
}) {
  const counts = autoWork?.counts || {};
  const claims = autoWork?.claims || {};
  const decisions = autoWork?.decisions || {};
  const autoWorkChecksPassed = Boolean(autoWork?.checks && Object.values(autoWork.checks).every(Boolean));
  const codexChecksPassed = Boolean(codexSmoke?.checks && Object.values(codexSmoke.checks).every(Boolean));
  const isCodexSmoke = mode === "codex-smoke";
  const isGuided = mode === "guided";
  const guidedChecksPassed = Boolean(guided?.checks && Object.values(guided.checks).every(Boolean));
  const requestedRunner = mode !== "prepare";
  const codexReceiptWritten = codexSmoke?.checks.receiptWritten === true;
  const codexArtifacts = [
    codexSmoke?.files.diffPath,
    codexSmoke?.files.changedFilesPath,
    codexSmoke?.files.baselineTranscript,
    codexSmoke?.files.finalTranscript,
    codexSmoke?.files.codexTranscript,
    codexSmoke?.codex.finalMessagePath
  ].filter(Boolean);
  const summary: NaikakuTaskSummary = {
    schema: "naikaku.task-entry.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission,
    locale: options.locale,
    mode,
    runnerPreset: mode === "self-test"
      ? "fixture"
      : isCodexSmoke
        ? "codex-cli"
        : isGuided
          ? guided?.runnerPreset || options.runnerPreset || "fixture"
          : options.runnerPreset,
    command,
    autoWorkSummaryPath: isCodexSmoke || isGuided ? null : relativePath(path.join(autoWorkDir, "summary.json")),
    codexSmokeSummaryPath: isCodexSmoke ? relativePath(path.join(codexSmokeDir, "summary.json")) : null,
    guidedSummaryPath: isGuided ? relativePath(path.join(guidedDir, "summary.json")) : null,
    guided: isGuided ? {
      cabinetMode: guided?.cabinetMode || options.guidedCabinetMode,
      executor: guided?.executor || "auto-work",
      runnerPreset: guided?.runnerPreset || options.runnerPreset || "fixture",
      maxLoops: guided?.maxLoops || options.guidedMaxLoops,
      cycles: guided?.cycles.length || 0,
      stopReason: guided?.final.stopReason || "missing",
      executionAttempts: guided?.final.executionAttempts || 0,
      successfulExecutions: guided?.final.successfulExecutions || 0
    } : null,
    decisions: {
      handoff: isCodexSmoke
        ? "not-required-codex-smoke"
        : isGuided
          ? `guided-cabinet-${guided?.cabinetMode || options.guidedCabinetMode}`
          : decisions.handoff || "missing",
      adapterRun: isCodexSmoke
        ? codexSmoke?.codex.exitCode === 0 ? "codex-cli-completed" : "codex-cli-needs-review"
        : isGuided
          ? `guided-executions-${guided?.final.successfulExecutions || 0}/${guided?.final.executionAttempts || 0}`
        : decisions.adapterRun || "missing",
      adapterReview: isCodexSmoke
        ? codexChecksPassed ? "codex-receipt-verified" : "codex-receipt-needs-review"
        : isGuided
          ? guidedChecksPassed ? `guided-${guided?.final.stopReason || "stopped"}` : "guided-needs-review"
        : decisions.adapterReview || "missing"
    },
    counts: {
      handoffTaskFiles: isCodexSmoke ? 0 : isGuided ? guidedEvidence.handoffTaskFiles : counts.handoffTaskFiles || 0,
      handoffJobFiles: isCodexSmoke ? 0 : isGuided ? guidedEvidence.handoffJobFiles : counts.handoffJobFiles || 0,
      handoffReadyTaskFiles: isCodexSmoke ? 0 : isGuided ? guidedEvidence.handoffReadyTaskFiles : counts.handoffReadyTaskFiles || 0,
      adapterCompletedJobs: isCodexSmoke
        ? codexSmoke?.codex.exitCode === 0 ? 1 : 0
        : isGuided
          ? guidedEvidence.adapterCompletedJobs
          : counts.adapterCompletedJobs || 0,
      importedReceipts: isCodexSmoke
        ? codexReceiptWritten ? 1 : 0
        : isGuided
          ? guidedEvidence.importedReceipts
          : counts.importedReceipts || 0,
      acceptedEvidence: isCodexSmoke
        ? codexChecksPassed ? 1 : 0
        : isGuided
          ? guidedEvidence.acceptedEvidence
          : counts.acceptedEvidence || 0,
      verifiedArtifactPaths: isCodexSmoke
        ? codexArtifacts.length
        : isGuided
          ? guidedEvidence.verifiedArtifactPaths
          : counts.verifiedArtifactPaths || 0
    },
    claims: {
      handoffPrepared: isCodexSmoke ? false : isGuided ? guidedEvidence.handoffTaskFiles > 0 : claims.handoffPrepared === true,
      externalRunnerStarted: isCodexSmoke
        ? codexSmoke?.codex.exitCode === 0
        : isGuided
          ? (guided?.final.executionAttempts || 0) > 0
          : claims.externalRunnerStarted === true,
      externalReceiptImported: isCodexSmoke ? codexReceiptWritten : isGuided ? guidedEvidence.importedReceipts > 0 : claims.externalReceiptImported === true,
      implementationEvidenceAccepted: isCodexSmoke ? codexChecksPassed : isGuided ? guidedEvidence.acceptedEvidence > 0 : claims.implementationEvidenceAccepted === true,
      artifactAuditVerified: isCodexSmoke ? codexChecksPassed : isGuided ? guidedEvidence.verifiedArtifactPaths > 0 : claims.artifactAuditVerified === true,
      completion: false,
      macDesktopControl: false,
      gitPushOrDeploy: false
    },
    files: {
      autoWorkSummary: isCodexSmoke || isGuided ? null : relativePath(path.join(autoWorkDir, "summary.json")),
      handoffSummary: autoWork?.files?.handoffSummary || null,
      adapterRunSummary: autoWork?.files?.adapterRunSummary || null,
      adapterReviewSummary: autoWork?.files?.adapterReviewSummary || null,
      codexSmokeSummary: isCodexSmoke ? relativePath(path.join(codexSmokeDir, "summary.json")) : null,
      codexSmokeReceipt: codexSmoke?.files.receiptPath || null,
      codexSmokeDiff: codexSmoke?.files.diffPath || null,
      codexSmokeTranscript: codexSmoke?.files.codexTranscript || null,
      guidedSummary: isGuided ? relativePath(path.join(guidedDir, "summary.json")) : null
    },
    checks: {
      autoWorkExitedZero: command.exitCode === 0,
      handoffPrepared: isCodexSmoke
        ? true
        : isGuided
          ? guidedEvidence.handoffTaskFiles > 0
          : claims.handoffPrepared === true && (counts.handoffTaskFiles || 0) > 0,
      prepareModeDidNotStartRunner: mode === "prepare" ? claims.externalRunnerStarted !== true : true,
      requestedRunnerStarted: requestedRunner
        ? isCodexSmoke
          ? codexSmoke?.codex.exitCode === 0
          : isGuided
            ? (guided?.final.executionAttempts || 0) > 0
            : claims.externalRunnerStarted === true
        : true,
      requestedReceiptImported: requestedRunner
        ? isCodexSmoke
          ? codexReceiptWritten
          : isGuided
            ? guidedEvidence.importedReceipts >= (guided?.final.successfulExecutions || 1)
            : claims.externalReceiptImported === true
        : true,
      noCompletionClaim: isCodexSmoke || isGuided ? true : claims.completion === false,
      noMacDesktopControl: isCodexSmoke || isGuided ? true : claims.macDesktopControl === false,
      noGitPushOrDeploy: isCodexSmoke
        ? codexSmoke?.checks.noGitCommitOrPush === true
        : isGuided
          ? guided?.checks.noGitPushOrDeploy === true
          : claims.gitPushOrDeploy === false,
      autoWorkChecksPassed: isCodexSmoke || isGuided ? true : autoWorkChecksPassed,
      codexSmokeChecksPassed: isCodexSmoke ? codexChecksPassed : true,
      guidedChecksPassed: isGuided ? guidedChecksPassed : true
    },
    nextActions: nextActionsFor({ mode, runnerPreset: options.runnerPreset, outputDir: relativePath(outputDir) }),
    claimBoundary: [
      "This command is the simplest operator CLI entry for turning one mission into a governed Naikaku engineering run.",
      "Prepare mode writes supervised handoff artifacts but does not start external tools or claim implementation.",
      "Self-test mode uses the deterministic fixture runner to prove automation plumbing, not real backlog completion.",
      "Codex smoke mode calls local Codex CLI after cabinet approval to patch only a generated tiny project and return transcripts, diff, and receipt.",
      "Guided mode runs cabinet vote -> approved runner -> bounded continue/stop so the operator does not have to approve every routine loop.",
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
    "## Guided",
    "",
    summary.guided
      ? `- cabinet/executor/preset: ${summary.guided.cabinetMode} / ${summary.guided.executor} / ${summary.guided.runnerPreset || "none"}`
      : "- not-used",
    summary.guided
      ? `- cycles/limit/stop: ${summary.guided.cycles}/${summary.guided.maxLoops} / ${summary.guided.stopReason}`
      : "- cycles/limit/stop: not-used",
    summary.guided
      ? `- executions: ${summary.guided.successfulExecutions}/${summary.guided.executionAttempts}`
      : "- executions: not-used",
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
  if (mode === "codex-smoke") {
    return [
      `Inspect ${outputDir}/codex-engineer-smoke/summary.md for the Codex transcript, diff, receipt, and final test result.`,
      "Use this as the contributor-facing proof that Naikaku can govern a real AI coding runner without asking for every routine confirmation.",
      "Do not mark product backlog work complete from this generated-project smoke."
    ];
  }
  if (mode === "guided") {
    return [
      `Inspect ${outputDir}/guided/summary.md for cabinet votes, runner receipts, loop stop reason, and failed checks.`,
      "Use `--cabinet-mode api-mock` for no-key role-separated demos, or `--cabinet-mode api --cabinet-model <model> --cabinet-api-key-alias <ENV>` when live provider credentials are configured.",
      "Move from fixture to a real OpenHands/OpenClaw/Claude/Codex wrapper only after selecting a fixed preset and passing `--adapter-ready` for that run."
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

async function readGuidedEvidenceCounts(guided: GuidedEngineeringSummary): Promise<GuidedEvidenceCounts> {
  const totals = emptyGuidedEvidenceCounts();

  for (const cycle of guided.cycles) {
    if (!cycle.executorSummaryPath) continue;
    const summary = await readJsonIfExists<AutoWorkSummary>(path.resolve(cycle.executorSummaryPath));
    const counts = summary?.counts || {};
    totals.handoffTaskFiles += counts.handoffTaskFiles || 0;
    totals.handoffJobFiles += counts.handoffJobFiles || 0;
    totals.handoffReadyTaskFiles += counts.handoffReadyTaskFiles || 0;
    totals.adapterCompletedJobs += counts.adapterCompletedJobs || 0;
    totals.importedReceipts += counts.importedReceipts || 0;
    totals.acceptedEvidence += counts.acceptedEvidence || 0;
    totals.verifiedArtifactPaths += counts.verifiedArtifactPaths || 0;
  }

  return totals;
}

function emptyGuidedEvidenceCounts(): GuidedEvidenceCounts {
  return {
    handoffTaskFiles: 0,
    handoffJobFiles: 0,
    handoffReadyTaskFiles: 0,
    adapterCompletedJobs: 0,
    importedReceipts: 0,
    acceptedEvidence: 0,
    verifiedArtifactPaths: 0
  };
}

function modeFor(options: NaikakuTaskOptions): TaskMode {
  if (options.mode) return options.mode;
  if (options.guided) return "guided";
  if (options.codexSmoke) return "codex-smoke";
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
    codexSmoke: false,
    guided: false,
    guidedCabinetMode: "local",
    guidedMaxLoops: 1,
    cabinetProvider: "openai",
    cabinetEndpoint: null,
    cabinetModel: null,
    cabinetApiKeyAlias: null,
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
    } else if (arg === "--codex-smoke") {
      options.codexSmoke = true;
    } else if (arg === "--guided") {
      options.guided = true;
    } else if (arg === "--cabinet-mode") {
      options.guidedCabinetMode = parseGuidedCabinetMode(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--cabinet-provider") {
      options.cabinetProvider = parseProvider(requireValue(args, index, arg));
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
    } else if (arg === "--max-loops") {
      options.guidedMaxLoops = parseMaxLoops(requireValue(args, index, arg));
      index += 1;
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
  if (options.mode === "guided") {
    options.guided = true;
  }
  return options;
}

function parseMode(value: string): TaskMode {
  if (value === "prepare" || value === "self-test" || value === "runner" || value === "codex-smoke" || value === "guided") return value;
  throw new Error("Unsupported mode. Use prepare, self-test, runner, codex-smoke, or guided.");
}

function parseGuidedCabinetMode(value: string): GuidedCabinetMode {
  if (value === "local" || value === "api-mock" || value === "api") return value;
  throw new Error("--cabinet-mode must be local, api-mock, or api.");
}

function parseProvider(value: string) {
  if (["openai", "anthropic", "openrouter", "aliyun", "google", "local", "custom"].includes(value)) {
    return value;
  }
  throw new Error("--cabinet-provider must be one of openai, anthropic, openrouter, aliyun, google, local, custom.");
}

function parseMaxLoops(value: string) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(1, Math.min(3, Math.floor(parsed)));
  }
  throw new Error("--max-loops must be a number from 1 to 3.");
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

function assertEnvAlias(value: string, name: string) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
    throw new Error(`${name} must be an environment variable name, not a raw secret.`);
  }
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
    "  npm run naikaku:task -- --guided --cabinet-mode api-mock --max-loops 2 \"Vote, execute, and continue safely\"",
    "  npm run naikaku:task -- --self-test \"Prove the local fixture automation path\"",
    "  npm run naikaku:task -- --codex-smoke \"Prove Codex can patch code under cabinet governance\"",
    "  npm run naikaku:task -- --runner-preset local-wrapper-example --adapter-ready \"Run my configured local wrapper\"",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also works.",
    "  --mission-file <path>      Read mission text from a file.",
    "  --mode <name>              prepare, self-test, guided, codex-smoke, or runner. Default: prepare unless a runner flag is present.",
    "  --self-test                Shortcut for fixture self-test mode.",
    "  --guided                  Shortcut for cabinet vote -> approved runner -> bounded continue/stop mode.",
    "  --codex-smoke              Shortcut for governed Codex CLI coding smoke mode.",
    "  --cabinet-mode <mode>      local, api-mock, or api for guided mode. Default: local.",
    "  --max-loops <number>       Guided loop limit from 1 to 3. Default: 1.",
    "  --cabinet-provider <kind>  openai, anthropic, openrouter, aliyun, google, local, or custom.",
    "  --cabinet-endpoint <url>   Endpoint override for guided API cabinet mode.",
    "  --cabinet-model <name>     Model for guided API cabinet mode.",
    "  --cabinet-api-key-alias <ENV> Environment variable containing the API key; raw keys are rejected.",
    "  --runner-preset <id>       Fixed local runner preset id for runner mode.",
    "  --adapter-ready            Record selected adapter as installed, license-reviewed, and approved for this run.",
    "  --locale <code>            ja, en, zh-Hans, zh-Hant, ko. Default: ja.",
    "  --out <dir>                Output directory under output/. Default: output/naikaku-task.",
    "  --worktree <dir>           Worktree for changed-file audit.",
    "  --timeout-ms <number>      Per-adapter timeout. Default: 60000.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This is the operator-facing CLI entry. It delegates to engineering:auto-work or the governed Codex smoke and keeps the claim boundary explicit."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown Naikaku task failure.");
  process.exitCode = 1;
});
