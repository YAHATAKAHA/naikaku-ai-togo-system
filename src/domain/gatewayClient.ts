import type {
  AutomationAction,
  CabinetRun,
  CabinetRunMode,
  CabinetWorkspace,
  ProviderConfig
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

export async function checkGatewayHealth() {
  const response = await fetch(`${gatewayBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error(`Gateway health check failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<{
    ok: boolean;
    service: string;
    capabilities: string[];
    timestamp: string;
  }>;
}
