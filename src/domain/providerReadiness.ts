import type {
  CabinetRole,
  ProviderReadinessMatrix,
  ProviderReadinessRow,
  ProviderReadinessSource
} from "./types";

export interface BuildProviderReadinessMatrixInput {
  roles: CabinetRole[];
  sessionSecrets?: Record<string, string>;
  savedRows?: ProviderReadinessRow[];
  generatedAt?: string;
}

export interface ProviderReadinessCheckInput {
  row: ProviderReadinessRow;
  ok: boolean;
  message: string;
  secretReady?: boolean;
  source: Exclude<ProviderReadinessSource, "static">;
  checkedAt?: string;
}

export function buildProviderReadinessMatrix({
  roles,
  sessionSecrets = {},
  savedRows = [],
  generatedAt = new Date().toISOString()
}: BuildProviderReadinessMatrixInput): ProviderReadinessMatrix {
  const savedByRoleId = new Map(savedRows.map((row) => [row.roleId, row]));
  const rows = roles.map((role) =>
    mergeSavedRow(
      buildStaticRow({
        role,
        sessionSecret: sessionSecrets[role.id],
        generatedAt
      }),
      savedByRoleId.get(role.id)
    )
  );

  return {
    schema: "naikaku.provider-readiness.v1",
    generatedAt,
    rows,
    summary: summarizeRows(rows)
  };
}

export function createProviderReadinessCheck({
  row,
  ok,
  message,
  secretReady = row.secretReady,
  source,
  checkedAt = new Date().toISOString()
}: ProviderReadinessCheckInput): ProviderReadinessRow {
  return {
    ...row,
    status: source === "local-fallback"
      ? structuralStatus(row)
      : checkedStatus(row, ok, secretReady),
    source,
    message,
    secretReady,
    checkedAt
  };
}

export function serializeProviderReadinessMatrix(matrix: ProviderReadinessMatrix) {
  return JSON.stringify(matrix, null, 2);
}

function buildStaticRow({
  role,
  sessionSecret,
  generatedAt
}: {
  role: CabinetRole;
  sessionSecret?: string;
  generatedAt: string;
}): ProviderReadinessRow {
  const endpoint = role.provider.endpoint.trim();
  const model = role.provider.model.trim();
  const apiKeyAlias = role.provider.apiKeyAlias.trim();
  const sessionSecretProvided = Boolean(sessionSecret?.trim());
  const aliasValid = !apiKeyAlias || isEnvAlias(apiKeyAlias);
  const secretOptional = role.provider.provider === "local" || role.provider.provider === "custom";
  const sessionSecretReady = sessionSecretProvided && Boolean(apiKeyAlias) && aliasValid;
  const secretReady = sessionSecretReady || (secretOptional && !apiKeyAlias);

  if (!endpoint || !model) {
    return row(role, {
      generatedAt,
      endpoint,
      model,
      apiKeyAlias,
      secretReady: false,
      status: "missing-config",
      message: "Provider endpoint and model are required before this role can run."
    });
  }

  if (!aliasValid) {
    return row(role, {
      generatedAt,
      endpoint,
      model,
      apiKeyAlias,
      secretReady: false,
      status: "missing-secret",
      message: "API key alias must be an environment variable name, not a raw secret."
    });
  }

  if (sessionSecretProvided && !apiKeyAlias) {
    return row(role, {
      generatedAt,
      endpoint,
      model,
      apiKeyAlias,
      secretReady: false,
      status: "missing-secret",
      message: "Add a valid API key alias before using a session-only test secret."
    });
  }

  if (!apiKeyAlias && !secretOptional) {
    return row(role, {
      generatedAt,
      endpoint,
      model,
      apiKeyAlias,
      secretReady: false,
      status: "missing-secret",
      message: "Add a valid API key alias before this provider can be checked."
    });
  }

  return row(role, {
    generatedAt,
    endpoint,
    model,
    apiKeyAlias,
    secretReady,
    status: "unchecked",
    message: sessionSecretReady
      ? "Session-only test secret is available and will not be persisted. Live runs still require the same alias in the gateway environment."
      : secretReady
        ? "Configuration can be tested without a provider secret."
        : "Configuration is structurally complete; run a readiness test."
  });
}

function row(
  role: CabinetRole,
  input: Pick<
    ProviderReadinessRow,
    "endpoint" | "model" | "apiKeyAlias" | "secretReady" | "status" | "message"
  > & { generatedAt: string }
): ProviderReadinessRow {
  return {
    id: `${role.id}-provider-readiness`,
    roleId: role.id,
    roleName: role.name,
    ministry: role.ministry,
    enabled: role.enabled,
    provider: role.provider.provider,
    endpoint: input.endpoint,
    model: input.model,
    apiKeyAlias: input.apiKeyAlias,
    secretReady: input.secretReady,
    status: input.status,
    source: "static",
    message: input.message,
    checkedAt: input.generatedAt
  };
}

function mergeSavedRow(
  current: ProviderReadinessRow,
  saved?: ProviderReadinessRow
): ProviderReadinessRow {
  if (!saved) {
    return current;
  }

  const sameConfig =
    saved.provider === current.provider &&
    saved.endpoint === current.endpoint &&
    saved.model === current.model &&
    saved.apiKeyAlias === current.apiKeyAlias;

  if (!sameConfig) {
    return current;
  }

  return {
    ...current,
    status: saved.status,
    source: saved.source,
    message: saved.message,
    secretReady: saved.secretReady || current.secretReady,
    checkedAt: saved.checkedAt
  };
}

function checkedStatus(
  row: ProviderReadinessRow,
  ok: boolean,
  secretReady: boolean
): ProviderReadinessRow["status"] {
  if (row.status === "missing-config") return "missing-config";
  if (!ok && row.status === "missing-secret") return "missing-secret";
  if (ok && !secretReady) return "missing-secret";
  if (ok) return "ready";
  return "failed";
}

function structuralStatus(row: ProviderReadinessRow): ProviderReadinessRow["status"] {
  const secretOptional = row.provider === "local" || row.provider === "custom";

  if (!row.endpoint || !row.model) return "missing-config";
  if (row.apiKeyAlias && !isEnvAlias(row.apiKeyAlias)) return "missing-secret";
  if (!row.apiKeyAlias && !secretOptional) return "missing-secret";
  return "unchecked";
}

function summarizeRows(rows: ProviderReadinessRow[]): ProviderReadinessMatrix["summary"] {
  return rows.reduce<ProviderReadinessMatrix["summary"]>((summary, row) => ({
    roles: summary.roles + 1,
    ready: summary.ready + (row.status === "ready" ? 1 : 0),
    unchecked: summary.unchecked + (row.status === "unchecked" ? 1 : 0),
    missingConfig: summary.missingConfig + (row.status === "missing-config" ? 1 : 0),
    missingSecret: summary.missingSecret + (row.status === "missing-secret" ? 1 : 0),
    failed: summary.failed + (row.status === "failed" ? 1 : 0),
    enabled: summary.enabled + (row.enabled ? 1 : 0)
  }), {
    roles: 0,
    ready: 0,
    unchecked: 0,
    missingConfig: 0,
    missingSecret: 0,
    failed: 0,
    enabled: 0
  });
}

function isEnvAlias(alias: string) {
  return /^[A-Z][A-Z0-9_]*$/.test(alias);
}
