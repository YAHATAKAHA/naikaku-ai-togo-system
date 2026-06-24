import { Ban, CheckCircle2, CirclePause, ShieldCheck, XCircle } from "lucide-react";
import type { AutomationAction } from "../domain/types";

export type AutomationDecision = "approved" | "rejected";

interface AutomationQueueProps {
  actions: AutomationAction[];
  decisions: Record<string, AutomationDecision>;
  onDecision: (actionId: string, decision: AutomationDecision) => void;
}

export function AutomationQueue({
  actions,
  decisions,
  onDecision
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

      <div className="queue-list">
        {actions.length ? (
          actions.map((action) => (
            <AutomationRow
              key={action.id}
              action={action}
              decision={decisions[action.id]}
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
  decision,
  onDecision
}: {
  action: AutomationAction;
  decision?: AutomationDecision;
  onDecision: (actionId: string, decision: AutomationDecision) => void;
}) {
  const finalStatus = decision || action.status;

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
        <small>
          {action.executorProfileId} / {action.action} / {action.target}
        </small>
      </div>
      {action.status === "needs-approval" && !decision ? (
        <div className="queue-actions">
          <button type="button" onClick={() => onDecision(action.id, "approved")}>
            Approve
          </button>
          <button type="button" onClick={() => onDecision(action.id, "rejected")}>
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

function statusLabel(status: AutomationAction["status"] | AutomationDecision) {
  return status === "needs-approval" ? "approval" : status;
}
