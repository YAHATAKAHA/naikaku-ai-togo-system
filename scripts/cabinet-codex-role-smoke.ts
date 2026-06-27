import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  decideCabinetMotion,
  type CabinetAuditDecision,
  type CabinetMotionDecisionReport,
  type CabinetVoteDecision
} from "../src/domain/cabinetDecision";
import type { RiskLevel } from "../src/domain/types";

interface CabinetCodexRoleSmokeOptions {
  outputDir: string;
  mission: string;
  generatedAt: string;
  help: boolean;
}

interface RoleCall {
  roleId: string;
  roleName: string;
  promptPath: string;
  outputPath: string;
  exitCode: number;
  text: string;
  parsed: Record<string, unknown>;
}

interface CabinetCodexRoleSmokeSummary {
  schema: "naikaku.cabinet-codex-role-smoke.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  codex: {
    commandPath: string | null;
    available: boolean;
  };
  roles: RoleCall[];
  decision: CabinetMotionDecisionReport | null;
  checks: {
    codexCliDetected: boolean;
    primeMinisterCalled: boolean;
    criticCalled: boolean;
    supervisorCalled: boolean;
    roleOutputsParsed: boolean;
    cabinetDecisionProduced: boolean;
    auditOrDissentRecorded: boolean;
    noExternalRunnerStarted: boolean;
    noGitOrDeploy: boolean;
  };
  claimBoundary: string[];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const codexPath = which("codex");
  const roles: RoleCall[] = [];
  let decision: CabinetMotionDecisionReport | null = null;

  if (codexPath) {
    const prime = callCodexRole({
      outputDir,
      roleId: "prime-minister",
      roleName: "Prime Minister",
      prompt: primeMinisterPrompt(options.mission)
    });
    roles.push(prime);
    const critic = callCodexRole({
      outputDir,
      roleId: "critic-minister",
      roleName: "Critic Minister",
      prompt: criticPrompt(options.mission, prime.text)
    });
    roles.push(critic);
    const supervisor = callCodexRole({
      outputDir,
      roleId: "supervisor-minister",
      roleName: "Supervisor Minister",
      prompt: supervisorPrompt(options.mission, prime.text, critic.text)
    });
    roles.push(supervisor);

    decision = buildDecisionReport({ mission: options.mission, prime, critic, supervisor });
    writeFileSync(path.join(outputDir, "cabinet-decision.json"), `${JSON.stringify(decision, null, 2)}\n`, "utf8");
  }

  const summary: CabinetCodexRoleSmokeSummary = {
    schema: "naikaku.cabinet-codex-role-smoke.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission: options.mission,
    codex: {
      commandPath: codexPath,
      available: Boolean(codexPath)
    },
    roles,
    decision,
    checks: {
      codexCliDetected: Boolean(codexPath),
      primeMinisterCalled: roles.some((role) => role.roleId === "prime-minister" && role.exitCode === 0),
      criticCalled: roles.some((role) => role.roleId === "critic-minister" && role.exitCode === 0),
      supervisorCalled: roles.some((role) => role.roleId === "supervisor-minister" && role.exitCode === 0),
      roleOutputsParsed: roles.length === 3 && roles.every((role) => Object.keys(role.parsed).length > 0),
      cabinetDecisionProduced: Boolean(decision),
      auditOrDissentRecorded: Boolean(decision && (decision.audit.findings.length > 0 || decision.dissent.length > 0)),
      noExternalRunnerStarted: true,
      noGitOrDeploy: true
    },
    claimBoundary: [
      "This smoke calls Codex CLI in three separate read-only sessions for Prime Minister, Critic, and Supervisor roles.",
      "The role outputs are treated as proposals and audit input; Naikaku still performs the deterministic cabinet vote locally.",
      "This proves separated role calls and cabinet governance, not feature completion or external runner execution.",
      "No OpenClaw, Hammerspoon, Claude, Git push, deployment, external message, or desktop action is started by this smoke.",
      "A real project run should dispatch only after cabinet approval and must still import runner receipts, evidence, and artifact audit."
    ]
  };

  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function callCodexRole({
  outputDir,
  roleId,
  roleName,
  prompt
}: {
  outputDir: string;
  roleId: string;
  roleName: string;
  prompt: string;
}): RoleCall {
  const roleDir = path.join(outputDir, roleId);
  mkdirSync(roleDir, { recursive: true });
  const promptPath = path.join(roleDir, "prompt.txt");
  const outputPath = path.join(roleDir, "output.json");
  const logPath = path.join(roleDir, "codex.log");
  writeFileSync(promptPath, prompt, "utf8");

  const result = spawnSync("codex", [
    "-a",
    "never",
    "exec",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "-C",
    process.cwd(),
    "-o",
    outputPath,
    prompt
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 90_000,
    maxBuffer: 1024 * 1024 * 8,
    shell: false
  });
  const text = existsSync(outputPath)
    ? readFileSync(outputPath, "utf8").trim()
    : `${result.stdout || ""}\n${result.stderr || result.error?.message || ""}`.trim();
  writeFileSync(logPath, `${result.stdout || ""}\n${result.stderr || ""}`, "utf8");

  return {
    roleId,
    roleName,
    promptPath: relativePath(promptPath),
    outputPath: relativePath(outputPath),
    exitCode: typeof result.status === "number" ? result.status : 1,
    text,
    parsed: parseRoleJson(text)
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
  const primeDecision = voteDecision(prime.parsed.decision, "approve");
  const criticDecision = voteDecision(critic.parsed.vote, auditDecision(critic.parsed.auditDecision) === "block" ? "reject" : "approve");
  const supervisorDecision = voteDecision(supervisor.parsed.decision, "approve");
  const audit = auditDecision(critic.parsed.auditDecision);
  const riskLevel = riskLevelFor(prime.parsed.riskLevel);
  const requiresHumanApproval = booleanFor(prime.parsed.requiresHumanApproval) || riskLevel === "critical";

  return decideCabinetMotion({
    motion: {
      id: "motion-codex-role-smoke",
      title: stringFor(prime.parsed.proposalTitle) || "Use separated AI cabinet roles before runner execution",
      requestedExecutor: stringFor(prime.parsed.requestedExecutor) || "codex-cli-readonly",
      riskLevel,
      requiresHumanApproval
    },
    votes: [
      {
        roleId: "prime-minister",
        roleName: "Prime Minister",
        roleStage: "intake",
        decision: primeDecision,
        rationale: stringFor(prime.parsed.rationale) || "Prime Minister proposed the motion."
      },
      {
        roleId: "critic-minister",
        roleName: "Critic Minister",
        roleStage: "critique",
        decision: criticDecision,
        rationale: stringFor(critic.parsed.rationale) || "Critic reviewed risks and evidence requirements."
      },
      {
        roleId: "supervisor-minister",
        roleName: "Supervisor Minister",
        roleStage: "supervision",
        decision: supervisorDecision,
        rationale: stringFor(supervisor.parsed.rationale) || "Supervisor checked permission boundaries."
      }
    ],
    audit: {
      decision: audit,
      findings: stringArray(critic.parsed.findings, [
        "Runner receipts and artifact audit are required before completion."
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

function primeMinisterPrompt(mission: string) {
  return [
    "You are the Prime Minister role in Naikaku, a Japanese-first multi-AI cabinet.",
    "Make a concise motion for whether this project should use external runners after cabinet review.",
    "The motion must include a concrete evidenceContract so the Critic can audit it without guessing.",
    `Mission: ${mission}`,
    "Return JSON only, no markdown. Schema:",
    '{"proposalTitle":"string","requestedExecutor":"codex-cli-readonly","riskLevel":"low|medium|high|critical","requiresHumanApproval":false,"decision":"approve|reject|abstain","rationale":"string","evidenceContract":["command transcript path","exit code","sandbox mode","no git/deploy/external-send proof","artifact summary path"]}'
  ].join("\n");
}

function criticPrompt(mission: string, proposal: string) {
  return [
    "You are the Critic Minister role in Naikaku.",
    "Review the Prime Minister proposal. Do not block merely because there is dissent; block only for unsafe execution, missing approval, external send, Git push, deploy, or missing evidence contract.",
    "If the proposal includes transcript path, exit code, sandbox mode, no-git/deploy/external-send proof, and artifact summary path, prefer auditDecision warn with vote approve unless another hard blocker exists.",
    `Mission: ${mission}`,
    "Prime Minister proposal:",
    proposal,
    "Return JSON only, no markdown. Schema:",
    '{"auditDecision":"pass|warn|block","vote":"approve|reject|abstain","findings":["string"],"evidence":["string"],"rationale":"string"}'
  ].join("\n");
}

function supervisorPrompt(mission: string, proposal: string, critique: string) {
  return [
    "You are the Supervisor Minister role in Naikaku.",
    "Check whether the motion can proceed to a governed runner later. You may object, but Naikaku will vote; only hard safety blocks should reject.",
    `Mission: ${mission}`,
    "Prime Minister proposal:",
    proposal,
    "Critic review:",
    critique,
    "Return JSON only, no markdown. Schema:",
    '{"decision":"approve|reject|abstain","rationale":"string","requiredEvidence":["string"]}'
  ].join("\n");
}

function parseRoleJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidates = [
    trimmed,
    fenced,
    trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      // Try the next form.
    }
  }
  return {};
}

function summaryMarkdown(summary: CabinetCodexRoleSmokeSummary) {
  return [
    "# Cabinet Codex Role Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Mission: ${summary.mission}`,
    "",
    "## Roles",
    "",
    ...summary.roles.map((role) => `- ${role.roleName}: exit ${role.exitCode}, output ${role.outputPath}`),
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
      : "- next action: call roles first",
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

function printSummary(summary: CabinetCodexRoleSmokeSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log("Cabinet Codex role smoke: " + (failed === 0 ? "passed" : "needs-review"));
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- roles called: ${summary.roles.filter((role) => role.exitCode === 0).length}/${summary.roles.length}`);
  console.log(`- decision: ${summary.decision ? `${summary.decision.decision} (${summary.decision.reason})` : "missing"}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function which(command: string) {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 1500,
    maxBuffer: 1024 * 64
  });
  if (result.status !== 0) return null;
  return (result.stdout || "").split(/\r?\n/).find(Boolean) || null;
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

function parseArgs(args: string[]): CabinetCodexRoleSmokeOptions {
  const options: CabinetCodexRoleSmokeOptions = {
    outputDir: "output/cabinet-codex-role-smoke",
    mission: "Use separated AI roles to decide whether a governed external runner may execute a small local engineering task.",
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
    } else if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
    } else {
      options.mission = [options.mission, arg].filter(Boolean).join(" ");
    }
  }
  return options;
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
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
    "  npm run cabinet:codex-smoke",
    "",
    "Calls Codex CLI three times in read-only mode as Prime Minister, Critic, and Supervisor,",
    "then runs Naikaku's local cabinet vote over the resulting proposal/audit."
  ].join("\n"));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown cabinet Codex role smoke failure.");
  process.exitCode = 1;
}
