import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildExecutorHandoff, createApprovalRecord } from "./automation";
import { runExecutorHandoff } from "./executorRunner";
import { runCabinetMission } from "./orchestrator";

describe("executor runner", () => {
  it("dry-runs only executor-ready handoff actions", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const approvalAction = run.automationActions?.find(
      (action) => action.status === "needs-approval"
    );
    if (!approvalAction) {
      throw new Error("Expected an approval-gated action.");
    }

    const handoff = buildExecutorHandoff({
      run,
      approvalRecords: [
        createApprovalRecord({
          action: approvalAction,
          decision: "approved",
          decidedAt: "2026-06-24T00:00:00.000Z"
        })
      ],
      createdAt: "2026-06-24T00:01:00.000Z"
    });
    const executorRun = runExecutorHandoff({
      handoff,
      startedAt: "2026-06-24T00:02:00.000Z"
    });

    expect(executorRun.mode).toBe("dry-run");
    expect(executorRun.steps).toHaveLength(handoff.readyActions.length);
    expect(executorRun.summary.ready).toBe(handoff.readyActions.length);
    expect(executorRun.summary.held).toBe(handoff.heldActions.length);
    expect(executorRun.steps.every((step) => step.status === "simulated")).toBe(true);
    expect(executorRun.steps.every((step) => step.auditTags.includes("executor-dry-run"))).toBe(true);
  });
});
