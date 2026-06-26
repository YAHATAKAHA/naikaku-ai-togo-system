import { useRef, type ChangeEvent } from "react";
import { AlertTriangle, Bot, ClipboardCheck, Download, PackageCheck, PlayCircle, ShieldCheck, Upload } from "lucide-react";
import type {
  CodingAgentBrief,
  CodingAgentBriefReviewCheck,
  CodingAgentBriefReviewReport,
  CodingAgentBriefs,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionDrillItem,
  CodingAgentSessionDrillReport,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem
} from "../domain/types";
import type { CodingAgentBriefsCopy } from "../i18n";

interface CodingAgentBriefsPanelProps {
  briefs: CodingAgentBriefs;
  review: CodingAgentBriefReviewReport | null;
  sessionBundle: CodingAgentSessionBundle | null;
  sessionDrill: CodingAgentSessionDrillReport | null;
  sessionReceipt: CodingAgentSessionReceipt | null;
  exportLink: { href: string; fileName: string } | null;
  markdownLink: { href: string; fileName: string } | null;
  reviewLink: { href: string; fileName: string } | null;
  sessionLink: { href: string; fileName: string } | null;
  sessionMarkdownLink: { href: string; fileName: string } | null;
  drillLink: { href: string; fileName: string } | null;
  drillMarkdownLink: { href: string; fileName: string } | null;
  receiptLink: { href: string; fileName: string } | null;
  receiptMarkdownLink: { href: string; fileName: string } | null;
  implementationEvidenceLink: { href: string; fileName: string } | null;
  implementationEvidenceMarkdownLink: { href: string; fileName: string } | null;
  copy: CodingAgentBriefsCopy;
  onExport: () => void;
  onExportMarkdown: () => void;
  onReview: () => void;
  onProductionReview: () => void;
  onExportSession: () => void;
  onExportProductionSession: () => void;
  onRunSessionDrill: () => void;
  onCreateSessionReceipt: () => void;
  onImportSessionReceipt: (file: File) => void;
}

export function CodingAgentBriefsPanel({
  briefs,
  review,
  sessionBundle,
  sessionDrill,
  sessionReceipt,
  exportLink,
  markdownLink,
  reviewLink,
  sessionLink,
  sessionMarkdownLink,
  drillLink,
  drillMarkdownLink,
  receiptLink,
  receiptMarkdownLink,
  implementationEvidenceLink,
  implementationEvidenceMarkdownLink,
  copy,
  onExport,
  onExportMarkdown,
  onReview,
  onProductionReview,
  onExportSession,
  onExportProductionSession,
  onRunSessionDrill,
  onCreateSessionReceipt,
  onImportSessionReceipt
}: CodingAgentBriefsPanelProps) {
  const receiptInputRef = useRef<HTMLInputElement>(null);

  function handleReceiptImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) {
      onImportSessionReceipt(file);
    }
  }

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
        <button type="button" onClick={onReview} disabled={!briefs.briefs.length}>
          <ShieldCheck size={15} /> {copy.review}
        </button>
        <button type="button" onClick={onProductionReview} disabled={!briefs.briefs.length}>
          <AlertTriangle size={15} /> {copy.productionReview}
        </button>
        <button type="button" onClick={onExportSession} disabled={!briefs.briefs.length}>
          <PackageCheck size={15} /> {copy.sessionPack}
        </button>
        <button type="button" onClick={onExportProductionSession} disabled={!briefs.briefs.length}>
          <AlertTriangle size={15} /> {copy.productionSession}
        </button>
        <button type="button" onClick={onRunSessionDrill} disabled={!briefs.briefs.length}>
          <PlayCircle size={15} /> {copy.sessionDrill}
        </button>
        <button type="button" onClick={onCreateSessionReceipt} disabled={!briefs.briefs.length}>
          <ClipboardCheck size={15} /> {copy.receiptTemplate}
        </button>
        <button type="button" onClick={() => receiptInputRef.current?.click()} disabled={!briefs.briefs.length}>
          <Upload size={15} /> {copy.importReceipt}
        </button>
        <input
          ref={receiptInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleReceiptImport}
        />
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
        {reviewLink ? (
          <a href={reviewLink.href} download={reviewLink.fileName}>
            <Download size={15} /> {copy.downloadReview}
          </a>
        ) : null}
        {sessionLink ? (
          <a href={sessionLink.href} download={sessionLink.fileName}>
            <Download size={15} /> {copy.downloadSessionJson}
          </a>
        ) : null}
        {sessionMarkdownLink ? (
          <a href={sessionMarkdownLink.href} download={sessionMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadSessionMarkdown}
          </a>
        ) : null}
        {drillLink ? (
          <a href={drillLink.href} download={drillLink.fileName}>
            <Download size={15} /> {copy.downloadDrillJson}
          </a>
        ) : null}
        {drillMarkdownLink ? (
          <a href={drillMarkdownLink.href} download={drillMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadDrillMarkdown}
          </a>
        ) : null}
        {receiptLink ? (
          <a href={receiptLink.href} download={receiptLink.fileName}>
            <Download size={15} /> {copy.downloadReceiptJson}
          </a>
        ) : null}
        {receiptMarkdownLink ? (
          <a href={receiptMarkdownLink.href} download={receiptMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadReceiptMarkdown}
          </a>
        ) : null}
        {implementationEvidenceLink ? (
          <a href={implementationEvidenceLink.href} download={implementationEvidenceLink.fileName}>
            <Download size={15} /> {copy.downloadImplementationEvidenceJson}
          </a>
        ) : null}
        {implementationEvidenceMarkdownLink ? (
          <a href={implementationEvidenceMarkdownLink.href} download={implementationEvidenceMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadImplementationEvidenceMarkdown}
          </a>
        ) : null}
      </div>

      {review ? (
        <CodingBriefReviewReport review={review} copy={copy} />
      ) : null}

      {sessionBundle ? (
        <CodingAgentSessionBundleReport bundle={sessionBundle} copy={copy} />
      ) : null}

      {sessionDrill ? (
        <CodingAgentSessionDrillReportView report={sessionDrill} copy={copy} />
      ) : null}

      {sessionReceipt ? (
        <CodingAgentSessionReceiptReportView report={sessionReceipt} copy={copy} />
      ) : null}

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

function CodingAgentSessionDrillReportView({
  report,
  copy
}: {
  report: CodingAgentSessionDrillReport;
  copy: CodingAgentBriefsCopy;
}) {
  const blockedItem = firstBlockedDrillItem(report.items);
  const visibleItem = blockedItem || report.items[0];

  return (
    <div className="coding-session-drill" data-decision={report.decision}>
      <div>
        <strong>{copy.drillDecision}: {copy.drillDecisionLabel(report.decision)}</strong>
        <span>{copy.drillSummary(report.summary.wouldAssign, report.summary.notAssigned)}</span>
      </div>
      <div>
        <strong>{copy.sandboxBoundary}: {visibleItem?.sandboxContract.boundary || "sandbox-only"}</strong>
        <span>{copy.sessionContractSummary(report.summary.sandboxContracts, report.summary.humanApprovalRequired)}</span>
      </div>
      {blockedItem ? (
        <p>
          <b>{blockedItem.title}</b>
          <span>{copy.drillAction(blockedItem.action)}</span>
          <small>{copy.drillNextAction}: {blockedItem.nextAction}</small>
        </p>
      ) : (
        <p>
          <span>{copy.drillReady}</span>
          {visibleItem ? (
            <small>
              {copy.executor}: {visibleItem.executorProfileId} /{" "}
              {copy.allowedActions(visibleItem.sandboxContract.allowedActions.length)}
            </small>
          ) : null}
        </p>
      )}
    </div>
  );
}

function CodingAgentSessionReceiptReportView({
  report,
  copy
}: {
  report: CodingAgentSessionReceipt;
  copy: CodingAgentBriefsCopy;
}) {
  const actionableItem = firstActionableReceiptItem(report.items);

  return (
    <div className="coding-session-receipt" data-decision={report.decision}>
      <div>
        <strong>{copy.receiptDecision}: {copy.receiptDecisionLabel(report.decision)}</strong>
        <span>
          {copy.receiptSummary(report.summary.verified, report.summary.pendingEvidence, report.summary.failed)}
        </span>
      </div>
      {actionableItem ? (
        <p>
          <b>{actionableItem.title}</b>
          <span>{copy.receiptStatus(actionableItem.receiptStatus)}</span>
          <small>{copy.receiptNextAction}: {actionableItem.nextAction}</small>
        </p>
      ) : (
        <p>
          <span>{copy.receiptReady}</span>
        </p>
      )}
    </div>
  );
}

function CodingBriefReviewReport({
  review,
  copy
}: {
  review: CodingAgentBriefReviewReport;
  copy: CodingAgentBriefsCopy;
}) {
  const nextCheck = firstActionableCheck(review.checks);

  return (
    <div className="coding-brief-review" data-decision={review.decision}>
      <div>
        <strong>{copy.reviewDecision}: {copy.reviewDecisionLabel(review.decision)}</strong>
        <span>{copy.reviewSummary(review.summary.passed, review.summary.warnings, review.summary.blockers)}</span>
      </div>
      {nextCheck ? (
        <p>
          <b>{nextCheck.label}</b>
          <span>{nextCheck.summary}</span>
          <small>{copy.reviewNextAction}: {nextCheck.nextAction}</small>
        </p>
      ) : (
        <p>
          <span>{copy.reviewReady}</span>
        </p>
      )}
    </div>
  );
}

function CodingAgentSessionBundleReport({
  bundle,
  copy
}: {
  bundle: CodingAgentSessionBundle;
  copy: CodingAgentBriefsCopy;
}) {
  const heldSession = firstHeldSession(bundle.sessions);
  const visibleSession = heldSession || bundle.sessions[0];

  return (
    <div className="coding-session-bundle" data-decision={bundle.decision}>
      <div>
        <strong>{copy.sessionDecision}: {copy.sessionDecisionLabel(bundle.decision)}</strong>
        <span>{copy.sessionSummary(bundle.summary.ready, bundle.summary.held)}</span>
      </div>
      {visibleSession ? (
        <div>
          <strong>{copy.sandboxBoundary}: {visibleSession.sandboxContract.boundary}</strong>
          <span>{copy.sessionContractSummary(bundle.sessions.length, bundle.summary.humanApproval)}</span>
        </div>
      ) : null}
      {heldSession ? (
        <p>
          <b>{heldSession.title}</b>
          <span>{copy.sessionHeld(heldSession.status)}</span>
          <small>
            {copy.executor}: {heldSession.executorProfileId} / {copy.evidencePrefix}:{" "}
            {heldSession.sandboxContract.evidenceArtifactPrefix}
          </small>
          <small>{copy.sessionNextAction}: {heldSession.nextAction}</small>
        </p>
      ) : (
        <p>
          <span>{copy.sessionReady}</span>
          {visibleSession ? (
            <small>
              {copy.executor}: {visibleSession.executorProfileId} /{" "}
              {copy.allowedActions(visibleSession.sandboxContract.allowedActions.length)} / {copy.evidencePrefix}:{" "}
              {visibleSession.sandboxContract.evidenceArtifactPrefix}
            </small>
          ) : null}
        </p>
      )}
    </div>
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

function firstActionableCheck(checks: CodingAgentBriefReviewCheck[]) {
  return checks.find((check) => check.status === "block")
    || checks.find((check) => check.status === "warn")
    || null;
}

function firstHeldSession(sessions: CodingAgentSession[]) {
  return sessions.find((session) => session.status !== "ready-for-agent") || null;
}

function firstBlockedDrillItem(items: CodingAgentSessionDrillItem[]) {
  return items.find((item) => item.action !== "would-assign") || null;
}

function firstActionableReceiptItem(items: CodingAgentSessionReceiptItem[]) {
  return items.find((item) => item.receiptStatus !== "verified") || null;
}
