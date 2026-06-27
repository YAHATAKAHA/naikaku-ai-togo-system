import { describe, expect, it } from "vitest";
import {
  analyzeMissionIntent,
  buildEngineeringLaunchProfile
} from "./engineeringLaunchProfile";
import type {
  CabinetRun,
  CodingAgentBriefs,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle
} from "./types";

describe("engineering launch profile", () => {
  it("keeps an empty launch in intake mode without pretending runner readiness", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "   ",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.schema).toBe("naikaku.engineering-launch-profile.v1");
    expect(profile.missionReady).toBe(false);
    expect(profile.permissionMode).toBe("code-only");
    expect(profile.stage).toBe("needs-mission");
    expect(profile.nextAction).toBe("enter-mission");
    expect(profile.signals).toContain("mission-missing");
    expect(profile.capabilities.find((capability) => capability.id === "repo-files")?.status).toBe("needed");
    expect(profile.missionDraft).toMatchObject({
      present: 0,
      missing: 3
    });
    expect(profile.missionDraft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "goal", status: "missing" }),
      expect.objectContaining({ id: "repo-target", status: "missing" }),
      expect.objectContaining({ id: "work-scope", status: "missing" })
    ]));
    expect(profile.missionTemplate.text).toContain("Mission: TODO - describe");
    expect(profile.missionTemplate.text).toContain("Repository: TODO - paste");
    expect(profile.missionTemplate.honestyClaim.claim).toContain("does not execute code");
    expect(profile.unlockChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "write-mission", status: "next" }),
      expect.objectContaining({ id: "run-cabinet", status: "waiting" })
    ]));
  });

  it("routes normal repo engineering through the code-only sandbox path", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Implement the settings panel in the GitHub repo and run npm run test.",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.permissionMode).toBe("code-only");
    expect(profile.stage).toBe("mission-ready");
    expect(profile.nextAction).toBe("run-cabinet");
    expect(profile.signals).toEqual(expect.arrayContaining([
      "mission-present",
      "repo-mentioned",
      "coding-requested",
      "verification-mentioned"
    ]));
    expect(profile.missionDraft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "goal", status: "present" }),
      expect.objectContaining({ id: "repo-target", status: "present" }),
      expect.objectContaining({ id: "work-scope", status: "present" }),
      expect.objectContaining({ id: "verification", status: "present" }),
      expect.objectContaining({ id: "approval-boundary", status: "recommended" })
    ]));
    expect(profile.missionTemplate.text).toContain("Verification: run the commands named in the mission");
    expect(profile.missionTemplate.text).toContain("Supervision: run the cabinet split first");
    expect(profile.capabilities.map((capability) => capability.id)).not.toContain("mac-accessibility");
    expect(profile.unlockChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "write-mission", status: "done" }),
      expect.objectContaining({ id: "run-cabinet", status: "next" })
    ]));
  });

  it("does not mistake ordinary product wording for pull requests or verification", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Build a sandbox-first multi-model AI cabinet that can plan, execute, critique, supervise, score, and iterate product work with separate role APIs.",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.permissionMode).toBe("code-only");
    expect(profile.signals).not.toContain("external-write-requested");
    expect(profile.signals).not.toContain("verification-mentioned");
    expect(profile.nextAction).toBe("run-cabinet");
  });

  it("marks high-impact external writes incomplete without an approval boundary", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Update the GitHub repo code and push the branch after changing files.",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.permissionMode).toBe("approval-gated");
    expect(profile.missionDraft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approval-boundary", status: "missing" }),
      expect.objectContaining({ id: "evidence", status: "missing" })
    ]));
    expect(profile.missionTemplate.text).toContain("Approval boundary: TODO - approve or remove");
    expect(profile.missionTemplate.text).toContain("Evidence: TODO - require changed files");
    expect(profile.missionDraft.missing).toBeGreaterThanOrEqual(2);

    const shapedProfile = buildEngineeringLaunchProfile({
      mission: profile.missionTemplate.text,
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    expect(shapedProfile.signals).not.toContain("secrets-risk");
  });

  it("requires explicit Mac permissions when a mission asks for computer control", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "参考 OpenClaw 和 Hammerspoon，在 Mac 上做基础电脑控制、看屏幕、点击和键盘操作。",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.permissionMode).toBe("mac-assisted");
    expect(profile.signals).toContain("mac-control-requested");
    expect(profile.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "mac-accessibility", status: "approval-required" }),
      expect.objectContaining({ id: "mac-screen-recording", status: "approval-required" }),
      expect.objectContaining({ id: "browser-profile", status: "approval-required" })
    ]));
    expect(profile.missionTemplate.text).toContain("macOS Accessibility");
    expect(profile.missionTemplate.text).toContain("Screen Recording");
    expect(profile.unlockChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approve-browser-profile", status: "approval" }),
      expect.objectContaining({ id: "approve-mac-desktop", status: "approval", count: 2 })
    ]));
  });

  it("keeps external writes approval-gated even after runner inputs are ready", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Create the engineering issues, push the branch to GitHub, and deploy after tests pass.",
      activeRoles: 8,
      run: {} as CabinetRun,
      briefs: briefSummary(8, 8),
      sessionBundle: sessionSummary(8, 0),
      runnerManifest: runnerManifestSummary(8, 24),
      runnerSelfTest: selfTest("self-test-ready"),
      sandboxRunnerPreflight: preflight("ready"),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.permissionMode).toBe("approval-gated");
    expect(profile.stage).toBe("sandbox-ready");
    expect(profile.nextAction).toBe("request-approval");
    expect(profile.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "human-approval", status: "approval-required" }),
      expect.objectContaining({ id: "external-write-approval", status: "approval-required" })
    ]));
    expect(profile.missionDraft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approval-boundary", status: "missing" }),
      expect.objectContaining({ id: "verification", status: "present" }),
      expect.objectContaining({ id: "evidence", status: "present" })
    ]));
    expect(profile.missionTemplate.text).toContain("Approval boundary: TODO - approve or remove");
    expect(profile.unlockChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approve-external-writes", status: "approval", count: 2 }),
      expect.objectContaining({ id: "run-local-sandbox", status: "approval" })
    ]));
  });

  it("explains held sessions instead of offering direct execution", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "参考 OpenClaw 和 Hammerspoon，为 Mac 版做基础电脑控制，同时准备 GitHub issue 和 push，但必须人审。",
      activeRoles: 8,
      run: {} as CabinetRun,
      briefs: briefSummary(12, 10),
      sessionBundle: sessionSummary(0, 12),
      runnerManifest: runnerManifestSummary(0, 24, "needs-review"),
      runnerSelfTest: selfTest("needs-review"),
      sandboxRunnerPreflight: preflight("needs-review"),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.stage).toBe("needs-review");
    expect(profile.nextAction).toBe("review-evidence");
    expect(profile.unlockChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "review-held-sessions", status: "waiting", count: 12 }),
      expect.objectContaining({ id: "approve-mac-desktop", status: "approval", count: 2 }),
      expect.objectContaining({ id: "approve-external-writes", status: "approval", count: 2 }),
      expect.objectContaining({ id: "run-local-sandbox", status: "waiting" })
    ]));
    expect(profile.missionTemplate.text).toContain("external writes such as Git push");
  });

  it("moves to evidence review only when the sandbox runner report is verified", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Implement code in the repo and verify with npm run build.",
      activeRoles: 8,
      run: {} as CabinetRun,
      briefs: briefSummary(8, 8),
      sessionBundle: sessionSummary(8, 0),
      runnerManifest: runnerManifestSummary(8, 24),
      runnerSelfTest: selfTest("self-test-ready"),
      sandboxRunnerPreflight: preflight("ready"),
      sandboxRunnerReport: sandboxReport("sandbox-runner-verified"),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(profile.stage).toBe("evidence-review");
    expect(profile.nextAction).toBe("review-evidence");
    expect(profile.signals).toEqual(expect.arrayContaining([
      "runner-pack-ready",
      "preflight-ready",
      "evidence-ready"
    ]));
    expect(profile.supervisorPlan).toMatchObject({
      activeRoles: 8,
      briefs: 8,
      implementableBriefs: 8,
      readySessions: 8,
      runnerTasks: 8,
      expectedEvidenceArtifacts: 24
    });
    expect(profile.unlockChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "run-local-sandbox", status: "done" }),
      expect.objectContaining({ id: "review-evidence", status: "next", count: 24 })
    ]));
  });

  it("detects multilingual task intent without needing a model call", () => {
    const intent = analyzeMissionIntent("Mac版でブラウザを開いて、仓库の代码を测试し、GitHub issue は承認後に作成。");

    expect(intent.missionReady).toBe(true);
    expect(intent.wantsMacControl).toBe(true);
    expect(intent.wantsBrowser).toBe(true);
    expect(intent.mentionsRepo).toBe(true);
    expect(intent.wantsCoding).toBe(true);
    expect(intent.mentionsVerification).toBe(true);
    expect(intent.wantsExternalWrite).toBe(true);
  });
});

function briefSummary(total: number, implementable: number) {
  return {
    schema: "naikaku.coding-agent-briefs.v1",
    summary: {
      total,
      implementable,
      blocked: 0,
      humanReview: 0,
      highPriority: 0,
      productionEvidenceRequired: false
    }
  } as CodingAgentBriefs;
}

function sessionSummary(ready: number, held: number) {
  return {
    schema: "naikaku.coding-agent-session-bundle.v1",
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

function runnerManifestSummary(
  runnerTasks: number,
  expectedEvidenceArtifacts: number,
  decision: CodingAgentRunnerManifest["decision"] = "runner-ready"
) {
  return {
    schema: "naikaku.coding-agent-runner-manifest.v1",
    decision,
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

function selfTest(decision: CodingAgentRunnerSelfTest["decision"]) {
  return {
    schema: "naikaku.coding-agent-runner-self-test.v1",
    decision,
    summary: {
      total: 8,
      wouldRun: decision === "self-test-ready" ? 8 : 0,
      held: 0,
      blocked: 0,
      readyRunnerTasks: 8,
      simulatedActions: 16,
      pendingCommands: 16,
      notExecutedCommands: 16,
      expectedEvidenceArtifacts: 24,
      receiptDraftPaths: 8,
      unsafePaths: 0,
      stopConditions: 24
    }
  } as CodingAgentRunnerSelfTest;
}

function preflight(decision: CodingAgentSandboxRunnerPreflight["decision"]) {
  return {
    schema: "naikaku.coding-agent-sandbox-runner-preflight.v1",
    decision,
    summary: {
      total: 8,
      readyTasks: decision === "ready" ? 8 : 0,
      heldTasks: 0,
      blockedTasks: decision === "blocked" ? 8 : 0,
      runnableCommands: 16,
      allowedCommands: decision === "ready" ? 16 : 0,
      blockedCommands: decision === "blocked" ? 16 : 0,
      notRunnableCommands: 0,
      expectedProcessExecutions: 2,
      expectedCommandResults: 16,
      receiptDraftPaths: 8,
      expectedEvidenceArtifacts: 24,
      unsafePaths: 0,
      missingBundleSessions: 0,
      extraBundleSessions: 0,
      blockedSecurityCommands: 0
    }
  } as CodingAgentSandboxRunnerPreflight;
}

function sandboxReport(decision: CodingAgentSandboxRunnerReport["decision"]) {
  return {
    schema: "naikaku.coding-agent-sandbox-runner.v1",
    decision,
    summary: {
      total: 8,
      executedTasks: decision === "sandbox-runner-verified" ? 8 : 0,
      heldTasks: 0,
      blockedTasks: 0,
      commandResults: 16,
      processExecutions: 2,
      failedCommands: 0,
      blockedCommands: 0,
      transcriptFilesWritten: 16,
      changedFileSummaries: 8,
      evidenceArtifacts: 24,
      unsafePaths: 0
    }
  } as CodingAgentSandboxRunnerReport;
}
