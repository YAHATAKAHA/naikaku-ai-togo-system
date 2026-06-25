import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildExecutorHandoff, createApprovalRecord } from "./automation";
import {
  buildExecutorEvidenceBundle,
  runExecutorHandoff,
  serializeExecutorEvidenceBundle
} from "./executorRunner";
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
    expect(executorRun.summary.evidenceItems).toBeGreaterThan(0);
    expect(executorRun.summary.replayableSteps).toBe(executorRun.steps.length);
    expect(executorRun.steps.every((step) => step.status === "simulated")).toBe(true);
    expect(executorRun.steps.every((step) => step.auditTags.includes("executor-dry-run"))).toBe(true);
    expect(executorRun.steps.every((step) => step.runnerId.endsWith(".dry-run"))).toBe(true);
    expect(executorRun.steps.every((step) => step.evidence.length > 0)).toBe(true);
    expect(executorRun.steps.every((step) => step.evidenceHash.startsWith("fnv1a-"))).toBe(true);
  });

  it("exports executor evidence as a replayable bundle", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const approvalRecords = (run.automationActions || [])
      .filter((action) => action.status === "needs-approval")
      .slice(0, 2)
      .map((action, index) =>
        createApprovalRecord({
          action,
          decision: "approved",
          decidedAt: `2026-06-24T00:0${index}:00.000Z`
        })
      );
    const handoff = buildExecutorHandoff({
      run,
      approvalRecords,
      createdAt: "2026-06-24T00:03:00.000Z"
    });
    const executorRun = runExecutorHandoff({
      handoff,
      startedAt: "2026-06-24T00:04:00.000Z"
    });
    const bundle = buildExecutorEvidenceBundle({
      executorRun,
      exportedAt: "2026-06-24T00:05:00.000Z"
    });
    const exported = serializeExecutorEvidenceBundle(bundle);
    const parsed = JSON.parse(exported) as {
      schema: string;
      steps: Array<{ evidence: unknown[]; replayable: boolean }>;
      summary: { evidenceItems: number };
    };

    expect(parsed.schema).toBe("naikaku.executor-evidence.v1");
    expect(parsed.steps).toHaveLength(executorRun.steps.length);
    expect(parsed.summary.evidenceItems).toBe(executorRun.summary.evidenceItems);
    expect(parsed.steps.every((step) => step.replayable)).toBe(true);
    expect(parsed.steps.some((step) => step.evidence.length > 1)).toBe(true);
    expect(exported).not.toContain("sessionSecret");
  });
});
