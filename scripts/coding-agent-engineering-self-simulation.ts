import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditCodingAgentImplementationArtifacts } from "../src/domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationEvidence";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "../src/domain/codingAgentSessionReceipt";
import type {
  CodingAgentCommandResult,
  CodingAgentEngineeringSelfSimulationSummary,
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt
} from "../src/domain/types";

const testCommand = "node checks/cabinetScore.check.mjs";
const changedFixtureFile = "src/cabinetScore.mjs";

interface EngineeringSelfSimulationOptions {
  outputDir: string;
  generatedAt: string;
  locale: string;
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

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);
  const fixtureDir = path.join(outputDir, "fixture-workspace");
  const artifactPrefix = `${outputRelativeDir}/session/`;
  const changedFilePath = `${outputRelativeDir}/fixture-workspace/${changedFixtureFile}`;
  const baselineTranscript = `${artifactPrefix}baseline-test.log`;
  const finalTranscript = `${artifactPrefix}final-test.log`;
  const diffArtifact = `${artifactPrefix}fixture-diff.patch`;
  const cleanTrackedClaimPath = `${outputRelativeDir}/fixture-workspace/package.json`;

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await writeFixtureWorkspace(fixtureDir);
  initializeFixtureGit(fixtureDir);

  const baseline = runCommand(testCommand, fixtureDir);
  await writeArtifact(baselineTranscript, transcriptFor({
    label: "baseline-before-patch",
    execution: baseline,
    note: "This command is expected to fail before the fixture implementation is patched."
  }));

  await writeFile(path.join(fixtureDir, changedFixtureFile), fixedCabinetScoreSource(), "utf8");

  const final = runCommand(testCommand, fixtureDir);
  await writeArtifact(finalTranscript, transcriptFor({
    label: "final-after-patch",
    execution: final,
    note: "This command must pass after the fixture implementation is patched."
  }));

  const diff = runGit(["diff", "--", changedFixtureFile], fixtureDir);
  await writeArtifact(diffArtifact, diff.output || "No fixture diff was produced.\n");

  const bundle = buildFixtureBundle({
    generatedAt: options.generatedAt,
    locale: options.locale,
    artifactPrefix
  });
  const submittedReceipt = buildSubmittedReceipt({
    bundle,
    changedFilePath,
    final,
    baselineTranscript,
    finalTranscript,
    diffArtifact,
    generatedAt: options.generatedAt
  });
  const receiptReview = reviewCodingAgentSessionReceipt({
    bundle,
    receipt: submittedReceipt,
    generatedAt: options.generatedAt
  });
  const evidence = buildCodingAgentImplementationEvidence({
    receipt: receiptReview,
    generatedAt: options.generatedAt
  });
  const artifactAudit = auditCodingAgentImplementationArtifacts({
    evidence,
    generatedAt: options.generatedAt,
    artifactProbe: localArtifactProbe,
    worktreeProbe: fixtureWorktreeProbe(fixtureDir)
  });
  const failedTestReceiptReview = reviewCodingAgentSessionReceipt({
    bundle,
    receipt: buildSubmittedReceipt({
      bundle,
      changedFilePath,
      final: baseline,
      baselineTranscript,
      finalTranscript: baselineTranscript,
      diffArtifact,
      generatedAt: options.generatedAt
    }),
    generatedAt: options.generatedAt
  });
  const failedTestEvidence = buildCodingAgentImplementationEvidence({
    receipt: failedTestReceiptReview,
    generatedAt: options.generatedAt
  });
  const failedTestArtifactAudit = auditCodingAgentImplementationArtifacts({
    evidence: failedTestEvidence,
    generatedAt: options.generatedAt,
    artifactProbe: localArtifactProbe,
    worktreeProbe: fixtureWorktreeProbe(fixtureDir)
  });
  const cleanWorktreeReceiptReview = reviewCodingAgentSessionReceipt({
    bundle,
    receipt: buildSubmittedReceipt({
      bundle,
      changedFilePath: cleanTrackedClaimPath,
      final,
      baselineTranscript,
      finalTranscript,
      diffArtifact,
      generatedAt: options.generatedAt
    }),
    generatedAt: options.generatedAt
  });
  const cleanWorktreeEvidence = buildCodingAgentImplementationEvidence({
    receipt: cleanWorktreeReceiptReview,
    generatedAt: options.generatedAt
  });
  const cleanWorktreeArtifactAudit = auditCodingAgentImplementationArtifacts({
    evidence: cleanWorktreeEvidence,
    generatedAt: options.generatedAt,
    artifactProbe: localArtifactProbe,
    worktreeProbe: fixtureWorktreeProbe(fixtureDir)
  });

  const gitStatus = runGit(["status", "--porcelain=v1", "--untracked-files=all"], fixtureDir).output.trim();
  const summary = buildSummary({
    generatedAt: options.generatedAt,
    outputRelativeDir,
    locale: options.locale,
    fixtureRelativeDir: relativePath(fixtureDir),
    changedFilePath,
    baseline,
    final,
    baselineTranscript,
    finalTranscript,
    diffArtifact,
    gitStatus,
    receiptReview,
    evidence,
    artifactAudit,
    failedTestReceiptReview,
    failedTestEvidence,
    failedTestArtifactAudit,
    cleanTrackedClaimPath,
    cleanWorktreeReceiptReview,
    cleanWorktreeEvidence,
    cleanWorktreeArtifactAudit
  });

  await writeJson(path.join(outputDir, "fixture-session-bundle.json"), bundle);
  await writeJson(path.join(outputDir, "submitted-receipt.json"), submittedReceipt);
  await writeJson(path.join(outputDir, "receipt-review.json"), receiptReview);
  await writeJson(path.join(outputDir, "implementation-evidence.json"), evidence);
  await writeJson(path.join(outputDir, "artifact-audit.json"), artifactAudit);
  await writeJson(path.join(outputDir, "negative-failed-test-receipt-review.json"), failedTestReceiptReview);
  await writeJson(path.join(outputDir, "negative-failed-test-implementation-evidence.json"), failedTestEvidence);
  await writeJson(path.join(outputDir, "negative-failed-test-artifact-audit.json"), failedTestArtifactAudit);
  await writeJson(path.join(outputDir, "negative-clean-worktree-receipt-review.json"), cleanWorktreeReceiptReview);
  await writeJson(path.join(outputDir, "negative-clean-worktree-implementation-evidence.json"), cleanWorktreeEvidence);
  await writeJson(path.join(outputDir, "negative-clean-worktree-artifact-audit.json"), cleanWorktreeArtifactAudit);
  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

async function writeFixtureWorkspace(fixtureDir: string) {
  await mkdir(path.join(fixtureDir, "src"), { recursive: true });
  await mkdir(path.join(fixtureDir, "checks"), { recursive: true });
  await writeFile(path.join(fixtureDir, "package.json"), `${JSON.stringify({
    type: "module",
    scripts: {
      test: testCommand
    }
  }, null, 2)}\n`, "utf8");
  await writeFile(path.join(fixtureDir, changedFixtureFile), buggyCabinetScoreSource(), "utf8");
  await writeFile(path.join(fixtureDir, "checks/cabinetScore.check.mjs"), cabinetScoreTestSource(), "utf8");
}

function initializeFixtureGit(fixtureDir: string) {
  assertGitOk(runGit(["init"], fixtureDir), "git init");
  assertGitOk(runGit(["add", "."], fixtureDir), "git add");
  assertGitOk(runGit([
    "-c",
    "user.name=Naikaku Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-m",
    "fixture baseline"
  ], fixtureDir), "git commit");
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
    mission: "Prove a governed coding agent can close a tiny fixture engineering loop without touching production code.",
    runId: "engineering-self-simulation-fixture",
    operatorLocale: locale,
    sourceSchema: "naikaku.coding-agent-briefs.v1",
    requireProductionEvidence: false,
    review: {
      schema: "naikaku.coding-agent-brief-review.v1",
      generatedAt,
      sourceSchema: "naikaku.coding-agent-briefs.v1",
      operatorLocale: locale,
      runId: "engineering-self-simulation-fixture",
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
      id: "coding-session-engineering-self-simulation",
      briefId: "coding-brief-engineering-self-simulation",
      sourceItemId: "fixture-cabinet-score-normalizer",
      title: "Implement fixture cabinet score normalization",
      mode: "implement",
      priority: "medium",
      executorProfileId: "shell-container",
      status: "ready-for-agent",
      promptFileName: "01-implement-fixture-cabinet-score-normalization.md",
      sandboxContract: {
        boundary: "sandbox-only",
        executorProfileId: "shell-container",
        allowedActions: [
          "read-fixture-files",
          "edit-fixture-files",
          "run-fixture-tests",
          "write-local-evidence-artifacts"
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
      handoffMarkdown: [
        "# Fixture Coding Agent Task",
        "",
        "Implement `normalizeScore` in the generated fixture workspace.",
        "Stay inside the fixture workspace and write receipt evidence under the session artifact prefix.",
        "This fixture proves engineering-loop mechanics only."
      ].join("\n"),
      verificationCommands: [testCommand],
      evidenceRequired,
      safetyStops: [
        "Stop if the changed file path escapes the generated fixture workspace.",
        "Stop if the verification command requires network, deployment, or host secret access."
      ],
      nextAction: "Run the fixture test, patch the fixture implementation, rerun the test, and return receipt evidence."
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

function buildSubmittedReceipt({
  bundle,
  changedFilePath,
  final,
  baselineTranscript,
  finalTranscript,
  diffArtifact,
  generatedAt
}: {
  bundle: CodingAgentSessionBundle;
  changedFilePath: string;
  final: CommandExecution;
  baselineTranscript: string;
  finalTranscript: string;
  diffArtifact: string;
  generatedAt: string;
}): CodingAgentSessionReceipt {
  const template = buildCodingAgentSessionReceiptTemplate({ bundle, generatedAt });
  const item = template.items[0];
  const commandResult: CodingAgentCommandResult = {
    command: testCommand,
    exitCode: final.exitCode,
    outputSummary: final.exitCode === 0
      ? "Fixture cabinet score normalization test passed after the implementation patch."
      : "Fixture cabinet score normalization test failed after the implementation patch.",
    transcriptRef: finalTranscript
  };

  return {
    ...template,
    items: [{
      ...item,
      receiptStatus: "pending-evidence",
      changedFiles: [changedFilePath],
      commandResults: [commandResult],
      evidence: [
        `Baseline failing test transcript. -> ${baselineTranscript}`,
        `Fixture patch diff artifact. -> ${diffArtifact}`,
        `Final command transcript with exit code. -> ${finalTranscript}`
      ],
      risks: [
        "This is a fixture-only engineering self-simulation; it does not claim a real backlog item was implemented.",
        "No production code, provider, browser, desktop, MCP tool, deploy target, Git remote, or external service was touched."
      ],
      missing: [],
      nextAction: "Use this as engineering-loop proof only; require real task receipts before Development Board reconciliation."
    }]
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
  receiptReview,
  evidence,
  artifactAudit,
  failedTestReceiptReview,
  failedTestEvidence,
  failedTestArtifactAudit,
  cleanTrackedClaimPath,
  cleanWorktreeReceiptReview,
  cleanWorktreeEvidence,
  cleanWorktreeArtifactAudit
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
  receiptReview: CodingAgentSessionReceipt;
  evidence: CodingAgentImplementationEvidence;
  artifactAudit: CodingAgentImplementationArtifactAudit;
  failedTestReceiptReview: CodingAgentSessionReceipt;
  failedTestEvidence: CodingAgentImplementationEvidence;
  failedTestArtifactAudit: CodingAgentImplementationArtifactAudit;
  cleanTrackedClaimPath: string;
  cleanWorktreeReceiptReview: CodingAgentSessionReceipt;
  cleanWorktreeEvidence: CodingAgentImplementationEvidence;
  cleanWorktreeArtifactAudit: CodingAgentImplementationArtifactAudit;
}): CodingAgentEngineeringSelfSimulationSummary {
  const checks = {
    baselineTestFailedBeforePatch: baseline.exitCode !== 0,
    finalTestPassedAfterPatch: final.exitCode === 0,
    fixtureGitShowsChangedFile: gitStatus.split(/\r?\n/).some((line) => line.endsWith(changedFixtureFile)),
    receiptReviewVerified: receiptReview.decision === "verified" && receiptReview.summary.verified === 1,
    implementationEvidenceAccepted: evidence.decision === "accepted-for-handoff" && evidence.summary.accepted === 1,
    artifactAuditVerified: artifactAudit.decision === "verified" && artifactAudit.summary.verified === 1,
    changedFileWorktreeVerified:
      artifactAudit.summary.worktreeCheckedChangedFiles === 1 &&
      artifactAudit.summary.worktreeChangedFiles === 1 &&
      artifactAudit.summary.worktreeUnchangedFiles === 0,
    transcriptContentMatched:
      artifactAudit.summary.transcriptContentChecked === 1 &&
      artifactAudit.summary.transcriptContentMismatches === 0,
    evidenceArtifactsFingerprinted:
      artifactAudit.summary.fingerprintedPaths === artifactAudit.summary.verifiedPaths &&
      artifactAudit.summary.verifiedPaths >= 4,
    noUnsafeArtifactPaths: artifactAudit.summary.unsafePaths === 0,
    failedTestClaimRejected:
      failedTestReceiptReview.decision === "blocked" &&
      failedTestEvidence.decision === "blocked" &&
      failedTestEvidence.summary.failedCommands === 1 &&
      failedTestArtifactAudit.decision === "blocked",
    cleanWorktreeClaimRejected:
      cleanWorktreeReceiptReview.decision === "verified" &&
      cleanWorktreeEvidence.decision === "accepted-for-handoff" &&
      cleanWorktreeArtifactAudit.decision === "needs-artifacts" &&
      cleanWorktreeArtifactAudit.summary.worktreeCheckedChangedFiles === 1 &&
      cleanWorktreeArtifactAudit.summary.worktreeChangedFiles === 0 &&
      cleanWorktreeArtifactAudit.summary.worktreeUnchangedFiles === 1,
    fixtureBoundaryClear:
      changedFilePath.startsWith(`${outputRelativeDir}/fixture-workspace/`) &&
      baselineTranscript.startsWith(`${outputRelativeDir}/session/`) &&
      finalTranscript.startsWith(`${outputRelativeDir}/session/`) &&
      diffArtifact.startsWith(`${outputRelativeDir}/session/`)
  };

  return {
    schema: "naikaku.coding-agent-engineering-self-simulation.v1",
    generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: locale,
    fixture: {
      workspacePath: fixtureRelativeDir,
      changedFile: changedFilePath,
      baselineTestExitCode: baseline.exitCode,
      finalTestExitCode: final.exitCode,
      diffArtifact,
      baselineTranscript,
      finalTranscript,
      gitStatus
    },
    receipt: {
      decision: receiptReview.decision,
      verified: receiptReview.summary.verified,
      pendingEvidence: receiptReview.summary.pendingEvidence,
      failed: receiptReview.summary.failed
    },
    evidence: {
      decision: evidence.decision,
      accepted: evidence.summary.accepted,
      changedFiles: evidence.summary.changedFiles,
      commandResults: evidence.summary.commandResults
    },
    artifactAudit: {
      decision: artifactAudit.decision,
      verifiedPaths: artifactAudit.summary.verifiedPaths,
      missingPaths: artifactAudit.summary.missingPaths,
      unsafePaths: artifactAudit.summary.unsafePaths,
      transcriptContentMismatches: artifactAudit.summary.transcriptContentMismatches,
      worktreeCheckedChangedFiles: artifactAudit.summary.worktreeCheckedChangedFiles,
      worktreeChangedFiles: artifactAudit.summary.worktreeChangedFiles,
      worktreeUnchangedFiles: artifactAudit.summary.worktreeUnchangedFiles
    },
    negativeCases: {
      failedTestReceipt: {
        receiptDecision: failedTestReceiptReview.decision,
        evidenceDecision: failedTestEvidence.decision,
        artifactAuditDecision: failedTestArtifactAudit.decision,
        failedCommands: failedTestEvidence.summary.failedCommands,
        accepted: failedTestEvidence.summary.accepted
      },
      cleanWorktreeClaim: {
        claimedChangedFile: cleanTrackedClaimPath,
        receiptDecision: cleanWorktreeReceiptReview.decision,
        evidenceDecision: cleanWorktreeEvidence.decision,
        artifactAuditDecision: cleanWorktreeArtifactAudit.decision,
        worktreeCheckedChangedFiles: cleanWorktreeArtifactAudit.summary.worktreeCheckedChangedFiles,
        worktreeChangedFiles: cleanWorktreeArtifactAudit.summary.worktreeChangedFiles,
        worktreeUnchangedFiles: cleanWorktreeArtifactAudit.summary.worktreeUnchangedFiles
      }
    },
    checks,
    honestyClaim: {
      level: "fixture-engineering-self-simulation",
      claim: "This drill creates a temporary fixture Git workspace, observes a failing test, patches one fixture source file, reruns the test, and sends the resulting receipt through the existing implementation evidence and artifact audit chain.",
      limitations: [
        "It is deterministic fixture work, not a claim that Naikaku autonomously completed a real product backlog item.",
        "It does not call model providers, browse, control the desktop, call MCP tools, deploy, commit, push, or contact external services.",
        "It modifies only generated files under the configured output directory.",
        "It proves the local engineering evidence loop can close for a tiny task; broader autonomous coding still requires governed real-runner integration."
      ],
      productionRequirements: [
        "Attach real model-run prompts, diffs, transcripts, and risk notes for production coding-agent work.",
        "Keep real runners behind scoped credentials, leases, sandbox policy, and artifact audit.",
        "Run release verification and operator review before marking real Development Board items complete."
      ]
    }
  };
}

function runCommand(command: string, cwd: string): CommandExecution {
  const startedAt = Date.now();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    maxBuffer: 2_000_000,
    env: {
      ...process.env,
      CI: "1"
    }
  });

  return {
    command,
    cwd: relativePath(cwd),
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: truncateOutput(`${result.stdout || ""}${result.stderr || ""}`),
    durationMs: Date.now() - startedAt
  };
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

function fixtureWorktreeProbe(fixtureDir: string) {
  return (relativePath: string) => {
    const fullPath = path.resolve(relativePath);
    const fixtureRelative = path.relative(fixtureDir, fullPath).replace(/\\/g, "/");

    if (!fixtureRelative || fixtureRelative.startsWith("../") || path.isAbsolute(fixtureRelative)) {
      return {
        checked: false,
        changed: false,
        status: "unknown" as const,
        reason: "Changed-file reference is outside the fixture Git workspace."
      };
    }

    const status = runGit(["status", "--porcelain=v1", "--untracked-files=all", "--", fixtureRelative], fixtureDir);
    if (status.exitCode !== 0) {
      return {
        checked: false,
        changed: false,
        status: "unknown" as const,
        reason: status.output.trim() || "Fixture Git status failed."
      };
    }

    const line = status.output.trim().split(/\r?\n/).filter(Boolean)[0] || "";
    return {
      checked: true,
      changed: Boolean(line),
      status: worktreeStatusFromPorcelain(line),
      reason: line
        ? `Fixture Git status contains ${line}.`
        : "Fixture Git status is clean for this changed-file reference."
    };
  };
}

function worktreeStatusFromPorcelain(line: string) {
  if (!line) return "clean" as const;
  if (line.startsWith("??")) return "untracked" as const;
  const code = line.slice(0, 2);
  if (code.includes("U")) return "unmerged" as const;
  if (code.includes("R")) return "renamed" as const;
  if (code.includes("C")) return "copied" as const;
  if (code.includes("D")) return "deleted" as const;
  if (code.includes("A")) return "added" as const;
  if (code.includes("T")) return "typechange" as const;
  if (code.includes("M")) return "modified" as const;
  return "unknown" as const;
}

function localArtifactProbe(relativePath: string) {
  const fullPath = path.resolve(relativePath);
  if (!existsSync(fullPath)) {
    return {
      exists: false
    };
  }
  const stat = statSync(fullPath);
  const buffer = readFileSync(fullPath);
  return {
    exists: true,
    bytes: stat.size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    modifiedAt: stat.mtime.toISOString(),
    text: buffer.toString("utf8")
  };
}

async function writeArtifact(relativePath: string, content: string) {
  const fullPath = path.resolve(relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function transcriptFor({
  label,
  execution,
  note
}: {
  label: string;
  execution: CommandExecution;
  note: string;
}) {
  return [
    `label: ${label}`,
    `command: ${execution.command}`,
    `cwd: ${execution.cwd}`,
    `exit code: ${execution.exitCode}`,
    `exitCode: ${execution.exitCode}`,
    `durationMs: ${execution.durationMs}`,
    `note: ${note}`,
    "",
    "----- command output -----",
    execution.output
  ].join("\n");
}

function buggyCabinetScoreSource() {
  return [
    "export function normalizeScore(value) {",
    "  return value;",
    "}",
    ""
  ].join("\n");
}

function fixedCabinetScoreSource() {
  return [
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

function truncateOutput(output: string) {
  const max = 80_000;
  if (output.length <= max) return output;
  return `${output.slice(0, max)}\n[truncated ${output.length - max} characters]`;
}

function summaryMarkdown(summary: CodingAgentEngineeringSelfSimulationSummary) {
  return [
    "# Coding Agent Engineering Self-Simulation",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Fixture",
    "",
    `- Workspace: ${summary.fixture.workspacePath}`,
    `- Changed file: ${summary.fixture.changedFile}`,
    `- Baseline test exit: ${summary.fixture.baselineTestExitCode}`,
    `- Final test exit: ${summary.fixture.finalTestExitCode}`,
    `- Diff artifact: ${summary.fixture.diffArtifact}`,
    `- Final transcript: ${summary.fixture.finalTranscript}`,
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
    "## Negative Cases",
    "",
    `- Failed-test receipt: ${summary.negativeCases.failedTestReceipt.receiptDecision} / ${summary.negativeCases.failedTestReceipt.evidenceDecision} / ${summary.negativeCases.failedTestReceipt.artifactAuditDecision}`,
    `- Clean worktree claim: ${summary.negativeCases.cleanWorktreeClaim.artifactAuditDecision}`,
    `- Clean claim unchanged files: ${summary.negativeCases.cleanWorktreeClaim.worktreeUnchangedFiles}`,
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

function printSummary(summary: CodingAgentEngineeringSelfSimulationSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;

  console.log(`Coding-agent engineering self-simulation: ${failed === 0 ? "verified" : "needs-review"}`);
  console.log(`Baseline test exit: ${summary.fixture.baselineTestExitCode}`);
  console.log(`Final test exit: ${summary.fixture.finalTestExitCode}`);
  console.log(`Receipt review: ${summary.receipt.decision}`);
  console.log(`Implementation evidence: ${summary.evidence.decision}`);
  console.log(`Artifact audit: ${summary.artifactAudit.decision}`);
  console.log(`Failed-test negative: ${summary.negativeCases.failedTestReceipt.receiptDecision}, ${summary.negativeCases.failedTestReceipt.artifactAuditDecision}`);
  console.log(`Clean-worktree negative: ${summary.negativeCases.cleanWorktreeClaim.artifactAuditDecision}, ${summary.negativeCases.cleanWorktreeClaim.worktreeUnchangedFiles} unchanged files`);
  console.log(`Checks: ${passed} pass, ${failed} fail`);
  console.log(`Report: ${path.resolve(summary.outputDir, "summary.json")}`);
}

function parseArgs(args: string[]): EngineeringSelfSimulationOptions {
  const options: EngineeringSelfSimulationOptions = {
    outputDir: "output/coding-agent-engineering-self-simulation",
    generatedAt: new Date().toISOString(),
    locale: "ja",
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

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--locale") {
      options.locale = requireValue(args, index, arg);
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

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function printHelp() {
  console.log(`Naikaku coding-agent engineering self-simulation

Usage:
  npm run coding-agent:engineering-sim -- [options]

Options:
  --out <dir>            Output directory. Default: output/coding-agent-engineering-self-simulation
  --generated-at <iso>   Stable timestamp for generated artifacts.
  --locale <locale>      Operator locale. Default: ja
  -h, --help             Show this help.

The drill creates a temporary fixture Git workspace, patches one fixture source
file, runs a local test, and verifies the resulting receipt/evidence/artifact
audit chain. It is not real product backlog completion proof.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering self-simulation failure.");
  process.exitCode = 1;
});
