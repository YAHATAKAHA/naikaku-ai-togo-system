import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditCodingAgentImplementationArtifacts } from "../src/domain/codingAgentImplementationArtifactAudit";
import {
  buildCodingAgentImplementationEvidence,
  serializeCodingAgentImplementationEvidenceMarkdown
} from "../src/domain/codingAgentImplementationEvidence";
import { isSafeRelativeArtifactPath } from "../src/domain/codingAgentArtifactReferences";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt,
  serializeCodingAgentSessionReceiptMarkdown
} from "../src/domain/codingAgentSessionReceipt";
import { serializeCodingAgentSandboxRunnerReportMarkdown } from "../src/domain/codingAgentSandboxRunner";
import {
  buildEngineeringExecutionReceipt,
  serializeEngineeringExecutionReceiptMarkdown
} from "../src/domain/engineeringExecutionReceipt";
import type { EngineeringLaunchQueue } from "../src/domain/engineeringLaunchQueue";
import type {
  CodingAgentImplementationArtifactAudit,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestItem,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSandboxRunnerReportItem,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem,
  CodingAgentImplementationWorktreeStatus
} from "../src/domain/types";

interface EngineeringRunLocalOptions {
  inputDir: string;
  outputDir: string;
  patchFile: string | null;
  timeoutMs: number;
  generatedAt: string;
  help: boolean;
}

interface ExecutedCommand {
  command: string;
  exitCode: number | null;
  output: string;
  durationMs: number;
  timedOut: boolean;
}

interface EngineeringRunLocalSummary {
  schema: "naikaku.engineering-local-runner.v1";
  generatedAt: string;
  inputDir: string;
  outputDir: string;
  patch: {
    applied: boolean;
    file: string | null;
    changedFiles: string[];
  };
  decisions: {
    preflight: string;
    runnerReport: string;
    receiptReview: string;
    implementationEvidence: string;
    artifactAudit: string;
    executionReceipt: string;
  };
  claims: {
    localRun: boolean;
    codeChanged: boolean;
    completion: boolean;
    macDesktopControl: false;
    gitPushOrDeploy: false;
  };
  counts: {
    readyTasks: number;
    executedTasks: number;
    heldTasks: number;
    blockedTasks: number;
    commandsExecuted: number;
    failedCommands: number;
    transcriptFiles: number;
    evidenceArtifacts: number;
    changedFiles: number;
  };
  files: Record<string, string>;
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

  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);

  const bundle = await readJson<CodingAgentSessionBundle>(path.join(inputDir, "session-bundle.json"));
  const selfTest = await readJson<CodingAgentRunnerSelfTest>(path.join(inputDir, "runner-self-test.json"));
  const preflight = await readJson<CodingAgentSandboxRunnerPreflight>(path.join(inputDir, "sandbox-preflight.json"));
  const launchQueue = await readJson<EngineeringLaunchQueue>(path.join(inputDir, "launch-queue.json"));
  validateInputs({ bundle, selfTest, preflight, launchQueue });

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const patchChangedFiles = options.patchFile
    ? await applyPatchFile(options.patchFile, options.timeoutMs)
    : [];
  const commandCache = await runAllowedCommands({
    selfTest,
    preflight,
    timeoutMs: options.timeoutMs
  });
  const submittedReceipt = buildSubmittedReceipt({
    bundle,
    selfTest,
    preflight,
    commandCache,
    patchChangedFiles,
    generatedAt: options.generatedAt,
    patchApplied: Boolean(options.patchFile)
  });
  const receiptReview = reviewCodingAgentSessionReceipt({
    bundle,
    receipt: submittedReceipt,
    generatedAt: options.generatedAt
  });
  const implementationEvidence = buildCodingAgentImplementationEvidence({
    receipt: receiptReview,
    generatedAt: options.generatedAt
  });
  const artifactAudit = auditCodingAgentImplementationArtifacts({
    evidence: implementationEvidence,
    generatedAt: options.generatedAt,
    artifactProbe: localArtifactProbe,
    worktreeProbe: localWorktreeProbe
  });
  const runnerReport = buildRunnerReport({
    selfTest,
    preflight,
    receipt: submittedReceipt,
    commandCache,
    artifactAudit,
    generatedAt: options.generatedAt
  });
  const executionReceipt = buildEngineeringExecutionReceipt({
    launchQueue,
    sandboxRunnerReport: runnerReport,
    sessionReceipt: receiptReview,
    implementationEvidence,
    artifactAudit,
    generatedAt: options.generatedAt
  });

  const files = {
    summary: "summary.json",
    markdown: "summary.md",
    runnerReport: "sandbox-runner-report.json",
    runnerReportMarkdown: "sandbox-runner-report.md",
    submittedReceipt: "submitted-receipt.json",
    receiptReview: "receipt-review.json",
    receiptReviewMarkdown: "receipt-review.md",
    implementationEvidence: "implementation-evidence.json",
    implementationEvidenceMarkdown: "implementation-evidence.md",
    artifactAudit: "artifact-audit.json",
    executionReceipt: "execution-receipt.json",
    executionReceiptMarkdown: "execution-receipt.md"
  };
  const summary: EngineeringRunLocalSummary = {
    schema: "naikaku.engineering-local-runner.v1",
    generatedAt: options.generatedAt,
    inputDir: relativePath(inputDir),
    outputDir: outputRelativeDir,
    patch: {
      applied: Boolean(options.patchFile),
      file: options.patchFile ? relativePath(path.resolve(options.patchFile)) : null,
      changedFiles: patchChangedFiles
    },
    decisions: {
      preflight: preflight.decision,
      runnerReport: runnerReport.decision,
      receiptReview: receiptReview.decision,
      implementationEvidence: implementationEvidence.decision,
      artifactAudit: artifactAudit.decision,
      executionReceipt: executionReceipt.decision
    },
    claims: {
      localRun: executionReceipt.canClaimLocalRun,
      codeChanged: executionReceipt.canClaimCodeChanged,
      completion: executionReceipt.canClaimCompletion,
      macDesktopControl: false,
      gitPushOrDeploy: false
    },
    counts: {
      readyTasks: preflight.summary.readyTasks,
      executedTasks: runnerReport.summary.executedTasks,
      heldTasks: runnerReport.summary.heldTasks,
      blockedTasks: runnerReport.summary.blockedTasks,
      commandsExecuted: runnerReport.summary.processExecutions,
      failedCommands: runnerReport.summary.failedCommands,
      transcriptFiles: runnerReport.summary.transcriptFilesWritten,
      evidenceArtifacts: runnerReport.summary.evidenceArtifacts,
      changedFiles: patchChangedFiles.length
    },
    files,
    honestyClaim: {
      claim: "This CLI executes only preflight-allowed local commands, optionally applies one explicit local patch file, and writes transcripts plus evidence receipts.",
      limitations: [
        "It does not call model providers, generate code by itself, control the Mac desktop, browse, call MCP tools, commit, push, deploy, or send external messages.",
        "Without --patch-file it can claim a local verification run, but not code changes or task completion.",
        "A failed command, blocked preflight, missing artifact, or incomplete receipt keeps completion unclaimable."
      ]
    }
  };

  await writeJson(path.join(outputDir, files.summary), summary);
  await writeFile(path.join(outputDir, files.markdown), summaryMarkdown(summary), "utf8");
  await writeJson(path.join(outputDir, files.runnerReport), runnerReport);
  await writeFile(path.join(outputDir, files.runnerReportMarkdown), serializeCodingAgentSandboxRunnerReportMarkdown(runnerReport), "utf8");
  await writeJson(path.join(outputDir, files.submittedReceipt), submittedReceipt);
  await writeJson(path.join(outputDir, files.receiptReview), receiptReview);
  await writeFile(path.join(outputDir, files.receiptReviewMarkdown), serializeCodingAgentSessionReceiptMarkdown(receiptReview), "utf8");
  await writeJson(path.join(outputDir, files.implementationEvidence), implementationEvidence);
  await writeFile(
    path.join(outputDir, files.implementationEvidenceMarkdown),
    serializeCodingAgentImplementationEvidenceMarkdown(implementationEvidence),
    "utf8"
  );
  await writeJson(path.join(outputDir, files.artifactAudit), artifactAudit);
  await writeJson(path.join(outputDir, files.executionReceipt), executionReceipt);
  await writeFile(
    path.join(outputDir, files.executionReceiptMarkdown),
    serializeEngineeringExecutionReceiptMarkdown(executionReceipt),
    "utf8"
  );

  printSummary(summary);

  if (preflight.decision !== "ready" || runnerReport.decision !== "sandbox-runner-verified") {
    process.exitCode = 2;
  }
}

async function runAllowedCommands({
  selfTest,
  preflight,
  timeoutMs
}: {
  selfTest: CodingAgentRunnerSelfTest;
  preflight: CodingAgentSandboxRunnerPreflight;
  timeoutMs: number;
}) {
  const commands = uniqueRunnableCommands(selfTest, preflight);
  const commandCache = new Map<string, ExecutedCommand>();

  if (preflight.decision !== "ready") return commandCache;

  for (const command of commands) {
    commandCache.set(command, await executeShellCommand(command, timeoutMs));
  }

  return commandCache;
}

function buildSubmittedReceipt({
  bundle,
  selfTest,
  preflight,
  commandCache,
  patchChangedFiles,
  generatedAt,
  patchApplied
}: {
  bundle: CodingAgentSessionBundle;
  selfTest: CodingAgentRunnerSelfTest;
  preflight: CodingAgentSandboxRunnerPreflight;
  commandCache: Map<string, ExecutedCommand>;
  patchChangedFiles: string[];
  generatedAt: string;
  patchApplied: boolean;
}): CodingAgentSessionReceipt {
  const template = buildCodingAgentSessionReceiptTemplate({ bundle, generatedAt });
  const selfTestItems = new Map(selfTest.items.map((item) => [item.sessionId, item]));
  const preflightItems = new Map(preflight.items.map((item) => [item.sessionId, item]));
  const sessions = new Map(bundle.sessions.map((session) => [session.id, session]));
  const firstReadySessionId = preflight.items.find((item) => item.preflightStatus === "ready")?.sessionId || null;

  return {
    ...template,
    items: template.items.map((templateItem) => {
      const session = sessions.get(templateItem.sessionId);
      const selfTestItem = selfTestItems.get(templateItem.sessionId);
      const preflightItem = preflightItems.get(templateItem.sessionId);
      if (!session || !selfTestItem || !preflightItem || preflightItem.preflightStatus !== "ready") {
        return templateItem;
      }
      return submittedItemFor({
        item: templateItem,
        session,
        selfTestItem,
        preflightItem,
        commandCache,
        changedFiles: patchApplied && templateItem.sessionId === firstReadySessionId ? patchChangedFiles : [],
        patchApplied
      });
    })
  };
}

function submittedItemFor({
  item,
  session,
  selfTestItem,
  preflightItem,
  commandCache,
  changedFiles,
  patchApplied
}: {
  item: CodingAgentSessionReceiptItem;
  session: CodingAgentSession;
  selfTestItem: CodingAgentRunnerSelfTestItem;
  preflightItem: CodingAgentSandboxRunnerPreflight["items"][number];
  commandCache: Map<string, ExecutedCommand>;
  changedFiles: string[];
  patchApplied: boolean;
}): CodingAgentSessionReceiptItem {
  const sessionDir = normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix);
  const changedFileSummaryPath = `${sessionDir}/changed-files.txt`;
  writeArtifact(changedFileSummaryPath, [
    `Session: ${item.sessionId}`,
    `Title: ${item.title}`,
    `Patch applied: ${patchApplied ? "yes" : "no"}`,
    "Changed source files:",
    ...(changedFiles.length ? changedFiles.map((file) => `- ${file}`) : ["- none"])
  ].join("\n"));

  const preflightCommands = new Map(preflightItem.commands.map((command) => [command.command, command]));
  const commandResults = selfTestItem.commands.map((command, index) => {
    const preflightCommand = preflightCommands.get(command.command);
    const execution = preflightCommand?.status === "allowed"
      ? commandCache.get(command.command)
      : undefined;
    const transcriptRef = `${sessionDir}/transcript-${index + 1}.log`;

    if (!preflightCommand || preflightCommand.status !== "allowed") {
      writeArtifact(transcriptRef, [
        `session: ${item.sessionId}`,
        `command: ${command.command}`,
        "status: blocked",
        "exit code: blocked",
        `reason: ${preflightCommand?.reason || "Command was not present in preflight."}`
      ].join("\n"));
      return {
        command: command.command,
        exitCode: 1,
        outputSummary: "Blocked by engineering local runner preflight.",
        transcriptRef
      };
    }

    if (!execution) {
      writeArtifact(transcriptRef, [
        `session: ${item.sessionId}`,
        `command: ${command.command}`,
        "status: skipped",
        "exit code: not-run",
        "reason: Preflight was not ready or command execution was unavailable."
      ].join("\n"));
      return {
        command: command.command,
        exitCode: 1,
        outputSummary: "Allowed command did not produce an execution result.",
        transcriptRef
      };
    }

    writeArtifact(transcriptRef, transcriptFor({
      sessionId: item.sessionId,
      command: command.command,
      execution,
      patchApplied
    }));

    return {
      command: command.command,
      exitCode: execution.exitCode,
      outputSummary: outputSummaryFor(command.command, execution),
      transcriptRef
    };
  });

  const evidence = session.evidenceRequired.map((required, index) => {
    const evidencePath = `${sessionDir}/evidence-${index + 1}.md`;
    writeArtifact(evidencePath, [
      `# ${required}`,
      "",
      `Session: ${item.sessionId}`,
      `Patch applied: ${patchApplied ? "yes" : "no"}`,
      "This artifact was written by the local engineering runner.",
      "It proves local command/evidence plumbing, not independent product completion."
    ].join("\n"));
    return `${required}: ${evidencePath}`;
  });

  return {
    ...item,
    receiptStatus: "pending-evidence",
    changedFiles,
    commandResults,
    evidence,
    risks: [
      patchApplied
        ? "An explicit local patch file was applied before verification commands ran."
        : "No source patch was applied; this run can prove local command execution only.",
      "No Mac desktop control, Git push, deploy, browser, MCP, provider call, or external send was attempted."
    ],
    missing: [],
    nextAction: patchApplied
      ? "Review the changed files, receipts, and artifact audit before accepting completion."
      : "Attach a real patch or coding-agent receipt before claiming code changes."
  };
}

function buildRunnerReport({
  selfTest,
  preflight,
  receipt,
  commandCache,
  artifactAudit,
  generatedAt
}: {
  selfTest: CodingAgentRunnerSelfTest;
  preflight: CodingAgentSandboxRunnerPreflight;
  receipt: CodingAgentSessionReceipt;
  commandCache: Map<string, ExecutedCommand>;
  artifactAudit: CodingAgentImplementationArtifactAudit;
  generatedAt: string;
}): CodingAgentSandboxRunnerReport {
  const receiptItems = new Map(receipt.items.map((item) => [item.sessionId, item]));
  const preflightItems = new Map(preflight.items.map((item) => [item.sessionId, item]));
  const items = selfTest.items.map((item) =>
    reportItemFor({
      item,
      preflightItem: preflightItems.get(item.sessionId),
      receiptItem: receiptItems.get(item.sessionId),
      commandCache
    })
  );
  const commandResults = items.flatMap((item) => item.commandResults);
  const failedCommands = commandResults.filter((result) =>
    typeof result.exitCode === "number" && result.exitCode !== 0
  ).length;
  const blockedCommands = commandResults.filter((result) => result.status === "blocked").length;
  const executedTasks = items.filter((item) => item.runStatus === "executed").length;
  const heldTasks = items.filter((item) => item.runStatus === "held").length;
  const blockedTasks = items.filter((item) => item.runStatus === "blocked").length;
  const unsafePaths = artifactAudit.summary.unsafePaths;

  return {
    schema: "naikaku.coding-agent-sandbox-runner.v1",
    generatedAt,
    mode: "local-sandbox-runner-drill",
    sourceSchema: selfTest.schema,
    sourceDecision: selfTest.decision,
    decision: runnerDecision({
      preflight,
      executedTasks,
      blockedTasks,
      failedCommands,
      unsafePaths
    }),
    runId: selfTest.runId,
    operatorLocale: selfTest.operatorLocale,
    items,
    summary: {
      total: items.length,
      executedTasks,
      heldTasks,
      blockedTasks,
      commandResults: commandResults.length,
      processExecutions: commandCache.size,
      failedCommands,
      blockedCommands,
      transcriptFilesWritten: commandResults.filter((result) => Boolean(result.transcriptRef)).length,
      changedFileSummaries: items.filter((item) => Boolean(item.changedFileSummaryPath)).length,
      evidenceArtifacts: items.reduce((total, item) => total + item.evidence.length, 0),
      unsafePaths
    },
    honestyClaim: {
      level: "local-sandbox-runner-drill",
      claim: "This local engineering runner executed only preflight-allowed verification commands and wrote transcript/evidence artifacts.",
      limitations: [
        "It does not generate code by itself; code changes require an explicit --patch-file.",
        "It does not control macOS, browse, call MCP tools, call providers, commit, push, deploy, or send external messages.",
        "A verified local run proves command execution, not implementation completion."
      ],
      productionRequirements: [
        "Review changed files and receipt evidence before accepting code changes.",
        "Run production-mode release verification before external handoff.",
        "Keep Git push, deploy, external writes, and Mac desktop control behind exact human approval."
      ]
    }
  };
}

function reportItemFor({
  item,
  preflightItem,
  receiptItem,
  commandCache
}: {
  item: CodingAgentRunnerSelfTestItem;
  preflightItem?: CodingAgentSandboxRunnerPreflight["items"][number];
  receiptItem?: CodingAgentSessionReceiptItem;
  commandCache: Map<string, ExecutedCommand>;
}): CodingAgentSandboxRunnerReportItem {
  if (!preflightItem || preflightItem.preflightStatus !== "ready" || item.selfTestStatus !== "would-run" || !receiptItem) {
    return {
      sessionId: item.sessionId,
      sourceItemId: item.sourceItemId,
      title: item.title,
      executorProfileId: item.executorProfileId,
      selfTestStatus: item.selfTestStatus,
      runStatus: item.selfTestStatus === "blocked" || preflightItem?.preflightStatus === "blocked" ? "blocked" : "held",
      promptPath: item.promptPath,
      receiptDraftPath: item.receiptDraftPath,
      evidenceArtifactPrefix: item.evidenceArtifactPrefix,
      changedFileSummaryPath: null,
      commandResults: [],
      evidence: [],
      risks: ["Task was not ready for local command execution."],
      checks: [{
        id: "preflight",
        status: preflightItem?.preflightStatus === "blocked" ? "block" : "warn",
        summary: `Preflight status is ${preflightItem?.preflightStatus || "missing"}.`
      }],
      nextAction: item.nextAction
    };
  }

  const preflightCommands = new Map(preflightItem.commands.map((command) => [command.command, command]));
  const commandResults = receiptItem.commandResults.map((result) => {
    const preflightCommand = preflightCommands.get(result.command);
    const execution = commandCache.get(result.command);
    return {
      ...result,
      status: preflightCommand?.status === "allowed" && execution ? "executed" as const : "blocked" as const,
      durationMs: execution?.durationMs
    };
  });
  const failed = commandResults.some((result) => typeof result.exitCode === "number" && result.exitCode !== 0);
  const blocked = commandResults.some((result) => result.status === "blocked");

  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    executorProfileId: item.executorProfileId,
    selfTestStatus: item.selfTestStatus,
    runStatus: blocked ? "blocked" : failed ? "failed" : "executed",
    promptPath: item.promptPath,
    receiptDraftPath: item.receiptDraftPath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    changedFileSummaryPath: `${path.dirname(receiptItem.commandResults[0]?.transcriptRef || "")}/changed-files.txt`,
    commandResults,
    evidence: receiptItem.evidence,
    risks: receiptItem.risks,
    checks: [
      {
        id: "preflight-allowed",
        status: commandResults.every((result) => result.status === "executed") ? "pass" : "block",
        summary: `${commandResults.length} command results checked against preflight.`
      },
      {
        id: "transcripts-written",
        status: commandResults.every((result) => Boolean(result.transcriptRef)) ? "pass" : "block",
        summary: `${commandResults.filter((result) => Boolean(result.transcriptRef)).length} transcript refs attached.`
      },
      {
        id: "no-external-actions",
        status: receiptItem.risks.some((risk) => risk.includes("No Mac desktop control")) ? "pass" : "warn",
        summary: "Receipt preserves the local-only boundary."
      }
    ],
    nextAction: receiptItem.nextAction
  };
}

function runnerDecision({
  preflight,
  executedTasks,
  blockedTasks,
  failedCommands,
  unsafePaths
}: {
  preflight: CodingAgentSandboxRunnerPreflight;
  executedTasks: number;
  blockedTasks: number;
  failedCommands: number;
  unsafePaths: number;
}): CodingAgentSandboxRunnerReport["decision"] {
  if (preflight.decision !== "ready") return "needs-review";
  if (blockedTasks > 0 || failedCommands > 0 || unsafePaths > 0) return "blocked";
  return executedTasks > 0 ? "sandbox-runner-verified" : "needs-review";
}

async function applyPatchFile(patchFile: string, timeoutMs: number) {
  const patchPath = path.resolve(patchFile);
  const patchText = await readFile(patchPath, "utf8");
  const changedFiles = patchChangedFiles(patchText);
  validatePatchChangedFiles(changedFiles);

  const check = await executeFileCommand("git", ["apply", "--check", "--whitespace=nowarn", patchPath], timeoutMs);
  if (check.exitCode !== 0) {
    throw new Error(`Patch check failed:\n${check.output}`);
  }
  const applied = await executeFileCommand("git", ["apply", "--whitespace=nowarn", patchPath], timeoutMs);
  if (applied.exitCode !== 0) {
    throw new Error(`Patch apply failed:\n${applied.output}`);
  }

  return changedFiles;
}

function patchChangedFiles(patchText: string) {
  const files = new Set<string>();
  for (const line of patchText.split(/\r?\n/)) {
    const diff = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diff) {
      files.add(diff[2]);
      continue;
    }
    const plus = line.match(/^\+\+\+ b\/(.+)$/);
    if (plus && plus[1] !== "/dev/null") {
      files.add(plus[1]);
    }
  }
  return [...files].map((file) => file.trim()).filter(Boolean).sort();
}

function validatePatchChangedFiles(files: string[]) {
  if (!files.length) {
    throw new Error("Patch file did not name any changed files.");
  }

  const blockedPrefixes = [
    ".git/",
    ".naikaku-data/",
    "dist/",
    "node_modules/",
    "output/"
  ];
  const blockedExact = [".env", ".env.local"];

  for (const file of files) {
    if (!isSafeRelativeArtifactPath(file)) {
      throw new Error(`Patch target must be a safe relative path: ${file}`);
    }
    if (blockedExact.includes(file) || blockedPrefixes.some((prefix) => file.startsWith(prefix))) {
      throw new Error(`Patch target is outside the local engineering runner scope: ${file}`);
    }
  }
}

function uniqueRunnableCommands(
  selfTest: CodingAgentRunnerSelfTest,
  preflight: CodingAgentSandboxRunnerPreflight
) {
  const preflightItems = new Map(preflight.items.map((item) => [item.sessionId, item]));
  const commands = new Set<string>();

  for (const item of selfTest.items) {
    const preflightItem = preflightItems.get(item.sessionId);
    if (item.selfTestStatus !== "would-run" || preflightItem?.preflightStatus !== "ready") continue;
    for (const command of preflightItem.commands) {
      if (command.status === "allowed") commands.add(command.command);
    }
  }

  return [...commands];
}

async function executeShellCommand(command: string, timeoutMs: number): Promise<ExecutedCommand> {
  return executeProcess({ command, args: [], timeoutMs, shell: true });
}

async function executeFileCommand(command: string, args: string[], timeoutMs: number): Promise<ExecutedCommand> {
  return executeProcess({ command, args, timeoutMs, shell: false });
}

async function executeProcess({
  command,
  args,
  timeoutMs,
  shell
}: {
  command: string;
  args: string[];
  timeoutMs: number;
  shell: boolean;
}): Promise<ExecutedCommand> {
  const startedAt = Date.now();
  const label = shell ? command : [command, ...args].join(" ");

  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const child = spawn(command, args, {
      cwd: process.cwd(),
      shell,
      env: {
        ...process.env,
        CI: "1"
      }
    });
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      resolve({
        command: label,
        exitCode: 124,
        output: truncateOutput(`${output}\n[timeout] Command exceeded ${timeoutMs}ms.`),
        durationMs: Date.now() - startedAt,
        timedOut: true
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        command: label,
        exitCode: 1,
        output: error instanceof Error ? error.message : "Unknown command execution error.",
        durationMs: Date.now() - startedAt,
        timedOut: false
      });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        command: label,
        exitCode: code ?? 1,
        output: truncateOutput(output),
        durationMs: Date.now() - startedAt,
        timedOut: false
      });
    });
  });
}

function transcriptFor({
  sessionId,
  command,
  execution,
  patchApplied
}: {
  sessionId: string;
  command: string;
  execution: ExecutedCommand;
  patchApplied: boolean;
}) {
  return [
    `session: ${sessionId}`,
    `command: ${command}`,
    "runner mode: engineering-local-runner",
    `patch applied: ${patchApplied ? "yes" : "no"}`,
    `exit code: ${execution.exitCode}`,
    `exitCode: ${execution.exitCode}`,
    `durationMs: ${execution.durationMs}`,
    `timedOut: ${execution.timedOut}`,
    "",
    "----- command output -----",
    execution.output
  ].join("\n");
}

function outputSummaryFor(command: string, execution: ExecutedCommand) {
  const status = execution.exitCode === 0 ? "passed" : "failed";
  return `${command} ${status} with exit code ${execution.exitCode} in engineering local runner.`;
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

function localWorktreeProbe(relativePath: string) {
  try {
    const output = execFileSync("git", ["status", "--porcelain=v1", "--", relativePath], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    const line = output.split(/\r?\n/).find(Boolean);
    if (!line) {
      return {
        checked: true,
        changed: false,
        status: "clean" as CodingAgentImplementationWorktreeStatus,
        reason: "Git worktree reports the path is clean."
      };
    }
    return {
      checked: true,
      changed: true,
      status: worktreeStatusFromPorcelain(line),
      reason: line
    };
  } catch (error) {
    return {
      checked: false,
      changed: false,
      status: "unknown" as CodingAgentImplementationWorktreeStatus,
      reason: error instanceof Error ? error.message : "Unknown git worktree probe failure."
    };
  }
}

function worktreeStatusFromPorcelain(line: string): CodingAgentImplementationWorktreeStatus {
  const status = line.slice(0, 2);
  if (status.includes("U")) return "unmerged";
  if (status.includes("R")) return "renamed";
  if (status.includes("C")) return "copied";
  if (status.includes("D")) return "deleted";
  if (status.includes("A")) return "added";
  if (status.includes("M")) return "modified";
  if (status.includes("T")) return "typechange";
  if (status.includes("?")) return "untracked";
  return "unknown";
}

function validateInputs({
  bundle,
  selfTest,
  preflight,
  launchQueue
}: {
  bundle: CodingAgentSessionBundle;
  selfTest: CodingAgentRunnerSelfTest;
  preflight: CodingAgentSandboxRunnerPreflight;
  launchQueue: EngineeringLaunchQueue;
}) {
  if (bundle.schema !== "naikaku.coding-agent-session-bundle.v1") {
    throw new Error("session-bundle.json must use schema naikaku.coding-agent-session-bundle.v1");
  }
  if (selfTest.schema !== "naikaku.coding-agent-runner-self-test.v1") {
    throw new Error("runner-self-test.json must use schema naikaku.coding-agent-runner-self-test.v1");
  }
  if (preflight.schema !== "naikaku.coding-agent-sandbox-runner-preflight.v1") {
    throw new Error("sandbox-preflight.json must use schema naikaku.coding-agent-sandbox-runner-preflight.v1");
  }
  if (launchQueue.schema !== "naikaku.engineering-launch-queue.v1") {
    throw new Error("launch-queue.json must use schema naikaku.engineering-launch-queue.v1");
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifact(relativePath: string, content: string) {
  const fullPath = path.resolve(relativePath);
  const dir = path.dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, `${content}\n`, "utf8");
}

function summaryMarkdown(summary: EngineeringRunLocalSummary) {
  return [
    "# Engineering Local Runner",
    "",
    `Generated: ${summary.generatedAt}`,
    `Input: ${summary.inputDir}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Decisions",
    "",
    ...Object.entries(summary.decisions).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Claims",
    "",
    ...Object.entries(summary.claims).map(([key, value]) => `- ${key}: ${value ? "yes" : "no"}`),
    "",
    "## Patch",
    "",
    `- Applied: ${summary.patch.applied ? "yes" : "no"}`,
    `- File: ${summary.patch.file || "none"}`,
    ...summary.patch.changedFiles.map((file) => `- Changed: ${file}`),
    "",
    "## Counts",
    "",
    ...Object.entries(summary.counts).map(([key, value]) => `- ${key}: ${value}`),
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

function printSummary(summary: EngineeringRunLocalSummary) {
  console.log("Engineering local runner complete.");
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- preflight: ${summary.decisions.preflight}`);
  console.log(`- runner report: ${summary.decisions.runnerReport}`);
  console.log(`- commands executed: ${summary.counts.commandsExecuted}`);
  console.log(`- failed commands: ${summary.counts.failedCommands}`);
  console.log(`- local run claim: ${summary.claims.localRun ? "yes" : "no"}`);
  console.log(`- code changed claim: ${summary.claims.codeChanged ? "yes" : "no"}`);
  console.log(`- completion claim: ${summary.claims.completion ? "yes" : "no"}`);
}

function parseArgs(args: string[]): EngineeringRunLocalOptions {
  const options: EngineeringRunLocalOptions = {
    inputDir: "output/engineering-simulate",
    outputDir: "output/engineering-run-local",
    patchFile: null,
    timeoutMs: 120_000,
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--input" || arg === "--input-dir") {
      options.inputDir = args[index + 1] || options.inputDir;
      index += 1;
    } else if (arg === "--out") {
      options.outputDir = args[index + 1] || options.outputDir;
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
    }
  }

  return options;
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function normalizedPrefix(prefix: string) {
  const normalized = prefix.trim().replace(/^\.\/+/, "").replace(/\/+/g, "/");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function truncateOutput(output: string) {
  const max = 80_000;
  if (output.length <= max) return output;
  return `${output.slice(0, max)}\n[truncated ${output.length - max} characters]`;
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run engineering:simulate -- --mission \"Run local checks\"",
    "  npm run engineering:run-local",
    "",
    "Options:",
    "  --input <dir>             Directory from engineering:simulate. Default: output/engineering-simulate.",
    "  --out <dir>               Output directory. Default: output/engineering-run-local.",
    "  --patch-file <path>       Optional explicit unified diff to apply before verification.",
    "  --timeout-ms <number>     Per-command timeout. Default: 120000.",
    "  --generated-at <iso>      Stable timestamp for tests.",
    "  --help, -h                Show this help.",
    "",
    "This command runs only preflight-allowed local commands. It does not control macOS, commit, push, deploy, or call model providers."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering local runner failure.");
  process.exitCode = 1;
});
