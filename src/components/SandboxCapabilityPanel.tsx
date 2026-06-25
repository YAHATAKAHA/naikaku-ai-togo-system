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
        <span>{card.evidenceRequired.join(" / ")}</span>
      </div>

      <div className="capability-action-list">
        {card.actions.map((action) => (
          <CapabilityActionRow key={`${card.profileId}-${action.action}`} action={action} />
        ))}
      </div>

      <div className="capability-note-row">
        <ShieldCheck size={14} />
        <span>{card.riskNotes[0]}</span>
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

function statusLabel(status: SandboxCapabilityCard["status"] | SandboxCapabilityAction["status"]) {
  if (status === "dry-run-ready") return "dry-run";
  if (status === "needs-approval") return "approval";
  return status;
}

function roleNames(card: SandboxCapabilityCard) {
  return card.rolesUsingProfile.map((role) => role.roleName).join(", ");
}
