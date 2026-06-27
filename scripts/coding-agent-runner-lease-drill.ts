import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCodingAgentRunnerLeaseLedger,
  claimCodingAgentRunnerLease,
  serializeCodingAgentRunnerLeaseLedgerMarkdown
} from "../src/domain/codingAgentRunnerLease";
import type {
  CodingAgentRunnerLeaseDrillSummary,
  CodingAgentRunnerLeaseLedger,
  CodingAgentRunnerSelfTest,
  ExecutorProfileId
} from "../src/domain/types";

interface RunnerLeaseOptions {
  selfTestDir: string;
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

const leaseTtlMs = 60_000;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const selfTestDir = path.resolve(options.selfTestDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const validSelfTest = await loadSelfTest(path.join(selfTestDir, "valid", "runner-self-test.json"));
  const productionHeldSelfTest = await loadSelfTest(path.join(selfTestDir, "production-held", "runner-self-test.json"));
  const valid = await runValidCase({
    selfTest: validSelfTest,
    outputDir,
    generatedAt: options.generatedAt
  });
  const productionHeld = await runProductionHeldCase({
    selfTest: productionHeldSelfTest,
    outputDir,
    generatedAt: options.generatedAt
  });

  const summary: CodingAgentRunnerLeaseDrillSummary = {
    schema: "naikaku.coding-agent-runner-lease-drill.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: valid.operatorLocale,
    source: {
      runnerSelfTestDecision: validSelfTest.decision,
      wouldRun: validSelfTest.summary.wouldRun,
      notExecutedCommands: validSelfTest.summary.notExecutedCommands,
      receiptDraftPaths: validSelfTest.summary.receiptDraftPaths
    },
    valid: validSummary(valid),
    productionHeld: {
      decision: productionHeld.decision,
      availableTasks: productionHeld.summary.availableTasks,
      activeLeases: productionHeld.summary.activeLeases,
      heldTasks: productionHeld.summary.heldTasks,
      attempts: productionHeld.summary.attempts,
      deniedAttempts: productionHeld.summary.deniedAttempts
    },
    checks: checksFor({
      valid,
      productionHeld,
      validSelfTest,
      productionHeldSelfTest
    }),
    honestyClaim: {
      level: "runner-task-lease",
      claim: "This drill self-simulates exclusive runner task leasing, duplicate-claim blocking, expiry reclaim, and profile-scope rejection before sandbox command execution.",
      limitations: [
        "It reads local runner self-test files and writes lease ledgers only.",
        "It does not run shell commands, read prompt contents, edit files, browse, control desktops, call MCP tools, call providers, commit, push, deploy, or claim implementation completion.",
        "A lease-ready decision proves queue ownership behavior only; completed work still requires governed runner receipts and artifact audits."
      ],
      productionRequirements: [
        "Persist lease ledgers in the local gateway before production runner fleets attach.",
        "Use authenticated runner identity and executor profile scope for every lease claim.",
        "Require completed receipts, transcripts, changed-file summaries, and artifact audits before accepting implementation work."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

async function runValidCase({
  selfTest,
  outputDir,
  generatedAt
}: {
  selfTest: CodingAgentRunnerSelfTest;
  outputDir: string;
  generatedAt: string;
}) {
  const caseDir = path.join(outputDir, "valid");
  const firstTask = selfTest.items.find((item) => item.selfTestStatus === "would-run");
  let ledger = buildCodingAgentRunnerLeaseLedger({
    selfTest,
    generatedAt,
    leaseTtlMs
  });

  if (firstTask) {
    const allowedProfile = firstTask.executorProfileId;
    ledger = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-alpha",
      allowedExecutorProfiles: [allowedProfile],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: addMs(generatedAt, 1_000)
    });
    ledger = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-alpha",
      allowedExecutorProfiles: [allowedProfile],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: addMs(generatedAt, 2_000)
    });
    ledger = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-beta",
      allowedExecutorProfiles: [allowedProfile],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: addMs(generatedAt, 3_000)
    });
    ledger = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-wrong-profile",
      allowedExecutorProfiles: [otherProfile(allowedProfile)],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: addMs(generatedAt, 4_000)
    });
    ledger = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-beta",
      allowedExecutorProfiles: [allowedProfile],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: addMs(generatedAt, leaseTtlMs + 5_000)
    });
  }

  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "runner-lease-ledger.json"), ledger);
  await writeFile(
    path.join(caseDir, "runner-lease-ledger.md"),
    serializeCodingAgentRunnerLeaseLedgerMarkdown(ledger),
    "utf8"
  );

  return ledger;
}

async function runProductionHeldCase({
  selfTest,
  outputDir,
  generatedAt
}: {
  selfTest: CodingAgentRunnerSelfTest;
  outputDir: string;
  generatedAt: string;
}) {
  const caseDir = path.join(outputDir, "production-held");
  let ledger = buildCodingAgentRunnerLeaseLedger({
    selfTest,
    generatedAt,
    leaseTtlMs
  });
  ledger = claimCodingAgentRunnerLease({
    ledger,
    runnerId: "runner-alpha",
    allowedExecutorProfiles: ["shell-container"],
    attemptedAt: addMs(generatedAt, 1_000)
  });

  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "runner-lease-ledger.json"), ledger);
  await writeFile(
    path.join(caseDir, "runner-lease-ledger.md"),
    serializeCodingAgentRunnerLeaseLedgerMarkdown(ledger),
    "utf8"
  );

  return ledger;
}

async function loadSelfTest(filePath: string): Promise<CodingAgentRunnerSelfTest> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as CodingAgentRunnerSelfTest;
  if (parsed.schema !== "naikaku.coding-agent-runner-self-test.v1") {
    throw new Error(`Runner self-test must use schema naikaku.coding-agent-runner-self-test.v1: ${filePath}`);
  }
  return parsed;
}

function validSummary(ledger: CodingAgentRunnerLeaseLedger): CodingAgentRunnerLeaseDrillSummary["valid"] {
  const firstLease = ledger.leases[0];
  const activeLease = ledger.leases.find((lease) => lease.status === "active") || null;

  return {
    decision: ledger.decision,
    total: ledger.summary.total,
    availableTasks: ledger.summary.availableTasks,
    activeLeases: ledger.summary.activeLeases,
    expiredLeases: ledger.summary.expiredLeases,
    attempts: ledger.summary.attempts,
    grantedAttempts: ledger.summary.grantedAttempts,
    idempotentClaims: ledger.summary.idempotentClaims,
    reclaimedLeases: ledger.summary.reclaimedLeases,
    deniedAttempts: ledger.summary.deniedAttempts,
    duplicateBlocks: ledger.summary.duplicateBlocks,
    profileDeniedAttempts: ledger.summary.profileDeniedAttempts,
    firstLeaseSessionId: firstLease?.sessionId || null,
    firstLeaseRunnerId: firstLease?.runnerId || null,
    reclaimedRunnerId: activeLease?.runnerId || null
  };
}

function checksFor({
  valid,
  productionHeld,
  validSelfTest,
  productionHeldSelfTest
}: {
  valid: CodingAgentRunnerLeaseLedger;
  productionHeld: CodingAgentRunnerLeaseLedger;
  validSelfTest: CodingAgentRunnerSelfTest;
  productionHeldSelfTest: CodingAgentRunnerSelfTest;
}) {
  return {
    validLeaseReady:
      valid.decision === "lease-ready" &&
      validSelfTest.decision === "self-test-ready" &&
      valid.summary.total === validSelfTest.items.length,
    firstLeaseGranted:
      valid.attempts[0]?.decision === "leased" &&
      valid.leases[0]?.runnerId === "runner-alpha",
    sameRunnerClaimIdempotent:
      valid.attempts[1]?.decision === "already-leased" &&
      valid.attempts[1]?.leaseId === valid.leases[0]?.leaseId,
    duplicateRunnerBlocked:
      valid.attempts[2]?.decision === "denied" &&
      valid.summary.duplicateBlocks === 1,
    profileMismatchDenied:
      valid.attempts[3]?.decision === "denied" &&
      valid.summary.profileDeniedAttempts === 1,
    expiredLeaseReclaimed:
      valid.attempts[4]?.decision === "reclaimed" &&
      valid.summary.expiredLeases === 1 &&
      valid.summary.activeLeases === 1 &&
      valid.leases.some((lease) => lease.runnerId === "runner-alpha" && lease.status === "expired") &&
      valid.leases.some((lease) => lease.runnerId === "runner-beta" && lease.status === "active"),
    productionHeldNoLeases:
      productionHeldSelfTest.decision === "needs-review" &&
      productionHeld.decision === "needs-review" &&
      productionHeld.summary.availableTasks === 0 &&
      productionHeld.summary.activeLeases === 0 &&
      productionHeld.summary.heldTasks === productionHeldSelfTest.items.length,
    productionHeldClaimDenied:
      productionHeld.summary.attempts === 1 &&
      productionHeld.attempts[0]?.decision === "no-task" &&
      productionHeld.summary.deniedAttempts === 1,
    commandsStillNotExecuted:
      validSelfTest.summary.notExecutedCommands === validSelfTest.summary.pendingCommands &&
      validSelfTest.items.every((item) =>
        item.commands.every((command) => command.status === "not-executed" && command.exitCode === null)
      ),
    noImplementationClaim:
      valid.honestyClaim.limitations.some((limitation) => limitation.includes("does not read prompt contents")) &&
      valid.honestyClaim.claim.includes("without running commands")
  };
}

function summaryMarkdown(summary: CodingAgentRunnerLeaseDrillSummary) {
  return [
    "# Coding Agent Runner Lease Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Valid Lease Probe",
    "",
    `- Decision: ${summary.valid.decision}`,
    `- Active leases: ${summary.valid.activeLeases}`,
    `- Expired leases: ${summary.valid.expiredLeases}`,
    `- Attempts: ${summary.valid.attempts}`,
    `- Granted attempts: ${summary.valid.grantedAttempts}`,
    `- Idempotent claims: ${summary.valid.idempotentClaims}`,
    `- Reclaimed leases: ${summary.valid.reclaimedLeases}`,
    `- Duplicate blocks: ${summary.valid.duplicateBlocks}`,
    `- Profile denied attempts: ${summary.valid.profileDeniedAttempts}`,
    "",
    "## Production-Held Lease Probe",
    "",
    `- Decision: ${summary.productionHeld.decision}`,
    `- Available tasks: ${summary.productionHeld.availableTasks}`,
    `- Active leases: ${summary.productionHeld.activeLeases}`,
    `- Held tasks: ${summary.productionHeld.heldTasks}`,
    `- Denied attempts: ${summary.productionHeld.deniedAttempts}`,
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function parseArgs(args: string[]): RunnerLeaseOptions {
  const options: RunnerLeaseOptions = {
    selfTestDir: "output/coding-agent-runner-self-test",
    outputDir: "output/coding-agent-runner-lease",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--self-test-dir") {
      options.selfTestDir = requireValue(args, index, arg);
      index += 1;
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

function addMs(iso: string, ms: number) {
  return new Date(Date.parse(iso) + ms).toISOString();
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function otherProfile(profile: ExecutorProfileId): ExecutorProfileId {
  return profile === "shell-container" ? "browser-sandbox" : "shell-container";
}

function printSummary(summary: CodingAgentRunnerLeaseDrillSummary) {
  console.log(`Coding agent runner lease drill: ${Object.values(summary.checks).every(Boolean) ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Valid: ${summary.valid.decision}, active leases ${summary.valid.activeLeases}, expired leases ${summary.valid.expiredLeases}, attempts ${summary.valid.attempts}`);
  console.log(`Production-held: ${summary.productionHeld.decision}, active leases ${summary.productionHeld.activeLeases}, denied attempts ${summary.productionHeld.deniedAttempts}`);
  console.log(`Checks: ${Object.values(summary.checks).filter(Boolean).length} pass, ${Object.values(summary.checks).filter((value) => !value).length} fail`);
}

function printHelp() {
  console.log(`Naikaku coding-agent runner lease drill

Usage:
  npm run coding-agent:runner-lease -- [options]

Options:
  --self-test-dir <path>  Directory containing valid/ and production-held/ runner-self-test.json files.
  --out <path>            Output directory for lease ledgers and summary.
  --generated-at <iso>    Use a stable generatedAt timestamp.
  --help                  Show this help.

Exit codes:
  0  Lease drill checks passed.
  1  One or more lease drill checks failed.
`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent runner lease drill failure.");
  process.exitCode = 1;
});
