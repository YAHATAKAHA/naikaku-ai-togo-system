import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditCodingAgentImplementationArtifacts } from "../src/domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationEvidence";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "../src/domain/codingAgentSessionReceipt";
import {
  buildCodingAgentSandboxRunnerPreflight,
  codingAgentSandboxRunnerAllowedCommands,
  serializeCodingAgentSandboxRunnerPreflightMarkdown
} from "../src/domain/codingAgentSandboxRunnerPreflight";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type {
  CodingAgentCommandResult,
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestItem,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerDrillSummary,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem
} from "../src/domain/types";

const allowedCommands = new Set<string>(codingAgentSandboxRunnerAllowedCommands);
const securityBlockedCommand = "git push origin main";

interface SandboxRunnerOptions {
  selfTestDir: string;
  outputDir: string;
  generatedAt: string;
  locale: string;
  timeoutMs: number;
  help: boolean;
}

interface ExecutedCommand {
  command: string;
  exitCode: number | null;
  output: string;
  durationMs: number;
  timedOut: boolean;
}

interface RunnerCaseResult {
  sourceSelfTest: CodingAgentRunnerSelfTest;
  report: SandboxRunnerReport;
  submittedReceipt: CodingAgentSessionReceipt;
  receiptReview: CodingAgentSessionReceipt;
  evidence: CodingAgentImplementationEvidence;
  audit: CodingAgentImplementationArtifactAudit;
  commandCache: Map<string, ExecutedCommand>;
  transcriptFilesWritten: number;
  changedFileSummaries: number;
  evidenceArtifacts: number;
}

interface SecurityBlockedPreflightCase {
  preflight: CodingAgentSandboxRunnerPreflight;
}

interface SandboxRunnerReport {
  schema: "naikaku.coding-agent-sandbox-runner.v1";
  generatedAt: string;
  mode: "local-sandbox-runner-drill";
  sourceSchema: CodingAgentRunnerSelfTest["schema"];
  sourceDecision: CodingAgentRunnerSelfTest["decision"];
  decision: "sandbox-runner-verified" | "needs-review" | "blocked";
  runId?: string;
  operatorLocale: string;
  items: SandboxRunnerReportItem[];
  summary: {
    total: number;
    executedTasks: number;
    heldTasks: number;
    blockedTasks: number;
    commandResults: number;
    processExecutions: number;
    failedCommands: number;
    blockedCommands: number;
    transcriptFilesWritten: number;
    changedFileSummaries: number;
    evidenceArtifacts: number;
    unsafePaths: number;
  };
  honestyClaim: {
    level: "local-sandbox-runner-drill";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

interface SandboxRunnerReportItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: string;
  selfTestStatus: string;
  runStatus: "executed" | "held" | "blocked" | "failed";
  promptPath: string | null;
  receiptDraftPath: string | null;
  evidenceArtifactPrefix: string;
  changedFileSummaryPath: string | null;
  commandResults: Array<CodingAgentCommandResult & {
    status: "executed" | "blocked" | "skipped";
    durationMs?: number;
  }>;
  evidence: string[];
  risks: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const selfTestDir = path.resolve(options.selfTestDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);
  const context = buildContext({
    locale: options.locale,
    generatedAt: options.generatedAt
  });
  const productionHeldBundle = buildCodingAgentSessionBundle({
    briefs: context.briefs,
    requireProductionEvidence: true,
    generatedAt: options.generatedAt
  });

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const valid = await runCase({
    name: "valid",
    selfTest: await loadSelfTest(path.join(selfTestDir, "valid", "runner-self-test.json")),
    bundle: context.bundle,
    outputDir,
    generatedAt: options.generatedAt,
    timeoutMs: options.timeoutMs
  });
  const productionHeld = await runCase({
    name: "production-held",
    selfTest: await loadSelfTest(path.join(selfTestDir, "production-held", "runner-self-test.json")),
    bundle: productionHeldBundle,
    outputDir,
    generatedAt: options.generatedAt,
    timeoutMs: options.timeoutMs
  });
  const securityBlockedPreflight = await runSecurityBlockedPreflightCase({
    selfTest: valid.sourceSelfTest,
    bundle: context.bundle,
    outputDir,
    generatedAt: options.generatedAt
  });

  const summary: CodingAgentSandboxRunnerDrillSummary = {
    schema: "naikaku.coding-agent-sandbox-runner-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: options.locale,
    source: {
      runnerSelfTestDecision: valid.sourceSelfTest.decision,
      wouldRun: valid.sourceSelfTest.summary.wouldRun,
      pendingCommands: valid.sourceSelfTest.summary.pendingCommands,
      notExecutedCommands: valid.sourceSelfTest.summary.notExecutedCommands,
      expectedEvidenceArtifacts: valid.sourceSelfTest.summary.expectedEvidenceArtifacts,
      receiptDraftPaths: valid.sourceSelfTest.summary.receiptDraftPaths
    },
    valid: caseSummary(valid),
    productionHeld: {
      decision: productionHeld.report.decision,
      executedTasks: productionHeld.report.summary.executedTasks,
      heldTasks: productionHeld.report.summary.heldTasks,
      blockedTasks: productionHeld.report.summary.blockedTasks,
      commandResults: productionHeld.report.summary.commandResults,
      processExecutions: productionHeld.report.summary.processExecutions,
      receiptReviewDecision: productionHeld.receiptReview.decision,
      artifactAuditDecision: productionHeld.audit.decision
    },
    securityBlockedPreflight: {
      decision: securityBlockedPreflight.preflight.decision,
      readyTasks: securityBlockedPreflight.preflight.summary.readyTasks,
      blockedTasks: securityBlockedPreflight.preflight.summary.blockedTasks,
      allowedCommands: securityBlockedPreflight.preflight.summary.allowedCommands,
      blockedCommands: securityBlockedPreflight.preflight.summary.blockedCommands,
      blockedSecurityCommands: securityBlockedPreflight.preflight.summary.blockedSecurityCommands,
      expectedProcessExecutions: securityBlockedPreflight.preflight.summary.expectedProcessExecutions,
      expectedCommandResults: securityBlockedPreflight.preflight.summary.expectedCommandResults,
      tamperedCommand: securityBlockedCommand,
      dangerousCommandAllowlisted: securityBlockedPreflight.preflight.commandAllowlist.includes(securityBlockedCommand)
    },
    checks: checksFor(valid, productionHeld, securityBlockedPreflight),
    honestyClaim: {
      level: "local-sandbox-runner-drill",
      claim: "This drill executes only allowlisted local verification commands and writes sandbox transcripts, receipt review, implementation evidence, and artifact-audit files for runner plumbing verification.",
      limitations: [
        "It does not ask a model to implement the work, inspect prompt contents for task completion, browse, control the desktop, call MCP tools, call providers, deploy, commit, push, or touch production systems.",
        "It mutates one preflight fixture with an allowlisted dangerous Git command to prove the security classifier still blocks runner execution.",
        "The generated receipt is accepted only as local runner plumbing evidence; it must not be reconciled into the Development Board as completed feature work.",
        "A sandbox-runner-verified decision proves the local command/evidence/receipt chain is runnable, not that the product backlog items were implemented."
      ],
      productionRequirements: [
        "Replace this drill with real governed coding-agent workspace receipts before accepting implementation work.",
        "Attach authenticated transcripts, diffs, and replayable artifacts from the real runner before production handoff.",
        "Run production-mode release verification before claiming external production readiness."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function buildContext({
  locale,
  generatedAt
}: {
  locale: string;
  generatedAt: string;
}) {
  const workspace = createDefaultWorkspace();
  const handoff = buildTeamHandoff({
    workspace,
    generatedAt
  });
  const board = buildDevelopmentBoard({
    handoff,
    generatedAt
  });
  const briefs = buildCodingAgentBriefs({
    board,
    operatorLocale: locale,
    generatedAt
  });
  const review = buildCodingAgentBriefReview({
    briefs,
    generatedAt
  });
  const bundle = buildCodingAgentSessionBundle({
    briefs,
    review,
    generatedAt
  });

  return {
    briefs,
    review,
    bundle
  };
}

async function runCase({
  name,
  selfTest,
  bundle,
  outputDir,
  generatedAt,
  timeoutMs
}: {
  name: string;
  selfTest: CodingAgentRunnerSelfTest;
  bundle: CodingAgentSessionBundle;
  outputDir: string;
  generatedAt: string;
  timeoutMs: number;
}): Promise<RunnerCaseResult> {
  const caseDir = path.join(outputDir, name);
  await mkdir(caseDir, { recursive: true });

  const runnableItems = selfTest.items.filter((item) => item.selfTestStatus === "would-run");
  const commandCache = new Map<string, ExecutedCommand>();
  for (const command of uniqueCommands(runnableItems)) {
    if (!allowedCommands.has(command)) continue;
    commandCache.set(command, await executeCommand(command, timeoutMs));
  }

  const receipt = buildSubmittedReceipt({
    bundle,
    selfTest,
    commandCache,
    generatedAt,
    caseName: name
  });
  const review = reviewCodingAgentSessionReceipt({
    bundle,
    receipt,
    generatedAt
  });
  const evidence = buildCodingAgentImplementationEvidence({
    receipt: review,
    generatedAt
  });
  const audit = auditCodingAgentImplementationArtifacts({
    evidence,
    generatedAt,
    artifactProbe: localArtifactProbe
  });
  const report = buildReport({
    selfTest,
    receipt,
    commandCache,
    audit,
    generatedAt
  });

  await writeJson(path.join(caseDir, "sandbox-runner-report.json"), report);
  await writeFile(path.join(caseDir, "sandbox-runner-report.md"), reportMarkdown(report), "utf8");
  await writeJson(path.join(caseDir, "submitted-receipt.json"), receipt);
  await writeJson(path.join(caseDir, "receipt-review.json"), review);
  await writeJson(path.join(caseDir, "implementation-evidence.json"), evidence);
  await writeJson(path.join(caseDir, "artifact-audit.json"), audit);

  return {
    sourceSelfTest: selfTest,
    report,
    submittedReceipt: receipt,
    receiptReview: review,
    evidence,
    audit,
    commandCache,
    transcriptFilesWritten: report.summary.transcriptFilesWritten,
    changedFileSummaries: report.summary.changedFileSummaries,
    evidenceArtifacts: report.summary.evidenceArtifacts
  };
}

async function runSecurityBlockedPreflightCase({
  selfTest,
  bundle,
  outputDir,
  generatedAt
}: {
  selfTest: CodingAgentRunnerSelfTest;
  bundle: CodingAgentSessionBundle;
  outputDir: string;
  generatedAt: string;
}): Promise<SecurityBlockedPreflightCase> {
  const caseDir = path.join(outputDir, "security-blocked-preflight");
  const tamperedSelfTest = tamperSelfTestWithBlockedCommand(selfTest);
  const preflight = buildCodingAgentSandboxRunnerPreflight({
    selfTest: tamperedSelfTest,
    bundle,
    generatedAt,
    commandAllowlist: [...codingAgentSandboxRunnerAllowedCommands, securityBlockedCommand]
  });

  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "tampered-runner-self-test.json"), tamperedSelfTest);
  await writeJson(path.join(caseDir, "sandbox-runner-preflight.json"), preflight);
  await writeFile(
    path.join(caseDir, "sandbox-runner-preflight.md"),
    serializeCodingAgentSandboxRunnerPreflightMarkdown(preflight),
    "utf8"
  );

  return { preflight };
}

function tamperSelfTestWithBlockedCommand(selfTest: CodingAgentRunnerSelfTest): CodingAgentRunnerSelfTest {
  const tampered = JSON.parse(JSON.stringify(selfTest)) as CodingAgentRunnerSelfTest;
  const target = tampered.items.find((item) =>
    item.selfTestStatus === "would-run" && item.commands.length > 0
  );
  if (!target) {
    throw new Error("Security-blocked preflight probe needs at least one would-run command.");
  }

  target.commands = target.commands.map((command, index) =>
    index === 0
      ? {
        ...command,
        command: securityBlockedCommand
      }
      : command
  );
  target.simulatedActions = [
    ...target.simulatedActions,
    "Security probe: this tampered local fixture must stay blocked even if its command appears in the allowlist."
  ];

  return tampered;
}

function buildSubmittedReceipt({
  bundle,
  selfTest,
  commandCache,
  generatedAt,
  caseName
}: {
  bundle: CodingAgentSessionBundle;
  selfTest: CodingAgentRunnerSelfTest;
  commandCache: Map<string, ExecutedCommand>;
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
  caseName
}: {
  item: CodingAgentSessionReceiptItem;
  session: CodingAgentSession;
  selfTestItem: CodingAgentRunnerSelfTestItem;
  commandCache: Map<string, ExecutedCommand>;
  caseName: string;
}): CodingAgentSessionReceiptItem {
  const runDir = `${normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix)}sandbox-runner-${caseName}`;
  const changedFileSummaryPath = `${runDir}/changed-files.txt`;
  writeArtifactSync(changedFileSummaryPath, [
    `Sandbox runner drill changed-file summary for ${item.sessionId}`,
    `Source item: ${item.sourceItemId || "none"}`,
    "No product implementation was attempted by this drill.",
    "This file proves the receipt changed-file evidence slot can be populated inside the session sandbox prefix."
  ].join("\n"));

  const commandResults = selfTestItem.commands.map((command, index) => {
    const execution = commandCache.get(command.command);
    const transcriptRef = command.transcriptRef || `${runDir}/transcript-${index + 1}.log`;

    if (!allowedCommands.has(command.command)) {
      writeArtifactSync(transcriptRef, [
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
      writeArtifactSync(transcriptRef, [
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

    writeArtifactSync(transcriptRef, transcriptFor({
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
    writeArtifactSync(artifact.path, [
      artifact.label,
      `Session: ${item.sessionId}`,
      `Source item: ${item.sourceItemId || "none"}`,
      "Local sandbox runner drill evidence artifact.",
      "This artifact proves local evidence paths, receipt review, and artifact audit wiring only.",
      "It is not a claim that product implementation work was completed."
    ].join("\n"));
    return `${artifact.label} -> ${artifact.path || `${runDir}/evidence-${index + 1}.txt`}`;
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
  receipt,
  commandCache,
  audit,
  generatedAt
}: {
  selfTest: CodingAgentRunnerSelfTest;
  receipt: CodingAgentSessionReceipt;
  commandCache: Map<string, ExecutedCommand>;
  audit: CodingAgentImplementationArtifactAudit;
  generatedAt: string;
}): SandboxRunnerReport {
  const receiptItems = new Map(receipt.items.map((item) => [item.sessionId, item]));
  const items = selfTest.items.map((item) => reportItemFor({
    selfTestItem: item,
    receiptItem: receiptItems.get(item.sessionId),
    commandCache
  }));
  const commandResults = items.flatMap((item) => item.commandResults);
  const blockedCommands = commandResults.filter((command) => command.status === "blocked").length;
  const failedCommands = commandResults.filter((command) =>
    typeof command.exitCode === "number" && command.exitCode !== 0
  ).length;
  const executedTasks = items.filter((item) => item.runStatus === "executed").length;
  const heldTasks = items.filter((item) => item.runStatus === "held").length;
  const blockedTasks = items.filter((item) => item.runStatus === "blocked").length;
  const unsafePaths = audit.summary.unsafePaths;

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
      transcriptFilesWritten: commandResults.filter((command) => Boolean(command.transcriptRef)).length,
      changedFileSummaries: items.filter((item) => Boolean(item.changedFileSummaryPath)).length,
      evidenceArtifacts: items.reduce((total, item) => total + item.evidence.length, 0),
      unsafePaths
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
  commandCache
}: {
  selfTestItem: CodingAgentRunnerSelfTestItem;
  receiptItem?: CodingAgentSessionReceiptItem;
  commandCache: Map<string, ExecutedCommand>;
}): SandboxRunnerReportItem {
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

  const commandResults = receiptItem.commandResults.map((result) => {
    const execution = commandCache.get(result.command);
    const allowed = allowedCommands.has(result.command);
    return {
      ...result,
      status: allowed && execution ? "executed" as const : allowed ? "skipped" as const : "blocked" as const,
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
}): SandboxRunnerReport["decision"] {
  if (selfTest.decision !== "self-test-ready") return "needs-review";
  if (blockedTasks > 0 || failedCommands > 0 || unsafePaths > 0) return "blocked";
  return executedTasks > 0 ? "sandbox-runner-verified" : "needs-review";
}

async function executeCommand(command: string, timeoutMs: number): Promise<ExecutedCommand> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
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
      resolve({
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
      resolve({
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
      resolve({
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

function caseSummary(result: RunnerCaseResult): CodingAgentSandboxRunnerDrillSummary["valid"] {
  return {
    decision: result.report.decision,
    executedTasks: result.report.summary.executedTasks,
    heldTasks: result.report.summary.heldTasks,
    blockedTasks: result.report.summary.blockedTasks,
    commandResults: result.report.summary.commandResults,
    processExecutions: result.report.summary.processExecutions,
    failedCommands: result.report.summary.failedCommands,
    blockedCommands: result.report.summary.blockedCommands,
    transcriptFilesWritten: result.transcriptFilesWritten,
    changedFileSummaries: result.changedFileSummaries,
    evidenceArtifacts: result.evidenceArtifacts,
    receiptReviewDecision: result.receiptReview.decision,
    evidenceDecision: result.evidence.decision,
    artifactAuditDecision: result.audit.decision,
    verifiedArtifactPaths: result.audit.summary.verifiedPaths,
    transcriptContentMismatches: result.audit.summary.transcriptContentMismatches,
    reusedTranscriptRefs: result.audit.summary.reusedTranscriptRefs,
    unsafePaths: result.report.summary.unsafePaths
  };
}

function checksFor(
  valid: RunnerCaseResult,
  productionHeld: RunnerCaseResult,
  securityBlockedPreflight: SecurityBlockedPreflightCase
) {
  return {
    validSelfTestReady: valid.report.sourceDecision === "self-test-ready",
    allowedCommandsOnly: valid.report.items.every((item) =>
      item.commandResults.every((result) => allowedCommands.has(result.command) && result.status !== "blocked")
    ),
    actualProcessCommandsExecuted: valid.report.summary.processExecutions > 0,
    commandResultsComplete:
      valid.report.summary.commandResults > 0 &&
      valid.report.summary.failedCommands === 0 &&
      valid.report.summary.blockedCommands === 0,
    transcriptFilesWritten:
      valid.report.summary.transcriptFilesWritten === valid.report.summary.commandResults,
    receiptReviewVerified:
      valid.receiptReview.decision === "verified" &&
      valid.evidence.decision === "accepted-for-handoff",
    artifactAuditVerified:
      valid.audit.decision === "verified" &&
      valid.audit.summary.transcriptContentMismatches === 0 &&
      valid.audit.summary.reusedTranscriptRefs === 0,
    dryRunBoundaryClear:
      valid.report.honestyClaim.limitations.some((item) => item.includes("does not implement")) &&
      valid.report.items.every((item) => item.risks.some((risk) => risk.includes("no product implementation"))),
    productionHeldNoExecution:
      productionHeld.report.sourceDecision === "needs-review" &&
      productionHeld.report.summary.executedTasks === 0 &&
      productionHeld.report.summary.processExecutions === 0 &&
      productionHeld.report.summary.commandResults === 0,
    productionHeldReceiptBlocked:
      productionHeld.receiptReview.decision === "blocked" &&
      productionHeld.audit.decision === "blocked",
    securityClassifierBlocksTamperedCommand:
      securityBlockedPreflight.preflight.decision === "blocked" &&
      securityBlockedPreflight.preflight.commandAllowlist.includes(securityBlockedCommand) &&
      securityBlockedPreflight.preflight.summary.blockedTasks > 0 &&
      securityBlockedPreflight.preflight.summary.blockedCommands > 0 &&
      securityBlockedPreflight.preflight.summary.blockedSecurityCommands > 0
  };
}

async function loadSelfTest(filePath: string): Promise<CodingAgentRunnerSelfTest> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as CodingAgentRunnerSelfTest;
  if (parsed.schema !== "naikaku.coding-agent-runner-self-test.v1") {
    throw new Error(`Runner self-test must use schema naikaku.coding-agent-runner-self-test.v1: ${filePath}`);
  }
  return parsed;
}

function uniqueCommands(items: CodingAgentRunnerSelfTestItem[]) {
  return [...new Set(items.flatMap((item) => item.commands.map((command) => command.command)))];
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

function writeArtifactSync(relativePath: string, content: string) {
  const fullPath = path.resolve(relativePath);
  const dir = path.dirname(fullPath);
  if (!existsSync(dir)) {
    // This script is deliberately synchronous for per-artifact writes so receipt
    // creation can stay a pure object transform from the caller's perspective.
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, `${content}\n`, "utf8");
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

function summaryMarkdown(summary: CodingAgentSandboxRunnerDrillSummary) {
  return [
    "# Coding Agent Sandbox Runner Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Sandbox Runner",
    "",
    `- Decision: ${summary.valid.decision}`,
    `- Executed tasks: ${summary.valid.executedTasks}`,
    `- Process executions: ${summary.valid.processExecutions}`,
    `- Command results: ${summary.valid.commandResults}`,
    `- Failed commands: ${summary.valid.failedCommands}`,
    `- Transcript files: ${summary.valid.transcriptFilesWritten}`,
    `- Receipt review: ${summary.valid.receiptReviewDecision}`,
    `- Artifact audit: ${summary.valid.artifactAuditDecision}`,
    `- Transcript mismatches: ${summary.valid.transcriptContentMismatches}`,
    "",
    "## Production-Held Sandbox Runner",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Executed tasks: ${summary.productionHeld.executedTasks}`,
    `- Process executions: ${summary.productionHeld.processExecutions}`,
    `- Receipt review: ${summary.productionHeld.receiptReviewDecision}`,
    "",
    "## Security-Blocked Preflight",
    "",
    `- Decision: ${summary.securityBlockedPreflight.decision}`,
    `- Ready tasks: ${summary.securityBlockedPreflight.readyTasks}`,
    `- Blocked tasks: ${summary.securityBlockedPreflight.blockedTasks}`,
    `- Allowed commands: ${summary.securityBlockedPreflight.allowedCommands}`,
    `- Blocked commands: ${summary.securityBlockedPreflight.blockedCommands}`,
    `- Blocked security commands: ${summary.securityBlockedPreflight.blockedSecurityCommands}`,
    `- Tampered command: ${summary.securityBlockedPreflight.tamperedCommand}`,
    `- Dangerous command allowlisted: ${summary.securityBlockedPreflight.dangerousCommandAllowlisted}`,
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

function reportMarkdown(report: SandboxRunnerReport) {
  return [
    "# Coding Agent Sandbox Runner Report",
    "",
    `Mode: ${report.mode}`,
    `Decision: ${report.decision}`,
    `Source decision: ${report.sourceDecision}`,
    `Locale: ${report.operatorLocale}`,
    `Run: ${report.runId || "workspace"}`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Executed tasks: ${report.summary.executedTasks}`,
    `- Held tasks: ${report.summary.heldTasks}`,
    `- Blocked tasks: ${report.summary.blockedTasks}`,
    `- Process executions: ${report.summary.processExecutions}`,
    `- Command results: ${report.summary.commandResults}`,
    `- Failed commands: ${report.summary.failedCommands}`,
    `- Transcript files: ${report.summary.transcriptFilesWritten}`,
    `- Evidence artifacts: ${report.summary.evidenceArtifacts}`,
    "",
    ...report.items.flatMap((item, index) => [
      `## ${index + 1}. ${item.title}`,
      "",
      `- Session: ${item.sessionId}`,
      `- Executor: ${item.executorProfileId}`,
      `- Self-test: ${item.selfTestStatus}`,
      `- Run status: ${item.runStatus}`,
      `- Changed-file summary: ${item.changedFileSummaryPath || "not-written"}`,
      "",
      "### Commands",
      "",
      ...(item.commandResults.length ? item.commandResults : []).map((command) =>
        `- ${command.command} -> ${command.status}; exit ${command.exitCode}; transcript ${command.transcriptRef || "none"}`
      ),
      "",
      "### Risks",
      "",
      ...(item.risks.length ? item.risks : ["none"]).map((risk) => `- ${risk}`),
      ""
    ])
  ].join("\n");
}

function parseArgs(args: string[]): SandboxRunnerOptions {
  const options: SandboxRunnerOptions = {
    selfTestDir: "output/coding-agent-runner-self-test",
    outputDir: "output/coding-agent-sandbox-runner",
    generatedAt: new Date().toISOString(),
    locale: "ja",
    timeoutMs: 120_000,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--self-test-dir") {
      options.selfTestDir = requireValue(args, index, arg);
      index += 1;
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

    if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
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

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function printHelp() {
  console.log(`Naikaku coding-agent sandbox runner drill

Usage:
  npm run coding-agent:sandbox-runner -- [options]

Options:
  --self-test-dir <dir>  Read runner self-test artifacts. Default: output/coding-agent-runner-self-test
  --out <dir>            Output directory. Default: output/coding-agent-sandbox-runner
  --generated-at <iso>   Stable timestamp for generated artifacts.
  --locale <locale>      Operator locale. Default: ja
  --timeout-ms <ms>      Per-command timeout. Default: 120000
  -h, --help             Show this help.

The drill executes only allowlisted local verification commands and writes
sandbox receipt/evidence artifacts. It is not implementation completion proof.`);
}

function printSummary(summary: CodingAgentSandboxRunnerDrillSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Coding agent sandbox runner drill: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Valid: ${summary.valid.decision}, executed tasks ${summary.valid.executedTasks}, ` +
    `process executions ${summary.valid.processExecutions}, command results ${summary.valid.commandResults}, ` +
    `receipt ${summary.valid.receiptReviewDecision}, artifact audit ${summary.valid.artifactAuditDecision}`
  );
  console.log(
    `Production-held: ${summary.productionHeld.decision}, executed tasks ${summary.productionHeld.executedTasks}, ` +
    `process executions ${summary.productionHeld.processExecutions}, receipt ${summary.productionHeld.receiptReviewDecision}`
  );
  console.log(
    `Security-blocked preflight: ${summary.securityBlockedPreflight.decision}, ` +
    `blocked commands ${summary.securityBlockedPreflight.blockedCommands}, ` +
    `security blocks ${summary.securityBlockedPreflight.blockedSecurityCommands}`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent sandbox runner drill failure.");
  process.exitCode = 1;
});
