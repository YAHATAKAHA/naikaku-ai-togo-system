import { defaultRoles } from "../data/defaultCabinet";
import { completeRoleDataAccessPolicy, defaultRoleDataAccessPolicy } from "./dataAccessPolicy";
import type { CabinetRole } from "./types";

const defaultRoleIds = new Set(defaultRoles.map((role) => role.id));

const customRoleDefaults: CabinetRole = {
  id: "custom-minister",
  name: "Custom Minister",
  ministry: "Custom Function",
  mandate: "Own a specialized cabinet function with its own provider, permissions, and delivery evidence.",
  stage: "execution",
  provider: {
    provider: "custom",
    endpoint: "http://localhost:8787/v1/custom-role",
    model: "custom-model",
    apiKeyAlias: "NAIKAKU_CUSTOM_ROLE_API_KEY",
    temperature: 0.25,
    maxTokens: 1600
  },
  systemPrompt:
    "You are a specialized cabinet minister. Keep your work bounded, auditable, and aligned with the cabinet mission.",
  permissions: {
    canUseBrowser: false,
    canUseShell: false,
    canUseFiles: false,
    canSendNetworkRequests: false,
    requiresApprovalForHighImpact: true
  },
  dataAccess: defaultRoleDataAccessPolicy,
  enabled: true,
  riskLevel: "medium",
  executorProfileId: "browser-sandbox"
};

export function isDefaultRoleId(roleId: string) {
  return defaultRoleIds.has(roleId);
}

export function createCustomRole({
  roles,
  sourceRole
}: {
  roles: CabinetRole[];
  sourceRole?: CabinetRole;
}): CabinetRole {
  const source = sourceRole ? completeRole(sourceRole) : customRoleDefaults;
  const id = uniqueRoleId(sourceRole ? `${source.id}-copy` : customRoleDefaults.id, roles);
  const name = sourceRole ? `${source.name} Copy` : customRoleDefaults.name;

  return completeRole({
    ...source,
    id,
    name,
    enabled: true,
    provider: {
      ...source.provider,
      apiKeyAlias: uniqueApiKeyAlias(source.provider.apiKeyAlias, roles, Boolean(sourceRole))
    }
  });
}

export function completeRole(role: Partial<CabinetRole> & { id?: string }): CabinetRole {
  const fallback =
    role.id && isDefaultRoleId(role.id)
      ? defaultRoles.find((defaultRole) => defaultRole.id === role.id) || customRoleDefaults
      : customRoleDefaults;

  return {
    ...fallback,
    ...role,
    id: role.id || fallback.id,
    provider: {
      ...fallback.provider,
      ...(role.provider || {})
    },
    permissions: {
      ...fallback.permissions,
      ...(role.permissions || {})
    },
    dataAccess: completeRoleDataAccessPolicy({
      ...fallback.dataAccess,
      ...(role.dataAccess || {})
    })
  };
}

function uniqueRoleId(baseId: string, roles: CabinetRole[]) {
  const base = slugify(baseId) || customRoleDefaults.id;
  const existing = new Set(roles.map((role) => role.id));

  if (!existing.has(base)) {
    return base;
  }

  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function uniqueApiKeyAlias(alias: string, roles: CabinetRole[], duplicate: boolean) {
  const base = normalizeAlias(alias || customRoleDefaults.provider.apiKeyAlias);
  const candidate = duplicate ? `${base}_COPY` : base;
  const existing = new Set(roles.map((role) => role.provider.apiKeyAlias));

  if (!existing.has(candidate)) {
    return candidate;
  }

  let index = 2;
  while (existing.has(`${candidate}_${index}`)) {
    index += 1;
  }
  return `${candidate}_${index}`;
}

function normalizeAlias(alias: string) {
  return alias
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase() || customRoleDefaults.provider.apiKeyAlias;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
