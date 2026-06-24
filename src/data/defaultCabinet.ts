import type {
  CabinetRole,
  CabinetStageDefinition,
  ExecutorProfile,
  SandboxPolicy
} from "../domain/types";

const defaultPermissions = {
  canUseBrowser: false,
  canUseShell: false,
  canUseFiles: false,
  canSendNetworkRequests: false,
  requiresApprovalForHighImpact: true
};

export const executorProfiles: ExecutorProfile[] = [
  {
    id: "browser-sandbox",
    label: "Browser Sandbox",
    purpose: "Web workflows, research, forms, and browser-only automation.",
    isolation: "Ephemeral browser context with no host env and strict domain allowlist.",
    controls: ["Screenshots", "Domain allowlist", "No local files", "Pause and resume"]
  },
  {
    id: "desktop-vm",
    label: "Desktop VM",
    purpose: "GUI automation that needs a full desktop, VNC stream, and OS input.",
    isolation: "Disposable Linux desktop VM or remote sandbox provider.",
    controls: ["VNC stream", "Keyboard/mouse log", "Approval gates", "Kill switch"]
  },
  {
    id: "shell-container",
    label: "Shell Container",
    purpose: "Code execution, scripts, tests, and file transformations.",
    isolation: "Containerized workspace with scoped mounts and empty environment.",
    controls: ["Command allowlist", "Resource limits", "Artifact export", "No secrets by default"]
  },
  {
    id: "mcp-proxy",
    label: "MCP Proxy",
    purpose: "Tool integrations through a governed model-context protocol proxy.",
    isolation: "Per-tool identity, scoped credentials, and audited tool schemas.",
    controls: ["Tool allowlist", "Credential scopes", "Schema validation", "Rate limits"]
  },
  {
    id: "human-approval",
    label: "Human Approval Gate",
    purpose: "Purchases, external messages, deletes, deployments, and irreversible actions.",
    isolation: "No action until a human approves exact target and payload.",
    controls: ["Payload preview", "Two-step approval", "Audit trail", "Timeout"]
  }
];

export const defaultSandboxPolicy: SandboxPolicy = {
  defaultExecutorProfileId: "browser-sandbox",
  networkAllowlist: ["github.com", "docs.openai.com", "api.openai.com"],
  fileAllowlist: ["/workspace", "/tmp/naikaku"],
  blockedActions: ["send_email", "purchase", "delete_remote", "deploy_production"],
  requireHumanApproval: true,
  killSwitchArmed: true,
  maxRunMinutes: 12
};

export const defaultRoles: CabinetRole[] = [
  {
    id: "prime-minister",
    name: "Prime Minister",
    ministry: "Mission Control",
    mandate: "Clarify the mission, coordinate ministers, and decide the next cabinet cycle.",
    stage: "intake",
    provider: {
      provider: "openai",
      endpoint: "https://api.openai.com/v1/responses",
      model: "gpt-5.4",
      apiKeyAlias: "NAIKAKU_OPENAI_API_KEY",
      temperature: 0.3,
      maxTokens: 1800
    },
    systemPrompt:
      "You are the Prime Minister of a disciplined AI cabinet. Convert fuzzy goals into a concrete cabinet agenda.",
    permissions: defaultPermissions,
    enabled: true,
    riskLevel: "medium",
    executorProfileId: "human-approval"
  },
  {
    id: "strategy-minister",
    name: "Strategy Minister",
    ministry: "Planning",
    mandate: "Produce a plan with milestones, owners, risks, and measurable acceptance gates.",
    stage: "planning",
    provider: {
      provider: "anthropic",
      endpoint: "https://api.anthropic.com/v1/messages",
      model: "claude-sonnet-4.5",
      apiKeyAlias: "NAIKAKU_ANTHROPIC_API_KEY",
      temperature: 0.35,
      maxTokens: 2200
    },
    systemPrompt:
      "You are the Strategy Minister. Build practical plans that separate product, engineering, safety, and operations.",
    permissions: defaultPermissions,
    enabled: true,
    riskLevel: "medium",
    executorProfileId: "browser-sandbox"
  },
  {
    id: "execution-minister",
    name: "Execution Minister",
    ministry: "Implementation",
    mandate: "Turn the plan into bounded tasks and execute through approved tools.",
    stage: "execution",
    provider: {
      provider: "openrouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "openai/gpt-5.4",
      apiKeyAlias: "NAIKAKU_OPENROUTER_API_KEY",
      temperature: 0.25,
      maxTokens: 2600
    },
    systemPrompt:
      "You are the Execution Minister. Prefer small reversible actions, explicit diffs, and observable progress.",
    permissions: {
      ...defaultPermissions,
      canUseBrowser: true,
      canUseFiles: true,
      canUseShell: true,
      canSendNetworkRequests: true
    },
    enabled: true,
    riskLevel: "high",
    executorProfileId: "shell-container"
  },
  {
    id: "sandbox-operator",
    name: "Sandbox Operator",
    ministry: "Computer Use",
    mandate: "Operate browsers, desktops, shells, and MCP tools only inside approved sandboxes.",
    stage: "execution",
    provider: {
      provider: "custom",
      endpoint: "http://localhost:8790/computer-use",
      model: "vision-action-router",
      apiKeyAlias: "NAIKAKU_SANDBOX_GATEWAY_TOKEN",
      temperature: 0.1,
      maxTokens: 1400
    },
    systemPrompt:
      "You are the Sandbox Operator. Translate approved plans into computer actions and never escape the declared executor.",
    permissions: {
      ...defaultPermissions,
      canUseBrowser: true,
      canUseShell: true,
      canUseFiles: true,
      canSendNetworkRequests: true
    },
    enabled: true,
    riskLevel: "critical",
    executorProfileId: "desktop-vm"
  },
  {
    id: "critic",
    name: "Opposition Critic",
    ministry: "Critique",
    mandate: "Find weak assumptions, missing evidence, UX gaps, and failure modes.",
    stage: "critique",
    provider: {
      provider: "google",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
      model: "gemini-2.5-pro",
      apiKeyAlias: "NAIKAKU_GOOGLE_API_KEY",
      temperature: 0.45,
      maxTokens: 2000
    },
    systemPrompt:
      "You are the Opposition Critic. Challenge the plan like a constructive adversary.",
    permissions: defaultPermissions,
    enabled: true,
    riskLevel: "low",
    executorProfileId: "browser-sandbox"
  },
  {
    id: "safety-auditor",
    name: "Safety Auditor",
    ministry: "Supervision",
    mandate: "Enforce sandbox policy, approval rules, prompt-injection hygiene, and auditability.",
    stage: "supervision",
    provider: {
      provider: "openai",
      endpoint: "https://api.openai.com/v1/responses",
      model: "gpt-5.4",
      apiKeyAlias: "NAIKAKU_OPENAI_API_KEY",
      temperature: 0.15,
      maxTokens: 1800
    },
    systemPrompt:
      "You are the Safety Auditor. Block unsafe autonomy and require evidence for risky claims.",
    permissions: defaultPermissions,
    enabled: true,
    riskLevel: "critical",
    executorProfileId: "human-approval"
  },
  {
    id: "scoring-office",
    name: "Scoring Office",
    ministry: "Quality and Evaluation",
    mandate: "Score readiness, safety, execution quality, critique coverage, and iteration needs.",
    stage: "scoring",
    provider: {
      provider: "local",
      endpoint: "http://localhost:8787/v1/evaluate",
      model: "local-evaluator",
      apiKeyAlias: "NAIKAKU_LOCAL_GATEWAY_TOKEN",
      temperature: 0,
      maxTokens: 1200
    },
    systemPrompt:
      "You are the Scoring Office. Convert evidence into actionable go, revise, or block decisions.",
    permissions: defaultPermissions,
    enabled: true,
    riskLevel: "medium",
    executorProfileId: "mcp-proxy"
  },
  {
    id: "memory-secretary",
    name: "Memory Secretary",
    ministry: "Learning Loop",
    mandate: "Record durable lessons, rejected decisions, reusable skills, and follow-up automations.",
    stage: "iteration",
    provider: {
      provider: "custom",
      endpoint: "http://localhost:8787/v1/memory",
      model: "memory-curator",
      apiKeyAlias: "NAIKAKU_MEMORY_GATEWAY_TOKEN",
      temperature: 0.2,
      maxTokens: 1200
    },
    systemPrompt:
      "You are the Memory Secretary. Preserve only useful, consented, future-relevant learning.",
    permissions: {
      ...defaultPermissions,
      canUseFiles: true
    },
    enabled: true,
    riskLevel: "medium",
    executorProfileId: "mcp-proxy"
  }
];

export const cabinetStages: CabinetStageDefinition[] = [
  {
    id: "intake",
    label: "Intake",
    ownerRoleId: "prime-minister",
    objective: "Normalize the user goal into a cabinet agenda."
  },
  {
    id: "planning",
    label: "Planning",
    ownerRoleId: "strategy-minister",
    objective: "Define milestones, owners, acceptance gates, and risks."
  },
  {
    id: "execution",
    label: "Execution",
    ownerRoleId: "execution-minister",
    objective: "Execute bounded tasks through approved tools and sandboxes."
  },
  {
    id: "critique",
    label: "Critique",
    ownerRoleId: "critic",
    objective: "Stress-test the output and find missing evidence."
  },
  {
    id: "supervision",
    label: "Supervision",
    ownerRoleId: "safety-auditor",
    objective: "Check policy, sandbox boundaries, approvals, and audit trail."
  },
  {
    id: "scoring",
    label: "Scoring",
    ownerRoleId: "scoring-office",
    objective: "Score readiness and decide whether to ship, revise, or block."
  },
  {
    id: "iteration",
    label: "Iteration",
    ownerRoleId: "memory-secretary",
    objective: "Record lessons and prepare the next improvement cycle."
  }
];

export const defaultMission =
  "Build a sandbox-first multi-model AI cabinet that can plan, execute, critique, supervise, score, and iterate product work with separate role APIs.";
