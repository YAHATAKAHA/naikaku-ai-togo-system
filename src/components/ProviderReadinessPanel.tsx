import { useState } from "react";
import { Copy, Download, PlugZap, RefreshCw } from "lucide-react";
import type {
  ProviderConfig,
  ProviderKind,
  ProviderReadinessMatrix,
  ProviderReadinessRow,
} from "../domain/types";
import type { ProviderReadinessCopy } from "../i18n";

interface ProviderReadinessPanelProps {
  copy: ProviderReadinessCopy;
  matrix: ProviderReadinessMatrix;
  sessionSecrets: Record<string, string>;
  testingRoleIds: string[];
  isTestingAll: boolean;
  exportLink: { href: string; fileName: string } | null;
  onProviderConfigChange: (
    roleId: string,
    patch: Partial<ProviderConfig>,
  ) => void;
  onSecretChange: (roleId: string, value: string) => void;
  onTestRole: (row: ProviderReadinessRow) => void;
  onTestAll: () => void;
  onExport: () => void;
}

const providerOptions: ProviderKind[] = [
  "openai",
  "anthropic",
  "openrouter",
  "aliyun",
  "google",
  "local",
  "custom",
];

interface ProviderSetupTemplate {
  provider: ProviderKind;
  endpoint: string;
  model: string;
  apiKeyAlias: string;
}

const providerTemplates: Record<ProviderKind, ProviderSetupTemplate> = {
  openai: {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    model: "gpt-5.4",
    apiKeyAlias: "NAIKAKU_OPENAI_API_KEY",
  },
  anthropic: {
    provider: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4.5",
    apiKeyAlias: "NAIKAKU_ANTHROPIC_API_KEY",
  },
  openrouter: {
    provider: "openrouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-5.4",
    apiKeyAlias: "NAIKAKU_OPENROUTER_API_KEY",
  },
  aliyun: {
    provider: "aliyun",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "",
    apiKeyAlias: "NAIKAKU_ALIYUN_API_KEY",
  },
  google: {
    provider: "google",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-2.5-pro",
    apiKeyAlias: "NAIKAKU_GOOGLE_API_KEY",
  },
  local: {
    provider: "local",
    endpoint: "http://127.0.0.1:11434/v1/chat/completions",
    model: "",
    apiKeyAlias: "",
  },
  custom: {
    provider: "custom",
    endpoint: "",
    model: "",
    apiKeyAlias: "NAIKAKU_CUSTOM_API_KEY",
  },
};

export function ProviderReadinessPanel({
  copy,
  matrix,
  sessionSecrets,
  testingRoleIds,
  isTestingAll,
  exportLink,
  onProviderConfigChange,
  onSecretChange,
  onTestRole,
  onTestAll,
  onExport,
}: ProviderReadinessPanelProps) {
  const [quickSetup, setQuickSetup] = useState<ProviderSetupTemplate>(() => {
    const firstEnabled =
      matrix.rows.find((row) => row.enabled) || matrix.rows[0];
    return firstEnabled
      ? {
          provider: firstEnabled.provider,
          endpoint: firstEnabled.endpoint,
          model: firstEnabled.model,
          apiKeyAlias: firstEnabled.apiKeyAlias,
        }
      : providerTemplates.openai;
  });
  const enabledRows = matrix.rows.filter((row) => row.enabled);
  const quickSetupValid =
    Boolean(quickSetup.endpoint.trim() && quickSetup.model.trim()) &&
    (isSecretOptional(quickSetup.provider) ||
      isEnvAlias(quickSetup.apiKeyAlias));

  function chooseQuickProvider(provider: ProviderKind) {
    setQuickSetup(providerTemplates[provider]);
  }

  function applyQuickSetup() {
    for (const row of enabledRows) {
      onProviderConfigChange(row.roleId, quickSetup);
    }
  }

  return (
    <section className="provider-panel">
      <div className="panel-heading">
        <span>
          <PlugZap size={15} /> {copy.title}
        </span>
        <strong>
          {copy.summary(matrix.summary.ready, matrix.summary.enabled)}
        </strong>
      </div>

      <div className="provider-summary" aria-label="Provider readiness summary">
        <span data-status="ready">{copy.ready(matrix.summary.ready)}</span>
        <span data-status="unchecked">
          {copy.unchecked(matrix.summary.unchecked)}
        </span>
        <span data-status="missing">
          {copy.missing(
            matrix.summary.missingConfig + matrix.summary.missingSecret,
          )}
        </span>
        <span data-status="failed">{copy.failed(matrix.summary.failed)}</span>
      </div>

      <p className="provider-secret-boundary">{copy.secretBoundary}</p>

      <section className="provider-quick-setup">
        <div>
          <strong>{copy.quickSetupTitle}</strong>
          <p>{copy.quickSetupBody}</p>
        </div>
        <div className="provider-config-grid provider-quick-setup-grid">
          <label>
            <span>{copy.provider}</span>
            <select
              value={quickSetup.provider}
              onChange={(event) =>
                chooseQuickProvider(event.target.value as ProviderKind)
              }
            >
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.model}</span>
            <input
              value={quickSetup.model}
              onChange={(event) =>
                setQuickSetup((current) => ({
                  ...current,
                  model: event.target.value,
                }))
              }
            />
          </label>
          <label className="provider-config-wide">
            <span>{copy.endpoint}</span>
            <input
              value={quickSetup.endpoint}
              onChange={(event) =>
                setQuickSetup((current) => ({
                  ...current,
                  endpoint: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>{copy.apiKeyAlias}</span>
            <input
              value={quickSetup.apiKeyAlias}
              onChange={(event) =>
                setQuickSetup((current) => ({
                  ...current,
                  apiKeyAlias: event.target.value,
                }))
              }
            />
          </label>
          <button
            type="button"
            onClick={applyQuickSetup}
            disabled={!enabledRows.length || !quickSetupValid}
          >
            <Copy size={15} /> {copy.quickSetupApply(enabledRows.length)}
          </button>
        </div>
      </section>

      <div className="provider-export-row">
        <span>{copy.matrix(matrix.rows.length)}</span>
        <button
          type="button"
          onClick={onTestAll}
          disabled={!matrix.rows.length || testingRoleIds.length > 0}
        >
          <RefreshCw size={15} />{" "}
          {isTestingAll ? copy.checkingAll : copy.checkAll}
        </button>
        <button type="button" onClick={onExport} disabled={!matrix.rows.length}>
          <Download size={15} /> {copy.export}
        </button>
        {exportLink ? (
          <a href={exportLink.href} download={exportLink.fileName}>
            <Download size={15} /> {copy.downloadJson}
          </a>
        ) : null}
      </div>

      <div className="provider-row-list">
        {matrix.rows.map((row) => {
          const isTesting = testingRoleIds.includes(row.roleId);

          return (
            <article
              className="provider-row"
              data-status={row.status}
              key={row.roleId}
            >
              <div className="provider-row-heading">
                <div>
                  <strong>{row.roleName}</strong>
                  <span>
                    {row.provider}/{row.model || copy.noModel}
                  </span>
                </div>
                <StatusChip copy={copy} row={row} />
              </div>
              <div className="provider-row-meta">
                <span>{row.apiKeyAlias || copy.noAlias}</span>
                <span>
                  {row.secretReady ? copy.secretReady : copy.secretPending}
                </span>
                <span>{copy.source(row.source)}</span>
              </div>
              <div className="provider-config-grid">
                <label>
                  <span>{copy.provider}</span>
                  <select
                    value={row.provider}
                    onChange={(event) =>
                      onProviderConfigChange(row.roleId, {
                        provider: event.target.value as ProviderKind,
                      })
                    }
                  >
                    {providerOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{copy.model}</span>
                  <input
                    value={row.model}
                    onChange={(event) =>
                      onProviderConfigChange(row.roleId, {
                        model: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="provider-config-wide">
                  <span>{copy.endpoint}</span>
                  <input
                    value={row.endpoint}
                    onChange={(event) =>
                      onProviderConfigChange(row.roleId, {
                        endpoint: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>{copy.apiKeyAlias}</span>
                  <input
                    value={row.apiKeyAlias}
                    onChange={(event) =>
                      onProviderConfigChange(row.roleId, {
                        apiKeyAlias: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>{copy.testSecret}</span>
                  <input
                    autoComplete="off"
                    type="password"
                    value={sessionSecrets[row.roleId] || ""}
                    onChange={(event) =>
                      onSecretChange(row.roleId, event.target.value)
                    }
                  />
                </label>
              </div>
              <p>{copy.message(row.status, row.source, row.message)}</p>
              <div className="provider-row-actions">
                <small>{row.endpoint || copy.noEndpoint}</small>
                <button
                  type="button"
                  onClick={() => onTestRole(row)}
                  disabled={isTesting}
                >
                  <RefreshCw size={14} />{" "}
                  {isTesting ? copy.checking : copy.check}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function isSecretOptional(provider: ProviderKind) {
  return provider === "local" || provider === "custom";
}

function isEnvAlias(alias: string) {
  return /^[A-Z][A-Z0-9_]*$/.test(alias.trim());
}

function StatusChip({
  copy,
  row,
}: {
  copy: ProviderReadinessCopy;
  row: ProviderReadinessRow;
}) {
  return (
    <span className="provider-status-chip" data-status={row.status}>
      {copy.status(row.status)}
    </span>
  );
}
