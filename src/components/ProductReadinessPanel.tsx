import { AlertTriangle, CheckCircle2, Download, Gauge, ShieldCheck } from "lucide-react";
import type { ProductReadinessGate, ProductReadinessReport } from "../domain/types";

interface ProductReadinessPanelProps {
  report: ProductReadinessReport;
  exportLink: { href: string; fileName: string } | null;
  onExport: () => void;
}

export function ProductReadinessPanel({
  report,
  exportLink,
  onExport
}: ProductReadinessPanelProps) {
  return (
    <section className="readiness-panel" data-decision={report.decision}>
      <div className="panel-heading">
        <span>
          <Gauge size={15} /> Product readiness
        </span>
        <strong>{report.score}/100</strong>
      </div>

      <div className="readiness-summary" aria-label="Product readiness summary">
        <span data-status={report.decision}>{decisionLabel(report.decision)}</span>
        <span data-status="pass">{report.summary.passed} passed</span>
        <span data-status="warn">{report.summary.warnings} warnings</span>
        <span data-status="block">{report.summary.blockers} blockers</span>
      </div>

      <div className="readiness-export-row">
        <span>{report.runId ? "Run-linked release gate" : "Workspace release gate"}</span>
        <button type="button" onClick={onExport} disabled={!report.gates.length}>
          <Download size={15} /> Export report
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
      </div>

      <div className="readiness-gate-list">
        {report.gates.map((gate) => (
          <ReadinessGateCard gate={gate} key={gate.id} />
        ))}
      </div>
    </section>
  );
}

function ReadinessGateCard({ gate }: { gate: ProductReadinessGate }) {
  const Icon = gate.status === "pass" ? CheckCircle2 : gate.status === "warn" ? AlertTriangle : ShieldCheck;

  return (
    <article className="readiness-gate-card" data-status={gate.status}>
      <div className="readiness-gate-heading">
        <div>
          <strong>{gate.label}</strong>
          <span>{categoryLabel(gate.category)}</span>
        </div>
        <small>
          <Icon size={13} /> {gate.status}
        </small>
      </div>
      <p>{gate.summary}</p>
      <div className="readiness-evidence">
        {gate.evidence.slice(0, 3).map((item) => (
          <span key={`${gate.id}-${item}`}>{item}</span>
        ))}
      </div>
      <small>{gate.nextAction}</small>
    </article>
  );
}

function decisionLabel(decision: ProductReadinessReport["decision"]) {
  if (decision === "ship-ready") return "ship ready";
  if (decision === "needs-review") return "needs review";
  return "blocked";
}

function categoryLabel(category: ProductReadinessGate["category"]) {
  if (category === "role-api") return "role API";
  if (category === "parallel-development") return "parallel dev";
  return category;
}
