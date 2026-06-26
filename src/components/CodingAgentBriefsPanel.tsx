import { Bot, Download } from "lucide-react";
import type { CodingAgentBrief, CodingAgentBriefs } from "../domain/types";
import type { CodingAgentBriefsCopy } from "../i18n";

interface CodingAgentBriefsPanelProps {
  briefs: CodingAgentBriefs;
  exportLink: { href: string; fileName: string } | null;
  markdownLink: { href: string; fileName: string } | null;
  copy: CodingAgentBriefsCopy;
  onExport: () => void;
  onExportMarkdown: () => void;
}

export function CodingAgentBriefsPanel({
  briefs,
  exportLink,
  markdownLink,
  copy,
  onExport,
  onExportMarkdown
}: CodingAgentBriefsPanelProps) {
  return (
    <section className="coding-briefs-panel">
      <div className="panel-heading">
        <span>
          <Bot size={15} /> {copy.title}
        </span>
        <strong>{copy.total(briefs.summary.total)}</strong>
      </div>

      <div className="coding-briefs-summary" aria-label={`${copy.title} summary`}>
        <span data-status="implementable">{copy.implementable(briefs.summary.implementable)}</span>
        <span data-status="blocked">{copy.blocked(briefs.summary.blocked)}</span>
        <span data-status="human">{copy.humanReview(briefs.summary.humanReview)}</span>
        <span data-status="priority">{copy.highPriority(briefs.summary.highPriority)}</span>
      </div>

      <div className="coding-briefs-export-row">
        <span>{copy.sourceReady}</span>
        <button type="button" onClick={onExport} disabled={!briefs.briefs.length}>
          <Download size={15} /> {copy.exportJson}
        </button>
        <button type="button" onClick={onExportMarkdown} disabled={!briefs.briefs.length}>
          <Download size={15} /> {copy.exportMarkdown}
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> {copy.downloadJson}
          </a>
        ) : null}
        {markdownLink ? (
          <a href={markdownLink.href} download={markdownLink.fileName}>
            <Download size={15} /> {copy.downloadMarkdown}
          </a>
        ) : null}
      </div>

      {briefs.briefs.length ? (
        <div className="coding-briefs-list">
          {briefs.briefs.slice(0, 6).map((brief) => (
            <CodingBriefCard brief={brief} copy={copy} key={brief.id} />
          ))}
        </div>
      ) : (
        <p className="coding-briefs-empty">{copy.empty}</p>
      )}
    </section>
  );
}

function CodingBriefCard({
  brief,
  copy
}: {
  brief: CodingAgentBrief;
  copy: CodingAgentBriefsCopy;
}) {
  return (
    <article className="coding-brief-card" data-mode={brief.mode}>
      <div className="coding-brief-heading">
        <div>
          <strong>{brief.title}</strong>
          <span>{brief.roleName || copy.crossRole} / {brief.priority}</span>
        </div>
        <small>{brief.status}</small>
      </div>
      <p>{brief.objective}</p>
      <div className="coding-brief-meta">
        <span>{copy.mode}: {brief.mode}</span>
        <span>{copy.executor}: {brief.sandbox.executorProfileId}</span>
        <span>{copy.releaseGate}: {brief.releaseGate.required ? copy.required : copy.optional}</span>
      </div>
      <small>{copy.promptReady}</small>
    </article>
  );
}
