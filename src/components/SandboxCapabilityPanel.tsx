import { MonitorCog, ShieldCheck } from "lucide-react";
import type {
  SandboxCapabilityAction,
  SandboxCapabilityCard,
  SandboxCapabilityRegistry
} from "../domain/types";

interface SandboxCapabilityPanelProps {
  registry: SandboxCapabilityRegistry;
}

export function SandboxCapabilityPanel({ registry }: SandboxCapabilityPanelProps) {
  return (
    <section className="capability-panel">
      <div className="panel-heading">
        <span>
          <MonitorCog size={15} /> Sandbox capabilities
        </span>
        <strong>{registry.summary.rolesCovered} roles covered</strong>
      </div>

      <div className="capability-summary" aria-label="Sandbox capability summary">
        <span data-status="ready">{registry.summary.dryRunReady} dry-run</span>
        <span data-status="approval">{registry.summary.needsApproval} gated</span>
        <span data-status="blocked">{registry.summary.blocked} blocked</span>
        <span data-status="ready">{registry.summary.passedReadinessChecks} checks pass</span>
        <span data-status="approval">{registry.summary.warningReadinessChecks} checks warn</span>
        <span data-status="blocked">{registry.summary.blockedReadinessChecks} checks block</span>
        <span data-status="approval">{registry.summary.requiredApprovals} approvals</span>
        <span data-status="ready">{registry.summary.evidenceArtifacts} evidence</span>
        <span data-status={registry.summary.killSwitchArmed ? "ready" : "blocked"}>
          {registry.summary.killSwitchArmed ? "kill switch armed" : "kill switch open"}
        </span>
      </div>

      <div className="capability-card-list">
        {registry.cards.map((card) => (
          <CapabilityCard key={card.profileId} card={card} />
        ))}
      </div>
    </section>
  );
}

function CapabilityCard({ card }: { card: SandboxCapabilityCard }) {
  return (
    <article className="capability-card" data-status={card.status}>
      <div className="capability-card-heading">
        <div>
          <strong>{card.label}</strong>
          <span>{card.profileId}</span>
        </div>
        <StatusChip status={card.status} />
      </div>

      <p>{card.runnerContract}</p>

      <div className="capability-meta">
        <span>{card.rolesUsingProfile.length ? roleNames(card) : "no active role"}</span>
        <span>{card.runnerReadiness.supportedEvidenceArtifacts.join(" / ")}</span>
      </div>

      <div className="capability-action-list">
        {card.actions.map((action) => (
          <CapabilityActionRow key={`${card.profileId}-${action.action}`} action={action} />
        ))}
      </div>

      <div className="capability-check-list">
        {card.runnerReadiness.checks.slice(0, 3).map((check) => (
          <div key={`${card.profileId}-${check.id}`} className="capability-check-row" data-status={check.status}>
            <strong>{check.label}</strong>
            <span>{check.summary}</span>
          </div>
        ))}
      </div>

      <div className="capability-note-row">
        <ShieldCheck size={14} />
        <span>{card.runnerReadiness.nextAction}</span>
      </div>
    </article>
  );
}

function CapabilityActionRow({ action }: { action: SandboxCapabilityAction }) {
  return (
    <div className="capability-action-row" data-status={action.status}>
      <div>
        <strong>{action.label}</strong>
        <span>{action.action} / {action.riskLevel}</span>
      </div>
      <small>{statusLabel(action.status)}</small>
    </div>
  );
}

function StatusChip({ status }: { status: SandboxCapabilityCard["status"] }) {
  return (
    <span className="capability-status-chip" data-status={status}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  if (status === "dry-run-ready") return "dry-run";
  if (status === "needs-approval") return "approval";
  if (status === "pass") return "pass";
  if (status === "warn") return "warn";
  if (status === "block") return "block";
  return status;
}

function roleNames(card: SandboxCapabilityCard) {
  return card.rolesUsingProfile.map((role) => role.roleName).join(", ");
}
