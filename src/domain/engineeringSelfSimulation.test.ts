import { describe, expect, it } from "vitest";
import { buildEngineeringLaunchProfile } from "./engineeringLaunchProfile";
import { buildEngineeringSelfSimulationReport } from "./engineeringSelfSimulation";
import type {
  CodingAgentBriefs,
  CodingAgentDispatchSimulation,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle
} from "./types";

describe("engineering self simulation", () => {
  it("does not treat an empty mission as simulated engineering readiness", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: " ",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const report = buildEngineeringSelfSimulationReport({
      profile,
      briefs: briefs(0, 0),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.schema).toBe("naikaku.engineering-self-simulation.v1");
    expect(report.decision).toBe("needs-mission");
    expect(report.summary.simulatedOnly).toBe(true);
    expect(report.handoffReceipt).toMatchObject({
      decision: "not-ready",
      canHandOffToCodingAgent: false,
      canRunLocalSandbox: false
    });
    expect(report.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "mission", status: "block" })
    ]));
    expect(report.honestyClaim.claim).toContain("without executing implementation work");
  });

  it("summarizes a fully prepared local runner path as simulated-ready without claiming execution", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Implement code in the GitHub repo and verify with npm run test.",
      activeRoles: 8,
      runnerManifest: runnerManifest(4, 12),
      runnerSelfTest: selfTest("self-test-ready", 4, 8, 12),
      sandboxRunnerPreflight: preflight("ready", 4, 8, 0, 12),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const report = buildEngineeringSelfSimulationReport({
      profile,
      briefs: briefs(4, 4),
      sessionBundle: sessionBundle(4, 0),
      dispatchSimulation: dispatchSimulation(4, 0, 0),
      runnerManifest: runnerManifest(4, 12),
      runnerSelfTest: selfTest("self-test-ready", 4, 8, 12),
      sandboxRunnerPreflight: preflight("ready", 4, 8, 0, 12),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.decision).toBe("simulated-ready");
    expect(report.summary).toMatchObject({
      briefs: 4,
      implementableBriefs: 4,
      readySessions: 4,
      runnerTasks: 4,
      wouldRunTasks: 4,
      allowedCommands: 8,
      blockedCommands: 0,
      notExecutedCommands: 8,
      expectedEvidenceArtifacts: 12
    });
    expect(report.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "code-writing", status: "ready" }),
      expect.objectContaining({ id: "allowlisted-shell", status: "ready" }),
      expect.objectContaining({ id: "external-writes", status: "not-requested" })
    ]));
    expect(report.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "preflight", status: "pass" }),
      expect.objectContaining({ id: "evidence", status: "waiting" })
    ]));
    expect(report.completionGate).toMatchObject({
      decision: "simulation-only",
      canClaimCompletion: false,
      canClaimCodeChanged: false,
      canClaimExternalWrite: false
    });
    expect(report.completionGate.blockedClaims).toContain("Do not claim implementation is complete.");
    expect(report.handoffReceipt).toMatchObject({
      decision: "agent-pack-ready",
      canHandOffToCodingAgent: true,
      canRunLocalSandbox: true,
      packet: expect.objectContaining({
        briefs: 4,
        readySessions: 4,
        runnerTasks: 4,
        allowedCommands: 8,
        expectedEvidenceArtifacts: 12,
        approvalItems: 0
      })
    });
    expect(report.handoffReceipt.lanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "coding-agent", status: "ready" }),
      expect.objectContaining({ id: "runner", status: "ready" }),
      expect.objectContaining({ id: "approval", status: "ready" }),
      expect.objectContaining({ id: "evidence", status: "waiting" })
    ]));
    expect(report.permissionRequest).toMatchObject({
      decision: "ready",
      requests: expect.arrayContaining([
        expect.objectContaining({ id: "repo-files", mode: "default-local" }),
        expect.objectContaining({ id: "allowlisted-shell", mode: "default-local" })
      ])
    });
    expect(report.capabilityGap).toMatchObject({
      decision: "agent-ready",
      canPrepareEngineering: true,
      canExecuteCodeLocally: true,
      canControlMacDesktop: false
    });
    expect(report.capabilityGap.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "supervised-coding", status: "ready" }),
      expect.objectContaining({ id: "local-shell", status: "ready" }),
      expect.objectContaining({ id: "mac-desktop-control", status: "missing" })
    ]));
    expect(report.honestyClaim.limitations.join(" ")).toContain("not proof that code has been changed");
  });

  it("allows completion claims only when verified runner evidence is attached", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Implement code in the GitHub repo, run tests, and collect evidence.",
      activeRoles: 8,
      sandboxRunnerReport: sandboxReport("sandbox-runner-verified", {
        changedFileSummaries: 4,
        transcriptFilesWritten: 8,
        evidenceArtifacts: 12,
        commandResults: 8,
        failedCommands: 0,
        blockedCommands: 0
      }),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const report = buildEngineeringSelfSimulationReport({
      profile,
      briefs: briefs(4, 4),
      sandboxRunnerReport: sandboxReport("sandbox-runner-verified", {
        changedFileSummaries: 4,
        transcriptFilesWritten: 8,
        evidenceArtifacts: 12,
        commandResults: 8,
        failedCommands: 0,
        blockedCommands: 0
      }),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.completionGate).toMatchObject({
      decision: "evidence-ready",
      canClaimCompletion: true,
      canClaimCodeChanged: true,
      canClaimExternalWrite: true
    });
    expect(report.handoffReceipt.decision).toBe("evidence-review");
    expect(report.handoffReceipt.lanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "evidence", status: "ready" })
    ]));
    expect(report.completionGate.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "real-run-report", status: "pass" }),
      expect.objectContaining({ id: "changed-files", status: "pass" }),
      expect.objectContaining({ id: "command-transcripts", status: "pass" }),
      expect.objectContaining({ id: "evidence-artifacts", status: "pass" }),
      expect.objectContaining({ id: "command-results", status: "pass" })
    ]));
    expect(report.completionGate.blockedClaims).toEqual([]);
  });

  it("keeps Mac control and push scenarios approval-gated during self simulation", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "参考 OpenClaw 和 Hammerspoon，为 Mac 版做基础电脑控制，并 push GitHub 分支，但必须人工审核。",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const report = buildEngineeringSelfSimulationReport({
      profile,
      briefs: briefs(3, 3),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.decision).toBe("approval-required");
    expect(report.summary.approvalItems).toBeGreaterThanOrEqual(4);
    expect(report.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "browser-assist", status: "approval-required" }),
      expect.objectContaining({ id: "mac-desktop", status: "approval-required" }),
      expect.objectContaining({ id: "external-writes", status: "approval-required" })
    ]));
    expect(report.handoffReceipt.decision).toBe("approval-gated");
    expect(report.handoffReceipt.packet.approvalItems).toBeGreaterThanOrEqual(4);
    expect(report.permissionRequest.decision).toBe("approval-required");
    expect(report.permissionRequest.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "browser-profile", mode: "ask-before-use" }),
      expect.objectContaining({ id: "mac-accessibility", mode: "ask-before-use" }),
      expect.objectContaining({ id: "mac-screen-recording", mode: "ask-before-use" }),
      expect.objectContaining({ id: "external-write-approval", mode: "ask-before-use" })
    ]));
    expect(report.permissionRequest.defaultDenied.join(" ")).toContain("Unbounded computer control");
    expect(report.permissionRequest.defaultDenied.join(" ")).toContain("Git push");
    expect(report.capabilityGap).toMatchObject({
      decision: "runtime-needed",
      canControlMacDesktop: false
    });
    expect(report.capabilityGap.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "mac-desktop-control", status: "approval-required" }),
      expect.objectContaining({ id: "external-writes", status: "approval-required" })
    ]));
    expect(report.capabilityGap.honestComparison).toContain("not yet equivalent");
    expect(report.nextActions.join(" ")).toContain("Approve or remove gated");
  });

  it("keeps external-write claims gated even with implementation evidence", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "为 Mac 版做基础电脑控制，生成证据，然后准备 push GitHub，但 push 必须人工审核。",
      activeRoles: 8,
      sandboxRunnerReport: sandboxReport("sandbox-runner-verified", {
        changedFileSummaries: 3,
        transcriptFilesWritten: 6,
        evidenceArtifacts: 9,
        commandResults: 6,
        failedCommands: 0,
        blockedCommands: 0
      }),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const report = buildEngineeringSelfSimulationReport({
      profile,
      briefs: briefs(3, 3),
      sandboxRunnerReport: sandboxReport("sandbox-runner-verified", {
        changedFileSummaries: 3,
        transcriptFilesWritten: 6,
        evidenceArtifacts: 9,
        commandResults: 6,
        failedCommands: 0,
        blockedCommands: 0
      }),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.completionGate).toMatchObject({
      decision: "evidence-ready",
      canClaimCompletion: true,
      canClaimCodeChanged: true,
      canClaimExternalWrite: false
    });
    expect(report.completionGate.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approval-boundary", status: "warn" })
    ]));
    expect(report.handoffReceipt.decision).toBe("evidence-review");
    expect(report.handoffReceipt.lanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approval", status: "approval-required" })
    ]));
    expect(report.completionGate.blockedClaims).toContain(
      "Do not claim Git push/deploy/external send is approved."
    );
  });
});

function briefs(total: number, implementable: number) {
  return {
    schema: "naikaku.coding-agent-briefs.v1",
    generatedAt: "2026-06-27T00:00:00.000Z",
    mission: "Test mission",
    operatorLocale: "ja",
    developmentBoardSchema: "naikaku.development-board.v1",
    briefs: Array.from({ length: total }, (_, index) => ({
      id: `brief-${index + 1}`,
      mode: index < implementable ? "implement" : "blocked-review"
    })),
    summary: {
      total,
      implementable,
      blocked: total - implementable,
      humanReview: 0,
      highPriority: 0,
      productionEvidenceRequired: false
    }
  } as CodingAgentBriefs;
}

function sessionBundle(ready: number, held: number) {
  return {
    schema: "naikaku.coding-agent-session-bundle.v1",
    decision: held > 0 ? "needs-review" : "ready",
    summary: {
      total: ready + held,
      ready,
      held,
      humanApproval: 0,
      productionHeld: 0,
      verificationCommands: 2,
      evidenceItems: 4
    }
  } as CodingAgentSessionBundle;
}

function dispatchSimulation(readyForAgent: number, held: number, blocked: number) {
  return {
    schema: "naikaku.coding-agent-dispatch-simulation.v1",
    decision: blocked > 0 ? "blocked" : held > 0 ? "needs-review" : "ready-for-real-agent",
    summary: {
      total: readyForAgent + held + blocked,
      readyForAgent,
      held,
      blocked,
      plannedCommands: readyForAgent * 2,
      expectedEvidenceArtifacts: readyForAgent * 3,
      receiptDraftItems: readyForAgent,
      unsafePaths: 0,
      archiveAuditBlockers: 0,
      archiveAuditWarnings: 0
    }
  } as CodingAgentDispatchSimulation;
}

function runnerManifest(runnerTasks: number, expectedEvidenceArtifacts: number) {
  return {
    schema: "naikaku.coding-agent-runner-manifest.v1",
    decision: "runner-ready",
    summary: {
      total: runnerTasks,
      readyTasks: runnerTasks,
      heldTasks: 0,
      blockedTasks: 0,
      runnerTasks,
      plannedCommands: runnerTasks * 2,
      expectedEvidenceArtifacts,
      receiptDraftPaths: runnerTasks,
      unsafePaths: 0,
      stopConditions: runnerTasks * 3
    }
  } as CodingAgentRunnerManifest;
}

function selfTest(
  decision: CodingAgentRunnerSelfTest["decision"],
  wouldRun: number,
  notExecutedCommands: number,
  expectedEvidenceArtifacts: number
) {
  return {
    schema: "naikaku.coding-agent-runner-self-test.v1",
    decision,
    summary: {
      total: wouldRun,
      wouldRun,
      held: 0,
      blocked: decision === "blocked" ? wouldRun : 0,
      readyRunnerTasks: wouldRun,
      simulatedActions: wouldRun * 4,
      pendingCommands: notExecutedCommands,
      notExecutedCommands,
      expectedEvidenceArtifacts,
      receiptDraftPaths: wouldRun,
      unsafePaths: 0,
      stopConditions: wouldRun * 3
    }
  } as CodingAgentRunnerSelfTest;
}

function preflight(
  decision: CodingAgentSandboxRunnerPreflight["decision"],
  readyTasks: number,
  allowedCommands: number,
  blockedCommands: number,
  expectedEvidenceArtifacts: number
) {
  return {
    schema: "naikaku.coding-agent-sandbox-runner-preflight.v1",
    decision,
    summary: {
      total: readyTasks,
      readyTasks,
      heldTasks: decision === "needs-review" ? readyTasks : 0,
      blockedTasks: decision === "blocked" ? readyTasks : 0,
      runnableCommands: allowedCommands + blockedCommands,
      allowedCommands,
      blockedCommands,
      notRunnableCommands: 0,
      expectedProcessExecutions: allowedCommands > 0 ? 2 : 0,
      expectedCommandResults: allowedCommands + blockedCommands,
      receiptDraftPaths: readyTasks,
      expectedEvidenceArtifacts,
      unsafePaths: 0,
      missingBundleSessions: 0,
      extraBundleSessions: 0,
      blockedSecurityCommands: 0
    }
  } as CodingAgentSandboxRunnerPreflight;
}

function sandboxReport(
  decision: CodingAgentSandboxRunnerReport["decision"],
  summary: Partial<CodingAgentSandboxRunnerReport["summary"]> = {}
) {
  return {
    schema: "naikaku.coding-agent-sandbox-runner.v1",
    decision,
    summary: {
      total: 4,
      executedTasks: decision === "sandbox-runner-verified" ? 4 : 0,
      heldTasks: decision === "needs-review" ? 4 : 0,
      blockedTasks: decision === "blocked" ? 4 : 0,
      commandResults: 0,
      processExecutions: 0,
      failedCommands: 0,
      blockedCommands: 0,
      transcriptFilesWritten: 0,
      changedFileSummaries: 0,
      evidenceArtifacts: 0,
      unsafePaths: 0,
      ...summary
    }
  } as CodingAgentSandboxRunnerReport;
}
