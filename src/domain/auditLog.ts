import type { AuditEvent, AuditEventSeverity, AuditEventType } from "./types";

export const MAX_AUDIT_EVENTS = 120;

export function createAuditEvent({
  type,
  summary,
  actor = "local-operator",
  severity = "info",
  timestamp = new Date().toISOString(),
  runId,
  roleId,
  actionId,
  metadata = {}
}: {
  type: AuditEventType;
  summary: string;
  actor?: string;
  severity?: AuditEventSeverity;
  timestamp?: string;
  runId?: string;
  roleId?: string;
  actionId?: string;
  metadata?: AuditEvent["metadata"];
}): AuditEvent {
  return {
    id: `${timestamp}-${type}-${hashSummary(summary)}`,
    type,
    timestamp,
    actor,
    severity,
    summary,
    runId,
    roleId,
    actionId,
    metadata: sanitizeMetadata(metadata)
  };
}

export function appendAuditEvent(
  events: AuditEvent[],
  event: AuditEvent,
  maxEvents = MAX_AUDIT_EVENTS
) {
  return [
    event,
    ...events.filter((candidate) => candidate.id !== event.id)
  ].slice(0, maxEvents);
}

export function serializeAuditEvents(events: AuditEvent[]) {
  return JSON.stringify(
    {
      schema: "naikaku.audit-log.v1",
      exportedAt: new Date().toISOString(),
      events
    },
    null,
    2
  );
}

function sanitizeMetadata(metadata: AuditEvent["metadata"]) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? value
        : value === null
          ? null
          : String(value)
    ])
  );
}

function hashSummary(summary: string) {
  let hash = 0;
  for (let index = 0; index < summary.length; index += 1) {
    hash = (hash * 31 + summary.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}
