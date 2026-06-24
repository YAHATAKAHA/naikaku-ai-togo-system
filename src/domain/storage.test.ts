import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { createApprovalRecord } from "./automation";
import { runCabinetMission } from "./orchestrator";
import { parseWorkspaceExport, saveApprovalRecord, serializeRunBundle, serializeWorkspace } from "./storage";

describe("workspace import/export", () => {
  it("round-trips a workspace export without raw session secrets", () => {
    const exported = serializeWorkspace({
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy,
      mission: defaultMission
    });
    const imported = parseWorkspaceExport(exported);

    expect(imported.roles).toHaveLength(defaultRoles.length);
    expect(imported.sandboxPolicy.killSwitchArmed).toBe(true);
    expect(imported.mission).toBe(defaultMission);
    expect(exported).not.toContain("sessionSecret");
  });

  it("accepts legacy raw workspace JSON", () => {
    const imported = parseWorkspaceExport(
      JSON.stringify({
        mission: "Imported mission",
        roles: [defaultRoles[0]],
        sandboxPolicy: {
          ...defaultSandboxPolicy,
          maxRunMinutes: 30
        }
      })
    );

    expect(imported.roles[0].name).toBe(defaultRoles[0].name);
    expect(imported.roles).toHaveLength(defaultRoles.length);
    expect(imported.sandboxPolicy.maxRunMinutes).toBe(30);
    expect(imported.mission).toBe("Imported mission");
  });

  it("exports run bundles with approvals and executor handoff", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const action = run.automationActions?.find((candidate) => candidate.status === "needs-approval");
    if (!action) {
      throw new Error("Expected an approval-gated action.");
    }

    const approval = createApprovalRecord({
      action,
      decision: "approved",
      decidedAt: "2026-06-24T00:00:00.000Z"
    });
    const exported = serializeRunBundle(run, [approval]);
    const parsed = JSON.parse(exported) as {
      schema: string;
      approvalRecords: unknown[];
      executorHandoff: { readyActions: unknown[] };
    };

    expect(parsed.schema).toBe("naikaku.run-bundle.v1");
    expect(parsed.approvalRecords).toHaveLength(1);
    expect(parsed.executorHandoff.readyActions.length).toBeGreaterThan(0);
    expect(exported).not.toContain("sessionSecret");
  });

  it("keeps one approval decision per run action", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const action = run.automationActions?.find((candidate) => candidate.status === "needs-approval");
    if (!action) {
      throw new Error("Expected an approval-gated action.");
    }

    const approved = createApprovalRecord({ action, decision: "approved" });
    const rejected = createApprovalRecord({ action, decision: "rejected" });
    const records = saveApprovalRecord(rejected, saveApprovalRecord(approved, []));

    expect(records).toHaveLength(1);
    expect(records[0].decision).toBe("rejected");
  });
});
