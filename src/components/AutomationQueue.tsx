import { Ban, CheckCircle2, CirclePause, ShieldCheck, XCircle } from "lucide-react";
import type {
  AutomationAction,
  AutomationApprovalDecision,
  AutomationApprovalRecord,
  ExecutorRun
} from "../domain/types";

interface AutomationQueueProps {
  actions: AutomationAction[];
  approvalRecords: Record<string, AutomationApprovalRecord>;
  readyCount: number;
  handoffLink: { href: string; fileName: string } | null;
  evidenceLink: { href: string; fileName: string } | null;
  executorRun: ExecutorRun | null;
  executorRunning: boolean;
  onDecision: (action: AutomationAction, decision: AutomationApprovalDecision) => void;
  onExportHandoff: () => void;
  onExportEvidence: () => void;
  onRunExecutor: () => void;
}

export function AutomationQueue({
  actions,
  approvalRecords,
  readyCount,
  handoffLink,
  evidenceLink,
  executorRun,
  executorRunning,
  onDecision,
  onExportHandoff,
  onExportEvidence,
  onRunExecutor
}: AutomationQueueProps) {
  const counts = actions.reduce(
    (next, action) => ({
      allowed: next.allowed + (action.status === "allowed" ? 1 : 0),
      approval: next.approval + (action.status === "needs-approval" ? 1 : 0),
      blocked: next.blocked + (action.status === "blocked" ? 1 : 0)
    }),
    { allowed: 0, approval: 0, blocked: 0 }
  );

  return (
    <section className="automation-panel">
      <div className="panel-heading">
        <span>
          <ShieldCheck size={15} /> Automation queue
        </span>
        <strong>{actions.length ? `${actions.length} proposed` : "waiting"}</strong>
      </div>

      <div className="queue-summary" aria-label="Automation queue summary">
        <span data-status="allowed">{counts.allowed} allowed</span>
        <span data-status="needs-approval">{counts.approval} approval</span>
        <span data-status="blocked">{counts.blocked} blocked</span>
      </div>

      {actions.length ? (
        <div className="handoff-strip">
          <span>{readyCount} executor-ready actions</span>
          <button type="button" onClick={onExportHandoff}>
            Export handoff
          </button>
          <button type="button" onClick={onRunExecutor} disabled={executorRunning || readyCount === 0}>
            {executorRunning ? "Running..." : "Run dry-run"}
          </button>
          {handoffLink ? (
            <a href={handoffLink.href} download={handoffLink.fileName}>
              Download JSON
            </a>
          ) : null}
        </div>
      ) : null}

      {executorRun ? (
        <div className="executor-result">
          <div className="executor-result-heading">
            <strong>{executorRun.summary.simulated} simulated</strong>
            <span>{executorRun.summary.evidenceItems} evidence</span>
            <button type="button" onClick={onExportEvidence}>
              Export evidence
            </button>
            {evidenceLink ? (
              <a href={evidenceLink.href} download={evidenceLink.fileName}>
                Download JSON
              </a>
            ) : null}
          </div>
          <div className="executor-step-list">
            {executorRun.steps.map((step) => (
              <article key={step.id} className="executor-step">
                <strong>{step.executorProfileId}</strong>
                <p>{step.output}</p>
                <small>
                  {step.action} / {step.target} / {step.evidence.length} evidence / {step.evidenceHash}
                </small>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="queue-list">
        {actions.length ? (
          actions.map((action) => (
            <AutomationRow
              key={action.id}
              action={action}
              approvalRecord={approvalRecords[action.id]}
              onDecision={onDecision}
            />
          ))
        ) : (
          <p className="queue-empty">Run the cabinet to prepare sandbox action proposals.</p>
        )}
      </div>
    </section>
  );
}

function AutomationRow({
  action,
  approvalRecord,
  onDecision
}: {
  action: AutomationAction;
  approvalRecord?: AutomationApprovalRecord;
  onDecision: (action: AutomationAction, decision: AutomationApprovalDecision) => void;
}) {
  const finalStatus = approvalRecord?.decision || action.status;

  return (
    <article className="queue-row" data-status={finalStatus}>
      <div className="queue-icon">
        {finalStatus === "allowed" || finalStatus === "approved" ? <CheckCircle2 size={16} /> : null}
        {finalStatus === "needs-approval" ? <CirclePause size={16} /> : null}
        {finalStatus === "blocked" ? <Ban size={16} /> : null}
        {finalStatus === "rejected" ? <XCircle size={16} /> : null}
      </div>
      <div className="queue-copy">
        <div>
          <strong>{action.title}</strong>
          <span>{statusLabel(finalStatus)}</span>
        </div>
        <p>{action.reason}</p>
        {approvalRecord ? (
          <em>
            {approvalRecord.decision} by {approvalRecord.decidedBy} at{" "}
            {new Date(approvalRecord.decidedAt).toLocaleTimeString()}
          </em>
        ) : null}
        <small>
          {action.executorProfileId} / {action.action} / {action.target}
        </small>
      </div>
      {action.status === "needs-approval" && !approvalRecord ? (
        <div className="queue-actions">
          <button type="button" onClick={() => onDecision(action, "approved")}>
            Approve
          </button>
          <button type="button" onClick={() => onDecision(action, "rejected")}>
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

function statusLabel(status: AutomationAction["status"] | AutomationApprovalDecision) {
  return status === "needs-approval" ? "approval" : status;
}
