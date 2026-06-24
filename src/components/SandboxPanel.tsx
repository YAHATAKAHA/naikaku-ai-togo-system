import { LockKeyhole, ServerCog } from "lucide-react";
import { executorProfiles } from "../data/defaultCabinet";
import type { ExecutorProfileId, SandboxPolicy } from "../domain/types";

interface SandboxPanelProps {
  policy: SandboxPolicy;
  onChange: (policy: SandboxPolicy) => void;
}

export function SandboxPanel({ policy, onChange }: SandboxPanelProps) {
  return (
    <section className="sandbox-panel">
      <div className="panel-heading">
        <span>
          <LockKeyhole size={15} /> Sandbox constitution
        </span>
        <strong>{policy.killSwitchArmed ? "kill switch armed" : "review required"}</strong>
      </div>
      <div className="sandbox-grid">
        <label>
          Default executor
          <select
            value={policy.defaultExecutorProfileId}
            onChange={(event) =>
              onChange({
                ...policy,
                defaultExecutorProfileId: event.target.value as ExecutorProfileId
              })
            }
          >
            {executorProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.label}</option>
            ))}
          </select>
        </label>
        <label>
          Max run minutes
          <input
            type="number"
            min="1"
            max="120"
            value={policy.maxRunMinutes}
            onChange={(event) => onChange({ ...policy, maxRunMinutes: Number(event.target.value) })}
          />
        </label>
        <label className="wide">
          Network allowlist
          <input
            value={policy.networkAllowlist.join(", ")}
            onChange={(event) =>
              onChange({
                ...policy,
                networkAllowlist: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
              })
            }
          />
        </label>
        <label className="wide">
          Blocked actions
          <input
            value={policy.blockedActions.join(", ")}
            onChange={(event) =>
              onChange({
                ...policy,
                blockedActions: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
              })
            }
          />
        </label>
      </div>
      <div className="executor-list">
        {executorProfiles.map((profile) => (
          <article key={profile.id} data-selected={policy.defaultExecutorProfileId === profile.id}>
            <ServerCog size={16} />
            <div>
              <strong>{profile.label}</strong>
              <p>{profile.purpose}</p>
              <span>{profile.isolation}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="guardrail-row">
        <label>
          <input
            type="checkbox"
            checked={policy.requireHumanApproval}
            onChange={(event) => onChange({ ...policy, requireHumanApproval: event.target.checked })}
          />
          Human approval for high-impact actions
        </label>
        <label>
          <input
            type="checkbox"
            checked={policy.killSwitchArmed}
            onChange={(event) => onChange({ ...policy, killSwitchArmed: event.target.checked })}
          />
          Global kill switch armed
        </label>
      </div>
    </section>
  );
}
