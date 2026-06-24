export type ProviderKind =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "google"
  | "local"
  | "custom";

export type CabinetStageId =
  | "intake"
  | "planning"
  | "execution"
  | "critique"
  | "supervision"
  | "scoring"
  | "iteration";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ExecutorProfileId =
  | "browser-sandbox"
  | "desktop-vm"
  | "shell-container"
  | "mcp-proxy"
  | "human-approval";

export interface RolePermissions {
  canUseBrowser: boolean;
  canUseShell: boolean;
  canUseFiles: boolean;
  canSendNetworkRequests: boolean;
  requiresApprovalForHighImpact: boolean;
}

export interface ProviderConfig {
  provider: ProviderKind;
  endpoint: string;
  model: string;
  apiKeyAlias: string;
  temperature: number;
  maxTokens: number;
}

export interface CabinetRole {
  id: string;
  name: string;
  ministry: string;
  mandate: string;
  stage: CabinetStageId;
  provider: ProviderConfig;
  systemPrompt: string;
  permissions: RolePermissions;
  enabled: boolean;
  riskLevel: RiskLevel;
  executorProfileId: ExecutorProfileId;
}

export interface SandboxPolicy {
  defaultExecutorProfileId: ExecutorProfileId;
  networkAllowlist: string[];
  fileAllowlist: string[];
  blockedActions: string[];
  requireHumanApproval: boolean;
  killSwitchArmed: boolean;
  maxRunMinutes: number;
}

export interface ExecutorProfile {
  id: ExecutorProfileId;
  label: string;
  purpose: string;
  isolation: string;
  controls: string[];
}

export interface CabinetStageDefinition {
  id: CabinetStageId;
  label: string;
  ownerRoleId: string;
  objective: string;
}

export interface CabinetArtifact {
  id: string;
  stageId: CabinetStageId;
  roleId: string;
  title: string;
  body: string;
  riskLevel: RiskLevel;
  scoreImpact: number;
}

export interface CabinetLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "success" | "error";
  message: string;
}

export interface CabinetScore {
  readiness: number;
  safety: number;
  execution: number;
  critique: number;
  overall: number;
  decision: "ship" | "revise" | "block";
}

export interface CabinetRun {
  id: string;
  mission: string;
  startedAt: string;
  completedAt: string;
  artifacts: CabinetArtifact[];
  logs: CabinetLogEntry[];
  score: CabinetScore;
  nextIteration: string[];
}

export interface CabinetWorkspace {
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
  mission: string;
}
