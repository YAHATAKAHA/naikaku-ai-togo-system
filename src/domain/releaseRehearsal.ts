import { executorProfiles } from "../data/defaultCabinet";
import { buildExecutorHandoff } from "./automation";
import { buildAutomationRunbook } from "./automationRunbook";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildDevelopmentIssueDrafts } from "./developmentIssues";
import { buildExecutorEvidenceBundle, runExecutorHandoff } from "./executorRunner";
import { runCabinetMission } from "./orchestrator";
import { buildProductReadinessReport } from "./productReadiness";
import { buildProductReleaseBundle, serializeProductReleaseBundle, serializeProductReleaseNotes } from "./productReleaseBundle";
import { buildRoleWorkspaceScaffolds } from "./roleWorkspaceScaffolds";
import { buildSandboxCapabilityRegistry } from "./sandboxCapabilities";
import { buildTeamHandoff } from "./teamPackages";
import type {
  AutomationApprovalRecord,
  AuditEvent,
  CabinetRun,
  CabinetWorkspace,
  DevelopmentWorkItem,
  MemoryEntry,
  ProviderReadinessMatrix,
  ReleaseRehearsalCategory,
  ReleaseRehearsalCheck,
  ReleaseRehearsalDecision,
  ReleaseRehearsalReport,
  ReleaseRehearsalStatus,
  ReleaseRemediationItem,
  ReleaseRemediationPriority
} from "./types";

export interface BuildReleaseRehearsalReportInput {
  workspace: CabinetWorkspace;
  providerReadiness: ProviderReadinessMatrix;
  run?: CabinetRun | null;
  approvalRecords?: AutomationApprovalRecord[];
  auditEvents?: AuditEvent[];
  memoryEntries?: MemoryEntry[];
  savedItems?: DevelopmentWorkItem[];
  secretProbeValues?: string[];
  generatedAt?: string;
}

export function buildReleaseRehearsalReport({
  workspace,
  providerReadiness,
  run,
  approvalRecords = [],
  auditEvents = [],
  memoryEntries = [],
  savedItems = [],
  secretProbeValues = [],
  generatedAt = new Date().toISOString()
}: BuildReleaseRehearsalReportInput): ReleaseRehearsalReport {
  const rehearsalRun = run || runCabinetMission(workspace);
  const sourceRun = run ? "provided" : "simulated";
  const activeRoles = workspace.roles.filter((role) => role.enabled);
  const sandboxCapabilities = buildSandboxCapabilityRegistry({
    profiles: executorProfiles,
    roles: workspace.roles,
    sandboxPolicy: workspace.sandboxPolicy
  });
  const handoff = buildExecutorHandoff({
    run: rehearsalRun,
    approvalRecords
  });
  const executorRun = runExecutorHandoff({
    handoff,
    startedAt: generatedAt
  });
  const evidenceBundle = buildExecutorEvidenceBundle({
    executorRun,
    exportedAt: generatedAt
  });
  const automationRunbook = buildAutomationRunbook({
    run: rehearsalRun,
    approvalRecords,
    generatedAt
  });
  const teamHandoff = buildTeamHandoff({
    workspace,
    run: rehearsalRun
  });
  const roleWorkspaces = buildRoleWorkspaceScaffolds({
    handoff: teamHandoff
  });
  const developmentBoard = buildDevelopmentBoard({
    handoff: teamHandoff,
    run: rehearsalRun,
    memoryEntries,
    savedItems
  });
  const issueDrafts = buildDevelopmentIssueDrafts({
    board: developmentBoard,
    generatedAt
  });
  const productReadiness = buildProductReadinessReport({
    workspace,
    run: rehearsalRun,
    providerReadiness,
    sandboxCapabilities,
    automationRunbook,
    teamHandoff,
    roleWorkspaces,
    developmentBoard,
    issueDrafts,
    approvalRecords,
    auditEvents,
    memoryEntries,
    generatedAt
  });
  const releaseBundle = buildProductReleaseBundle({
    workspace,
    run: rehearsalRun,
    providerReadiness,
    productReadiness,
    automationRunbook,
    teamHandoff,
    roleWorkspaces,
    developmentBoard,
    issueDrafts,
    approvalRecords,
    auditEvents,
    memoryEntries,
    generatedAt
  });
  const bundleJson = serializeProductReleaseBundle(releaseBundle);
  const releaseNotes = serializeProductReleaseNotes(releaseBundle);
  const secretLeakDetected = detectsSecretLeak({
    bundleJson,
    releaseNotes,
    secretProbeValues
  });
  const checks: ReleaseRehearsalCheck[] = [
    cabinetRunCheck(rehearsalRun, sourceRun),
    providerReadinessCheck(providerReadiness),
    automationCheck(automationRunbook),
    executorEvidenceCheck(evidenceBundle, handoff.heldActions.length),
    releaseArtifactCheck(bundleJson, releaseNotes, releaseBundle.summary.artifacts),
    securityRedactionCheck(secretLeakDetected, secretProbeValues.length),
    parallelDevelopmentCheck({
      activeRoles: activeRoles.length,
      workspaceFiles: roleWorkspaces.summary.files,
      issueDrafts: issueDrafts.summary.total,
      blockedIssues: issueDrafts.summary.blocked
    }),
    productReadinessCheck(productReadiness.decision, productReadiness.score)
  ];
  const remediationItems = buildRemediationItems(checks);
  const summary = {
    total: checks.length,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    blockers: checks.filter((check) => check.status === "block").length,
    simulatedRun: sourceRun === "simulated",
    secretLeakDetected,
    readyActions: handoff.readyActions.length,
    heldActions: handoff.heldActions.length,
    evidenceItems: evidenceBundle.summary.evidenceItems,
    releaseArtifacts: releaseBundle.summary.artifacts
  };
  const decision = rehearsalDecision(summary.blockers, summary.warnings);

  return {
    schema: "naikaku.release-rehearsal.v1",
    generatedAt,
    mission: rehearsalRun.mission,
    runId: rehearsalRun.id,
    sourceRun,
    decision,
    score: rehearsalScore(summary.blockers, summary.warnings),
    checks,
    remediation: {
      items: remediationItems,
      summary: remediationSummary(remediationItems)
    },
    artifacts: {
      runId: rehearsalRun.id,
      releaseBundleSchema: releaseBundle.schema,
      evidenceSchema: evidenceBundle.schema,
      bundleBytes: byteLength(bundleJson),
      notesBytes: byteLength(releaseNotes),
      roles: activeRoles.length,
      runnerSteps: automationRunbook.summary.ready,
      heldActions: automationRunbook.summary.held,
      evidenceItems: evidenceBundle.summary.evidenceItems,
      issueDrafts: issueDrafts.summary.total,
      workspaceFiles: roleWorkspaces.summary.files
    },
    summary
  };
}

export function serializeReleaseRehearsalReport(report: ReleaseRehearsalReport) {
  return JSON.stringify(report, null, 2);
}

export function serializeReleaseRemediationMarkdown(report: ReleaseRehearsalReport) {
  return [
    "# Naikaku Release Remediation Plan",
    "",
    `Run: ${report.runId}`,
    `Decision: ${report.decision}`,
    `Score: ${report.score}/100`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    `- Items: ${report.remediation.summary.total}`,
    `- Critical: ${report.remediation.summary.critical}`,
    `- High: ${report.remediation.summary.high}`,
    `- Medium: ${report.remediation.summary.medium}`,
    `- Low: ${report.remediation.summary.low}`,
    "",
    "## Items",
    ...(report.remediation.items.length
      ? report.remediation.items.flatMap((item) => [
          `### ${item.title}`,
          `- Owner: ${item.owner}`,
          `- Priority: ${item.priority}`,
          `- Source check: ${item.sourceCheckId}`,
          `- Action: ${item.action}`,
          `- Verification: \`${item.verificationCommand}\``,
          "- Acceptance:",
          ...item.acceptanceCriteria.map((criterion) => `  - [ ] ${criterion}`),
          ""
        ])
      : ["- None"])
  ].join("\n");
}

function buildRemediationItems(checks: ReleaseRehearsalCheck[]): ReleaseRemediationItem[] {
  return checks
    .filter((check) => check.status !== "pass")
    .map((check) => {
      const template = remediationTemplate(check);

      return {
        id: `remediate-${check.id}`,
        sourceCheckId: check.id,
        category: check.category,
        title: template.title,
        owner: template.owner,
        priority: remediationPriority(check.status, check.id),
        status: "ready-to-assign",
        action: check.nextAction,
        acceptanceCriteria: template.acceptanceCriteria,
        verificationCommand: template.verificationCommand
      };
    });
}

function remediationTemplate(check: ReleaseRehearsalCheck) {
  if (check.id === "provider-readiness") {
    return {
      title: "Confirm every role API provider",
      owner: "Provider adapter team",
      acceptanceCriteria: [
        "Each enabled role has endpoint, model, and API alias reviewed.",
        "Provider Readiness shows zero unchecked, failed, or missing-secret rows.",
        "Readiness export contains aliases only and no raw session secrets."
      ],
      verificationCommand: "npm run rehearsal:strict"
    };
  }

  if (check.id === "automation-runbook") {
    return {
      title: "Resolve held automation actions",
      owner: "Automation runner team",
      acceptanceCriteria: [
        "Every held action has an explicit approval, rejection, or safer replacement.",
        "Automation Runbook includes runner-ready steps for approved work.",
        "High-impact actions keep exact-payload approval records."
      ],
      verificationCommand: "npm run rehearsal:strict"
    };
  }

  if (check.id === "executor-evidence") {
    return {
      title: "Upgrade executor evidence from placeholders",
      owner: "Sandbox executor team",
      acceptanceCriteria: [
        "Runner steps emit replayable evidence hashes.",
        "Shell, browser, desktop, or MCP runners attach real transcripts, screenshots, manifests, or request logs.",
        "Evidence export can be stored through the gateway ledger."
      ],
      verificationCommand: "npm run rehearsal:strict"
    };
  }

  if (check.id === "parallel-development") {
    return {
      title: "Unblock parallel team issue drafts",
      owner: "Project coordination team",
      acceptanceCriteria: [
        "Blocked development items are resolved, split, or explicitly deferred.",
        "Each enabled role has a workspace scaffold and issue draft that can be assigned.",
        "Issue script remains reviewable and credential-free."
      ],
      verificationCommand: "npm run rehearsal:strict"
    };
  }

  if (check.id === "product-readiness") {
    return {
      title: "Clear product readiness warnings",
      owner: "Release owner",
      acceptanceCriteria: [
        "Product readiness gate returns ship-ready.",
        "Release bundle summary has no missing artifacts and no unresolved blockers.",
        "Release notes name only accepted residual risks."
      ],
      verificationCommand: "npm run rehearsal:strict"
    };
  }

  if (check.id === "security-redaction") {
    return {
      title: "Stop secret leakage before release",
      owner: "Safety auditor",
      acceptanceCriteria: [
        "No exported artifact contains sessionSecret or probed raw secret values.",
        "Provider keys remain session-only or server-side.",
        "Redaction checks pass in UI and CLI rehearsal."
      ],
      verificationCommand: "npm run rehearsal -- --no-write"
    };
  }

  return {
    title: `Resolve ${check.label}`,
    owner: "Release owner",
    acceptanceCriteria: [
      `${check.label} check returns pass.`,
      "Evidence is captured in the release rehearsal report."
    ],
    verificationCommand: "npm run rehearsal:strict"
  };
}

function remediationPriority(
  status: ReleaseRehearsalStatus,
  checkId: string
): ReleaseRemediationPriority {
  if (status === "block") return "critical";
  if (checkId === "provider-readiness" || checkId === "automation-runbook") return "high";
  if (checkId === "product-readiness" || checkId === "parallel-development") return "high";
  return "medium";
}

function remediationSummary(items: ReleaseRemediationItem[]) {
  return {
    total: items.length,
    critical: items.filter((item) => item.priority === "critical").length,
    high: items.filter((item) => item.priority === "high").length,
    medium: items.filter((item) => item.priority === "medium").length,
    low: items.filter((item) => item.priority === "low").length
  };
}

function cabinetRunCheck(
  run: CabinetRun,
  sourceRun: ReleaseRehearsalReport["sourceRun"]
): ReleaseRehearsalCheck {
  const hasStageCoverage = run.artifacts.length >= 7;
  const status = hasStageCoverage && run.logs.length > 0 ? "pass" : "block";
  return check({
    id: "cabinet-run",
    category: "cabinet-run",
    label: "Cabinet rehearsal run",
    status,
    summary: `${sourceRun === "simulated" ? "Simulated" : "Reused"} run ${run.id} with ${run.artifacts.length} artifacts and ${run.logs.length} log entries.`,
    evidence: [
      `Decision: ${run.score.decision}`,
      `Overall score: ${run.score.overall}`,
      `${run.automationActions?.length || 0} automation actions`
    ],
    nextAction: status === "pass"
      ? "Use this run as the rehearsal source for release evidence."
      : "Run the cabinet until every stage produces an artifact and log entry."
  });
}

function providerReadinessCheck(matrix: ProviderReadinessMatrix): ReleaseRehearsalCheck {
  const hardFailures = matrix.summary.missingConfig + matrix.summary.failed;
  const softFailures = matrix.summary.missingSecret + matrix.summary.unchecked;
  const status: ReleaseRehearsalStatus = hardFailures ? "block" : softFailures ? "warn" : "pass";
  return check({
    id: "provider-readiness",
    category: "role-api",
    label: "Role API readiness",
    status,
    summary: `${matrix.summary.ready}/${matrix.summary.enabled} enabled providers confirmed ready.`,
    evidence: [
      `${matrix.summary.unchecked} unchecked`,
      `${matrix.summary.missingSecret} missing secrets`,
      `${matrix.summary.failed} failed`,
      `${matrix.summary.missingConfig} missing config`
    ],
    nextAction: status === "pass"
      ? "Keep provider aliases server-side and continue rehearsal."
      : "Run Provider Readiness checks after session secrets are available."
  });
}

function automationCheck(runbook: ReturnType<typeof buildAutomationRunbook>): ReleaseRehearsalCheck {
  const status: ReleaseRehearsalStatus = runbook.summary.ready
    ? runbook.summary.held
      ? "warn"
      : "pass"
    : "block";
  return check({
    id: "automation-runbook",
    category: "automation",
    label: "Automation runbook",
    status,
    summary: `${runbook.summary.ready} runner steps ready and ${runbook.summary.held} actions held.`,
    evidence: [
      `${runbook.summary.shell} shell`,
      `${runbook.summary.browser} browser`,
      `${runbook.summary.mcp} mcp`,
      `${runbook.summary.approvalGated} approval-backed`
    ],
    nextAction: status === "pass"
      ? "Runner teams can consume the runbook."
      : "Review held actions and approve only the exact safe payloads."
  });
}

function executorEvidenceCheck(
  evidenceBundle: ReturnType<typeof buildExecutorEvidenceBundle>,
  heldActions: number
): ReleaseRehearsalCheck {
  const status: ReleaseRehearsalStatus = evidenceBundle.summary.evidenceItems
    ? heldActions
      ? "warn"
      : "pass"
    : "block";
  return check({
    id: "executor-evidence",
    category: "evidence",
    label: "Executor evidence",
    status,
    summary: `${evidenceBundle.summary.evidenceItems} evidence items across ${evidenceBundle.summary.steps} simulated executor steps.`,
    evidence: [
      `${evidenceBundle.summary.replayableSteps} replayable steps`,
      `${heldActions} held actions`,
      `Schema: ${evidenceBundle.schema}`
    ],
    nextAction: status === "block"
      ? "Create at least one runner-ready action before release rehearsal."
      : "Replace placeholders with real runner screenshots, transcripts, and manifests when live executors attach."
  });
}

function releaseArtifactCheck(
  bundleJson: string,
  releaseNotes: string,
  artifactCount: number
): ReleaseRehearsalCheck {
  const bundleOk = bundleJson.includes("naikaku.product-release-bundle.v1");
  const notesOk = releaseNotes.startsWith("# Naikaku Release Notes") &&
    releaseNotes.includes("## Handoff Checklist") &&
    releaseNotes.includes("npm run build");
  const status: ReleaseRehearsalStatus = bundleOk && notesOk ? "pass" : "block";
  return check({
    id: "release-artifacts",
    category: "release",
    label: "Release artifacts",
    status,
    summary: `${artifactCount} manifest artifacts packaged with JSON bundle and Markdown notes.`,
    evidence: [
      `${byteLength(bundleJson)} bundle bytes`,
      `${byteLength(releaseNotes)} notes bytes`,
      notesOk ? "Release notes include checklist and commands" : "Release notes are incomplete"
    ],
    nextAction: status === "pass"
      ? "Attach both JSON bundle and Markdown notes to handoff."
      : "Regenerate the release bundle and notes before handoff."
  });
}

function securityRedactionCheck(
  secretLeakDetected: boolean,
  secretProbeCount: number
): ReleaseRehearsalCheck {
  return check({
    id: "security-redaction",
    category: "security",
    label: "Secret redaction",
    status: secretLeakDetected ? "block" : "pass",
    summary: secretLeakDetected
      ? "Release rehearsal detected a secret-like value in exported artifacts."
      : "Release bundle and notes did not expose session secret fields or probed raw secret values.",
    evidence: [
      "Scanned bundle JSON",
      "Scanned Markdown release notes",
      `${secretProbeCount} session secret probes`
    ],
    nextAction: secretLeakDetected
      ? "Stop release and remove raw secrets from export serializers."
      : "Keep raw API keys session-only and server-side."
  });
}

function parallelDevelopmentCheck({
  activeRoles,
  workspaceFiles,
  issueDrafts,
  blockedIssues
}: {
  activeRoles: number;
  workspaceFiles: number;
  issueDrafts: number;
  blockedIssues: number;
}): ReleaseRehearsalCheck {
  const hasRoleWorkspaces = activeRoles > 0 && workspaceFiles >= activeRoles * 5;
  const hasIssueDrafts = issueDrafts >= activeRoles;
  const status: ReleaseRehearsalStatus = !hasRoleWorkspaces || !hasIssueDrafts
    ? "block"
    : blockedIssues
      ? "warn"
      : "pass";
  return check({
    id: "parallel-development",
    category: "parallel-development",
    label: "Parallel team handoff",
    status,
    summary: `${activeRoles} active roles, ${workspaceFiles} workspace files, ${issueDrafts} issue drafts.`,
    evidence: [
      `${Math.max(0, workspaceFiles - activeRoles * 5)} extra scaffold files`,
      `${blockedIssues} blocked issue drafts`
    ],
    nextAction: status === "pass"
      ? "Distribute role workspaces and issue drafts to separate teams."
      : "Resolve blocked team items before calling the release complete."
  });
}

function productReadinessCheck(
  decision: string,
  score: number
): ReleaseRehearsalCheck {
  const status: ReleaseRehearsalStatus = decision === "ship-ready"
    ? "pass"
    : decision === "blocked"
      ? "block"
      : "warn";
  return check({
    id: "product-readiness",
    category: "release",
    label: "Product readiness gate",
    status,
    summary: `Product readiness decision is ${decision} at ${score}/100.`,
    evidence: [
      `Decision: ${decision}`,
      `Score: ${score}/100`
    ],
    nextAction: status === "pass"
      ? "Release gate is clear for operator handoff."
      : "Use readiness gates as the remaining work list before final delivery."
  });
}

function check(input: {
  id: string;
  category: ReleaseRehearsalCategory;
  label: string;
  status: ReleaseRehearsalStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}): ReleaseRehearsalCheck {
  return input;
}

function detectsSecretLeak({
  bundleJson,
  releaseNotes,
  secretProbeValues
}: {
  bundleJson: string;
  releaseNotes: string;
  secretProbeValues: string[];
}) {
  const haystack = `${bundleJson}\n${releaseNotes}`;
  const probes = secretProbeValues
    .map((value) => value.trim())
    .filter((value) => value.length >= 4);

  return haystack.includes("sessionSecret") || probes.some((value) => haystack.includes(value));
}

function rehearsalDecision(blockers: number, warnings: number): ReleaseRehearsalDecision {
  if (blockers) return "blocked";
  if (warnings) return "needs-review";
  return "release-ready";
}

function rehearsalScore(blockers: number, warnings: number) {
  return Math.max(0, 100 - blockers * 22 - warnings * 7);
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}
