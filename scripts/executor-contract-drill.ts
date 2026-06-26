import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultMission, defaultRoles, defaultSandboxPolicy, executorProfiles } from "../src/data/defaultCabinet";
import { buildExecutorHandoff, createApprovalRecord } from "../src/domain/automation";
import { buildAutomationRunbook } from "../src/domain/automationRunbook";
import {
  buildExecutorEvidenceBundle,
  runExecutorHandoff
} from "../src/domain/executorRunner";
import { runCabinetMission } from "../src/domain/orchestrator";
import { evaluateSandboxAction } from "../src/domain/sandboxPolicy";
import { buildSandboxCapabilityRegistry } from "../src/domain/sandboxCapabilities";
import type {
  AutomationAction,
  AutomationActionStatus,
  CabinetRun,
  CabinetStageId,
  ExecutorEvidenceBundle,
  ExecutorProfileId,
  ExecutorRun,
  RiskLevel
} from "../src/domain/types";

interface ExecutorContractDrillOptions {
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

interface DrillActionTemplate {
  profileId: ExecutorProfileId;
  stageId: CabinetStageId;
  roleId: string;
  title: string;
  action: string;
  target: string;
  riskLevel: RiskLevel;
}

interface ProfileDrillResult {
  profileId: ExecutorProfileId;
  readyActionId: string;
  runbookCommand: string;
  runnerId: string;
  evidenceKinds: string[];
  evidenceItems: number;
  replayable: boolean;
  output: string;
  failures: string[];
}

interface ExecutorContractDrillSummary {
  schema: "naikaku.executor-contract-drill.v1";
  generatedAt: string;
  outputDir: string;
  runId: string;
  mode: "dry-run";
  profiles: ProfileDrillResult[];
  blockedAction: {
    actionId: string;
    action: string;
    status: AutomationActionStatus;
    held: boolean;
    executed: boolean;
    reason: string;
  };
  summary: {
    profiles: number;
    passed: number;
    failed: number;
    readyActions: number;
    heldActions: number;
    runbookSteps: number;
    executorSteps: number;
    evidenceItems: number;
    replayableSteps: number;
    approvalRecords: number;
    capabilityCards: number;
  };
  checks: {
    allProfilesCovered: boolean;
    allReadyProfilesExecuted: boolean;
    blockedActionHeld: boolean;
    noProductionExecution: boolean;
    dryRunOnly: boolean;
    evidenceReplayable: boolean;
    noSecretLeakage: boolean;
  };
  honestyClaim: {
    level: "local-drill";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

const profileTemplates: DrillActionTemplate[] = [
  {
    profileId: "browser-sandbox",
    stageId: "critique",
    roleId: "critic",
    title: "Open approved documentation in browser sandbox",
    action: "open_url",
    target: "https://docs.openai.com",
    riskLevel: "low"
  },
  {
    profileId: "desktop-vm",
    stageId: "execution",
    roleId: "sandbox-operator",
    title: "Open disposable desktop app",
    action: "open_app",
    target: "vm://desktop/app",
    riskLevel: "medium"
  },
  {
    profileId: "shell-container",
    stageId: "execution",
    roleId: "execution-minister",
    title: "Run bounded test command in shell container",
    action: "run_shell",
    target: "/workspace:npm run test",
    riskLevel: "high"
  },
  {
    profileId: "mcp-proxy",
    stageId: "scoring",
    roleId: "scoring-office",
    title: "Call scoped MCP issue tool",
    action: "call_mcp_tool",
    target: "mcp://github/issues",
    riskLevel: "high"
  },
  {
    profileId: "human-approval",
    stageId: "intake",
    roleId: "prime-minister",
    title: "Request exact payload approval",
    action: "request_approval",
    target: "human://mission-owner/approval",
    riskLevel: "medium"
  }
];

const blockedTemplate: DrillActionTemplate = {
  profileId: "human-approval",
  stageId: "supervision",
  roleId: "safety-auditor",
  title: "Attempt blocked production deploy",
  action: "deploy_production",
  target: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system/actions",
  riskLevel: "critical"
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativeOutputDir(outputDir);
  const run = buildContractRun(options.generatedAt);
  const approvalRecords = (run.automationActions || [])
    .filter((action) => action.status === "needs-approval")
    .map((action, index) =>
      createApprovalRecord({
        action,
        decision: "approved",
        decidedAt: addSeconds(options.generatedAt, index + 1),
        decidedBy: "executor-contract-drill",
        reason: "Executor contract drill approval for a synthetic dry-run action."
      })
    );
  const handoff = buildExecutorHandoff({
    run,
    approvalRecords,
    createdAt: addSeconds(options.generatedAt, 10)
  });
  const runbook = buildAutomationRunbook({
    run,
    approvalRecords,
    generatedAt: addSeconds(options.generatedAt, 11)
  });
  const executorRun = runExecutorHandoff({
    handoff,
    startedAt: addSeconds(options.generatedAt, 12)
  });
  const evidenceBundle = buildExecutorEvidenceBundle({
    executorRun,
    exportedAt: addSeconds(options.generatedAt, 20)
  });
  const capabilityRegistry = buildSandboxCapabilityRegistry({
    profiles: executorProfiles,
    roles: defaultRoles,
    sandboxPolicy: defaultSandboxPolicy,
    generatedAt: options.generatedAt
  });
  const summary = buildSummary({
    outputRelativeDir,
    generatedAt: options.generatedAt,
    run,
    handoff,
    runbook,
    executorRun,
    evidenceBundle,
    capabilityCards: capabilityRegistry.cards.length,
    approvalRecords: approvalRecords.length
  });

  await mkdir(outputDir, { recursive: true });
  await writeJson(path.join(outputDir, "capability-registry.json"), capabilityRegistry);
  await writeJson(path.join(outputDir, "automation-runbook.json"), runbook);
  await writeJson(path.join(outputDir, "executor-run.json"), executorRun);
  await writeJson(path.join(outputDir, "executor-evidence.json"), evidenceBundle);
  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary));

  printSummary(summary);

  if (summary.summary.failed > 0 || Object.values(summary.checks).some((check) => !check)) {
    process.exitCode = 1;
  }
}

function buildContractRun(generatedAt: string): CabinetRun {
  const baseRun = runCabinetMission({
    mission: defaultMission,
    roles: defaultRoles,
    sandboxPolicy: defaultSandboxPolicy
  });
  const runId = `run-executor-contract-${generatedAt.replace(/[^a-z0-9]/gi, "-")}`;
  const automationActions = [...profileTemplates, blockedTemplate].map((template, index) =>
    templateToAction({
      template,
      runId,
      index
    })
  );

  return {
    ...baseRun,
    id: runId,
    startedAt: generatedAt,
    completedAt: generatedAt,
    automationActions
  };
}

function templateToAction({
  template,
  runId,
  index
}: {
  template: DrillActionTemplate;
  runId: string;
  index: number;
}): AutomationAction {
  const decision = evaluateSandboxAction(
    {
      executorProfileId: template.profileId,
      action: template.action,
      target: template.target,
      risk: template.riskLevel
    },
    defaultSandboxPolicy
  );
  const status = actionStatus(decision.allowed, decision.approvalRequired);

  return {
    id: `${runId}-contract-${String(index + 1).padStart(2, "0")}-${template.profileId}`,
    runId,
    stageId: template.stageId,
    roleId: template.roleId,
    executorProfileId: template.profileId,
    title: template.title,
    action: template.action,
    target: template.target,
    riskLevel: template.riskLevel,
    status,
    approvalRequired: status === "needs-approval",
    reason: decision.reason,
    auditTags: [...decision.auditTags, "executor-contract-drill"]
  };
}

function buildSummary({
  outputRelativeDir,
  generatedAt,
  run,
  handoff,
  runbook,
  executorRun,
  evidenceBundle,
  capabilityCards,
  approvalRecords
}: {
  outputRelativeDir: string;
  generatedAt: string;
  run: CabinetRun;
  handoff: ReturnType<typeof buildExecutorHandoff>;
  runbook: ReturnType<typeof buildAutomationRunbook>;
  executorRun: ExecutorRun;
  evidenceBundle: ExecutorEvidenceBundle;
  capabilityCards: number;
  approvalRecords: number;
}): ExecutorContractDrillSummary {
  const profileResults = profileTemplates.map((template) =>
    profileResult({
      profileId: template.profileId,
      handoff,
      runbook,
      executorRun
    })
  );
  const blockedAction = (run.automationActions || []).find((action) => action.action === blockedTemplate.action);
  if (!blockedAction) {
    throw new Error("Executor contract drill blocked action was not generated.");
  }
  const blockedExecuted = executorRun.steps.some((step) => step.actionId === blockedAction.id);
  const serializedEvidence = JSON.stringify(evidenceBundle);
  const checks = {
    allProfilesCovered: profileResults.length === executorProfiles.length && profileResults.every((item) => item.failures.length === 0),
    allReadyProfilesExecuted: executorRun.steps.length === profileTemplates.length,
    blockedActionHeld: handoff.heldActions.some((action) => action.id === blockedAction.id) && !blockedExecuted,
    noProductionExecution: blockedAction.status === "blocked" && !blockedExecuted,
    dryRunOnly: executorRun.mode === "dry-run" && evidenceBundle.mode === "dry-run" && executorRun.steps.every((step) => step.status === "simulated"),
    evidenceReplayable: evidenceBundle.summary.replayableSteps === evidenceBundle.summary.steps && executorRun.steps.every((step) => step.replayable),
    noSecretLeakage: !/sessionSecret|gho_|sk-|BEGIN PRIVATE KEY/i.test(serializedEvidence)
  };

  return {
    schema: "naikaku.executor-contract-drill.v1",
    generatedAt,
    outputDir: outputRelativeDir,
    runId: run.id,
    mode: "dry-run",
    profiles: profileResults,
    blockedAction: {
      actionId: blockedAction.id,
      action: blockedAction.action,
      status: blockedAction.status,
      held: handoff.heldActions.some((action) => action.id === blockedAction.id),
      executed: blockedExecuted,
      reason: blockedAction.reason
    },
    summary: {
      profiles: profileResults.length,
      passed: profileResults.filter((item) => item.failures.length === 0).length,
      failed: profileResults.filter((item) => item.failures.length > 0).length,
      readyActions: handoff.readyActions.length,
      heldActions: handoff.heldActions.length,
      runbookSteps: runbook.steps.length,
      executorSteps: executorRun.steps.length,
      evidenceItems: evidenceBundle.summary.evidenceItems,
      replayableSteps: evidenceBundle.summary.replayableSteps,
      approvalRecords,
      capabilityCards
    },
    checks,
    honestyClaim: {
      level: "local-drill",
      claim: "This drill verifies that every executor profile can pass through handoff, runbook, dry-run execution, and evidence export while blocked production actions remain held.",
      limitations: [
        "It does not control a real browser, desktop, shell, MCP server, or production approval system.",
        "It uses synthetic local actions to cover every executor profile.",
        "It proves runner contracts and dry-run evidence shape, not production runner readiness."
      ],
      productionRequirements: [
        "Attach authenticated runner identity for each real executor service.",
        "Replace dry-run placeholders with real screenshots, terminal transcripts, artifact manifests, and MCP request logs.",
        "Keep production deploys blocked until production-mode release verification and explicit operator approval are attached."
      ]
    }
  };
}

function profileResult({
  profileId,
  handoff,
  runbook,
  executorRun
}: {
  profileId: ExecutorProfileId;
  handoff: ReturnType<typeof buildExecutorHandoff>;
  runbook: ReturnType<typeof buildAutomationRunbook>;
  executorRun: ExecutorRun;
}): ProfileDrillResult {
  const readyAction = handoff.readyActions.find((action) => action.executorProfileId === profileId);
  const runbookStep = runbook.steps.find((step) => step.executorProfileId === profileId);
  const executorStep = executorRun.steps.find((step) => step.executorProfileId === profileId);
  const evidenceKinds = executorStep?.evidence.map((item) => item.kind) || [];
  const failures: string[] = [];

  if (!readyAction) failures.push("missing-ready-action");
  if (!runbookStep) failures.push("missing-runbook-step");
  if (!executorStep) failures.push("missing-executor-step");
  if (executorStep && executorStep.status !== "simulated") failures.push("not-simulated");
  if (executorStep && !executorStep.runnerId.endsWith(".dry-run")) failures.push("runner-not-dry-run");
  if (executorStep && !executorStep.evidenceHash.startsWith("fnv1a-")) failures.push("missing-evidence-hash");
  if (executorStep && !executorStep.replayable) failures.push("not-replayable");
  if (runbookStep && !runbookStep.command.includes("sandbox.") && !runbookStep.command.includes("approval.")) {
    failures.push("runner-command-not-scoped");
  }
  if (runbookStep && !runbookStep.verification.some((gate) => gate.includes("secrets"))) {
    failures.push("missing-secret-verification");
  }
  profileSpecificFailures(profileId, evidenceKinds, executorStep?.output || "").forEach((failure) => failures.push(failure));

  return {
    profileId,
    readyActionId: readyAction?.id || "",
    runbookCommand: runbookStep?.command || "",
    runnerId: executorStep?.runnerId || "",
    evidenceKinds,
    evidenceItems: executorStep?.evidence.length || 0,
    replayable: Boolean(executorStep?.replayable),
    output: executorStep?.output || "",
    failures
  };
}

function profileSpecificFailures(
  profileId: ExecutorProfileId,
  evidenceKinds: string[],
  output: string
) {
  const failures: string[] = [];
  const has = (kind: string) => evidenceKinds.includes(kind);

  if (profileId === "browser-sandbox" && (!has("screenshot") || !has("network"))) {
    failures.push("browser-evidence-incomplete");
  }
  if (profileId === "desktop-vm" && (!has("screenshot") || !has("transcript") || !output.includes("disposable"))) {
    failures.push("desktop-evidence-incomplete");
  }
  if (profileId === "shell-container" && (!has("transcript") || !has("artifact") || !output.includes("without executing"))) {
    failures.push("shell-evidence-incomplete");
  }
  if (profileId === "mcp-proxy" && (!has("artifact") || !has("transcript"))) {
    failures.push("mcp-evidence-incomplete");
  }
  if (profileId === "human-approval" && !has("approval")) {
    failures.push("approval-evidence-incomplete");
  }

  return failures;
}

function actionStatus(
  allowed: boolean,
  approvalRequired: boolean
): AutomationActionStatus {
  if (!allowed) return "blocked";
  return approvalRequired ? "needs-approval" : "allowed";
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function summaryMarkdown(summary: ExecutorContractDrillSummary) {
  return [
    "# Executor Contract Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Run: ${summary.runId}`,
    `Mode: ${summary.mode}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Summary",
    "",
    `- Profiles: ${summary.summary.profiles}`,
    `- Passed: ${summary.summary.passed}`,
    `- Failed: ${summary.summary.failed}`,
    `- Ready actions: ${summary.summary.readyActions}`,
    `- Held actions: ${summary.summary.heldActions}`,
    `- Runbook steps: ${summary.summary.runbookSteps}`,
    `- Executor steps: ${summary.summary.executorSteps}`,
    `- Evidence items: ${summary.summary.evidenceItems}`,
    `- Replayable steps: ${summary.summary.replayableSteps}`,
    "",
    "## Profile Results",
    "",
    ...summary.profiles.flatMap((item) => [
      `### ${item.profileId}`,
      "",
      `- Ready action: ${item.readyActionId}`,
      `- Runner: ${item.runnerId}`,
      `- Command: \`${item.runbookCommand}\``,
      `- Evidence kinds: ${item.evidenceKinds.join(", ")}`,
      `- Replayable: ${item.replayable ? "yes" : "no"}`,
      `- Failures: ${item.failures.length ? item.failures.join(", ") : "none"}`,
      ""
    ]),
    "## Blocked Action",
    "",
    `- Action: ${summary.blockedAction.action}`,
    `- Status: ${summary.blockedAction.status}`,
    `- Held: ${summary.blockedAction.held ? "yes" : "no"}`,
    `- Executed: ${summary.blockedAction.executed ? "yes" : "no"}`,
    `- Reason: ${summary.blockedAction.reason}`,
    "",
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function addSeconds(iso: string, seconds: number) {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

function relativeOutputDir(outputDir: string) {
  const relative = path.relative(process.cwd(), outputDir);
  return relative && !relative.startsWith("..") ? relative : outputDir;
}

function parseArgs(args: string[]): ExecutorContractDrillOptions {
  const options: ExecutorContractDrillOptions = {
    outputDir: "output/executor-contract-drill",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: npm run executor:drill -- [options]

Options:
  --out <dir>             Output directory. Default: output/executor-contract-drill
  --generated-at <iso>    Stable generatedAt timestamp.
  -h, --help              Show this help.

The drill covers Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and
Human Approval Gate with dry-run handoff, runbook, and evidence exports.`);
}

function printSummary(summary: ExecutorContractDrillSummary) {
  const failed = summary.summary.failed || Object.values(summary.checks).some((check) => !check);
  console.log("Executor contract drill:", failed ? "failed" : "passed");
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Profiles: ${summary.summary.passed}/${summary.summary.profiles} passed`);
  console.log(
    `Ready: ${summary.summary.readyActions}, held: ${summary.summary.heldActions}, evidence: ${summary.summary.evidenceItems}`
  );
  for (const item of summary.profiles) {
    const status = item.failures.length ? "fail" : "pass";
    console.log(
      `[${status}] ${item.profileId}: ${item.evidenceItems} evidence items, runner ${item.runnerId}` +
      (item.failures.length ? `, failures: ${item.failures.join(", ")}` : "")
    );
  }
  console.log(
    `Blocked action: ${summary.blockedAction.action} / held=${summary.blockedAction.held} / executed=${summary.blockedAction.executed}`
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown executor contract drill failure.");
  process.exitCode = 1;
});
