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

export type RoleWorkspaceFilePurpose = "readme" | "env-example" | "tasks" | "runner-notes" | "security";

export interface RoleWorkspaceFile {
  path: string;
  purpose: RoleWorkspaceFilePurpose;
  mode: "0644";
  content: string;
}

export interface RoleWorkspaceScaffold {
  id: string;
  packageId: string;
  roleId: string;
  roleName: string;
  ministry: string;
  rootPath: string;
  status: TeamPackageStatus;
  providerAlias: string;
  executorProfileId: ExecutorProfileId;
  files: RoleWorkspaceFile[];
  commands: string[];
  generatedAt: string;
}

export interface RoleWorkspaceScaffolds {
  schema: "naikaku.role-workspace-scaffolds.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  scaffolds: RoleWorkspaceScaffold[];
  summary: {
    roles: number;
    files: number;
    ready: number;
    needsApproval: number;
    blocked: number;
    templates: number;
    envFiles: number;
    runnerNotes: number;
  };
}

export type ProductReadinessCategory =
  | "role-api"
  | "automation"
  | "sandbox"
  | "parallel-development"
  | "evidence"
  | "memory";

export type ProductReadinessStatus = "pass" | "warn" | "block";
export type ProductReadinessDecision = "ship-ready" | "needs-review" | "blocked";

export interface ProductReadinessGate {
  id: string;
  category: ProductReadinessCategory;
  label: string;
  status: ProductReadinessStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export interface ProductReadinessReport {
  schema: "naikaku.product-readiness.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  decision: ProductReadinessDecision;
  score: number;
  gates: ProductReadinessGate[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    blockers: number;
    categories: ProductReadinessCategory[];
    categoriesReady: number;
  };
}

export type ProductReleaseBundleItemStatus = "included" | "missing" | "review-required";

export interface ProductReleaseBundleItem {
  id: string;
  label: string;
  schema: string;
  status: ProductReleaseBundleItemStatus;
  count: number;
  exportHint: string;
}

export interface ProductReleaseBundle {
  schema: "naikaku.product-release-bundle.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  readiness: {
    decision: ProductReadinessDecision;
    score: number;
    blockers: number;
    warnings: number;
  };
  contents: {
    workspace: CabinetWorkspace;
    run?: CabinetRun;
    providerReadiness: ProviderReadinessMatrix;
    productReadiness: ProductReadinessReport;
    automationRunbook?: AutomationRunbook;
    teamHandoff: TeamHandoff;
    roleWorkspaces: RoleWorkspaceScaffolds;
    developmentBoard: DevelopmentBoard;
    issueDrafts: DevelopmentIssueDrafts;
    approvalRecords: AutomationApprovalRecord[];
    auditEvents: AuditEvent[];
    memoryEntries: MemoryEntry[];
  };
  manifest: {
    items: ProductReleaseBundleItem[];
    operatorCommands: string[];
    handoffChecklist: string[];
    securityNotes: string[];
  };
  summary: {
    artifacts: number;
    missing: number;
    reviewRequired: number;
    roles: number;
    automationSteps: number;
    issueDrafts: number;
    workspaceFiles: number;
    auditEvents: number;
    memoryEntries: number;
  };
}

export type ReleaseRehearsalStatus = "pass" | "warn" | "block";
export type ReleaseRehearsalDecision = "release-ready" | "needs-review" | "blocked";
export type ReleaseRehearsalCategory =
  | "cabinet-run"
  | "role-api"
  | "automation"
  | "evidence"
  | "release"
  | "security"
  | "parallel-development";

export interface ReleaseRehearsalCheck {
  id: string;
  category: ReleaseRehearsalCategory;
  label: string;
  status: ReleaseRehearsalStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export type ReleaseRemediationPriority = "low" | "medium" | "high" | "critical";

export interface ReleaseRemediationItem {
  id: string;
  sourceCheckId: string;
  category: ReleaseRehearsalCategory;
  title: string;
  owner: string;
  priority: ReleaseRemediationPriority;
  status: "ready-to-assign";
  action: string;
  acceptanceCriteria: string[];
  verificationCommand: string;
}

export type ReleaseEvidenceClaimLevel = "dry-run" | "production";

export interface ReleaseEvidenceClaim {
  level: ReleaseEvidenceClaimLevel;
  claim: string;
  limitations: string[];
  productionRequirements: string[];
}

export interface ReleaseRehearsalReport {
  schema: "naikaku.release-rehearsal.v1";
  generatedAt: string;
  mission: string;
  runId: string;
  sourceRun: "provided" | "simulated";
  decision: ReleaseRehearsalDecision;
  score: number;
  evidenceClaim: ReleaseEvidenceClaim;
  checks: ReleaseRehearsalCheck[];
  remediation: {
    items: ReleaseRemediationItem[];
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  artifacts: {
    runId: string;
    releaseBundleSchema: ProductReleaseBundle["schema"];
    evidenceSchema: ExecutorEvidenceBundle["schema"];
    bundleBytes: number;
    notesBytes: number;
    roles: number;
    runnerSteps: number;
    heldActions: number;
    evidenceItems: number;
    issueDrafts: number;
    workspaceFiles: number;
  };
  summary: {
    total: number;
    passed: number;
    warnings: number;
    blockers: number;
    simulatedRun: boolean;
    secretLeakDetected: boolean;
    readyActions: number;
    heldActions: number;
    evidenceItems: number;
    releaseArtifacts: number;
  };
}

export type ReleaseVerificationStatus = "pass" | "fail";
export type ReleaseVerificationDecision = "verified" | "not-production-ready" | "invalid";
export type ReleaseVerificationScope = "dry-run" | "production";

export interface ReleaseVerificationCheck {
  id: string;
  status: ReleaseVerificationStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export interface ReleaseVerificationReport {
  schema: "naikaku.release-verification.v1";
  generatedAt: string;
  sourceRunId: string;
  scope: ReleaseVerificationScope;
  requireProductionEvidence: boolean;
  decision: ReleaseVerificationDecision;
  checks: ReleaseVerificationCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface CodingAgentReceiptDrillSummary {
  schema: "naikaku.coding-agent-receipt-drill.v1";
  generatedAt: string;
  operatorLocale: string;
  outputDir: string;
  source: {
    boardItems: number;
    briefs: number;
    reviewDecision: string;
    bundleDecision: string;
    readySessions: number;
    heldSessions: number;
  };
  valid: {
    receiptDecision: string;
    evidenceDecision: string;
    artifactAuditDecision: string;
    transcriptContentMismatches: number;
    boardItemsApplied: number;
    boardItemsSkipped: number;
  };
  mismatched: {
    receiptDecision: string;
    pendingEvidence: number;
    evidenceDecision: string;
    artifactAuditDecision: string;
    boardItemsApplied: number;
    boardItemsSkipped: number;
    firstMissingEvidence: string | null;
  };
  outOfScope: {
    receiptDecision: string;
    pendingEvidence: number;
    evidenceDecision: string;
    artifactAuditDecision: string;
    boardItemsApplied: number;
    boardItemsSkipped: number;
    firstMissingEvidence: string | null;
  };
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentDispatchDrillSummary {
  schema: "naikaku.coding-agent-dispatch-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    boardItems: number;
    briefs: number;
    reviewDecision: string;
    bundleDecision: string;
    drillDecision: string;
    readySessions: number;
    heldSessions: number;
  };
  valid: {
    dispatchDecision: string;
    totalItems: number;
    readyItems: number;
    heldItems: number;
    promptFiles: number;
    promptFilesWritten: number;
    receiptTemplateWritten: boolean;
    archiveFilesWritten: number;
    archiveBytes: number;
    archiveUnsafePaths: number;
    archiveAuditDecision: string;
    archiveAuditBlockers: number;
    archiveAuditWarnings: number;
    archiveMissingPromptFiles: number;
    archiveUnexpectedPromptFiles: number;
    archiveUnassignedHeldItems: number;
    uniqueEvidencePrefixes: number;
    unsafePaths: number;
  };
  productionHeld: {
    dispatchDecision: string;
    totalItems: number;
    readyItems: number;
    heldItems: number;
    productionHeldItems: number;
    promptFiles: number;
    promptFilesWritten: number;
    receiptTemplateWritten: boolean;
    archiveFilesWritten: number;
    archiveBytes: number;
    archiveUnsafePaths: number;
    archiveAuditDecision: string;
    archiveAuditBlockers: number;
    archiveAuditWarnings: number;
    archiveMissingPromptFiles: number;
    archiveUnexpectedPromptFiles: number;
    archiveUnassignedHeldItems: number;
    unsafePaths: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentDispatchSimulationSummary {
  schema: "naikaku.coding-agent-dispatch-simulation.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    dispatchDecision: string;
    archiveAuditDecision: string;
    readyItems: number;
    heldItems: number;
    promptFiles: number;
    receiptTemplates: number;
  };
  simulation: {
    decision: string;
    readyForAgent: number;
    held: number;
    blocked: number;
    plannedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftItems: number;
    receiptDraftFilesWritten: number;
    unsafePaths: number;
  };
  productionHeld: {
    decision: string;
    readyForAgent: number;
    held: number;
    blocked: number;
    promptFiles: number;
    receiptDraftItems: number;
    receiptDraftFilesWritten: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentRunnerManifestDrillSummary {
  schema: "naikaku.coding-agent-runner-manifest-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    simulationDecision: string;
    readyForAgent: number;
    held: number;
    blocked: number;
    receiptDraftFilesWritten: number;
  };
  valid: {
    decision: string;
    readyTasks: number;
    heldTasks: number;
    blockedTasks: number;
    runnerTasks: number;
    plannedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftPaths: number;
    unsafePaths: number;
    stopConditions: number;
  };
  productionHeld: {
    decision: string;
    readyTasks: number;
    heldTasks: number;
    blockedTasks: number;
    runnerTasks: number;
    receiptDraftPaths: number;
    unsafePaths: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface LocalizationDrillSummary {
  schema: "naikaku.localization-drill.v1";
  generatedAt: string;
  outputDir: string;
  defaultLocale: string;
  locales: Array<{
    locale: string;
    nativeLabel: string;
    htmlLang: string;
    expectedLanguage: string;
    briefs: number;
    reviewDecision: string;
    bundleDecision: string;
    drillDecision: string;
    dispatchDecision: string;
    archiveAuditDecision: string;
    simulationDecision: string;
    receiptDecision: string;
    readySessions: number;
    heldSessions: number;
    wouldAssign: number;
    dispatchReady: number;
    dispatchPromptFiles: number;
    simulationReadyForAgent: number;
    simulationReceiptDrafts: number;
    runnerManifestDecision: string;
    runnerReadyTasks: number;
    runnerTasks: number;
    pendingReceiptItems: number;
    checks: Record<string, boolean>;
    failures: string[];
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    readySessions: number;
    wouldAssign: number;
    dispatchReady: number;
    simulationReadyForAgent: number;
    simulationReceiptDrafts: number;
    runnerReadyTasks: number;
    runnerTasks: number;
    pendingReceiptItems: number;
  };
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface ExecutorContractDrillSummary {
  schema: "naikaku.executor-contract-drill.v1";
  generatedAt: string;
  outputDir: string;
  runId: string;
  mode: "dry-run";
  profiles: Array<{
    profileId: ExecutorProfileId;
    readyActionId: string;
    runbookCommand: string;
    runnerId: string;
    evidenceKinds: string[];
    evidenceItems: number;
    replayable: boolean;
    output: string;
    failures: string[];
  }>;
  blockedAction: {
    actionId: string;
    action: string;
    status: AutomationActionStatus;
    held: boolean;
    executed: boolean;
    reason: string;
  };
  summary: {
    profiles: number;
    passed: number;
    failed: number;
    readyActions: number;
    heldActions: number;
    runbookSteps: number;
    executorSteps: number;
    evidenceItems: number;
    replayableSteps: number;
    approvalRecords: number;
    capabilityCards: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface ProductionBoundaryDrillSummary {
  schema: "naikaku.production-boundary-drill.v1";
  generatedAt: string;
  command: string;
  expectedExitCode: number;
  observedExitCode: number;
  verificationPath: string;
  sourceRunId: string;
  decision: string;
  scope: string;
  requireProductionEvidence: boolean;
  failedChecks: string[];
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type VerificationManifestDecision = "verified" | "invalid";
export type VerificationManifestStatus = "pass" | "fail";

export interface VerificationManifestCheck {
  id: string;
  status: VerificationManifestStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export interface VerificationManifest {
  schema: "naikaku.verification-manifest.v1";
  generatedAt: string;
  decision: VerificationManifestDecision;
  inputs: {
    codingAgentDispatchDrill: string;
    codingAgentDispatchSimulation: string;
    codingAgentRunnerManifest: string;
    codingAgentReceiptDrill: string;
    localizationDrill: string;
    executorContractDrill: string;
    productionBoundaryDrill: string;
    releaseVerification: string;
  };
  source: {
    codingAgentDispatchGeneratedAt: string;
    codingAgentDispatchSimulationGeneratedAt: string;
    codingAgentRunnerManifestGeneratedAt: string;
    codingAgentGeneratedAt: string;
    localizationGeneratedAt: string;
    executorContractGeneratedAt: string;
    productionBoundaryGeneratedAt: string;
    releaseVerificationGeneratedAt: string;
    localizationLocales: string[];
    executorProfiles: ExecutorProfileId[];
    productionBoundaryExitCode: number;
    releaseRunId: string;
    releaseScope: string;
  };
  checks: VerificationManifestCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type DevelopmentWorkItemStatus = "todo" | "in-progress" | "blocked" | "done";
export type DevelopmentWorkItemPriority = "low" | "medium" | "high" | "critical";
export type DevelopmentWorkItemSource =
  | "team-package"
  | "next-iteration"
  | "memory-entry"
  | "release-remediation";

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

export interface DevelopmentIssueDraft {
  id: string;
  sourceItemId: string;
  title: string;
  body: string;
  labels: string[];
  assigneeHint?: string;
  milestoneHint?: string;
  priority: DevelopmentWorkItemPriority;
  status: DevelopmentWorkItemStatus;
  source: DevelopmentWorkItemSource;
  roleId?: string;
  roleName?: string;
  stageId?: CabinetStageId;
  runId?: string;
  acceptanceCriteria: string[];
  deliverables: string[];
}

export interface DevelopmentIssueDrafts {
  schema: "naikaku.github-issue-drafts.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  drafts: DevelopmentIssueDraft[];
  summary: {
    total: number;
    ready: number;
    blocked: number;
    highPriority: number;
    teams: number;
    labels: string[];
  };
}

export type CodingAgentMode = "implement" | "review" | "verify" | "blocked-review";

export interface CodingAgentBrief {
  id: string;
  sourceItemId: string;
  title: string;
  roleId?: string;
  roleName?: string;
  stageId?: CabinetStageId;
  priority: DevelopmentWorkItemPriority;
  status: DevelopmentWorkItemStatus;
  mode: CodingAgentMode;
  operatorLocale: string;
  objective: string;
  prompt: string;
  context: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  deliverables: string[];
  verificationCommands: string[];
  evidenceRequired: string[];
  sandbox: {
    executorProfileId: ExecutorProfileId;
    allowedActions: string[];
    prohibitedActions: string[];
    requiresHumanApproval: boolean;
  };
  releaseGate: {
    required: boolean;
    verificationDecision?: ReleaseVerificationDecision;
    productionEvidenceRequired: boolean;
    nextAction: string;
  };
  generatedAt: string;
}

export interface CodingAgentBriefs {
  schema: "naikaku.coding-agent-briefs.v1";
  generatedAt: string;
  mission: string;
  runId?: string;
  operatorLocale: string;
  developmentBoardSchema: DevelopmentBoard["schema"];
  releaseVerificationSchema?: ReleaseVerificationReport["schema"];
  briefs: CodingAgentBrief[];
  summary: {
    total: number;
    implementable: number;
    blocked: number;
    humanReview: number;
    highPriority: number;
    productionEvidenceRequired: boolean;
  };
}

export type CodingAgentBriefReviewStatus = "pass" | "warn" | "block";
export type CodingAgentBriefReviewDecision = "ready" | "needs-review" | "blocked";

export interface CodingAgentBriefReviewCheck {
  id: string;
  label: string;
  status: CodingAgentBriefReviewStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export interface CodingAgentBriefReviewReport {
  schema: "naikaku.coding-agent-brief-review.v1";
  generatedAt: string;
  sourceSchema: CodingAgentBriefs["schema"];
  operatorLocale: string;
  runId?: string;
  decision: CodingAgentBriefReviewDecision;
  checks: CodingAgentBriefReviewCheck[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    blockers: number;
    briefs: number;
    implementable: number;
    humanReview: number;
  };
}

export type CodingAgentSessionStatus =
  | "ready-for-agent"
  | "held-for-review"
  | "held-for-production-evidence";
export type CodingAgentSessionBundleDecision = "ready" | "needs-review" | "blocked";

export interface CodingAgentSessionSandboxContract {
  boundary: "sandbox-only";
  executorProfileId: ExecutorProfileId;
  allowedActions: string[];
  prohibitedActions: string[];
  requiresHumanApproval: boolean;
  evidenceArtifactPrefix: string;
  receiptSchema: "naikaku.coding-agent-session-receipt.v1";
}

export interface CodingAgentSession {
  id: string;
  briefId: string;
  sourceItemId: string;
  title: string;
  roleId?: string;
  roleName?: string;
  mode: CodingAgentMode;
  priority: DevelopmentWorkItemPriority;
  executorProfileId: ExecutorProfileId;
  status: CodingAgentSessionStatus;
  promptFileName: string;
  sandboxContract: CodingAgentSessionSandboxContract;
  handoffMarkdown: string;
  verificationCommands: string[];
  evidenceRequired: string[];
  safetyStops: string[];
  nextAction: string;
}

export interface CodingAgentSessionBundle {
  schema: "naikaku.coding-agent-session-bundle.v1";
  generatedAt: string;
  mode: "dry-run";
  mission: string;
  runId?: string;
  operatorLocale: string;
  sourceSchema: CodingAgentBriefs["schema"];
  requireProductionEvidence: boolean;
  review: CodingAgentBriefReviewReport;
  decision: CodingAgentSessionBundleDecision;
  sessions: CodingAgentSession[];
  summary: {
    total: number;
    ready: number;
    held: number;
    humanApproval: number;
    productionHeld: number;
    verificationCommands: number;
    evidenceItems: number;
  };
}

export type CodingAgentSessionDrillAction =
  | "would-assign"
  | "not-assigned"
  | "needs-operator-review";
export type CodingAgentSessionDrillDecision = "assignable" | "held" | "blocked";

export interface CodingAgentSessionDrillItem {
  sessionId: string;
  title: string;
  status: CodingAgentSessionStatus;
  action: CodingAgentSessionDrillAction;
  executorProfileId: ExecutorProfileId;
  sandboxContract: CodingAgentSessionSandboxContract;
  reason: string;
  simulatedPromptBytes: number;
  requiredCommands: string[];
  requiredEvidence: string[];
  safetyStops: string[];
  nextAction: string;
}

export interface CodingAgentSessionDrillReport {
  schema: "naikaku.coding-agent-session-drill.v1";
  generatedAt: string;
  mode: "dry-run";
  sourceSchema: CodingAgentSessionBundle["schema"];
  bundleDecision: CodingAgentSessionBundleDecision;
  decision: CodingAgentSessionDrillDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentSessionDrillItem[];
  honestyClaim: {
    level: "dry-run";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
  summary: {
    total: number;
    wouldAssign: number;
    notAssigned: number;
    needsReview: number;
    blocked: number;
    sandboxContracts: number;
    humanApprovalRequired: number;
    requiredCommands: number;
    requiredEvidence: number;
  };
}

export type CodingAgentDispatchDecision = "dispatchable" | "held" | "blocked";
export type CodingAgentDispatchItemStatus =
  | "ready-to-dispatch"
  | "held-for-review"
  | "held-for-production-evidence"
  | "not-dispatchable";

export interface CodingAgentDispatchManifestItem {
  sessionId: string;
  briefId: string;
  sourceItemId: string;
  title: string;
  sessionStatus: CodingAgentSessionStatus;
  dispatchStatus: CodingAgentDispatchItemStatus;
  executorProfileId: ExecutorProfileId;
  promptPath: string | null;
  receiptTemplatePath: string | null;
  evidenceArtifactPrefix: string;
  requiresHumanApproval: boolean;
  expectedTranscriptRefs: string[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  verificationCommands: string[];
  requiredEvidence: string[];
  allowedActions: string[];
  prohibitedActions: string[];
  safetyStops: string[];
  nextAction: string;
}

export interface CodingAgentDispatchManifest {
  schema: "naikaku.coding-agent-dispatch-manifest.v1";
  generatedAt: string;
  mode: "dry-run-dispatch";
  sourceSchema: CodingAgentSessionBundle["schema"];
  drillSchema?: CodingAgentSessionDrillReport["schema"];
  bundleDecision: CodingAgentSessionBundleDecision;
  drillDecision?: CodingAgentSessionDrillDecision;
  decision: CodingAgentDispatchDecision;
  mission: string;
  runId?: string;
  operatorLocale: string;
  receiptTemplatePath: string | null;
  items: CodingAgentDispatchManifestItem[];
  summary: {
    total: number;
    ready: number;
    held: number;
    productionHeld: number;
    promptFiles: number;
    receiptTemplates: number;
    uniqueEvidencePrefixes: number;
    unsafePaths: number;
    humanApprovalRequired: number;
  };
  honestyClaim: {
    level: "dry-run-dispatch";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentDispatchArchiveFileRole =
  | "readme"
  | "manifest-json"
  | "manifest-markdown"
  | "prompt"
  | "receipt-template";

export interface CodingAgentDispatchArchiveFile {
  path: string;
  role: CodingAgentDispatchArchiveFileRole;
  contentType: "application/json" | "text/markdown";
  byteLength: number;
  sessionId?: string;
  dispatchStatus?: CodingAgentDispatchItemStatus;
  content: string;
}

export interface CodingAgentDispatchArchive {
  schema: "naikaku.coding-agent-dispatch-archive.v1";
  generatedAt: string;
  mode: "dry-run-dispatch";
  sourceSchema: CodingAgentDispatchManifest["schema"];
  bundleSchema: CodingAgentSessionBundle["schema"];
  decision: CodingAgentDispatchDecision;
  mission: string;
  runId?: string;
  operatorLocale: string;
  files: CodingAgentDispatchArchiveFile[];
  summary: {
    files: number;
    totalBytes: number;
    promptFiles: number;
    receiptTemplates: number;
    readyItems: number;
    heldItems: number;
    unassignedHeldItems: number;
    unsafePaths: number;
  };
  honestyClaim: {
    level: "dry-run-dispatch";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentDispatchArchiveAuditDecision = "verified" | "needs-review" | "blocked";
export type CodingAgentDispatchArchiveAuditCheckStatus = "pass" | "warn" | "block";

export interface CodingAgentDispatchArchiveAuditCheck {
  id: string;
  status: CodingAgentDispatchArchiveAuditCheckStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export interface CodingAgentDispatchArchiveAudit {
  schema: "naikaku.coding-agent-dispatch-archive-audit.v1";
  generatedAt: string;
  sourceSchema: CodingAgentDispatchArchive["schema"];
  sourceDecision: CodingAgentDispatchDecision;
  decision: CodingAgentDispatchArchiveAuditDecision;
  runId?: string;
  operatorLocale: string;
  checks: CodingAgentDispatchArchiveAuditCheck[];
  summary: {
    files: number;
    promptFiles: number;
    receiptTemplates: number;
    readyItems: number;
    heldItems: number;
    unassignedHeldItems: number;
    unsafePaths: number;
    duplicatePaths: number;
    missingPromptFiles: number;
    unexpectedPromptFiles: number;
    missingReceiptTemplates: number;
    blockers: number;
    warnings: number;
    passed: number;
  };
  honestyClaim: {
    level: "dispatch-archive-audit";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentDispatchSimulationDecision =
  | "ready-for-real-agent"
  | "needs-review"
  | "blocked";

export type CodingAgentDispatchSimulationItemStatus =
  | "ready-for-agent"
  | "held"
  | "blocked";

export interface CodingAgentDispatchSimulationReceiptDraft {
  sessionId: string;
  receiptTemplatePath: string | null;
  changedFiles: string[];
  commandResults: CodingAgentCommandResult[];
  evidence: string[];
  risks: string[];
  missing: string[];
}

export interface CodingAgentDispatchSimulationItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  dispatchStatus: CodingAgentDispatchItemStatus;
  simulationStatus: CodingAgentDispatchSimulationItemStatus;
  executorProfileId: ExecutorProfileId;
  promptPath: string | null;
  receiptTemplatePath: string | null;
  evidenceArtifactPrefix: string;
  plannedSteps: string[];
  verificationCommands: string[];
  expectedTranscriptRefs: string[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  receiptDraft: CodingAgentDispatchSimulationReceiptDraft | null;
  safetyStops: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentDispatchSimulation {
  schema: "naikaku.coding-agent-dispatch-simulation.v1";
  generatedAt: string;
  mode: "local-simulation";
  sourceSchema: CodingAgentDispatchManifest["schema"];
  archiveAuditSchema?: CodingAgentDispatchArchiveAudit["schema"];
  dispatchDecision: CodingAgentDispatchDecision;
  archiveAuditDecision?: CodingAgentDispatchArchiveAuditDecision;
  decision: CodingAgentDispatchSimulationDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentDispatchSimulationItem[];
  summary: {
    total: number;
    readyForAgent: number;
    held: number;
    blocked: number;
    plannedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftItems: number;
    unsafePaths: number;
    archiveAuditBlockers: number;
    archiveAuditWarnings: number;
  };
  honestyClaim: {
    level: "local-dispatch-simulation";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentRunnerManifestDecision =
  | "runner-ready"
  | "needs-review"
  | "blocked";

export type CodingAgentRunnerTaskStatus =
  | "ready-for-runner"
  | "held"
  | "blocked";

export interface CodingAgentRunnerManifestCommand {
  command: string;
  transcriptRef: string | null;
  status: "pending-real-execution";
  exitCode: null;
}

export interface CodingAgentRunnerManifestTask {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  runnerId: string;
  status: CodingAgentRunnerTaskStatus;
  promptPath: string | null;
  receiptDraftPath: string | null;
  receiptTemplatePath: string | null;
  evidenceArtifactPrefix: string;
  plannedSteps: string[];
  commands: CodingAgentRunnerManifestCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  stopConditions: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentRunnerManifest {
  schema: "naikaku.coding-agent-runner-manifest.v1";
  generatedAt: string;
  mode: "runner-handoff-planning";
  sourceSchema: CodingAgentDispatchSimulation["schema"];
  simulationDecision: CodingAgentDispatchSimulationDecision;
  decision: CodingAgentRunnerManifestDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentRunnerManifestTask[];
  summary: {
    total: number;
    readyTasks: number;
    heldTasks: number;
    blockedTasks: number;
    runnerTasks: number;
    plannedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftPaths: number;
    unsafePaths: number;
    stopConditions: number;
  };
  honestyClaim: {
    level: "runner-handoff-planning";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentSessionReceiptDecision = "verified" | "needs-evidence" | "blocked";
export type CodingAgentSessionReceiptStatus =
  | "verified"
  | "pending-evidence"
  | "failed"
  | "held";

export interface CodingAgentCommandResult {
  command: string;
  exitCode: number | null;
  outputSummary: string;
  transcriptRef?: string;
}

export interface CodingAgentSessionReceiptItem {
  sessionId: string;
  briefId?: string;
  sourceItemId?: string;
  title: string;
  sessionStatus: CodingAgentSessionStatus;
  receiptStatus: CodingAgentSessionReceiptStatus;
  changedFiles: string[];
  commandResults: CodingAgentCommandResult[];
  evidence: string[];
  risks: string[];
  missing: string[];
  nextAction: string;
}

export interface CodingAgentSessionReceipt {
  schema: "naikaku.coding-agent-session-receipt.v1";
  generatedAt: string;
  mode: "evidence-review";
  sourceSchema: CodingAgentSessionBundle["schema"];
  bundleDecision: CodingAgentSessionBundleDecision;
  decision: CodingAgentSessionReceiptDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentSessionReceiptItem[];
  honestyClaim: {
    level: "submitted-evidence-review";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
  summary: {
    total: number;
    verified: number;
    pendingEvidence: number;
    failed: number;
    held: number;
    changedFiles: number;
    commandResults: number;
    evidenceItems: number;
    risks: number;
  };
}

export type CodingAgentImplementationEvidenceDecision =
  | "accepted-for-handoff"
  | "needs-evidence"
  | "blocked";

export interface CodingAgentImplementationEvidenceItem {
  sessionId: string;
  briefId?: string;
  sourceItemId?: string;
  title: string;
  receiptStatus: CodingAgentSessionReceiptStatus;
  accepted: boolean;
  changedFiles: string[];
  commandResults: CodingAgentCommandResult[];
  evidence: string[];
  risks: string[];
  missing: string[];
  nextAction: string;
}

export interface CodingAgentImplementationEvidence {
  schema: "naikaku.coding-agent-implementation-evidence.v1";
  generatedAt: string;
  sourceSchema: CodingAgentSessionReceipt["schema"];
  sourceDecision: CodingAgentSessionReceiptDecision;
  decision: CodingAgentImplementationEvidenceDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentImplementationEvidenceItem[];
  summary: {
    total: number;
    accepted: number;
    needsEvidence: number;
    blocked: number;
    changedFiles: number;
    commandResults: number;
    failedCommands: number;
    evidenceItems: number;
    riskNotes: number;
  };
  honestyClaim: {
    level: "implementation-evidence-summary";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentImplementationArtifactAuditDecision =
  | "verified"
  | "needs-artifacts"
  | "blocked";

export type CodingAgentImplementationArtifactPathKind =
  | "changed-file"
  | "evidence-artifact"
  | "command-transcript";

export type CodingAgentImplementationArtifactPathStatus =
  | "verified"
  | "missing"
  | "unsafe"
  | "not-checked";

export interface CodingAgentImplementationArtifactPath {
  kind: CodingAgentImplementationArtifactPathKind;
  path: string;
  status: CodingAgentImplementationArtifactPathStatus;
  reason: string;
  bytes?: number;
  sha256?: string;
  modifiedAt?: string;
  transcriptCommandMatched?: boolean;
  transcriptExitCodeMatched?: boolean;
}

export interface CodingAgentImplementationArtifactAuditItem {
  sessionId: string;
  sourceItemId?: string;
  title: string;
  decision: CodingAgentImplementationArtifactAuditDecision;
  paths: CodingAgentImplementationArtifactPath[];
  missing: string[];
}

export interface CodingAgentImplementationArtifactAudit {
  schema: "naikaku.coding-agent-implementation-artifact-audit.v1";
  generatedAt: string;
  sourceSchema: CodingAgentImplementationEvidence["schema"];
  sourceDecision: CodingAgentImplementationEvidenceDecision;
  decision: CodingAgentImplementationArtifactAuditDecision;
  runId?: string;
  items: CodingAgentImplementationArtifactAuditItem[];
  summary: {
    total: number;
    verified: number;
    needsArtifacts: number;
    blocked: number;
    paths: number;
    verifiedPaths: number;
    missingPaths: number;
    unsafePaths: number;
    uncheckedPaths: number;
    fingerprintedPaths: number;
    totalBytes: number;
    uniquePaths: number;
    duplicatePathRefs: number;
    uniqueFingerprintedPaths: number;
    uniqueFingerprintBytes: number;
    evidenceArtifactRefs: number;
    evidenceArtifactPaths: number;
    reusedEvidenceArtifactPaths: number;
    reusedEvidenceArtifactRefs: number;
    reusedTranscriptPaths: number;
    reusedTranscriptRefs: number;
    reusedChangedFilePaths: number;
    reusedChangedFileRefs: number;
    transcriptContentChecked: number;
    transcriptContentMismatches: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
  };
}

export type CodingAgentImplementationReconciliationDecision =
  | "applied"
  | "partial"
  | "blocked"
  | "no-match";

export interface CodingAgentImplementationReconciliationItem {
  sessionId: string;
  sourceItemId?: string;
  title: string;
  currentStatus?: DevelopmentWorkItemStatus;
  nextStatus?: DevelopmentWorkItemStatus;
  applied: boolean;
  reason: string;
}

export interface CodingAgentImplementationReconciliation {
  schema: "naikaku.coding-agent-implementation-reconciliation.v1";
  generatedAt: string;
  sourceSchema: CodingAgentImplementationEvidence["schema"];
  sourceDecision: CodingAgentImplementationEvidenceDecision;
  decision: CodingAgentImplementationReconciliationDecision;
  runId?: string;
  items: CodingAgentImplementationReconciliationItem[];
  summary: {
    total: number;
    matched: number;
    applied: number;
    alreadyDone: number;
    skipped: number;
    blocked: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
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
  | "role.workspaces.exported"
  | "memory.entry.accepted"
  | "memory.entry.rejected"
  | "memory.log.exported"
  | "development.item.status.changed"
  | "development.board.exported"
  | "development.issues.exported"
  | "development.coding_briefs.exported"
  | "development.coding_briefs.reviewed"
  | "development.coding_sessions.exported"
  | "development.coding_sessions.drilled"
  | "development.coding_sessions.dispatch_prepared"
  | "development.coding_sessions.dispatch_audited"
  | "development.coding_sessions.dispatch_simulated"
  | "development.coding_sessions.receipt_prepared"
  | "development.coding_sessions.receipt_reviewed"
  | "development.coding_sessions.implementation_evidence_prepared"
  | "development.coding_sessions.implementation_artifacts_audited"
  | "development.coding_sessions.implementation_evidence_applied"
  | "product.readiness.exported"
  | "product.release.exported"
  | "release.rehearsal.completed"
  | "release.rehearsal.exported"
  | "release.verification.completed"
  | "release.verification.exported"
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
