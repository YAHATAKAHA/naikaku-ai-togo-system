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
  providerStatus?: "dry-run" | "skipped" | "called" | "failed";
  providerDetail?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export type AutomationActionStatus = "allowed" | "needs-approval" | "blocked";
export type AutomationApprovalDecision = "approved" | "rejected";

export interface AutomationAction {
  id: string;
  runId: string;
  stageId: CabinetStageId;
  roleId: string;
  executorProfileId: ExecutorProfileId;
  title: string;
  action: string;
  target: string;
  riskLevel: RiskLevel;
  status: AutomationActionStatus;
  approvalRequired: boolean;
  reason: string;
  auditTags: string[];
}

export interface AutomationApprovalRecord {
  id: string;
  runId: string;
  actionId: string;
  decision: AutomationApprovalDecision;
  decidedAt: string;
  decidedBy: string;
  reason: string;
  actionSnapshot: AutomationAction;
}

export interface ExecutorHandoffAction extends AutomationAction {
  approvalRecordId?: string;
  handoffStatus: "ready";
}

export interface ExecutorHandoff {
  id: string;
  runId: string;
  createdAt: string;
  readyActions: ExecutorHandoffAction[];
  heldActions: AutomationAction[];
  approvalRecords: AutomationApprovalRecord[];
}

export type ExecutorRunMode = "dry-run";
export type ExecutorRunStepStatus = "simulated" | "skipped";

export interface ExecutorRunStep {
  id: string;
  handoffId: string;
  actionId: string;
  executorProfileId: ExecutorProfileId;
  action: string;
  target: string;
  status: ExecutorRunStepStatus;
  startedAt: string;
  completedAt: string;
  output: string;
  auditTags: string[];
}

export interface ExecutorRun {
  id: string;
  handoffId: string;
  runId: string;
  mode: ExecutorRunMode;
  startedAt: string;
  completedAt: string;
  steps: ExecutorRunStep[];
  summary: {
    ready: number;
    simulated: number;
    held: number;
  };
}

export type TeamPackageStatus = "template" | "ready" | "needs-approval" | "blocked";

export interface TeamWorkPackage {
  id: string;
  roleId: string;
  roleName: string;
  ministry: string;
  stageId: CabinetStageId;
  mission: string;
  status: TeamPackageStatus;
  provider: ProviderConfig;
  executorProfileId: ExecutorProfileId;
  permissions: RolePermissions;
  objectives: string[];
  tasks: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  deliverables: string[];
  securityNotes: string[];
  automationActionIds: string[];
  sourceRunId?: string;
  generatedAt: string;
}

export interface TeamHandoff {
  schema: "naikaku.team-handoff.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  packages: TeamWorkPackage[];
  summary: {
    roles: number;
    ready: number;
    needsApproval: number;
    blocked: number;
    templates: number;
    tracks: string[];
  };
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
  automationActions?: AutomationAction[];
  logs: CabinetLogEntry[];
  score: CabinetScore;
  nextIteration: string[];
}

export interface CabinetWorkspace {
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
  mission: string;
}

export interface RunHistoryItem {
  id: string;
  mission: string;
  completedAt: string;
  decision: CabinetScore["decision"];
  overall: number;
  source: "gateway" | "fallback" | "local";
}

export type CabinetRunMode = "dry-run" | "live";
