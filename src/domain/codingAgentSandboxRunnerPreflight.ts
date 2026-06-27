import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import { defaultSandboxPolicy } from "../data/defaultCabinet";
import { classifyActionImpact } from "./securityClassifiers";
import type {
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestItem,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerPreflightCommand,
  CodingAgentSandboxRunnerPreflightDecision,
  CodingAgentSandboxRunnerPreflightItem,
  CodingAgentSandboxRunnerPreflightItemStatus,
  CodingAgentSessionBundle,
  SandboxPolicy
} from "./types";

export const codingAgentSandboxRunnerAllowedCommands = ["npm run test", "npm run build"] as const;

export function buildCodingAgentSandboxRunnerPreflight({
  selfTest,
  bundle,
  generatedAt = new Date().toISOString(),
  commandAllowlist = codingAgentSandboxRunnerAllowedCommands,
  sandboxPolicy = defaultSandboxPolicy
}: {
  selfTest: CodingAgentRunnerSelfTest;
  bundle?: CodingAgentSessionBundle;
  generatedAt?: string;
  commandAllowlist?: readonly string[];
  sandboxPolicy?: SandboxPolicy;
}): CodingAgentSandboxRunnerPreflight {
  const allowedCommands = new Set(commandAllowlist);
  const bundleSessions = new Set((bundle?.sessions || []).map((session) => session.id));
  const selfTestSessions = new Set(selfTest.items.map((item) => item.sessionId));
  const missingBundleSessions = bundle
    ? selfTest.items.filter((item) => !bundleSessions.has(item.sessionId)).length
    : 0;
  const extraBundleSessions = bundle
    ? bundle.sessions.filter((session) => !selfTestSessions.has(session.id)).length
    : 0;
  const items = selfTest.items.map((item) => preflightItemFor({
    item,
    allowedCommands,
    sandboxPolicy,
    bundleSessionFound: bundle ? bundleSessions.has(item.sessionId) : true
  }));
  const commands = items.flatMap((item) => item.commands);
  const readyTasks = items.filter((item) => item.preflightStatus === "ready").length;
  const heldTasks = items.filter((item) => item.preflightStatus === "held").length;
  const blockedTasks = items.filter((item) => item.preflightStatus === "blocked").length;
  const runnableCommands = commands.filter((command) => command.status !== "not-runnable").length;
  const allowedCommandCount = commands.filter((command) => command.status === "allowed").length;
  const blockedCommandCount = commands.filter((command) => command.status === "blocked").length;
  const notRunnableCommands = commands.filter((command) => command.status === "not-runnable").length;
  const unsafePaths = items.reduce((total, item) => total + unsafePathCountFor(item), 0);
  const blockedSecurityCommands = commands.filter((command) =>
    command.securityDecision === "blocked"
  ).length;

  return {
    schema: "naikaku.coding-agent-sandbox-runner-preflight.v1",
    generatedAt,
    mode: "local-sandbox-runner-preflight",
    sourceSchema: selfTest.schema,
    sourceDecision: selfTest.decision,
    sourceBundleSchema: bundle?.schema,
    sourceBundleDecision: bundle?.decision,
    decision: decisionFor({
      selfTest,
      readyTasks,
      blockedTasks,
      blockedCommands: blockedCommandCount,
      unsafePaths,
      missingBundleSessions,
      extraBundleSessions,
      blockedSecurityCommands
    }),
    runId: selfTest.runId,
    operatorLocale: selfTest.operatorLocale,
    commandAllowlist: [...commandAllowlist],
    items,
    summary: {
      total: items.length,
      readyTasks,
      heldTasks,
      blockedTasks,
      runnableCommands,
      allowedCommands: allowedCommandCount,
      blockedCommands: blockedCommandCount,
      notRunnableCommands,
      expectedProcessExecutions: uniqueAllowedRunnableCommands(items).length,
      expectedCommandResults: runnableCommands,
      receiptDraftPaths: items.filter((item) => Boolean(item.receiptDraftPath)).length,
      expectedEvidenceArtifacts: items.reduce((total, item) => total + item.expectedEvidenceArtifacts.length, 0),
      unsafePaths,
      missingBundleSessions,
      extraBundleSessions,
      blockedSecurityCommands
    },
    honestyClaim: {
      level: "local-sandbox-runner-preflight",
      claim: "This preflight checks whether the sandbox runner may execute allowlisted local verification commands; it does not execute commands or prove implementation completion.",
      limitations: [
        "It does not run a model, modify files, execute shell commands, browse, control desktops, call MCP tools, deploy, commit, push, or inspect production systems.",
        "A ready preflight means the local runner inputs are consumable, not that coding work has been completed.",
        "Real implementation acceptance still requires a reviewed receipt and verified local artifacts from a governed runner."
      ],
      productionRequirements: [
        "Use authenticated runner identity before production handoff.",
        "Attach real task-specific diffs, transcripts, and artifacts before Development Board reconciliation.",
        "Run production-mode release verification before external production claims."
      ]
    }
  };
}

export function serializeCodingAgentSandboxRunnerPreflight(report: CodingAgentSandboxRunnerPreflight) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentSandboxRunnerPreflightMarkdown(report: CodingAgentSandboxRunnerPreflight) {
  return [
    "# Coding Agent Sandbox Runner Preflight",
    "",
    `Mode: ${report.mode}`,
    `Decision: ${report.decision}`,
    `Source decision: ${report.sourceDecision}`,
    `Bundle decision: ${report.sourceBundleDecision || "not-supplied"}`,
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
    `- Ready tasks: ${report.summary.readyTasks}`,
    `- Held tasks: ${report.summary.heldTasks}`,
    `- Blocked tasks: ${report.summary.blockedTasks}`,
    `- Runnable commands: ${report.summary.runnableCommands}`,
    `- Allowed commands: ${report.summary.allowedCommands}`,
    `- Blocked commands: ${report.summary.blockedCommands}`,
    `- Expected process executions: ${report.summary.expectedProcessExecutions}`,
    `- Expected command results: ${report.summary.expectedCommandResults}`,
    `- Receipt draft paths: ${report.summary.receiptDraftPaths}`,
    `- Expected evidence artifacts: ${report.summary.expectedEvidenceArtifacts}`,
    `- Unsafe paths: ${report.summary.unsafePaths}`,
    `- Blocked security commands: ${report.summary.blockedSecurityCommands}`,
    `- Missing bundle sessions: ${report.summary.missingBundleSessions}`,
    `- Extra bundle sessions: ${report.summary.extraBundleSessions}`,
    "",
    "## Command Allowlist",
    "",
    ...report.commandAllowlist.map((command) => `- ${command}`),
    "",
    ...report.items.flatMap((item, index) => [
      `## ${index + 1}. ${item.title}`,
      "",
      `- Session: ${item.sessionId}`,
      `- Executor: ${item.executorProfileId}`,
      `- Self-test: ${item.selfTestStatus}`,
      `- Preflight: ${item.preflightStatus}`,
      `- Prompt: ${item.promptPath || "not-attached"}`,
      `- Receipt draft: ${item.receiptDraftPath || "not-attached"}`,
      `- Evidence prefix: ${item.evidenceArtifactPrefix}`,
      "",
      "### Commands",
      "",
      ...(item.commands.length ? item.commands : []).map((command) =>
        `- ${command.command} -> ${command.status}; transcript ${command.transcriptRef || "none"}; ${command.reason}`
      ),
      "",
      "### Checks",
      "",
      ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
      ""
    ])
  ].join("\n");
}

function preflightItemFor({
  item,
  allowedCommands,
  sandboxPolicy,
  bundleSessionFound
}: {
  item: CodingAgentRunnerSelfTestItem;
  allowedCommands: Set<string>;
  sandboxPolicy: SandboxPolicy;
  bundleSessionFound: boolean;
}): CodingAgentSandboxRunnerPreflightItem {
  const commands = item.commands.map((command): CodingAgentSandboxRunnerPreflightCommand => {
    if (item.selfTestStatus !== "would-run") {
      return {
        command: command.command,
        transcriptRef: command.transcriptRef,
        status: "not-runnable",
        reason: `Source self-test status is ${item.selfTestStatus}.`
      };
    }
    if (!allowedCommands.has(command.command)) {
      return {
        command: command.command,
        transcriptRef: command.transcriptRef,
        status: "blocked",
        reason: "Command is outside the local sandbox runner allowlist."
      };
    }
    const securityClassification = classifyActionImpact({
      executorProfileId: item.executorProfileId,
      action: item.executorProfileId === "shell-container" ? "run_shell" : "runner_command",
      target: `/workspace:${command.command}`,
      risk: item.executorProfileId === "shell-container" ? "high" : "medium",
      instruction: [item.title, ...item.simulatedActions].join("\n"),
      sandboxPolicy
    });
    if (securityClassification.decision === "blocked") {
      return {
        command: command.command,
        transcriptRef: command.transcriptRef,
        status: "blocked",
        reason: `Security classifier blocked command: ${securityClassification.summary}`,
        securityDecision: securityClassification.decision,
        securityFindings: securityClassification.findings.map((finding) => finding.category)
      };
    }
    return {
      command: command.command,
      transcriptRef: command.transcriptRef,
      status: "allowed",
      reason: securityClassification.decision === "needs-approval"
        ? "Command is allowlisted and remains approval/evidence-gated for local sandbox runner execution."
        : "Command is allowed for local sandbox runner execution.",
      securityDecision: securityClassification.decision,
      securityFindings: securityClassification.findings.map((finding) => finding.category)
    };
  });
  const hasBlockedCommand = commands.some((command) => command.status === "blocked");
  const blockedSecurityCommands = commands.filter((command) => command.securityDecision === "blocked").length;
  const hasUnsafePath = unsafePathCountFor({
    promptPath: item.promptPath,
    receiptDraftPath: item.receiptDraftPath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    commands,
    expectedEvidenceArtifacts: item.expectedEvidenceArtifacts
  }) > 0;
  const preflightStatus = itemStatusFor({
    selfTestStatus: item.selfTestStatus,
    hasBlockedCommand,
    hasUnsafePath,
    bundleSessionFound
  });

  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    executorProfileId: item.executorProfileId,
    selfTestStatus: item.selfTestStatus,
    preflightStatus,
    promptPath: item.promptPath,
    receiptDraftPath: item.receiptDraftPath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    commands,
    expectedEvidenceArtifacts: item.expectedEvidenceArtifacts,
    checks: [
      {
        id: "self-test-status",
        status: item.selfTestStatus === "would-run" ? "pass" : item.selfTestStatus === "held" ? "warn" : "block",
        summary: `Source self-test status is ${item.selfTestStatus}.`
      },
      {
        id: "bundle-session-match",
        status: bundleSessionFound ? "pass" : "block",
        summary: bundleSessionFound
          ? "Matching session exists in the provided bundle."
          : "Self-test item does not have a matching session in the provided bundle."
      },
      {
        id: "command-allowlist",
        status: hasBlockedCommand ? "block" : commands.some((command) => command.status === "allowed") ? "pass" : "warn",
        summary: `${commands.filter((command) => command.status === "allowed").length} allowed / ${commands.filter((command) => command.status === "blocked").length} blocked commands.`
      },
      {
        id: "security-classifier",
        status: blockedSecurityCommands === 0 ? "pass" : "block",
        summary: `${blockedSecurityCommands} command(s) blocked by the security classifier.`
      },
      {
        id: "path-safety",
        status: hasUnsafePath ? "block" : "pass",
        summary: hasUnsafePath ? "One or more artifact paths are unsafe." : "Artifact paths stay relative and scoped."
      },
      {
        id: "honesty-boundary",
        status: "pass",
        summary: "Preflight performs no command execution and cannot be used as implementation evidence."
      }
    ],
    nextAction: nextActionFor(preflightStatus, item.nextAction)
  };
}

function itemStatusFor({
  selfTestStatus,
  hasBlockedCommand,
  hasUnsafePath,
  bundleSessionFound
}: {
  selfTestStatus: CodingAgentRunnerSelfTestItem["selfTestStatus"];
  hasBlockedCommand: boolean;
  hasUnsafePath: boolean;
  bundleSessionFound: boolean;
}): CodingAgentSandboxRunnerPreflightItemStatus {
  if (!bundleSessionFound || selfTestStatus === "blocked" || hasBlockedCommand || hasUnsafePath) {
    return "blocked";
  }
  if (selfTestStatus !== "would-run") return "held";
  return "ready";
}

function decisionFor({
  selfTest,
  readyTasks,
  blockedTasks,
  blockedCommands,
  unsafePaths,
  missingBundleSessions,
  extraBundleSessions,
  blockedSecurityCommands
}: {
  selfTest: CodingAgentRunnerSelfTest;
  readyTasks: number;
  blockedTasks: number;
  blockedCommands: number;
  unsafePaths: number;
  missingBundleSessions: number;
  extraBundleSessions: number;
  blockedSecurityCommands: number;
}): CodingAgentSandboxRunnerPreflightDecision {
  if (blockedTasks > 0 || blockedCommands > 0 || blockedSecurityCommands > 0 || unsafePaths > 0 || missingBundleSessions > 0 || extraBundleSessions > 0) {
    return "blocked";
  }
  if (selfTest.decision !== "self-test-ready" || readyTasks === 0) return "needs-review";
  return "ready";
}

function nextActionFor(status: CodingAgentSandboxRunnerPreflightItemStatus, fallback: string) {
  if (status === "ready") return "Run the sandbox runner only if local gateway execution is intentional for this workspace.";
  if (status === "blocked") return "Resolve blocked commands, unsafe paths, or bundle mismatches before execution.";
  return fallback;
}

function unsafePathCountFor(item: Pick<
  CodingAgentSandboxRunnerPreflightItem,
  "promptPath" | "receiptDraftPath" | "evidenceArtifactPrefix" | "commands" | "expectedEvidenceArtifacts"
>) {
  const paths = [
    item.promptPath,
    item.receiptDraftPath,
    item.evidenceArtifactPrefix,
    ...item.commands.map((command) => command.transcriptRef),
    ...item.expectedEvidenceArtifacts.map((artifact) => artifact.path)
  ].filter((path): path is string => Boolean(path));
  return paths.filter((path) => !isSafeRelativeArtifactPath(path)).length;
}

function uniqueAllowedRunnableCommands(items: CodingAgentSandboxRunnerPreflightItem[]) {
  return [...new Set(items.flatMap((item) =>
    item.commands
      .filter((command) => command.status === "allowed")
      .map((command) => command.command)
  ))];
}
