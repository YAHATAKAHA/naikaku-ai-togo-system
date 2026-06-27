import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCodingAgentSessionReceiptTemplate } from "../src/domain/codingAgentSessionReceipt";
import type {
  CodingAgentCommandResult,
  CodingAgentSessionBundle
} from "../src/domain/types";
import type { ExternalRunnerAdapterJob } from "../src/domain/externalRunnerHandoff";

const sessionId = "coding-session-adapter-bridge-fixture";
const testCommand = "node checks/cabinetScore.check.mjs";
const changedFixtureFile = "src/cabinetScore.mjs";

interface EngineeringAdapterSelfTestOptions {
  outputDir: string;
  locale: string;
  generatedAt: string;
  help: boolean;
}

interface CommandExecution {
  command: string;
  cwd: string;
  exitCode: number;
  output: string;
  durationMs: number;
}

interface GitCommandResult {
  exitCode: number;
  output: string;
}

interface AdapterRunReviewSummary {
  schema: "naikaku.engineering-adapter-run-review.v1";
  adapterReceipts: {
    loadedReceipts: number;
    reviewReadyJobs: number;
  };
  receipt: {
    decision: string;
    verified: number;
    failed: number;
  };
  evidence: {
    decision: string;
    accepted: number;
    commandResults: number;
    changedFiles: number;
  };
  artifactAudit: {
    decision: string;
    verifiedPaths: number;
    missingPaths: number;
    worktreeChangedFiles: number;
    worktreeCheckedChangedFiles: number;
    transcriptContentChecked: number;
    transcriptContentMismatches: number;
  };
  files: {
    submittedReceipt: string;
    receiptReview: string;
    implementationEvidence: string;
    artifactAudit: string;
  };
  checks: Record<string, boolean>;
}

interface AdapterSelfTestSummary {
  schema: "naikaku.engineering-adapter-self-test.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  adapterRun: {
    decision: string;
    completed: number;
    externalReceiptsPresent: number;
    readyForImplementationReview: number;
    adapterExecutionReceiptPath: string | null;
  };
  adapterRunReview: {
    schema: string;
    loadedReceipts: number;
    reviewReadyJobs: number;
    passedChecks: number;
    failedChecks: number;
    submittedReceiptPath: string;
    receiptReviewPath: string;
    implementationEvidencePath: string;
    artifactAuditPath: string;
  };
  fixture: {
    workspacePath: string;
    changedFile: string;
    baselineTestExitCode: number;
    finalTestExitCode: number;
    gitStatus: string;
    baselineTranscript: string;
    finalTranscript: string;
    diffArtifact: string;
  };
  receipt: {
    decision: string;
    verified: number;
    failed: number;
  };
  evidence: {
    decision: string;
    accepted: number;
    commandResults: number;
    changedFiles: number;
  };
  artifactAudit: {
    decision: string;
    verifiedPaths: number;
    missingPaths: number;
    worktreeChangedFiles: number;
    transcriptContentMismatches: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);
  const fixtureDir = path.join(outputDir, "fixture-workspace");
  const runnerDir = path.join(outputDir, "fake-external-runner");
  const adapterRunDir = path.join(outputDir, "adapter-run");
  const adapterReviewDir = path.join(outputDir, "adapter-review");
  const artifactPrefix = `${outputRelativeDir}/session/`;
  const baselineTranscript = `${artifactPrefix}baseline-test.log`;
  const finalTranscript = `${artifactPrefix}final-test.log`;
  const diffArtifact = `${artifactPrefix}fixture-diff.patch`;
  const changedFilePath = `${outputRelativeDir}/fixture-workspace/${changedFixtureFile}`;
  const submittedReceiptPath = `${outputRelativeDir}/submitted-receipt.json`;
  const runnerResultPath = `${outputRelativeDir}/fake-external-runner/result.json`;
  const taskPath = `${outputRelativeDir}/adapter-task.md`;
  const jobPath = `${outputRelativeDir}/adapter-job.json`;
  const runnerScriptPath = path.join(runnerDir, "runner.mjs");
  const runnerConfigPath = path.join(runnerDir, "config.json");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await writeFixtureWorkspace(fixtureDir);
  initializeFixtureGit(fixtureDir);

  const bundle = buildFixtureBundle({
    generatedAt: options.generatedAt,
    locale: options.locale,
    artifactPrefix
  });
  await writeJson(path.join(outputDir, "fixture-session-bundle.json"), bundle);
  await writeFile(path.resolve(taskPath), taskMarkdown(), "utf8");
  await writeFakeRunner(runnerScriptPath);
  await writeJson(runnerConfigPath, {
    generatedAt: options.generatedAt,
    fixtureDir,
    receiptPath: path.resolve(submittedReceiptPath),
    resultPath: path.resolve(runnerResultPath),
    changedFilePath,
    changedFixtureFile,
    testCommand,
    baselineTranscript: path.resolve(baselineTranscript),
    finalTranscript: path.resolve(finalTranscript),
    diffArtifact: path.resolve(diffArtifact),
    receiptItem: receiptItemSkeleton(bundle)
  });
  await writeJson(path.resolve(jobPath), adapterJob({
    generatedAt: options.generatedAt,
    taskPath,
    submittedReceiptPath,
    runnerScriptPath: relativePath(runnerScriptPath),
    runnerConfigPath: relativePath(runnerConfigPath),
    baselineTranscript,
    finalTranscript,
    diffArtifact
  }));

  const adapterRun = runAdapterBridge({
    jobPath,
    adapterRunDir: relativePath(adapterRunDir),
    generatedAt: options.generatedAt
  });
  if (adapterRun.exitCode !== 0) {
    throw new Error(`Adapter bridge self-test runner failed: ${adapterRun.output}`);
  }

  const adapterRunSummary = JSON.parse(readFileSync(path.join(adapterRunDir, "summary.json"), "utf8")) as {
    summary: {
      completed: number;
      externalReceiptsPresent: number;
      readyForImplementationReview: number;
    };
    jobs: Array<{
      adapterExecutionReceiptPath: string;
    }>;
  };
  const adapterRunReview = runAdapterRunReview({
    bundlePath: relativePath(path.join(outputDir, "fixture-session-bundle.json")),
    adapterRunPath: relativePath(path.join(adapterRunDir, "summary.json")),
    outputDir: relativePath(adapterReviewDir),
    worktreeDir: relativePath(fixtureDir),
    generatedAt: options.generatedAt
  });
  if (adapterRunReview.exitCode !== 0) {
    throw new Error(`Adapter run review failed: ${adapterRunReview.output}`);
  }
  const adapterRunReviewSummary = JSON.parse(
    readFileSync(path.join(adapterReviewDir, "summary.json"), "utf8")
  ) as AdapterRunReviewSummary;
  const runnerResult = JSON.parse(readFileSync(path.resolve(runnerResultPath), "utf8")) as {
    baseline: CommandExecution;
    final: CommandExecution;
  };
  const gitStatus = runGit(["status", "--porcelain=v1", "--untracked-files=all"], fixtureDir).output.trim();
  const summary = buildSummary({
    generatedAt: options.generatedAt,
    outputRelativeDir,
    locale: options.locale,
    fixtureRelativeDir: relativePath(fixtureDir),
    changedFilePath,
    baseline: runnerResult.baseline,
    final: runnerResult.final,
    baselineTranscript,
    finalTranscript,
    diffArtifact,
    gitStatus,
    adapterRunSummary,
    adapterRunReviewSummary
  });

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function buildFixtureBundle({
  generatedAt,
  locale,
  artifactPrefix
}: {
  generatedAt: string;
  locale: string;
  artifactPrefix: string;
}): CodingAgentSessionBundle {
  const evidenceRequired = [
    "Baseline failing test transcript.",
    "Fixture patch diff artifact.",
    "Final command transcript with exit code."
  ];

  return {
    schema: "naikaku.coding-agent-session-bundle.v1",
    generatedAt,
    mode: "dry-run",
    mission: "Prove a Naikaku adapter bridge can drive an external CLI runner through a tiny fixture coding task.",
    runId: "engineering-adapter-self-test",
    operatorLocale: locale,
    sourceSchema: "naikaku.coding-agent-briefs.v1",
    requireProductionEvidence: false,
    review: {
      schema: "naikaku.coding-agent-brief-review.v1",
      generatedAt,
      sourceSchema: "naikaku.coding-agent-briefs.v1",
      operatorLocale: locale,
      runId: "engineering-adapter-self-test",
      decision: "ready",
      checks: [],
      summary: {
        total: 0,
        passed: 0,
        warnings: 0,
        blockers: 0,
        briefs: 1,
        implementable: 1,
        humanReview: 0
      }
    },
    decision: "ready",
    sessions: [{
      id: sessionId,
      briefId: "coding-brief-adapter-bridge-fixture",
      sourceItemId: "adapter-bridge-fixture-score-normalizer",
      title: "External adapter fixture coding loop",
      mode: "implement",
      priority: "medium",
      executorProfileId: "shell-container",
      status: "ready-for-agent",
      promptFileName: "adapter-bridge-fixture.md",
      sandboxContract: {
        boundary: "sandbox-only",
        executorProfileId: "shell-container",
        allowedActions: [
          "read-fixture-files",
          "edit-fixture-files",
          "run-fixture-tests",
          "write-local-evidence-artifacts",
          "write-naikaku-receipt"
        ],
        prohibitedActions: [
          "raw-secret-export",
          "production-deploy",
          "remote-delete",
          "purchase",
          "external-message-send",
          "unreviewed-git-push"
        ],
        requiresHumanApproval: false,
        evidenceArtifactPrefix: artifactPrefix,
        receiptSchema: "naikaku.coding-agent-session-receipt.v1"
      },
      handoffMarkdown: taskMarkdown(),
      verificationCommands: [testCommand],
      evidenceRequired,
      safetyStops: [
        "Stop if the changed file path escapes the generated fixture workspace.",
        "Stop if the adapter command requires network, deployment, or host secret access."
      ],
      nextAction: "Run the adapter bridge, patch the fixture, write a Naikaku receipt, then review artifacts."
    }],
    summary: {
      total: 1,
      ready: 1,
      held: 0,
      humanApproval: 0,
      productionHeld: 0,
      verificationCommands: 1,
      evidenceItems: evidenceRequired.length
    }
  };
}

function receiptItemSkeleton(bundle: CodingAgentSessionBundle) {
  const template = buildCodingAgentSessionReceiptTemplate({
    bundle,
    generatedAt: bundle.generatedAt
  });
  const item = template.items[0];
  return {
    sessionId: item.sessionId,
    briefId: item.briefId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    sessionStatus: item.sessionStatus
  };
}

function adapterJob({
  generatedAt,
  taskPath,
  submittedReceiptPath,
  runnerScriptPath,
  runnerConfigPath,
  baselineTranscript,
  finalTranscript,
  diffArtifact
}: {
  generatedAt: string;
  taskPath: string;
  submittedReceiptPath: string;
  runnerScriptPath: string;
  runnerConfigPath: string;
  baselineTranscript: string;
  finalTranscript: string;
  diffArtifact: string;
}): ExternalRunnerAdapterJob {
  return {
    schema: "naikaku.external-runner-adapter-job.v1",
    generatedAt,
    adapterId: "openhands-coding-agent",
    sessionId,
    title: "External adapter fixture coding loop",
    status: "ready-for-adapter",
    executable: true,
    taskPath,
    sourceInvocationPath: null,
    promptPath: taskPath,
    receiptDraftPath: submittedReceiptPath,
    commandPlan: {
      command: "node",
      args: [runnerScriptPath, runnerConfigPath],
      workingDirectory: ".",
      stdin: null,
      stdoutTranscriptPath: "output/engineering-adapter-self-test/adapter-run/transcripts/stdout.log",
      stderrTranscriptPath: "output/engineering-adapter-self-test/adapter-run/transcripts/stderr.log"
    },
    evidence: {
      expectedArtifacts: [
        { label: "Baseline failing test transcript.", path: baselineTranscript },
        { label: "Fixture patch diff artifact.", path: diffArtifact },
        { label: "Final command transcript with exit code.", path: finalTranscript }
      ],
      receiptDraftPath: submittedReceiptPath
    },
    restrictions: {
      prohibitedByDefault: [
        "host-wide filesystem access",
        "raw environment dumps",
        "Git push",
        "deploy",
        "external writes"
      ],
      stopConditions: [
        "Stop on credential prompt.",
        "Stop on unapproved external write.",
        "Stop if evidence cannot be written under the configured output directory."
      ]
    }
  };
}

async function writeFixtureWorkspace(fixtureDir: string) {
  await mkdir(path.join(fixtureDir, "src"), { recursive: true });
  await mkdir(path.join(fixtureDir, "checks"), { recursive: true });
  await writeJson(path.join(fixtureDir, "package.json"), {
    type: "module",
    scripts: {
      test: testCommand
    }
  });
  await writeFile(path.join(fixtureDir, changedFixtureFile), buggyCabinetScoreSource(), "utf8");
  await writeFile(path.join(fixtureDir, "checks/cabinetScore.check.mjs"), cabinetScoreTestSource(), "utf8");
}

function initializeFixtureGit(fixtureDir: string) {
  assertGitOk(runGit(["init"], fixtureDir), "git init");
  assertGitOk(runGit(["add", "."], fixtureDir), "git add");
  assertGitOk(runGit([
    "-c",
    "user.name=Naikaku Adapter Fixture",
    "-c",
    "user.email=adapter-fixture@example.invalid",
    "commit",
    "-m",
    "adapter fixture baseline"
  ], fixtureDir), "git commit");
}

async function writeFakeRunner(runnerScriptPath: string) {
  await mkdir(path.dirname(runnerScriptPath), { recursive: true });
  await writeFile(runnerScriptPath, fakeRunnerSource(), "utf8");
}

function runAdapterBridge({
  jobPath,
  adapterRunDir,
  generatedAt
}: {
  jobPath: string;
  adapterRunDir: string;
  generatedAt: string;
}): GitCommandResult {
  const result = spawnSync("npm", [
    "exec",
    "--",
    "tsx",
    "scripts/engineering-run-adapter.ts",
    "--job",
    jobPath,
    "--out",
    adapterRunDir,
    "--require-receipt",
    "--generated-at",
    generatedAt,
    "--timeout-ms",
    "60000"
  ], {
    cwd: process.cwd(),
    shell: false,
    encoding: "utf8",
    maxBuffer: 4_000_000,
    env: {
      ...process.env,
      CI: "1"
    }
  });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function runAdapterRunReview({
  bundlePath,
  adapterRunPath,
  outputDir,
  worktreeDir,
  generatedAt
}: {
  bundlePath: string;
  adapterRunPath: string;
  outputDir: string;
  worktreeDir: string;
  generatedAt: string;
}): GitCommandResult {
  const result = spawnSync("npm", [
    "exec",
    "--",
    "tsx",
    "scripts/engineering-review-adapter-run.ts",
    "--bundle",
    bundlePath,
    "--adapter-run",
    adapterRunPath,
    "--out",
    outputDir,
    "--worktree",
    worktreeDir,
    "--generated-at",
    generatedAt
  ], {
    cwd: process.cwd(),
    shell: false,
    encoding: "utf8",
    maxBuffer: 4_000_000,
    env: {
      ...process.env,
      CI: "1"
    }
  });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function buildSummary({
  generatedAt,
  outputRelativeDir,
  locale,
  fixtureRelativeDir,
  changedFilePath,
  baseline,
  final,
  baselineTranscript,
  finalTranscript,
  diffArtifact,
  gitStatus,
  adapterRunSummary,
  adapterRunReviewSummary
}: {
  generatedAt: string;
  outputRelativeDir: string;
  locale: string;
  fixtureRelativeDir: string;
  changedFilePath: string;
  baseline: CommandExecution;
  final: CommandExecution;
  baselineTranscript: string;
  finalTranscript: string;
  diffArtifact: string;
  gitStatus: string;
  adapterRunSummary: {
    summary: {
      completed: number;
      externalReceiptsPresent: number;
      readyForImplementationReview: number;
    };
    jobs: Array<{
      adapterExecutionReceiptPath: string;
    }>;
  };
  adapterRunReviewSummary: AdapterRunReviewSummary;
}): AdapterSelfTestSummary {
  const adapterRunReviewPassedChecks = Object.values(adapterRunReviewSummary.checks).filter(Boolean).length;
  const adapterRunReviewFailedChecks = Object.values(adapterRunReviewSummary.checks).length - adapterRunReviewPassedChecks;
  const checks = {
    adapterBridgeCompleted: adapterRunSummary.summary.completed === 1,
    adapterExecutionReceiptWritten: Boolean(
      adapterRunSummary.jobs[0]?.adapterExecutionReceiptPath &&
      existsSync(path.resolve(adapterRunSummary.jobs[0].adapterExecutionReceiptPath))
    ),
    externalReceiptPresent: adapterRunSummary.summary.externalReceiptsPresent === 1,
    readyForImplementationReview: adapterRunSummary.summary.readyForImplementationReview === 1,
    adapterRunReviewImportedReceipt:
      adapterRunReviewSummary.adapterReceipts.loadedReceipts === 1 &&
      adapterRunReviewSummary.adapterReceipts.reviewReadyJobs === 1,
    adapterRunReviewVerified: adapterRunReviewFailedChecks === 0,
    baselineTestFailedBeforePatch: baseline.exitCode !== 0,
    finalTestPassedAfterPatch: final.exitCode === 0,
    fixtureGitShowsChangedFile: gitStatus.split(/\r?\n/).some((line) => line.endsWith(changedFixtureFile)),
    receiptReviewVerified:
      adapterRunReviewSummary.receipt.decision === "verified" &&
      adapterRunReviewSummary.receipt.verified === 1,
    implementationEvidenceAccepted:
      adapterRunReviewSummary.evidence.decision === "accepted-for-handoff" &&
      adapterRunReviewSummary.evidence.accepted === 1,
    artifactAuditVerified: adapterRunReviewSummary.artifactAudit.decision === "verified",
    changedFileWorktreeVerified:
      adapterRunReviewSummary.artifactAudit.worktreeCheckedChangedFiles === 1 &&
      adapterRunReviewSummary.artifactAudit.worktreeChangedFiles === 1,
    transcriptContentMatched:
      adapterRunReviewSummary.artifactAudit.transcriptContentChecked === 1 &&
      adapterRunReviewSummary.artifactAudit.transcriptContentMismatches === 0,
    fixtureBoundaryClear:
      changedFilePath.startsWith(`${outputRelativeDir}/fixture-workspace/`) &&
      baselineTranscript.startsWith(`${outputRelativeDir}/session/`) &&
      finalTranscript.startsWith(`${outputRelativeDir}/session/`) &&
      diffArtifact.startsWith(`${outputRelativeDir}/session/`)
  };

  return {
    schema: "naikaku.engineering-adapter-self-test.v1",
    generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: locale,
    adapterRun: {
      decision: checks.adapterBridgeCompleted ? "completed" : "needs-review",
      completed: adapterRunSummary.summary.completed,
      externalReceiptsPresent: adapterRunSummary.summary.externalReceiptsPresent,
      readyForImplementationReview: adapterRunSummary.summary.readyForImplementationReview,
      adapterExecutionReceiptPath: adapterRunSummary.jobs[0]?.adapterExecutionReceiptPath ?? null
    },
    adapterRunReview: {
      schema: adapterRunReviewSummary.schema,
      loadedReceipts: adapterRunReviewSummary.adapterReceipts.loadedReceipts,
      reviewReadyJobs: adapterRunReviewSummary.adapterReceipts.reviewReadyJobs,
      passedChecks: adapterRunReviewPassedChecks,
      failedChecks: adapterRunReviewFailedChecks,
      submittedReceiptPath: adapterRunReviewSummary.files.submittedReceipt,
      receiptReviewPath: adapterRunReviewSummary.files.receiptReview,
      implementationEvidencePath: adapterRunReviewSummary.files.implementationEvidence,
      artifactAuditPath: adapterRunReviewSummary.files.artifactAudit
    },
    fixture: {
      workspacePath: fixtureRelativeDir,
      changedFile: changedFilePath,
      baselineTestExitCode: baseline.exitCode,
      finalTestExitCode: final.exitCode,
      gitStatus,
      baselineTranscript,
      finalTranscript,
      diffArtifact
    },
    receipt: {
      decision: adapterRunReviewSummary.receipt.decision,
      verified: adapterRunReviewSummary.receipt.verified,
      failed: adapterRunReviewSummary.receipt.failed
    },
    evidence: {
      decision: adapterRunReviewSummary.evidence.decision,
      accepted: adapterRunReviewSummary.evidence.accepted,
      commandResults: adapterRunReviewSummary.evidence.commandResults,
      changedFiles: adapterRunReviewSummary.evidence.changedFiles
    },
    artifactAudit: {
      decision: adapterRunReviewSummary.artifactAudit.decision,
      verifiedPaths: adapterRunReviewSummary.artifactAudit.verifiedPaths,
      missingPaths: adapterRunReviewSummary.artifactAudit.missingPaths,
      worktreeChangedFiles: adapterRunReviewSummary.artifactAudit.worktreeChangedFiles,
      transcriptContentMismatches: adapterRunReviewSummary.artifactAudit.transcriptContentMismatches
    },
    checks,
    honestyClaim: {
      claim: "This self-test proves Naikaku can launch an external CLI runner through adapter job JSON, receive a Naikaku session receipt, and pass the existing implementation evidence and artifact-audit chain for a tiny fixture coding task.",
      limitations: [
        "The runner is a deterministic local fixture runner, not a real OpenHands model run.",
        "It modifies only generated files under the configured output directory.",
        "It does not browse, control macOS, call providers, use MCP tools, deploy, push Git, or contact external services."
      ],
      productionRequirements: [
        "Replace the fixture runner command with a user-installed OpenHands/OpenClaw/browser-use/Hammerspoon-style adapter command.",
        "Keep real runners scoped by sandbox policy, approval gates, transcript capture, and receipt review.",
        "Run release verification before accepting real Development Board completion."
      ]
    }
  };
}

function taskMarkdown() {
  return [
    "# Adapter Bridge Fixture Task",
    "",
    "Patch `src/cabinetScore.mjs` in the generated fixture workspace.",
    "Run the fixture command before and after the patch.",
    "Write a Naikaku coding-agent session receipt with changed files, command transcript, diff artifact, and risks.",
    "Stay inside the generated output directory."
  ].join("\n");
}

function fakeRunnerSource() {
  return `import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const config = JSON.parse(readFileSync(process.argv[2], "utf8"));

function runCommand(command, cwd) {
  const startedAt = Date.now();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    maxBuffer: 2000000,
    env: { ...process.env, CI: "1" }
  });
  return {
    command,
    cwd,
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: \`\${result.stdout || ""}\${result.stderr || ""}\`,
    durationMs: Date.now() - startedAt
  };
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    shell: false,
    encoding: "utf8",
    maxBuffer: 2000000
  });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: \`\${result.stdout || ""}\${result.stderr || ""}\`
  };
}

function writeArtifact(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\\n") ? content : \`\${content}\\n\`, "utf8");
}

function transcriptFor(label, execution, note) {
  return [
    \`label: \${label}\`,
    \`command: \${execution.command}\`,
    \`cwd: \${execution.cwd}\`,
    \`exit code: \${execution.exitCode}\`,
    \`exitCode: \${execution.exitCode}\`,
    \`durationMs: \${execution.durationMs}\`,
    \`note: \${note}\`,
    "",
    "----- command output -----",
    execution.output
  ].join("\\n");
}

const baseline = runCommand(config.testCommand, config.fixtureDir);
writeArtifact(config.baselineTranscript, transcriptFor(
  "adapter-baseline-before-patch",
  baseline,
  "Expected to fail before the external adapter fixture runner patches the implementation."
));

writeFileSync(path.join(config.fixtureDir, config.changedFixtureFile), [
  "export function normalizeScore(value) {",
  "  const numeric = Number(value);",
  "",
  "  if (!Number.isFinite(numeric)) {",
  "    return 0;",
  "  }",
  "",
  "  return Math.min(100, Math.max(0, Math.round(numeric)));",
  "}",
  ""
].join("\\n"), "utf8");

const final = runCommand(config.testCommand, config.fixtureDir);
writeArtifact(config.finalTranscript, transcriptFor(
  "adapter-final-after-patch",
  final,
  "Must pass after the external adapter fixture runner patch."
));

const diff = runGit(["diff", "--", config.changedFixtureFile], config.fixtureDir);
writeArtifact(config.diffArtifact, diff.output || "No fixture diff was produced.\\n");

const commandResult = {
  command: config.testCommand,
  exitCode: final.exitCode,
  outputSummary: final.exitCode === 0
    ? "Fixture test passed after the external adapter runner patch."
    : "Fixture test failed after the external adapter runner patch.",
  transcriptRef: path.relative(process.cwd(), config.finalTranscript).replace(/\\\\/g, "/")
};
const baselineRef = path.relative(process.cwd(), config.baselineTranscript).replace(/\\\\/g, "/");
const finalRef = path.relative(process.cwd(), config.finalTranscript).replace(/\\\\/g, "/");
const diffRef = path.relative(process.cwd(), config.diffArtifact).replace(/\\\\/g, "/");
const receipt = {
  schema: "naikaku.coding-agent-session-receipt.v1",
  generatedAt: config.generatedAt,
  mode: "evidence-review",
  sourceSchema: "naikaku.coding-agent-session-bundle.v1",
  bundleDecision: "ready",
  decision: "needs-evidence",
  operatorLocale: "ja",
  items: [{
    ...config.receiptItem,
    receiptStatus: "pending-evidence",
    changedFiles: [config.changedFilePath],
    commandResults: [commandResult],
    evidence: [
      \`Baseline failing test transcript. -> \${baselineRef}\`,
      \`Fixture patch diff artifact. -> \${diffRef}\`,
      \`Final command transcript with exit code. -> \${finalRef}\`
    ],
    risks: [
      "Fixture-only external adapter self-test.",
      "No production code, provider, browser, desktop, MCP tool, deploy target, Git remote, or external service was touched."
    ],
    missing: [],
    nextAction: "Review this receipt through Naikaku implementation evidence and artifact audit."
  }],
  honestyClaim: {
    level: "submitted-evidence-review",
    claim: "Fixture runner wrote this receipt after patching a generated fixture workspace.",
    limitations: ["This is not a real model-run implementation."],
    productionRequirements: ["Replace fixture evidence with authenticated runner transcripts for real Development Board completion."]
  },
  summary: {
    total: 1,
    verified: 0,
    pendingEvidence: 1,
    failed: 0,
    held: 0,
    changedFiles: 1,
    commandResults: 1,
    evidenceItems: 3,
    risks: 2
  }
};
mkdirSync(path.dirname(config.receiptPath), { recursive: true });
writeFileSync(config.receiptPath, \`\${JSON.stringify(receipt, null, 2)}\\n\`, "utf8");
mkdirSync(path.dirname(config.resultPath), { recursive: true });
writeFileSync(config.resultPath, \`\${JSON.stringify({ baseline, final }, null, 2)}\\n\`, "utf8");
console.log("adapter fixture runner wrote receipt", config.receiptPath);
`;
}

function buggyCabinetScoreSource() {
  return [
    "export function normalizeScore(value) {",
    "  return value;",
    "}",
    ""
  ].join("\n");
}

function cabinetScoreTestSource() {
  return [
    "import assert from \"node:assert/strict\";",
    "import { normalizeScore } from \"../src/cabinetScore.mjs\";",
    "",
    "assert.equal(normalizeScore(120), 100);",
    "assert.equal(normalizeScore(-10), 0);",
    "assert.equal(normalizeScore(42.6), 43);",
    "assert.equal(normalizeScore(Number.NaN), 0);",
    "assert.equal(normalizeScore(\"7\"), 7);",
    "",
    "console.log(\"cabinet score normalization passed\");",
    ""
  ].join("\n");
}

function runGit(args: string[], cwd: string): GitCommandResult {
  const result = spawnSync("git", args, {
    cwd,
    shell: false,
    encoding: "utf8",
    maxBuffer: 2_000_000
  });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function assertGitOk(result: GitCommandResult, label: string) {
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed: ${result.output.trim() || "unknown Git error"}`);
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function summaryMarkdown(summary: AdapterSelfTestSummary) {
  return [
    "# Engineering Adapter Self-Test",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Locale: ${summary.operatorLocale}`,
    "",
    "## Adapter Run",
    "",
    `- Completed jobs: ${summary.adapterRun.completed}`,
    `- External receipts present: ${summary.adapterRun.externalReceiptsPresent}`,
    `- Ready for implementation review: ${summary.adapterRun.readyForImplementationReview}`,
    `- Adapter execution receipt: ${summary.adapterRun.adapterExecutionReceiptPath ?? "missing"}`,
    "",
    "## Adapter Run Review",
    "",
    `- Loaded receipts: ${summary.adapterRunReview.loadedReceipts}`,
    `- Review-ready jobs: ${summary.adapterRunReview.reviewReadyJobs}`,
    `- Checks: ${summary.adapterRunReview.passedChecks} pass, ${summary.adapterRunReview.failedChecks} fail`,
    `- Submitted receipt: ${summary.adapterRunReview.submittedReceiptPath}`,
    `- Receipt review: ${summary.adapterRunReview.receiptReviewPath}`,
    `- Implementation evidence: ${summary.adapterRunReview.implementationEvidencePath}`,
    `- Artifact audit: ${summary.adapterRunReview.artifactAuditPath}`,
    "",
    "## Fixture",
    "",
    `- Workspace: ${summary.fixture.workspacePath}`,
    `- Changed file: ${summary.fixture.changedFile}`,
    `- Baseline test exit: ${summary.fixture.baselineTestExitCode}`,
    `- Final test exit: ${summary.fixture.finalTestExitCode}`,
    "",
    "## Evidence Chain",
    "",
    `- Receipt review: ${summary.receipt.decision}`,
    `- Implementation evidence: ${summary.evidence.decision}`,
    `- Artifact audit: ${summary.artifactAudit.decision}`,
    `- Verified paths: ${summary.artifactAudit.verifiedPaths}`,
    `- Worktree changed files: ${summary.artifactAudit.worktreeChangedFiles}`,
    `- Transcript mismatches: ${summary.artifactAudit.transcriptContentMismatches}`,
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

function printSummary(summary: AdapterSelfTestSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;

  console.log(`Engineering adapter self-test: ${failed === 0 ? "verified" : "needs-review"}`);
  console.log(`Adapter completed jobs: ${summary.adapterRun.completed}`);
  console.log(`Ready for implementation review: ${summary.adapterRun.readyForImplementationReview}`);
  console.log(`Adapter run review checks: ${summary.adapterRunReview.passedChecks} pass, ${summary.adapterRunReview.failedChecks} fail`);
  console.log(`Baseline test exit: ${summary.fixture.baselineTestExitCode}`);
  console.log(`Final test exit: ${summary.fixture.finalTestExitCode}`);
  console.log(`Receipt review: ${summary.receipt.decision}`);
  console.log(`Implementation evidence: ${summary.evidence.decision}`);
  console.log(`Artifact audit: ${summary.artifactAudit.decision}`);
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): EngineeringAdapterSelfTestOptions {
  const options: EngineeringAdapterSelfTestOptions = {
    outputDir: "output/engineering-adapter-self-test",
    locale: "ja",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--locale") {
      options.locale = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
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

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:adapter-self-test",
    "",
    "Options:",
    "  --out <dir>              Output directory. Default: output/engineering-adapter-self-test.",
    "  --locale <code>          Operator locale. Default: ja.",
    "  --generated-at <iso>     Stable timestamp for tests.",
    "  --help, -h               Show this help.",
    "",
    "This self-test launches a deterministic fake external CLI runner through Naikaku adapter job JSON, patches a generated fixture workspace, writes a Naikaku receipt, and verifies receipt/evidence/artifact audit. It does not call real model providers or control macOS."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering adapter self-test failure.");
  process.exitCode = 1;
});
