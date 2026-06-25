import { Database, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import type { LedgerSummary } from "../domain/gatewayClient";
import type { AutomationApprovalRecord, ExecutorEvidenceBundle } from "../domain/types";

type ServerLedgerStatus = "idle" | "loading" | "ready" | "error";

interface ServerLedgerPanelProps {
  status: ServerLedgerStatus;
  message: string;
  summary: LedgerSummary | null;
  approvals: AutomationApprovalRecord[];
  evidenceBundles: ExecutorEvidenceBundle[];
  evidenceMessage?: string;
  onRefresh: () => void;
}

export function ServerLedgerPanel({
  status,
  message,
  summary,
  approvals,
  evidenceBundles,
  evidenceMessage,
  onRefresh
}: ServerLedgerPanelProps) {
  const latestApprovals = approvals.slice(0, 3);
  const latestEvidence = evidenceBundles.slice(0, 3);

  return (
    <section className="ledger-panel" data-status={status}>
      <div className="panel-heading">
        <span>
          <Database size={15} /> Server ledger
        </span>
        <strong>{summary ? `${summary.approvals + summary.evidenceBundles} records` : status}</strong>
      </div>

      <div className="ledger-summary" aria-label="Server ledger summary">
        <span data-status="approval">{summary?.approvals ?? approvals.length} approvals</span>
        <span data-status={evidenceMessage ? "locked" : "evidence"}>
          {summary?.evidenceBundles ?? evidenceBundles.length} evidence
        </span>
        <span data-status={status}>{statusLabel(status)}</span>
      </div>

      <div className="ledger-refresh-row" data-status={status}>
        <span>{message}</span>
        <button type="button" onClick={onRefresh} disabled={status === "loading"}>
          <RefreshCw size={15} /> {status === "loading" ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {evidenceMessage ? (
        <p className="ledger-auth-note">{evidenceMessage}</p>
      ) : null}

      <div className="ledger-grid">
        <LedgerList
          title="Approval ledger"
          emptyText="No server approval records yet."
          hasRows={latestApprovals.length > 0}
        >
          {latestApprovals.map((record) => (
            <article className="ledger-row" data-status={record.decision} key={record.id}>
              <div>
                <strong>{record.actionSnapshot.title}</strong>
                <span>{record.decision} / {record.decidedBy}</span>
              </div>
              <p>{record.reason}</p>
              <small>
                {record.runId} / {new Date(record.decidedAt).toLocaleString()}
              </small>
            </article>
          ))}
        </LedgerList>

        <LedgerList
          title="Evidence ledger"
          emptyText="No server evidence bundles yet."
          hasRows={latestEvidence.length > 0}
        >
          {latestEvidence.map((bundle) => (
            <article className="ledger-row" data-status="evidence" key={bundle.executorRunId}>
              <div>
                <strong>{bundle.executorRunId}</strong>
                <span>{bundle.summary.evidenceItems} evidence</span>
              </div>
              <p>
                {bundle.summary.steps} steps / {bundle.summary.replayableSteps} replayable / {bundle.mode}
              </p>
              <small>
                {bundle.runId} / {new Date(bundle.exportedAt).toLocaleString()}
              </small>
            </article>
          ))}
        </LedgerList>
      </div>
    </section>
  );
}

function LedgerList({
  title,
  emptyText,
  hasRows,
  children
}: {
  title: string;
  emptyText: string;
  hasRows: boolean;
  children: ReactNode;
}) {
  return (
    <div className="ledger-list">
      <strong>{title}</strong>
      {hasRows ? children : <p className="ledger-empty">{emptyText}</p>}
    </div>
  );
}

function statusLabel(status: ServerLedgerStatus) {
  if (status === "ready") return "gateway";
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  return "manual";
}
