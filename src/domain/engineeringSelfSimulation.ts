import type { EngineeringLaunchProfile } from "./engineeringLaunchProfile";
import type {
  EngineeringLaunchCapabilityId,
  EngineeringLaunchCapabilityStatus
} from "./engineeringLaunchProfile";
import type {
  CabinetRun,
  CodingAgentBriefs,
  CodingAgentDispatchSimulation,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle
} from "./types";

export type EngineeringSelfSimulationDecision =
  | "needs-mission"
  | "simulated-ready"
  | "approval-required"
  | "needs-review"
  | "blocked";

export type EngineeringSelfSimulationStageId =
  | "mission"
  | "cabinet"
  | "briefs"
  | "sessions"
  | "dispatch"
  | "runner"
  | "preflight"
  | "evidence";

export type EngineeringSelfSimulationStageStatus =
  | "pass"
  | "warn"
  | "block"
  | "waiting";

export type EngineeringSelfSimulationCapabilityId =
  | "code-writing"
  | "allowlisted-shell"
  | "browser-assist"
  | "mac-desktop"
  | "mcp-tools"
  | "external-writes";

export type EngineeringSelfSimulationCapabilityStatus =
  | "ready"
  | "simulated"
  | "approval-required"
  | "not-requested"
  | "blocked";

export type EngineeringCompletionClaimDecision =
  | "simulation-only"
  | "evidence-ready"
  | "needs-evidence"
  | "blocked";

export type EngineeringCompletionClaimCheckId =
  | "real-run-report"
  | "changed-files"
  | "command-transcripts"
  | "evidence-artifacts"
  | "command-results"
  | "approval-boundary";

export type EngineeringCompletionClaimCheckStatus =
  | "pass"
  | "warn"
  | "block";

export type EngineeringHandoffDecision =
  | "not-ready"
  | "agent-pack-ready"
  | "approval-gated"
  | "evidence-review";

export type EngineeringHandoffLaneId =
  | "supervision"
  | "coding-agent"
  | "runner"
  | "approval"
  | "evidence";

export type EngineeringHandoffLaneStatus =
  | "ready"
  | "waiting"
  | "approval-required"
  | "blocked";

export type EngineeringPermissionRequestMode =
  | "default-local"
  | "ask-before-use"
  | "not-requested"
  | "blocked";

export type EngineeringCapabilityGapDecision =
  | "engineering-ready"
  | "agent-ready"
  | "runtime-needed"
  | "blocked";

export type EngineeringCapabilityGapId =
  | "supervised-coding"
  | "local-shell"
  | "browser-automation"
  | "mac-desktop-control"
  | "mcp-connectors"
  | "external-writes";

export type EngineeringCapabilityGapStatus =
  | "ready"
  | "simulated"
  | "approval-required"
  | "missing"
  | "blocked";

export interface EngineeringSelfSimulationStage {
  id: EngineeringSelfSimulationStageId;
  status: EngineeringSelfSimulationStageStatus;
  summary: string;
  nextAction: string;
}

export interface EngineeringSelfSimulationCapability {
  id: EngineeringSelfSimulationCapabilityId;
  status: EngineeringSelfSimulationCapabilityStatus;
  summary: string;
}

export interface EngineeringCompletionClaimCheck {
  id: EngineeringCompletionClaimCheckId;
  status: EngineeringCompletionClaimCheckStatus;
  summary: string;
}

export interface EngineeringCompletionClaimGate {
  decision: EngineeringCompletionClaimDecision;
  canClaimCompletion: boolean;
  canClaimCodeChanged: boolean;
  canClaimExternalWrite: boolean;
  checks: EngineeringCompletionClaimCheck[];
  allowedClaims: string[];
  blockedClaims: string[];
  nextAction: string;
}

export interface EngineeringHandoffLane {
  id: EngineeringHandoffLaneId;
  status: EngineeringHandoffLaneStatus;
  summary: string;
}

export interface EngineeringHandoffReceipt {
  decision: EngineeringHandoffDecision;
  canHandOffToCodingAgent: boolean;
  canRunLocalSandbox: boolean;
  packet: {
    briefs: number;
    readySessions: number;
    runnerTasks: number;
    allowedCommands: number;
    expectedEvidenceArtifacts: number;
    approvalItems: number;
  };
  lanes: EngineeringHandoffLane[];
  operatorScript: string[];
}

export interface EngineeringPermissionRequestItem {
  id: EngineeringLaunchCapabilityId;
  status: EngineeringLaunchCapabilityStatus;
  mode: EngineeringPermissionRequestMode;
  requiredFor: string;
  approvalPrompt: string;
  reason: string;
}

export interface EngineeringPermissionRequestPacket {
  decision: "ready" | "approval-required" | "blocked";
  defaultDenied: string[];
  requests: EngineeringPermissionRequestItem[];
}

export interface EngineeringCapabilityGapItem {
  id: EngineeringCapabilityGapId;
  status: EngineeringCapabilityGapStatus;
  current: string;
  requiredToBeReal: string;
  nextAction: string;
}

export interface EngineeringCapabilityGapAssessment {
  decision: EngineeringCapabilityGapDecision;
  engineeringReadiness: number;
  macRuntimeReadiness: number;
  canPrepareEngineering: boolean;
  canExecuteCodeLocally: boolean;
  canControlMacDesktop: boolean;
  canWriteExternally: boolean;
  items: EngineeringCapabilityGapItem[];
  honestComparison: string;
}

export interface EngineeringSelfSimulationReport {
  schema: "naikaku.engineering-self-simulation.v1";
  generatedAt: string;
  decision: EngineeringSelfSimulationDecision;
  launchProfileSchema: EngineeringLaunchProfile["schema"];
  missionFingerprint: string;
  runId?: string;
  stages: EngineeringSelfSimulationStage[];
  capabilities: EngineeringSelfSimulationCapability[];
  completionGate: EngineeringCompletionClaimGate;
  handoffReceipt: EngineeringHandoffReceipt;
  permissionRequest: EngineeringPermissionRequestPacket;
  capabilityGap: EngineeringCapabilityGapAssessment;
  summary: {
    activeRoles: number;
    briefs: number;
    implementableBriefs: number;
    readySessions: number;
    heldSessions: number;
    runnerTasks: number;
    wouldRunTasks: number;
    allowedCommands: number;
    blockedCommands: number;
    approvalItems: number;
    expectedEvidenceArtifacts: number;
    notExecutedCommands: number;
    simulatedOnly: true;
  };
  nextActions: string[];
  honestyClaim: {
    level: "engineering-self-simulation";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export interface BuildEngineeringSelfSimulationReportInput {
  profile: EngineeringLaunchProfile;
  run?: CabinetRun | null;
  briefs: CodingAgentBriefs;
  sessionBundle?: CodingAgentSessionBundle | null;
  dispatchSimulation?: CodingAgentDispatchSimulation | null;
  runnerManifest?: CodingAgentRunnerManifest | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
  generatedAt?: string;
}

export function buildEngineeringSelfSimulationReport({
  profile,
  run,
  briefs,
  sessionBundle,
  dispatchSimulation,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  generatedAt = new Date().toISOString()
}: BuildEngineeringSelfSimulationReportInput): EngineeringSelfSimulationReport {
  const approvalItems = profile.capabilities.filter((capability) =>
    capability.status === "approval-required"
  ).length;
  const stages = stagesFor({
    profile,
    run,
    briefs,
    sessionBundle,
    dispatchSimulation,
    runnerManifest,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport
  });
  const capabilities = capabilitiesFor({
    profile,
    briefs,
    runnerSelfTest,
    sandboxRunnerPreflight
  });
  const completionGate = completionClaimGateFor({
    approvalItems,
    sandboxRunnerReport
  });
  const handoffReceipt = handoffReceiptFor({
    profile,
    run,
    briefs,
    sessionBundle,
    runnerManifest,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport,
    approvalItems
  });
  const permissionRequest = permissionRequestFor(profile);
  const capabilityGap = capabilityGapFor({
    profile,
    briefs,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport,
    approvalItems
  });

  return {
    schema: "naikaku.engineering-self-simulation.v1",
    generatedAt,
    decision: decisionFor({
      profile,
      stages,
      approvalItems,
      runnerSelfTest,
      sandboxRunnerPreflight
    }),
    launchProfileSchema: profile.schema,
    missionFingerprint: profile.missionFingerprint,
    runId: run?.id || briefs.runId || sessionBundle?.runId || runnerManifest?.runId,
    stages,
    capabilities,
    completionGate,
    handoffReceipt,
    permissionRequest,
    capabilityGap,
    summary: {
      activeRoles: profile.supervisorPlan.activeRoles,
      briefs: briefs.summary.total,
      implementableBriefs: briefs.summary.implementable,
      readySessions: sessionBundle?.summary.ready || 0,
      heldSessions: sessionBundle?.summary.held || 0,
      runnerTasks: runnerManifest?.summary.runnerTasks || 0,
      wouldRunTasks: runnerSelfTest?.summary.wouldRun || 0,
      allowedCommands: sandboxRunnerPreflight?.summary.allowedCommands || 0,
      blockedCommands: sandboxRunnerPreflight?.summary.blockedCommands || 0,
      approvalItems,
      expectedEvidenceArtifacts:
        sandboxRunnerPreflight?.summary.expectedEvidenceArtifacts ||
        runnerSelfTest?.summary.expectedEvidenceArtifacts ||
        runnerManifest?.summary.expectedEvidenceArtifacts ||
        0,
      notExecutedCommands: runnerSelfTest?.summary.notExecutedCommands || 0,
      simulatedOnly: true
    },
    nextActions: nextActionsFor({
      profile,
      stages,
      approvalItems,
      sandboxRunnerPreflight
    }),
    honestyClaim: {
      level: "engineering-self-simulation",
      claim: "This report simulates the supervised engineering launch path without executing implementation work.",
      limitations: [
        "It does not edit files, run shell commands, open browsers, control desktops, call MCP tools, call model providers, commit, push, deploy, or inspect production systems.",
        "Ready means the contracts, prompts, runner handoff, and preflight are internally prepared; it is not proof that code has been changed.",
        "Mac desktop and external-write capabilities remain approval-gated even when the simulation can prepare their paperwork."
      ],
      productionRequirements: [
        "Run real coding work inside a governed workspace or sandbox runner.",
        "Attach real diffs, command transcripts, screenshots when relevant, evidence artifacts, and remaining risks.",
        "Review completed receipts and artifact audits before claiming completion, release readiness, push, or deploy."
      ]
    }
  };
}

export function serializeEngineeringSelfSimulationReport(report: EngineeringSelfSimulationReport) {
  return JSON.stringify(report, null, 2);
}

export function serializeEngineeringSelfSimulationMarkdown(report: EngineeringSelfSimulationReport) {
  return [
    "# Engineering Self-Simulation",
    "",
    `Decision: ${report.decision}`,
    `Generated: ${report.generatedAt}`,
    `Mission fingerprint: ${report.missionFingerprint}`,
    `Run: ${report.runId || "workspace"}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${report.honestyClaim.claim}`,
    ...report.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...report.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Active roles: ${report.summary.activeRoles}`,
    `- Briefs: ${report.summary.implementableBriefs}/${report.summary.briefs}`,
    `- Sessions: ${report.summary.readySessions} ready / ${report.summary.heldSessions} held`,
    `- Runner tasks: ${report.summary.runnerTasks}`,
    `- Would-run tasks: ${report.summary.wouldRunTasks}`,
    `- Allowed commands: ${report.summary.allowedCommands}`,
    `- Blocked commands: ${report.summary.blockedCommands}`,
    `- Approval items: ${report.summary.approvalItems}`,
    `- Expected evidence artifacts: ${report.summary.expectedEvidenceArtifacts}`,
    `- Not executed commands: ${report.summary.notExecutedCommands}`,
    "",
    "## Stages",
    "",
    ...report.stages.flatMap((stage) => [
      `### ${stage.id}`,
      "",
      `- Status: ${stage.status}`,
      `- Summary: ${stage.summary}`,
      `- Next action: ${stage.nextAction}`,
      ""
    ]),
    "## Capabilities",
    "",
    ...report.capabilities.map((capability) =>
      `- ${capability.id}: ${capability.status} - ${capability.summary}`
    ),
    "",
    "## Completion Claim Gate",
    "",
    `- Decision: ${report.completionGate.decision}`,
    `- Can claim completion: ${report.completionGate.canClaimCompletion ? "yes" : "no"}`,
    `- Can claim code changed: ${report.completionGate.canClaimCodeChanged ? "yes" : "no"}`,
    `- Can claim external write: ${report.completionGate.canClaimExternalWrite ? "yes" : "no"}`,
    `- Next action: ${report.completionGate.nextAction}`,
    "",
    "### Checks",
    "",
    ...report.completionGate.checks.map((check) =>
      `- ${check.status}: ${check.id} - ${check.summary}`
    ),
    "",
    "### Allowed Claims",
    "",
    ...report.completionGate.allowedClaims.map((claim) => `- ${claim}`),
    "",
    "### Blocked Claims",
    "",
    ...report.completionGate.blockedClaims.map((claim) => `- ${claim}`),
    "",
    "## Handoff Receipt",
    "",
    `- Decision: ${report.handoffReceipt.decision}`,
    `- Can hand off to coding agent: ${report.handoffReceipt.canHandOffToCodingAgent ? "yes" : "no"}`,
    `- Can run local sandbox: ${report.handoffReceipt.canRunLocalSandbox ? "yes" : "no"}`,
    `- Briefs: ${report.handoffReceipt.packet.briefs}`,
    `- Ready sessions: ${report.handoffReceipt.packet.readySessions}`,
    `- Runner tasks: ${report.handoffReceipt.packet.runnerTasks}`,
    `- Allowed commands: ${report.handoffReceipt.packet.allowedCommands}`,
    `- Expected evidence artifacts: ${report.handoffReceipt.packet.expectedEvidenceArtifacts}`,
    `- Approval items: ${report.handoffReceipt.packet.approvalItems}`,
    "",
    "### Handoff Lanes",
    "",
    ...report.handoffReceipt.lanes.map((lane) =>
      `- ${lane.status}: ${lane.id} - ${lane.summary}`
    ),
    "",
    "### Operator Script",
    "",
    ...report.handoffReceipt.operatorScript.map((item) => `- ${item}`),
    "",
    "## Permission Request",
    "",
    `- Decision: ${report.permissionRequest.decision}`,
    "",
    "### Requests",
    "",
    ...report.permissionRequest.requests.map((item) =>
      `- ${item.mode}: ${item.id} (${item.status}) - ${item.requiredFor} - ${item.approvalPrompt}`
    ),
    "",
    "### Default Denied",
    "",
    ...report.permissionRequest.defaultDenied.map((item) => `- ${item}`),
    "",
    "## Capability Gap Assessment",
    "",
    `- Decision: ${report.capabilityGap.decision}`,
    `- Engineering readiness: ${report.capabilityGap.engineeringReadiness}`,
    `- Mac runtime readiness: ${report.capabilityGap.macRuntimeReadiness}`,
    `- Can prepare engineering: ${report.capabilityGap.canPrepareEngineering ? "yes" : "no"}`,
    `- Can execute code locally: ${report.capabilityGap.canExecuteCodeLocally ? "yes" : "no"}`,
    `- Can control Mac desktop: ${report.capabilityGap.canControlMacDesktop ? "yes" : "no"}`,
    `- Can write externally: ${report.capabilityGap.canWriteExternally ? "yes" : "no"}`,
    `- Honest comparison: ${report.capabilityGap.honestComparison}`,
    "",
    "### Gap Items",
    "",
    ...report.capabilityGap.items.map((item) =>
      `- ${item.status}: ${item.id} - ${item.current} -> ${item.requiredToBeReal}`
    ),
    "",
    "## Next Actions",
    "",
    ...report.nextActions.map((action) => `- ${action}`)
  ].join("\n");
}

function stagesFor({
  profile,
  run,
  briefs,
  sessionBundle,
  dispatchSimulation,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport
}: {
  profile: EngineeringLaunchProfile;
  run?: CabinetRun | null;
  briefs: CodingAgentBriefs;
  sessionBundle?: CodingAgentSessionBundle | null;
  dispatchSimulation?: CodingAgentDispatchSimulation | null;
  runnerManifest?: CodingAgentRunnerManifest | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
}): EngineeringSelfSimulationStage[] {
  return [
    {
      id: "mission",
      status: profile.missionReady ? "pass" : "block",
      summary: profile.missionReady
        ? `Mission accepted with ${profile.missionDraft.present} present launch fields.`
        : "Mission is too thin for a supervised engineering launch.",
      nextAction: profile.missionReady
        ? "Run cabinet split or prepare an engineering pack."
        : "Write or shape the mission brief first."
    },
    {
      id: "cabinet",
      status: run ? run.score.decision === "block" ? "block" : "pass" : "waiting",
      summary: run
        ? `Cabinet dry run is ${run.score.decision} with ${run.artifacts.length} stage artifacts.`
        : "No cabinet run is attached to this self-simulation yet.",
      nextAction: run ? "Use cabinet artifacts as supervisory context." : "Run the cabinet split."
    },
    {
      id: "briefs",
      status: briefs.summary.total > 0
        ? briefs.summary.blocked > 0 ? "warn" : "pass"
        : "block",
      summary: `${briefs.summary.implementable}/${briefs.summary.total} briefs are implementable.`,
      nextAction: briefs.summary.total > 0
        ? "Review generated coding-agent briefs."
        : "Create a development board before preparing agents."
    },
    {
      id: "sessions",
      status: sessionBundle
        ? sessionBundle.decision === "blocked" ? "block" : sessionBundle.summary.held > 0 ? "warn" : "pass"
        : "waiting",
      summary: sessionBundle
        ? `${sessionBundle.summary.ready} sessions ready, ${sessionBundle.summary.held} held.`
        : "No coding-agent session bundle is attached yet.",
      nextAction: sessionBundle
        ? sessionBundle.summary.held > 0 ? "Review held sessions before assignment." : "Dispatch ready sessions."
        : "Build the session bundle."
    },
    {
      id: "dispatch",
      status: dispatchSimulation
        ? dispatchSimulation.decision === "blocked" ? "block" : dispatchSimulation.summary.held > 0 ? "warn" : "pass"
        : "waiting",
      summary: dispatchSimulation
        ? `${dispatchSimulation.summary.readyForAgent} ready, ${dispatchSimulation.summary.held} held, ${dispatchSimulation.summary.blocked} blocked.`
        : "No local dispatch simulation is attached yet.",
      nextAction: dispatchSimulation
        ? "Prepare runner handoff only for ready simulated items."
        : "Run local dispatch simulation."
    },
    {
      id: "runner",
      status: runnerSelfTest
        ? runnerSelfTest.decision === "blocked" ? "block" : runnerSelfTest.summary.held > 0 ? "warn" : "pass"
        : runnerManifest ? "waiting" : "waiting",
      summary: runnerSelfTest
        ? `${runnerSelfTest.summary.wouldRun} tasks would run; ${runnerSelfTest.summary.notExecutedCommands} commands remain not executed.`
        : runnerManifest
          ? `${runnerManifest.summary.runnerTasks} runner tasks planned; self-test missing.`
          : "No runner manifest or self-test is attached yet.",
      nextAction: runnerSelfTest
        ? "Use self-test only as contract validation, not implementation evidence."
        : "Generate and self-test the runner manifest."
    },
    {
      id: "preflight",
      status: sandboxRunnerPreflight
        ? sandboxRunnerPreflight.decision === "blocked" ? "block" : sandboxRunnerPreflight.decision === "needs-review" ? "warn" : "pass"
        : "waiting",
      summary: sandboxRunnerPreflight
        ? `${sandboxRunnerPreflight.summary.allowedCommands} commands allowed, ${sandboxRunnerPreflight.summary.blockedCommands} blocked.`
        : "No sandbox runner preflight is attached yet.",
      nextAction: sandboxRunnerPreflight
        ? "Only a governed runner may execute allowed commands after review."
        : "Run sandbox runner preflight."
    },
    {
      id: "evidence",
      status: sandboxRunnerReport
        ? sandboxRunnerReport.decision === "sandbox-runner-verified" ? "pass" : sandboxRunnerReport.decision === "blocked" ? "block" : "warn"
        : "waiting",
      summary: sandboxRunnerReport
        ? `${sandboxRunnerReport.summary.evidenceArtifacts} evidence artifacts are reported by the sandbox runner.`
        : "Real changed files, transcripts, screenshots, and receipts are still missing.",
      nextAction: sandboxRunnerReport
        ? "Review evidence before accepting work."
        : "Do not claim completion until a real governed run supplies evidence."
    }
  ];
}

function capabilitiesFor({
  profile,
  briefs,
  runnerSelfTest,
  sandboxRunnerPreflight
}: {
  profile: EngineeringLaunchProfile;
  briefs: CodingAgentBriefs;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
}): EngineeringSelfSimulationCapability[] {
  return [
    {
      id: "code-writing",
      status: briefs.summary.implementable > 0
        ? runnerSelfTest?.summary.wouldRun ? "ready" : "simulated"
        : "blocked",
      summary: briefs.summary.implementable > 0
        ? `${briefs.summary.implementable} implementable briefs can be handed to coding agents.`
        : "No implementable coding brief is available."
    },
    {
      id: "allowlisted-shell",
      status: sandboxRunnerPreflight
        ? sandboxRunnerPreflight.summary.blockedCommands > 0 ? "blocked" : sandboxRunnerPreflight.summary.allowedCommands > 0 ? "ready" : "simulated"
        : runnerSelfTest?.summary.notExecutedCommands ? "simulated" : "not-requested",
      summary: sandboxRunnerPreflight
        ? `${sandboxRunnerPreflight.summary.allowedCommands} allowlisted commands, ${sandboxRunnerPreflight.summary.blockedCommands} blocked.`
        : "Shell commands remain not executed until preflight and a governed runner."
    },
    {
      id: "browser-assist",
      status: profile.capabilities.some((capability) => capability.id === "browser-profile")
        ? "approval-required"
        : "not-requested",
      summary: "Browser work requires an isolated profile when requested."
    },
    {
      id: "mac-desktop",
      status: profile.capabilities.some((capability) =>
        capability.id === "mac-accessibility" || capability.id === "mac-screen-recording"
      )
        ? "approval-required"
        : "not-requested",
      summary: "Mac desktop control requires Accessibility and Screen Recording approval."
    },
    {
      id: "mcp-tools",
      status: profile.capabilities.some((capability) => capability.id === "mcp-allowlist")
        ? "approval-required"
        : "not-requested",
      summary: "MCP work requires per-tool allowlists and scoped credentials."
    },
    {
      id: "external-writes",
      status: profile.capabilities.some((capability) =>
        capability.id === "human-approval" || capability.id === "external-write-approval"
      )
        ? "approval-required"
        : "not-requested",
      summary: "Git push, deploy, issues, messages, and email stay human-approval gated."
    }
  ];
}

function completionClaimGateFor({
  approvalItems,
  sandboxRunnerReport
}: {
  approvalItems: number;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
}): EngineeringCompletionClaimGate {
  const hasReport = Boolean(sandboxRunnerReport);
  const hasVerifiedReport = sandboxRunnerReport?.decision === "sandbox-runner-verified";
  const hasChangedFiles = (sandboxRunnerReport?.summary.changedFileSummaries || 0) > 0;
  const hasTranscripts = (sandboxRunnerReport?.summary.transcriptFilesWritten || 0) > 0;
  const hasEvidenceArtifacts = (sandboxRunnerReport?.summary.evidenceArtifacts || 0) > 0;
  const hasCleanCommands = Boolean(
    sandboxRunnerReport &&
      sandboxRunnerReport.summary.commandResults > 0 &&
      sandboxRunnerReport.summary.failedCommands === 0 &&
      sandboxRunnerReport.summary.blockedCommands === 0
  );
  const approvalClear = approvalItems === 0;

  const checks: EngineeringCompletionClaimCheck[] = [
    {
      id: "real-run-report",
      status: hasVerifiedReport ? "pass" : hasReport ? "warn" : "block",
      summary: hasVerifiedReport
        ? "A governed sandbox runner reported verified execution."
        : hasReport
          ? `Sandbox runner reported ${sandboxRunnerReport?.decision}; review before accepting completion.`
          : "No real governed sandbox runner report is attached."
    },
    {
      id: "changed-files",
      status: hasChangedFiles ? "pass" : "block",
      summary: hasChangedFiles
        ? `${sandboxRunnerReport?.summary.changedFileSummaries} changed-file summaries are attached.`
        : "No changed-file summary is attached."
    },
    {
      id: "command-transcripts",
      status: hasTranscripts ? "pass" : "block",
      summary: hasTranscripts
        ? `${sandboxRunnerReport?.summary.transcriptFilesWritten} command transcripts are attached.`
        : "No command transcript is attached."
    },
    {
      id: "evidence-artifacts",
      status: hasEvidenceArtifacts ? "pass" : "block",
      summary: hasEvidenceArtifacts
        ? `${sandboxRunnerReport?.summary.evidenceArtifacts} evidence artifacts are attached.`
        : "No implementation evidence artifact is attached."
    },
    {
      id: "command-results",
      status: hasCleanCommands ? "pass" : hasReport ? "warn" : "block",
      summary: hasCleanCommands
        ? `${sandboxRunnerReport?.summary.commandResults} command results completed without blocked or failed commands.`
        : hasReport
          ? "Command results include failures, blocked commands, or no executed result."
          : "No command result is attached."
    },
    {
      id: "approval-boundary",
      status: approvalClear ? "pass" : "warn",
      summary: approvalClear
        ? "No gated Mac, browser, MCP, or external-write approval remains in the launch profile."
        : `${approvalItems} approval-gated capabilities remain and cannot be bypassed.`
    }
  ];

  const evidenceReady =
    hasVerifiedReport &&
    hasChangedFiles &&
    hasTranscripts &&
    hasEvidenceArtifacts &&
    hasCleanCommands;
  const decision: EngineeringCompletionClaimDecision = evidenceReady
    ? "evidence-ready"
    : sandboxRunnerReport?.decision === "blocked"
      ? "blocked"
      : sandboxRunnerReport
        ? "needs-evidence"
        : "simulation-only";
  const canClaimCompletion = decision === "evidence-ready";
  const canClaimCodeChanged = canClaimCompletion && hasChangedFiles;
  const canClaimExternalWrite = canClaimCompletion && approvalClear;

  return {
    decision,
    canClaimCompletion,
    canClaimCodeChanged,
    canClaimExternalWrite,
    checks,
    allowedClaims: [
      "The local engineering launch contract has been simulated.",
      ...(canClaimCompletion
        ? ["A governed sandbox runner reported implementation evidence."]
        : []),
      ...(canClaimCodeChanged ? ["Changed-file summaries are available for review."] : []),
      ...(canClaimExternalWrite
        ? ["External write can be considered only after reviewed evidence and approval."]
        : [])
    ],
    blockedClaims: [
      ...(!canClaimCompletion ? ["Do not claim implementation is complete."] : []),
      ...(!canClaimCodeChanged ? ["Do not claim code files changed."] : []),
      ...(!canClaimExternalWrite ? ["Do not claim Git push/deploy/external send is approved."] : []),
      ...(approvalItems > 0
        ? ["Do not bypass Mac/browser/MCP/external-write approval gates."]
        : [])
    ],
    nextAction: completionClaimNextAction(decision, Boolean(sandboxRunnerReport))
  };
}

function completionClaimNextAction(
  decision: EngineeringCompletionClaimDecision,
  hasSandboxRunnerReport: boolean
) {
  if (!hasSandboxRunnerReport) {
    return "Run a governed sandbox runner and attach changed files, transcripts, evidence artifacts, and receipt review before claiming completion.";
  }
  if (decision === "evidence-ready") {
    return "Review the completed receipt and artifact audit before external handoff.";
  }
  if (decision === "blocked") {
    return "Fix blocked sandbox runner results before accepting the work.";
  }
  return "Fill missing evidence before accepting the work.";
}

function handoffReceiptFor({
  profile,
  run,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  approvalItems
}: {
  profile: EngineeringLaunchProfile;
  run?: CabinetRun | null;
  briefs: CodingAgentBriefs;
  sessionBundle?: CodingAgentSessionBundle | null;
  runnerManifest?: CodingAgentRunnerManifest | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
  approvalItems: number;
}): EngineeringHandoffReceipt {
  const readySessions = sessionBundle?.summary.ready || 0;
  const runnerTasks = runnerManifest?.summary.runnerTasks || 0;
  const allowedCommands = sandboxRunnerPreflight?.summary.allowedCommands || 0;
  const expectedEvidenceArtifacts =
    sandboxRunnerPreflight?.summary.expectedEvidenceArtifacts ||
    runnerSelfTest?.summary.expectedEvidenceArtifacts ||
    runnerManifest?.summary.expectedEvidenceArtifacts ||
    0;
  const canHandOffToCodingAgent = Boolean(
    profile.missionReady &&
      briefs.summary.implementable > 0 &&
      readySessions > 0 &&
      runnerSelfTest?.decision === "self-test-ready"
  );
  const canRunLocalSandbox = Boolean(
    canHandOffToCodingAgent &&
      sandboxRunnerPreflight?.decision === "ready" &&
      sandboxRunnerPreflight.summary.blockedCommands === 0
  );
  const decision: EngineeringHandoffDecision = !profile.missionReady
    ? "not-ready"
    : sandboxRunnerReport?.decision === "sandbox-runner-verified"
      ? "evidence-review"
      : approvalItems > 0
        ? "approval-gated"
        : canHandOffToCodingAgent
          ? "agent-pack-ready"
          : "not-ready";

  return {
    decision,
    canHandOffToCodingAgent,
    canRunLocalSandbox,
    packet: {
      briefs: briefs.summary.implementable,
      readySessions,
      runnerTasks,
      allowedCommands,
      expectedEvidenceArtifacts,
      approvalItems
    },
    lanes: [
      {
        id: "supervision",
        status: !profile.missionReady ? "blocked" : run ? "ready" : "waiting",
        summary: run
          ? `Cabinet run ${run.id} is attached for supervisory context.`
          : profile.missionReady
            ? "Mission can be split by the cabinet before real execution."
            : "Mission is not ready enough for a supervised handoff."
      },
      {
        id: "coding-agent",
        status: canHandOffToCodingAgent ? "ready" : briefs.summary.implementable > 0 ? "waiting" : "blocked",
        summary: canHandOffToCodingAgent
          ? `${readySessions} coding-agent sessions can receive implementation briefs.`
          : briefs.summary.implementable > 0
            ? "Implementation briefs exist, but session or runner self-test is still missing."
            : "No implementable coding-agent brief is ready."
      },
      {
        id: "runner",
        status: runnerSelfTest
          ? runnerSelfTest.decision === "blocked" ? "blocked" : runnerSelfTest.decision === "self-test-ready" ? "ready" : "waiting"
          : "waiting",
        summary: runnerSelfTest
          ? `${runnerSelfTest.summary.wouldRun} tasks would run; commands remain simulated until the governed runner executes.`
          : runnerManifest
            ? `${runnerTasks} runner tasks are planned; self-test has not passed yet.`
            : "Runner manifest is not prepared."
      },
      {
        id: "approval",
        status: approvalItems > 0 ? "approval-required" : "ready",
        summary: approvalItems > 0
          ? `${approvalItems} browser, Mac, MCP, or external-write approval gates remain.`
          : "No launch-profile approval gate is currently blocking local handoff."
      },
      {
        id: "evidence",
        status: sandboxRunnerReport
          ? sandboxRunnerReport.decision === "sandbox-runner-verified" ? "ready" : sandboxRunnerReport.decision === "blocked" ? "blocked" : "waiting"
          : "waiting",
        summary: sandboxRunnerReport
          ? `${sandboxRunnerReport.summary.evidenceArtifacts} evidence artifacts are attached by the sandbox runner.`
          : `${expectedEvidenceArtifacts} evidence artifacts are expected, but real implementation evidence is not attached.`
      }
    ],
    operatorScript: operatorScriptFor({
      decision,
      canHandOffToCodingAgent,
      canRunLocalSandbox,
      approvalItems,
      expectedEvidenceArtifacts
    })
  };
}

function operatorScriptFor({
  decision,
  canHandOffToCodingAgent,
  canRunLocalSandbox,
  approvalItems,
  expectedEvidenceArtifacts
}: {
  decision: EngineeringHandoffDecision;
  canHandOffToCodingAgent: boolean;
  canRunLocalSandbox: boolean;
  approvalItems: number;
  expectedEvidenceArtifacts: number;
}) {
  if (decision === "not-ready") {
    return [
      "Fill the mission brief, run cabinet split, and prepare the coding-agent pack before handoff.",
      "Do not ask an agent to implement until the runner self-test has produced a ready contract."
    ];
  }

  const script = [
    canHandOffToCodingAgent
      ? "Hand off only the generated coding-agent session, runner invocation, and receipt template."
      : "Finish the generated coding-agent pack before assigning implementation.",
    canRunLocalSandbox
      ? "A governed local sandbox runner may execute the allowlisted commands after operator review."
      : "Keep commands simulated until preflight is ready and a governed runner is accepted.",
    `Require ${expectedEvidenceArtifacts} evidence artifacts or an explicit missing-evidence receipt before accepting work.`
  ];

  if (approvalItems > 0) {
    script.push("Collect exact human approval for Mac, browser, MCP, and external-write gates before using those capabilities.");
  }
  if (decision === "evidence-review") {
    script.push("Review changed-file summaries, command transcripts, and receipt audit before claiming completion.");
  }

  return script;
}

function permissionRequestFor(profile: EngineeringLaunchProfile): EngineeringPermissionRequestPacket {
  const requests = profile.capabilities.map((capability): EngineeringPermissionRequestItem => ({
    id: capability.id,
    status: capability.status,
    mode: permissionRequestModeFor(capability.status),
    requiredFor: permissionRequiredFor(capability.id),
    approvalPrompt: permissionApprovalPromptFor(capability.status),
    reason: capability.reason
  }));
  const decision: EngineeringPermissionRequestPacket["decision"] = requests.some((item) =>
    item.status === "blocked"
  )
    ? "blocked"
    : requests.some((item) => item.status === "approval-required")
      ? "approval-required"
      : "ready";

  return {
    decision,
    requests,
    defaultDenied: [
      "Host-wide secrets and raw provider keys are never granted to agents by default.",
      "Unbounded computer control is denied; Mac control requires scoped Accessibility and Screen Recording approval.",
      "Git push, deploy, issue creation, messages, email, purchases, deletes, and production writes require exact human approval.",
      "MCP and connector calls require explicit per-tool allowlists and scoped credentials.",
      "Completion claims are denied until real diffs, command transcripts, and evidence artifacts are attached."
    ]
  };
}

function permissionRequestModeFor(
  status: EngineeringLaunchCapabilityStatus
): EngineeringPermissionRequestMode {
  if (status === "ready") return "default-local";
  if (status === "needed" || status === "approval-required") return "ask-before-use";
  return "blocked";
}

function permissionRequiredFor(id: EngineeringLaunchCapabilityId) {
  const labels: Record<EngineeringLaunchCapabilityId, string> = {
    "repo-files": "Read and write only inside the selected repository or sandbox workspace.",
    "output-evidence": "Write transcripts, screenshots, receipts, and artifacts under output/.",
    "allowlisted-shell": "Run only reviewed verification commands such as npm run test and npm run build.",
    "git-read": "Read Git status and diffs for evidence without pushing changes.",
    "browser-profile": "Use an isolated browser profile without host cookies.",
    "mac-accessibility": "Allow keyboard and mouse control only inside a governed Mac runner.",
    "mac-screen-recording": "Allow visual desktop verification only for the approved Mac runner session.",
    "mcp-allowlist": "Call only explicitly allowlisted MCP tools with scoped credentials.",
    "human-approval": "Pause high-impact actions until a human approves the exact payload.",
    "external-write-approval": "Protect Git push, deploy, issues, messages, and email behind human approval."
  };
  return labels[id];
}

function permissionApprovalPromptFor(status: EngineeringLaunchCapabilityStatus) {
  if (status === "ready") {
    return "Available inside the selected workspace boundary; no host-wide access is granted.";
  }
  if (status === "needed") {
    return "Ask the operator to accept the allowlist, command scope, evidence paths, and stop conditions before execution.";
  }
  if (status === "approval-required") {
    return "Ask the operator with the exact target, payload, permission scope, evidence path, and rollback or stop condition before use.";
  }
  return "Blocked until the mission, profile, or safety review is corrected.";
}

function capabilityGapFor({
  profile,
  briefs,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  approvalItems
}: {
  profile: EngineeringLaunchProfile;
  briefs: CodingAgentBriefs;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
  approvalItems: number;
}): EngineeringCapabilityGapAssessment {
  const hasImplementableBriefs = briefs.summary.implementable > 0;
  const hasRunnerSelfTest = runnerSelfTest?.decision === "self-test-ready";
  const hasPreflightReady = sandboxRunnerPreflight?.decision === "ready";
  const hasVerifiedEvidence = sandboxRunnerReport?.decision === "sandbox-runner-verified";
  const wantsBrowser = profile.capabilities.some((capability) => capability.id === "browser-profile");
  const wantsMac = profile.capabilities.some((capability) =>
    capability.id === "mac-accessibility" || capability.id === "mac-screen-recording"
  );
  const wantsMcp = profile.capabilities.some((capability) => capability.id === "mcp-allowlist");
  const wantsExternalWrite = profile.capabilities.some((capability) =>
    capability.id === "human-approval" || capability.id === "external-write-approval"
  );

  const items: EngineeringCapabilityGapItem[] = [
    {
      id: "supervised-coding",
      status: hasImplementableBriefs && hasRunnerSelfTest ? "ready" : hasImplementableBriefs ? "simulated" : "missing",
      current: hasImplementableBriefs
        ? `${briefs.summary.implementable} implementable coding briefs are available.`
        : "No implementable coding brief is ready.",
      requiredToBeReal: "A coding agent must receive the generated brief, edit files, and return a receipt.",
      nextAction: hasRunnerSelfTest
        ? "Hand off the ready runner invocation to a governed coding agent."
        : "Prepare and self-test the runner invocation before agent handoff."
    },
    {
      id: "local-shell",
      status: hasPreflightReady ? "ready" : runnerSelfTest ? "simulated" : "missing",
      current: hasPreflightReady
        ? `${sandboxRunnerPreflight.summary.allowedCommands} allowlisted commands are preflight-ready.`
        : runnerSelfTest
          ? `${runnerSelfTest.summary.notExecutedCommands} commands are planned but not executable yet.`
          : "No shell runner contract has passed self-test.",
      requiredToBeReal: "A governed local runner must execute the allowlisted commands and write transcripts.",
      nextAction: hasPreflightReady
        ? "Run only after the operator accepts preflight and evidence paths."
        : "Run sandbox runner preflight and resolve blocked commands."
    },
    {
      id: "browser-automation",
      status: wantsBrowser ? "approval-required" : "simulated",
      current: wantsBrowser
        ? "Browser automation is requested but isolated profile approval is still required."
        : "Browser automation is not required by this mission.",
      requiredToBeReal: "Connect an isolated browser profile with screenshots, DOM/action replay, and domain allowlist.",
      nextAction: wantsBrowser
        ? "Collect exact approval for the browser profile and allowed domains."
        : "Keep browser automation disabled until a mission asks for it."
    },
    {
      id: "mac-desktop-control",
      status: wantsMac ? "approval-required" : "missing",
      current: wantsMac
        ? "Mac desktop control is requested, but Accessibility and Screen Recording are not granted by the simulation."
        : "No Mac desktop control adapter is connected in this self-simulation.",
      requiredToBeReal: "Connect a governed Mac runner or Hammerspoon-style adapter with Accessibility, Screen Recording, action logs, and a kill switch.",
      nextAction: wantsMac
        ? "Ask for scoped Mac runner approval before any keyboard, mouse, or screen action."
        : "Implement and review a Mac runner adapter before claiming desktop-control parity."
    },
    {
      id: "mcp-connectors",
      status: wantsMcp ? "approval-required" : "simulated",
      current: wantsMcp
        ? "MCP or connector work is requested, but tool allowlists and scoped credentials are still pending."
        : "MCP tools are not required by this mission.",
      requiredToBeReal: "Attach schema-validated MCP calls with per-tool allowlists, scoped credentials, and audited hashes.",
      nextAction: wantsMcp
        ? "Collect per-tool MCP allowlist approval."
        : "Keep MCP disabled until a mission asks for a connector."
    },
    {
      id: "external-writes",
      status: wantsExternalWrite ? "approval-required" : hasVerifiedEvidence ? "ready" : "simulated",
      current: wantsExternalWrite
        ? "External writes such as Git push or deploy are requested but not approved."
        : "External writes are not requested by this mission.",
      requiredToBeReal: "Review exact target, payload, evidence, and rollback plan before any push, deploy, issue, message, or email.",
      nextAction: wantsExternalWrite
        ? "Ask a human to approve the exact external write payload after evidence review."
        : "Do not push or deploy unless the mission explicitly asks and approval is recorded."
    }
  ];

  const readyCount = items.filter((item) => item.status === "ready").length;
  const engineeringReadiness = Math.round((readyCount / items.length) * 100);
  const macRuntimeReadiness = wantsMac ? 25 : 10;
  const blocked = items.some((item) => item.status === "blocked");
  const decision: EngineeringCapabilityGapDecision = blocked
    ? "blocked"
    : wantsMac || wantsBrowser || wantsMcp || approvalItems > 0
      ? "runtime-needed"
      : hasRunnerSelfTest
        ? "agent-ready"
        : "engineering-ready";

  return {
    decision,
    engineeringReadiness,
    macRuntimeReadiness,
    canPrepareEngineering: hasImplementableBriefs && hasRunnerSelfTest,
    canExecuteCodeLocally: Boolean(hasPreflightReady),
    canControlMacDesktop: false,
    canWriteExternally: Boolean(hasVerifiedEvidence && approvalItems === 0 && !wantsExternalWrite),
    items,
    honestComparison: "This system can prepare supervised coding-agent work and local sandbox contracts now; it is not yet equivalent to a mature OpenClaw/Hammerspoon-style Mac desktop runtime until a governed Mac adapter is connected, approved, and verified with action logs."
  };
}

function decisionFor({
  profile,
  stages,
  approvalItems,
  runnerSelfTest,
  sandboxRunnerPreflight
}: {
  profile: EngineeringLaunchProfile;
  stages: EngineeringSelfSimulationStage[];
  approvalItems: number;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
}): EngineeringSelfSimulationDecision {
  if (!profile.missionReady) return "needs-mission";
  if (stages.some((stage) => stage.status === "block")) return "blocked";
  if (approvalItems > 0) return "approval-required";
  if (
    runnerSelfTest?.decision === "self-test-ready" &&
    sandboxRunnerPreflight?.decision === "ready"
  ) {
    return "simulated-ready";
  }
  return "needs-review";
}

function nextActionsFor({
  profile,
  stages,
  approvalItems,
  sandboxRunnerPreflight
}: {
  profile: EngineeringLaunchProfile;
  stages: EngineeringSelfSimulationStage[];
  approvalItems: number;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
}) {
  const actions: string[] = [];
  const blocked = stages.find((stage) => stage.status === "block");
  const waiting = stages.find((stage) => stage.status === "waiting");
  const warning = stages.find((stage) => stage.status === "warn");

  if (blocked) actions.push(blocked.nextAction);
  if (approvalItems > 0) actions.push("Approve or remove gated browser, Mac, MCP, or external-write permissions before real execution.");
  if (waiting) actions.push(waiting.nextAction);
  if (warning) actions.push(warning.nextAction);
  if (sandboxRunnerPreflight?.decision === "ready") {
    actions.push("A real governed runner may execute only after the operator accepts the preflight and evidence requirements.");
  }
  actions.push(profile.honestyClaim.limitations[2]);

  return Array.from(new Set(actions)).slice(0, 5);
}
