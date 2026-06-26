import { Download, FolderTree, PackageCheck, UsersRound } from "lucide-react";
import type { TeamHandoff, TeamPackageStatus } from "../domain/types";

interface TeamHandoffPanelProps {
  handoff: TeamHandoff;
  exportLink: { href: string; fileName: string } | null;
  scaffoldLink: { href: string; fileName: string } | null;
  onExport: () => void;
  onExportScaffolds: () => void;
}

export function TeamHandoffPanel({
  handoff,
  exportLink,
  scaffoldLink,
  onExport,
  onExportScaffolds
}: TeamHandoffPanelProps) {
  return (
    <section className="team-panel">
      <div className="panel-heading">
        <span>
          <UsersRound size={15} /> Team handoff
        </span>
        <strong>{handoff.summary.roles} packages</strong>
      </div>

      <div className="team-summary" aria-label="Team package summary">
        <span data-status="ready">{handoff.summary.ready} ready</span>
        <span data-status="needs-approval">{handoff.summary.needsApproval} approval</span>
        <span data-status="blocked">{handoff.summary.blocked} blocked</span>
        <span data-status="template">{handoff.summary.templates} template</span>
      </div>

      <div className="team-export-row">
        <span>{handoff.runId ? "Run-linked packages" : "Workspace templates"}</span>
        <button type="button" onClick={onExport}>
          <PackageCheck size={15} /> Export packages
        </button>
        <button type="button" onClick={onExportScaffolds}>
          <FolderTree size={15} /> Export scaffolds
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
        {scaffoldLink ? (
          <a href={scaffoldLink.href} download={scaffoldLink.fileName}>
            <Download size={15} /> Download script
          </a>
        ) : null}
      </div>

      <div className="team-package-grid">
        {handoff.packages.map((workPackage) => (
          <article className="team-package-card" data-status={workPackage.status} key={workPackage.id}>
            <div className="team-package-heading">
              <div>
                <strong>{workPackage.roleName}</strong>
                <span>{workPackage.ministry}</span>
              </div>
              <StatusChip status={workPackage.status} />
            </div>
            <p>{workPackage.objectives[0]}</p>
            <div className="team-package-meta">
              <span>{workPackage.provider.provider}/{workPackage.provider.model}</span>
              <span>{workPackage.executorProfileId}</span>
            </div>
            <ul>
              {workPackage.tasks.slice(0, 3).map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
            <small>{workPackage.dependencies.slice(0, 2).join(" + ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusChip({ status }: { status: TeamPackageStatus }) {
  const label = status === "needs-approval" ? "approval" : status;

  return <span className="team-status-chip" data-status={status}>{label}</span>;
}
