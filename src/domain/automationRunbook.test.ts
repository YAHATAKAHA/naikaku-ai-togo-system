import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { createApprovalRecord } from "./automation";
import { buildAutomationRunbook, serializeAutomationRunbook } from "./automationRunbook";
import { runCabinetMission } from "./orchestrator";

describe("automation runbook", () => {
  it("turns executor-ready actions into runner-ready steps", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const approvalAction = run.automationActions?.find(
      (action) => action.status === "needs-approval"
    );

    if (!approvalAction) {
      throw new Error("Expected at least one approval-gated action.");
    }

    const runbook = buildAutomationRunbook({
      run,
      approvalRecords: [
        createApprovalRecord({
          action: approvalAction,
          decision: "approved",
          decidedAt: "2026-06-25T00:00:00.000Z"
        })
      ],
      generatedAt: "2026-06-25T00:01:00.000Z"
    });

    expect(runbook.schema).toBe("naikaku.automation-runbook.v1");
    expect(runbook.runId).toBe(run.id);
    expect(runbook.summary.ready).toBe(runbook.steps.length);
    expect(runbook.summary.held).toBe(runbook.heldActions.length);
    expect(runbook.steps.some((step) => step.approvalRecordId)).toBe(true);
    expect(runbook.steps.every((step) => step.command.includes("sandbox.") || step.command.includes("approval."))).toBe(true);
    expect(runbook.steps.every((step) => step.evidenceRequired.length > 0)).toBe(true);
    expect(runbook.steps.every((step) => step.verification.some((gate) => gate.includes("secrets")))).toBe(true);
    expect(runbook.steps.every((step) => step.auditTags.includes("automation-runbook"))).toBe(true);
  });

  it("serializes a stable JSON envelope", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const runbook = buildAutomationRunbook({
      run,
      approvalRecords: [],
      generatedAt: "2026-06-25T00:01:00.000Z"
    });
    const parsed = JSON.parse(serializeAutomationRunbook(runbook)) as typeof runbook;

    expect(parsed.schema).toBe("naikaku.automation-runbook.v1");
    expect(parsed.generatedAt).toBe("2026-06-25T00:01:00.000Z");
    expect(parsed.steps.every((step) => step.runnerId.startsWith("naikaku."))).toBe(true);
  });
});
