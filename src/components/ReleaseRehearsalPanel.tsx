import { AlertTriangle, CheckCircle2, CircleX, Download, FlaskConical, Play } from "lucide-react";
import type {
  ReleaseRehearsalCheck,
  ReleaseRehearsalReport,
  ReleaseRehearsalStatus,
  ReleaseRemediationItem
} from "../domain/types";

interface ReleaseRehearsalPanelProps {
  report: ReleaseRehearsalReport | null;
  exportLink: { href: string; fileName: string } | null;
  issueDraftsLink: { href: string; fileName: string } | null;
  issueScriptLink: { href: string; fileName: string } | null;
  onRun: () => void;
  onExport: () => void;
  onExportIssueDrafts: () => void;
  onExportIssueScript: () => void;
}

export function ReleaseRehearsalPanel({
  report,
  exportLink,
  issueDraftsLink,
  issueScriptLink,
  onRun,
  onExport,
  onExportIssueDrafts,
  onExportIssueScript
}: ReleaseRehearsalPanelProps) {
  return (
    <section className="rehearsal-panel" data-decision={report?.decision || "idle"}>
      <div className="panel-heading">
        <span>
          <FlaskConical size={15} /> Release rehearsal
        </span>
        <strong>{report ? `${report.score}/100` : "not run"}</strong>
      </div>

      <div className="rehearsal-summary" aria-label="Release rehearsal summary">
        <span data-status={report?.decision || "idle"}>{report ? decisionLabel(report.decision) : "idle"}</span>
        <span data-status="pass">{report?.summary.passed ?? 0} passed</span>
        <span data-status="warn">{report?.summary.warnings ?? 0} warnings</span>
        <span data-status="block">{report?.summary.blockers ?? 0} blockers</span>
      </div>

      <div className="rehearsal-export-row">
        <span>{report ? `${report.sourceRun} / ${report.artifacts.evidenceItems} evidence` : "Local dry-run rehearsal"}</span>
        <button type="button" onClick={onRun}>
          <Play size={15} /> Run rehearsal
        </button>
        <button type="button" onClick={onExport} disabled={!report}>
          <Download size={15} /> Export report
        </button>
        <button type="button" onClick={onExportIssueDrafts} disabled={!report?.remediation.items.length}>
          <Download size={15} /> Export issues
        </button>
        <button type="button" onClick={onExportIssueScript} disabled={!report?.remediation.items.length}>
          <Download size={15} /> Export gh
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
        {issueDraftsLink ? (
          <a href={issueDraftsLink.href} download={issueDraftsLink.fileName}>
            <Download size={15} /> Download issues
          </a>
        ) : null}
        {issueScriptLink ? (
          <a href={issueScriptLink.href} download={issueScriptLink.fileName}>
            <Download size={15} /> Download gh
          </a>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="rehearsal-metrics" aria-label="Release rehearsal artifacts">
            <Metric label="Bundle" value={`${Math.round(report.artifacts.bundleBytes / 1024)} KB`} />
            <Metric label="Notes" value={`${Math.round(report.artifacts.notesBytes / 1024)} KB`} />
            <Metric label="Runner" value={`${report.artifacts.runnerSteps} ready`} />
            <Metric label="Held" value={`${report.artifacts.heldActions}`} />
          </div>

          {report.remediation.items.length ? (
            <div className="rehearsal-remediation">
              <div className="rehearsal-subheading">
                <strong>Remediation queue</strong>
                <span>{report.remediation.summary.high} high / {report.remediation.summary.medium} medium</span>
              </div>
              <div className="rehearsal-remediation-list">
                {report.remediation.items.slice(0, 4).map((item) => (
                  <RemediationCard item={item} key={item.id} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="rehearsal-check-list">
            {report.checks.map((check) => (
              <RehearsalCheckCard check={check} key={check.id} />
            ))}
          </div>
        </>
      ) : (
        <p className="rehearsal-empty">
          Run a local release rehearsal before handoff.
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rehearsal-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RemediationCard({ item }: { item: ReleaseRemediationItem }) {
  return (
    <article className="rehearsal-remediation-card" data-priority={item.priority}>
      <div>
        <strong>{item.title}</strong>
        <span>{item.owner}</span>
      </div>
      <p>{item.action}</p>
      <small>{item.verificationCommand}</small>
    </article>
  );
}

function RehearsalCheckCard({ check }: { check: ReleaseRehearsalCheck }) {
  const Icon = iconFor(check.status);

  return (
    <article className="rehearsal-check-card" data-status={check.status}>
      <div className="rehearsal-check-heading">
        <div>
          <strong>{check.label}</strong>
          <span>{check.category}</span>
        </div>
        <small>
          <Icon size={13} /> {check.status}
        </small>
      </div>
      <p>{check.summary}</p>
      <div className="rehearsal-evidence">
        {check.evidence.slice(0, 4).map((item) => (
          <span key={`${check.id}-${item}`}>{item}</span>
        ))}
      </div>
      <small>{check.nextAction}</small>
    </article>
  );
}

function iconFor(status: ReleaseRehearsalStatus) {
  if (status === "pass") return CheckCircle2;
  if (status === "warn") return AlertTriangle;
  return CircleX;
}

function decisionLabel(decision: ReleaseRehearsalReport["decision"]) {
  if (decision === "release-ready") return "release ready";
  if (decision === "needs-review") return "needs review";
  return "blocked";
}
