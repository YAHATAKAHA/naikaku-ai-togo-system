import { AlertTriangle, CheckCircle2, CircleX, Download, FlaskConical, Play } from "lucide-react";
import type {
  ReleaseRehearsalCheck,
  ReleaseRehearsalReport,
  ReleaseRehearsalStatus,
  ReleaseVerificationReport,
  ReleaseRemediationItem
} from "../domain/types";
import type { ReleaseRehearsalCopy } from "../i18n";

interface ReleaseRehearsalPanelProps {
  report: ReleaseRehearsalReport | null;
  exportLink: { href: string; fileName: string } | null;
  verification: ReleaseVerificationReport | null;
  verificationLink: { href: string; fileName: string } | null;
  issueDraftsLink: { href: string; fileName: string } | null;
  issueScriptLink: { href: string; fileName: string } | null;
  copy: ReleaseRehearsalCopy;
  onRun: () => void;
  onExport: () => void;
  onVerify: () => void;
  onVerifyProduction: () => void;
  onExportIssueDrafts: () => void;
  onExportIssueScript: () => void;
}

export function ReleaseRehearsalPanel({
  report,
  exportLink,
  verification,
  verificationLink,
  issueDraftsLink,
  issueScriptLink,
  copy,
  onRun,
  onExport,
  onVerify,
  onVerifyProduction,
  onExportIssueDrafts,
  onExportIssueScript
}: ReleaseRehearsalPanelProps) {
  return (
    <section className="rehearsal-panel" data-decision={report?.decision || "idle"}>
      <div className="panel-heading">
        <span>
          <FlaskConical size={15} /> {copy.title}
        </span>
        <strong>{report ? `${report.score}/100` : copy.notRun}</strong>
      </div>

      <div className="rehearsal-summary" aria-label={`${copy.title} summary`}>
        <span data-status={report?.decision || "idle"}>{report ? decisionLabel(report.decision, copy) : copy.idle}</span>
        <span data-status="pass">{copy.passed(report?.summary.passed ?? 0)}</span>
        <span data-status="warn">{copy.warnings(report?.summary.warnings ?? 0)}</span>
        <span data-status="block">{copy.blockers(report?.summary.blockers ?? 0)}</span>
      </div>

      <div className="rehearsal-export-row">
        <span>{report ? copy.sourceLine(report.sourceRun, report.evidenceClaim.level, report.artifacts.evidenceItems) : copy.localDryRun}</span>
        <button type="button" onClick={onRun}>
          <Play size={15} /> {copy.run}
        </button>
        <button type="button" onClick={onExport} disabled={!report}>
          <Download size={15} /> {copy.exportReport}
        </button>
        <button type="button" onClick={onVerify} disabled={!report}>
          <CheckCircle2 size={15} /> {copy.verify}
        </button>
        <button type="button" onClick={onVerifyProduction} disabled={!report}>
          <AlertTriangle size={15} /> {copy.productionCheck}
        </button>
        <button type="button" onClick={onExportIssueDrafts} disabled={!report?.remediation.items.length}>
          <Download size={15} /> {copy.exportIssues}
        </button>
        <button type="button" onClick={onExportIssueScript} disabled={!report?.remediation.items.length}>
          <Download size={15} /> {copy.exportGh}
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> {copy.downloadJson}
          </a>
        ) : null}
        {verificationLink ? (
          <a href={verificationLink.href} download={verificationLink.fileName}>
            <Download size={15} /> {copy.downloadVerify}
          </a>
        ) : null}
        {issueDraftsLink ? (
          <a href={issueDraftsLink.href} download={issueDraftsLink.fileName}>
            <Download size={15} /> {copy.downloadIssues}
          </a>
        ) : null}
        {issueScriptLink ? (
          <a href={issueScriptLink.href} download={issueScriptLink.fileName}>
            <Download size={15} /> {copy.downloadGh}
          </a>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="rehearsal-metrics" aria-label={`${copy.title} artifacts`}>
            <Metric label={copy.metrics.bundle} value={`${Math.round(report.artifacts.bundleBytes / 1024)} KB`} />
            <Metric label={copy.metrics.notes} value={`${Math.round(report.artifacts.notesBytes / 1024)} KB`} />
            <Metric label={copy.metrics.runner} value={copy.metrics.ready(report.artifacts.runnerSteps)} />
            <Metric label={copy.metrics.held} value={`${report.artifacts.heldActions}`} />
          </div>

          <div className="rehearsal-claim">
            <strong>{copy.evidenceClaimTitle(report.evidenceClaim.level)}</strong>
            <p>{report.evidenceClaim.claim}</p>
            <small>{report.evidenceClaim.limitations[0]}</small>
          </div>

          {verification ? (
            <div className="rehearsal-verification" data-decision={verification.decision}>
              <div>
                <strong>{verificationDecisionLabel(verification.decision, copy)}</strong>
                <span>{copy.verification.scope(verification.scope, verification.requireProductionEvidence)}</span>
              </div>
              <p>{copy.verification.result(verification.summary.passed, verification.summary.failed)}</p>
              <small>{verification.checks.find((check) => check.status === "fail")?.nextAction || copy.verification.ready}</small>
            </div>
          ) : null}

          {report.remediation.items.length ? (
            <div className="rehearsal-remediation">
              <div className="rehearsal-subheading">
                <strong>{copy.remediationQueue}</strong>
                <span>{copy.remediationSummary(report.remediation.summary.high, report.remediation.summary.medium)}</span>
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
          {copy.empty}
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

function decisionLabel(decision: ReleaseRehearsalReport["decision"], copy: ReleaseRehearsalCopy) {
  if (decision === "release-ready") return copy.decision.releaseReady;
  if (decision === "needs-review") return copy.decision.needsReview;
  return copy.decision.blocked;
}

function verificationDecisionLabel(
  decision: ReleaseVerificationReport["decision"],
  copy: ReleaseRehearsalCopy
) {
  if (decision === "verified") return copy.verification.decision.verified;
  if (decision === "not-production-ready") return copy.verification.decision.notProductionReady;
  return copy.verification.decision.invalid;
}
