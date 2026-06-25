import { BookOpenCheck, CheckCircle2, Download, XCircle } from "lucide-react";
import type { MemoryEntry } from "../domain/types";

interface MemoryInboxPanelProps {
  candidates: MemoryEntry[];
  entries: MemoryEntry[];
  exportLink: { href: string; fileName: string } | null;
  onDecision: (entry: MemoryEntry, decision: "accepted" | "rejected") => void;
  onExport: () => void;
}

export function MemoryInboxPanel({
  candidates,
  entries,
  exportLink,
  onDecision,
  onExport
}: MemoryInboxPanelProps) {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const accepted = entries.filter((entry) => entry.status === "accepted");
  const rejected = entries.filter((entry) => entry.status === "rejected");
  const pending = candidates.filter((candidate) => !entriesById.has(candidate.id));
  const reviewed = [...accepted, ...rejected].slice(0, 4);

  return (
    <section className="memory-panel">
      <div className="panel-heading">
        <span>
          <BookOpenCheck size={15} /> Memory inbox
        </span>
        <strong>{pending.length} pending</strong>
      </div>

      <div className="memory-summary" aria-label="Memory review summary">
        <span data-status="candidate">{pending.length} pending</span>
        <span data-status="accepted">{accepted.length} accepted</span>
        <span data-status="rejected">{rejected.length} rejected</span>
      </div>

      <div className="memory-export-row">
        <span>{entries.length ? "Reviewed memory log" : "No reviewed memory yet"}</span>
        <button type="button" onClick={onExport} disabled={!entries.length}>
          <Download size={15} /> Export memory
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
      </div>

      {candidates.length ? (
        <div className="memory-candidate-grid">
          {candidates.map((candidate) => {
            const decision = entriesById.get(candidate.id);
            const status = decision?.status || "candidate";

            return (
              <article className="memory-candidate-card" data-status={status} key={candidate.id}>
                <div className="memory-candidate-heading">
                  <div>
                    <strong>{candidate.title}</strong>
                    <span>{candidate.kind} / {candidate.retention}</span>
                  </div>
                  <StatusChip status={status} />
                </div>
                <p>{candidate.body}</p>
                <div className="memory-tags">
                  {candidate.tags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                {decision ? (
                  <small>
                    {decision.status} by {decision.decidedBy || "operator"}
                  </small>
                ) : (
                  <div className="memory-actions">
                    <button type="button" onClick={() => onDecision(candidate, "accepted")}>
                      <CheckCircle2 size={14} /> Accept
                    </button>
                    <button type="button" onClick={() => onDecision(candidate, "rejected")}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="memory-empty">Run the cabinet to prepare reviewable memory candidates.</p>
      )}

      {reviewed.length ? (
        <div className="memory-ledger">
          <strong>Reviewed entries</strong>
          {reviewed.map((entry) => (
            <div className="memory-ledger-row" data-status={entry.status} key={`${entry.id}-${entry.status}`}>
              <span>{entry.status}</span>
              <p>{entry.title}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatusChip({ status }: { status: MemoryEntry["status"] }) {
  const label = status === "candidate" ? "pending" : status;

  return (
    <span className="memory-status-chip" data-status={status}>
      {label}
    </span>
  );
}
