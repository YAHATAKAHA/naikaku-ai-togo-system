import type { ExecutorProfileId, SandboxPolicy } from "../src/domain/types";

export interface SandboxActionRequest {
  executorProfileId: ExecutorProfileId;
  action: string;
  target?: string;
  risk?: "low" | "medium" | "high" | "critical";
}

export interface SandboxActionDecision {
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
  auditTags: string[];
}

const highImpactActions = new Set([
  "send_email",
  "purchase",
  "delete_remote",
  "deploy_production",
  "change_permissions",
  "submit_form",
  "install_software"
]);

export function evaluateSandboxAction(
  request: SandboxActionRequest,
  policy: SandboxPolicy
): SandboxActionDecision {
  const action = request.action.trim();
  const risk = request.risk || "medium";
  const auditTags = [request.executorProfileId, action, risk];

  if (!policy.killSwitchArmed) {
    return {
      allowed: false,
      approvalRequired: true,
      reason: "Global kill switch is not armed.",
      auditTags: [...auditTags, "kill-switch-open"]
    };
  }

  if (policy.blockedActions.includes(action)) {
    return {
      allowed: false,
      approvalRequired: true,
      reason: `Action "${action}" is blocked by sandbox policy.`,
      auditTags: [...auditTags, "blocked-action"]
    };
  }

  const targetHost = extractHost(request.target);
  if (targetHost && !isHostAllowed(targetHost, policy.networkAllowlist)) {
    return {
      allowed: false,
      approvalRequired: true,
      reason: `Target host "${targetHost}" is not in the network allowlist.`,
      auditTags: [...auditTags, "network-denied"]
    };
  }

  if (policy.requireHumanApproval && (highImpactActions.has(action) || risk === "critical")) {
    return {
      allowed: true,
      approvalRequired: true,
      reason: "Action is allowed only after human approval.",
      auditTags: [...auditTags, "approval-required"]
    };
  }

  return {
    allowed: true,
    approvalRequired: false,
    reason: "Action is allowed inside the selected sandbox profile.",
    auditTags: [...auditTags, "allowed"]
  };
}

function extractHost(target?: string) {
  if (!target || !target.includes("://")) {
    return "";
  }

  try {
    return new URL(target).hostname;
  } catch {
    return "";
  }
}

function isHostAllowed(host: string, allowlist: string[]) {
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
