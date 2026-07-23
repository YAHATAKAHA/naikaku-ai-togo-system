import type {
  AutomationAction,
  AutomationApprovalDecision,
  AutomationApprovalRecord,
  AutomationActionStatus,
  CabinetRun,
  CabinetStageId,
  CabinetWorkspace,
  ExecutorHandoff,
  ExecutorHandoffAction,
  ExecutorProfileId,
  RiskLevel,
  RolePermissions
} from "./types";
import { evaluateSandboxAction } from "./sandboxPolicy";

interface AutomationBlueprint {
  action: string;
  title: string;
  target: string;
  executorProfileId?: ExecutorProfileId;
  riskLevel: RiskLevel;
}

const stageBlueprints: Record<CabinetStageId, AutomationBlueprint> = {
  intake: {
    action: "request_approval",
    title: "Confirm cabinet agenda",
    target: "human://mission-owner/agenda",
    executorProfileId: "human-approval",
    riskLevel: "medium"
  },
  planning: {
    action: "create_plan",
    title: "Publish implementation plan",
    target: "artifact://planning",
    riskLevel: "medium"
  },
  execution: {
    action: "run_shell",
    title: "Run bounded verification command",
    target: "/workspace:npm run test",
    executorProfileId: "shell-container",
    riskLevel: "high"
  },
  critique: {
    action: "open_url",
    title: "Collect critique evidence from approved docs",
    target: "https://docs.openai.com",
    executorProfileId: "browser-sandbox",
    riskLevel: "low"
  },
  supervision: {
    action: "change_permissions",
    title: "Review high-impact permission change",
    target: "policy://sandbox/permissions",
    executorProfileId: "human-approval",
    riskLevel: "critical"
  },
  scoring: {
    action: "write_file",
    title: "Write score audit artifact",
    target: "/tmp/naikaku/score-audit.json",
    executorProfileId: "mcp-proxy",
    riskLevel: "medium"
  },
  iteration: {
    action: "write_memory",
    title: "Propose memory entry for next loop",
    target: "/tmp/naikaku/memory-proposal.json",
    executorProfileId: "mcp-proxy",
    riskLevel: "medium"
  }
};

export function buildAutomationPlan({
  run,
  roles,
  sandboxPolicy
}: {
  run: CabinetRun;
  roles: CabinetWorkspace["roles"];
  sandboxPolicy: CabinetWorkspace["sandboxPolicy"];
}): AutomationAction[] {
  return run.artifacts.map((artifact, index) => {
    const role = roles.find((candidate) => candidate.id === artifact.roleId);
    const blueprint = stageBlueprints[artifact.stageId];
    const executorProfileId =
      blueprint.executorProfileId ||
      role?.executorProfileId ||
      sandboxPolicy.defaultExecutorProfileId;
    const providerBlock = providerArtifactBlockReason(artifact);
    const permissionBlock = providerBlock || (role
      ? permissionBlockReason(blueprint.action, role.permissions)
      : "No enabled role owns this automation action.");
    const decision = evaluateSandboxAction(
      {
        executorProfileId,
        action: blueprint.action,
        target: blueprint.target,
        risk: blueprint.riskLevel
      },
      sandboxPolicy
    );
    const status = actionStatus(permissionBlock, decision.allowed, decision.approvalRequired);

    return {
      id: `${run.id}-${artifact.stageId}-automation-${index}`,
      runId: run.id,
      stageId: artifact.stageId,
      roleId: artifact.roleId,
      executorProfileId,
      title: blueprint.title,
      action: blueprint.action,
      target: blueprint.target,
      riskLevel: blueprint.riskLevel,
      status,
      approvalRequired: status === "needs-approval",
      reason: permissionBlock || decision.reason,
      auditTags: providerBlock
        ? [executorProfileId, blueprint.action, blueprint.riskLevel, "provider-artifact-unavailable"]
        : permissionBlock
          ? [executorProfileId, blueprint.action, blueprint.riskLevel, "role-permission-denied"]
        : decision.auditTags
    };
  });
}

function providerArtifactBlockReason(artifact: CabinetRun["artifacts"][number]) {
  if (artifact.providerStatus !== "skipped" && artifact.providerStatus !== "failed") {
    return "";
  }

  return "The live provider did not generate an artifact for this stage; automation remains blocked.";
}

export function createApprovalRecord({
  action,
  decision,
  decidedAt = new Date().toISOString(),
  decidedBy = "local-operator",
  reason = ""
}: {
  action: AutomationAction;
  decision: AutomationApprovalDecision;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
}): AutomationApprovalRecord {
  return {
    id: `${action.runId}-${action.id}-${decision}`,
    runId: action.runId,
    actionId: action.id,
    decision,
    decidedAt,
    decidedBy,
    reason: reason || defaultDecisionReason(decision),
    actionSnapshot: action
  };
}

export function buildExecutorHandoff({
  run,
  approvalRecords,
  createdAt = new Date().toISOString()
}: {
  run: CabinetRun;
  approvalRecords: AutomationApprovalRecord[];
  createdAt?: string;
}): ExecutorHandoff {
  const actions = run.automationActions || [];
  const approvalsByActionId = approvalRecordsByActionId(approvalRecords);
  const readyActions: ExecutorHandoffAction[] = [];
  const heldActions: AutomationAction[] = [];

  for (const action of actions) {
    const approval = approvalsByActionId.get(action.id);
    if (action.status === "allowed") {
      readyActions.push({
        ...action,
        handoffStatus: "ready"
      });
      continue;
    }

    if (action.status === "needs-approval" && approval?.decision === "approved") {
      readyActions.push({
        ...action,
        approvalRecordId: approval.id,
        handoffStatus: "ready"
      });
      continue;
    }

    heldActions.push(action);
  }

  return {
    id: `${run.id}-executor-handoff`,
    runId: run.id,
    createdAt,
    readyActions,
    heldActions,
    approvalRecords: approvalRecords.filter((record) => record.runId === run.id)
  };
}

export function approvalRecordsByActionId(records: AutomationApprovalRecord[]) {
  return new Map(records.map((record) => [record.actionId, record]));
}

function actionStatus(
  permissionBlock: string,
  allowed: boolean,
  approvalRequired: boolean
): AutomationActionStatus {
  if (permissionBlock || !allowed) return "blocked";
  return approvalRequired ? "needs-approval" : "allowed";
}

function permissionBlockReason(action: string, permissions: RolePermissions) {
  if (action === "open_url" && (!permissions.canUseBrowser || !permissions.canSendNetworkRequests)) {
    return "Role lacks browser or network permission for this action.";
  }

  if (action === "run_shell" && !permissions.canUseShell) {
    return "Role lacks shell permission for this action.";
  }

  if ((action === "write_file" || action === "write_memory") && !permissions.canUseFiles) {
    return "Role lacks file permission for this action.";
  }

  if (action === "call_mcp_tool" && !permissions.canSendNetworkRequests) {
    return "Role lacks network permission for MCP proxy action.";
  }

  return "";
}

function defaultDecisionReason(decision: AutomationApprovalDecision) {
  return decision === "approved"
    ? "Human approved this sandbox action for executor handoff."
    : "Human rejected this sandbox action; executor handoff is blocked.";
}
