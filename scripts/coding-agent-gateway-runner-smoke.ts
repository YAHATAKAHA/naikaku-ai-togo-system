import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "../src/domain/codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "../src/domain/codingAgentDispatchSimulation";
import {
  buildCodingAgentRunnerLeaseLedger,
  claimAvailableCodingAgentRunnerLeases
} from "../src/domain/codingAgentRunnerLease";
import { buildCodingAgentRunnerManifest } from "../src/domain/codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "../src/domain/codingAgentRunnerSelfTest";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import { executorProfiles } from "../src/data/defaultCabinet";
import type {
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentRunnerLeaseLedger,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerResult,
  CodingAgentSessionBundle,
  ExecutorProfileId
} from "../src/domain/types";

interface GatewayRunnerSmokeOptions {
  outputDir: string;
  generatedAt: string;
  locale: string;
  timeoutMs: number;
  help: boolean;
}

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
  raw: string;
}

interface GatewayRunnerSmokeSummary {
  schema: "naikaku.coding-agent-gateway-runner-smoke.v1";
  generatedAt: string;
  outputDir: string;
  operatorLocale: string;
  gatewayUrl: string;
  runnerId: string;
  authMode: string | null;
  source: {
    bundleDecision: string;
    selfTestDecision: string;
    wouldRun: number;
    pendingCommands: number;
  };
  cases: {
    healthStatus: number;
    preflightStatus: number;
    preflightDecision: string | null;
    noLeaseStatus: number;
    noLeaseMessage: string;
    unissuedLeaseStatus: number;
    unissuedLeaseMessage: string;
    unissuedSessionIds: string[];
    leaseClaimStatus: number;
    leaseDecision: string | null;
    activeLeases: number;
    sandboxRunnerStatus: number;
    sandboxRunnerDecision: string | null;
    sandboxRunnerExecutedTasks: number;
    sandboxRunnerProcessExecutions: number;
    sandboxRunnerCommandResults: number;
    leaseValidationOk: boolean | null;
    receiptReviewDecision: string | null;
    artifactAuditDecision: string | null;
    worktreeArtifactAuditStatus: number;
    worktreeArtifactAuditDecision: string | null;
    worktreeArtifactAuditChangedFiles: number;
  };
  checks: {
    healthOk: boolean;
    scopedRunnerAuthEnabled: boolean;
    preflightReady: boolean;
    missingLeaseBlocked: boolean;
    unissuedLeaseBlocked: boolean;
    gatewayLeaseClaimed: boolean;
    sandboxRunnerExecuted: boolean;
    leaseValidationReturned: boolean;
    receiptAndAuditVerified: boolean;
    worktreeArtifactAuditVerified: boolean;
  };
  honestyClaim: {
    level: "local-gateway-smoke";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const runnerId = "gateway-smoke-runner";
const runnerToken = "gateway-smoke-token";
const allExecutorProfiles = executorProfiles.map((profile) => profile.id) as ExecutorProfileId[];

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const port = await getAvailablePort();
  const gatewayUrl = `http://127.0.0.1:${port}`;
  const gateway = await startGateway({ port, timeoutMs: options.timeoutMs });
  const cleanupPaths: string[] = [];

  try {
    const { bundle, selfTest } = buildSmokeInputs({
      locale: options.locale,
      generatedAt: options.generatedAt,
      outputRelativeDir
    });
    const headers = runnerHeaders();
    const health = await getJson(`${gatewayUrl}/health`);
    const preflight = await postJson<CodingAgentSandboxRunnerPreflight>(
      `${gatewayUrl}/v1/development/coding-briefs/sandbox-runner/preflight`,
      { selfTest, bundle }
    );
    const noLease = await postJson(
      `${gatewayUrl}/v1/development/coding-briefs/sandbox-runner`,
      { selfTest, bundle, timeoutMs: options.timeoutMs },
      headers
    );
    const unissuedLedger = claimAvailableCodingAgentRunnerLeases({
      ledger: buildCodingAgentRunnerLeaseLedger({
        selfTest,
        generatedAt: options.generatedAt
      }),
      runnerId,
      allowedExecutorProfiles: allExecutorProfiles,
      attemptedAt: options.generatedAt
    });
    const unissued = await postJson(
      `${gatewayUrl}/v1/development/coding-briefs/sandbox-runner`,
      { selfTest, bundle, leaseLedger: unissuedLedger, timeoutMs: options.timeoutMs },
      headers
    );
    const leaseClaim = await postJson<CodingAgentRunnerLeaseLedger>(
      `${gatewayUrl}/v1/development/coding-briefs/runner-lease`,
      { selfTest },
      headers
    );
    const sandboxRunner = await postJson<CodingAgentSandboxRunnerResult>(
      `${gatewayUrl}/v1/development/coding-briefs/sandbox-runner`,
      { selfTest, bundle, leaseLedger: leaseClaim.body, timeoutMs: options.timeoutMs },
      headers
    );
    const worktreeEvidence = await buildWorktreeEvidenceFixture({
      outputRelativeDir,
      generatedAt: options.generatedAt,
      locale: options.locale,
      cleanupPaths
    });
    const worktreeArtifactAudit = await postJson<CodingAgentImplementationArtifactAudit>(
      `${gatewayUrl}/v1/development/coding-briefs/implementation-artifact-audit`,
      { evidence: worktreeEvidence }
    );

    const summary = buildSummary({
      options,
      outputRelativeDir,
      gatewayUrl,
      bundle,
      selfTest,
      health,
      preflight,
      noLease,
      unissued,
      leaseClaim,
      sandboxRunner,
      worktreeArtifactAudit
    });

    await writeJson(path.join(outputDir, "summary.json"), summary);
    await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

    printSummary(summary);

    if (!Object.values(summary.checks).every(Boolean)) {
      process.exitCode = 1;
    }
  } finally {
    await Promise.all(cleanupPaths.map((targetPath) => rm(targetPath, { force: true })));
    await stopGateway(gateway);
  }
}

function buildSmokeInputs({
  locale,
  generatedAt,
  outputRelativeDir
}: {
  locale: string;
  generatedAt: string;
  outputRelativeDir: string;
}) {
  const workspace = createDefaultWorkspace();
  const handoff = buildTeamHandoff({ workspace, generatedAt });
  const board = buildDevelopmentBoard({ handoff, generatedAt });
  const briefs = buildCodingAgentBriefs({
    board,
    operatorLocale: locale,
    generatedAt
  });
  const review = buildCodingAgentBriefReview({
    briefs,
    generatedAt
  });
  const bundle = buildCodingAgentSessionBundle({
    briefs,
    review,
    generatedAt
  });
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle, generatedAt }),
    generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest: dispatch,
    generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit,
    generatedAt
  });
  const manifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: Object.fromEntries(simulation.items.map((item, index) => [
      item.sessionId,
      `${outputRelativeDir}/receipt-drafts/${String(index + 1).padStart(2, "0")}-${safeFileName(item.sessionId)}.json`
    ])),
    generatedAt
  });
  const selfTest = buildCodingAgentRunnerSelfTest({
    manifest,
    generatedAt
  });

  return { bundle, selfTest };
}

async function buildWorktreeEvidenceFixture({
  outputRelativeDir,
  generatedAt,
  locale,
  cleanupPaths
}: {
  outputRelativeDir: string;
  generatedAt: string;
  locale: string;
  cleanupPaths: string[];
}): Promise<CodingAgentImplementationEvidence> {
  const changedFilePath = ".naikaku-gateway-smoke-worktree-probe.txt";
  const transcriptPath = `${outputRelativeDir}/worktree-artifact-audit/transcript.log`;
  const evidencePath = `${outputRelativeDir}/worktree-artifact-audit/evidence.txt`;

  cleanupPaths.push(changedFilePath);
  await mkdir(path.dirname(transcriptPath), { recursive: true });
  await writeFile(changedFilePath, `temporary gateway smoke worktree probe ${generatedAt}\n`, "utf8");
  await writeFile(transcriptPath, "command=npm run test\nexitCode=0\nresult=passed\n", "utf8");
  await writeFile(evidencePath, "Gateway smoke worktree artifact audit evidence.\n", "utf8");

  return {
    schema: "naikaku.coding-agent-implementation-evidence.v1",
    generatedAt,
    sourceSchema: "naikaku.coding-agent-session-receipt.v1",
    sourceDecision: "verified",
    decision: "accepted-for-handoff",
    operatorLocale: locale,
    items: [
      {
        sessionId: "gateway-smoke-worktree-session",
        sourceItemId: "gateway-smoke-worktree-item",
        title: "Gateway smoke worktree evidence",
        receiptStatus: "verified",
        accepted: true,
        changedFiles: [changedFilePath],
        commandResults: [
          {
            command: "npm run test",
            exitCode: 0,
            outputSummary: "Synthetic gateway smoke command passed.",
            transcriptRef: transcriptPath
          }
        ],
        evidence: [`Worktree evidence artifact: ${evidencePath}`],
        risks: ["Synthetic gateway smoke fixture only."],
        missing: [],
        nextAction: "Use this fixture only to prove gateway artifact audit can see Git worktree status."
      }
    ],
    summary: {
      total: 1,
      accepted: 1,
      needsEvidence: 0,
      blocked: 0,
      changedFiles: 1,
      commandResults: 1,
      failedCommands: 0,
      evidenceItems: 1,
      riskNotes: 1
    },
    honestyClaim: {
      level: "implementation-evidence-summary",
      claim: "Synthetic gateway smoke fixture for worktree artifact audit.",
      limitations: [
        "This fixture proves gateway worktree-status checking only.",
        "It is not implementation evidence for product backlog work."
      ],
      productionRequirements: [
        "Use real changed files, transcripts, and evidence artifacts from a governed runner workspace."
      ]
    }
  };
}

function buildSummary({
  options,
  outputRelativeDir,
  gatewayUrl,
  bundle,
  selfTest,
  health,
  preflight,
  noLease,
  unissued,
  leaseClaim,
  sandboxRunner,
  worktreeArtifactAudit
}: {
  options: GatewayRunnerSmokeOptions;
  outputRelativeDir: string;
  gatewayUrl: string;
  bundle: CodingAgentSessionBundle;
  selfTest: CodingAgentRunnerSelfTest;
  health: JsonResponse;
  preflight: JsonResponse<CodingAgentSandboxRunnerPreflight>;
  noLease: JsonResponse;
  unissued: JsonResponse;
  leaseClaim: JsonResponse<CodingAgentRunnerLeaseLedger>;
  sandboxRunner: JsonResponse<CodingAgentSandboxRunnerResult>;
  worktreeArtifactAudit: JsonResponse<CodingAgentImplementationArtifactAudit>;
}): GatewayRunnerSmokeSummary {
  const healthBody = asRecord(health.body);
  const runnerAuth = asRecord(healthBody.runnerAuth);
  const unissuedValidation = asRecord(asRecord(unissued.body).leaseValidation);
  const sandboxResult = sandboxRunner.body;
  const checks = {
    healthOk: health.status === 200 && healthBody.ok === true,
    scopedRunnerAuthEnabled: runnerAuth.mode === "scoped-credentials-required",
    preflightReady: preflight.status === 200 && preflight.body.decision === "ready",
    missingLeaseBlocked: noLease.status === 409 && messageOf(noLease).includes("active runner lease ledger"),
    unissuedLeaseBlocked: unissued.status === 409 &&
      messageOf(unissued).includes("not issued by this gateway") &&
      stringArray(unissuedValidation.unissuedSessionIds).length === preflight.body.summary.readyTasks,
    gatewayLeaseClaimed: leaseClaim.status === 200 &&
      leaseClaim.body.decision === "lease-ready" &&
      leaseClaim.body.summary.activeLeases === preflight.body.summary.readyTasks,
    sandboxRunnerExecuted: sandboxRunner.status === 200 &&
      sandboxResult.report.decision === "sandbox-runner-verified" &&
      sandboxResult.report.summary.executedTasks === preflight.body.summary.readyTasks &&
      sandboxResult.report.summary.processExecutions > 0,
    leaseValidationReturned: sandboxRunner.status === 200 &&
      sandboxResult.leaseValidation?.ok === true &&
      sandboxResult.leaseValidation.acceptedLeaseIds.length === preflight.body.summary.readyTasks,
    receiptAndAuditVerified: sandboxRunner.status === 200 &&
      sandboxResult.receiptReview.decision === "verified" &&
      sandboxResult.artifactAudit.decision === "verified",
    worktreeArtifactAuditVerified: worktreeArtifactAudit.status === 200 &&
      worktreeArtifactAudit.body.decision === "verified" &&
      worktreeArtifactAudit.body.summary.worktreeChangedFiles === 1 &&
      worktreeArtifactAudit.body.summary.worktreeUnchangedFiles === 0
  };

  return {
    schema: "naikaku.coding-agent-gateway-runner-smoke.v1",
    generatedAt: options.generatedAt,
    outputDir: outputRelativeDir,
    operatorLocale: options.locale,
    gatewayUrl,
    runnerId,
    authMode: typeof runnerAuth.mode === "string" ? runnerAuth.mode : null,
    source: {
      bundleDecision: bundle.decision,
      selfTestDecision: selfTest.decision,
      wouldRun: selfTest.summary.wouldRun,
      pendingCommands: selfTest.summary.pendingCommands
    },
    cases: {
      healthStatus: health.status,
      preflightStatus: preflight.status,
      preflightDecision: preflight.status === 200 ? preflight.body.decision : null,
      noLeaseStatus: noLease.status,
      noLeaseMessage: messageOf(noLease),
      unissuedLeaseStatus: unissued.status,
      unissuedLeaseMessage: messageOf(unissued),
      unissuedSessionIds: stringArray(unissuedValidation.unissuedSessionIds),
      leaseClaimStatus: leaseClaim.status,
      leaseDecision: leaseClaim.status === 200 ? leaseClaim.body.decision : null,
      activeLeases: leaseClaim.status === 200 ? leaseClaim.body.summary.activeLeases : 0,
      sandboxRunnerStatus: sandboxRunner.status,
      sandboxRunnerDecision: sandboxRunner.status === 200 ? sandboxResult.report.decision : null,
      sandboxRunnerExecutedTasks: sandboxRunner.status === 200 ? sandboxResult.report.summary.executedTasks : 0,
      sandboxRunnerProcessExecutions: sandboxRunner.status === 200 ? sandboxResult.report.summary.processExecutions : 0,
      sandboxRunnerCommandResults: sandboxRunner.status === 200 ? sandboxResult.report.summary.commandResults : 0,
      leaseValidationOk: sandboxRunner.status === 200 ? sandboxResult.leaseValidation?.ok ?? null : null,
      receiptReviewDecision: sandboxRunner.status === 200 ? sandboxResult.receiptReview.decision : null,
      artifactAuditDecision: sandboxRunner.status === 200 ? sandboxResult.artifactAudit.decision : null,
      worktreeArtifactAuditStatus: worktreeArtifactAudit.status,
      worktreeArtifactAuditDecision: worktreeArtifactAudit.status === 200 ? worktreeArtifactAudit.body.decision : null,
      worktreeArtifactAuditChangedFiles: worktreeArtifactAudit.status === 200
        ? worktreeArtifactAudit.body.summary.worktreeChangedFiles
        : 0
    },
    checks,
    honestyClaim: {
      level: "local-gateway-smoke",
      claim: "This smoke starts the local gateway, proves missing and unissued runner leases are blocked over HTTP, executes the gateway sandbox-runner route with a gateway-issued lease, and verifies gateway artifact audit can see a Git worktree change.",
      limitations: [
        "It runs against 127.0.0.1 only and uses synthetic scoped runner credentials.",
        "It executes the existing local sandbox-runner verification commands, but it does not ask a model to implement backlog work.",
        "It does not browse, control desktops, call MCP tools, call providers, deploy, commit, push, or claim production readiness."
      ],
      productionRequirements: [
        "Replace the in-memory gateway issuance registry with a durable lease store before multi-process runner fleets attach.",
        "Keep scoped runner credentials configured outside the browser and rotate them before live operation.",
        "Require completed receipts, artifact audits, and production-mode release verification before external handoff."
      ]
    }
  };
}

async function startGateway({
  port,
  timeoutMs
}: {
  port: number;
  timeoutMs: number;
}) {
  const logs: string[] = [];
  const child = spawn(npmCommand, ["run", "gateway"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NAIKAKU_GATEWAY_PORT: String(port),
      NAIKAKU_GATEWAY_HOST: "127.0.0.1",
      NAIKAKU_RUNNER_TOKEN: "",
      NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify([
        {
          runnerId,
          token: runnerToken,
          executorProfiles: ["*"],
          label: "Gateway smoke runner"
        }
      ])
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));

  await waitForGateway({
    child,
    logs,
    url: `http://127.0.0.1:${port}/health`,
    timeoutMs
  });

  return { child, logs };
}

async function waitForGateway({
  child,
  logs,
  url,
  timeoutMs
}: {
  child: ChildProcess;
  logs: string[];
  url: string;
  timeoutMs: number;
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < Math.min(timeoutMs, 30_000)) {
    if (child.exitCode !== null) {
      throw new Error(`Gateway exited early with code ${child.exitCode}.\n${logs.join("")}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the gateway accepts connections or the timeout expires.
    }

    await sleep(250);
  }

  throw new Error(`Gateway did not become healthy before timeout.\n${logs.join("")}`);
}

async function stopGateway(gateway: { child: ChildProcess; logs: string[] }) {
  if (gateway.child.exitCode !== null) return;

  gateway.child.kill("SIGTERM");
  const stopped = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 2_000);
    gateway.child.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });

  if (!stopped && gateway.child.exitCode === null) {
    gateway.child.kill("SIGKILL");
  }
}

async function getAvailablePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function getJson<T = unknown>(url: string): Promise<JsonResponse<T>> {
  const response = await fetch(url);
  const raw = await response.text();
  return {
    status: response.status,
    raw,
    body: raw ? JSON.parse(raw) as T : null as T
  };
}

async function postJson<T = unknown>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  const raw = await response.text();
  return {
    status: response.status,
    raw,
    body: raw ? JSON.parse(raw) as T : null as T
  };
}

function runnerHeaders() {
  return {
    "x-naikaku-runner-id": runnerId,
    "x-naikaku-runner-token": runnerToken
  };
}

function messageOf(response: JsonResponse) {
  const body = asRecord(response.body);
  if (typeof body.message === "string") return body.message;
  return response.raw;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "session";
}

function relativePath(targetPath: string) {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, "/") || ".";
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summaryMarkdown(summary: GatewayRunnerSmokeSummary) {
  return [
    "# Coding Agent Gateway Runner Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Gateway: ${summary.gatewayUrl}`,
    `Runner: ${summary.runnerId}`,
    `Auth mode: ${summary.authMode || "unknown"}`,
    `Locale: ${summary.operatorLocale}`,
    "",
    "## Cases",
    "",
    `- Health status: ${summary.cases.healthStatus}`,
    `- Preflight: ${summary.cases.preflightStatus} / ${summary.cases.preflightDecision || "unknown"}`,
    `- Missing lease: ${summary.cases.noLeaseStatus} / ${summary.cases.noLeaseMessage}`,
    `- Unissued lease: ${summary.cases.unissuedLeaseStatus} / ${summary.cases.unissuedLeaseMessage}`,
    `- Gateway lease: ${summary.cases.leaseClaimStatus} / ${summary.cases.leaseDecision || "unknown"} (${summary.cases.activeLeases} active)`,
    `- Sandbox runner: ${summary.cases.sandboxRunnerStatus} / ${summary.cases.sandboxRunnerDecision || "unknown"}`,
    `- Executed tasks: ${summary.cases.sandboxRunnerExecutedTasks}`,
    `- Process executions: ${summary.cases.sandboxRunnerProcessExecutions}`,
    `- Command results: ${summary.cases.sandboxRunnerCommandResults}`,
    `- Receipt review: ${summary.cases.receiptReviewDecision || "unknown"}`,
    `- Artifact audit: ${summary.cases.artifactAuditDecision || "unknown"}`,
    `- Worktree artifact audit: ${summary.cases.worktreeArtifactAuditStatus} / ${summary.cases.worktreeArtifactAuditDecision || "unknown"} (${summary.cases.worktreeArtifactAuditChangedFiles} changed files)`,
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

function printSummary(summary: GatewayRunnerSmokeSummary) {
  const failed = Object.values(summary.checks).filter((passed) => !passed).length;
  console.log(`Coding agent gateway runner smoke: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Gateway: ${summary.gatewayUrl}`);
  console.log(`Auth: ${summary.authMode || "unknown"} / runner ${summary.runnerId}`);
  console.log(`Missing lease: HTTP ${summary.cases.noLeaseStatus}`);
  console.log(`Unissued lease: HTTP ${summary.cases.unissuedLeaseStatus}, sessions ${summary.cases.unissuedSessionIds.length}`);
  console.log(`Gateway lease: ${summary.cases.leaseDecision || "unknown"}, active ${summary.cases.activeLeases}`);
  console.log(
    `Sandbox runner: ${summary.cases.sandboxRunnerDecision || "unknown"}, ` +
    `${summary.cases.sandboxRunnerExecutedTasks} executed, ` +
    `${summary.cases.sandboxRunnerProcessExecutions} process executions`
  );
  console.log(
    `Worktree artifact audit: ${summary.cases.worktreeArtifactAuditDecision || "unknown"}, ` +
    `${summary.cases.worktreeArtifactAuditChangedFiles} changed files`
  );
  console.log(`Checks: ${Object.values(summary.checks).length - failed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): GatewayRunnerSmokeOptions {
  const options: GatewayRunnerSmokeOptions = {
    outputDir: "output/coding-agent-gateway-runner-smoke",
    generatedAt: new Date().toISOString(),
    locale: "ja",
    timeoutMs: 120_000,
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

    if (arg === "--locale") {
      options.locale = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive number.");
  }

  return options;
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value) throw new Error(`Missing value for ${name}.`);
  return value;
}

function printHelp() {
  console.log(`Naikaku coding-agent gateway runner smoke

Usage:
  npm run coding-agent:gateway-smoke -- [options]

Options:
  --out <dir>            Output directory. Default: output/coding-agent-gateway-runner-smoke
  --generated-at <iso>   Stable generated timestamp. Default: now
  --locale <locale>      Operator locale. Default: ja
  --timeout-ms <ms>      Gateway startup and command timeout. Default: 120000
  --help                 Show this help.

The smoke starts the local gateway with synthetic scoped runner credentials, proves missing and
unissued runner leases are rejected over HTTP, then executes the sandbox-runner route with a
gateway-issued lease.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown coding-agent gateway runner smoke failure.");
  process.exitCode = 1;
});
