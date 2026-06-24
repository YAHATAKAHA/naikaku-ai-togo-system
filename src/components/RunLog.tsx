import { ListChecks } from "lucide-react";
import type { CabinetRun, RunHistoryItem } from "../domain/types";

export function RunLog({
  run,
  history,
  onClearHistory
}: {
  run: CabinetRun | null;
  history: RunHistoryItem[];
  onClearHistory: () => void;
}) {
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
      <div className="history-heading">
        <strong>Recent runs</strong>
        <button type="button" onClick={onClearHistory}>Clear</button>
      </div>
      <div className="history-list">
        {(history.length ? history : []).map((item) => (
          <article className="history-row" data-decision={item.decision} key={item.id}>
            <span>{item.decision}</span>
            <strong>{item.overall}</strong>
            <p>{item.mission}</p>
            <time>{new Date(item.completedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
            <small>{item.source}</small>
          </article>
        ))}
        {!history.length ? <p className="empty-history">No saved runs yet.</p> : null}
      </div>
    </section>
  );
}
