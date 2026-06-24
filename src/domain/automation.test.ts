import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildAutomationPlan } from "./automation";
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
});
