import type {
  AutomationAction,
  AutomationApprovalRecord,
  AutomationRunbook,
  CabinetRun,
  CabinetRunMode,
  CabinetWorkspace,
  DevelopmentIssueDrafts,
  DevelopmentWorkItem,
  ExecutorEvidenceBundle,
  ExecutorHandoff,
  ExecutorRun,
  MemoryEntry,
  ProviderConfig,
  ProviderReadinessMatrix,
  ProductReadinessReport,
  RoleWorkspaceScaffolds,
  TeamHandoff
} from "./types";

const DEFAULT_GATEWAY_URL = "http://127.0.0.1:8787";

export interface GatewayRunResult {
  run: CabinetRun;
  source: "gateway" | "fallback";
}

export interface ProviderTestResult {
  ok: boolean;
  provider?: string;
  model?: string;
  endpoint?: string;
  secretReady?: boolean;
  message: string;
}

export interface GatewayHealth {
  ok: boolean;
  service: string;
  capabilities: string[];
  runnerAuth?: {
    mode: "development-open" | "token-required";
    configured: boolean;
    acceptedHeaders: string[];
    runnerIdRequired: boolean;
    warning?: string;
  };
  timestamp: string;
}

export interface LedgerSummary {
  schema: "naikaku.ledger-summary.v1";
  ledgerDir: string;
  approvals: number;
  evidenceBundles: number;
  updatedAt: string;
}

export interface ApprovalLedgerQuery {
  schema: "naikaku.approval-ledger-query.v1";
  runId: string | null;
  records: AutomationApprovalRecord[];
}

export interface EvidenceLedgerQuery {
  schema: "naikaku.evidence-ledger-query.v1";
  runId: string | null;
  executorRunId: string | null;
  bundles: ExecutorEvidenceBundle[];
  gatewayRunnerId?: string;
  authMode?: string;
}

export function gatewayBaseUrl() {
  const fromEnv = import.meta.env.VITE_NAIKAKU_GATEWAY_URL as string | undefined;
  return (fromEnv || DEFAULT_GATEWAY_URL).replace(/\/$/, "");
}

export async function runCabinetViaGateway(
  workspace: CabinetWorkspace,
  mode: CabinetRunMode,
  signal?: AbortSignal
): Promise<GatewayRunResult> {
  const response = await fetch(`${gatewayBaseUrl()}/v1/cabinet/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...workspace, mode }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway run failed with HTTP ${response.status}`);
  }

  return {
    run: (await response.json()) as CabinetRun,
    source: "gateway"
  };
}

export async function testProviderViaGateway(
  provider: ProviderConfig,
  sessionSecret?: string
): Promise<ProviderTestResult> {
  const response = await fetch(`${gatewayBaseUrl()}/v1/provider/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ provider, sessionSecret })
  });
  const payload = (await response.json()) as ProviderTestResult;

  if (!response.ok) {
    return {
      ok: false,
      provider: payload.provider || "unknown",
      message: payload.message || `Gateway provider test failed with HTTP ${response.status}.`
    };
  }

  return payload;
}

export async function planAutomationViaGateway(
  run: CabinetRun,
  workspace: CabinetWorkspace,
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/automation/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      run,
      roles: workspace.roles,
      sandboxPolicy: workspace.sandboxPolicy
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway automation plan failed with HTTP ${response.status}`);
  }

  return (await response.json()) as Promise<{ actions: AutomationAction[] }>;
}

export async function createAutomationRunbookViaGateway(
  run: CabinetRun,
  approvalRecords: AutomationApprovalRecord[],
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/automation/runbook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      run,
      approvalRecords
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway automation runbook failed with HTTP ${response.status}`);
  }

  return (await response.json()) as AutomationRunbook;
}

export async function createExecutorHandoffViaGateway(
  run: CabinetRun,
  approvalRecords: AutomationApprovalRecord[],
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/executor/handoff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      run,
      approvalRecords
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway executor handoff failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ExecutorHandoff;
}

export async function runExecutorHandoffViaGateway(
  handoff: ExecutorHandoff,
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/executor/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ handoff }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway executor run failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ExecutorRun;
}

export async function createExecutorEvidenceViaGateway(
  executorRun: ExecutorRun,
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/executor/evidence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ executorRun }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway executor evidence failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ExecutorEvidenceBundle & {
    stored?: boolean;
    gatewayRunnerId?: string;
    authMode?: string;
  };
}

export async function saveApprovalRecordViaGateway(
  record: AutomationApprovalRecord,
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/ledger/approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ record }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway approval ledger failed with HTTP ${response.status}`);
  }

  return (await response.json()) as Promise<{
    ok: boolean;
    stored: boolean;
    record: AutomationApprovalRecord;
  }>;
}

export async function getLedgerSummaryViaGateway(signal?: AbortSignal) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/ledger/status`, { signal });

  if (!response.ok) {
    throw new Error(`Gateway ledger status failed with HTTP ${response.status}`);
  }

  return (await response.json()) as LedgerSummary;
}

export async function listApprovalLedgerViaGateway(
  runId?: string,
  signal?: AbortSignal
) {
  const query = runId ? `?runId=${encodeURIComponent(runId)}` : "";
  const response = await fetch(`${gatewayBaseUrl()}/v1/ledger/approvals${query}`, { signal });

  if (!response.ok) {
    throw new Error(`Gateway approval ledger failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ApprovalLedgerQuery;
}

export async function listEvidenceLedgerViaGateway(
  runId?: string,
  signal?: AbortSignal
) {
  const query = runId ? `?runId=${encodeURIComponent(runId)}` : "";
  const response = await fetch(`${gatewayBaseUrl()}/v1/ledger/evidence${query}`, { signal });

  if (!response.ok) {
    throw new Error(`Gateway evidence ledger failed with HTTP ${response.status}`);
  }

  return (await response.json()) as EvidenceLedgerQuery;
}

export async function createTeamHandoffViaGateway(
  workspace: CabinetWorkspace,
  run?: CabinetRun | null,
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/team/packages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ workspace, run }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway team packages failed with HTTP ${response.status}`);
  }

  return (await response.json()) as TeamHandoff;
}

export async function createRoleWorkspaceScaffoldsViaGateway(
  workspace: CabinetWorkspace,
  run?: CabinetRun | null,
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/team/workspaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ workspace, run }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway role workspace scaffolds failed with HTTP ${response.status}`);
  }

  return (await response.json()) as RoleWorkspaceScaffolds;
}

export async function createProductReadinessViaGateway(
  workspace: CabinetWorkspace,
  providerReadiness: ProviderReadinessMatrix,
  run?: CabinetRun | null,
  approvalRecords: AutomationApprovalRecord[] = [],
  memoryEntries: MemoryEntry[] = [],
  savedItems: DevelopmentWorkItem[] = [],
  auditEvents: unknown[] = [],
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/product/readiness`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workspace,
      providerReadiness,
      run,
      approvalRecords,
      memoryEntries,
      savedItems,
      auditEvents
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway product readiness failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ProductReadinessReport;
}

export async function createDevelopmentIssuesViaGateway(
  workspace: CabinetWorkspace,
  run?: CabinetRun | null,
  memoryEntries: MemoryEntry[] = [],
  savedItems: DevelopmentWorkItem[] = [],
  signal?: AbortSignal
) {
  const response = await fetch(`${gatewayBaseUrl()}/v1/development/issues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workspace,
      run,
      memoryEntries,
      savedItems
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Gateway development issue drafts failed with HTTP ${response.status}`);
  }

  return (await response.json()) as DevelopmentIssueDrafts;
}

export async function checkGatewayHealth() {
  const response = await fetch(`${gatewayBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error(`Gateway health check failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<GatewayHealth>;
}
