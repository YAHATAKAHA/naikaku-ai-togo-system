import type {
  AutomationApprovalRecord,
  AutomationRunbook,
  AuditEvent,
  CabinetRun,
  CabinetWorkspace,
  DevelopmentBoard,
  DevelopmentIssueDrafts,
  MemoryEntry,
  ProductReadinessCategory,
  ProductReadinessGate,
  ProductReadinessReport,
  ProductReadinessStatus,
  ProviderReadinessMatrix,
  RoleWorkspaceScaffolds,
  SandboxCapabilityRegistry,
  TeamHandoff
} from "./types";

export interface BuildProductReadinessReportInput {
  workspace: CabinetWorkspace;
  providerReadiness: ProviderReadinessMatrix;
  sandboxCapabilities: SandboxCapabilityRegistry;
  teamHandoff: TeamHandoff;
  roleWorkspaces: RoleWorkspaceScaffolds;
  developmentBoard: DevelopmentBoard;
  issueDrafts: DevelopmentIssueDrafts;
  run?: CabinetRun | null;
  automationRunbook?: AutomationRunbook;
  approvalRecords?: AutomationApprovalRecord[];
  auditEvents?: AuditEvent[];
  memoryEntries?: MemoryEntry[];
  generatedAt?: string;
}

export function buildProductReadinessReport({
  workspace,
  providerReadiness,
  sandboxCapabilities,
  teamHandoff,
  roleWorkspaces,
  developmentBoard,
  issueDrafts,
  run,
  automationRunbook,
  approvalRecords = [],
  auditEvents = [],
  memoryEntries = [],
  generatedAt = new Date().toISOString()
}: BuildProductReadinessReportInput): ProductReadinessReport {
  const activeRoles = workspace.roles.filter((role) => role.enabled);
  const gates: ProductReadinessGate[] = [
    roleApiGate(activeRoles.length, providerReadiness),
    providerTestGate(activeRoles.length, providerReadiness),
    runGate(run || null),
    automationRunbookGate(run || null, automationRunbook),
    sandboxPolicyGate(workspace, sandboxCapabilities),
    sandboxCoverageGate(activeRoles.length, sandboxCapabilities),
    teamHandoffGate(activeRoles.length, teamHandoff),
    roleWorkspaceGate(activeRoles.length, roleWorkspaces),
    developmentBoardGate(activeRoles.length, developmentBoard),
    issueDraftGate(developmentBoard, issueDrafts),
    evidenceGate(run || null, approvalRecords, auditEvents),
    memoryGate(run || null, memoryEntries)
  ];
  const summary = summarizeGates(gates);

  return {
    schema: "naikaku.product-readiness.v1",
    generatedAt,
    mission: run?.mission || workspace.mission,
    runId: run?.id,
    decision: summary.blockers > 0
      ? "blocked"
      : summary.warnings > 0
        ? "needs-review"
        : "ship-ready",
    score: readinessScore(summary.blockers, summary.warnings),
    gates,
    summary
  };
}

export function serializeProductReadinessReport(report: ProductReadinessReport) {
  return JSON.stringify(report, null, 2);
}

function roleApiGate(
  activeRoles: number,
  providerReadiness: ProviderReadinessMatrix
): ProductReadinessGate {
  const missing = providerReadiness.summary.missingConfig + providerReadiness.summary.missingSecret;
  const failed = providerReadiness.summary.failed;

  if (activeRoles === 0) {
    return gate(
      "role-api-configured",
      "role-api",
      "Role API matrix",
      "block",
      "No enabled cabinet roles are available.",
      ["0 enabled roles"],
      "Enable at least one role before treating the system as deliverable."
    );
  }

  if (missing > 0 || failed > 0) {
    return gate(
      "role-api-configured",
      "role-api",
      "Role API matrix",
      "block",
      `${missing} provider rows are missing configuration or aliases; ${failed} failed checks.`,
      [
        `${providerReadiness.summary.enabled} enabled roles`,
        `${missing} missing rows`,
        `${failed} failed rows`
      ],
      "Fill endpoint, model, and API alias for every enabled role, then re-run provider checks."
    );
  }

  return gate(
    "role-api-configured",
    "role-api",
    "Role API matrix",
    "pass",
    "Every enabled role has a structurally complete provider configuration.",
    [
      `${providerReadiness.summary.enabled} enabled roles`,
      `${providerReadiness.summary.ready} tested ready`,
      `${providerReadiness.summary.unchecked} unchecked`
    ],
    "Keep aliases server-side and avoid exporting raw provider keys."
  );
}

function providerTestGate(
  activeRoles: number,
  providerReadiness: ProviderReadinessMatrix
): ProductReadinessGate {
  if (activeRoles === 0) {
    return gate(
      "provider-tests",
      "role-api",
      "Provider test coverage",
      "block",
      "Provider tests cannot run without enabled roles.",
      ["0 enabled roles"],
      "Enable roles and run provider readiness checks."
    );
  }

  if (providerReadiness.summary.ready === activeRoles) {
    return gate(
      "provider-tests",
      "role-api",
      "Provider test coverage",
      "pass",
      "All enabled role providers have a ready check.",
      [`${providerReadiness.summary.ready}/${activeRoles} ready`],
      "Retest after editing any provider endpoint, model, or alias."
    );
  }

  return gate(
    "provider-tests",
    "role-api",
    "Provider test coverage",
    "warn",
    `${providerReadiness.summary.ready}/${activeRoles} enabled role providers are confirmed ready.`,
    [
      `${providerReadiness.summary.unchecked} unchecked`,
      `${providerReadiness.summary.missingConfig + providerReadiness.summary.missingSecret} missing`,
      `${providerReadiness.summary.failed} failed`
    ],
    "Run Test all in Provider Readiness after gateway secrets are available."
  );
}

function runGate(run: CabinetRun | null): ProductReadinessGate {
  if (!run) {
    return gate(
      "cabinet-run",
      "automation",
      "Cabinet run",
      "block",
      "No cabinet run has been generated for this workspace.",
      ["No run id"],
      "Run the cabinet in dry-run or live provider mode to produce artifacts and automation proposals."
    );
  }

  return gate(
    "cabinet-run",
    "automation",
    "Cabinet run",
    "pass",
    `Latest cabinet decision is ${run.score.decision}.`,
    [
      `Run ${run.id}`,
      `${run.artifacts.length} artifacts`,
      `${run.automationActions?.length || 0} automation actions`
    ],
    "Use the run decision and artifacts as the source for automation, issue, and team handoffs."
  );
}

function automationRunbookGate(
  run: CabinetRun | null,
  runbook?: AutomationRunbook
): ProductReadinessGate {
  if (!run || !runbook?.runId) {
    return gate(
      "automation-runbook",
      "automation",
      "Automation runbook",
      "block",
      "No runner-facing automation runbook exists yet.",
      ["0 runner steps"],
      "Generate a cabinet run, approve safe actions, and export the automation runbook."
    );
  }

  if (runbook.summary.ready === 0) {
    return gate(
      "automation-runbook",
      "automation",
      "Automation runbook",
      "block",
      "Automation actions exist, but no runner-ready steps are available.",
      [`${runbook.summary.held} held actions`],
      "Approve safe actions or revise blocked actions before executor handoff."
    );
  }

  if (runbook.summary.held > 0) {
    return gate(
      "automation-runbook",
      "automation",
      "Automation runbook",
      "warn",
      `${runbook.summary.ready} runner steps are ready and ${runbook.summary.held} actions remain held.`,
      [
        `${runbook.summary.ready} ready steps`,
        `${runbook.summary.held} held actions`,
        `${runbook.summary.approvalGated} approval-backed steps`
      ],
      "Resolve held actions before calling the product fully automated."
    );
  }

  return gate(
    "automation-runbook",
    "automation",
    "Automation runbook",
    "pass",
    "All proposed automation actions are represented as runner-ready steps.",
    [`${runbook.summary.ready} ready steps`],
    "Keep evidence requirements attached to each runner step."
  );
}

function sandboxPolicyGate(
  workspace: CabinetWorkspace,
  sandboxCapabilities: SandboxCapabilityRegistry
): ProductReadinessGate {
  const policy = workspace.sandboxPolicy;
  if (!policy.killSwitchArmed || !policy.requireHumanApproval) {
    return gate(
      "sandbox-policy",
      "sandbox",
      "Sandbox policy",
      "block",
      "Sandbox policy is missing the kill switch or high-impact approval gate.",
      [
        `Kill switch: ${yesNo(policy.killSwitchArmed)}`,
        `High-impact approval: ${yesNo(policy.requireHumanApproval)}`
      ],
      "Arm the kill switch and require human approval for high-impact actions."
    );
  }

  return gate(
    "sandbox-policy",
    "sandbox",
    "Sandbox policy",
    "pass",
    "Kill switch and high-impact approval gates are active.",
    [
      `${policy.networkAllowlist.length} network allowlist entries`,
      `${policy.blockedActions.length} blocked actions`,
      `${sandboxCapabilities.summary.approvalActions} approval actions`
    ],
    "Keep real computer-use runners behind these policy gates."
  );
}

function sandboxCoverageGate(
  activeRoles: number,
  sandboxCapabilities: SandboxCapabilityRegistry
): ProductReadinessGate {
  if (sandboxCapabilities.summary.rolesCovered < activeRoles) {
    return gate(
      "sandbox-coverage",
      "sandbox",
      "Executor coverage",
      "block",
      "Some enabled roles do not map to an executor capability card.",
      [
        `${sandboxCapabilities.summary.rolesCovered}/${activeRoles} roles covered`,
        `${sandboxCapabilities.summary.profiles} executor profiles`
      ],
      "Assign every enabled role to a known executor profile."
    );
  }

  return gate(
    "sandbox-coverage",
    "sandbox",
    "Executor coverage",
    "pass",
    "Every enabled role maps to a governed executor profile.",
    [
      `${sandboxCapabilities.summary.rolesCovered}/${activeRoles} roles covered`,
      `${sandboxCapabilities.summary.blockedActions} intentionally blocked representative actions`
    ],
    "Treat blocked representative actions as proof that policy is active, not as executor work."
  );
}

function teamHandoffGate(activeRoles: number, handoff: TeamHandoff): ProductReadinessGate {
  if (handoff.packages.length !== activeRoles) {
    return gate(
      "team-handoff",
      "parallel-development",
      "Team handoff packages",
      "block",
      "Team package count does not match the enabled role count.",
      [`${handoff.packages.length}/${activeRoles} packages`],
      "Regenerate team handoffs after editing role enablement."
    );
  }

  return gate(
    "team-handoff",
    "parallel-development",
    "Team handoff packages",
    "pass",
    "Every enabled role has a parallel team package.",
    [
      `${handoff.summary.roles} packages`,
      `${handoff.summary.ready} ready`,
      `${handoff.summary.blocked} blocked`
    ],
    "Use packages as the source for team workspaces and issue drafts."
  );
}

function roleWorkspaceGate(
  activeRoles: number,
  roleWorkspaces: RoleWorkspaceScaffolds
): ProductReadinessGate {
  const expectedFiles = activeRoles * 5;
  if (roleWorkspaces.scaffolds.length !== activeRoles || roleWorkspaces.summary.files < expectedFiles) {
    return gate(
      "role-workspaces",
      "parallel-development",
      "Role workspace scaffolds",
      "block",
      "Role workspace scaffolds are incomplete.",
      [
        `${roleWorkspaces.scaffolds.length}/${activeRoles} workspaces`,
        `${roleWorkspaces.summary.files}/${expectedFiles} expected starter files`
      ],
      "Export role workspace scaffolds again after regenerating team packages."
    );
  }

  return gate(
    "role-workspaces",
    "parallel-development",
    "Role workspace scaffolds",
    "pass",
    "Every enabled role has a starter workspace scaffold.",
    [
      `${roleWorkspaces.summary.roles} workspaces`,
      `${roleWorkspaces.summary.envFiles} env examples`,
      `${roleWorkspaces.summary.runnerNotes} runner notes`
    ],
    "Run the scaffold script only after reviewing the generated files."
  );
}

function developmentBoardGate(
  activeRoles: number,
  board: DevelopmentBoard
): ProductReadinessGate {
  if (board.summary.total < activeRoles) {
    return gate(
      "development-board",
      "parallel-development",
      "Development board",
      "block",
      "Development board has fewer work items than enabled roles.",
      [`${board.summary.total}/${activeRoles} work items`],
      "Generate a development board from the latest team handoff."
    );
  }

  if (board.summary.blocked > 0) {
    return gate(
      "development-board",
      "parallel-development",
      "Development board",
      "warn",
      `${board.summary.blocked} development items are blocked.`,
      [
        `${board.summary.total} total items`,
        `${board.summary.highPriority} high-priority items`,
        `${board.summary.blocked} blocked`
      ],
      "Resolve blocked development items before declaring the MVP complete."
    );
  }

  return gate(
    "development-board",
    "parallel-development",
    "Development board",
    "pass",
    "Development work is split into status-trackable items.",
    [`${board.summary.total} work items`, `${board.summary.teams} teams`],
    "Keep statuses current as teams implement their packages."
  );
}

function issueDraftGate(
  board: DevelopmentBoard,
  issueDrafts: DevelopmentIssueDrafts
): ProductReadinessGate {
  if (issueDrafts.summary.total !== board.summary.total) {
    return gate(
      "issue-drafts",
      "parallel-development",
      "Issue drafts",
      "block",
      "Issue draft count does not match the development board.",
      [`${issueDrafts.summary.total}/${board.summary.total} drafts`],
      "Regenerate issue drafts after updating development items."
    );
  }

  if (issueDrafts.summary.blocked > 0) {
    return gate(
      "issue-drafts",
      "parallel-development",
      "Issue drafts",
      "warn",
      `${issueDrafts.summary.blocked} GitHub issue drafts are blocked.`,
      [
        `${issueDrafts.summary.total} drafts`,
        `${issueDrafts.summary.labels.length} labels`
      ],
      "Keep blocked labels visible until owners resolve the issue."
    );
  }

  return gate(
    "issue-drafts",
    "parallel-development",
    "Issue drafts",
    "pass",
    "Development items have matching GitHub-ready issue drafts.",
    [`${issueDrafts.summary.total} drafts`, `${issueDrafts.summary.teams} teams`],
    "Export the gh script only in an authenticated repository after review."
  );
}

function evidenceGate(
  run: CabinetRun | null,
  approvalRecords: AutomationApprovalRecord[],
  auditEvents: AuditEvent[]
): ProductReadinessGate {
  if (!run) {
    return gate(
      "audit-evidence",
      "evidence",
      "Audit evidence",
      "block",
      "No run evidence exists yet.",
      ["0 run artifacts"],
      "Run the cabinet and export evidence before delivery."
    );
  }

  if (auditEvents.length === 0) {
    return gate(
      "audit-evidence",
      "evidence",
      "Audit evidence",
      "warn",
      "No audit events have been recorded in the current browser ledger.",
      [`${run.artifacts.length} run artifacts`, `${approvalRecords.length} approval records`],
      "Perform or export at least one audited operator action before handoff."
    );
  }

  return gate(
    "audit-evidence",
    "evidence",
    "Audit evidence",
    "pass",
    "The workspace has run artifacts and audit trail entries.",
    [
      `${run.artifacts.length} run artifacts`,
      `${approvalRecords.length} approval records`,
      `${auditEvents.length} audit events`
    ],
    "Export audit logs before external review."
  );
}

function memoryGate(
  run: CabinetRun | null,
  memoryEntries: MemoryEntry[]
): ProductReadinessGate {
  if (!run) {
    return gate(
      "memory-review",
      "memory",
      "Memory review",
      "warn",
      "Memory review waits for a cabinet run.",
      ["No run id"],
      "Run the cabinet to prepare reviewable memory candidates."
    );
  }

  const reviewed = memoryEntries.filter((entry) => entry.status !== "candidate");
  if (!reviewed.length) {
    return gate(
      "memory-review",
      "memory",
      "Memory review",
      "warn",
      "No memory candidates have been accepted or rejected.",
      [`${memoryEntries.length} stored memory entries`],
      "Review memory candidates so lessons and rejected decisions are explicit."
    );
  }

  return gate(
    "memory-review",
    "memory",
    "Memory review",
    "pass",
    "Memory decisions have been reviewed by the operator.",
    [
      `${reviewed.filter((entry) => entry.status === "accepted").length} accepted`,
      `${reviewed.filter((entry) => entry.status === "rejected").length} rejected`
    ],
    "Carry accepted lessons into the next cabinet cycle."
  );
}

function gate(
  id: string,
  category: ProductReadinessCategory,
  label: string,
  status: ProductReadinessStatus,
  summary: string,
  evidence: string[],
  nextAction: string
): ProductReadinessGate {
  return {
    id,
    category,
    label,
    status,
    summary,
    evidence,
    nextAction
  };
}

function summarizeGates(gates: ProductReadinessGate[]): ProductReadinessReport["summary"] {
  const categories = Array.from(new Set(gates.map((gate) => gate.category)));
  return {
    total: gates.length,
    passed: gates.filter((gate) => gate.status === "pass").length,
    warnings: gates.filter((gate) => gate.status === "warn").length,
    blockers: gates.filter((gate) => gate.status === "block").length,
    categories,
    categoriesReady: categories.filter((category) =>
      gates
        .filter((gate) => gate.category === category)
        .every((gate) => gate.status === "pass")
    ).length
  };
}

function readinessScore(blockers: number, warnings: number) {
  return Math.max(0, 100 - blockers * 18 - warnings * 7);
}

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}
