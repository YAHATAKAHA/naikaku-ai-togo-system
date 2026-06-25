import { Download, ListChecks } from "lucide-react";
import type {
  DevelopmentBoard,
  DevelopmentWorkItem,
  DevelopmentWorkItemStatus
} from "../domain/types";

interface DevelopmentBoardPanelProps {
  board: DevelopmentBoard;
  exportLink: { href: string; fileName: string } | null;
  onStatusChange: (item: DevelopmentWorkItem, status: DevelopmentWorkItemStatus) => void;
  onExport: () => void;
}

const statusOptions: DevelopmentWorkItemStatus[] = [
  "todo",
  "in-progress",
  "blocked",
  "done"
];

export function DevelopmentBoardPanel({
  board,
  exportLink,
  onStatusChange,
  onExport
}: DevelopmentBoardPanelProps) {
  return (
    <section className="development-panel">
      <div className="panel-heading">
        <span>
          <ListChecks size={15} /> Development board
        </span>
        <strong>{board.summary.total} items</strong>
      </div>

      <div className="development-summary" aria-label="Development board summary">
        <span data-status="todo">{board.summary.todo} todo</span>
        <span data-status="in-progress">{board.summary.inProgress} active</span>
        <span data-status="blocked">{board.summary.blocked} blocked</span>
        <span data-status="done">{board.summary.done} done</span>
      </div>

      <div className="development-export-row">
        <span>{board.runId ? "Run-linked workstream" : "Workspace workstream"}</span>
        <button type="button" onClick={onExport} disabled={!board.items.length}>
          <Download size={15} /> Export board
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
      </div>

      <div className="development-item-list">
        {board.items.map((item) => (
          <article className="development-item" data-status={item.status} key={item.id}>
            <div className="development-item-heading">
              <div>
                <strong>{item.title}</strong>
                <span>{item.roleName || item.source} / {item.priority}</span>
              </div>
              <select
                aria-label={`Status for ${item.title}`}
                value={item.status}
                onChange={(event) =>
                  onStatusChange(item, event.target.value as DevelopmentWorkItemStatus)
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <p>{item.body}</p>
            <div className="development-item-meta">
              <span>{item.source}</span>
              <span>{item.stageId || "cross-stage"}</span>
              <span>{item.acceptanceCriteria.length} gates</span>
            </div>
            <div className="development-tags">
              {item.tags.slice(0, 5).map((tag) => (
                <span key={`${item.id}-${tag}`}>{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
