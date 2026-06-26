import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildExecutorHandoff } from "./automation";
import { serializeAutomationRunbook } from "./automationRunbook";
import { appendAuditEvent as appendAuditEventRecord, serializeAuditEvents } from "./auditLog";
import { serializeDevelopmentBoard } from "./developmentBoard";
import { serializeDevelopmentIssueDrafts, serializeDevelopmentIssueGhScript } from "./developmentIssues";
import { serializeExecutorEvidenceBundle } from "./executorRunner";
import { serializeMemoryEntries } from "./memory";
import { serializeProviderReadinessMatrix } from "./providerReadiness";
import { serializeProductReadinessReport } from "./productReadiness";
import { serializeProductReleaseBundle, serializeProductReleaseNotes } from "./productReleaseBundle";
import { serializeReleaseRehearsalReport } from "./releaseRehearsal";
import { serializeRoleWorkspaceScaffoldScript, serializeRoleWorkspaceScaffolds } from "./roleWorkspaceScaffolds";
import { completeRole, isDefaultRoleId } from "./roles";
import type {
  AutomationApprovalRecord,
  AutomationRunbook,
  AuditEvent,
  CabinetRole,
  CabinetRun,
  CabinetWorkspace,
  DevelopmentBoard,
  DevelopmentIssueDrafts,
  DevelopmentWorkItem,
  ExecutorEvidenceBundle,
  MemoryEntry,
  ProviderReadinessMatrix,
  ProviderReadinessRow,
  ProductReadinessReport,
  ProductReleaseBundle,
  ReleaseRehearsalReport,
  RoleWorkspaceScaffolds,
  RunHistoryItem
} from "./types";

const WORKSPACE_KEY = "naikaku.workspace.v1";
const RUN_HISTORY_KEY = "naikaku.run-history.v1";
const CURRENT_RUN_KEY = "naikaku.current-run.v1";
const APPROVAL_RECORDS_KEY = "naikaku.approval-records.v1";
const AUDIT_EVENTS_KEY = "naikaku.audit-events.v1";
const MEMORY_ENTRIES_KEY = "naikaku.memory-entries.v1";
const DEVELOPMENT_ITEMS_KEY = "naikaku.development-items.v1";
const PROVIDER_READINESS_KEY = "naikaku.provider-readiness.v1";
const MAX_HISTORY_ITEMS = 12;

export function createDefaultWorkspace(): CabinetWorkspace {
  return {
    roles: defaultRoles,
    sandboxPolicy: defaultSandboxPolicy,
    mission: defaultMission
  };
}

export function loadWorkspace(): CabinetWorkspace {
  if (!canUseLocalStorage()) {
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
  if (!canUseLocalStorage()) {
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
  if (!canUseLocalStorage()) {
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

  if (canUseLocalStorage()) {
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(nextHistory));
  }

  return nextHistory;
}

export function loadCurrentRun(): CabinetRun | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const raw = localStorage.getItem(CURRENT_RUN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CabinetRun;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCurrentRun(run: CabinetRun) {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(CURRENT_RUN_KEY, JSON.stringify(run));
}

export function clearCurrentRun() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(CURRENT_RUN_KEY);
  }
}

export function clearRunHistory() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(RUN_HISTORY_KEY);
  }
  return [];
}

export function loadApprovalRecords(runId?: string): AutomationApprovalRecord[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(APPROVAL_RECORDS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AutomationApprovalRecord[];
    const records = Array.isArray(parsed) ? parsed : [];
    return runId ? records.filter((record) => record.runId === runId) : records;
  } catch {
    return [];
  }
}

export function saveApprovalRecord(
  record: AutomationApprovalRecord,
  currentRecords = loadApprovalRecords()
) {
  const nextRecords = [
    record,
    ...currentRecords.filter(
      (candidate) =>
        candidate.runId !== record.runId || candidate.actionId !== record.actionId
    )
  ];

  if (canUseLocalStorage()) {
    localStorage.setItem(APPROVAL_RECORDS_KEY, JSON.stringify(nextRecords));
  }

  return nextRecords;
}

export function clearApprovalRecords(runId?: string) {
  if (!canUseLocalStorage()) {
    return [];
  }

  if (!runId) {
    localStorage.removeItem(APPROVAL_RECORDS_KEY);
    return [];
  }

  const nextRecords = loadApprovalRecords().filter((record) => record.runId !== runId);
  localStorage.setItem(APPROVAL_RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function loadAuditEvents(): AuditEvent[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(AUDIT_EVENTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AuditEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAuditEvent(
  event: AuditEvent,
  currentEvents = loadAuditEvents()
) {
  const nextEvents = appendAuditEventRecord(currentEvents, event);

  if (canUseLocalStorage()) {
    localStorage.setItem(AUDIT_EVENTS_KEY, JSON.stringify(nextEvents));
  }

  return nextEvents;
}

export function clearAuditEvents() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(AUDIT_EVENTS_KEY);
  }
  return [];
}

export function serializeAuditLog(events: AuditEvent[]) {
  return serializeAuditEvents(events);
}

export function loadMemoryEntries(): MemoryEntry[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(MEMORY_ENTRIES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as MemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemoryEntry(
  entry: MemoryEntry,
  currentEntries = loadMemoryEntries()
) {
  const nextEntries = [
    entry,
    ...currentEntries.filter((candidate) => candidate.id !== entry.id)
  ];

  if (canUseLocalStorage()) {
    localStorage.setItem(MEMORY_ENTRIES_KEY, JSON.stringify(nextEntries));
  }

  return nextEntries;
}

export function clearMemoryEntries() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(MEMORY_ENTRIES_KEY);
  }
  return [];
}

export function serializeMemoryLog(entries: MemoryEntry[]) {
  return serializeMemoryEntries(entries);
}

export function loadDevelopmentItems(): DevelopmentWorkItem[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(DEVELOPMENT_ITEMS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as DevelopmentWorkItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDevelopmentWorkItem(
  item: DevelopmentWorkItem,
  currentItems = loadDevelopmentItems()
) {
  const nextItems = [
    item,
    ...currentItems.filter((candidate) => candidate.id !== item.id)
  ];

  if (canUseLocalStorage()) {
    localStorage.setItem(DEVELOPMENT_ITEMS_KEY, JSON.stringify(nextItems));
  }

  return nextItems;
}

export function clearDevelopmentItems() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(DEVELOPMENT_ITEMS_KEY);
  }
  return [];
}

export function serializeDevelopmentBoardExport(board: DevelopmentBoard) {
  return serializeDevelopmentBoard(board);
}

export function serializeDevelopmentIssueDraftsExport(drafts: DevelopmentIssueDrafts) {
  return serializeDevelopmentIssueDrafts(drafts);
}

export function serializeDevelopmentIssueGhScriptExport(drafts: DevelopmentIssueDrafts) {
  return serializeDevelopmentIssueGhScript(drafts);
}

export function serializeRoleWorkspaceScaffoldsExport(scaffolds: RoleWorkspaceScaffolds) {
  return serializeRoleWorkspaceScaffolds(scaffolds);
}

export function serializeRoleWorkspaceScaffoldScriptExport(scaffolds: RoleWorkspaceScaffolds) {
  return serializeRoleWorkspaceScaffoldScript(scaffolds);
}

export function serializeProductReadinessExport(report: ProductReadinessReport) {
  return serializeProductReadinessReport(report);
}

export function serializeProductReleaseBundleExport(bundle: ProductReleaseBundle) {
  return serializeProductReleaseBundle(bundle);
}

export function serializeProductReleaseNotesExport(bundle: ProductReleaseBundle) {
  return serializeProductReleaseNotes(bundle);
}

export function serializeReleaseRehearsalExport(report: ReleaseRehearsalReport) {
  return serializeReleaseRehearsalReport(report);
}

export function loadProviderReadinessRows(): ProviderReadinessRow[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(PROVIDER_READINESS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ProviderReadinessRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProviderReadinessRow(
  row: ProviderReadinessRow,
  currentRows = loadProviderReadinessRows()
) {
  const nextRows = [
    row,
    ...currentRows.filter((candidate) => candidate.roleId !== row.roleId)
  ];

  if (canUseLocalStorage()) {
    localStorage.setItem(PROVIDER_READINESS_KEY, JSON.stringify(nextRows));
  }

  return nextRows;
}

export function clearProviderReadinessRows() {
  if (canUseLocalStorage()) {
    localStorage.removeItem(PROVIDER_READINESS_KEY);
  }
  return [];
}

export function serializeProviderReadinessExport(matrix: ProviderReadinessMatrix) {
  return serializeProviderReadinessMatrix(matrix);
}

export function serializeExecutorEvidenceExport(bundle: ExecutorEvidenceBundle) {
  return serializeExecutorEvidenceBundle(bundle);
}

export function serializeAutomationRunbookExport(runbook: AutomationRunbook) {
  return serializeAutomationRunbook(runbook);
}

export function serializeRunBundle(
  run: CabinetRun,
  approvalRecords: AutomationApprovalRecord[]
) {
  return JSON.stringify(
    {
      schema: "naikaku.run-bundle.v1",
      exportedAt: new Date().toISOString(),
      run,
      approvalRecords,
      executorHandoff: buildExecutorHandoff({
        run,
        approvalRecords
      })
    },
    null,
    2
  );
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
  const mergedDefaults = defaultRoles.map((role) =>
    completeRole({
      ...role,
      ...(savedById.get(role.id) || {})
    })
  );
  const customRoles = savedRoles
    .filter((role) => role.id && !isDefaultRoleId(role.id))
    .map((role) => completeRole(role));

  return [...mergedDefaults, ...customRoles];
}

function canUseLocalStorage() {
  return (
    typeof localStorage !== "undefined" &&
    typeof localStorage.getItem === "function" &&
    typeof localStorage.setItem === "function" &&
    typeof localStorage.removeItem === "function"
  );
}
