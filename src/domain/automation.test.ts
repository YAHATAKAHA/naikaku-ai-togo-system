import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildAutomationPlan, buildExecutorHandoff, createApprovalRecord } from "./automation";
import { runCabinetMission } from "./orchestrator";

describe("automation planner", () => {
  it("creates auditable sandbox actions for every cabinet artifact", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const actions = buildAutomationPlan({
      run,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });

    expect(actions).toHaveLength(run.artifacts.length);
    expect(actions.map((action) => action.stageId)).toEqual(
      run.artifacts.map((artifact) => artifact.stageId)
    );
    expect(actions.some((action) => action.status === "needs-approval")).toBe(true);
    expect(actions.every((action) => action.auditTags.length > 0)).toBe(true);
  });

  it("blocks proposed actions when the kill switch is not armed", () => {
    const sandboxPolicy = {
      ...defaultSandboxPolicy,
      killSwitchArmed: false
    };
    const roles = defaultRoles.map((role) => ({
      ...role,
      permissions: {
        canUseBrowser: true,
        canUseShell: true,
        canUseFiles: true,
        canSendNetworkRequests: true,
        requiresApprovalForHighImpact: true
      }
    }));
    const run = runCabinetMission({
      mission: defaultMission,
      roles,
      sandboxPolicy
    });
    const actions = buildAutomationPlan({
      run,
      roles,
      sandboxPolicy
    });

    expect(actions.every((action) => action.status === "blocked")).toBe(true);
    expect(actions.every((action) => action.reason.includes("kill switch"))).toBe(true);
  });

  it("blocks automation when a live provider did not produce its stage artifact", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const actions = buildAutomationPlan({
      run: {
        ...run,
        artifacts: run.artifacts.map((artifact) => ({
          ...artifact,
          providerStatus: "skipped" as const,
          providerDetail: "Environment variable is not set."
        }))
      },
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });

    expect(actions.every((action) => action.status === "blocked")).toBe(true);
    expect(actions.every((action) => action.reason.includes("did not generate an artifact"))).toBe(true);
    expect(actions.every((action) => action.auditTags.includes("provider-artifact-unavailable"))).toBe(true);
  });

  it("builds executor handoff only from allowed or approved actions", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const approvalAction = run.automationActions?.find(
      (action) => action.status === "needs-approval"
    );
    const rejectedAction = run.automationActions?.find(
      (action) => action.status === "needs-approval" && action.id !== approvalAction?.id
    );

    if (!approvalAction || !rejectedAction) {
      throw new Error("Expected at least two approval-gated actions in default run.");
    }

    const handoff = buildExecutorHandoff({
      run,
      approvalRecords: [
        createApprovalRecord({
          action: approvalAction,
          decision: "approved",
          decidedAt: "2026-06-24T00:00:00.000Z"
        }),
        createApprovalRecord({
          action: rejectedAction,
          decision: "rejected",
          decidedAt: "2026-06-24T00:01:00.000Z"
        })
      ],
      createdAt: "2026-06-24T00:02:00.000Z"
    });

    expect(handoff.readyActions.some((action) => action.id === approvalAction.id)).toBe(true);
    expect(handoff.readyActions.some((action) => action.id === rejectedAction.id)).toBe(false);
    expect(handoff.readyActions.every((action) => action.status !== "blocked")).toBe(true);
    expect(handoff.heldActions.some((action) => action.id === rejectedAction.id)).toBe(true);
  });
});
