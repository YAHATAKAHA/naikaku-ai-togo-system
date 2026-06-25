import { Download, PlugZap, RefreshCw } from "lucide-react";
import type {
  ProviderReadinessMatrix,
  ProviderReadinessRow
} from "../domain/types";

interface ProviderReadinessPanelProps {
  matrix: ProviderReadinessMatrix;
  testingRoleIds: string[];
  isTestingAll: boolean;
  exportLink: { href: string; fileName: string } | null;
  onTestRole: (row: ProviderReadinessRow) => void;
  onTestAll: () => void;
  onExport: () => void;
}

export function ProviderReadinessPanel({
  matrix,
  testingRoleIds,
  isTestingAll,
  exportLink,
  onTestRole,
  onTestAll,
  onExport
}: ProviderReadinessPanelProps) {
  return (
    <section className="provider-panel">
      <div className="panel-heading">
        <span>
          <PlugZap size={15} /> Provider readiness
        </span>
        <strong>{matrix.summary.ready}/{matrix.summary.enabled} ready</strong>
      </div>

      <div className="provider-summary" aria-label="Provider readiness summary">
        <span data-status="ready">{matrix.summary.ready} ready</span>
        <span data-status="unchecked">{matrix.summary.unchecked} unchecked</span>
        <span data-status="missing">{matrix.summary.missingConfig + matrix.summary.missingSecret} missing</span>
        <span data-status="failed">{matrix.summary.failed} failed</span>
      </div>

      <div className="provider-export-row">
        <span>Gateway {matrix.rows.length ? "matrix" : "empty"}</span>
        <button type="button" onClick={onTestAll} disabled={!matrix.rows.length || testingRoleIds.length > 0}>
          <RefreshCw size={15} /> {isTestingAll ? "Testing..." : "Test all"}
        </button>
        <button type="button" onClick={onExport} disabled={!matrix.rows.length}>
          <Download size={15} /> Export readiness
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
      </div>

      <div className="provider-row-list">
        {matrix.rows.map((row) => {
          const isTesting = testingRoleIds.includes(row.roleId);

          return (
            <article className="provider-row" data-status={row.status} key={row.roleId}>
              <div className="provider-row-heading">
                <div>
                  <strong>{row.roleName}</strong>
                  <span>{row.provider}/{row.model || "no-model"}</span>
                </div>
                <StatusChip row={row} />
              </div>
              <div className="provider-row-meta">
                <span>{row.apiKeyAlias || "no alias"}</span>
                <span>{row.secretReady ? "secret ready" : "secret pending"}</span>
                <span>{row.source}</span>
              </div>
              <p>{row.message}</p>
              <div className="provider-row-actions">
                <small>{row.endpoint || "No endpoint"}</small>
                <button type="button" onClick={() => onTestRole(row)} disabled={isTesting}>
                  <RefreshCw size={14} /> {isTesting ? "Testing" : "Test"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatusChip({ row }: { row: ProviderReadinessRow }) {
  const label = row.status === "missing-config"
    ? "config"
    : row.status === "missing-secret"
      ? "secret"
      : row.status;

  return (
    <span className="provider-status-chip" data-status={row.status}>
      {label}
    </span>
  );
}
