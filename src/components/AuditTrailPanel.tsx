import { Download, ScrollText, Trash2 } from "lucide-react";
import type { AuditEvent } from "../domain/types";

interface AuditTrailPanelProps {
  events: AuditEvent[];
  exportLink: { href: string; fileName: string } | null;
  onExport: () => void;
  onClear: () => void;
}

export function AuditTrailPanel({
  events,
  exportLink,
  onExport,
  onClear
}: AuditTrailPanelProps) {
  return (
    <section className="footer-panel audit-panel">
      <div className="panel-heading">
        <span>
          <ScrollText size={15} /> Audit trail
        </span>
        <strong>{events.length} events</strong>
      </div>

      <div className="audit-actions">
        <button type="button" onClick={onExport} disabled={!events.length}>
          <Download size={15} /> Export
        </button>
        <button type="button" onClick={onClear} disabled={!events.length}>
          <Trash2 size={15} /> Clear
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> JSON
          </a>
        ) : null}
      </div>

      <div className="audit-list">
        {events.length ? (
          events.slice(0, 10).map((event) => (
            <article className="audit-row" data-severity={event.severity} key={event.id}>
              <time>{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
              <div>
                <strong>{event.summary}</strong>
                <span>{event.type}</span>
                <small>{event.runId || event.roleId || event.actionId || event.actor}</small>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-history">No audit events yet.</p>
        )}
      </div>
    </section>
  );
}
