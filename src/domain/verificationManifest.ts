import type {
  CodingAgentDispatchDrillSummary,
  CodingAgentDispatchSimulationSummary,
  CodingAgentReceiptDrillSummary,
  CodingAgentRunnerIntakeAuditDrillSummary,
  CodingAgentRunnerInvocationDrillSummary,
  CodingAgentRunnerManifestDrillSummary,
  CodingAgentRunnerSelfTestDrillSummary,
  CodingAgentSandboxRunnerDrillSummary,
  ExecutorContractDrillSummary,
  ExecutorProfileId,
  LocalizationDrillSummary,
  ProductionBoundaryDrillSummary,
  ReleaseVerificationReport,
  SandboxCapabilityDrillSummary,
  SecurityRedTeamDrillSummary,
  VerificationManifest,
  VerificationManifestCheck
} from "./types";

const expectedLocales = ["ja", "en", "zh-Hans", "zh-Hant", "ko"];
const expectedExecutorProfiles: ExecutorProfileId[] = [
  "browser-sandbox",
  "desktop-vm",
  "shell-container",
  "mcp-proxy",
  "human-approval"
];

export interface BuildVerificationManifestInput {
  codingAgentDispatchDrill: CodingAgentDispatchDrillSummary;
  codingAgentDispatchSimulation: CodingAgentDispatchSimulationSummary;
  codingAgentRunnerManifest: CodingAgentRunnerManifestDrillSummary;
  codingAgentRunnerInvocation: CodingAgentRunnerInvocationDrillSummary;
  codingAgentRunnerIntake: CodingAgentRunnerIntakeAuditDrillSummary;
  codingAgentRunnerSelfTest: CodingAgentRunnerSelfTestDrillSummary;
  codingAgentSandboxRunner: CodingAgentSandboxRunnerDrillSummary;
  codingAgentReport: CodingAgentReceiptDrillSummary;
  localizationDrill: LocalizationDrillSummary;
  executorContractDrill: ExecutorContractDrillSummary;
  sandboxCapabilityDrill: SandboxCapabilityDrillSummary;
  securityRedTeamDrill: SecurityRedTeamDrillSummary;
  productionBoundaryDrill: ProductionBoundaryDrillSummary;
  releaseVerification: ReleaseVerificationReport;
  generatedAt?: string;
  inputs: {
    codingAgentDispatchDrill: string;
    codingAgentDispatchSimulation: string;
    codingAgentRunnerManifest: string;
    codingAgentRunnerInvocation: string;
    codingAgentRunnerIntakeAudit: string;
    codingAgentRunnerSelfTest: string;
    codingAgentSandboxRunner: string;
    codingAgentReceiptDrill: string;
    localizationDrill: string;
    executorContractDrill: string;
    sandboxCapabilityDrill: string;
    securityRedTeamDrill: string;
    productionBoundaryDrill: string;
    releaseVerification: string;
  };
}

export function buildVerificationManifest({
  codingAgentDispatchDrill,
  codingAgentDispatchSimulation,
  codingAgentRunnerManifest,
  codingAgentRunnerInvocation,
  codingAgentRunnerIntake,
  codingAgentRunnerSelfTest,
  codingAgentSandboxRunner,
  codingAgentReport,
  localizationDrill,
  executorContractDrill,
  sandboxCapabilityDrill,
  securityRedTeamDrill,
  productionBoundaryDrill,
  releaseVerification,
  generatedAt = new Date().toISOString(),
  inputs
}: BuildVerificationManifestInput): VerificationManifest {
  const checks = [
    codingAgentDispatchCheck(codingAgentDispatchDrill),
    codingAgentSimulationCheck(codingAgentDispatchSimulation),
    codingAgentRunnerManifestCheck(codingAgentRunnerManifest),
    codingAgentRunnerInvocationCheck(codingAgentRunnerInvocation),
    codingAgentRunnerIntakeCheck(codingAgentRunnerIntake),
    codingAgentRunnerSelfTestCheck(codingAgentRunnerSelfTest),
    codingAgentSandboxRunnerCheck(codingAgentSandboxRunner),
    codingAgentValidCheck(codingAgentReport),
    codingAgentMismatchCheck(codingAgentReport),
    codingAgentOutOfScopeCheck(codingAgentReport),
    localizationDrillCheck(localizationDrill),
    executorContractDrillCheck(executorContractDrill),
    sandboxCapabilityDrillCheck(sandboxCapabilityDrill),
    securityRedTeamDrillCheck(securityRedTeamDrill),
    releaseVerificationCheck(releaseVerification),
    dryRunBoundaryCheck(releaseVerification),
    productionBoundaryDrillCheck(productionBoundaryDrill)
  ];
  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.length - passed;

  return {
    schema: "naikaku.verification-manifest.v1",
    generatedAt,
    decision: failed === 0 ? "verified" : "invalid",
    inputs,
    source: {
      codingAgentDispatchGeneratedAt: codingAgentDispatchDrill.generatedAt,
      codingAgentDispatchSimulationGeneratedAt: codingAgentDispatchSimulation.generatedAt,
      codingAgentRunnerManifestGeneratedAt: codingAgentRunnerManifest.generatedAt,
      codingAgentRunnerInvocationGeneratedAt: codingAgentRunnerInvocation.generatedAt,
      codingAgentRunnerIntakeAuditGeneratedAt: codingAgentRunnerIntake.generatedAt,
      codingAgentRunnerSelfTestGeneratedAt: codingAgentRunnerSelfTest.generatedAt,
      codingAgentSandboxRunnerGeneratedAt: codingAgentSandboxRunner.generatedAt,
      codingAgentGeneratedAt: codingAgentReport.generatedAt,
      localizationGeneratedAt: localizationDrill.generatedAt,
      executorContractGeneratedAt: executorContractDrill.generatedAt,
      sandboxCapabilityGeneratedAt: sandboxCapabilityDrill.generatedAt,
      securityRedTeamGeneratedAt: securityRedTeamDrill.generatedAt,
      productionBoundaryGeneratedAt: productionBoundaryDrill.generatedAt,
      releaseVerificationGeneratedAt: releaseVerification.generatedAt,
      localizationLocales: localizationDrill.locales.map((locale) => locale.locale),
      executorProfiles: executorContractDrill.profiles.map((profile) => profile.profileId),
      sandboxCapabilityProfiles: sandboxCapabilityDrill.profiles.map((profile) => profile.profileId),
      securityRedTeamCases: securityRedTeamDrill.summary.cases,
      productionBoundaryExitCode: productionBoundaryDrill.observedExitCode,
      releaseRunId: releaseVerification.sourceRunId,
      releaseScope: releaseVerification.scope
    },
    checks,
    summary: {
      total: checks.length,
      passed,
      failed
    },
    honestyClaim: {
      claim: "This manifest aggregates local verification gates without replacing the original evidence reports.",
      limitations: [
        "It reads existing local drill outputs and release verification output; it does not rerun commands itself.",
        "It does not prove production runner, provider, browser, deploy target, external service, or Git remote execution.",
        "It is valid only with the referenced localization, executor, sandbox capability, security red-team, production boundary, dispatch, dispatch simulation, runner manifest, runner invocation, runner intake audit, runner self-test, sandbox runner, receipt, and release verification source reports attached."
      ],
      productionRequirements: [
        "Attach authenticated production runner evidence before external handoff.",
        "Run production-mode release verification before claiming production readiness.",
        "Keep the referenced drill and release verification reports with this manifest."
      ]
    }
  };
}

export function serializeVerificationManifest(manifest: VerificationManifest) {
  return JSON.stringify(manifest, null, 2);
}

function codingAgentSimulationCheck(report: CodingAgentDispatchSimulationSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-dispatch-simulation.v1"
    && report.source.dispatchDecision === "dispatchable"
    && report.source.archiveAuditDecision === "verified"
    && report.source.readyItems > 0
    && report.simulation.decision === "ready-for-real-agent"
    && report.simulation.readyForAgent === report.source.readyItems
    && report.simulation.blocked === 0
    && report.simulation.receiptDraftItems === report.source.readyItems
    && report.simulation.receiptDraftFilesWritten === report.source.readyItems
    && report.simulation.plannedCommands > 0
    && report.simulation.expectedEvidenceArtifacts > 0
    && report.simulation.unsafePaths === 0
    && report.productionHeld.decision === "needs-review"
    && report.productionHeld.readyForAgent === 0
    && report.productionHeld.promptFiles === 0
    && report.productionHeld.receiptDraftItems === 0
    && report.productionHeld.receiptDraftFilesWritten === 0
    && checksPassed;

  return {
    id: "coding-agent-dispatch-simulation",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent dispatch simulation prepared receipt drafts for ready sessions and kept production-held sessions unassigned."
      : "Coding-agent dispatch simulation did not preserve ready, receipt-draft, or production-held boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Dispatch decision: ${report.source.dispatchDecision}`,
      `Archive audit: ${report.source.archiveAuditDecision}`,
      `Simulation decision: ${report.simulation.decision}`,
      `Ready for real agent: ${report.simulation.readyForAgent}/${report.source.readyItems}`,
      `Receipt draft items: ${report.simulation.receiptDraftItems}`,
      `Receipt draft files written: ${report.simulation.receiptDraftFilesWritten}`,
      `Planned commands: ${report.simulation.plannedCommands}`,
      `Expected evidence artifacts: ${report.simulation.expectedEvidenceArtifacts}`,
      `Unsafe paths: ${report.simulation.unsafePaths}`,
      `Production-held decision: ${report.productionHeld.decision}`,
      `Production-held ready: ${report.productionHeld.readyForAgent}`,
      `Production-held prompt files: ${report.productionHeld.promptFiles}`,
      `Production-held receipt drafts: ${report.productionHeld.receiptDraftItems}`,
      `Production-held receipt draft files: ${report.productionHeld.receiptDraftFilesWritten}`
    ],
    nextAction: ok
      ? "Keep the dispatch simulation summary attached before handing prompts to real coding agents."
      : "Restore dispatch simulation so it creates pending receipt drafts only for verified ready sessions."
  };
}

function codingAgentRunnerManifestCheck(report: CodingAgentRunnerManifestDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-runner-manifest-drill.v1"
    && report.source.simulationDecision === "ready-for-real-agent"
    && report.source.readyForAgent > 0
    && report.source.receiptDraftFilesWritten === report.source.readyForAgent
    && report.valid.decision === "runner-ready"
    && report.valid.readyTasks === report.source.readyForAgent
    && report.valid.runnerTasks === report.valid.readyTasks
    && report.valid.blockedTasks === 0
    && report.valid.receiptDraftPaths === report.valid.readyTasks
    && report.valid.plannedCommands > 0
    && report.valid.expectedEvidenceArtifacts > 0
    && report.valid.stopConditions >= report.valid.readyTasks
    && report.valid.unsafePaths === 0
    && report.productionHeld.decision === "needs-review"
    && report.productionHeld.readyTasks === 0
    && report.productionHeld.runnerTasks === 0
    && report.productionHeld.receiptDraftPaths === 0
    && report.productionHeld.unsafePaths === 0
    && checksPassed;

  return {
    id: "coding-agent-runner-manifest",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent runner manifest queued ready simulation drafts while keeping production-held sessions out of runner tasks."
      : "Coding-agent runner manifest did not preserve ready, pending-draft, or production-held runner boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Simulation decision: ${report.source.simulationDecision}`,
      `Source ready: ${report.source.readyForAgent}`,
      `Source receipt draft files: ${report.source.receiptDraftFilesWritten}`,
      `Runner decision: ${report.valid.decision}`,
      `Ready runner tasks: ${report.valid.readyTasks}`,
      `Runner tasks: ${report.valid.runnerTasks}`,
      `Receipt draft paths: ${report.valid.receiptDraftPaths}`,
      `Planned commands: ${report.valid.plannedCommands}`,
      `Expected evidence artifacts: ${report.valid.expectedEvidenceArtifacts}`,
      `Stop conditions: ${report.valid.stopConditions}`,
      `Unsafe paths: ${report.valid.unsafePaths}`,
      `Production-held decision: ${report.productionHeld.decision}`,
      `Production-held runner tasks: ${report.productionHeld.runnerTasks}`,
      `Production-held receipt draft paths: ${report.productionHeld.receiptDraftPaths}`
    ],
    nextAction: ok
      ? "Keep the runner manifest summary attached before releasing tasks to governed coding-agent runners."
      : "Restore runner manifest gating so only verified-ready pending drafts become runner tasks."
  };
}

function codingAgentRunnerInvocationCheck(report: CodingAgentRunnerInvocationDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-runner-invocation-drill.v1"
    && report.source.runnerManifestDecision === "runner-ready"
    && report.source.readyTasks > 0
    && report.source.runnerTasks === report.source.readyTasks
    && report.source.receiptDraftPaths === report.source.readyTasks
    && report.valid.decision === "package-ready"
    && report.valid.readyInvocations === report.source.runnerTasks
    && report.valid.blockedInvocations === 0
    && report.valid.invocationFiles === report.valid.readyInvocations
    && report.valid.commandContracts > 0
    && report.valid.expectedEvidenceArtifacts > 0
    && report.valid.receiptDraftPaths === report.valid.readyInvocations
    && report.valid.unsafePaths === 0
    && report.valid.stopConditions >= report.valid.readyInvocations
    && report.productionHeld.decision === "needs-review"
    && report.productionHeld.readyInvocations === 0
    && report.productionHeld.invocationFiles === 0
    && report.productionHeld.receiptDraftPaths === 0
    && report.productionHeld.unsafePaths === 0
    && checksPassed;

  return {
    id: "coding-agent-runner-invocation",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent runner invocation package wrote executable handoff files for ready tasks and kept production-held sessions unpackaged."
      : "Coding-agent runner invocation package did not preserve ready, pending-command, or production-held boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Runner manifest decision: ${report.source.runnerManifestDecision}`,
      `Source runner tasks: ${report.source.runnerTasks}`,
      `Source receipt draft paths: ${report.source.receiptDraftPaths}`,
      `Invocation decision: ${report.valid.decision}`,
      `Ready invocations: ${report.valid.readyInvocations}`,
      `Invocation files: ${report.valid.invocationFiles}`,
      `Command contracts: ${report.valid.commandContracts}`,
      `Expected evidence artifacts: ${report.valid.expectedEvidenceArtifacts}`,
      `Receipt draft paths: ${report.valid.receiptDraftPaths}`,
      `Unsafe paths: ${report.valid.unsafePaths}`,
      `Production-held decision: ${report.productionHeld.decision}`,
      `Production-held ready invocations: ${report.productionHeld.readyInvocations}`,
      `Production-held invocation files: ${report.productionHeld.invocationFiles}`
    ],
    nextAction: ok
      ? "Keep the invocation package summary attached before handing per-task files to governed coding-agent runners."
      : "Restore invocation packaging so only runner-ready tasks receive executable handoff files."
  };
}

function codingAgentRunnerIntakeCheck(report: CodingAgentRunnerIntakeAuditDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-runner-intake-audit-drill.v1"
    && report.source.runnerInvocationDecision === "package-ready"
    && report.source.readyInvocations > 0
    && report.source.invocationFiles === report.source.readyInvocations
    && report.source.commandContracts > 0
    && report.source.receiptDraftPaths === report.source.readyInvocations
    && report.valid.decision === "accepted-for-runner"
    && report.valid.acceptedIntakes === report.source.invocationFiles
    && report.valid.blockedIntakes === 0
    && report.valid.invocationFiles === report.valid.acceptedIntakes
    && report.valid.invocationFilesFound === report.valid.invocationFiles
    && report.valid.markdownFilesFound === report.valid.invocationFiles
    && report.valid.commandContracts === report.source.commandContracts
    && report.valid.expectedEvidenceArtifacts > 0
    && report.valid.receiptDraftPaths === report.valid.acceptedIntakes
    && report.valid.unsafePaths === 0
    && report.valid.sourceBlockedChecks === 0
    && report.valid.completedCommandResults === 0
    && report.valid.blockedSecurityClassifications === 0
    && report.productionHeld.decision === "needs-review"
    && report.productionHeld.acceptedIntakes === 0
    && report.productionHeld.invocationFiles === 0
    && report.productionHeld.invocationFilesFound === 0
    && report.productionHeld.receiptDraftPaths === 0
    && report.productionHeld.unsafePaths === 0
    && report.productionHeld.blockedSecurityClassifications === 0
    && report.securityBlocked.decision === "blocked"
    && report.securityBlocked.acceptedIntakes < report.source.readyInvocations
    && report.securityBlocked.blockedIntakes > 0
    && report.securityBlocked.completedCommandResults === 0
    && report.securityBlocked.unsafePaths === 0
    && report.securityBlocked.blockedSecurityClassifications > 0
    && checksPassed;

  return {
    id: "coding-agent-runner-intake-audit",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent runner intake audit accepted only readable ready invocation files, kept production-held sessions unaccepted, and blocked a tampered dangerous command handoff."
      : "Coding-agent runner intake audit did not preserve readable-file, pending-command, security-classifier, or production-held boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Runner invocation decision: ${report.source.runnerInvocationDecision}`,
      `Source ready invocations: ${report.source.readyInvocations}`,
      `Source invocation files: ${report.source.invocationFiles}`,
      `Source command contracts: ${report.source.commandContracts}`,
      `Intake decision: ${report.valid.decision}`,
      `Accepted intakes: ${report.valid.acceptedIntakes}`,
      `Blocked intakes: ${report.valid.blockedIntakes}`,
      `Invocation files: ${report.valid.invocationFiles}`,
      `Invocation files found: ${report.valid.invocationFilesFound}`,
      `Markdown files found: ${report.valid.markdownFilesFound}`,
      `Completed command results: ${report.valid.completedCommandResults}`,
      `Source blocked checks: ${report.valid.sourceBlockedChecks}`,
      `Unsafe paths: ${report.valid.unsafePaths}`,
      `Blocked security classifications: ${report.valid.blockedSecurityClassifications}`,
      `Production-held decision: ${report.productionHeld.decision}`,
      `Production-held accepted intakes: ${report.productionHeld.acceptedIntakes}`,
      `Production-held invocation files found: ${report.productionHeld.invocationFilesFound}`,
      `Production-held blocked security classifications: ${report.productionHeld.blockedSecurityClassifications}`,
      `Security-blocked decision: ${report.securityBlocked.decision}`,
      `Security-blocked intakes: ${report.securityBlocked.blockedIntakes}`,
      `Security-blocked command results: ${report.securityBlocked.completedCommandResults}`,
      `Security-blocked classifications: ${report.securityBlocked.blockedSecurityClassifications}`
    ],
    nextAction: ok
      ? "Keep the intake audit summary attached before a governed runner consumes invocation files."
      : "Restore runner intake auditing so only readable, package-ready, security-classifier-clean invocation files can reach coding runners."
  };
}

function codingAgentRunnerSelfTestCheck(report: CodingAgentRunnerSelfTestDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-runner-self-test-drill.v1"
    && report.source.runnerManifestDecision === "runner-ready"
    && report.source.readyTasks > 0
    && report.source.runnerTasks === report.source.readyTasks
    && report.source.receiptDraftPaths === report.source.readyTasks
    && report.valid.decision === "self-test-ready"
    && report.valid.wouldRun === report.source.runnerTasks
    && report.valid.blocked === 0
    && report.valid.pendingCommands > 0
    && report.valid.notExecutedCommands === report.valid.pendingCommands
    && report.valid.expectedEvidenceArtifacts > 0
    && report.valid.receiptDraftPaths === report.valid.wouldRun
    && report.valid.unsafePaths === 0
    && report.valid.stopConditions >= report.valid.wouldRun
    && report.productionHeld.decision === "needs-review"
    && report.productionHeld.wouldRun === 0
    && report.productionHeld.receiptDraftPaths === 0
    && report.productionHeld.unsafePaths === 0
    && checksPassed;

  return {
    id: "coding-agent-runner-self-test",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent runner self-test consumed runner manifests without executing commands or queuing production-held tasks."
      : "Coding-agent runner self-test did not preserve non-execution or production-held runner boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Runner manifest decision: ${report.source.runnerManifestDecision}`,
      `Source runner tasks: ${report.source.runnerTasks}`,
      `Source receipt draft paths: ${report.source.receiptDraftPaths}`,
      `Self-test decision: ${report.valid.decision}`,
      `Would run: ${report.valid.wouldRun}`,
      `Pending commands: ${report.valid.pendingCommands}`,
      `Not-executed commands: ${report.valid.notExecutedCommands}`,
      `Expected evidence artifacts: ${report.valid.expectedEvidenceArtifacts}`,
      `Receipt draft paths: ${report.valid.receiptDraftPaths}`,
      `Unsafe paths: ${report.valid.unsafePaths}`,
      `Production-held decision: ${report.productionHeld.decision}`,
      `Production-held would-run: ${report.productionHeld.wouldRun}`,
      `Production-held receipt draft paths: ${report.productionHeld.receiptDraftPaths}`
    ],
    nextAction: ok
      ? "Keep the runner self-test summary attached before handing manifests to governed coding-agent runners."
      : "Restore runner self-test so it only preflights contracts and never claims completed execution."
  };
}

function codingAgentSandboxRunnerCheck(report: CodingAgentSandboxRunnerDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-sandbox-runner-drill.v1"
    && report.source.runnerSelfTestDecision === "self-test-ready"
    && report.source.wouldRun > 0
    && report.source.pendingCommands > 0
    && report.source.notExecutedCommands === report.source.pendingCommands
    && report.source.expectedEvidenceArtifacts > 0
    && report.source.receiptDraftPaths === report.source.wouldRun
    && report.valid.decision === "sandbox-runner-verified"
    && report.valid.executedTasks === report.source.wouldRun
    && report.valid.commandResults === report.source.notExecutedCommands
    && report.valid.processExecutions > 0
    && report.valid.failedCommands === 0
    && report.valid.blockedCommands === 0
    && report.valid.transcriptFilesWritten === report.valid.commandResults
    && report.valid.changedFileSummaries === report.valid.executedTasks
    && report.valid.evidenceArtifacts === report.source.expectedEvidenceArtifacts
    && report.valid.receiptReviewDecision === "verified"
    && report.valid.evidenceDecision === "accepted-for-handoff"
    && report.valid.artifactAuditDecision === "verified"
    && report.valid.verifiedArtifactPaths > report.valid.commandResults
    && report.valid.transcriptContentMismatches === 0
    && report.valid.reusedTranscriptRefs === 0
    && report.valid.unsafePaths === 0
    && report.productionHeld.decision === "needs-review"
    && report.productionHeld.executedTasks === 0
    && report.productionHeld.commandResults === 0
    && report.productionHeld.processExecutions === 0
    && report.productionHeld.receiptReviewDecision === "blocked"
    && report.productionHeld.artifactAuditDecision === "blocked"
    && report.securityBlockedPreflight.decision === "blocked"
    && report.securityBlockedPreflight.dangerousCommandAllowlisted
    && report.securityBlockedPreflight.blockedTasks > 0
    && report.securityBlockedPreflight.blockedCommands > 0
    && report.securityBlockedPreflight.blockedSecurityCommands > 0
    && checksPassed;

  return {
    id: "coding-agent-sandbox-runner",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent sandbox runner executed allowlisted local verification commands, produced auditable drill receipts, and blocked a deliberately allowlisted dangerous command before execution."
      : "Coding-agent sandbox runner did not preserve allowlist execution, security-classifier, receipt, artifact, or production-held boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Runner self-test decision: ${report.source.runnerSelfTestDecision}`,
      `Source would-run: ${report.source.wouldRun}`,
      `Source not-executed commands: ${report.source.notExecutedCommands}`,
      `Sandbox runner decision: ${report.valid.decision}`,
      `Executed tasks: ${report.valid.executedTasks}`,
      `Process executions: ${report.valid.processExecutions}`,
      `Command results: ${report.valid.commandResults}`,
      `Failed commands: ${report.valid.failedCommands}`,
      `Blocked commands: ${report.valid.blockedCommands}`,
      `Transcript files: ${report.valid.transcriptFilesWritten}`,
      `Changed-file summaries: ${report.valid.changedFileSummaries}`,
      `Evidence artifacts: ${report.valid.evidenceArtifacts}`,
      `Receipt review: ${report.valid.receiptReviewDecision}`,
      `Implementation evidence: ${report.valid.evidenceDecision}`,
      `Artifact audit: ${report.valid.artifactAuditDecision}`,
      `Verified artifact paths: ${report.valid.verifiedArtifactPaths}`,
      `Transcript mismatches: ${report.valid.transcriptContentMismatches}`,
      `Reused transcript refs: ${report.valid.reusedTranscriptRefs}`,
      `Unsafe paths: ${report.valid.unsafePaths}`,
      `Production-held decision: ${report.productionHeld.decision}`,
      `Production-held executions: ${report.productionHeld.processExecutions}`,
      `Production-held receipt review: ${report.productionHeld.receiptReviewDecision}`,
      `Security preflight decision: ${report.securityBlockedPreflight.decision}`,
      `Security preflight tampered command: ${report.securityBlockedPreflight.tamperedCommand}`,
      `Security preflight dangerous command allowlisted: ${report.securityBlockedPreflight.dangerousCommandAllowlisted}`,
      `Security preflight blocked commands: ${report.securityBlockedPreflight.blockedCommands}`,
      `Security preflight blocked security commands: ${report.securityBlockedPreflight.blockedSecurityCommands}`
    ],
    nextAction: ok
      ? "Keep the sandbox runner drill summary attached as local runner plumbing evidence; replace it with real task receipts before Development Board reconciliation."
      : "Restore the sandbox runner so only allowlisted, security-classifier-clean local commands execute and production-held tasks remain unrun."
  };
}

function codingAgentDispatchCheck(report: CodingAgentDispatchDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.coding-agent-dispatch-drill.v1"
    && report.valid.dispatchDecision === "dispatchable"
    && report.valid.readyItems > 0
    && report.valid.promptFiles === report.valid.readyItems
    && report.valid.promptFilesWritten === report.valid.promptFiles
    && report.valid.receiptTemplateWritten
    && report.valid.archiveFilesWritten >= report.valid.promptFiles + 3
    && report.valid.archiveUnsafePaths === 0
    && report.valid.archiveAuditDecision === "verified"
    && report.valid.archiveAuditBlockers === 0
    && report.valid.archiveMissingPromptFiles === 0
    && report.valid.archiveUnexpectedPromptFiles === 0
    && report.valid.uniqueEvidencePrefixes === report.valid.totalItems
    && report.valid.unsafePaths === 0
    && report.productionHeld.dispatchDecision === "blocked"
    && report.productionHeld.readyItems === 0
    && report.productionHeld.productionHeldItems > 0
    && report.productionHeld.promptFilesWritten === 0
    && !report.productionHeld.receiptTemplateWritten
    && report.productionHeld.archiveUnsafePaths === 0
    && report.productionHeld.archiveAuditDecision === "verified"
    && report.productionHeld.archiveAuditBlockers === 0
    && report.productionHeld.archiveMissingPromptFiles === 0
    && report.productionHeld.archiveUnexpectedPromptFiles === 0
    && report.productionHeld.unsafePaths === 0
    && checksPassed;

  return {
    id: "coding-agent-dispatch-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent dispatch package wrote ready prompts and kept production-held sessions unassigned."
      : "Coding-agent dispatch package did not preserve ready versus held boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Valid decision: ${report.valid.dispatchDecision}`,
      `Valid prompts written: ${report.valid.promptFilesWritten}/${report.valid.promptFiles}`,
      `Receipt template written: ${report.valid.receiptTemplateWritten}`,
      `Valid archive files written: ${report.valid.archiveFilesWritten}`,
      `Valid archive audit: ${report.valid.archiveAuditDecision}`,
      `Valid archive audit blockers: ${report.valid.archiveAuditBlockers}`,
      `Valid archive missing prompts: ${report.valid.archiveMissingPromptFiles}`,
      `Valid archive unsafe paths: ${report.valid.archiveUnsafePaths}`,
      `Valid unsafe paths: ${report.valid.unsafePaths}`,
      `Production-held decision: ${report.productionHeld.dispatchDecision}`,
      `Production-held ready items: ${report.productionHeld.readyItems}`,
      `Production-held prompts written: ${report.productionHeld.promptFilesWritten}`,
      `Production-held archive audit: ${report.productionHeld.archiveAuditDecision}`,
      `Production-held archive audit blockers: ${report.productionHeld.archiveAuditBlockers}`,
      `Production-held archive unsafe paths: ${report.productionHeld.archiveUnsafePaths}`,
      `Production-held receipt template written: ${report.productionHeld.receiptTemplateWritten}`
    ],
    nextAction: ok
      ? "Keep the dispatch drill summary attached before handing prompts to coding agents."
      : "Restore dispatch gating so held sessions cannot receive prompt files or receipt templates."
  };
}

function codingAgentValidCheck(report: CodingAgentReceiptDrillSummary): VerificationManifestCheck {
  const ok = report.valid.receiptDecision === "verified"
    && report.valid.evidenceDecision === "accepted-for-handoff"
    && report.valid.artifactAuditDecision === "verified"
    && report.valid.transcriptContentMismatches === 0
    && report.valid.boardItemsApplied === report.source.boardItems
    && report.valid.boardItemsSkipped === 0;

  return {
    id: "coding-agent-valid-receipt",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Valid coding-agent receipt verified and applied every Development Board item."
      : "Valid coding-agent receipt did not fully verify or reconcile.",
    evidence: [
      `Receipt: ${report.valid.receiptDecision}`,
      `Implementation evidence: ${report.valid.evidenceDecision}`,
      `Artifact audit: ${report.valid.artifactAuditDecision}`,
      `Transcript mismatches: ${report.valid.transcriptContentMismatches}`,
      `Board applied: ${report.valid.boardItemsApplied}/${report.source.boardItems}`,
      `Board skipped: ${report.valid.boardItemsSkipped}`
    ],
    nextAction: ok
      ? "Keep the valid receipt drill summary attached to release evidence."
      : "Fix the coding-agent receipt, evidence, artifact audit, or reconciliation gate before release verification."
  };
}

function codingAgentMismatchCheck(report: CodingAgentReceiptDrillSummary): VerificationManifestCheck {
  const missingEvidence = report.mismatched.firstMissingEvidence || "";
  const ok = report.mismatched.receiptDecision === "needs-evidence"
    && report.mismatched.pendingEvidence > 0
    && report.mismatched.evidenceDecision === "needs-evidence"
    && report.mismatched.artifactAuditDecision === "needs-artifacts"
    && report.mismatched.boardItemsApplied === 0
    && missingEvidence.includes("Evidence artifact is required for:");

  return {
    id: "coding-agent-mismatched-receipt",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Mismatched coding-agent evidence stayed blocked and did not update the Development Board."
      : "Mismatched coding-agent evidence was not blocked correctly.",
    evidence: [
      `Receipt: ${report.mismatched.receiptDecision}`,
      `Pending evidence: ${report.mismatched.pendingEvidence}`,
      `Implementation evidence: ${report.mismatched.evidenceDecision}`,
      `Artifact audit: ${report.mismatched.artifactAuditDecision}`,
      `Board applied: ${report.mismatched.boardItemsApplied}`,
      `First missing: ${report.mismatched.firstMissingEvidence || "none"}`
    ],
    nextAction: ok
      ? "Keep this anti-fake drill in the release verification path."
      : "Restore evidence coverage checks so unrelated artifacts cannot satisfy receipt requirements."
  };
}

function codingAgentOutOfScopeCheck(report: CodingAgentReceiptDrillSummary): VerificationManifestCheck {
  const missingEvidence = report.outOfScope.firstMissingEvidence || "";
  const ok = report.outOfScope.receiptDecision === "needs-evidence"
    && report.outOfScope.pendingEvidence > 0
    && report.outOfScope.evidenceDecision === "needs-evidence"
    && report.outOfScope.artifactAuditDecision === "needs-artifacts"
    && report.outOfScope.boardItemsApplied === 0
    && missingEvidence.includes("session evidence prefix");

  return {
    id: "coding-agent-out-of-scope-receipt",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Coding-agent evidence outside the session sandbox prefix stayed blocked and did not update the Development Board."
      : "Out-of-scope coding-agent evidence was not blocked correctly.",
    evidence: [
      `Receipt: ${report.outOfScope.receiptDecision}`,
      `Pending evidence: ${report.outOfScope.pendingEvidence}`,
      `Implementation evidence: ${report.outOfScope.evidenceDecision}`,
      `Artifact audit: ${report.outOfScope.artifactAuditDecision}`,
      `Board applied: ${report.outOfScope.boardItemsApplied}`,
      `First missing: ${report.outOfScope.firstMissingEvidence || "none"}`
    ],
    nextAction: ok
      ? "Keep the sandbox-prefix receipt drill in the release verification path."
      : "Restore session evidence-prefix checks so unrelated sandbox artifacts cannot satisfy receipt requirements."
  };
}

function localizationDrillCheck(report: LocalizationDrillSummary): VerificationManifestCheck {
  const locales = report.locales.map((locale) => locale.locale);
  const checksPassed = report.locales.every((locale) =>
    Object.values(locale.checks).every(Boolean) && locale.failures.length === 0
  );
  const simulationContractsPassed = report.locales.every((locale) =>
    locale.archiveAuditDecision === "verified" &&
    locale.simulationDecision === "ready-for-real-agent" &&
    locale.simulationReadyForAgent === locale.dispatchReady &&
    locale.simulationReceiptDrafts === locale.dispatchReady &&
    locale.runnerManifestDecision === "runner-ready" &&
    locale.runnerReadyTasks === locale.dispatchReady &&
    locale.runnerTasks === locale.dispatchReady &&
    locale.runnerInvocationDecision === "package-ready" &&
    locale.runnerInvocationReadyInvocations === locale.runnerTasks &&
    locale.runnerInvocationFiles === locale.runnerInvocationReadyInvocations &&
    locale.runnerIntakeDecision === "accepted-for-runner" &&
    locale.runnerIntakeAccepted === locale.runnerInvocationReadyInvocations &&
    locale.runnerSelfTestDecision === "self-test-ready" &&
    locale.runnerSelfTestWouldRun === locale.runnerTasks &&
    locale.runnerSelfTestNotExecutedCommands > 0 &&
    Boolean(locale.checks.archiveAuditVerified) &&
    Boolean(locale.checks.simulationContractStable) &&
    Boolean(locale.checks.runnerManifestContractStable) &&
    Boolean(locale.checks.runnerInvocationContractStable) &&
    Boolean(locale.checks.runnerIntakeContractStable) &&
    Boolean(locale.checks.runnerSelfTestContractStable)
  );
  const ok = report.schema === "naikaku.localization-drill.v1"
    && report.defaultLocale === "ja"
    && report.summary.failed === 0
    && report.summary.total === expectedLocales.length
    && expectedLocales.every((locale, index) => locales[index] === locale)
    && report.summary.simulationReadyForAgent === report.summary.dispatchReady
    && report.summary.simulationReceiptDrafts === report.summary.dispatchReady
    && report.summary.runnerReadyTasks === report.summary.dispatchReady
    && report.summary.runnerTasks === report.summary.dispatchReady
    && report.summary.runnerInvocationReadyInvocations === report.summary.runnerTasks
    && report.summary.runnerInvocationFiles === report.summary.runnerInvocationReadyInvocations
    && report.summary.runnerIntakeAccepted === report.summary.runnerInvocationReadyInvocations
    && report.summary.runnerSelfTestWouldRun === report.summary.runnerTasks
    && report.summary.runnerSelfTestNotExecutedCommands > 0
    && report.summary.simulationReadyForAgent > 0
    && simulationContractsPassed
    && checksPassed;

  return {
    id: "localization-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Japanese-first localization drill preserved coding-agent handoff contracts in every supported locale."
      : "Localization drill did not prove every supported locale and machine contract.",
    evidence: [
      `Schema: ${report.schema}`,
      `Default locale: ${report.defaultLocale}`,
      `Locales: ${locales.join(", ")}`,
      `Passed: ${report.summary.passed}/${report.summary.total}`,
      `Failed: ${report.summary.failed}`,
      `Ready sessions: ${report.summary.readySessions}`,
      `Would assign: ${report.summary.wouldAssign}`,
      `Dispatch ready: ${report.summary.dispatchReady}`,
      `Simulation ready: ${report.summary.simulationReadyForAgent}`,
      `Simulation receipt drafts: ${report.summary.simulationReceiptDrafts}`,
      `Runner ready tasks: ${report.summary.runnerReadyTasks}`,
      `Runner tasks: ${report.summary.runnerTasks}`,
      `Runner invocation ready: ${report.summary.runnerInvocationReadyInvocations}`,
      `Runner invocation files: ${report.summary.runnerInvocationFiles}`,
      `Runner intake accepted: ${report.summary.runnerIntakeAccepted}`,
      `Runner self-test would-run: ${report.summary.runnerSelfTestWouldRun}`,
      `Runner self-test not-executed commands: ${report.summary.runnerSelfTestNotExecutedCommands}`,
      `Pending receipt items: ${report.summary.pendingReceiptItems}`,
      `Session contract stable: ${report.locales.every((locale) => Boolean(locale.checks.sessionContractStable)) ? "yes" : "no"}`,
      `Simulation and runner contract stable: ${simulationContractsPassed ? "yes" : "no"}`
    ],
    nextAction: ok
      ? "Keep the localization drill summary attached to language release evidence."
      : "Rerun localization drill and fix locale order, prompt language instructions, or stable machine contracts."
  };
}

function executorContractDrillCheck(report: ExecutorContractDrillSummary): VerificationManifestCheck {
  const profiles = report.profiles.map((profile) => profile.profileId);
  const checksPassed = Object.values(report.checks).every(Boolean)
    && report.profiles.every((profile) => profile.failures.length === 0);
  const ok = report.schema === "naikaku.executor-contract-drill.v1"
    && report.mode === "dry-run"
    && report.summary.failed === 0
    && report.summary.profiles === expectedExecutorProfiles.length
    && expectedExecutorProfiles.every((profile) => profiles.includes(profile))
    && report.blockedAction.status === "blocked"
    && report.blockedAction.held
    && !report.blockedAction.executed
    && checksPassed;

  return {
    id: "executor-contract-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Executor contract drill covered every sandbox profile and kept blocked production actions held."
      : "Executor contract drill did not prove every profile or blocked-action boundary.",
    evidence: [
      `Schema: ${report.schema}`,
      `Mode: ${report.mode}`,
      `Profiles: ${profiles.join(", ")}`,
      `Passed: ${report.summary.passed}/${report.summary.profiles}`,
      `Failed: ${report.summary.failed}`,
      `Ready actions: ${report.summary.readyActions}`,
      `Held actions: ${report.summary.heldActions}`,
      `Evidence items: ${report.summary.evidenceItems}`,
      `Blocked action: ${report.blockedAction.action} / held=${report.blockedAction.held} / executed=${report.blockedAction.executed}`
    ],
    nextAction: ok
      ? "Keep the executor contract drill summary attached to runner handoff evidence."
      : "Rerun executor drill and restore scoped commands, replayable evidence, dry-run identity, or blocked-action handling."
  };
}

function sandboxCapabilityDrillCheck(report: SandboxCapabilityDrillSummary): VerificationManifestCheck {
  const profiles = report.profiles.map((profile) => profile.profileId);
  const checksPassed = Object.values(report.checks).every(Boolean)
    && report.profiles.every((profile) => profile.failures.length === 0);
  const ok = report.schema === "naikaku.sandbox-capability-drill.v1"
    && report.valid.schema === "naikaku.sandbox-capabilities.v1"
    && report.valid.profiles === expectedExecutorProfiles.length
    && report.valid.rolesCovered > 0
    && report.valid.readinessChecks === expectedExecutorProfiles.length * 5
    && report.valid.passedReadinessChecks > 0
    && report.valid.warningReadinessChecks > 0
    && report.valid.blockedReadinessChecks > 0
    && report.valid.requiredApprovals > 0
    && report.valid.evidenceArtifacts >= expectedExecutorProfiles.length
    && report.valid.killSwitchArmed
    && expectedExecutorProfiles.every((profile) => profiles.includes(profile))
    && report.profiles.every((profile) =>
      profile.readinessChecks === 5 &&
      profile.evidenceArtifacts > 0
    )
    && !report.killSwitchOpen.killSwitchArmed
    && report.killSwitchOpen.blocked === report.killSwitchOpen.profiles
    && report.killSwitchOpen.blockedReadinessChecks >= expectedExecutorProfiles.length
    && checksPassed;

  return {
    id: "sandbox-capability-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Sandbox capability drill proved runner readiness checks, evidence requirements, approval gates, blocked reasons, and kill-switch behavior."
      : "Sandbox capability drill did not prove capability readiness or kill-switch boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Profiles: ${profiles.join(", ")}`,
      `Roles covered: ${report.valid.rolesCovered}`,
      `Readiness checks: ${report.valid.readinessChecks}`,
      `Readiness pass/warn/block: ${report.valid.passedReadinessChecks}/${report.valid.warningReadinessChecks}/${report.valid.blockedReadinessChecks}`,
      `Required approvals: ${report.valid.requiredApprovals}`,
      `Evidence artifacts: ${report.valid.evidenceArtifacts}`,
      `Default kill switch armed: ${report.valid.killSwitchArmed ? "yes" : "no"}`,
      `Kill-switch-open blocked profiles: ${report.killSwitchOpen.blocked}/${report.killSwitchOpen.profiles}`,
      `Kill-switch-open blocked checks: ${report.killSwitchOpen.blockedReadinessChecks}`
    ],
    nextAction: ok
      ? "Keep the sandbox capability drill summary attached before connecting real computer-use runners."
      : "Restore capability readiness checks, approval gates, evidence artifacts, and kill-switch blocking before runner handoff."
  };
}

function securityRedTeamDrillCheck(report: SecurityRedTeamDrillSummary): VerificationManifestCheck {
  const expectedCaseIds = [
    "prompt-injection-secret-exfiltration",
    "localhost-control-plane",
    "metadata-service",
    "git-mutation",
    "production-deploy-claim",
    "external-message",
    "approved-local-verification",
    "allowlisted-research"
  ];
  const caseIds = report.cases.map((item) => item.caseId);
  const checksPassed = Object.values(report.checks).every(Boolean)
    && report.cases.every((item) => item.failures.length === 0 && !item.executed);
  const ok = report.schema === "naikaku.security-red-team-drill.v1"
    && report.summary.cases >= expectedCaseIds.length
    && report.summary.passed === report.summary.cases
    && report.summary.failed === 0
    && report.summary.blocked >= 6
    && report.summary.needsApproval >= 1
    && report.summary.allowed >= 1
    && report.summary.findings > 0
    && report.summary.promptInjectionFindings > 0
    && report.summary.highImpactFindings > 0
    && report.summary.controlPlaneFindings >= 2
    && report.summary.secretFindings > 0
    && report.summary.executedActions === 0
    && expectedCaseIds.every((caseId) => caseIds.includes(caseId))
    && checksPassed;

  return {
    id: "security-red-team-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Security red-team drill blocked hostile prompt, credential, control-plane, Git, deploy, and external-send cases while allowing a safe allowlisted action."
      : "Security red-team drill did not prove hostile-input and high-impact-action boundaries.",
    evidence: [
      `Schema: ${report.schema}`,
      `Cases: ${report.summary.cases}`,
      `Passed/failed: ${report.summary.passed}/${report.summary.failed}`,
      `Decisions blocked/approval/allowed: ${report.summary.blocked}/${report.summary.needsApproval}/${report.summary.allowed}`,
      `Findings: ${report.summary.findings}`,
      `Prompt injection findings: ${report.summary.promptInjectionFindings}`,
      `Control-plane findings: ${report.summary.controlPlaneFindings}`,
      `Secret findings: ${report.summary.secretFindings}`,
      `High-impact findings: ${report.summary.highImpactFindings}`,
      `Executed actions: ${report.summary.executedActions}`
    ],
    nextAction: ok
      ? "Keep the red-team drill attached before connecting real computer-use runners to external content."
      : "Restore prompt-injection, credential, control-plane, Git/deploy, external-send, and high-impact gates before runner handoff."
  };
}

function releaseVerificationCheck(report: ReleaseVerificationReport): VerificationManifestCheck {
  const ok = report.schema === "naikaku.release-verification.v1"
    && report.decision === "verified"
    && report.summary.failed === 0;

  return {
    id: "release-verification",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Release verification passed for the requested dry-run scope."
      : "Release verification did not pass.",
    evidence: [
      `Schema: ${report.schema}`,
      `Decision: ${report.decision}`,
      `Scope: ${report.scope}`,
      `Passed: ${report.summary.passed}`,
      `Failed: ${report.summary.failed}`
    ],
    nextAction: ok
      ? "Attach the release verification report to operator handoff evidence."
      : "Review failed release verification checks before handoff."
  };
}

function dryRunBoundaryCheck(report: ReleaseVerificationReport): VerificationManifestCheck {
  const productionCheck = report.checks.find((check) => check.id === "production-evidence-required");
  const ok = report.scope === "dry-run"
    && !report.requireProductionEvidence
    && productionCheck?.status === "pass"
    && productionCheck.evidence.some((item) => item.includes("Required production evidence: no"));

  return {
    id: "dry-run-boundary",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Verification manifest preserves the dry-run versus production evidence boundary."
      : "Dry-run versus production evidence boundary is unclear.",
    evidence: [
      `Scope: ${report.scope}`,
      `Require production evidence: ${report.requireProductionEvidence ? "yes" : "no"}`,
      `Production check: ${productionCheck?.status || "missing"}`
    ],
    nextAction: ok
      ? "Use production verification before claiming external production readiness."
      : "Regenerate release verification with explicit production-evidence requirements."
  };
}

function productionBoundaryDrillCheck(report: ProductionBoundaryDrillSummary): VerificationManifestCheck {
  const checksPassed = Object.values(report.checks).every(Boolean);
  const ok = report.schema === "naikaku.production-boundary-drill.v1"
    && report.expectedExitCode === 4
    && report.observedExitCode === 4
    && report.decision === "not-production-ready"
    && report.scope === "production"
    && report.requireProductionEvidence
    && report.failedChecks.includes("production-evidence-required")
    && checksPassed;

  return {
    id: "production-boundary-drill",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Production boundary drill confirmed dry-run evidence is rejected with exit code 4."
      : "Production boundary drill did not prove dry-run evidence is blocked from production claims.",
    evidence: [
      `Schema: ${report.schema}`,
      `Command: ${report.command}`,
      `Expected exit: ${report.expectedExitCode}`,
      `Observed exit: ${report.observedExitCode}`,
      `Decision: ${report.decision}`,
      `Scope: ${report.scope}`,
      `Require production evidence: ${report.requireProductionEvidence ? "yes" : "no"}`,
      `Failed checks: ${report.failedChecks.join(", ") || "none"}`
    ],
    nextAction: ok
      ? "Keep this negative boundary drill attached until authenticated production evidence exists."
      : "Restore production verification so dry-run evidence returns not-production-ready with exit code 4."
  };
}
