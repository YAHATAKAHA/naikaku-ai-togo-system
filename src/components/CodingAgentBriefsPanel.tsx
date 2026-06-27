import { useRef, type ChangeEvent } from "react";
import { AlertTriangle, Bot, ClipboardCheck, Download, PackageCheck, PlayCircle, ShieldCheck, Upload } from "lucide-react";
import type {
  CodingAgentBrief,
  CodingAgentBriefReviewCheck,
  CodingAgentBriefReviewReport,
  CodingAgentBriefs,
  CodingAgentDispatchArchive,
  CodingAgentDispatchArchiveAudit,
  CodingAgentDispatchManifest,
  CodingAgentDispatchManifestItem,
  CodingAgentDispatchSimulation,
  CodingAgentRunnerIntakeAudit,
  CodingAgentRunnerInvocationPackage,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
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
  dispatchManifest: CodingAgentDispatchManifest | null;
  dispatchArchive: CodingAgentDispatchArchive | null;
  dispatchArchiveAudit: CodingAgentDispatchArchiveAudit | null;
  dispatchSimulation: CodingAgentDispatchSimulation | null;
  runnerManifest: CodingAgentRunnerManifest | null;
  runnerInvocation: CodingAgentRunnerInvocationPackage | null;
  runnerIntake: CodingAgentRunnerIntakeAudit | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  sessionDrill: CodingAgentSessionDrillReport | null;
  sessionReceipt: CodingAgentSessionReceipt | null;
  exportLink: { href: string; fileName: string } | null;
  markdownLink: { href: string; fileName: string } | null;
  reviewLink: { href: string; fileName: string } | null;
  sessionLink: { href: string; fileName: string } | null;
  sessionMarkdownLink: { href: string; fileName: string } | null;
  dispatchLink: { href: string; fileName: string } | null;
  dispatchMarkdownLink: { href: string; fileName: string } | null;
  dispatchArchiveLink: { href: string; fileName: string } | null;
  dispatchArchiveMarkdownLink: { href: string; fileName: string } | null;
  dispatchArchiveAuditLink: { href: string; fileName: string } | null;
  dispatchArchiveAuditMarkdownLink: { href: string; fileName: string } | null;
  dispatchSimulationLink: { href: string; fileName: string } | null;
  dispatchSimulationMarkdownLink: { href: string; fileName: string } | null;
  runnerManifestLink: { href: string; fileName: string } | null;
  runnerManifestMarkdownLink: { href: string; fileName: string } | null;
  runnerInvocationLink: { href: string; fileName: string } | null;
  runnerInvocationMarkdownLink: { href: string; fileName: string } | null;
  runnerIntakeLink: { href: string; fileName: string } | null;
  runnerIntakeMarkdownLink: { href: string; fileName: string } | null;
  runnerSelfTestLink: { href: string; fileName: string } | null;
  runnerSelfTestMarkdownLink: { href: string; fileName: string } | null;
  sandboxRunnerPreflightLink: { href: string; fileName: string } | null;
  sandboxRunnerPreflightMarkdownLink: { href: string; fileName: string } | null;
  sandboxRunnerLink: { href: string; fileName: string } | null;
  sandboxRunnerMarkdownLink: { href: string; fileName: string } | null;
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
  onExportDispatchManifest: () => void;
  onRunSessionDrill: () => void;
  onRunSandboxRunnerPreflight: () => void;
  onRunSandboxRunner: () => void;
  onCreateSessionReceipt: () => void;
  onImportSessionReceipt: (file: File) => void;
}

export function CodingAgentBriefsPanel({
  briefs,
  review,
  sessionBundle,
  dispatchManifest,
  dispatchArchive,
  dispatchArchiveAudit,
  dispatchSimulation,
  runnerManifest,
  runnerInvocation,
  runnerIntake,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  sessionDrill,
  sessionReceipt,
  exportLink,
  markdownLink,
  reviewLink,
  sessionLink,
  sessionMarkdownLink,
  dispatchLink,
  dispatchMarkdownLink,
  dispatchArchiveLink,
  dispatchArchiveMarkdownLink,
  dispatchArchiveAuditLink,
  dispatchArchiveAuditMarkdownLink,
  dispatchSimulationLink,
  dispatchSimulationMarkdownLink,
  runnerManifestLink,
  runnerManifestMarkdownLink,
  runnerInvocationLink,
  runnerInvocationMarkdownLink,
  runnerIntakeLink,
  runnerIntakeMarkdownLink,
  runnerSelfTestLink,
  runnerSelfTestMarkdownLink,
  sandboxRunnerPreflightLink,
  sandboxRunnerPreflightMarkdownLink,
  sandboxRunnerLink,
  sandboxRunnerMarkdownLink,
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
  onExportDispatchManifest,
  onRunSessionDrill,
  onRunSandboxRunnerPreflight,
  onRunSandboxRunner,
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
        <button type="button" onClick={onExportDispatchManifest} disabled={!briefs.briefs.length}>
          <PackageCheck size={15} /> {copy.dispatchManifest}
        </button>
        <button type="button" onClick={onRunSandboxRunnerPreflight} disabled={!runnerSelfTest}>
          <ShieldCheck size={15} /> {copy.sandboxRunnerPreflight}
        </button>
        <button
          type="button"
          onClick={onRunSandboxRunner}
          disabled={
            !runnerSelfTest ||
            runnerSelfTest.decision !== "self-test-ready" ||
            (sandboxRunnerPreflight ? sandboxRunnerPreflight.decision !== "ready" : false)
          }
        >
          <PlayCircle size={15} /> {copy.runSandboxRunner}
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
        {dispatchLink ? (
          <a href={dispatchLink.href} download={dispatchLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchJson}
          </a>
        ) : null}
        {dispatchMarkdownLink ? (
          <a href={dispatchMarkdownLink.href} download={dispatchMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchMarkdown}
          </a>
        ) : null}
        {dispatchArchiveLink ? (
          <a href={dispatchArchiveLink.href} download={dispatchArchiveLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchArchiveJson}
          </a>
        ) : null}
        {dispatchArchiveMarkdownLink ? (
          <a href={dispatchArchiveMarkdownLink.href} download={dispatchArchiveMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchArchiveMarkdown}
          </a>
        ) : null}
        {dispatchArchiveAuditLink ? (
          <a href={dispatchArchiveAuditLink.href} download={dispatchArchiveAuditLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchArchiveAuditJson}
          </a>
        ) : null}
        {dispatchArchiveAuditMarkdownLink ? (
          <a href={dispatchArchiveAuditMarkdownLink.href} download={dispatchArchiveAuditMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchArchiveAuditMarkdown}
          </a>
        ) : null}
        {dispatchSimulationLink ? (
          <a href={dispatchSimulationLink.href} download={dispatchSimulationLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchSimulationJson}
          </a>
        ) : null}
        {dispatchSimulationMarkdownLink ? (
          <a href={dispatchSimulationMarkdownLink.href} download={dispatchSimulationMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadDispatchSimulationMarkdown}
          </a>
        ) : null}
        {runnerManifestLink ? (
          <a href={runnerManifestLink.href} download={runnerManifestLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerManifestJson}
          </a>
        ) : null}
        {runnerManifestMarkdownLink ? (
          <a href={runnerManifestMarkdownLink.href} download={runnerManifestMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerManifestMarkdown}
          </a>
        ) : null}
        {runnerInvocationLink ? (
          <a href={runnerInvocationLink.href} download={runnerInvocationLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerInvocationJson}
          </a>
        ) : null}
        {runnerInvocationMarkdownLink ? (
          <a href={runnerInvocationMarkdownLink.href} download={runnerInvocationMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerInvocationMarkdown}
          </a>
        ) : null}
        {runnerIntakeLink ? (
          <a href={runnerIntakeLink.href} download={runnerIntakeLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerIntakeJson}
          </a>
        ) : null}
        {runnerIntakeMarkdownLink ? (
          <a href={runnerIntakeMarkdownLink.href} download={runnerIntakeMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerIntakeMarkdown}
          </a>
        ) : null}
        {runnerSelfTestLink ? (
          <a href={runnerSelfTestLink.href} download={runnerSelfTestLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerSelfTestJson}
          </a>
        ) : null}
        {runnerSelfTestMarkdownLink ? (
          <a href={runnerSelfTestMarkdownLink.href} download={runnerSelfTestMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadRunnerSelfTestMarkdown}
          </a>
        ) : null}
        {sandboxRunnerPreflightLink ? (
          <a href={sandboxRunnerPreflightLink.href} download={sandboxRunnerPreflightLink.fileName}>
            <Download size={15} /> {copy.downloadSandboxRunnerPreflightJson}
          </a>
        ) : null}
        {sandboxRunnerPreflightMarkdownLink ? (
          <a href={sandboxRunnerPreflightMarkdownLink.href} download={sandboxRunnerPreflightMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadSandboxRunnerPreflightMarkdown}
          </a>
        ) : null}
        {sandboxRunnerLink ? (
          <a href={sandboxRunnerLink.href} download={sandboxRunnerLink.fileName}>
            <Download size={15} /> {copy.downloadSandboxRunnerJson}
          </a>
        ) : null}
        {sandboxRunnerMarkdownLink ? (
          <a href={sandboxRunnerMarkdownLink.href} download={sandboxRunnerMarkdownLink.fileName}>
            <Download size={15} /> {copy.downloadSandboxRunnerMarkdown}
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

      {dispatchManifest ? (
        <CodingAgentDispatchManifestReport
          manifest={dispatchManifest}
          archive={dispatchArchive}
          archiveAudit={dispatchArchiveAudit}
          simulation={dispatchSimulation}
          runnerManifest={runnerManifest}
          runnerInvocation={runnerInvocation}
          runnerIntake={runnerIntake}
          runnerSelfTest={runnerSelfTest}
          sandboxRunnerPreflight={sandboxRunnerPreflight}
          sandboxRunnerReport={sandboxRunnerReport}
          copy={copy}
        />
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

function CodingAgentDispatchManifestReport({
  manifest,
  archive,
  archiveAudit,
  simulation,
  runnerManifest,
  runnerInvocation,
  runnerIntake,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  copy
}: {
  manifest: CodingAgentDispatchManifest;
  archive: CodingAgentDispatchArchive | null;
  archiveAudit: CodingAgentDispatchArchiveAudit | null;
  simulation: CodingAgentDispatchSimulation | null;
  runnerManifest: CodingAgentRunnerManifest | null;
  runnerInvocation: CodingAgentRunnerInvocationPackage | null;
  runnerIntake: CodingAgentRunnerIntakeAudit | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  copy: CodingAgentBriefsCopy;
}) {
  const heldItem = firstHeldDispatchItem(manifest.items);
  const visibleItem = heldItem || manifest.items[0];

  return (
    <div className="coding-dispatch-manifest" data-decision={manifest.decision}>
      <div>
        <strong>{copy.dispatchDecision}: {copy.dispatchDecisionLabel(manifest.decision)}</strong>
        <span>
          {copy.dispatchSummary(manifest.summary.ready, manifest.summary.held, manifest.summary.promptFiles)}
        </span>
      </div>
      <div>
        <strong>{copy.receiptTemplate}: {copy.dispatchReceiptTemplate(manifest.summary.receiptTemplates)}</strong>
        <span>{copy.evidencePrefix}: {visibleItem?.evidenceArtifactPrefix || "output/coding-agent/"}</span>
      </div>
      {archive ? (
        <div>
          <strong>{copy.dispatchArchive}: {copy.dispatchArchiveSummary(
            archive.summary.files,
            archive.summary.promptFiles,
            archive.summary.totalBytes
          )}</strong>
          <span>{copy.dispatchUnassignedHeld(archive.summary.unassignedHeldItems)}</span>
        </div>
      ) : null}
      {archiveAudit ? (
        <div>
          <strong>{copy.dispatchArchiveAudit}: {copy.dispatchAuditDecisionLabel(archiveAudit.decision)}</strong>
          <span>{copy.dispatchAuditSummary(
            archiveAudit.summary.passed,
            archiveAudit.summary.warnings,
            archiveAudit.summary.blockers
          )}</span>
        </div>
      ) : null}
      {simulation ? (
        <div>
          <strong>{copy.dispatchSimulation}: {copy.dispatchSimulationDecisionLabel(simulation.decision)}</strong>
          <span>{copy.dispatchSimulationSummary(
            simulation.summary.readyForAgent,
            simulation.summary.held,
            simulation.summary.blocked
          )}</span>
        </div>
      ) : null}
      {runnerManifest ? (
        <div>
          <strong>{copy.runnerManifest}: {copy.runnerManifestDecisionLabel(runnerManifest.decision)}</strong>
          <span>{copy.runnerManifestSummary(
            runnerManifest.summary.readyTasks,
            runnerManifest.summary.runnerTasks,
            runnerManifest.summary.blockedTasks
          )}</span>
        </div>
      ) : null}
      {runnerInvocation ? (
        <div>
          <strong>{copy.runnerInvocation}: {copy.runnerInvocationDecisionLabel(runnerInvocation.decision)}</strong>
          <span>{copy.runnerInvocationSummary(
            runnerInvocation.summary.readyInvocations,
            runnerInvocation.summary.invocationFiles,
            runnerInvocation.summary.blockedInvocations
          )}</span>
        </div>
      ) : null}
      {runnerIntake ? (
        <div>
          <strong>{copy.runnerIntake}: {copy.runnerIntakeDecisionLabel(runnerIntake.decision)}</strong>
          <span>{copy.runnerIntakeSummary(
            runnerIntake.summary.acceptedIntakes,
            runnerIntake.summary.invocationFiles,
            runnerIntake.summary.blockedIntakes
          )}</span>
        </div>
      ) : null}
      {runnerSelfTest ? (
        <div>
          <strong>{copy.runnerSelfTest}: {copy.runnerSelfTestDecisionLabel(runnerSelfTest.decision)}</strong>
          <span>{copy.runnerSelfTestSummary(
            runnerSelfTest.summary.wouldRun,
            runnerSelfTest.summary.notExecutedCommands,
            runnerSelfTest.summary.blocked
          )}</span>
        </div>
      ) : null}
      {sandboxRunnerPreflight ? (
        <div>
          <strong>
            {copy.sandboxRunnerPreflight}: {copy.sandboxRunnerPreflightDecisionLabel(sandboxRunnerPreflight.decision)}
          </strong>
          <span>{copy.sandboxRunnerPreflightSummary(
            sandboxRunnerPreflight.summary.readyTasks,
            sandboxRunnerPreflight.summary.heldTasks,
            sandboxRunnerPreflight.summary.blockedTasks,
            sandboxRunnerPreflight.summary.expectedProcessExecutions
          )}</span>
        </div>
      ) : null}
      {sandboxRunnerReport ? (
        <div>
          <strong>{copy.sandboxRunner}: {copy.sandboxRunnerDecisionLabel(sandboxRunnerReport.decision)}</strong>
          <span>{copy.sandboxRunnerSummary(
            sandboxRunnerReport.summary.executedTasks,
            sandboxRunnerReport.summary.processExecutions,
            sandboxRunnerReport.summary.commandResults
          )}</span>
        </div>
      ) : null}
      {heldItem ? (
        <p>
          <b>{heldItem.title}</b>
          <span>{heldItem.dispatchStatus}</span>
          <small>{copy.dispatchNextAction}: {heldItem.nextAction}</small>
        </p>
      ) : (
        <p>
          <span>{copy.dispatchReady}</span>
          {visibleItem ? (
            <small>
              {copy.executor}: {visibleItem.executorProfileId} / {copy.allowedActions(visibleItem.allowedActions.length)}
            </small>
          ) : null}
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

function firstHeldDispatchItem(items: CodingAgentDispatchManifestItem[]) {
  return items.find((item) => item.dispatchStatus !== "ready-to-dispatch") || null;
}
