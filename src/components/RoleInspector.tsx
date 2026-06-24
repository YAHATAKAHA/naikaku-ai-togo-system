import { useState } from "react";
import { CheckCircle2, PlugZap, Shield, TestTube2, XCircle } from "lucide-react";
import { executorProfiles } from "../data/defaultCabinet";
import { findAdapter } from "../domain/adapters";
import { testProviderViaGateway } from "../domain/gatewayClient";
import type { CabinetRole, ProviderKind } from "../domain/types";

interface RoleInspectorProps {
  role: CabinetRole | undefined;
  sessionSecret: string;
  onSecretChange: (value: string) => void;
  onChange: (patch: Partial<CabinetRole>) => void;
}

export function RoleInspector({
  role,
  sessionSecret,
  onSecretChange,
  onChange
}: RoleInspectorProps) {
  const [testState, setTestState] = useState<{
    status: "idle" | "testing" | "ok" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  if (!role) {
    return <aside className="inspector">No role selected.</aside>;
  }

  const currentRole = role;

  async function testConnection() {
    setTestState({ status: "testing", message: "Testing through local gateway..." });
    try {
      const result = await testProviderViaGateway(currentRole.provider, sessionSecret);
      setTestState({
        status: result.ok ? "ok" : "error",
        message: `${result.adapter}: ${result.message}`
      });
    } catch {
      const adapter = findAdapter(currentRole.provider);
      const ok = await adapter.testConnection(currentRole.provider, sessionSecret);
      setTestState({
        status: ok ? "ok" : "error",
        message: ok
          ? `${adapter.id}: local fallback accepted the structure.`
          : "Gateway unavailable and local fallback found missing endpoint or model."
      });
    }
  }

  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>Role inspector</span>
        <strong>{role.ministry}</strong>
      </div>

      <section className="inspector-section">
        <label>
          Role name
          <input value={role.name} onChange={(event) => onChange({ name: event.target.value })} />
        </label>
        <label>
          Mandate
          <textarea
            value={role.mandate}
            rows={3}
            onChange={(event) => onChange({ mandate: event.target.value })}
          />
        </label>
        <label>
          System prompt
          <textarea
            value={role.systemPrompt}
            rows={5}
            onChange={(event) => onChange({ systemPrompt: event.target.value })}
          />
        </label>
      </section>

      <section className="inspector-section">
        <div className="subheading">
          <PlugZap size={15} /> Provider API
        </div>
        <label>
          Provider
          <select
            value={role.provider.provider}
            onChange={(event) =>
              onChange({
                provider: {
                  ...role.provider,
                  provider: event.target.value as ProviderKind
                }
              })
            }
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
            <option value="google">Google</option>
            <option value="local">Local</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          Endpoint
          <input
            value={role.provider.endpoint}
            onChange={(event) =>
              onChange({ provider: { ...role.provider, endpoint: event.target.value } })
            }
          />
        </label>
        <label>
          Model
          <input
            value={role.provider.model}
            onChange={(event) =>
              onChange({ provider: { ...role.provider, model: event.target.value } })
            }
          />
        </label>
        <label>
          API key alias
          <input
            value={role.provider.apiKeyAlias}
            onChange={(event) =>
              onChange({ provider: { ...role.provider, apiKeyAlias: event.target.value } })
            }
          />
        </label>
        <label>
          Session secret
          <input
            type="password"
            value={sessionSecret}
            placeholder="Not saved"
            onChange={(event) => onSecretChange(event.target.value)}
          />
        </label>
        <div className="dual-input">
          <label>
            Temperature
            <input
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={role.provider.temperature}
              onChange={(event) =>
                onChange({
                  provider: { ...role.provider, temperature: Number(event.target.value) }
                })
              }
            />
          </label>
          <label>
            Max tokens
            <input
              type="number"
              min="256"
              step="128"
              value={role.provider.maxTokens}
              onChange={(event) =>
                onChange({
                  provider: { ...role.provider, maxTokens: Number(event.target.value) }
                })
              }
            />
          </label>
        </div>
        <button className="secondary-button full-width" type="button" onClick={testConnection}>
          <TestTube2 size={16} /> {testState.status === "testing" ? "Testing..." : "Test adapter"}
        </button>
        {testState.message ? (
          <div className="connection-result" data-status={testState.status}>
            {testState.status === "ok" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>{testState.message}</span>
          </div>
        ) : null}
      </section>

      <section className="inspector-section">
        <div className="subheading">
          <Shield size={15} /> Executor and permissions
        </div>
        <label>
          Executor profile
          <select
            value={role.executorProfileId}
            onChange={(event) =>
              onChange({ executorProfileId: event.target.value as CabinetRole["executorProfileId"] })
            }
          >
            {executorProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.label}</option>
            ))}
          </select>
        </label>
        <PermissionToggle
          label="Browser"
          checked={role.permissions.canUseBrowser}
          onChange={(checked) =>
            onChange({ permissions: { ...role.permissions, canUseBrowser: checked } })
          }
        />
        <PermissionToggle
          label="Shell"
          checked={role.permissions.canUseShell}
          onChange={(checked) =>
            onChange({ permissions: { ...role.permissions, canUseShell: checked } })
          }
        />
        <PermissionToggle
          label="Files"
          checked={role.permissions.canUseFiles}
          onChange={(checked) =>
            onChange({ permissions: { ...role.permissions, canUseFiles: checked } })
          }
        />
        <PermissionToggle
          label="Network"
          checked={role.permissions.canSendNetworkRequests}
          onChange={(checked) =>
            onChange({ permissions: { ...role.permissions, canSendNetworkRequests: checked } })
          }
        />
        <PermissionToggle
          label="Approval for high impact"
          checked={role.permissions.requiresApprovalForHighImpact}
          onChange={(checked) =>
            onChange({ permissions: { ...role.permissions, requiresApprovalForHighImpact: checked } })
          }
        />
      </section>
    </aside>
  );
}

function PermissionToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="permission-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
