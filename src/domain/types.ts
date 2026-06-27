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

export type SecurityThreatCategory =
  | "prompt-injection"
  | "credential-exfiltration"
  | "policy-bypass"
  | "localhost-control-plane"
  | "control-plane"
  | "destructive-action"
  | "production-deploy"
  | "external-send"
  | "network-escape"
  | "high-impact-action";

export type SecurityClassificationDecision = "allowed" | "needs-approval" | "blocked";

export interface SecurityFinding {
  id: string;
  category: SecurityThreatCategory;
  severity: RiskLevel;
  evidence: string;
  summary: string;
  recommendedAction: string;
}

export interface SecurityTextClassification {
  schema: "naikaku.security-text-classification.v1";
  generatedAt: string;
  source: string;
  decision: SecurityClassificationDecision;
  riskLevel: RiskLevel;
  findings: SecurityFinding[];
  summary: string;
}

export interface SecurityActionClassification {
  schema: "naikaku.security-action-classification.v1";
  generatedAt: string;
  executorProfileId: ExecutorProfileId;
  action: string;
  target?: string;
  riskLevel: RiskLevel;
  decision: SecurityClassificationDecision;
  sandboxPolicyDecision: {
    allowed: boolean;
    approvalRequired: boolean;
    reason: string;
    auditTags: string[];
  };
  findings: SecurityFinding[];
  summary: string;
}

export interface ExecutorProfile {
  id: ExecutorProfileId;
  label: string;
  purpose: string;
  isolation: string;
  controls: string[];
}

export type SandboxCapabilityStatus = "dry-run-ready" | "needs-approval" | "blocked";
export type SandboxCapabilityReadinessCheckStatus = "pass" | "warn" | "block";

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

export interface SandboxCapabilityReadinessCheck {
  id: string;
  label: string;
  status: SandboxCapabilityReadinessCheckStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

export interface SandboxCapabilityRunnerReadiness {
  decision: SandboxCapabilityStatus;
  checks: SandboxCapabilityReadinessCheck[];
  requiredApprovals: string[];
  blockedReasons: string[];
  supportedEvidenceArtifacts: string[];
  nextAction: string;
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
  runnerReadiness: SandboxCapabilityRunnerReadiness;
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
    readinessChecks: number;
    passedReadinessChecks: number;
    warningReadinessChecks: number;
    blockedReadinessChecks: number;
    requiredApprovals: number;
    evidenceArtifacts: number;
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

export interface CodingAgentRunnerInvocationDrillSummary {
  schema: "naikaku.coding-agent-runner-invocation-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    runnerManifestDecision: string;
    readyTasks: number;
    runnerTasks: number;
    receiptDraftPaths: number;
  };
  valid: {
    decision: string;
    readyInvocations: number;
    heldInvocations: number;
    blockedInvocations: number;
    invocationFiles: number;
    commandContracts: number;
    receiptDraftPaths: number;
    expectedEvidenceArtifacts: number;
    unsafePaths: number;
    stopConditions: number;
  };
  productionHeld: {
    decision: string;
    readyInvocations: number;
    heldInvocations: number;
    blockedInvocations: number;
    invocationFiles: number;
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

export interface CodingAgentRunnerIntakeAuditDrillSummary {
  schema: "naikaku.coding-agent-runner-intake-audit-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    runnerInvocationDecision: string;
    readyInvocations: number;
    invocationFiles: number;
    commandContracts: number;
    receiptDraftPaths: number;
  };
  valid: {
    decision: string;
    acceptedIntakes: number;
    heldIntakes: number;
    blockedIntakes: number;
    invocationFiles: number;
    invocationFilesFound: number;
    markdownFilesFound: number;
    commandContracts: number;
    receiptDraftPaths: number;
    expectedEvidenceArtifacts: number;
    unsafePaths: number;
    sourceBlockedChecks: number;
    completedCommandResults: number;
    blockedSecurityClassifications: number;
  };
  productionHeld: {
    decision: string;
    acceptedIntakes: number;
    heldIntakes: number;
    blockedIntakes: number;
    invocationFiles: number;
    invocationFilesFound: number;
    receiptDraftPaths: number;
    unsafePaths: number;
    blockedSecurityClassifications: number;
  };
  securityBlocked: {
    decision: string;
    acceptedIntakes: number;
    blockedIntakes: number;
    completedCommandResults: number;
    unsafePaths: number;
    blockedSecurityClassifications: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentRunnerSelfTestDrillSummary {
  schema: "naikaku.coding-agent-runner-self-test-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    runnerManifestDecision: string;
    readyTasks: number;
    runnerTasks: number;
    receiptDraftPaths: number;
  };
  valid: {
    decision: string;
    wouldRun: number;
    held: number;
    blocked: number;
    simulatedActions: number;
    pendingCommands: number;
    notExecutedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftPaths: number;
    unsafePaths: number;
    stopConditions: number;
  };
  productionHeld: {
    decision: string;
    wouldRun: number;
    held: number;
    blocked: number;
    notExecutedCommands: number;
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

export interface CodingAgentRunnerLeaseDrillSummary {
  schema: "naikaku.coding-agent-runner-lease-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    runnerSelfTestDecision: string;
    wouldRun: number;
    notExecutedCommands: number;
    receiptDraftPaths: number;
  };
  valid: {
    decision: string;
    total: number;
    availableTasks: number;
    activeLeases: number;
    expiredLeases: number;
    attempts: number;
    grantedAttempts: number;
    idempotentClaims: number;
    reclaimedLeases: number;
    deniedAttempts: number;
    duplicateBlocks: number;
    profileDeniedAttempts: number;
    firstLeaseSessionId: string | null;
    firstLeaseRunnerId: string | null;
    reclaimedRunnerId: string | null;
  };
  productionHeld: {
    decision: string;
    availableTasks: number;
    activeLeases: number;
    heldTasks: number;
    attempts: number;
    deniedAttempts: number;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentSandboxRunnerDrillSummary {
  schema: "naikaku.coding-agent-sandbox-runner-drill.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  source: {
    runnerSelfTestDecision: string;
    wouldRun: number;
    pendingCommands: number;
    notExecutedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftPaths: number;
  };
  valid: {
    decision: string;
    executedTasks: number;
    heldTasks: number;
    blockedTasks: number;
    commandResults: number;
    processExecutions: number;
    failedCommands: number;
    blockedCommands: number;
    transcriptFilesWritten: number;
    changedFileSummaries: number;
    evidenceArtifacts: number;
    receiptReviewDecision: string;
    evidenceDecision: string;
    artifactAuditDecision: string;
    verifiedArtifactPaths: number;
    transcriptContentMismatches: number;
    reusedTranscriptRefs: number;
    unsafePaths: number;
  };
  productionHeld: {
    decision: string;
    executedTasks: number;
    heldTasks: number;
    blockedTasks: number;
    commandResults: number;
    processExecutions: number;
    receiptReviewDecision: string;
    artifactAuditDecision: string;
  };
  securityBlockedPreflight: {
    decision: string;
    readyTasks: number;
    blockedTasks: number;
    allowedCommands: number;
    blockedCommands: number;
    blockedSecurityCommands: number;
    expectedProcessExecutions: number;
    expectedCommandResults: number;
    tamperedCommand: string;
    dangerousCommandAllowlisted: boolean;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentEngineeringSelfSimulationSummary {
  schema: "naikaku.coding-agent-engineering-self-simulation.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  fixture: {
    workspacePath: string;
    changedFile: string;
    baselineTestExitCode: number;
    finalTestExitCode: number;
    diffArtifact: string;
    baselineTranscript: string;
    finalTranscript: string;
    gitStatus: string;
  };
  receipt: {
    decision: string;
    verified: number;
    pendingEvidence: number;
    failed: number;
  };
  evidence: {
    decision: string;
    accepted: number;
    changedFiles: number;
    commandResults: number;
  };
  artifactAudit: {
    decision: string;
    verifiedPaths: number;
    missingPaths: number;
    unsafePaths: number;
    transcriptContentMismatches: number;
    worktreeCheckedChangedFiles: number;
    worktreeChangedFiles: number;
    worktreeUnchangedFiles: number;
  };
  negativeCases: {
    failedTestReceipt: {
      receiptDecision: string;
      evidenceDecision: string;
      artifactAuditDecision: string;
      failedCommands: number;
      accepted: number;
    };
    cleanWorktreeClaim: {
      claimedChangedFile: string;
      receiptDecision: string;
      evidenceDecision: string;
      artifactAuditDecision: string;
      worktreeCheckedChangedFiles: number;
      worktreeChangedFiles: number;
      worktreeUnchangedFiles: number;
    };
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface RunnerAuthDrillSummary {
  schema: "naikaku.runner-auth-drill.v1";
  generatedAt: string;
  outputDir: string;
  source: {
    executorProfiles: ExecutorProfileId[];
    scopedCredentials: number;
    sharedTokenConfigured: boolean;
  };
  cases: Array<{
    id: string;
    passed: boolean;
    decisionOk: boolean;
    status: number;
    mode: string;
    runnerId: string | null;
    allowedExecutorProfiles: ExecutorProfileId[];
    allExecutorProfiles: boolean;
    tokenFingerprint?: string;
    canUseRequestedProfile?: boolean;
    canUseDeniedProfile?: boolean;
    auditTags: string[];
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    scopedCredentials: number;
    activeScopedCredentials: number;
    expiredScopedCredentials: number;
  };
  scopeProbe: {
    sourceReadyActions: number;
    scopedReadyActions: number;
    scopedHeldActions: number;
    filteredReadyActions: number;
    sourceEvidenceSteps: number;
    scopedEvidenceSteps: number;
    filteredEvidenceSteps: number;
    deniedExecutorProfiles: ExecutorProfileId[];
    scopePayloadProfiles: ExecutorProfileId[];
    shellRunnerCanAccessShell: boolean;
    shellRunnerCanAccessBrowser: boolean;
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
    runnerInvocationDecision: string;
    runnerIntakeDecision: string;
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
    runnerInvocationReadyInvocations: number;
    runnerInvocationFiles: number;
    runnerIntakeAccepted: number;
    runnerSelfTestDecision: string;
    runnerSelfTestWouldRun: number;
    runnerSelfTestNotExecutedCommands: number;
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
    runnerInvocationReadyInvocations: number;
    runnerInvocationFiles: number;
    runnerIntakeAccepted: number;
    runnerSelfTestWouldRun: number;
    runnerSelfTestNotExecutedCommands: number;
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

export interface SandboxCapabilityDrillSummary {
  schema: "naikaku.sandbox-capability-drill.v1";
  generatedAt: string;
  outputDir: string;
  valid: {
    schema: SandboxCapabilityRegistry["schema"];
    profiles: number;
    rolesCovered: number;
    dryRunReady: number;
    needsApproval: number;
    blocked: number;
    approvalActions: number;
    blockedActions: number;
    readinessChecks: number;
    passedReadinessChecks: number;
    warningReadinessChecks: number;
    blockedReadinessChecks: number;
    requiredApprovals: number;
    evidenceArtifacts: number;
    killSwitchArmed: boolean;
  };
  killSwitchOpen: {
    profiles: number;
    blocked: number;
    readinessChecks: number;
    blockedReadinessChecks: number;
    blockedActions: number;
    killSwitchArmed: boolean;
  };
  profiles: Array<{
    profileId: ExecutorProfileId;
    decision: SandboxCapabilityStatus;
    readinessChecks: number;
    passedReadinessChecks: number;
    warningReadinessChecks: number;
    blockedReadinessChecks: number;
    requiredApprovals: number;
    blockedReasons: number;
    evidenceArtifacts: number;
    failures: string[];
  }>;
  checks: Record<string, boolean>;
  honestyClaim: {
    level: string;
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface SecurityRedTeamDrillSummary {
  schema: "naikaku.security-red-team-drill.v1";
  generatedAt: string;
  outputDir: string;
  cases: Array<{
    caseId: string;
    title: string;
    expectedDecision: SecurityClassificationDecision;
    decision: SecurityClassificationDecision;
    executorProfileId: ExecutorProfileId;
    action: string;
    target?: string;
    riskLevel: RiskLevel;
    requiredCategories: SecurityThreatCategory[];
    findingCategories: SecurityThreatCategory[];
    findingCount: number;
    policyAllowed: boolean;
    policyApprovalRequired: boolean;
    executed: false;
    failures: string[];
  }>;
  summary: {
    cases: number;
    passed: number;
    failed: number;
    blocked: number;
    needsApproval: number;
    allowed: number;
    findings: number;
    promptInjectionFindings: number;
    highImpactFindings: number;
    controlPlaneFindings: number;
    secretFindings: number;
    executedActions: number;
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
    codingAgentRunnerInvocation: string;
    codingAgentRunnerIntakeAudit: string;
    codingAgentRunnerSelfTest: string;
    codingAgentRunnerLease: string;
    codingAgentSandboxRunner: string;
    codingAgentEngineeringSelfSimulation: string;
    codingAgentReceiptDrill: string;
    localizationDrill: string;
    executorContractDrill: string;
    sandboxCapabilityDrill: string;
    securityRedTeamDrill: string;
    runnerAuthDrill: string;
    productionBoundaryDrill: string;
    releaseVerification: string;
  };
  source: {
    codingAgentDispatchGeneratedAt: string;
    codingAgentDispatchSimulationGeneratedAt: string;
    codingAgentRunnerManifestGeneratedAt: string;
    codingAgentRunnerInvocationGeneratedAt: string;
    codingAgentRunnerIntakeAuditGeneratedAt: string;
    codingAgentRunnerSelfTestGeneratedAt: string;
    codingAgentRunnerLeaseGeneratedAt: string;
    codingAgentSandboxRunnerGeneratedAt: string;
    codingAgentEngineeringSelfSimulationGeneratedAt: string;
    codingAgentGeneratedAt: string;
    localizationGeneratedAt: string;
    executorContractGeneratedAt: string;
    sandboxCapabilityGeneratedAt: string;
    securityRedTeamGeneratedAt: string;
    runnerAuthGeneratedAt: string;
    productionBoundaryGeneratedAt: string;
    releaseVerificationGeneratedAt: string;
    localizationLocales: string[];
    executorProfiles: ExecutorProfileId[];
    sandboxCapabilityProfiles: ExecutorProfileId[];
    securityRedTeamCases: number;
    runnerAuthScopedCredentials: number;
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

export type CodingAgentRunnerInvocationPackageDecision =
  | "package-ready"
  | "needs-review"
  | "blocked";

export type CodingAgentRunnerInvocationItemStatus =
  | "invocation-ready"
  | "held"
  | "blocked";

export interface CodingAgentRunnerInvocationCommand {
  command: string;
  transcriptRef: string | null;
  status: "pending-real-execution";
  exitCode: null;
}

export interface CodingAgentRunnerInvocationItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  runnerId: string;
  manifestTaskStatus: CodingAgentRunnerTaskStatus;
  invocationStatus: CodingAgentRunnerInvocationItemStatus;
  invocationPath: string | null;
  promptPath: string | null;
  receiptDraftPath: string | null;
  receiptTemplatePath: string | null;
  evidenceArtifactPrefix: string;
  plannedSteps: string[];
  commands: CodingAgentRunnerInvocationCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  runnerInstructions: string[];
  stopConditions: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentRunnerInvocationFile {
  schema: "naikaku.coding-agent-runner-invocation.v1";
  generatedAt: string;
  packageSchema: "naikaku.coding-agent-runner-invocation-package.v1";
  packageDecision: CodingAgentRunnerInvocationPackageDecision;
  operatorLocale: string;
  runId?: string;
  item: CodingAgentRunnerInvocationItem;
  honestyClaim: CodingAgentRunnerInvocationPackage["honestyClaim"];
}

export interface CodingAgentRunnerInvocationPackage {
  schema: "naikaku.coding-agent-runner-invocation-package.v1";
  generatedAt: string;
  mode: "runner-invocation-package";
  sourceSchema: CodingAgentRunnerManifest["schema"];
  sourceDecision: CodingAgentRunnerManifestDecision;
  decision: CodingAgentRunnerInvocationPackageDecision;
  runId?: string;
  operatorLocale: string;
  invocationBasePath: string;
  items: CodingAgentRunnerInvocationItem[];
  summary: {
    total: number;
    readyInvocations: number;
    heldInvocations: number;
    blockedInvocations: number;
    invocationFiles: number;
    commandContracts: number;
    receiptDraftPaths: number;
    expectedEvidenceArtifacts: number;
    unsafePaths: number;
    stopConditions: number;
  };
  honestyClaim: {
    level: "runner-invocation-package";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentRunnerIntakeAuditDecision =
  | "accepted-for-runner"
  | "needs-review"
  | "blocked";

export type CodingAgentRunnerIntakeAuditItemStatus =
  | "accepted-for-runner"
  | "held"
  | "blocked";

export interface CodingAgentRunnerIntakeAuditItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  runnerId: string;
  invocationStatus: CodingAgentRunnerInvocationItemStatus;
  intakeStatus: CodingAgentRunnerIntakeAuditItemStatus;
  invocationPath: string | null;
  promptPath: string | null;
  receiptDraftPath: string | null;
  receiptTemplatePath: string | null;
  evidenceArtifactPrefix: string;
  commands: CodingAgentRunnerInvocationCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  runnerInstructions: string[];
  stopConditions: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentRunnerIntakeAudit {
  schema: "naikaku.coding-agent-runner-intake-audit.v1";
  generatedAt: string;
  mode: "runner-invocation-intake-audit";
  sourceSchema: CodingAgentRunnerInvocationPackage["schema"];
  sourceDecision: CodingAgentRunnerInvocationPackageDecision;
  decision: CodingAgentRunnerIntakeAuditDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentRunnerIntakeAuditItem[];
  summary: {
    total: number;
    acceptedIntakes: number;
    heldIntakes: number;
    blockedIntakes: number;
    invocationFiles: number;
    commandContracts: number;
    receiptDraftPaths: number;
    expectedEvidenceArtifacts: number;
    unsafePaths: number;
    sourceBlockedChecks: number;
    completedCommandResults: number;
    missingRunnerInstructions: number;
    blockedSecurityClassifications: number;
  };
  honestyClaim: {
    level: "runner-invocation-intake-audit";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentRunnerSelfTestDecision =
  | "self-test-ready"
  | "needs-review"
  | "blocked";

export type CodingAgentRunnerSelfTestItemStatus =
  | "would-run"
  | "held"
  | "blocked";

export interface CodingAgentRunnerSelfTestCommand {
  command: string;
  transcriptRef: string | null;
  status: "not-executed";
  exitCode: null;
  evidenceNote: string;
}

export interface CodingAgentRunnerSelfTestItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  runnerId: string;
  manifestTaskStatus: CodingAgentRunnerTaskStatus;
  selfTestStatus: CodingAgentRunnerSelfTestItemStatus;
  promptPath: string | null;
  receiptDraftPath: string | null;
  evidenceArtifactPrefix: string;
  commands: CodingAgentRunnerSelfTestCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  simulatedActions: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentRunnerSelfTest {
  schema: "naikaku.coding-agent-runner-self-test.v1";
  generatedAt: string;
  mode: "local-runner-self-test";
  sourceSchema: CodingAgentRunnerManifest["schema"];
  sourceDecision: CodingAgentRunnerManifestDecision;
  decision: CodingAgentRunnerSelfTestDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentRunnerSelfTestItem[];
  summary: {
    total: number;
    wouldRun: number;
    held: number;
    blocked: number;
    readyRunnerTasks: number;
    simulatedActions: number;
    pendingCommands: number;
    notExecutedCommands: number;
    expectedEvidenceArtifacts: number;
    receiptDraftPaths: number;
    unsafePaths: number;
    stopConditions: number;
  };
  honestyClaim: {
    level: "local-runner-self-test";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentRunnerLeaseDecision =
  | "lease-ready"
  | "needs-review"
  | "blocked";

export type CodingAgentRunnerLeaseItemStatus =
  | "available"
  | "leased"
  | "held"
  | "blocked";

export type CodingAgentRunnerLeaseRecordStatus =
  | "active"
  | "expired";

export type CodingAgentRunnerLeaseAttemptDecision =
  | "leased"
  | "already-leased"
  | "reclaimed"
  | "denied"
  | "no-task";

export interface CodingAgentRunnerLeaseRecord {
  leaseId: string;
  sessionId: string;
  runnerId: string;
  executorProfileId: ExecutorProfileId;
  issuedAt: string;
  expiresAt: string;
  status: CodingAgentRunnerLeaseRecordStatus;
}

export interface CodingAgentRunnerLeaseAttempt {
  attemptId: string;
  attemptedAt: string;
  runnerId: string;
  allowedExecutorProfiles: ExecutorProfileId[];
  requestedSessionId: string | null;
  decision: CodingAgentRunnerLeaseAttemptDecision;
  sessionId: string | null;
  leaseId: string | null;
  reason: string;
}

export interface CodingAgentRunnerLeaseItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  sourceSelfTestStatus: CodingAgentRunnerSelfTestItemStatus;
  leaseStatus: CodingAgentRunnerLeaseItemStatus;
  promptPath: string | null;
  receiptDraftPath: string | null;
  evidenceArtifactPrefix: string;
  activeLeaseId: string | null;
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentRunnerLeaseLedger {
  schema: "naikaku.coding-agent-runner-lease.v1";
  generatedAt: string;
  mode: "runner-task-lease";
  sourceSchema: CodingAgentRunnerSelfTest["schema"];
  sourceDecision: CodingAgentRunnerSelfTestDecision;
  decision: CodingAgentRunnerLeaseDecision;
  runId?: string;
  operatorLocale: string;
  leaseTtlMs: number;
  items: CodingAgentRunnerLeaseItem[];
  leases: CodingAgentRunnerLeaseRecord[];
  attempts: CodingAgentRunnerLeaseAttempt[];
  summary: {
    total: number;
    availableTasks: number;
    activeLeases: number;
    expiredLeases: number;
    heldTasks: number;
    blockedTasks: number;
    attempts: number;
    grantedAttempts: number;
    idempotentClaims: number;
    reclaimedLeases: number;
    deniedAttempts: number;
    duplicateBlocks: number;
    profileDeniedAttempts: number;
  };
  honestyClaim: {
    level: "runner-task-lease";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentRunnerLeaseValidation {
  ok: boolean;
  checkedAt: string;
  runnerId: string;
  readySessionIds: string[];
  acceptedLeaseIds: string[];
  missingSessionIds: string[];
  expiredSessionIds: string[];
  runnerMismatchSessionIds: string[];
  profileMismatchSessionIds: string[];
  unissuedSessionIds: string[];
  sourceMismatch: boolean;
  message: string;
}

export type CodingAgentSandboxRunnerPreflightDecision =
  | "ready"
  | "needs-review"
  | "blocked";

export type CodingAgentSandboxRunnerPreflightItemStatus =
  | "ready"
  | "held"
  | "blocked";

export type CodingAgentSandboxRunnerPreflightCommandStatus =
  | "allowed"
  | "blocked"
  | "not-runnable";

export interface CodingAgentSandboxRunnerPreflightCommand {
  command: string;
  transcriptRef: string | null;
  status: CodingAgentSandboxRunnerPreflightCommandStatus;
  reason: string;
  securityDecision?: SecurityClassificationDecision;
  securityFindings?: SecurityThreatCategory[];
}

export interface CodingAgentSandboxRunnerPreflightItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  selfTestStatus: CodingAgentRunnerSelfTestItemStatus;
  preflightStatus: CodingAgentSandboxRunnerPreflightItemStatus;
  promptPath: string | null;
  receiptDraftPath: string | null;
  evidenceArtifactPrefix: string;
  commands: CodingAgentSandboxRunnerPreflightCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentSandboxRunnerPreflight {
  schema: "naikaku.coding-agent-sandbox-runner-preflight.v1";
  generatedAt: string;
  mode: "local-sandbox-runner-preflight";
  sourceSchema: CodingAgentRunnerSelfTest["schema"];
  sourceDecision: CodingAgentRunnerSelfTestDecision;
  sourceBundleSchema?: CodingAgentSessionBundle["schema"];
  sourceBundleDecision?: CodingAgentSessionBundleDecision;
  decision: CodingAgentSandboxRunnerPreflightDecision;
  runId?: string;
  operatorLocale: string;
  commandAllowlist: string[];
  items: CodingAgentSandboxRunnerPreflightItem[];
  summary: {
    total: number;
    readyTasks: number;
    heldTasks: number;
    blockedTasks: number;
    runnableCommands: number;
    allowedCommands: number;
    blockedCommands: number;
    notRunnableCommands: number;
    expectedProcessExecutions: number;
    expectedCommandResults: number;
    receiptDraftPaths: number;
    expectedEvidenceArtifacts: number;
    unsafePaths: number;
    missingBundleSessions: number;
    extraBundleSessions: number;
    blockedSecurityCommands: number;
  };
  honestyClaim: {
    level: "local-sandbox-runner-preflight";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export type CodingAgentSandboxRunnerDecision =
  | "sandbox-runner-verified"
  | "needs-review"
  | "blocked";

export type CodingAgentSandboxRunnerItemStatus =
  | "executed"
  | "held"
  | "blocked"
  | "failed";

export type CodingAgentSandboxRunnerCommandStatus =
  | "executed"
  | "blocked"
  | "skipped";

export interface CodingAgentSandboxRunnerCommandResult extends CodingAgentCommandResult {
  status: CodingAgentSandboxRunnerCommandStatus;
  durationMs?: number;
}

export interface CodingAgentSandboxRunnerReportItem {
  sessionId: string;
  sourceItemId: string;
  title: string;
  executorProfileId: ExecutorProfileId;
  selfTestStatus: CodingAgentRunnerSelfTestItemStatus;
  runStatus: CodingAgentSandboxRunnerItemStatus;
  promptPath: string | null;
  receiptDraftPath: string | null;
  evidenceArtifactPrefix: string;
  changedFileSummaryPath: string | null;
  commandResults: CodingAgentSandboxRunnerCommandResult[];
  evidence: string[];
  risks: string[];
  checks: Array<{
    id: string;
    status: "pass" | "warn" | "block";
    summary: string;
  }>;
  nextAction: string;
}

export interface CodingAgentSandboxRunnerReport {
  schema: "naikaku.coding-agent-sandbox-runner.v1";
  generatedAt: string;
  mode: "local-sandbox-runner-drill";
  sourceSchema: CodingAgentRunnerSelfTest["schema"];
  sourceDecision: CodingAgentRunnerSelfTestDecision;
  decision: CodingAgentSandboxRunnerDecision;
  runId?: string;
  operatorLocale: string;
  items: CodingAgentSandboxRunnerReportItem[];
  summary: {
    total: number;
    executedTasks: number;
    heldTasks: number;
    blockedTasks: number;
    commandResults: number;
    processExecutions: number;
    failedCommands: number;
    blockedCommands: number;
    transcriptFilesWritten: number;
    changedFileSummaries: number;
    evidenceArtifacts: number;
    unsafePaths: number;
  };
  honestyClaim: {
    level: "local-sandbox-runner-drill";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface CodingAgentSandboxRunnerResult {
  schema: "naikaku.coding-agent-sandbox-runner-result.v1";
  generatedAt: string;
  preflight: CodingAgentSandboxRunnerPreflight;
  report: CodingAgentSandboxRunnerReport;
  submittedReceipt: CodingAgentSessionReceipt;
  receiptReview: CodingAgentSessionReceipt;
  implementationEvidence: CodingAgentImplementationEvidence;
  artifactAudit: CodingAgentImplementationArtifactAudit;
  gatewayRunnerId?: string;
  authMode?: string;
  leaseValidation?: CodingAgentRunnerLeaseValidation;
  honestyClaim: {
    level: "local-sandbox-runner-drill";
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

export type CodingAgentImplementationWorktreeStatus =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "typechange"
  | "unmerged"
  | "clean"
  | "unknown";

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
  worktreeChanged?: boolean;
  worktreeStatus?: CodingAgentImplementationWorktreeStatus;
  worktreeReason?: string;
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
    worktreeCheckedChangedFiles: number;
    worktreeChangedFiles: number;
    worktreeUnchangedFiles: number;
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
  | "development.coding_sessions.runner_manifest_prepared"
  | "development.coding_sessions.runner_invocation_prepared"
  | "development.coding_sessions.runner_intake_audited"
  | "development.coding_sessions.runner_self_test_completed"
  | "development.coding_sessions.sandbox_runner_preflight_completed"
  | "development.coding_sessions.sandbox_runner_completed"
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
