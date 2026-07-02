import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defaultSandboxPolicy } from "../src/data/defaultCabinet";
import {
  decideCabinetMotion,
  type CabinetAuditDecision,
  type CabinetMotionDecisionReport,
  type CabinetVoteDecision
} from "../src/domain/cabinetDecision";
import { completeRole } from "../src/domain/roles";
import type {
  CabinetArtifact,
  CabinetRole,
  ProviderConfig,
  ProviderKind,
  RiskLevel
} from "../src/domain/types";
import {
  invokeRoleProvider,
  validateProviderConfig,
  type ProviderInvocationResult
} from "../server/providerAdapters";

type RoleStatus = ProviderInvocationResult["status"] | "mocked";

interface CabinetApiRoleSmokeOptions {
  outputDir: string;
  mission: string;
  provider: ProviderKind;
  endpoint: string | null;
  model: string | null;
  apiKeyAlias: string | null;
  maxTokens: number | null;
  mock: boolean;
  generatedAt: string;
  help: boolean;
}

interface RoleCall {
  roleId: string;
  roleName: string;
  status: RoleStatus;
  provider: string;
  model: string;
  detail: string;
  latencyMs: number;
  tokensUsed?: number;
  instructionPath: string;
  outputPath: string;
  text: string;
  parsed: Record<string, unknown>;
}

interface CabinetApiRoleSmokeSummary {
  schema: "naikaku.cabinet-api-role-smoke.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  mode: "mock" | "live-provider";
  provider: {
    provider: ProviderKind;
    endpoint: string;
    model: string;
    apiKeyAlias: string;
    readiness: ReturnType<typeof validateProviderConfig>;
  };
  roles: RoleCall[];
  decision: CabinetMotionDecisionReport | null;
  checks: {
    providerConfiguredOrMocked: boolean;
    secretResolvedOrMocked: boolean;
    primeMinisterCalled: boolean;
    criticCalled: boolean;
    supervisorCalled: boolean;
    roleOutputsParsed: boolean;
    cabinetDecisionProduced: boolean;
    auditOrDissentRecorded: boolean;
    noExternalRunnerStarted: boolean;
    noDesktopControl: boolean;
    noGitOrDeploy: boolean;
    noRawSecretPersisted: boolean;
  };
  claimBoundary: string[];
}

const roleSpecs = [
  {
    id: "prime-minister",
    name: "Prime Minister",
    ministry: "Mission Control",
    stage: "intake" as const,
    mandate: "Create a concrete cabinet motion and evidence contract from the operator mission.",
    riskLevel: "medium" as const,
    executorProfileId: "human-approval" as const
  },
  {
    id: "critic-minister",
    name: "Opposition Critic",
    ministry: "Critique",
    stage: "critique" as const,
    mandate: "Challenge the motion, record dissent, and identify evidence gaps before any runner executes.",
    riskLevel: "low" as const,
    executorProfileId: "browser-sandbox" as const
  },
  {
    id: "supervisor-minister",
    name: "Safety Supervisor",
    ministry: "Supervision",
    stage: "supervision" as const,
    mandate: "Check sandbox, permission, and stop-condition boundaries before execution is authorized.",
    riskLevel: "critical" as const,
    executorProfileId: "human-approval" as const
  }
];

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const provider = providerConfigFrom(options);
  const readiness = validateProviderConfig(provider);
  const roles = roleSpecs.map((spec) => roleForSpec(spec, provider));
  const calls: RoleCall[] = [];
  const context: CabinetArtifact[] = [];

  for (const role of roles) {
    const call = options.mock
      ? mockRoleCall({ role, mission: options.mission, context, outputDir })
      : await liveRoleCall({ role, mission: options.mission, context, outputDir });
    calls.push(call);
    context.push(artifactFromCall(call, role));
  }

  const [prime, critic, supervisor] = calls;
  const decision = prime && critic && supervisor
    ? buildDecisionReport({
        mission: options.mission,
        prime,
        critic,
        supervisor
      })
    : null;

  if (decision) {
    writeFileSync(path.join(outputDir, "cabinet-decision.json"), `${JSON.stringify(decision, null, 2)}\n`, "utf8");
  }

  const summary: CabinetApiRoleSmokeSummary = {
    schema: "naikaku.cabinet-api-role-smoke.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission: options.mission,
    mode: options.mock ? "mock" : "live-provider",
    provider: {
      provider: provider.provider,
      endpoint: provider.endpoint,
      model: provider.model,
      apiKeyAlias: provider.apiKeyAlias,
      readiness
    },
    roles: calls,
    decision,
    checks: buildChecks({ options, readiness, calls, decision }),
    claimBoundary: [
      "This command runs Prime Minister, Critic, and Supervisor as separate provider calls or deterministic mock calls.",
      "Live mode uses configured provider endpoints and environment-variable aliases; raw API secrets are not written to disk.",
      "Role outputs are proposals and audit inputs. Naikaku still performs the local deterministic cabinet decision.",
      "No external coding runner, browser, OpenClaw, Hammerspoon, desktop action, Git push, deployment, or external message is started here.",
      "Use engineering:guided or engineering:auto-work after this role smoke when a governed runner must execute and return receipts."
    ]
  };

  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function providerConfigFrom(options: CabinetApiRoleSmokeOptions): ProviderConfig {
  const provider = options.provider;
  return {
    provider,
    endpoint: options.endpoint || defaultEndpoint(provider),
    model: options.mock
      ? "mock-role-model"
      : options.model || defaultModel(provider),
    apiKeyAlias: options.mock ? "" : options.apiKeyAlias || defaultApiKeyAlias(provider),
    temperature: provider === "custom" || provider === "aliyun" ? 0.2 : 0.25,
    maxTokens: options.maxTokens || (provider === "aliyun" ? 512 : 1400)
  };
}

function defaultEndpoint(provider: ProviderKind) {
  if (provider === "openai") return "https://api.openai.com/v1/responses";
  if (provider === "anthropic") return "https://api.anthropic.com/v1/messages";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1/chat/completions";
  if (provider === "aliyun") return process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  if (provider === "google") return "https://generativelanguage.googleapis.com/v1beta/models";
  if (provider === "local") return "http://localhost:8787/v1/evaluate";
  return "http://localhost:8790/chat";
}

function defaultModel(provider: ProviderKind) {
  if (provider === "aliyun") return process.env.NAIKAKU_ROLE_MODEL || process.env.DASHSCOPE_MODEL || "qwen-turbo";
  return process.env.NAIKAKU_ROLE_MODEL || process.env.OPENAI_MODEL || "";
}

function defaultApiKeyAlias(provider: ProviderKind) {
  if (provider === "openai") return "NAIKAKU_OPENAI_API_KEY";
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  if (provider === "openrouter") return "OPENROUTER_API_KEY";
  if (provider === "aliyun") return "DASHSCOPE_API_KEY";
  if (provider === "google") return "GOOGLE_API_KEY";
  if (provider === "local") return "NAIKAKU_LOCAL_GATEWAY_TOKEN";
  return "";
}

function roleForSpec(spec: typeof roleSpecs[number], provider: ProviderConfig): CabinetRole {
  return completeRole({
    id: spec.id,
    name: spec.name,
    ministry: spec.ministry,
    mandate: spec.mandate,
    stage: spec.stage,
    provider,
    systemPrompt: roleSystemPrompt(spec.id),
    permissions: {
      canUseBrowser: false,
      canUseShell: false,
      canUseFiles: false,
      canSendNetworkRequests: false,
      requiresApprovalForHighImpact: true
    },
    enabled: true,
    riskLevel: spec.riskLevel,
    executorProfileId: spec.executorProfileId
  });
}

function roleSystemPrompt(roleId: string) {
  const shared = [
    "You are one role in Naikaku, a Japanese-first governed AI cabinet.",
    "Return JSON only. Do not use markdown fences.",
    "Do not claim that code, desktop control, Git push, deploy, or external messages have run.",
    "Prefer Japanese for human-facing rationale unless the mission asks otherwise."
  ];
  if (roleId === "prime-minister") {
    return [
      ...shared,
      "Schema: {\"proposalTitle\":\"string\",\"requestedExecutor\":\"model-api-readonly|engineering-guided|engineering-auto-work\",\"riskLevel\":\"low|medium|high|critical\",\"requiresHumanApproval\":false,\"decision\":\"approve|reject|abstain\",\"rationale\":\"string\",\"evidenceContract\":[\"string\"]}."
    ].join("\n");
  }
  if (roleId === "critic-minister") {
    return [
      ...shared,
      "Schema: {\"auditDecision\":\"pass|warn|block\",\"vote\":\"approve|reject|abstain\",\"findings\":[\"string\"],\"evidence\":[\"string\"],\"rationale\":\"string\"}."
    ].join("\n");
  }
  return [
    ...shared,
    "Schema: {\"decision\":\"approve|reject|abstain\",\"rationale\":\"string\",\"requiredEvidence\":[\"string\"]}."
  ].join("\n");
}

async function liveRoleCall({
  role,
  mission,
  context,
  outputDir
}: {
  role: CabinetRole;
  mission: string;
  context: CabinetArtifact[];
  outputDir: string;
}): Promise<RoleCall> {
  const roleDir = path.join(outputDir, role.id);
  mkdirSync(roleDir, { recursive: true });
  const instructionPath = path.join(roleDir, "system-prompt.txt");
  const outputPath = path.join(roleDir, "output.json");
  writeFileSync(instructionPath, role.systemPrompt, "utf8");

  const result = await invokeRoleProvider({
    role,
    mission,
    context
  });
  const text = result.text.trim();
  writeFileSync(outputPath, text ? `${text}\n` : "", "utf8");

  return {
    roleId: role.id,
    roleName: role.name,
    status: result.status,
    provider: result.provider,
    model: result.model,
    detail: result.detail,
    latencyMs: result.latencyMs,
    tokensUsed: result.tokensUsed,
    instructionPath: relativePath(instructionPath),
    outputPath: relativePath(outputPath),
    text,
    parsed: parseRoleJson(text)
  };
}

function mockRoleCall({
  role,
  mission,
  context,
  outputDir
}: {
  role: CabinetRole;
  mission: string;
  context: CabinetArtifact[];
  outputDir: string;
}): RoleCall {
  const roleDir = path.join(outputDir, role.id);
  mkdirSync(roleDir, { recursive: true });
  const instructionPath = path.join(roleDir, "system-prompt.txt");
  const outputPath = path.join(roleDir, "output.json");
  writeFileSync(instructionPath, role.systemPrompt, "utf8");
  const parsed = mockJsonForRole(role.id, mission, context);
  const text = JSON.stringify(parsed, null, 2);
  writeFileSync(outputPath, `${text}\n`, "utf8");

  return {
    roleId: role.id,
    roleName: role.name,
    status: "mocked",
    provider: role.provider.provider,
    model: role.provider.model,
    detail: "Deterministic mock role output; no provider call was made.",
    latencyMs: 0,
    instructionPath: relativePath(instructionPath),
    outputPath: relativePath(outputPath),
    text,
    parsed
  };
}

function mockJsonForRole(roleId: string, mission: string, context: CabinetArtifact[]) {
  if (roleId === "prime-minister") {
    return {
      proposalTitle: "API roles can supervise the next engineering runner cycle",
      requestedExecutor: "engineering-guided",
      riskLevel: "medium",
      requiresHumanApproval: false,
      decision: "approve",
      rationale: `Mission accepted for role-separated review: ${mission}`,
      evidenceContract: [
        "Three separate role outputs",
        "Cabinet decision JSON",
        "No desktop/Git/deploy action proof",
        "Runner receipts before implementation completion"
      ]
    };
  }
  if (roleId === "critic-minister") {
    return {
      auditDecision: "warn",
      vote: "approve",
      findings: [
        "API role calls prove supervision, not implementation.",
        "A governed runner still needs receipt, transcript, changed-file, and artifact audit evidence."
      ],
      evidence: context.map((artifact) => artifact.title),
      rationale: "Safe to proceed to a bounded runner only after evidence gates stay attached."
    };
  }
  return {
    decision: "approve",
    rationale: "Sandbox boundaries are intact because this smoke starts no external runner.",
    requiredEvidence: [
      "Provider status per role",
      "Parsed JSON output per role",
      "Deterministic cabinet vote",
      "No Git push, deploy, external-send, or desktop-control claim"
    ]
  };
}

function artifactFromCall(call: RoleCall, role: CabinetRole): CabinetArtifact {
  return {
    id: `artifact-${role.id}`,
    stageId: role.stage,
    roleId: role.id,
    title: `${role.name} output`,
    body: call.text,
    riskLevel: role.riskLevel,
    scoreImpact: call.status === "called" || call.status === "mocked" ? 1 : -1,
    providerStatus: call.status === "mocked" ? "dry-run" : call.status,
    providerDetail: call.detail,
    tokensUsed: call.tokensUsed,
    latencyMs: call.latencyMs
  };
}

function buildDecisionReport({
  mission,
  prime,
  critic,
  supervisor
}: {
  mission: string;
  prime: RoleCall;
  critic: RoleCall;
  supervisor: RoleCall;
}) {
  const riskLevel = riskLevelFor(prime.parsed.riskLevel);
  const requiresHumanApproval = booleanFor(prime.parsed.requiresHumanApproval) ||
    riskLevel === "critical" ||
    defaultSandboxPolicy.requireHumanApproval && stringFor(prime.parsed.requestedExecutor).includes("desktop");

  return decideCabinetMotion({
    motion: {
      id: "motion-api-role-smoke",
      title: stringFor(prime.parsed.proposalTitle) || "Use separated provider roles before governed execution",
      requestedExecutor: stringFor(prime.parsed.requestedExecutor) || "model-api-readonly",
      riskLevel,
      requiresHumanApproval
    },
    votes: [
      {
        roleId: "prime-minister",
        roleName: "Prime Minister",
        roleStage: "intake",
        decision: voteDecision(prime.parsed.decision, "approve"),
        rationale: stringFor(prime.parsed.rationale) || "Prime Minister proposed the motion."
      },
      {
        roleId: "critic-minister",
        roleName: "Opposition Critic",
        roleStage: "critique",
        decision: voteDecision(
          critic.parsed.vote,
          auditDecision(critic.parsed.auditDecision) === "block" ? "reject" : "approve"
        ),
        rationale: stringFor(critic.parsed.rationale) || "Critic reviewed risks and evidence requirements."
      },
      {
        roleId: "supervisor-minister",
        roleName: "Safety Supervisor",
        roleStage: "supervision",
        decision: voteDecision(supervisor.parsed.decision, "approve"),
        rationale: stringFor(supervisor.parsed.rationale) || "Supervisor checked permission boundaries."
      }
    ],
    audit: {
      decision: auditDecision(critic.parsed.auditDecision),
      findings: stringArray(critic.parsed.findings, [
        "Runner receipts and artifact audit are required before implementation completion."
      ]),
      evidence: [
        ...stringArray(critic.parsed.evidence, []),
        ...stringArray(prime.parsed.evidenceContract, []),
        ...stringArray(supervisor.parsed.requiredEvidence, []),
        `Mission: ${mission}`,
        `Prime output: ${prime.outputPath}`,
        `Critic output: ${critic.outputPath}`,
        `Supervisor output: ${supervisor.outputPath}`
      ]
    },
    humanApprovalGranted: !requiresHumanApproval
  });
}

function buildChecks({
  options,
  readiness,
  calls,
  decision
}: {
  options: CabinetApiRoleSmokeOptions;
  readiness: ReturnType<typeof validateProviderConfig>;
  calls: RoleCall[];
  decision: CabinetMotionDecisionReport | null;
}) {
  const calledOrMocked = (roleId: string) =>
    calls.some((call) => call.roleId === roleId && (call.status === "called" || call.status === "mocked"));
  return {
    providerConfiguredOrMocked: options.mock || readiness.ok,
    secretResolvedOrMocked: options.mock || readiness.secretReady,
    primeMinisterCalled: calledOrMocked("prime-minister"),
    criticCalled: calledOrMocked("critic-minister"),
    supervisorCalled: calledOrMocked("supervisor-minister"),
    roleOutputsParsed: calls.length === 3 && calls.every((call) => Object.keys(call.parsed).length > 0),
    cabinetDecisionProduced: Boolean(decision),
    auditOrDissentRecorded: Boolean(decision && (decision.audit.findings.length > 0 || decision.dissent.length > 0)),
    noExternalRunnerStarted: true,
    noDesktopControl: true,
    noGitOrDeploy: true,
    noRawSecretPersisted: !looksLikeRawSecret(options.apiKeyAlias || "")
  };
}

function parseRoleJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const bracketed = trimmed.includes("{") && trimmed.includes("}")
    ? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)
    : "";
  const candidates = [trimmed, fenced, bracketed].filter((candidate): candidate is string =>
    Boolean(candidate && candidate.trim())
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      // Try the next candidate.
    }
  }
  return {};
}

function summaryMarkdown(summary: CabinetApiRoleSmokeSummary) {
  return [
    "# Cabinet API Role Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Mode: ${summary.mode}`,
    `Provider: ${summary.provider.provider}`,
    `Endpoint: ${summary.provider.endpoint}`,
    `Model: ${summary.provider.model || "missing"}`,
    `API key alias: ${summary.provider.apiKeyAlias || "none"}`,
    `Mission: ${summary.mission}`,
    "",
    "## Roles",
    "",
    ...summary.roles.map((role) =>
      `- ${role.roleName}: ${role.status}, ${role.provider}/${role.model || "missing"}, output ${role.outputPath}`
    ),
    "",
    "## Decision",
    "",
    summary.decision
      ? `- ${summary.decision.decision}: ${summary.decision.reason}`
      : "- not produced",
    summary.decision
      ? `- tally: ${summary.decision.tally.approve} approve / ${summary.decision.tally.reject} reject / ${summary.decision.tally.abstain} abstain`
      : "- tally: none",
    summary.decision
      ? `- next action: ${summary.decision.nextAction}`
      : "- next action: fix provider config or role JSON output",
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([key, value]) => `- ${value ? "pass" : "fail"}: ${key}`),
    "",
    "## Claim Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function printSummary(summary: CabinetApiRoleSmokeSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Cabinet API role smoke: ${failed === 0 ? "passed" : "needs-review"}`);
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- mode: ${summary.mode}`);
  console.log(`- roles called: ${summary.roles.filter((role) => role.status === "called" || role.status === "mocked").length}/3`);
  console.log(`- decision: ${summary.decision ? `${summary.decision.decision} (${summary.decision.reason})` : "missing"}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): CabinetApiRoleSmokeOptions {
  const options: CabinetApiRoleSmokeOptions = {
    outputDir: "output/cabinet-api-role-smoke",
    mission: "Use separated model-provider cabinet roles to decide whether a governed engineering runner may continue.",
    provider: "openai",
    endpoint: null,
    model: null,
    apiKeyAlias: null,
    maxTokens: null,
    mock: false,
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--mission" || arg === "-m") {
      options.mission = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--provider") {
      options.provider = parseProvider(requireValue(args, index, arg));
      index += 1;
    } else if (arg === "--endpoint") {
      options.endpoint = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--model") {
      options.model = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--api-key-alias") {
      const alias = requireValue(args, index, arg);
      assertEnvAlias(alias, arg);
      options.apiKeyAlias = alias;
      index += 1;
    } else if (arg === "--max-tokens") {
      options.maxTokens = parsePositiveInt(requireValue(args, index, arg), arg);
      index += 1;
    } else if (arg === "--mock") {
      options.mock = true;
    } else if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
    } else {
      options.mission = [options.mission, arg].filter(Boolean).join(" ");
    }
  }

  return options;
}

function parseProvider(value: string): ProviderKind {
  if (["openai", "anthropic", "openrouter", "aliyun", "google", "local", "custom"].includes(value)) {
    return value as ProviderKind;
  }
  throw new Error("--provider must be one of openai, anthropic, openrouter, aliyun, google, local, custom.");
}

function assertEnvAlias(value: string, name: string) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
    throw new Error(`${name} must be an environment variable name, not a raw secret.`);
  }
}

function parsePositiveInt(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function voteDecision(value: unknown, fallback: CabinetVoteDecision): CabinetVoteDecision {
  return value === "approve" || value === "reject" || value === "abstain" ? value : fallback;
}

function auditDecision(value: unknown): CabinetAuditDecision {
  return value === "pass" || value === "warn" || value === "block" ? value : "warn";
}

function riskLevelFor(value: unknown): RiskLevel {
  return value === "low" || value === "medium" || value === "high" || value === "critical" ? value : "medium";
}

function stringFor(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function booleanFor(value: unknown) {
  return value === true;
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length ? strings : fallback;
}

function looksLikeRawSecret(value: string) {
  return /^(sk-|sk_|pat_|ghp_|xox[baprs]-)/i.test(value.trim());
}

function assertSafeOutputDir(outputDir: string) {
  const outputRoot = path.resolve("output");
  const relative = path.relative(outputRoot, outputDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must point to a subdirectory under output/.");
  }
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run cabinet:api-role-smoke -- --mock",
    "  npm run cabinet:api-role-smoke -- --provider openai --model <model> --api-key-alias NAIKAKU_OPENAI_API_KEY",
    "  npm run cabinet:api-role-smoke -- --provider openrouter --model openai/<model> --api-key-alias OPENROUTER_API_KEY",
    "  npm run cabinet:api-role-smoke -- --provider aliyun --model qwen-turbo --api-key-alias DASHSCOPE_API_KEY",
    "",
    "Options:",
    "  --mission, -m <text>       Mission text. Positional text also appends to the default mission.",
    "  --out <dir>                Output directory under output/. Default: output/cabinet-api-role-smoke.",
    "  --provider <kind>          openai, anthropic, openrouter, aliyun, google, local, custom. Default: openai.",
    "  --endpoint <url>           Override provider endpoint.",
    "  --model <name>             Required for live provider mode unless a provider-specific default/env model is set.",
    "  --api-key-alias <ENV>      Environment variable name that contains the key. Raw keys are rejected by readiness.",
    "  --max-tokens <n>           Response token cap. Use a small value for paid live smoke tests.",
    "  --mock                     Run deterministic local role outputs without network.",
    "  --generated-at <iso>       Stable timestamp for tests.",
    "  --help, -h                 Show this help.",
    "",
    "This command proves role-separated provider calls. It does not start coding runners, control the desktop, push Git, deploy, or claim implementation completion."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown cabinet API role smoke failure.");
  process.exitCode = 1;
});
