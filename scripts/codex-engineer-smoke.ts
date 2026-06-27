import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decideCabinetMotion } from "../src/domain/cabinetDecision";

interface CodexEngineerSmokeOptions {
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

interface CommandResult {
  commandLine: string;
  exitCode: number;
  signal: NodeJS.Signals | null;
  error: string;
  stdout: string;
  stderr: string;
}

interface CodexEngineerSmokeSummary {
  schema: "naikaku.codex-engineer-smoke.v1";
  generatedAt: string;
  outputDir: string;
  worktreeDir: string;
  cabinetDecision: ReturnType<typeof decideCabinetMotion>;
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
  checks: {
    cabinetApprovedBeforeRun: boolean;
    codexCliDetected: boolean;
    baselineTestFailed: boolean;
    codexExitedZero: boolean;
    finalTestPassed: boolean;
    expectedFileChanged: boolean;
    noGitCommitOrPush: boolean;
    receiptWritten: boolean;
  };
  claimBoundary: string[];
}

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

  const worktreeDir = path.join(outputDir, "worktree");
  writeFixtureProject(worktreeDir);
  initializeGit(worktreeDir);

  const cabinetDecision = decideCabinetMotion({
    motion: {
      id: "motion-codex-engineer-smoke",
      title: "Allow Codex CLI to patch a generated tiny project in a scoped worktree",
      requestedExecutor: "codex-cli-workspace-write",
      riskLevel: "medium",
      requiresHumanApproval: false
    },
    votes: [
      {
        roleId: "prime-minister",
        roleName: "Prime Minister",
        roleStage: "intake",
        decision: "approve",
        rationale: "The task is limited to a generated output worktree with no Git remote, deploy, or external send."
      },
      {
        roleId: "execution-minister",
        roleName: "Execution Minister",
        roleStage: "execution",
        decision: "approve",
        rationale: "Codex can patch one local file and run npm test inside the scoped worktree."
      },
      {
        roleId: "audit-minister",
        roleName: "Audit Minister",
        roleStage: "supervision",
        decision: "approve",
        rationale: "Approval is conditional on transcript, diff, changed-files list, final test pass, and no commit/push."
      }
    ],
    audit: {
      decision: "warn",
      findings: [
        "Workspace-write is allowed only inside output/codex-engineer-smoke/worktree.",
        "A passing final test is required before accepting the smoke."
      ],
      evidence: [
        "generated fixture worktree",
        "baseline failing test transcript",
        "Codex transcript",
        "final test transcript",
        "git diff and changed-files list"
      ]
    }
  });

  const baseline = runCommand("npm", ["test"], worktreeDir, 60_000);
  const baselineTranscript = path.join(outputDir, "baseline-test.log");
  writeCommandTranscript(baselineTranscript, baseline);

  const codexPath = which("codex");
  const codexFinalPath = path.join(outputDir, "codex-final-message.txt");
  const codexTranscriptPath = path.join(outputDir, "codex-transcript.log");
  const codex = codexPath && cabinetDecision.executionAuthorized
    ? runCodex({ worktreeDir, codexFinalPath })
    : {
        commandLine: "codex not run",
        exitCode: 1,
        signal: null,
        error: "",
        stdout: "",
        stderr: codexPath ? "Cabinet did not authorize execution." : "codex command was not found."
      };
  writeCommandTranscript(codexTranscriptPath, codex);

  const finalTest = runCommand("npm", ["test"], worktreeDir, 60_000);
  const finalTranscript = path.join(outputDir, "final-test.log");
  writeCommandTranscript(finalTranscript, finalTest);

  const changedFiles = gitLines(["diff", "--name-only"], worktreeDir);
  const diffPath = path.join(outputDir, "diff.patch");
  const changedFilesPath = path.join(outputDir, "changed-files.txt");
  writeFileSync(diffPath, runCommand("git", ["diff", "--", "src/cabinetScore.mjs"], worktreeDir, 30_000).stdout, "utf8");
  writeFileSync(changedFilesPath, `${changedFiles.join("\n")}\n`, "utf8");

  const receiptPath = path.join(outputDir, "receipt.json");
  const summary: CodexEngineerSmokeSummary = {
    schema: "naikaku.codex-engineer-smoke.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    worktreeDir: relativePath(worktreeDir),
    cabinetDecision,
    codex: {
      commandPath: codexPath,
      exitCode: codex.exitCode,
      finalMessagePath: relativePath(codexFinalPath)
    },
    tests: {
      baselineExitCode: baseline.exitCode,
      finalExitCode: finalTest.exitCode
    },
    files: {
      changedFiles,
      changedFilesPath: relativePath(changedFilesPath),
      diffPath: relativePath(diffPath),
      baselineTranscript: relativePath(baselineTranscript),
      finalTranscript: relativePath(finalTranscript),
      codexTranscript: relativePath(codexTranscriptPath),
      receiptPath: relativePath(receiptPath)
    },
    checks: {
      cabinetApprovedBeforeRun: cabinetDecision.executionAuthorized,
      codexCliDetected: Boolean(codexPath),
      baselineTestFailed: baseline.exitCode !== 0,
      codexExitedZero: codex.exitCode === 0,
      finalTestPassed: finalTest.exitCode === 0,
      expectedFileChanged: changedFiles.includes("src/cabinetScore.mjs"),
      noGitCommitOrPush: gitLines(["log", "--oneline"], worktreeDir).length === 1,
      receiptWritten: false
    },
    claimBoundary: [
      "This smoke lets Codex CLI patch only a generated tiny project under output/codex-engineer-smoke/worktree.",
      "It proves a governed Codex coding loop can observe a failing test, patch code, and pass the generated test in a scoped worktree.",
      "It does not modify the Naikaku product source, push Git, deploy, send messages, control the desktop, or claim real backlog completion.",
      "Real product implementation still needs a Naikaku runner invocation, receipt review, implementation evidence, artifact audit, and release verification."
    ]
  };
  writeReceipt({ summary, receiptPath, finalTest, codex });
  summary.checks.receiptWritten = existsSync(receiptPath);

  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function writeFixtureProject(worktreeDir: string) {
  mkdirSync(path.join(worktreeDir, "src"), { recursive: true });
  writeFileSync(path.join(worktreeDir, "package.json"), `${JSON.stringify({
    name: "naikaku-codex-engineer-smoke",
    private: true,
    type: "module",
    scripts: {
      test: "node test.mjs"
    }
  }, null, 2)}\n`, "utf8");
  writeFileSync(path.join(worktreeDir, "src", "cabinetScore.mjs"), [
    "export function normalizeScore(value) {",
    "  return Math.round(value);",
    "}",
    "",
    "export function cabinetDecision({ readiness, safety, evidence }) {",
    "  const score = normalizeScore((readiness + safety + evidence) / 3);",
    "  return score >= 80 ? 'ship' : 'revise';",
    "}",
    ""
  ].join("\n"), "utf8");
  writeFileSync(path.join(worktreeDir, "test.mjs"), [
    "import assert from 'node:assert/strict';",
    "import { cabinetDecision, normalizeScore } from './src/cabinetScore.mjs';",
    "",
    "assert.equal(normalizeScore(120), 100);",
    "assert.equal(normalizeScore(-8), 0);",
    "assert.equal(normalizeScore(82.4), 82);",
    "",
    "assert.equal(cabinetDecision({ readiness: 92, safety: 96, evidence: 91 }), 'ship');",
    "assert.equal(cabinetDecision({ readiness: 94, safety: 42, evidence: 91 }), 'block');",
    "assert.equal(cabinetDecision({ readiness: 78, safety: 88, evidence: 82 }), 'revise');",
    "",
    "console.log('tiny codex engineer smoke passed');",
    ""
  ].join("\n"), "utf8");
}

function initializeGit(worktreeDir: string) {
  runCommand("git", ["init"], worktreeDir, 30_000);
  runCommand("git", ["add", "."], worktreeDir, 30_000);
  const commit = runCommand("git", [
    "-c",
    "user.name=Naikaku Codex Smoke",
    "-c",
    "user.email=codex-smoke@example.invalid",
    "commit",
    "-m",
    "baseline broken tiny project"
  ], worktreeDir, 30_000);
  if (commit.exitCode !== 0) {
    throw new Error(`Failed to commit fixture baseline: ${commit.stderr || commit.stdout}`);
  }
}

function runCodex({
  worktreeDir,
  codexFinalPath
}: {
  worktreeDir: string;
  codexFinalPath: string;
}) {
  const prompt = [
    "You are the Codex implementation runner inside a Naikaku smoke test.",
    "Fix the generated tiny project so `npm test` passes.",
    "Only edit src/cabinetScore.mjs.",
    "Do not edit test.mjs or package.json.",
    "Do not run git commit, git push, deploy, curl, external sends, or read secrets.",
    "The expected behavior is:",
    "- normalizeScore clamps to 0..100 and rounds.",
    "- cabinetDecision returns block when safety is below 70.",
    "- cabinetDecision returns ship only when the normalized average is at least 80 and every normalized cabinet score is at least 80.",
    "- otherwise cabinetDecision returns revise.",
    "Run `npm test` before finishing and report the result briefly."
  ].join("\n");

  return runCommand("codex", [
    "-a",
    "never",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--sandbox",
    "workspace-write",
    "-C",
    worktreeDir,
    "-o",
    codexFinalPath,
    prompt
  ], process.cwd(), 240_000);
}

function writeReceipt({
  summary,
  receiptPath,
  finalTest,
  codex
}: {
  summary: CodexEngineerSmokeSummary;
  receiptPath: string;
  finalTest: CommandResult;
  codex: CommandResult;
}) {
  const receipt = {
    schema: "naikaku.codex-engineer-smoke-receipt.v1",
    generatedAt: summary.generatedAt,
    decision: Object.values(summary.checks).every(Boolean) ? "verified" : "needs-review",
    executor: "codex-cli",
    sessionId: "codex-engineer-smoke",
    changedFiles: summary.files.changedFiles,
    commandResults: [
      {
        command: codex.commandLine,
        exitCode: codex.exitCode,
        transcriptRef: summary.files.codexTranscript
      },
      {
        command: finalTest.commandLine,
        exitCode: finalTest.exitCode,
        transcriptRef: summary.files.finalTranscript
      }
    ],
    evidence: [
      summary.files.diffPath,
      summary.files.changedFilesPath,
      summary.files.baselineTranscript,
      summary.files.finalTranscript,
      summary.codex.finalMessagePath
    ],
    cabinetDecision: {
      decision: summary.cabinetDecision.decision,
      reason: summary.cabinetDecision.reason,
      tally: summary.cabinetDecision.tally
    },
    honestyClaim: {
      claim: "Codex patched a generated tiny worktree and Naikaku captured local evidence.",
      limitations: summary.claimBoundary
    }
  };
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

function runCommand(command: string, args: string[], cwd: string, timeout: number): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout,
    maxBuffer: 1024 * 1024 * 12,
    shell: false
  });

  return {
    commandLine: [command, ...args.map(quoteArg)].join(" "),
    exitCode: typeof result.status === "number" ? result.status : 1,
    signal: result.signal,
    error: result.error?.message || "",
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || ""
  };
}

function writeCommandTranscript(filePath: string, command: CommandResult) {
  writeFileSync(filePath, [
    `$ ${command.commandLine}`,
    `exitCode: ${command.exitCode}`,
    `signal: ${command.signal || "none"}`,
    `error: ${command.error || "none"}`,
    "",
    "## stdout",
    command.stdout.trim(),
    "",
    "## stderr",
    command.stderr.trim(),
    ""
  ].join("\n"), "utf8");
}

function which(command: string) {
  const result = runCommand(process.platform === "win32" ? "where" : "which", [command], process.cwd(), 1500);
  if (result.exitCode !== 0) return null;
  return result.stdout.split(/\r?\n/).find(Boolean) || null;
}

function gitLines(args: string[], cwd: string) {
  const result = runCommand("git", args, cwd, 30_000);
  if (result.exitCode !== 0) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function summaryMarkdown(summary: CodexEngineerSmokeSummary) {
  return [
    "# Codex Engineer Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Worktree: ${summary.worktreeDir}`,
    "",
    "## Cabinet",
    "",
    `- decision: ${summary.cabinetDecision.decision}`,
    `- reason: ${summary.cabinetDecision.reason}`,
    `- tally: ${summary.cabinetDecision.tally.approve} approve / ${summary.cabinetDecision.tally.reject} reject / ${summary.cabinetDecision.tally.abstain} abstain`,
    "",
    "## Codex",
    "",
    `- command: ${summary.codex.commandPath || "missing"}`,
    `- exit: ${summary.codex.exitCode}`,
    `- final message: ${summary.codex.finalMessagePath}`,
    "",
    "## Tests",
    "",
    `- baseline exit: ${summary.tests.baselineExitCode}`,
    `- final exit: ${summary.tests.finalExitCode}`,
    "",
    "## Files",
    "",
    ...summary.files.changedFiles.map((file) => `- changed: ${file}`),
    `- diff: ${summary.files.diffPath}`,
    `- receipt: ${summary.files.receiptPath}`,
    "",
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

function printSummary(summary: CodexEngineerSmokeSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log("Codex engineer smoke: " + (failed === 0 ? "passed" : "needs-review"));
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- cabinet: ${summary.cabinetDecision.decision} (${summary.cabinetDecision.reason})`);
  console.log(`- baseline/final test: ${summary.tests.baselineExitCode} -> ${summary.tests.finalExitCode}`);
  console.log(`- changed files: ${summary.files.changedFiles.join(", ") || "none"}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): CodexEngineerSmokeOptions {
  const options: CodexEngineerSmokeOptions = {
    outputDir: "output/codex-engineer-smoke",
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

function quoteArg(value: string) {
  return /^[A-Za-z0-9_./:@=+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run codex:engineer-smoke",
    "",
    "Generates a tiny broken project under output/, asks Codex CLI to patch it in a",
    "workspace-write sandbox, reruns npm test, and writes Naikaku evidence/receipt files.",
    "It never edits the Naikaku source tree, pushes Git, deploys, sends messages, or controls the desktop."
  ].join("\n"));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown Codex engineer smoke failure.");
  process.exitCode = 1;
}
