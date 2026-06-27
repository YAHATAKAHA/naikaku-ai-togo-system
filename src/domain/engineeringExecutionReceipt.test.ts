import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { auditCodingAgentImplementationArtifacts } from "./codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "./codingAgentImplementationEvidence";
import { reconcileCodingAgentImplementationEvidence } from "./codingAgentImplementationReconciliation";
import { buildCodingAgentRunnerIntakeAudit } from "./codingAgentRunnerIntakeAudit";
import { buildCodingAgentRunnerInvocationPackage } from "./codingAgentRunnerInvocation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "./codingAgentRunnerSelfTest";
import { buildCodingAgentSandboxRunnerPreflight } from "./codingAgentSandboxRunnerPreflight";
import { reviewCodingAgentSessionReceipt } from "./codingAgentSessionReceipt";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import {
  buildEngineeringExecutionReceipt,
  serializeEngineeringExecutionReceipt,
  serializeEngineeringExecutionReceiptMarkdown
} from "./engineeringExecutionReceipt";
import { buildEngineeringLaunchQueue } from "./engineeringLaunchQueue";
import { buildTeamHandoff } from "./teamPackages";
import type {
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt
} from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("engineering execution receipt", () => {
  it("keeps a ready launch queue in not-started state until runner evidence is attached", () => {
    const chain = preparedRunnerChain();
    const receipt = buildEngineeringExecutionReceipt({
      launchQueue: chain.launchQueue,
      generatedAt: chain.launchQueue.generatedAt
    });

    expect(receipt.decision).toBe("not-started");
    expect(receipt.canClaimLocalRun).toBe(false);
    expect(receipt.canClaimCodeChanged).toBe(false);
    expect(receipt.canClaimCompletion).toBe(false);
    expect(receipt.summary.queueItems).toBe(chain.launchQueue.summary.total);
    expect(receipt.blockedClaims).toContain("Do not claim implementation is complete.");
  });

  it("accepts completion only when receipt, evidence, artifacts, and runner report are verified", () => {
    const chain = preparedRunnerChain();
    const submittedReceipt = completedReceiptFor(chain.sessionBundle);
    const receiptReview = reviewCodingAgentSessionReceipt({
      bundle: chain.sessionBundle,
      receipt: submittedReceipt,
      generatedAt: submittedReceipt.generatedAt
    });
    const evidence = buildCodingAgentImplementationEvidence({
      receipt: receiptReview,
      generatedAt: receiptReview.generatedAt
    });
    const artifactAudit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: () => ({ exists: true, bytes: 128 })
    });
    const reconciliation = reconcileCodingAgentImplementationEvidence({
      evidence,
      artifactAudit,
      items: chain.board.items,
      generatedAt: artifactAudit.generatedAt
    }).reconciliation;
    const sandboxRunnerReport = sandboxRunnerReportFor(receiptReview);
    const executionReceipt = buildEngineeringExecutionReceipt({
      launchQueue: chain.launchQueue,
      sandboxRunnerReport,
      sessionReceipt: receiptReview,
      implementationEvidence: evidence,
      artifactAudit,
      reconciliation,
      generatedAt: artifactAudit.generatedAt
    });

    expect(receiptReview.decision).toBe("verified");
    expect(evidence.decision).toBe("accepted-for-handoff");
    expect(artifactAudit.decision).toBe("verified");
    expect(executionReceipt.decision).toBe("accepted");
    expect(executionReceipt.canClaimLocalRun).toBe(true);
    expect(executionReceipt.canClaimCodeChanged).toBe(true);
    expect(executionReceipt.canClaimCompletion).toBe(true);
    expect(executionReceipt.canUpdateBoard).toBe(true);
    expect(executionReceipt.summary.verifiedReceipts).toBe(chain.sessionBundle.summary.ready);
    expect(executionReceipt.items.every((item) => item.status === "accepted")).toBe(true);
  });

  it("serializes JSON and Markdown with blocked claims", () => {
    const report = buildEngineeringExecutionReceipt({
      launchQueue: preparedRunnerChain().launchQueue
    });
    const parsed = JSON.parse(serializeEngineeringExecutionReceipt(report));
    const markdown = serializeEngineeringExecutionReceiptMarkdown(report);

    expect(parsed.schema).toBe("naikaku.engineering-execution-receipt.v1");
    expect(markdown).toContain("Engineering Execution Receipt");
    expect(markdown).toContain("Can claim completion: no");
    expect(markdown).toContain("Do not claim implementation is complete.");
  });
});

function preparedRunnerChain() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  const briefs = buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
  const sessionBundle = buildCodingAgentSessionBundle({
    briefs,
    generatedAt: briefs.generatedAt
  });
  const drill = buildCodingAgentSessionDrill({
    bundle: sessionBundle,
    generatedAt: sessionBundle.generatedAt
  });
  const manifest = buildCodingAgentDispatchManifest({
    bundle: sessionBundle,
    drill,
    generatedAt: sessionBundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle: sessionBundle,
    manifest,
    generatedAt: manifest.generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: manifest.generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest,
    archiveAudit,
    generatedAt: manifest.generatedAt
  });
  const runnerManifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: Object.fromEntries(simulation.items.map((item, index) => [
      item.sessionId,
      `output/coding-agent-dispatch-simulation/valid/receipt-drafts/${String(index + 1).padStart(2, "0")}-${item.sessionId}.json`
    ])),
    generatedAt: simulation.generatedAt
  });
  const runnerInvocation = buildCodingAgentRunnerInvocationPackage({
    manifest: runnerManifest,
    invocationBasePath: "output/coding-agent-runner-invocation/valid/invocations",
    generatedAt: runnerManifest.generatedAt
  });
  const runnerIntake = buildCodingAgentRunnerIntakeAudit({
    invocationPackage: runnerInvocation,
    sandboxPolicy: defaultSandboxPolicy,
    generatedAt: runnerInvocation.generatedAt
  });
  const runnerSelfTest = buildCodingAgentRunnerSelfTest({
    manifest: runnerManifest,
    generatedAt: runnerManifest.generatedAt
  });
  const sandboxRunnerPreflight = buildCodingAgentSandboxRunnerPreflight({
    selfTest: runnerSelfTest,
    bundle: sessionBundle,
    sandboxPolicy: defaultSandboxPolicy,
    generatedAt: runnerSelfTest.generatedAt
  });
  const launchQueue = buildEngineeringLaunchQueue({
    runnerManifest,
    runnerInvocation,
    runnerIntake,
    runnerSelfTest,
    sandboxRunnerPreflight,
    generatedAt: sandboxRunnerPreflight.generatedAt
  });

  return {
    board,
    sessionBundle,
    launchQueue
  };
}

function completedReceiptFor(bundle: CodingAgentSessionBundle): CodingAgentSessionReceipt {
  return {
    schema: "naikaku.coding-agent-session-receipt.v1",
    generatedAt: bundle.generatedAt,
    mode: "evidence-review",
    sourceSchema: bundle.schema,
    bundleDecision: bundle.decision,
    decision: "needs-evidence",
    runId: bundle.runId,
    operatorLocale: bundle.operatorLocale,
    items: bundle.sessions.map((session, sessionIndex) => {
      const prefix = session.sandboxContract.evidenceArtifactPrefix;
      return {
        sessionId: session.id,
        briefId: session.briefId,
        sourceItemId: session.sourceItemId,
        title: session.title,
        sessionStatus: session.status,
        receiptStatus: "pending-evidence",
        changedFiles: [`src/runner-output-${sessionIndex + 1}.ts`],
        commandResults: session.verificationCommands.map((command, index) => ({
          command,
          exitCode: 0,
          outputSummary: `${command} passed in local sandbox.`,
          transcriptRef: `${prefix}transcript-${index + 1}.log`
        })),
        evidence: session.evidenceRequired.map((required, index) =>
          `${required}: ${prefix}evidence-${index + 1}.md`
        ),
        risks: ["No remaining risk after local sandbox verification."],
        missing: [],
        nextAction: "Review submitted evidence."
      };
    }),
    honestyClaim: {
      level: "submitted-evidence-review",
      claim: "Submitted fixture receipt for tests.",
      limitations: [],
      productionRequirements: []
    },
    summary: {
      total: 0,
      verified: 0,
      pendingEvidence: 0,
      failed: 0,
      held: 0,
      changedFiles: 0,
      commandResults: 0,
      evidenceItems: 0,
      risks: 0
    }
  };
}

function sandboxRunnerReportFor(receipt: CodingAgentSessionReceipt): CodingAgentSandboxRunnerReport {
  const items = receipt.items.map((item) => ({
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId || item.sessionId,
    title: item.title,
    executorProfileId: "shell-container" as const,
    selfTestStatus: "would-run" as const,
    runStatus: "executed" as const,
    promptPath: `output/coding-agent/${item.sessionId}/prompt.md`,
    receiptDraftPath: `output/coding-agent/${item.sessionId}/receipt.json`,
    evidenceArtifactPrefix: `output/coding-agent/${item.sessionId}/`,
    changedFileSummaryPath: item.changedFiles[0] || null,
    commandResults: item.commandResults.map((result) => ({
      ...result,
      status: "executed" as const,
      durationMs: 10
    })),
    evidence: item.evidence,
    risks: item.risks,
    checks: [
      {
        id: "fixture",
        status: "pass" as const,
        summary: "Fixture runner report for execution receipt tests."
      }
    ],
    nextAction: "Review receipt."
  }));

  return {
    schema: "naikaku.coding-agent-sandbox-runner.v1",
    generatedAt: receipt.generatedAt,
    mode: "local-sandbox-runner-drill",
    sourceSchema: "naikaku.coding-agent-runner-self-test.v1",
    sourceDecision: "self-test-ready",
    decision: "sandbox-runner-verified",
    runId: receipt.runId,
    operatorLocale: receipt.operatorLocale,
    items,
    summary: {
      total: items.length,
      executedTasks: items.length,
      heldTasks: 0,
      blockedTasks: 0,
      commandResults: items.reduce((total, item) => total + item.commandResults.length, 0),
      processExecutions: items.reduce((total, item) => total + item.commandResults.length, 0),
      failedCommands: 0,
      blockedCommands: 0,
      transcriptFilesWritten: items.reduce((total, item) => total + item.commandResults.length, 0),
      changedFileSummaries: items.length,
      evidenceArtifacts: items.reduce((total, item) => total + item.evidence.length, 0),
      unsafePaths: 0
    },
    honestyClaim: {
      level: "local-sandbox-runner-drill",
      claim: "Fixture runner report.",
      limitations: [],
      productionRequirements: []
    }
  };
}
