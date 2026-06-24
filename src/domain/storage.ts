import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import type { CabinetRole, CabinetRun, CabinetWorkspace, RunHistoryItem } from "./types";

const WORKSPACE_KEY = "naikaku.workspace.v1";
const RUN_HISTORY_KEY = "naikaku.run-history.v1";
const MAX_HISTORY_ITEMS = 12;

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

export function serializeWorkspace(workspace: CabinetWorkspace) {
  return JSON.stringify(
    {
      schema: "naikaku.workspace.v1",
      exportedAt: new Date().toISOString(),
      workspace: stripUnsafeSecrets(workspace)
    },
    null,
    2
  );
}

export function parseWorkspaceExport(raw: string): CabinetWorkspace {
  const parsed = JSON.parse(raw) as unknown;
  const workspace: CabinetWorkspace = isWorkspaceEnvelope(parsed)
    ? parsed.workspace
    : (parsed as CabinetWorkspace);
  const defaults = createDefaultWorkspace();

  return {
    ...defaults,
    ...workspace,
    roles: mergeRoles(workspace.roles || []),
    sandboxPolicy: {
      ...defaults.sandboxPolicy,
      ...(workspace.sandboxPolicy || {})
    },
    mission: workspace.mission || defaults.mission
  };
}

function isWorkspaceEnvelope(
  value: unknown
): value is { workspace: CabinetWorkspace } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "workspace" in value &&
      (value as { workspace?: unknown }).workspace
  );
}

export function loadRunHistory(): RunHistoryItem[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(RUN_HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RunHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

export function addRunHistoryItem(
  run: CabinetRun,
  source: RunHistoryItem["source"],
  currentHistory = loadRunHistory()
) {
  const nextItem: RunHistoryItem = {
    id: run.id,
    mission: run.mission,
    completedAt: run.completedAt,
    decision: run.score.decision,
    overall: run.score.overall,
    source
  };
  const nextHistory = [
    nextItem,
    ...currentHistory.filter((item) => item.id !== run.id)
  ].slice(0, MAX_HISTORY_ITEMS);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(nextHistory));
  }

  return nextHistory;
}

export function clearRunHistory() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(RUN_HISTORY_KEY);
  }
  return [];
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
