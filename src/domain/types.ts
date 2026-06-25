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

export type ProviderReadinessStatus =
  | "unchecked"
  | "ready"
  | "missing-config"
  | "missing-secret"
  | "failed";
export type ProviderReadinessSource = "static" | "gateway" | "local-fallback";

export interface ProviderReadinessRow {
  id: string;
  roleId: string;
  roleName: string;
  ministry: string;
  enabled: boolean;
  provider: ProviderKind;
  endpoint: string;
  model: string;
  apiKeyAlias: string;
  secretReady: boolean;
  status: ProviderReadinessStatus;
  source: ProviderReadinessSource;
  message: string;
  checkedAt?: string;
}

export interface ProviderReadinessMatrix {
  schema: "naikaku.provider-readiness.v1";
  generatedAt: string;
  rows: ProviderReadinessRow[];
  summary: {
    roles: number;
    ready: number;
    unchecked: number;
    missingConfig: number;
    missingSecret: number;
    failed: number;
    enabled: number;
  };
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

export type SandboxCapabilityStatus = "dry-run-ready" | "needs-approval" | "blocked";

export interface SandboxCapabilityAction {
  action: string;
  label: string;
  target: string;
  riskLevel: RiskLevel;
  status: AutomationActionStatus;
  approvalRequired: boolean;
  reason: string;
  auditTags: string[];
}

export interface SandboxCapabilityCard {
  profileId: ExecutorProfileId;
  label: string;
  purpose: string;
  isolation: string;
  controls: string[];
  runnerContract: string;
  evidenceRequired: string[];
  rolesUsingProfile: Array<{
    roleId: string;
    roleName: string;
  }>;
  actions: SandboxCapabilityAction[];
  status: SandboxCapabilityStatus;
  riskNotes: string[];
}

export interface SandboxCapabilityRegistry {
  schema: "naikaku.sandbox-capabilities.v1";
  generatedAt: string;
  cards: SandboxCapabilityCard[];
  summary: {
    profiles: number;
    rolesCovered: number;
    dryRunReady: number;
    needsApproval: number;
    blocked: number;
    approvalActions: number;
    blockedActions: number;
    killSwitchArmed: boolean;
  };
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

export interface AutomationRunbookStep {
  id: string;
  runId: string;
  actionId: string;
  stageId: CabinetStageId;
  roleId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  runnerId: string;
  command: string;
  target: string;
  riskLevel: RiskLevel;
  approvalRecordId?: string;
  preflight: string[];
  execution: string[];
  evidenceRequired: string[];
  verification: string[];
  rollback: string[];
  auditTags: string[];
}

export interface AutomationRunbook {
  schema: "naikaku.automation-runbook.v1";
  generatedAt: string;
  runId: string;
  handoffId: string;
  steps: AutomationRunbookStep[];
  heldActions: AutomationAction[];
  summary: {
    ready: number;
    held: number;
    approvalGated: number;
    shell: number;
    browser: number;
    desktop: number;
    mcp: number;
    human: number;
  };
}

export type ExecutorRunMode = "dry-run";
export type ExecutorRunStepStatus = "simulated" | "skipped";
export type ExecutorEvidenceKind =
  | "transcript"
  | "screenshot"
  | "artifact"
  | "approval"
  | "policy"
  | "network";

export interface ExecutorEvidenceItem {
  id: string;
  kind: ExecutorEvidenceKind;
  label: string;
  summary: string;
  uri?: string;
  checksum: string;
  createdAt: string;
  redacted: boolean;
  replayable: boolean;
}

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
  runnerId: string;
  evidence: ExecutorEvidenceItem[];
  evidenceHash: string;
  replayable: boolean;
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
    evidenceItems: number;
    replayableSteps: number;
  };
}

export interface ExecutorEvidenceBundle {
  schema: "naikaku.executor-evidence.v1";
  exportedAt: string;
  executorRunId: string;
  handoffId: string;
  runId: string;
  mode: ExecutorRunMode;
  steps: Array<{
    stepId: string;
    actionId: string;
    executorProfileId: ExecutorProfileId;
    runnerId: string;
    status: ExecutorRunStepStatus;
    evidenceHash: string;
    replayable: boolean;
    evidence: ExecutorEvidenceItem[];
  }>;
  summary: {
    steps: number;
    evidenceItems: number;
    replayableSteps: number;
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

export type DevelopmentWorkItemStatus = "todo" | "in-progress" | "blocked" | "done";
export type DevelopmentWorkItemPriority = "low" | "medium" | "high" | "critical";
export type DevelopmentWorkItemSource = "team-package" | "next-iteration" | "memory-entry";

export interface DevelopmentWorkItem {
  id: string;
  title: string;
  body: string;
  status: DevelopmentWorkItemStatus;
  priority: DevelopmentWorkItemPriority;
  source: DevelopmentWorkItemSource;
  sourceId: string;
  roleId?: string;
  roleName?: string;
  stageId?: CabinetStageId;
  runId?: string;
  generatedAt: string;
  updatedAt?: string;
  acceptanceCriteria: string[];
  deliverables: string[];
  tags: string[];
}

export interface DevelopmentBoard {
  schema: "naikaku.development-board.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  items: DevelopmentWorkItem[];
  summary: {
    total: number;
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
    highPriority: number;
    teams: number;
  };
}

export type AuditEventType =
  | "workspace.saved"
  | "workspace.imported"
  | "workspace.exported"
  | "workspace.reset"
  | "role.created"
  | "role.duplicated"
  | "role.deleted"
  | "cabinet.run.completed"
  | "automation.decision.recorded"
  | "automation.runbook.exported"
  | "executor.handoff.exported"
  | "executor.run.dry.completed"
  | "executor.evidence.exported"
  | "team.handoff.exported"
  | "memory.entry.accepted"
  | "memory.entry.rejected"
  | "memory.log.exported"
  | "development.item.status.changed"
  | "development.board.exported"
  | "provider.readiness.checked"
  | "provider.readiness.exported";

export type AuditEventSeverity = "info" | "success" | "warning" | "error";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  actor: string;
  severity: AuditEventSeverity;
  summary: string;
  runId?: string;
  roleId?: string;
  actionId?: string;
  metadata: Record<string, string | number | boolean | null>;
}

export type MemoryEntryKind = "lesson" | "decision" | "skill" | "risk" | "follow-up";
export type MemoryEntryStatus = "candidate" | "accepted" | "rejected";
export type MemoryRetention = "session" | "project" | "long-term";
export type MemoryConsentTag = "needs-review" | "operator-reviewed";
export type MemoryEntrySource = "artifact" | "automation" | "iteration" | "scoring";

export interface MemoryEntry {
  id: string;
  runId: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  status: MemoryEntryStatus;
  kind: MemoryEntryKind;
  title: string;
  body: string;
  source: MemoryEntrySource;
  retention: MemoryRetention;
  consentTag: MemoryConsentTag;
  tags: string[];
  sourceStageId?: CabinetStageId;
  sourceArtifactId?: string;
  sourceActionId?: string;
  metadata: Record<string, string | number | boolean | null>;
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
