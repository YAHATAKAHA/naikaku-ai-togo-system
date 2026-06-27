import { describe, expect, it } from "vitest";
import type {
  ExecutorEvidenceBundle,
  ExecutorHandoff,
  ExecutorProfileId
} from "../src/domain/types";
import { evaluateRunnerAuth } from "./runnerAuth";
import {
  deniedExecutorProfilesForRunner,
  runnerCanAccessExecutorProfiles,
  runnerScopePayload,
  scopeEvidenceBundleForRunner,
  scopeExecutorHandoffForRunner
} from "./runnerScope";

describe("runner scope", () => {
  it("filters executor handoff actions to the authenticated runner profile", () => {
    const auth = scopedShellRunnerAuth();
    const handoff = mixedHandoff();
    const scoped = scopeExecutorHandoffForRunner(handoff, auth);

    expect(scoped.readyActions.map((action) => action.executorProfileId)).toEqual(["shell-container"]);
    expect(scoped.heldActions).toHaveLength(2);
    expect(scoped.heldActions.map((action) => action.executorProfileId)).toEqual([
      "browser-sandbox",
      "desktop-vm"
    ]);
    expect(scoped.heldActions.every((action) =>
      action.auditTags.includes("runner-scope-held") &&
      action.auditTags.includes("shell-runner-01")
    )).toBe(true);
    expect(runnerCanAccessExecutorProfiles(auth, ["shell-container"])).toBe(true);
    expect(runnerCanAccessExecutorProfiles(auth, ["shell-container", "browser-sandbox"])).toBe(false);
    expect(deniedExecutorProfilesForRunner(auth, ["shell-container", "browser-sandbox"])).toEqual(["browser-sandbox"]);
  });

  it("filters evidence bundles to the authenticated runner profile", () => {
    const auth = scopedShellRunnerAuth();
    const bundle = mixedEvidenceBundle();
    const scoped = scopeEvidenceBundleForRunner(bundle, auth);

    expect(scoped.steps).toHaveLength(1);
    expect(scoped.steps[0].executorProfileId).toBe("shell-container");
    expect(scoped.summary).toEqual({
      steps: 1,
      evidenceItems: 1,
      replayableSteps: 1
    });
    expect(runnerScopePayload(auth)).toEqual({
      allExecutorProfiles: false,
      allowedExecutorProfiles: ["shell-container"],
      tokenFingerprint: expect.stringMatching(/^sha256:/)
    });
  });

  it("keeps all handoff and evidence profiles for shared-token compatibility mode", () => {
    const auth = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-id": "legacy-runner-01",
        "x-naikaku-runner-token": "legacy-token"
      },
      env: {
        NAIKAKU_RUNNER_TOKEN: "legacy-token"
      }
    });

    expect(auth.ok).toBe(true);
    expect(scopeExecutorHandoffForRunner(mixedHandoff(), auth).readyActions).toHaveLength(3);
    expect(scopeEvidenceBundleForRunner(mixedEvidenceBundle(), auth).steps).toHaveLength(3);
    expect(deniedExecutorProfilesForRunner(auth, ["shell-container", "browser-sandbox"])).toEqual([]);
  });
});

function scopedShellRunnerAuth() {
  const auth = evaluateRunnerAuth({
    headers: {
      "x-naikaku-runner-id": "shell-runner-01",
      "x-naikaku-runner-token": "shell-token"
    },
    env: {
      NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify([
        {
          runnerId: "shell-runner-01",
          token: "shell-token",
          executorProfiles: ["shell-container"]
        }
      ])
    }
  });

  if (!auth.ok) throw new Error("Expected scoped shell runner auth to pass.");
  return auth;
}

function mixedHandoff(): ExecutorHandoff {
  return {
    id: "run-scope-test-executor-handoff",
    runId: "run-scope-test",
    createdAt: "2026-06-27T00:00:00.000Z",
    approvalRecords: [],
    readyActions: [
      action("shell-container"),
      action("browser-sandbox"),
      action("desktop-vm")
    ],
    heldActions: []
  };
}

function action(executorProfileId: ExecutorProfileId) {
  return {
    id: `action-${executorProfileId}`,
    runId: "run-scope-test",
    stageId: "execution" as const,
    roleId: "execution-minister",
    executorProfileId,
    title: `Run ${executorProfileId}`,
    action: executorProfileId === "shell-container" ? "run_shell" : "dry_run",
    target: executorProfileId === "shell-container" ? "/workspace:npm run test" : "sandbox://target",
    riskLevel: "medium" as const,
    status: "allowed" as const,
    approvalRequired: false,
    reason: "Allowed for scope test.",
    auditTags: [executorProfileId, "scope-test"],
    handoffStatus: "ready" as const
  };
}

function mixedEvidenceBundle(): ExecutorEvidenceBundle {
  const profiles: ExecutorProfileId[] = ["shell-container", "browser-sandbox", "desktop-vm"];
  return {
    schema: "naikaku.executor-evidence.v1",
    exportedAt: "2026-06-27T00:00:00.000Z",
    executorRunId: "run-scope-test-executor-run",
    handoffId: "run-scope-test-executor-handoff",
    runId: "run-scope-test",
    mode: "dry-run",
    steps: profiles.map((executorProfileId) => ({
      stepId: `step-${executorProfileId}`,
      actionId: `action-${executorProfileId}`,
      executorProfileId,
      runnerId: `naikaku.${executorProfileId}.dry-run`,
      status: "simulated",
      evidenceHash: `hash-${executorProfileId}`,
      replayable: true,
      evidence: [{
        id: `evidence-${executorProfileId}`,
        kind: "policy",
        label: "Policy",
        summary: "Policy evidence.",
        checksum: `checksum-${executorProfileId}`,
        createdAt: "2026-06-27T00:00:00.000Z",
        redacted: false,
        replayable: true
      }]
    })),
    summary: {
      steps: 3,
      evidenceItems: 3,
      replayableSteps: 3
    }
  };
}
