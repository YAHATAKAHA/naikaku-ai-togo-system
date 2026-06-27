import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultRoles, defaultSandboxPolicy, executorProfiles } from "../src/data/defaultCabinet";
import { buildSandboxCapabilityRegistry, serializeSandboxCapabilityRegistry } from "../src/domain/sandboxCapabilities";
import type {
  SandboxCapabilityCard,
  SandboxCapabilityDrillSummary,
  SandboxCapabilityRegistry
} from "../src/domain/types";

interface SandboxCapabilityDrillOptions {
  outDir: string;
  generatedAt?: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const generatedAt = options.generatedAt || new Date().toISOString();
  const valid = buildSandboxCapabilityRegistry({
    profiles: executorProfiles,
    roles: defaultRoles,
    sandboxPolicy: defaultSandboxPolicy,
    generatedAt
  });
  const killSwitchOpen = buildSandboxCapabilityRegistry({
    profiles: executorProfiles,
    roles: defaultRoles,
    sandboxPolicy: {
      ...defaultSandboxPolicy,
      killSwitchArmed: false
    },
    generatedAt
  });
  const summary = buildSummary({
    valid,
    killSwitchOpen,
    outputDir: options.outDir,
    generatedAt
  });

  await writeOutputs(options.outDir, valid, killSwitchOpen, summary);
  printSummary(summary);

  if (Object.values(summary.checks).some((passed) => !passed)) {
    process.exitCode = 2;
  }
}

function buildSummary({
  valid,
  killSwitchOpen,
  outputDir,
  generatedAt
}: {
  valid: SandboxCapabilityRegistry;
  killSwitchOpen: SandboxCapabilityRegistry;
  outputDir: string;
  generatedAt: string;
}): SandboxCapabilityDrillSummary {
  const profiles = valid.cards.map(profileSummary);
  const checks = {
    schemaStable: valid.schema === "naikaku.sandbox-capabilities.v1",
    allProfilesCovered: valid.summary.profiles === executorProfiles.length &&
      valid.summary.rolesCovered === defaultRoles.length,
    readinessChecksStable: valid.summary.readinessChecks === executorProfiles.length * 5 &&
      valid.cards.every((card) => card.runnerReadiness.checks.length === 5),
    approvalsVisible: valid.summary.requiredApprovals > 0 &&
      valid.cards.some((card) => card.runnerReadiness.requiredApprovals.length > 0),
    blockedReasonsVisible: valid.summary.blockedActions > 0 &&
      valid.cards.some((card) => card.runnerReadiness.blockedReasons.length > 0),
    evidenceArtifactsStable: valid.summary.evidenceArtifacts === 15 &&
      valid.cards.every((card) => card.runnerReadiness.supportedEvidenceArtifacts.length > 0),
    killSwitchBlocksAllProfiles: !killSwitchOpen.summary.killSwitchArmed &&
      killSwitchOpen.summary.blocked === executorProfiles.length &&
      killSwitchOpen.cards.every((card) =>
        card.status === "blocked" &&
        card.runnerReadiness.checks.some((check) => check.id === "kill-switch" && check.status === "block")
      ),
    noSecretLeakage: !serializeSandboxCapabilityRegistry(valid).includes("sessionSecret") &&
      !serializeSandboxCapabilityRegistry(killSwitchOpen).includes("sessionSecret"),
    noProfileFailures: profiles.every((profile) => profile.failures.length === 0)
  };

  return {
    schema: "naikaku.sandbox-capability-drill.v1",
    generatedAt,
    outputDir,
    valid: {
      schema: valid.schema,
      profiles: valid.summary.profiles,
      rolesCovered: valid.summary.rolesCovered,
      dryRunReady: valid.summary.dryRunReady,
      needsApproval: valid.summary.needsApproval,
      blocked: valid.summary.blocked,
      approvalActions: valid.summary.approvalActions,
      blockedActions: valid.summary.blockedActions,
      readinessChecks: valid.summary.readinessChecks,
      passedReadinessChecks: valid.summary.passedReadinessChecks,
      warningReadinessChecks: valid.summary.warningReadinessChecks,
      blockedReadinessChecks: valid.summary.blockedReadinessChecks,
      requiredApprovals: valid.summary.requiredApprovals,
      evidenceArtifacts: valid.summary.evidenceArtifacts,
      killSwitchArmed: valid.summary.killSwitchArmed
    },
    killSwitchOpen: {
      profiles: killSwitchOpen.summary.profiles,
      blocked: killSwitchOpen.summary.blocked,
      readinessChecks: killSwitchOpen.summary.readinessChecks,
      blockedReadinessChecks: killSwitchOpen.summary.blockedReadinessChecks,
      blockedActions: killSwitchOpen.summary.blockedActions,
      killSwitchArmed: killSwitchOpen.summary.killSwitchArmed
    },
    profiles,
    checks,
    honestyClaim: {
      level: "sandbox-capability-readiness-drill",
      claim: "This drill self-simulates sandbox capability readiness contracts and kill-switch behavior without executing runner actions.",
      limitations: [
        "It does not open browsers, control desktops, run shell commands, call MCP tools, call providers, or deploy.",
        "It reads deterministic default roles, executor profiles, and sandbox policy only.",
        "It proves registry contract shape and policy gating, not production runner behavior."
      ],
      productionRequirements: [
        "Attach authenticated runner evidence before claiming a real browser, desktop, shell, or MCP runner executed work.",
        "Keep exact approval records and required evidence artifacts attached to any live runner handoff.",
        "Run production verification before external release."
      ]
    }
  };
}

function profileSummary(card: SandboxCapabilityCard): SandboxCapabilityDrillSummary["profiles"][number] {
  const failures = [
    card.runnerReadiness.checks.length === 5 ? "" : "Expected five runner readiness checks.",
    card.runnerReadiness.supportedEvidenceArtifacts.length > 0 ? "" : "Expected supported evidence artifacts.",
    card.runnerReadiness.nextAction.trim().length > 0 ? "" : "Expected a runner readiness next action.",
    card.actions.length > 0 ? "" : "Expected representative actions."
  ].filter(Boolean);

  return {
    profileId: card.profileId,
    decision: card.runnerReadiness.decision,
    readinessChecks: card.runnerReadiness.checks.length,
    passedReadinessChecks: card.runnerReadiness.checks.filter((check) => check.status === "pass").length,
    warningReadinessChecks: card.runnerReadiness.checks.filter((check) => check.status === "warn").length,
    blockedReadinessChecks: card.runnerReadiness.checks.filter((check) => check.status === "block").length,
    requiredApprovals: card.runnerReadiness.requiredApprovals.length,
    blockedReasons: card.runnerReadiness.blockedReasons.length,
    evidenceArtifacts: card.runnerReadiness.supportedEvidenceArtifacts.length,
    failures
  };
}

async function writeOutputs(
  outDir: string,
  valid: SandboxCapabilityRegistry,
  killSwitchOpen: SandboxCapabilityRegistry,
  summary: SandboxCapabilityDrillSummary
) {
  const absoluteDir = path.resolve(outDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, "valid-registry.json"), `${serializeSandboxCapabilityRegistry(valid)}\n`, "utf8");
  await writeFile(path.join(absoluteDir, "kill-switch-open-registry.json"), `${serializeSandboxCapabilityRegistry(killSwitchOpen)}\n`, "utf8");
  await writeFile(path.join(absoluteDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(absoluteDir, "summary.md"), `${summaryMarkdown(summary)}\n`, "utf8");
}

function summaryMarkdown(summary: SandboxCapabilityDrillSummary) {
  return [
    "# Sandbox Capability Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Summary",
    "",
    `- Profiles: ${summary.valid.profiles}`,
    `- Roles covered: ${summary.valid.rolesCovered}`,
    `- Readiness checks: ${summary.valid.passedReadinessChecks} pass / ${summary.valid.warningReadinessChecks} warn / ${summary.valid.blockedReadinessChecks} block`,
    `- Required approvals: ${summary.valid.requiredApprovals}`,
    `- Evidence artifacts: ${summary.valid.evidenceArtifacts}`,
    `- Kill switch open blocked profiles: ${summary.killSwitchOpen.blocked}/${summary.killSwitchOpen.profiles}`,
    "",
    "## Profiles",
    "",
    ...summary.profiles.map((profile) =>
      `- ${profile.profileId}: ${profile.decision}, ${profile.readinessChecks} checks, ${profile.requiredApprovals} approvals, ${profile.blockedReasons} blocked reasons, ${profile.evidenceArtifacts} evidence artifacts`
    ),
    "",
    "## Claim",
    "",
    summary.honestyClaim.claim
  ].join("\n");
}

function printSummary(summary: SandboxCapabilityDrillSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Sandbox capability drill: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Profiles: ${summary.valid.profiles}, roles covered ${summary.valid.rolesCovered}`);
  console.log(`Readiness: ${summary.valid.passedReadinessChecks} pass, ${summary.valid.warningReadinessChecks} warn, ${summary.valid.blockedReadinessChecks} block`);
  console.log(`Approvals: ${summary.valid.requiredApprovals}, evidence artifacts: ${summary.valid.evidenceArtifacts}`);
  console.log(`Kill switch open blocked: ${summary.killSwitchOpen.blocked}/${summary.killSwitchOpen.profiles}`);
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): SandboxCapabilityDrillOptions {
  const options: SandboxCapabilityDrillOptions = {
    outDir: "output/sandbox-capability-drill",
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--out") {
      options.outDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
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

function printHelp() {
  console.log(`Naikaku sandbox capability drill

Usage:
  npm run sandbox:capabilities -- [options]

Options:
  --out <dir>          Write registry and summary artifacts.
  --generated-at <iso> Use a stable timestamp.
  --help              Show this help.

Exit codes:
  0  Sandbox capability readiness contracts passed.
  2  One or more readiness checks failed.
`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown sandbox capability drill failure.");
  process.exitCode = 1;
});
