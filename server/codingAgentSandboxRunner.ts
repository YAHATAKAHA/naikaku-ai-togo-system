import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { isSafeRelativeArtifactPath } from "../src/domain/codingAgentArtifactReferences";
import { auditCodingAgentImplementationArtifacts } from "../src/domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationEvidence";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "../src/domain/codingAgentSessionReceipt";
import type {
  CodingAgentCommandResult,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestItem,
  CodingAgentSandboxRunnerCommandResult,
  CodingAgentSandboxRunnerDecision,
  CodingAgentSandboxRunnerReport,
  CodingAgentSandboxRunnerReportItem,
  CodingAgentSandboxRunnerResult,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem
} from "../src/domain/types";

export const sandboxRunnerAllowedCommands = ["npm run test", "npm run build"] as const;

export interface RunCodingAgentSandboxRunnerInput {
  selfTest: CodingAgentRunnerSelfTest;
  bundle: CodingAgentSessionBundle;
  generatedAt?: string;
  caseName?: string;
  timeoutMs?: number;
  commandAllowlist?: readonly string[];
}

interface ExecutedCommand {
  command: string;
  exitCode: number | null;
  output: string;
  durationMs: number;
  timedOut: boolean;
}

export async function runCodingAgentSandboxRunner({
  selfTest,
  bundle,
  generatedAt = new Date().toISOString(),
  caseName = "gateway",
  timeoutMs = 120_000,
  commandAllowlist = sandboxRunnerAllowedCommands
}: RunCodingAgentSandboxRunnerInput): Promise<CodingAgentSandboxRunnerResult> {
  const allowedCommands = new Set(commandAllowlist);
  const runnableItems = selfTest.items.filter((item) => item.selfTestStatus === "would-run");
  const commandCache = new Map<string, ExecutedCommand>();

  for (const command of uniqueCommands(runnableItems)) {
    if (!allowedCommands.has(command)) continue;
    commandCache.set(command, await executeCommand(command, timeoutMs));
  }

  const submittedReceipt = buildSubmittedReceipt({
    bundle,
    selfTest,
    commandCache,
    allowedCommands,
    generatedAt,
    caseName
  });
  const receiptReview = reviewCodingAgentSessionReceipt({
    bundle,
    receipt: submittedReceipt,
    generatedAt
  });
  const implementationEvidence = buildCodingAgentImplementationEvidence({
    receipt: receiptReview,
    generatedAt
  });
  const artifactAudit = auditCodingAgentImplementationArtifacts({
    evidence: implementationEvidence,
    generatedAt,
    artifactProbe: localArtifactProbe
  });
  const report = buildReport({
    selfTest,
    submittedReceipt,
    commandCache,
    allowedCommands,
    auditUnsafePaths: artifactAudit.summary.unsafePaths,
    generatedAt
  });

  return {
    schema: "naikaku.coding-agent-sandbox-runner-result.v1",
    generatedAt,
    report,
    submittedReceipt,
    receiptReview,
    implementationEvidence,
    artifactAudit,
    honestyClaim: {
      level: "local-sandbox-runner-drill",
      claim: "This result executes only allowlisted local verification commands and returns local runner plumbing evidence.",
      limitations: [
        "It does not ask a model to implement backlog work, inspect prompt contents for task completion, browse, control the desktop, call MCP tools, call providers, deploy, commit, push, or touch production systems.",
        "The returned receipt is local runner plumbing evidence only and must not be reconciled into the Development Board as completed feature work.",
        "A sandbox-runner-verified decision proves the local command/evidence/receipt chain is runnable, not that product work was implemented."
      ],
      productionRequirements: [
        "Replace this drill with real governed coding-agent workspace receipts before accepting implementation work.",
        "Attach authenticated transcripts, diffs, and replayable artifacts from the real runner before production handoff.",
        "Run production-mode release verification before claiming external production readiness."
      ]
    }
  };
}

function buildSubmittedReceipt({
  bundle,
  selfTest,
  commandCache,
  allowedCommands,
  generatedAt,
  caseName
}: {
  bundle: CodingAgentSessionBundle;
  selfTest: CodingAgentRunnerSelfTest;
  commandCache: Map<string, ExecutedCommand>;
  allowedCommands: Set<string>;
  generatedAt: string;
  caseName: string;
}): CodingAgentSessionReceipt {
  const template = buildCodingAgentSessionReceiptTemplate({
    bundle,
    generatedAt
  });
  const sessions = new Map(bundle.sessions.map((session) => [session.id, session]));
  const selfTestItems = new Map(selfTest.items.map((item) => [item.sessionId, item]));
  const items = template.items.map((item) => {
    const session = sessions.get(item.sessionId);
    const selfTestItem = selfTestItems.get(item.sessionId);
    if (!session || !selfTestItem || selfTestItem.selfTestStatus !== "would-run") {
      return item;
    }
    return submittedItemFor({
      item,
      session,
      selfTestItem,
      commandCache,
      allowedCommands,
      caseName
    });
  });

  return {
    ...template,
    items
  };
}

function submittedItemFor({
  item,
  session,
  selfTestItem,
  commandCache,
  allowedCommands,
  caseName
}: {
  item: CodingAgentSessionReceiptItem;
  session: CodingAgentSession;
  selfTestItem: CodingAgentRunnerSelfTestItem;
  commandCache: Map<string, ExecutedCommand>;
  allowedCommands: Set<string>;
  caseName: string;
}): CodingAgentSessionReceiptItem {
  const runDir = `${normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix)}sandbox-runner-${caseName}`;
  const changedFileSummaryPath = `${runDir}/changed-files.txt`;
  writeArtifact(changedFileSummaryPath, [
    `Sandbox runner drill changed-file summary for ${item.sessionId}`,
    `Source item: ${item.sourceItemId || "none"}`,
    "No product implementation was attempted by this drill.",
    "This file proves the receipt changed-file evidence slot can be populated inside the session sandbox prefix."
  ].join("\n"));

  const commandResults = selfTestItem.commands.map((command, index): CodingAgentCommandResult => {
    const execution = commandCache.get(command.command);
    const transcriptRef = command.transcriptRef || `${runDir}/transcript-${index + 1}.log`;

    if (!allowedCommands.has(command.command)) {
      writeArtifact(transcriptRef, [
        `command: ${command.command}`,
        "status: blocked",
        "exit code: blocked",
        "Reason: command is outside the sandbox runner drill allowlist."
      ].join("\n"));
      return {
        command: command.command,
        exitCode: 1,
        outputSummary: "Blocked by sandbox runner drill allowlist.",
        transcriptRef
      };
    }

    if (!execution) {
      writeArtifact(transcriptRef, [
        `command: ${command.command}`,
        "status: skipped",
        "exit code: not-run",
        "Reason: command execution was not available in the local drill."
      ].join("\n"));
      return {
        command: command.command,
        exitCode: 1,
        outputSummary: "Command was allowed but did not produce an execution result.",
        transcriptRef
      };
    }

    writeArtifact(transcriptRef, transcriptFor({
      sessionId: item.sessionId,
      command: command.command,
      execution
    }));

    return {
      command: command.command,
      exitCode: execution.exitCode,
      outputSummary: outputSummaryFor(command.command, execution),
      transcriptRef
    };
  });

  const evidence = selfTestItem.expectedEvidenceArtifacts.map((artifact, index) => {
    const artifactPath = artifact.path || `${runDir}/evidence-${index + 1}.txt`;
    writeArtifact(artifactPath, [
      artifact.label,
      `Session: ${item.sessionId}`,
      `Source item: ${item.sourceItemId || "none"}`,
      "Local sandbox runner drill evidence artifact.",
      "This artifact proves local evidence paths, receipt review, and artifact audit wiring only.",
      "It is not a claim that product implementation work was completed."
    ].join("\n"));
    return `${artifact.label} -> ${artifactPath}`;
  });

  return {
    ...item,
    receiptStatus: "pending-evidence",
    changedFiles: [changedFileSummaryPath],
    commandResults,
    evidence,
    risks: [
      "Sandbox runner drill executed verification commands only; no product implementation was attempted.",
      "Do not reconcile this drill receipt into the Development Board as completed feature work."
    ],
    missing: [],
    nextAction: "Use this as local runner plumbing evidence only; replace it with real governed coding-agent receipts before accepting implementation work."
  };
}

function buildReport({
  selfTest,
  submittedReceipt,
  commandCache,
  allowedCommands,
  auditUnsafePaths,
  generatedAt
}: {
  selfTest: CodingAgentRunnerSelfTest;
  submittedReceipt: CodingAgentSessionReceipt;
  commandCache: Map<string, ExecutedCommand>;
  allowedCommands: Set<string>;
  auditUnsafePaths: number;
  generatedAt: string;
}): CodingAgentSandboxRunnerReport {
  const receiptItems = new Map(submittedReceipt.items.map((item) => [item.sessionId, item]));
  const items = selfTest.items.map((item) => reportItemFor({
    selfTestItem: item,
    receiptItem: receiptItems.get(item.sessionId),
    commandCache,
    allowedCommands
  }));
  const commandResults = items.flatMap((item) => item.commandResults);
  const blockedCommands = commandResults.filter((command) => command.status === "blocked").length;
  const failedCommands = commandResults.filter((command) =>
    typeof command.exitCode === "number" && command.exitCode !== 0
  ).length;
  const executedTasks = items.filter((item) => item.runStatus === "executed").length;
  const heldTasks = items.filter((item) => item.runStatus === "held").length;
  const blockedTasks = items.filter((item) => item.runStatus === "blocked").length;

  return {
    schema: "naikaku.coding-agent-sandbox-runner.v1",
    generatedAt,
    mode: "local-sandbox-runner-drill",
    sourceSchema: selfTest.schema,
    sourceDecision: selfTest.decision,
    decision: decisionFor({
      selfTest,
      executedTasks,
      blockedTasks,
      failedCommands,
      unsafePaths: auditUnsafePaths
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
      transcriptFilesWritten: commandResults.filter((command) => Boolean(command.transcriptRef)).length,
      changedFileSummaries: items.filter((item) => Boolean(item.changedFileSummaryPath)).length,
      evidenceArtifacts: items.reduce((total, item) => total + item.evidence.length, 0),
      unsafePaths: auditUnsafePaths
    },
    honestyClaim: {
      level: "local-sandbox-runner-drill",
      claim: "This local runner drill executes only allowlisted verification commands and writes receipt evidence artifacts to prove the sandbox evidence path.",
      limitations: [
        "It does not implement the queued backlog work.",
        "It does not read host secrets, use browsers, control desktops, call MCP tools, call providers, deploy, commit, push, or inspect production.",
        "It must not be treated as real coding-agent completion evidence."
      ],
      productionRequirements: [
        "Run real task-specific coding agents in governed workspaces before accepting implementation.",
        "Attach real diffs, transcripts, artifacts, and risk notes before reconciliation.",
        "Run production-mode release verification before external handoff."
      ]
    }
  };
}

function reportItemFor({
  selfTestItem,
  receiptItem,
  commandCache,
  allowedCommands
}: {
  selfTestItem: CodingAgentRunnerSelfTestItem;
  receiptItem?: CodingAgentSessionReceiptItem;
  commandCache: Map<string, ExecutedCommand>;
  allowedCommands: Set<string>;
}): CodingAgentSandboxRunnerReportItem {
  if (selfTestItem.selfTestStatus !== "would-run" || !receiptItem) {
    return {
      sessionId: selfTestItem.sessionId,
      sourceItemId: selfTestItem.sourceItemId,
      title: selfTestItem.title,
      executorProfileId: selfTestItem.executorProfileId,
      selfTestStatus: selfTestItem.selfTestStatus,
      runStatus: selfTestItem.selfTestStatus === "blocked" ? "blocked" : "held",
      promptPath: selfTestItem.promptPath,
      receiptDraftPath: selfTestItem.receiptDraftPath,
      evidenceArtifactPrefix: selfTestItem.evidenceArtifactPrefix,
      changedFileSummaryPath: null,
      commandResults: [],
      evidence: [],
      risks: ["Task was not runnable in the source self-test; no sandbox command execution was attempted."],
      checks: [{
        id: "self-test-status",
        status: selfTestItem.selfTestStatus === "blocked" ? "block" : "warn",
        summary: `Self-test status is ${selfTestItem.selfTestStatus}.`
      }],
      nextAction: selfTestItem.nextAction
    };
  }

  const commandResults: CodingAgentSandboxRunnerCommandResult[] = receiptItem.commandResults.map((result) => {
    const execution = commandCache.get(result.command);
    const allowed = allowedCommands.has(result.command);
    return {
      ...result,
      status: allowed && execution ? "executed" : allowed ? "skipped" : "blocked",
      durationMs: execution?.durationMs
    };
  });
  const failed = commandResults.some((result) => typeof result.exitCode === "number" && result.exitCode !== 0);
  const blocked = commandResults.some((result) => result.status === "blocked");

  return {
    sessionId: selfTestItem.sessionId,
    sourceItemId: selfTestItem.sourceItemId,
    title: selfTestItem.title,
    executorProfileId: selfTestItem.executorProfileId,
    selfTestStatus: selfTestItem.selfTestStatus,
    runStatus: blocked ? "blocked" : failed ? "failed" : "executed",
    promptPath: selfTestItem.promptPath,
    receiptDraftPath: selfTestItem.receiptDraftPath,
    evidenceArtifactPrefix: selfTestItem.evidenceArtifactPrefix,
    changedFileSummaryPath: receiptItem.changedFiles[0] || null,
    commandResults,
    evidence: receiptItem.evidence,
    risks: receiptItem.risks,
    checks: [
      {
        id: "allowed-commands",
        status: commandResults.every((result) => result.status !== "blocked") ? "pass" : "block",
        summary: `${commandResults.length} command results checked against the drill allowlist.`
      },
      {
        id: "transcripts-written",
        status: commandResults.every((result) => Boolean(result.transcriptRef)) ? "pass" : "block",
        summary: `${commandResults.filter((result) => Boolean(result.transcriptRef)).length} transcript refs attached.`
      },
      {
        id: "drill-boundary",
        status: receiptItem.risks.some((risk) => risk.includes("no product implementation was attempted")) ? "pass" : "warn",
        summary: "Receipt risk note preserves the local drill boundary."
      }
    ],
    nextAction: receiptItem.nextAction
  };
}

function decisionFor({
  selfTest,
  executedTasks,
  blockedTasks,
  failedCommands,
  unsafePaths
}: {
  selfTest: CodingAgentRunnerSelfTest;
  executedTasks: number;
  blockedTasks: number;
  failedCommands: number;
  unsafePaths: number;
}): CodingAgentSandboxRunnerDecision {
  if (selfTest.decision !== "self-test-ready") return "needs-review";
  if (blockedTasks > 0 || failedCommands > 0 || unsafePaths > 0) return "blocked";
  return executedTasks > 0 ? "sandbox-runner-verified" : "needs-review";
}

async function executeCommand(command: string, timeoutMs: number): Promise<ExecutedCommand> {
  const startedAt = Date.now();
  return new Promise((resolvePromise) => {
    let output = "";
    let settled = false;
    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      env: {
        ...process.env,
        CI: "1"
      }
    });
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      resolvePromise({
        command,
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
      resolvePromise({
        command,
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
      resolvePromise({
        command,
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
  execution
}: {
  sessionId: string;
  command: string;
  execution: ExecutedCommand;
}) {
  return [
    `session: ${sessionId}`,
    `command: ${command}`,
    "runner mode: local-sandbox-runner-drill",
    "execution note: allowlisted command executed once in the local project workspace and copied into this session-specific transcript artifact.",
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
  return `${command} ${status} with exit code ${execution.exitCode} in local sandbox runner drill.`;
}

function uniqueCommands(items: CodingAgentRunnerSelfTestItem[]) {
  return [...new Set(items.flatMap((item) => item.commands.map((command) => command.command)))];
}

function localArtifactProbe(relativePath: string) {
  if (!isSafeRelativeArtifactPath(relativePath)) {
    return {
      exists: false
    };
  }
  const fullPath = resolveSafeArtifactPath(relativePath);
  if (!existsSync(fullPath)) {
    return {
      exists: false
    };
  }
  const stat = statSync(fullPath);
  if (!stat.isFile()) {
    return {
      exists: false
    };
  }
  const buffer = readFileSync(fullPath);
  return {
    exists: true,
    bytes: stat.size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    modifiedAt: stat.mtime.toISOString(),
    text: buffer.length <= 1024 * 1024 ? buffer.toString("utf8") : undefined
  };
}

function writeArtifact(relativePath: string, content: string) {
  if (!isSafeRelativeArtifactPath(relativePath)) {
    throw new Error(`Unsafe artifact path refused by sandbox runner: ${relativePath}`);
  }
  const fullPath = resolveSafeArtifactPath(relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${content}\n`, "utf8");
}

function resolveSafeArtifactPath(relativePath: string) {
  const root = process.cwd();
  const fullPath = resolve(root, relativePath);
  const workspaceRelativePath = relative(root, fullPath);
  if (!workspaceRelativePath || workspaceRelativePath.startsWith("..")) {
    throw new Error(`Artifact path must stay inside the workspace: ${relativePath}`);
  }
  return fullPath;
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
