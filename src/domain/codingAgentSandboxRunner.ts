import type {
  CodingAgentSandboxRunnerReport,
  CodingAgentSandboxRunnerResult
} from "./types";

export function serializeCodingAgentSandboxRunnerReport(report: CodingAgentSandboxRunnerReport) {
  return JSON.stringify(report, null, 2);
}

export function serializeCodingAgentSandboxRunnerReportMarkdown(report: CodingAgentSandboxRunnerReport) {
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
    `- Blocked commands: ${report.summary.blockedCommands}`,
    `- Transcript files: ${report.summary.transcriptFilesWritten}`,
    `- Changed-file summaries: ${report.summary.changedFileSummaries}`,
    `- Evidence artifacts: ${report.summary.evidenceArtifacts}`,
    `- Unsafe paths: ${report.summary.unsafePaths}`,
    "",
    ...report.items.flatMap((item, index) => [
      `## ${index + 1}. ${item.title}`,
      "",
      `- Session: ${item.sessionId}`,
      `- Executor: ${item.executorProfileId}`,
      `- Self-test: ${item.selfTestStatus}`,
      `- Run status: ${item.runStatus}`,
      `- Prompt: ${item.promptPath || "not-attached"}`,
      `- Receipt draft: ${item.receiptDraftPath || "not-attached"}`,
      `- Changed-file summary: ${item.changedFileSummaryPath || "not-written"}`,
      "",
      "### Commands",
      "",
      ...(item.commandResults.length ? item.commandResults : []).map((command) =>
        `- ${command.command} -> ${command.status}; exit ${command.exitCode}; transcript ${command.transcriptRef || "none"}`
      ),
      "",
      "### Evidence",
      "",
      ...(item.evidence.length ? item.evidence : ["none"]).map((evidence) => `- ${evidence}`),
      "",
      "### Risks",
      "",
      ...(item.risks.length ? item.risks : ["none"]).map((risk) => `- ${risk}`),
      "",
      "### Checks",
      "",
      ...item.checks.map((check) => `- ${check.status}: ${check.id} - ${check.summary}`),
      ""
    ])
  ].join("\n");
}

export function serializeCodingAgentSandboxRunnerResult(result: CodingAgentSandboxRunnerResult) {
  return JSON.stringify(result, null, 2);
}
