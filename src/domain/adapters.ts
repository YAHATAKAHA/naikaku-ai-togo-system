import type { CabinetArtifact, CabinetRole, ProviderConfig } from "./types";

export interface AdapterInvokeInput {
  role: CabinetRole;
  mission: string;
  context: CabinetArtifact[];
  sessionSecret?: string;
}

export interface AdapterInvokeResult {
  text: string;
  tokensUsed: number;
  latencyMs: number;
  raw?: unknown;
}

export interface CabinetModelAdapter {
  id: string;
  label: string;
  matches(config: ProviderConfig): boolean;
  testConnection(config: ProviderConfig, sessionSecret?: string): Promise<boolean>;
  invoke(input: AdapterInvokeInput): Promise<AdapterInvokeResult>;
}

export const mockModelAdapter: CabinetModelAdapter = {
  id: "mock-local",
  label: "Mock local adapter",
  matches: () => true,
  async testConnection(config) {
    return Boolean(config.endpoint && config.model);
  },
  async invoke(input) {
    return {
      text: `${input.role.name} processed "${input.mission}" with ${input.context.length} prior artifacts.`,
      tokensUsed: 320 + input.context.length * 48,
      latencyMs: 80
    };
  }
};

export const adapterRegistry: CabinetModelAdapter[] = [mockModelAdapter];

export function findAdapter(config: ProviderConfig) {
  return adapterRegistry.find((adapter) => adapter.matches(config)) || mockModelAdapter;
}
