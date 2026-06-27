import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

interface OpenSourceMvpCheckOptions {
  outputDir: string;
  timeoutMs: number;
  help: boolean;
}

interface CheckStep {
  id: string;
  label: string;
  command: string;
  args: string[];
  proves: string;
  env?: Record<string, string>;
}

interface CheckResult {
  id: string;
  label: string;
  command: string;
  args: string[];
  proves: string;
  commandLine: string;
  exitCode: number;
  expectedExitCode: number;
  passed: boolean;
  durationMs: number;
}

interface OpenSourceMvpCheckSummary {
  schema: "naikaku.open-source-mvp-check.v1";
  generatedAt: string;
  outputDir: string;
  cases: CheckResult[];
  checks: {
    buildPassed: boolean;
    targetedTestsPassed: boolean;
    gatewayAutoWorkPassed: boolean;
    gatewayEvidenceVerified: boolean;
    configuredPresetBridgePassed: boolean;
    configuredPresetEvidenceVerified: boolean;
    taskEntryPassed: boolean;
    taskEntryEvidenceVerified: boolean;
    apiRoleSmokePassed: boolean;
    apiRoleSmokeEvidenceVerified: boolean;
    guidedCliPassed: boolean;
    guidedCliEvidenceVerified: boolean;
    guidedApiCliPassed: boolean;
    guidedApiCliEvidenceVerified: boolean;
    runnerKitPassed: boolean;
    runnerKitEvidenceVerified: boolean;
    fixtureCodingLoopPassed: boolean;
    fixturePatchVerified: boolean;
    allPassed: boolean;
  };
  evidence: {
    gatewayAutoWorkSummary: string;
    configuredPresetBridgeSummary: string;
    taskEntrySummary: string;
    apiRoleSmokeSummary: string;
    guidedCliSummary: string;
    guidedApiCliSummary: string;
    runnerKitSummary: string;
    fixtureCodingLoopSummary: string;
    gatewayAutoWork: GatewayAutoWorkEvidence;
    configuredPresetBridge: ConfiguredPresetBridgeEvidence;
    taskEntry: TaskEntryEvidence;
    apiRoleSmoke: ApiRoleSmokeEvidence;
    guidedCli: GuidedCliEvidence;
    guidedApiCli: GuidedCliEvidence;
    runnerKit: RunnerKitEvidence;
    fixtureCodingLoop: FixtureCodingLoopEvidence;
  };
  claimBoundary: string[];
}

interface GatewayAutoWorkEvidence {
  summaryReadable: boolean;
  preset: string | null;
  mode: string | null;
  importedReceipts: number;
  acceptedEvidence: number;
  verifiedArtifactPaths: number;
  checksPass: number;
  checksFail: number;
}

interface FixtureCodingLoopEvidence {
  summaryReadable: boolean;
  changedFile: string | null;
  baselineTestExitCode: number | null;
  finalTestExitCode: number | null;
  receiptDecision: string | null;
  evidenceDecision: string | null;
  artifactAuditDecision: string | null;
  verifiedArtifactPaths: number;
  worktreeChangedFiles: number;
  failedTestRejected: boolean;
  cleanWorktreeClaimRejected: boolean;
}

interface ConfiguredPresetBridgeEvidence {
  summaryReadable: boolean;
  runnerPreset: string | null;
  mode: string | null;
  adapterId: string | null;
  adapterCompletedJobs: number;
  importedReceipts: number;
  acceptedEvidence: number;
  verifiedArtifactPaths: number;
  adapterReviewDecision: string | null;
  allChecksPassed: boolean;
}

interface TaskEntryEvidence {
  summaryReadable: boolean;
  mode: string | null;
  handoffPrepared: boolean;
  handoffTaskFiles: number;
  externalRunnerStarted: boolean;
  completion: boolean;
  allChecksPassed: boolean;
}

interface GuidedCliEvidence {
  summaryReadable: boolean;
  cabinetMode: string | null;
  executor: string | null;
  runnerPreset: string | null;
  stopReason: string | null;
  maxLoops: number;
  cycles: number;
  executionAttempts: number;
  successfulExecutions: number;
  allChecksPassed: boolean;
}

interface ApiRoleSmokeEvidence {
  summaryReadable: boolean;
  mode: string | null;
  roles: number;
  decision: string | null;
  roleOutputsParsed: boolean;
  noExternalRunnerStarted: boolean;
  noGitOrDeploy: boolean;
  allChecksPassed: boolean;
}

interface RunnerKitEvidence {
  summaryReadable: boolean;
  wrapperWritten: boolean;
  presetValid: boolean;
  handoffReady: boolean;
  sampleJobWritten: boolean;
  smokeImportedReceipts: number;
  smokeAcceptedEvidence: number;
  smokeVerifiedArtifactPaths: number;
  allChecksPassed: boolean;
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const steps = buildSteps({
    outputDir,
    timeoutMs: options.timeoutMs
  });
  const results: CheckResult[] = [];

  for (const step of steps) {
    console.log(`\n==> ${step.label}`);
    console.log(`$ ${formatCommandLine(step.command, step.args)}`);
    const result = runStep(step);
    results.push(result);
  }

  const summary = buildSummary({
    outputDir,
    results,
    generatedAt: new Date().toISOString()
  });

  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!summary.checks.allPassed) {
    process.exitCode = 1;
  }
}

function buildSteps({
  outputDir,
  timeoutMs
}: {
  outputDir: string;
  timeoutMs: number;
}): CheckStep[] {
  const configuredPresetWorktree = relativePath(path.join(outputDir, "configured-preset-bridge", "worktree"));
  const configuredPresetEnv = JSON.stringify([
    {
      id: "fixture-configured",
      label: "Configured fixture runner",
      adapterId: "openhands-coding-agent",
      command: "tsx",
      args: [
        "scripts/engineering-fixture-external-runner.ts",
        "--job",
        "{jobPath}",
        "--worktree",
        configuredPresetWorktree,
        "--generated-at",
        "2026-06-27T00:00:00.000Z"
      ],
      commandCandidates: ["tsx"],
      nextAction: "Run the fixture runner through the configured preset path."
    }
  ]);

  return [
    {
      id: "build",
      label: "Type-check and production build",
      command: npmCommand,
      args: ["run", "build"],
      proves: "The TypeScript/Vite app compiles from a fresh checkout."
    },
    {
      id: "targeted-tests",
      label: "MVP targeted tests",
      command: npxCommand,
      args: [
        "vitest",
        "run",
        "src/i18n.test.ts",
        "server/engineeringAutoWorkGateway.test.ts",
        "server/engineeringCodexSmokeGateway.test.ts",
        "server/engineeringGuidedGateway.test.ts",
        "server/engineeringRunnerPresets.test.ts",
        "server/engineeringRunnerReadiness.test.ts",
        "src/domain/engineeringSelfSimulation.test.ts"
      ],
      proves: "Japanese-first localization, runner presets/readiness, gateway auto-work, governed Codex smoke gateway, and engineering self-simulation contracts still hold."
    },
    {
      id: "gateway-auto-work",
      label: "Gateway fixture auto-work smoke",
      command: npmCommand,
      args: [
        "run",
        "engineering:auto-work-gateway-smoke",
        "--",
        "--out",
        path.join(outputDir, "gateway-auto-work"),
        "--timeout-ms",
        String(timeoutMs)
      ],
      proves: "The local gateway can accept a mission through /v1/engineering/auto-work, run the fixture adapter, import a receipt, and audit evidence/artifacts."
    },
    {
      id: "configured-preset-bridge",
      label: "Configured CLI preset bridge",
      command: npmCommand,
      args: [
        "run",
        "engineering:auto-work",
        "--",
        "--mission",
        "Configured preset smoke: launch a fixed CLI adapter and import receipt",
        "--adapter-ready",
        "--runner-preset",
        "fixture-configured",
        "--out",
        path.join(outputDir, "configured-preset-bridge"),
        "--worktree",
        configuredPresetWorktree,
        "--generated-at",
        "2026-06-27T00:00:00.000Z",
        "--timeout-ms",
        String(timeoutMs)
      ],
      env: {
        NAIKAKU_ENGINEERING_RUNNER_PRESETS: configuredPresetEnv
      },
      proves: "A server-style configured preset id can launch a fixed local CLI adapter without accepting arbitrary browser shell input."
    },
    {
      id: "task-entry",
      label: "Operator task entry",
      command: npmCommand,
      args: [
        "run",
        "naikaku:task",
        "--",
        "--mission",
        "Task entry smoke: prepare a governed engineering run",
        "--locale",
        "ja",
        "--out",
        path.join(outputDir, "task-entry"),
        "--generated-at",
        "2026-06-27T00:00:00.000Z",
        "--timeout-ms",
        String(timeoutMs)
      ],
      proves: "A user can enter one mission through the short Naikaku task CLI and receive supervised handoff output without overclaiming completion."
    },
    {
      id: "api-role-smoke",
      label: "Separated API role smoke",
      command: npmCommand,
      args: [
        "run",
        "cabinet:api-role-smoke",
        "--",
        "--mock",
        "--mission",
        "API role smoke: separate model-provider roles produce proposal, critique, supervision, and a cabinet vote",
        "--out",
        path.join(outputDir, "api-role-smoke"),
        "--generated-at",
        "2026-06-27T00:00:00.000Z"
      ],
      proves: "The same Prime Minister/Critic/Supervisor role split can run through the provider-call contract without starting a runner or persisting raw secrets."
    },
    {
      id: "guided-cli",
      label: "Guided cabinet CLI loop",
      command: npmCommand,
      args: [
        "run",
        "engineering:guided",
        "--",
        "--mission",
        "Guided CLI smoke: vote, run the fixed fixture runner, then stop by cabinet decision or loop limit",
        "--max-loops",
        "3",
        "--runner-preset",
        "fixture",
        "--adapter-ready",
        "--out",
        path.join(outputDir, "guided-cli"),
        "--generated-at",
        "2026-06-27T00:00:00.000Z",
        "--timeout-ms",
        String(timeoutMs)
      ],
      proves: "The command-line operator path can run cabinet vote -> governed fixed runner -> bounded continue/stop without browser interaction."
    },
    {
      id: "guided-api-cli",
      label: "Guided API-role cabinet loop",
      command: npmCommand,
      args: [
        "run",
        "engineering:guided",
        "--",
        "--cabinet-mode",
        "api-mock",
        "--mission",
        "Guided API-role smoke: separate cabinet roles vote before each fixed runner execution",
        "--max-loops",
        "2",
        "--runner-preset",
        "fixture",
        "--adapter-ready",
        "--out",
        path.join(outputDir, "guided-api-cli"),
        "--generated-at",
        "2026-06-27T00:00:00.000Z",
        "--timeout-ms",
        String(timeoutMs)
      ],
      proves: "The command-line operator path can run separated Prime/Critic/Supervisor role calls before each governed runner execution and stop at a bounded loop limit."
    },
    {
      id: "runner-kit",
      label: "External runner wrapper kit",
      command: npmCommand,
      args: [
        "run",
        "engineering:runner-kit",
        "--",
        "--mission",
        "Runner kit smoke: generate a local wrapper and return Naikaku evidence",
        "--out",
        path.join(outputDir, "runner-kit"),
        "--generated-at",
        "2026-06-27T00:00:00.000Z",
        "--timeout-ms",
        String(timeoutMs)
      ],
      proves: "A contributor can generate a runnable local wrapper kit with preset JSON, sample handoff/job files, and verified receipt/evidence smoke output."
    },
    {
      id: "fixture-coding-loop",
      label: "Fixture coding-agent engineering loop",
      command: npmCommand,
      args: [
        "run",
        "coding-agent:engineering-sim",
        "--",
        "--out",
        path.join(outputDir, "fixture-coding-loop"),
        "--locale",
        "ja"
      ],
      proves: "A generated fixture repository can fail a test, receive a patch, pass the test, and produce receipt/evidence/artifact audit output."
    }
  ];
}

function runStep(step: CheckStep): CheckResult {
  const startedAt = Date.now();
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...step.env
    },
    stdio: "inherit",
    shell: false
  });
  const durationMs = Date.now() - startedAt;
  const exitCode = typeof result.status === "number" ? result.status : 1;

  if (result.error) {
    console.error(result.error instanceof Error ? result.error.message : result.error);
  }

  return {
    id: step.id,
    label: step.label,
    command: step.command,
    args: step.args,
    proves: step.proves,
    commandLine: formatCommandLine(step.command, step.args),
    exitCode,
    expectedExitCode: 0,
    passed: exitCode === 0,
    durationMs
  };
}

function buildSummary({
  outputDir,
  results,
  generatedAt
}: {
  outputDir: string;
  results: CheckResult[];
  generatedAt: string;
}): OpenSourceMvpCheckSummary {
  const byId = new Map(results.map((result) => [result.id, result]));
  const gatewayEvidence = readGatewayEvidence(path.join(outputDir, "gateway-auto-work", "summary.json"));
  const configuredPresetEvidence = readConfiguredPresetBridgeEvidence(path.join(
    outputDir,
    "configured-preset-bridge",
    "summary.json"
  ));
  const taskEntryEvidence = readTaskEntryEvidence(path.join(outputDir, "task-entry", "summary.json"));
  const apiRoleSmokeEvidence = readApiRoleSmokeEvidence(path.join(outputDir, "api-role-smoke", "summary.json"));
  const guidedCliEvidence = readGuidedCliEvidence(path.join(outputDir, "guided-cli", "summary.json"));
  const guidedApiCliEvidence = readGuidedCliEvidence(path.join(outputDir, "guided-api-cli", "summary.json"));
  const runnerKitEvidence = readRunnerKitEvidence(path.join(outputDir, "runner-kit", "summary.json"));
  const fixtureEvidence = readFixtureEvidence(path.join(outputDir, "fixture-coding-loop", "summary.json"));
  const gatewayEvidenceVerified = gatewayEvidence.summaryReadable &&
    gatewayEvidence.preset === "fixture" &&
    gatewayEvidence.mode === "external-run-attempted" &&
    gatewayEvidence.importedReceipts >= 1 &&
    gatewayEvidence.acceptedEvidence >= 1 &&
    gatewayEvidence.verifiedArtifactPaths >= 1 &&
    gatewayEvidence.checksFail === 0;
  const configuredPresetEvidenceVerified = configuredPresetEvidence.summaryReadable &&
    configuredPresetEvidence.runnerPreset === "fixture-configured" &&
    configuredPresetEvidence.mode === "external-run-attempted" &&
    configuredPresetEvidence.adapterId === "openhands-coding-agent" &&
    configuredPresetEvidence.adapterCompletedJobs >= 1 &&
    configuredPresetEvidence.importedReceipts >= 1 &&
    configuredPresetEvidence.acceptedEvidence >= 1 &&
    configuredPresetEvidence.verifiedArtifactPaths >= 1 &&
    configuredPresetEvidence.adapterReviewDecision === "verified" &&
    configuredPresetEvidence.allChecksPassed;
  const taskEntryEvidenceVerified = taskEntryEvidence.summaryReadable &&
    taskEntryEvidence.mode === "prepare" &&
    taskEntryEvidence.handoffPrepared &&
    taskEntryEvidence.handoffTaskFiles >= 1 &&
    !taskEntryEvidence.externalRunnerStarted &&
    !taskEntryEvidence.completion &&
    taskEntryEvidence.allChecksPassed;
  const apiRoleSmokeEvidenceVerified = apiRoleSmokeEvidence.summaryReadable &&
    apiRoleSmokeEvidence.mode === "mock" &&
    apiRoleSmokeEvidence.roles === 3 &&
    apiRoleSmokeEvidence.decision !== null &&
    apiRoleSmokeEvidence.roleOutputsParsed &&
    apiRoleSmokeEvidence.noExternalRunnerStarted &&
    apiRoleSmokeEvidence.noGitOrDeploy &&
    apiRoleSmokeEvidence.allChecksPassed;
  const guidedCliEvidenceVerified = guidedCliEvidence.summaryReadable &&
    guidedCliEvidence.executor === "auto-work" &&
    guidedCliEvidence.runnerPreset === "fixture" &&
    guidedCliEvidence.maxLoops === 3 &&
    guidedCliEvidence.cycles >= 1 &&
    guidedCliEvidence.cycles <= 3 &&
    guidedCliEvidence.executionAttempts >= 1 &&
    guidedCliEvidence.successfulExecutions >= 1 &&
    guidedCliEvidence.stopReason !== "continue" &&
    guidedCliEvidence.allChecksPassed;
  const guidedApiCliEvidenceVerified = guidedApiCliEvidence.summaryReadable &&
    guidedApiCliEvidence.cabinetMode === "api-mock" &&
    guidedApiCliEvidence.executor === "auto-work" &&
    guidedApiCliEvidence.runnerPreset === "fixture" &&
    guidedApiCliEvidence.maxLoops === 2 &&
    guidedApiCliEvidence.cycles === 2 &&
    guidedApiCliEvidence.executionAttempts === 2 &&
    guidedApiCliEvidence.successfulExecutions === 2 &&
    guidedApiCliEvidence.stopReason === "limit-reached" &&
    guidedApiCliEvidence.allChecksPassed;
  const runnerKitEvidenceVerified = runnerKitEvidence.summaryReadable &&
    runnerKitEvidence.wrapperWritten &&
    runnerKitEvidence.presetValid &&
    runnerKitEvidence.handoffReady &&
    runnerKitEvidence.sampleJobWritten &&
    runnerKitEvidence.smokeImportedReceipts >= 1 &&
    runnerKitEvidence.smokeAcceptedEvidence >= 1 &&
    runnerKitEvidence.smokeVerifiedArtifactPaths >= 1 &&
    runnerKitEvidence.allChecksPassed;
  const fixturePatchVerified = fixtureEvidence.summaryReadable &&
    fixtureEvidence.baselineTestExitCode === 1 &&
    fixtureEvidence.finalTestExitCode === 0 &&
    fixtureEvidence.receiptDecision === "verified" &&
    fixtureEvidence.evidenceDecision === "accepted-for-handoff" &&
    fixtureEvidence.artifactAuditDecision === "verified" &&
    fixtureEvidence.verifiedArtifactPaths >= 4 &&
    fixtureEvidence.worktreeChangedFiles >= 1 &&
    fixtureEvidence.failedTestRejected &&
    fixtureEvidence.cleanWorktreeClaimRejected;
  const checks = {
    buildPassed: byId.get("build")?.passed === true,
    targetedTestsPassed: byId.get("targeted-tests")?.passed === true,
    gatewayAutoWorkPassed: byId.get("gateway-auto-work")?.passed === true,
    gatewayEvidenceVerified,
    configuredPresetBridgePassed: byId.get("configured-preset-bridge")?.passed === true,
    configuredPresetEvidenceVerified,
    taskEntryPassed: byId.get("task-entry")?.passed === true,
    taskEntryEvidenceVerified,
    apiRoleSmokePassed: byId.get("api-role-smoke")?.passed === true,
    apiRoleSmokeEvidenceVerified,
    guidedCliPassed: byId.get("guided-cli")?.passed === true,
    guidedCliEvidenceVerified,
    guidedApiCliPassed: byId.get("guided-api-cli")?.passed === true,
    guidedApiCliEvidenceVerified,
    runnerKitPassed: byId.get("runner-kit")?.passed === true,
    runnerKitEvidenceVerified,
    fixtureCodingLoopPassed: byId.get("fixture-coding-loop")?.passed === true,
    fixturePatchVerified,
    allPassed: results.every((result) => result.passed) &&
      gatewayEvidenceVerified &&
      configuredPresetEvidenceVerified &&
      taskEntryEvidenceVerified &&
      apiRoleSmokeEvidenceVerified &&
      guidedCliEvidenceVerified &&
      guidedApiCliEvidenceVerified &&
      runnerKitEvidenceVerified &&
      fixturePatchVerified
  };

  return {
    schema: "naikaku.open-source-mvp-check.v1",
    generatedAt,
    outputDir: relativePath(outputDir),
    cases: results,
    checks,
    evidence: {
      gatewayAutoWorkSummary: relativePath(path.join(outputDir, "gateway-auto-work", "summary.json")),
      configuredPresetBridgeSummary: relativePath(path.join(outputDir, "configured-preset-bridge", "summary.json")),
      taskEntrySummary: relativePath(path.join(outputDir, "task-entry", "summary.json")),
      apiRoleSmokeSummary: relativePath(path.join(outputDir, "api-role-smoke", "summary.json")),
      guidedCliSummary: relativePath(path.join(outputDir, "guided-cli", "summary.json")),
      guidedApiCliSummary: relativePath(path.join(outputDir, "guided-api-cli", "summary.json")),
      runnerKitSummary: relativePath(path.join(outputDir, "runner-kit", "summary.json")),
      fixtureCodingLoopSummary: relativePath(path.join(outputDir, "fixture-coding-loop", "summary.json")),
      gatewayAutoWork: gatewayEvidence,
      configuredPresetBridge: configuredPresetEvidence,
      taskEntry: taskEntryEvidence,
      apiRoleSmoke: apiRoleSmokeEvidence,
      guidedCli: guidedCliEvidence,
      guidedApiCli: guidedApiCliEvidence,
      runnerKit: runnerKitEvidence,
      fixtureCodingLoop: fixtureEvidence
    },
    claimBoundary: [
      "This check proves local build/test health, gateway auto-work plumbing, configured CLI preset bridging, the one-mission Naikaku task entry, separated provider-role governance, bounded local/API-role guided CLI loops, a runnable external-runner wrapper kit, and a no-provider fixture coding loop.",
      "It does not prove a real OpenClaw/OpenHands/Hermes run, arbitrary desktop control, production deployment, Git push, or completion of real backlog work.",
      "External CLI runners should be invoked as governed adapters that return Naikaku receipts and evidence, not as unbounded host automation."
    ]
  };
}

function readGatewayEvidence(filePath: string): GatewayAutoWorkEvidence {
  const parsed = readJsonIfExists<{
    cases?: {
      autoWorkPreset?: unknown;
      autoWorkMode?: unknown;
      importedReceipts?: unknown;
      acceptedEvidence?: unknown;
      verifiedArtifactPaths?: unknown;
      checksPass?: unknown;
      checksFail?: unknown;
    };
  }>(filePath);
  const cases = parsed?.cases || {};

  return {
    summaryReadable: Boolean(parsed),
    preset: stringOrNull(cases.autoWorkPreset),
    mode: stringOrNull(cases.autoWorkMode),
    importedReceipts: numberOrZero(cases.importedReceipts),
    acceptedEvidence: numberOrZero(cases.acceptedEvidence),
    verifiedArtifactPaths: numberOrZero(cases.verifiedArtifactPaths),
    checksPass: numberOrZero(cases.checksPass),
    checksFail: numberOrZero(cases.checksFail)
  };
}

function readConfiguredPresetBridgeEvidence(filePath: string): ConfiguredPresetBridgeEvidence {
  const parsed = readJsonIfExists<{
    runnerPreset?: unknown;
    mode?: unknown;
    adapterId?: unknown;
    decisions?: {
      adapterReview?: unknown;
    };
    counts?: {
      adapterCompletedJobs?: unknown;
      importedReceipts?: unknown;
      acceptedEvidence?: unknown;
      verifiedArtifactPaths?: unknown;
    };
    checks?: Record<string, unknown>;
  }>(filePath);
  const counts = parsed?.counts || {};
  const checks = parsed?.checks || {};

  return {
    summaryReadable: Boolean(parsed),
    runnerPreset: stringOrNull(parsed?.runnerPreset),
    mode: stringOrNull(parsed?.mode),
    adapterId: stringOrNull(parsed?.adapterId),
    adapterCompletedJobs: numberOrZero(counts.adapterCompletedJobs),
    importedReceipts: numberOrZero(counts.importedReceipts),
    acceptedEvidence: numberOrZero(counts.acceptedEvidence),
    verifiedArtifactPaths: numberOrZero(counts.verifiedArtifactPaths),
    adapterReviewDecision: stringOrNull(parsed?.decisions?.adapterReview),
    allChecksPassed: Object.values(checks).length > 0 && Object.values(checks).every((value) => value === true)
  };
}

function readTaskEntryEvidence(filePath: string): TaskEntryEvidence {
  const parsed = readJsonIfExists<{
    mode?: unknown;
    counts?: {
      handoffTaskFiles?: unknown;
    };
    claims?: {
      handoffPrepared?: unknown;
      externalRunnerStarted?: unknown;
      completion?: unknown;
    };
    checks?: Record<string, unknown>;
  }>(filePath);
  const counts = parsed?.counts || {};
  const claims = parsed?.claims || {};
  const checks = parsed?.checks || {};

  return {
    summaryReadable: Boolean(parsed),
    mode: stringOrNull(parsed?.mode),
    handoffPrepared: claims.handoffPrepared === true,
    handoffTaskFiles: numberOrZero(counts.handoffTaskFiles),
    externalRunnerStarted: claims.externalRunnerStarted === true,
    completion: claims.completion === true,
    allChecksPassed: Object.values(checks).length > 0 && Object.values(checks).every((value) => value === true)
  };
}

function readApiRoleSmokeEvidence(filePath: string): ApiRoleSmokeEvidence {
  const parsed = readJsonIfExists<{
    mode?: unknown;
    roles?: unknown[];
    decision?: {
      decision?: unknown;
    } | null;
    checks?: {
      roleOutputsParsed?: unknown;
      noExternalRunnerStarted?: unknown;
      noGitOrDeploy?: unknown;
    } & Record<string, unknown>;
  }>(filePath);
  const checks = parsed?.checks || {};

  return {
    summaryReadable: Boolean(parsed),
    mode: stringOrNull(parsed?.mode),
    roles: Array.isArray(parsed?.roles) ? parsed.roles.length : 0,
    decision: stringOrNull(parsed?.decision?.decision),
    roleOutputsParsed: checks.roleOutputsParsed === true,
    noExternalRunnerStarted: checks.noExternalRunnerStarted === true,
    noGitOrDeploy: checks.noGitOrDeploy === true,
    allChecksPassed: Object.values(checks).length > 0 && Object.values(checks).every((value) => value === true)
  };
}

function readGuidedCliEvidence(filePath: string): GuidedCliEvidence {
  const parsed = readJsonIfExists<{
    cabinetMode?: unknown;
    executor?: unknown;
    runnerPreset?: unknown;
    maxLoops?: unknown;
    cycles?: unknown[];
    final?: {
      stopReason?: unknown;
      executionAttempts?: unknown;
      successfulExecutions?: unknown;
    };
    checks?: Record<string, unknown>;
  }>(filePath);
  const checks = parsed?.checks || {};

  return {
    summaryReadable: Boolean(parsed),
    cabinetMode: stringOrNull(parsed?.cabinetMode),
    executor: stringOrNull(parsed?.executor),
    runnerPreset: stringOrNull(parsed?.runnerPreset),
    stopReason: stringOrNull(parsed?.final?.stopReason),
    maxLoops: numberOrZero(parsed?.maxLoops),
    cycles: Array.isArray(parsed?.cycles) ? parsed.cycles.length : 0,
    executionAttempts: numberOrZero(parsed?.final?.executionAttempts),
    successfulExecutions: numberOrZero(parsed?.final?.successfulExecutions),
    allChecksPassed: Object.values(checks).length > 0 && Object.values(checks).every((value) => value === true)
  };
}

function readRunnerKitEvidence(filePath: string): RunnerKitEvidence {
  const parsed = readJsonIfExists<{
    counts?: {
      smokeImportedReceipts?: unknown;
      smokeAcceptedEvidence?: unknown;
      smokeVerifiedArtifactPaths?: unknown;
    };
    checks?: {
      wrapperWritten?: unknown;
      presetValid?: unknown;
      handoffReady?: unknown;
      sampleJobWritten?: unknown;
    } & Record<string, unknown>;
  }>(filePath);
  const counts = parsed?.counts || {};
  const checks = parsed?.checks || {};

  return {
    summaryReadable: Boolean(parsed),
    wrapperWritten: checks.wrapperWritten === true,
    presetValid: checks.presetValid === true,
    handoffReady: checks.handoffReady === true,
    sampleJobWritten: checks.sampleJobWritten === true,
    smokeImportedReceipts: numberOrZero(counts.smokeImportedReceipts),
    smokeAcceptedEvidence: numberOrZero(counts.smokeAcceptedEvidence),
    smokeVerifiedArtifactPaths: numberOrZero(counts.smokeVerifiedArtifactPaths),
    allChecksPassed: Object.values(checks).length > 0 && Object.values(checks).every((value) => value === true)
  };
}

function readFixtureEvidence(filePath: string): FixtureCodingLoopEvidence {
  const parsed = readJsonIfExists<{
    fixture?: {
      changedFile?: unknown;
      baselineTestExitCode?: unknown;
      finalTestExitCode?: unknown;
    };
    receipt?: {
      decision?: unknown;
    };
    evidence?: {
      decision?: unknown;
    };
    artifactAudit?: {
      decision?: unknown;
      verifiedPaths?: unknown;
      worktreeChangedFiles?: unknown;
    };
    checks?: {
      failedTestClaimRejected?: unknown;
      cleanWorktreeClaimRejected?: unknown;
    };
  }>(filePath);

  return {
    summaryReadable: Boolean(parsed),
    changedFile: stringOrNull(parsed?.fixture?.changedFile),
    baselineTestExitCode: numberOrNull(parsed?.fixture?.baselineTestExitCode),
    finalTestExitCode: numberOrNull(parsed?.fixture?.finalTestExitCode),
    receiptDecision: stringOrNull(parsed?.receipt?.decision),
    evidenceDecision: stringOrNull(parsed?.evidence?.decision),
    artifactAuditDecision: stringOrNull(parsed?.artifactAudit?.decision),
    verifiedArtifactPaths: numberOrZero(parsed?.artifactAudit?.verifiedPaths),
    worktreeChangedFiles: numberOrZero(parsed?.artifactAudit?.worktreeChangedFiles),
    failedTestRejected: parsed?.checks?.failedTestClaimRejected === true,
    cleanWorktreeClaimRejected: parsed?.checks?.cleanWorktreeClaimRejected === true
  };
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function parseArgs(args: string[]): OpenSourceMvpCheckOptions {
  const options: OpenSourceMvpCheckOptions = {
    outputDir: "output/open-source-mvp-check",
    timeoutMs: 60_000,
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

    if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
        throw new Error("--timeout-ms must be a positive number.");
      }
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

function assertSafeOutputDir(outputDir: string) {
  const outputRoot = path.resolve("output");
  const relative = path.relative(outputRoot, outputDir);
  if (!existsSync(outputRoot)) {
    mkdirSync(outputRoot, { recursive: true });
  }
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must point to a subdirectory under output/.");
  }
}

function printHelp() {
  console.log([
    "Naikaku open-source MVP check",
    "",
    "Usage:",
    "  npm run open-source:mvp-check -- [options]",
    "",
    "Options:",
    "  --out <dir>          Output directory under output/. Default: output/open-source-mvp-check",
    "  --timeout-ms <ms>    Gateway auto-work timeout. Default: 60000",
    "  -h, --help           Show this help.",
    "",
    "The check builds the app, runs targeted MVP tests, exercises the gateway auto-work endpoint,",
    "runs a configured CLI preset bridge, proves the one-mission task entry, proves separated API role governance, proves local and API-role guided CLI loops,",
    "generates a local runner wrapper kit, and runs the fixture coding loop that patches a generated repository and verifies receipts/evidence."
  ].join("\n"));
}

function printSummary(summary: OpenSourceMvpCheckSummary) {
  const passed = summary.cases.filter((item) => item.passed).length;
  const failed = summary.cases.length - passed;
  console.log("\nOpen-source MVP check: " + (summary.checks.allPassed ? "passed" : "failed"));
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Checks: ${passed} pass, ${failed} fail`);
  console.log(`Summary: ${path.resolve(summary.outputDir, "summary.json")}`);
  console.log(`Report: ${path.resolve(summary.outputDir, "summary.md")}`);
}

function summaryMarkdown(summary: OpenSourceMvpCheckSummary) {
  const lines = [
    "# Open-Source MVP Check",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Result",
    "",
    `- overall: ${summary.checks.allPassed ? "pass" : "fail"}`,
    `- build: ${summary.checks.buildPassed ? "pass" : "fail"}`,
    `- targeted tests: ${summary.checks.targetedTestsPassed ? "pass" : "fail"}`,
    `- gateway auto-work: ${summary.checks.gatewayAutoWorkPassed ? "pass" : "fail"}`,
    `- gateway evidence: ${summary.checks.gatewayEvidenceVerified ? "pass" : "fail"}`,
    `- configured preset bridge: ${summary.checks.configuredPresetBridgePassed ? "pass" : "fail"}`,
    `- configured preset evidence: ${summary.checks.configuredPresetEvidenceVerified ? "pass" : "fail"}`,
    `- task entry: ${summary.checks.taskEntryPassed ? "pass" : "fail"}`,
    `- task entry evidence: ${summary.checks.taskEntryEvidenceVerified ? "pass" : "fail"}`,
    `- API role smoke: ${summary.checks.apiRoleSmokePassed ? "pass" : "fail"}`,
    `- API role evidence: ${summary.checks.apiRoleSmokeEvidenceVerified ? "pass" : "fail"}`,
    `- guided CLI: ${summary.checks.guidedCliPassed ? "pass" : "fail"}`,
    `- guided CLI evidence: ${summary.checks.guidedCliEvidenceVerified ? "pass" : "fail"}`,
    `- guided API-role CLI: ${summary.checks.guidedApiCliPassed ? "pass" : "fail"}`,
    `- guided API-role evidence: ${summary.checks.guidedApiCliEvidenceVerified ? "pass" : "fail"}`,
    `- runner kit: ${summary.checks.runnerKitPassed ? "pass" : "fail"}`,
    `- runner kit evidence: ${summary.checks.runnerKitEvidenceVerified ? "pass" : "fail"}`,
    `- fixture coding loop: ${summary.checks.fixtureCodingLoopPassed ? "pass" : "fail"}`,
    `- fixture patch evidence: ${summary.checks.fixturePatchVerified ? "pass" : "fail"}`,
    "",
    "## Cases",
    "",
    ...summary.cases.flatMap((item) => [
      `### ${item.label}`,
      "",
      `- status: ${item.passed ? "pass" : "fail"}`,
      `- command: \`${item.commandLine}\``,
      `- exit: ${item.exitCode} (expected ${item.expectedExitCode})`,
      `- duration: ${item.durationMs} ms`,
      `- proves: ${item.proves}`,
      ""
    ]),
    "## Evidence",
    "",
    `- gateway auto-work summary: ${summary.evidence.gatewayAutoWorkSummary}`,
    `- gateway receipts/evidence/artifacts: ${summary.evidence.gatewayAutoWork.importedReceipts} / ${summary.evidence.gatewayAutoWork.acceptedEvidence} / ${summary.evidence.gatewayAutoWork.verifiedArtifactPaths}`,
    `- configured preset bridge summary: ${summary.evidence.configuredPresetBridgeSummary}`,
    `- configured preset jobs/receipts/evidence/artifacts: ${summary.evidence.configuredPresetBridge.adapterCompletedJobs} / ${summary.evidence.configuredPresetBridge.importedReceipts} / ${summary.evidence.configuredPresetBridge.acceptedEvidence} / ${summary.evidence.configuredPresetBridge.verifiedArtifactPaths}`,
    `- task entry summary: ${summary.evidence.taskEntrySummary}`,
    `- task entry mode/handoff/completion: ${summary.evidence.taskEntry.mode || "unknown"} / ${summary.evidence.taskEntry.handoffTaskFiles} / ${summary.evidence.taskEntry.completion ? "claimed" : "not-claimed"}`,
    `- API role smoke summary: ${summary.evidence.apiRoleSmokeSummary}`,
    `- API role mode/roles/decision: ${summary.evidence.apiRoleSmoke.mode || "unknown"} / ${summary.evidence.apiRoleSmoke.roles} / ${summary.evidence.apiRoleSmoke.decision || "unknown"}`,
    `- guided CLI summary: ${summary.evidence.guidedCliSummary}`,
    `- guided CLI cabinet/executor/preset/loops/stop: ${summary.evidence.guidedCli.cabinetMode || "unknown"} / ${summary.evidence.guidedCli.executor || "unknown"} / ${summary.evidence.guidedCli.runnerPreset || "unknown"} / ${summary.evidence.guidedCli.cycles}/${summary.evidence.guidedCli.maxLoops} / ${summary.evidence.guidedCli.stopReason || "unknown"}`,
    `- guided API-role CLI summary: ${summary.evidence.guidedApiCliSummary}`,
    `- guided API-role cabinet/executor/preset/loops/stop: ${summary.evidence.guidedApiCli.cabinetMode || "unknown"} / ${summary.evidence.guidedApiCli.executor || "unknown"} / ${summary.evidence.guidedApiCli.runnerPreset || "unknown"} / ${summary.evidence.guidedApiCli.cycles}/${summary.evidence.guidedApiCli.maxLoops} / ${summary.evidence.guidedApiCli.stopReason || "unknown"}`,
    `- runner kit summary: ${summary.evidence.runnerKitSummary}`,
    `- runner kit receipts/evidence/artifacts: ${summary.evidence.runnerKit.smokeImportedReceipts} / ${summary.evidence.runnerKit.smokeAcceptedEvidence} / ${summary.evidence.runnerKit.smokeVerifiedArtifactPaths}`,
    `- fixture coding loop summary: ${summary.evidence.fixtureCodingLoopSummary}`,
    `- fixture changed file: ${summary.evidence.fixtureCodingLoop.changedFile || "unknown"}`,
    `- fixture fail/pass exits: ${summary.evidence.fixtureCodingLoop.baselineTestExitCode ?? "unknown"} -> ${summary.evidence.fixtureCodingLoop.finalTestExitCode ?? "unknown"}`,
    `- fixture receipt/evidence/audit: ${summary.evidence.fixtureCodingLoop.receiptDecision || "unknown"} / ${summary.evidence.fixtureCodingLoop.evidenceDecision || "unknown"} / ${summary.evidence.fixtureCodingLoop.artifactAuditDecision || "unknown"}`,
    "",
    "## Claim Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function formatCommandLine(command: string, args: string[]) {
  return [command, ...args].map(quoteShellArg).join(" ");
}

function quoteShellArg(value: string) {
  if (/^[A-Za-z0-9_./:@=+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown open-source MVP check failure.");
  process.exitCode = 1;
}
