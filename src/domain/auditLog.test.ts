import { describe, expect, it } from "vitest";
import { appendAuditEvent, createAuditEvent, serializeAuditEvents } from "./auditLog";

describe("audit log", () => {
  it("creates stable audit events with sanitized metadata", () => {
    const event = createAuditEvent({
      type: "cabinet.run.completed",
      summary: "Cabinet run completed.",
      timestamp: "2026-06-24T00:00:00.000Z",
      severity: "success",
      runId: "run-1",
      metadata: {
        roles: 8,
        gateway: true,
        raw: null
      }
    });

    expect(event.id).toContain("cabinet.run.completed");
    expect(event.runId).toBe("run-1");
    expect(event.metadata.roles).toBe(8);
    expect(event.severity).toBe("success");
  });

  it("prepends events, removes duplicate ids, and caps length", () => {
    const first = createAuditEvent({
      type: "workspace.saved",
      summary: "Workspace saved.",
      timestamp: "2026-06-24T00:00:00.000Z"
    });
    const second = createAuditEvent({
      type: "workspace.exported",
      summary: "Workspace exported.",
      timestamp: "2026-06-24T00:01:00.000Z"
    });

    const events = appendAuditEvent(appendAuditEvent([first], first), second, 1);

    expect(events).toEqual([second]);
  });

  it("serializes audit events as a safe export envelope", () => {
    const exported = serializeAuditEvents([
      createAuditEvent({
        type: "team.handoff.exported",
        summary: "Team handoff exported.",
        timestamp: "2026-06-24T00:00:00.000Z"
      })
    ]);
    const parsed = JSON.parse(exported) as { schema: string; events: unknown[] };

    expect(parsed.schema).toBe("naikaku.audit-log.v1");
    expect(parsed.events).toHaveLength(1);
    expect(exported).not.toContain("sessionSecret");
  });
});
