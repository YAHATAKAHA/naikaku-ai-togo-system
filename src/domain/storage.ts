import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import type { CabinetRole, CabinetWorkspace } from "./types";

const WORKSPACE_KEY = "naikaku.workspace.v1";

export function createDefaultWorkspace(): CabinetWorkspace {
  return {
    roles: defaultRoles,
    sandboxPolicy: defaultSandboxPolicy,
    mission: defaultMission
  };
}

export function loadWorkspace(): CabinetWorkspace {
  if (typeof localStorage === "undefined") {
    return createDefaultWorkspace();
  }

  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (!raw) {
    return createDefaultWorkspace();
  }

  try {
    const parsed = JSON.parse(raw) as CabinetWorkspace;
    return {
      ...createDefaultWorkspace(),
      ...parsed,
      roles: mergeRoles(parsed.roles || [])
    };
  } catch {
    return createDefaultWorkspace();
  }
}

export function saveWorkspace(workspace: CabinetWorkspace) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(stripUnsafeSecrets(workspace)));
}

export function stripUnsafeSecrets(workspace: CabinetWorkspace): CabinetWorkspace {
  return {
    ...workspace,
    roles: workspace.roles.map((role) => ({
      ...role,
      provider: {
        ...role.provider,
        apiKeyAlias: role.provider.apiKeyAlias.trim()
      }
    }))
  };
}

function mergeRoles(savedRoles: CabinetRole[]) {
  const savedById = new Map(savedRoles.map((role) => [role.id, role]));
  return defaultRoles.map((role) => ({
    ...role,
    ...(savedById.get(role.id) || {}),
    provider: {
      ...role.provider,
      ...(savedById.get(role.id)?.provider || {})
    },
    permissions: {
      ...role.permissions,
      ...(savedById.get(role.id)?.permissions || {})
    }
  }));
}
