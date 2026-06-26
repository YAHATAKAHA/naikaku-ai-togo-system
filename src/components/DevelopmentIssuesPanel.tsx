import { Download, Github } from "lucide-react";
import type { DevelopmentIssueDraft, DevelopmentIssueDrafts } from "../domain/types";

interface DevelopmentIssuesPanelProps {
  drafts: DevelopmentIssueDrafts;
  exportLink: { href: string; fileName: string } | null;
  onExport: () => void;
}

export function DevelopmentIssuesPanel({
  drafts,
  exportLink,
  onExport
}: DevelopmentIssuesPanelProps) {
  return (
    <section className="issues-panel">
      <div className="panel-heading">
        <span>
          <Github size={15} /> GitHub issue drafts
        </span>
        <strong>{drafts.summary.total} drafts</strong>
      </div>

      <div className="issues-summary" aria-label="GitHub issue draft summary">
        <span data-status="ready">{drafts.summary.ready} ready</span>
        <span data-status="blocked">{drafts.summary.blocked} blocked</span>
        <span data-status="priority">{drafts.summary.highPriority} priority</span>
        <span data-status="team">{drafts.summary.teams} teams</span>
      </div>

      <div className="issues-export-row">
        <span>{drafts.runId ? "Run-linked issue set" : "Workspace issue set"}</span>
        <button type="button" onClick={onExport} disabled={!drafts.drafts.length}>
          <Download size={15} /> Export issues
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
      </div>

      <div className="issues-draft-list">
        {drafts.drafts.length ? (
          drafts.drafts.map((draft) => <IssueDraftCard key={draft.id} draft={draft} />)
        ) : (
          <p className="issues-empty">Generate a development board to prepare issue drafts.</p>
        )}
      </div>
    </section>
  );
}

function IssueDraftCard({ draft }: { draft: DevelopmentIssueDraft }) {
  return (
    <article className="issues-draft-card" data-status={draft.status}>
      <div className="issues-draft-heading">
        <div>
          <strong>{draft.title}</strong>
          <span>{draft.assigneeHint || "unassigned"} / {draft.priority}</span>
        </div>
        <small>{draft.status}</small>
      </div>

      <p>{firstWorkParagraph(draft.body)}</p>

      <div className="issues-draft-meta">
        <span>{draft.source}</span>
        <span>{draft.stageId || "cross-stage"}</span>
        <span>{draft.acceptanceCriteria.length} checks</span>
      </div>

      <div className="issues-labels">
        {draft.labels.slice(0, 6).map((label) => (
          <span key={`${draft.id}-${label}`}>{label}</span>
        ))}
      </div>
    </article>
  );
}

function firstWorkParagraph(body: string) {
  const marker = "## Work";
  const afterMarker = body.includes(marker) ? body.split(marker)[1] : body;
  return afterMarker
    .split("## Acceptance Criteria")[0]
    .replace(/\s+/g, " ")
    .trim();
}
