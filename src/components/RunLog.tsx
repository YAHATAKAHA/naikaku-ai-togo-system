import { ListChecks } from "lucide-react";
import type { CabinetRun } from "../domain/types";

export function RunLog({ run }: { run: CabinetRun | null }) {
  const entries = run?.logs || [
    {
      id: "empty",
      timestamp: new Date().toISOString(),
      level: "info" as const,
      message: "No run yet. Configure roles, then run the cabinet."
    }
  ];

  return (
    <section className="footer-panel run-log">
      <div className="panel-heading">
        <span>
          <ListChecks size={15} /> Run log
        </span>
        <strong>{entries.length} entries</strong>
      </div>
      <div className="log-list">
        {entries.map((entry) => (
          <article className="log-row" data-level={entry.level} key={entry.id}>
            <time>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
            <span>{entry.message}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
