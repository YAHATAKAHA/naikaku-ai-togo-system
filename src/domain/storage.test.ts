import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { createApprovalRecord } from "./automation";
import { createAuditEvent } from "./auditLog";
import { runCabinetMission } from "./orchestrator";
import { createCustomRole } from "./roles";
import {
  appendAuditEvent,
  parseWorkspaceExport,
  saveApprovalRecord,
  saveDevelopmentWorkItem,
  saveMemoryEntry,
  serializeAuditLog,
  serializeDevelopmentBoardExport,
  serializeMemoryLog,
  serializeRunBundle,
  serializeWorkspace
} from "./storage";
import { buildMemoryCandidates, createMemoryDecision } from "./memory";
import { buildDevelopmentBoard, updateDevelopmentWorkItemStatus } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

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

  it("preserves custom roles through workspace export and import", () => {
    const customRole = createCustomRole({ roles: defaultRoles });
    const exported = serializeWorkspace({
      roles: [...defaultRoles, customRole],
      sandboxPolicy: defaultSandboxPolicy,
      mission: defaultMission
    });
    const imported = parseWorkspaceExport(exported);

    expect(imported.roles).toHaveLength(defaultRoles.length + 1);
    expect(imported.roles.some((role) => role.id === customRole.id)).toBe(true);
    expect(exported).not.toContain("sessionSecret");
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

  it("exports audit events through the storage envelope", () => {
    const event = createAuditEvent({
      type: "workspace.saved",
      summary: "Workspace saved.",
      timestamp: "2026-06-24T00:00:00.000Z"
    });
    const events = appendAuditEvent(event, []);
    const exported = serializeAuditLog(events);
    const parsed = JSON.parse(exported) as { schema: string; events: unknown[] };

    expect(parsed.schema).toBe("naikaku.audit-log.v1");
    expect(parsed.events).toHaveLength(1);
  });

  it("keeps one reviewed memory decision per candidate", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const [candidate] = buildMemoryCandidates({ run });
    const accepted = createMemoryDecision({ entry: candidate, decision: "accepted" });
    const rejected = createMemoryDecision({ entry: candidate, decision: "rejected" });
    const entries = saveMemoryEntry(rejected, saveMemoryEntry(accepted, []));

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("rejected");
  });

  it("exports reviewed memory entries through the storage envelope", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const accepted = createMemoryDecision({
      entry: buildMemoryCandidates({ run })[0],
      decision: "accepted"
    });
    const exported = serializeMemoryLog([accepted]);
    const parsed = JSON.parse(exported) as { schema: string; entries: unknown[] };

    expect(parsed.schema).toBe("naikaku.memory-log.v1");
    expect(parsed.entries).toHaveLength(1);
  });

  it("keeps one development item status per generated work item", () => {
    const handoff = buildTeamHandoff({
      workspace: {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      }
    });
    const board = buildDevelopmentBoard({ handoff });
    const inProgress = updateDevelopmentWorkItemStatus({
      item: board.items[0],
      status: "in-progress"
    });
    const done = updateDevelopmentWorkItemStatus({
      item: board.items[0],
      status: "done"
    });
    const items = saveDevelopmentWorkItem(done, saveDevelopmentWorkItem(inProgress, []));

    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("done");
  });

  it("exports development boards through the storage envelope", () => {
    const handoff = buildTeamHandoff({
      workspace: {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      }
    });
    const exported = serializeDevelopmentBoardExport(buildDevelopmentBoard({ handoff }));
    const parsed = JSON.parse(exported) as { schema: string; items: unknown[] };

    expect(parsed.schema).toBe("naikaku.development-board.v1");
    expect(parsed.items.length).toBe(defaultRoles.length);
  });
});
