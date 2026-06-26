import type {
  AutomationApprovalRecord,
  AutomationRunbook,
  AuditEvent,
  CabinetRun,
  CabinetWorkspace,
  DevelopmentBoard,
  DevelopmentIssueDrafts,
  MemoryEntry,
  ProductReadinessReport,
  ProductReleaseBundle,
  ProductReleaseBundleItem,
  ProviderReadinessMatrix,
  RoleWorkspaceScaffolds,
  TeamHandoff
} from "./types";

export interface BuildProductReleaseBundleInput {
  workspace: CabinetWorkspace;
  providerReadiness: ProviderReadinessMatrix;
  productReadiness: ProductReadinessReport;
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

export function buildProductReleaseBundle({
  workspace,
  providerReadiness,
  productReadiness,
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
}: BuildProductReleaseBundleInput): ProductReleaseBundle {
  const items = manifestItems({
    workspace,
    run: run || null,
    providerReadiness,
    productReadiness,
    automationRunbook,
    teamHandoff,
    roleWorkspaces,
    developmentBoard,
    issueDrafts,
    approvalRecords,
    auditEvents,
    memoryEntries
  });

  return {
    schema: "naikaku.product-release-bundle.v1",
    generatedAt,
    mission: run?.mission || workspace.mission,
    runId: run?.id,
    readiness: {
      decision: productReadiness.decision,
      score: productReadiness.score,
      blockers: productReadiness.summary.blockers,
      warnings: productReadiness.summary.warnings
    },
    contents: {
      workspace,
      ...(run ? { run } : {}),
      providerReadiness,
      productReadiness,
      ...(automationRunbook ? { automationRunbook } : {}),
      teamHandoff,
      roleWorkspaces,
      developmentBoard,
      issueDrafts,
      approvalRecords,
      auditEvents,
      memoryEntries
    },
    manifest: {
      items,
      operatorCommands: operatorCommands(run?.id),
      handoffChecklist: handoffChecklist(productReadiness),
      securityNotes: securityNotes()
    },
    summary: {
      artifacts: items.length,
      missing: items.filter((item) => item.status === "missing").length,
      reviewRequired: items.filter((item) => item.status === "review-required").length,
      roles: workspace.roles.filter((role) => role.enabled).length,
      automationSteps: automationRunbook?.summary.ready || 0,
      issueDrafts: issueDrafts.summary.total,
      workspaceFiles: roleWorkspaces.summary.files,
      auditEvents: auditEvents.length,
      memoryEntries: memoryEntries.length
    }
  };
}

export function serializeProductReleaseBundle(bundle: ProductReleaseBundle) {
  return JSON.stringify(bundle, null, 2);
}

function manifestItems({
  workspace,
  run,
  providerReadiness,
  productReadiness,
  automationRunbook,
  teamHandoff,
  roleWorkspaces,
  developmentBoard,
  issueDrafts,
  approvalRecords,
  auditEvents,
  memoryEntries
}: {
  workspace: CabinetWorkspace;
  run: CabinetRun | null;
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
}): ProductReleaseBundleItem[] {
  return [
    item("workspace", "Workspace configuration", "naikaku.workspace.v1", "included", workspace.roles.length, "Import through the workbench workspace loader."),
    item("run", "Cabinet run", "naikaku.cabinet-run.v1", run ? "included" : "missing", run ? 1 : 0, "Run the cabinet before final delivery."),
    item("provider-readiness", "Provider readiness", providerReadiness.schema, providerReadiness.summary.failed || providerReadiness.summary.missingConfig || providerReadiness.summary.missingSecret ? "review-required" : "included", providerReadiness.rows.length, "Review role API rows before live provider mode."),
    item("product-readiness", "Product readiness gate", productReadiness.schema, productReadiness.decision === "ship-ready" ? "included" : "review-required", productReadiness.gates.length, "Resolve blockers and warnings before declaring release complete."),
    item("automation-runbook", "Automation runbook", "naikaku.automation-runbook.v1", automationRunbook?.summary.ready ? "included" : "missing", automationRunbook?.summary.ready || 0, "Approve safe actions and export runner-ready steps."),
    item("team-handoff", "Team handoff packages", teamHandoff.schema, teamHandoff.packages.length ? "included" : "missing", teamHandoff.packages.length, "Send packages to role owners."),
    item("role-workspaces", "Role workspace scaffolds", roleWorkspaces.schema, roleWorkspaces.scaffolds.length ? "included" : "missing", roleWorkspaces.summary.files, "Run the scaffold script only after review."),
    item("development-board", "Development board", developmentBoard.schema, developmentBoard.summary.blocked ? "review-required" : "included", developmentBoard.summary.total, "Keep work item statuses current."),
    item("issue-drafts", "GitHub issue drafts", issueDrafts.schema, issueDrafts.summary.blocked ? "review-required" : "included", issueDrafts.summary.total, "Create issues through the reviewed gh script in an authenticated repository."),
    item("approval-records", "Approval records", "naikaku.approval-records.v1", approvalRecords.length ? "included" : "review-required", approvalRecords.length, "Record approvals for high-impact automation."),
    item("audit-events", "Audit events", "naikaku.audit-log.v1", auditEvents.length ? "included" : "review-required", auditEvents.length, "Export audit logs for external review."),
    item("memory-entries", "Reviewed memory", "naikaku.memory-log.v1", memoryEntries.length ? "included" : "review-required", memoryEntries.length, "Review memory candidates before the next release cycle.")
  ];
}

function item(
  id: string,
  label: string,
  schema: string,
  status: ProductReleaseBundleItem["status"],
  count: number,
  exportHint: string
): ProductReleaseBundleItem {
  return {
    id,
    label,
    schema,
    status,
    count,
    exportHint
  };
}

function operatorCommands(runId?: string) {
  return [
    "npm install",
    "npm run test",
    "npm run build",
    "npm run gateway",
    runId ? `# Review release bundle for ${runId}` : "# Run the cabinet before final delivery"
  ];
}

function handoffChecklist(readiness: ProductReadinessReport) {
  const blockerLine = readiness.summary.blockers
    ? `Resolve ${readiness.summary.blockers} product readiness blockers.`
    : "Confirm there are no product readiness blockers.";
  const warningLine = readiness.summary.warnings
    ? `Review ${readiness.summary.warnings} product readiness warnings.`
    : "Confirm warnings are accepted or cleared.";

  return [
    blockerLine,
    warningLine,
    "Confirm provider aliases are configured server-side or in a local vault.",
    "Export role workspaces and GitHub issue scripts only after review.",
    "Attach audit evidence and release bundle to the handoff record."
  ];
}

function securityNotes() {
  return [
    "Release bundles contain provider aliases and session-free metadata only.",
    "Do not paste raw API keys into workspace, readiness, issue, or release exports.",
    "Run shell scripts only after reviewing generated file paths and payloads.",
    "Keep real computer-use runners behind sandbox policy, runner identity, and evidence gates."
  ];
}
