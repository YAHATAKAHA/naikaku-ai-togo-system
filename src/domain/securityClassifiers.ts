import type {
  ExecutorProfileId,
  RiskLevel,
  SandboxPolicy,
  SecurityActionClassification,
  SecurityClassificationDecision,
  SecurityFinding,
  SecurityTextClassification,
  SecurityThreatCategory
} from "./types";
import { evaluateSandboxAction } from "./sandboxPolicy";

interface SecurityRule {
  id: string;
  category: SecurityThreatCategory;
  severity: RiskLevel;
  summary: string;
  patterns: RegExp[];
}

interface ClassifySecurityTextInput {
  text: string;
  source?: string;
  generatedAt?: string;
}

interface ClassifyActionImpactInput {
  executorProfileId: ExecutorProfileId;
  action: string;
  target?: string;
  risk?: RiskLevel;
  instruction?: string;
  sandboxPolicy: SandboxPolicy;
  generatedAt?: string;
}

const securityRules: SecurityRule[] = [
  {
    id: "prompt-injection-override",
    category: "prompt-injection",
    severity: "critical",
    summary: "Input tries to override system, developer, or policy instructions.",
    patterns: [
      /\bignore (all )?(previous|prior|system|developer) instructions?\b/i,
      /\bdisregard (the )?(system|developer|safety|policy) (message|instructions?|rules?)\b/i,
      /\byou are now (unrestricted|root|developer|admin)\b/i,
      /\bdo not tell (the )?(user|operator|auditor)\b/i
    ]
  },
  {
    id: "hidden-instruction-extraction",
    category: "prompt-injection",
    severity: "critical",
    summary: "Input asks the agent to reveal hidden prompts or privileged instructions.",
    patterns: [
      /\breveal (the )?(system prompt|developer message|hidden instructions?|policy prompt)\b/i,
      /\bprint (the )?(system prompt|developer message|hidden instructions?)\b/i,
      /\bshow me (your )?(chain of thought|hidden instructions?|system prompt)\b/i
    ]
  },
  {
    id: "policy-bypass",
    category: "policy-bypass",
    severity: "critical",
    summary: "Input asks to bypass approval, sandbox, audit, or kill-switch controls.",
    patterns: [
      /\bbypass (the )?(sandbox|policy|approval|audit|kill switch|gate)\b/i,
      /\bwithout (human )?(approval|operator review|audit|verification)\b/i,
      /\bapproval (is )?(already|pre[- ]?)(\s+)?(granted|approved)\b/i,
      /\bskip (the )?(review|receipt|evidence|verification|approval)\b/i
    ]
  },
  {
    id: "credential-exfiltration",
    category: "credential-exfiltration",
    severity: "critical",
    summary: "Input asks for secrets, tokens, environment files, or credential aliases.",
    patterns: [
      /\b(api[_ -]?key|secret|token|password|credential|private key)\b/i,
      /\b\.env\b/i,
      /\bNAIKAKU_[A-Z0-9_]+\b/,
      /\bid_rsa\b/i
    ]
  },
  {
    id: "localhost-control-plane",
    category: "localhost-control-plane",
    severity: "critical",
    summary: "Input targets localhost or the local control-plane surface.",
    patterns: [
      /\b(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i,
      /\/v1\/(executor|runner|provider|release|sandbox|development)\b/i,
      /\bx-naikaku-runner-id\b/i,
      /\bNAIKAKU_RUNNER_TOKEN\b/
    ]
  },
  {
    id: "cloud-metadata-control-plane",
    category: "control-plane",
    severity: "critical",
    summary: "Input targets cloud metadata or control-plane addresses.",
    patterns: [
      /\b169\.254\.169\.254\b/,
      /\bmetadata\.google\.internal\b/i,
      /\blatest\/meta-data\b/i
    ]
  },
  {
    id: "destructive-local-mutation",
    category: "destructive-action",
    severity: "critical",
    summary: "Input requests destructive local, Git, repository, or filesystem mutation.",
    patterns: [
      /\brm\s+-rf\b/i,
      /\bgit\s+(push|reset|checkout|clean)\b/i,
      /\bdelete (remote|production|database|repository|repo)\b/i,
      /\bchmod\s+777\b/i
    ]
  },
  {
    id: "production-deploy",
    category: "production-deploy",
    severity: "critical",
    summary: "Input requests production deployment or release mutation.",
    patterns: [
      /\bdeploy_production\b/i,
      /\bdeploy(ment)? (to )?production\b/i,
      /\bproduction release\b/i,
      /\bprod deploy\b/i
    ]
  },
  {
    id: "external-send",
    category: "external-send",
    severity: "high",
    summary: "Input requests an outbound message, purchase, or form submission.",
    patterns: [
      /\bsend[_ -]?(email|message|sms)\b/i,
      /\bpurchase\b/i,
      /\bsubmit[_ -]?form\b/i,
      /\bpost (to|on) (twitter|x|slack|discord|email)\b/i
    ]
  },
  {
    id: "network-escape",
    category: "network-escape",
    severity: "high",
    summary: "Input asks a shell-like runner to make direct outbound HTTP requests.",
    patterns: [
      /\bcurl\s+https?:\/\//i,
      /\bwget\s+https?:\/\//i,
      /\bfetch\s*\(\s*["']https?:\/\//i
    ]
  }
];

const highImpactActions = new Set([
  "send_email",
  "send_message",
  "purchase",
  "delete_remote",
  "deploy_production",
  "change_permissions",
  "submit_form",
  "install_software",
  "run_shell",
  "write_file",
  "write_memory",
  "call_mcp_tool",
  "git_push",
  "git_commit",
  "git_reset",
  "open_localhost",
  "control_runner"
]);

export function classifySecurityText({
  text,
  source = "untrusted-input",
  generatedAt = new Date().toISOString()
}: ClassifySecurityTextInput): SecurityTextClassification {
  const findings = securityRules.flatMap((rule) => findMatches(rule, text));
  const decision = decisionFromFindings(findings);

  return {
    schema: "naikaku.security-text-classification.v1",
    generatedAt,
    source,
    decision,
    riskLevel: riskFromFindings(findings),
    findings,
    summary: summaryForDecision(decision, findings.length)
  };
}

export function classifyActionImpact({
  executorProfileId,
  action,
  target,
  risk = "medium",
  instruction = "",
  sandboxPolicy,
  generatedAt = new Date().toISOString()
}: ClassifyActionImpactInput): SecurityActionClassification {
  const policyDecision = evaluateSandboxAction(
    {
      executorProfileId,
      action,
      target,
      risk
    },
    sandboxPolicy
  );
  const text = [action, target || "", instruction].filter(Boolean).join("\n");
  const textClassification = classifySecurityText({
    text,
    source: "action-impact",
    generatedAt
  });
  const highImpact = isHighImpactAction(action, risk);
  const highImpactFinding = highImpact ? highImpactActionFinding(action, risk) : undefined;
  const findings = highImpactFinding
    ? [...textClassification.findings, highImpactFinding]
    : textClassification.findings;
  const decision = actionDecision({
    findings,
    policyAllowed: policyDecision.allowed,
    policyApprovalRequired: policyDecision.approvalRequired,
    highImpact
  });

  return {
    schema: "naikaku.security-action-classification.v1",
    generatedAt,
    executorProfileId,
    action,
    target,
    riskLevel: risk,
    decision,
    sandboxPolicyDecision: policyDecision,
    findings,
    summary: actionSummary(decision, policyDecision.reason, findings.length)
  };
}

export function isHighImpactAction(action: string, risk: RiskLevel = "medium") {
  const normalized = action.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return risk === "critical" || risk === "high" || highImpactActions.has(normalized);
}

function findMatches(rule: SecurityRule, text: string): SecurityFinding[] {
  return rule.patterns.flatMap((pattern) => {
    const match = text.match(pattern);
    if (!match) return [];
    return [{
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      evidence: sanitizeEvidence(match[0]),
      summary: rule.summary,
      recommendedAction: recommendedAction(rule.category)
    }];
  });
}

function decisionFromFindings(findings: SecurityFinding[]): SecurityClassificationDecision {
  if (findings.some((finding) => finding.severity === "critical")) return "blocked";
  if (findings.some((finding) => finding.severity === "high" || finding.severity === "medium")) {
    return "needs-approval";
  }
  return "allowed";
}

function actionDecision({
  findings,
  policyAllowed,
  policyApprovalRequired,
  highImpact
}: {
  findings: SecurityFinding[];
  policyAllowed: boolean;
  policyApprovalRequired: boolean;
  highImpact: boolean;
}): SecurityClassificationDecision {
  if (!policyAllowed || findings.some((finding) => finding.severity === "critical")) {
    return "blocked";
  }
  if (policyApprovalRequired || highImpact || findings.length > 0) {
    return "needs-approval";
  }
  return "allowed";
}

function riskFromFindings(findings: SecurityFinding[]): RiskLevel {
  if (findings.some((finding) => finding.severity === "critical")) return "critical";
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "medium")) return "medium";
  return "low";
}

function summaryForDecision(decision: SecurityClassificationDecision, findings: number) {
  if (decision === "blocked") {
    return `Blocked untrusted input with ${findings} security finding(s).`;
  }
  if (decision === "needs-approval") {
    return `Requires approval because ${findings} security finding(s) were detected.`;
  }
  return "No security findings were detected.";
}

function actionSummary(
  decision: SecurityClassificationDecision,
  policyReason: string,
  findings: number
) {
  if (decision === "blocked") {
    return `Action blocked by security classifier or sandbox policy. ${policyReason}`;
  }
  if (decision === "needs-approval") {
    return `Action requires approval before runner handoff. ${policyReason} Findings: ${findings}.`;
  }
  return `Action is allowed by classifier and sandbox policy. ${policyReason}`;
}

function highImpactActionFinding(action: string, risk: RiskLevel): SecurityFinding {
  return {
    id: "high-impact-action",
    category: "high-impact-action",
    severity: "high",
    evidence: sanitizeEvidence(action),
    summary: `Action is ${risk} impact and cannot run without an approval/evidence gate.`,
    recommendedAction: "Require exact-payload human approval and runner evidence before execution."
  };
}

function recommendedAction(category: SecurityThreatCategory) {
  if (category === "prompt-injection") {
    return "Treat the content as data only and do not pass its instructions to tools or runners.";
  }
  if (category === "credential-exfiltration") {
    return "Do not expose secrets; keep aliases server-side and rotate any suspected credential.";
  }
  if (category === "localhost-control-plane" || category === "control-plane") {
    return "Block runner access to control-plane, localhost, and metadata endpoints.";
  }
  if (category === "policy-bypass") {
    return "Require a fresh policy decision and explicit operator approval.";
  }
  return "Block or hold the action until a human reviews the exact payload and evidence plan.";
}

function sanitizeEvidence(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 120);
}
