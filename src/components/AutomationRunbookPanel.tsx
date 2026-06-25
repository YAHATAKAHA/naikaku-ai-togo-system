import { ClipboardList, Download } from "lucide-react";
import type { AutomationRunbook, ExecutorProfileId } from "../domain/types";

interface AutomationRunbookPanelProps {
  runbook: AutomationRunbook;
  exportLink: { href: string; fileName: string } | null;
  onExport: () => void;
}

export function AutomationRunbookPanel({
  runbook,
  exportLink,
  onExport
}: AutomationRunbookPanelProps) {
  return (
    <section className="runbook-panel">
      <div className="panel-heading">
        <span>
          <ClipboardList size={15} /> Automation runbook
        </span>
        <strong>{runbook.summary.ready} runner steps</strong>
      </div>

      <div className="runbook-summary" aria-label="Automation runbook summary">
        <span data-status="ready">{runbook.summary.ready} ready</span>
        <span data-status="held">{runbook.summary.held} held</span>
        <span data-status="approval">{runbook.summary.approvalGated} approved</span>
        <span data-status="runner">{runnerMix(runbook)}</span>
      </div>

      <div className="runbook-export-row">
        <span>{runbook.runId ? "Runner handoff plan" : "Waiting for run"}</span>
        <button type="button" onClick={onExport} disabled={!runbook.steps.length}>
          <Download size={15} /> Export runbook
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> Download JSON
          </a>
        ) : null}
      </div>

      <div className="runbook-step-list">
        {runbook.steps.length ? (
          runbook.steps.map((step) => (
            <article className="runbook-step" data-profile={step.executorProfileId} key={step.id}>
              <div className="runbook-step-heading">
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.runnerId}</span>
                </div>
                <ProfileChip profileId={step.executorProfileId} />
              </div>

              <code>{step.command}</code>

              <div className="runbook-gate-grid">
                <GateList title="Evidence" items={step.evidenceRequired.slice(0, 3)} />
                <GateList title="Verify" items={step.verification.slice(0, 3)} />
              </div>

              <small>{step.target}</small>
            </article>
          ))
        ) : (
          <p className="runbook-empty">
            Approve or allow automation actions to prepare runner-ready steps.
          </p>
        )}
      </div>
    </section>
  );
}

function GateList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="runbook-gate-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ProfileChip({ profileId }: { profileId: ExecutorProfileId }) {
  return (
    <span className="runbook-profile-chip" data-profile={profileId}>
      {profileLabel(profileId)}
    </span>
  );
}

function profileLabel(profileId: ExecutorProfileId) {
  if (profileId === "shell-container") return "shell";
  if (profileId === "browser-sandbox") return "browser";
  if (profileId === "desktop-vm") return "desktop";
  if (profileId === "mcp-proxy") return "mcp";
  return "approval";
}

function runnerMix(runbook: AutomationRunbook) {
  const allEntries: Array<[string, number]> = [
    ["shell", runbook.summary.shell],
    ["browser", runbook.summary.browser],
    ["desktop", runbook.summary.desktop],
    ["mcp", runbook.summary.mcp],
    ["human", runbook.summary.human]
  ];
  const entries = allEntries.filter(([, count]) => count > 0);

  if (!entries.length) return "no runners";
  return entries.map(([label, count]) => `${count} ${label}`).join(" / ");
}
