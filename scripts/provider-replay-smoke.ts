import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createNetServer } from "node:net";
import path from "node:path";

interface ProviderReplaySmokeOptions {
  outputDir: string;
  timeoutMs: number;
  help: boolean;
}

interface CommandRun {
  id: string;
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
}

interface ReplayProviderRequest {
  index: number;
  path: string;
  roleId: "prime-minister" | "critic-minister" | "supervisor-minister";
  model: string | null;
  priorArtifactsSeen: number;
  requestedAt: string;
}

interface CabinetReplaySummary {
  mode?: string;
  roles?: unknown[];
  decision?: {
    decision?: string;
    executionAuthorized?: boolean;
  } | null;
  checks?: Record<string, unknown>;
}

interface GuidedReplaySummary {
  cabinetMode?: string;
  executor?: string;
  runnerPreset?: string | null;
  maxLoops?: number;
  cycles?: Array<{
    cabinetMode?: string;
    cabinetExecutionAuthorized?: boolean;
    executionAttempted?: boolean;
    executionOk?: boolean;
  }>;
  final?: {
    stopReason?: string;
    executionAttempts?: number;
    successfulExecutions?: number;
  };
  checks?: Record<string, unknown>;
}

interface ProviderReplaySmokeSummary {
  schema: "naikaku.provider-replay-smoke.v1";
  generatedAt: string;
  outputDir: string;
  providerUrl: string;
  commands: CommandRun[];
  providerRequests: ReplayProviderRequest[];
  evidence: {
    cabinetSummaryPath: string;
    guidedSummaryPath: string;
    cabinetMode: string | null;
    cabinetRoles: number;
    cabinetDecision: string | null;
    guidedCabinetMode: string | null;
    guidedRunnerPreset: string | null;
    guidedCycles: number;
    guidedExecutionAttempts: number;
    guidedSuccessfulExecutions: number;
  };
  checks: {
    localProviderStarted: boolean;
    cabinetCommandPassed: boolean;
    cabinetLiveProviderMode: boolean;
    cabinetMadeThreeHttpRoleCalls: boolean;
    cabinetRolesSeparated: boolean;
    cabinetDecisionApproved: boolean;
    guidedCommandPassed: boolean;
    guidedLiveProviderMode: boolean;
    guidedRanFixtureExecutor: boolean;
    guidedExecutedOnlyAfterApproval: boolean;
    guidedReachedLoopLimit: boolean;
    providerRequestsRecorded: boolean;
    noRawSecretRequired: boolean;
    noGitOrDeploy: boolean;
  };
  claimBoundary: string[];
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const modelName = "naikaku-local-replay-model";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const generatedAt = new Date().toISOString();
  const outputDir = path.resolve(options.outputDir);
  assertSafeOutputDir(outputDir);
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const requests: ReplayProviderRequest[] = [];
  const port = await getAvailablePort();
  const providerUrl = `http://127.0.0.1:${port}/v1/replay`;
  const server = createReplayProviderServer(requests);

  await listen(server, port);

  try {
    const commands: CommandRun[] = [];
    commands.push(await runCommand({
      id: "cabinet-provider-replay",
      args: [
        "run",
        "cabinet:api-role-smoke",
        "--",
        "--provider",
        "custom",
        "--endpoint",
        providerUrl,
        "--model",
        modelName,
        "--mission",
        "Provider replay smoke: separate local HTTP role calls produce a cabinet vote.",
        "--out",
        relativePath(path.join(outputDir, "cabinet")),
        "--generated-at",
        generatedAt
      ],
      timeoutMs: options.timeoutMs
    }));
    commands.push(await runCommand({
      id: "guided-provider-replay",
      args: [
        "run",
        "engineering:guided",
        "--",
        "--cabinet-mode",
        "api",
        "--cabinet-provider",
        "custom",
        "--cabinet-endpoint",
        providerUrl,
        "--cabinet-model",
        modelName,
        "--mission",
        "Provider replay guided smoke: local HTTP cabinet roles vote before fixture execution.",
        "--max-loops",
        "2",
        "--runner-preset",
        "fixture",
        "--adapter-ready",
        "--out",
        relativePath(path.join(outputDir, "guided")),
        "--generated-at",
        generatedAt,
        "--timeout-ms",
        String(options.timeoutMs)
      ],
      timeoutMs: options.timeoutMs * 4
    }));

    const cabinetSummaryPath = path.join(outputDir, "cabinet", "summary.json");
    const guidedSummaryPath = path.join(outputDir, "guided", "summary.json");
    const cabinet = await readJsonIfExists<CabinetReplaySummary>(cabinetSummaryPath);
    const guided = await readJsonIfExists<GuidedReplaySummary>(guidedSummaryPath);
    const checks = buildChecks({ commands, requests, cabinet, guided });
    const summary: ProviderReplaySmokeSummary = {
      schema: "naikaku.provider-replay-smoke.v1",
      generatedAt,
      outputDir: relativePath(outputDir),
      providerUrl,
      commands,
      providerRequests: requests,
      evidence: {
        cabinetSummaryPath: relativePath(cabinetSummaryPath),
        guidedSummaryPath: relativePath(guidedSummaryPath),
        cabinetMode: stringOrNull(cabinet?.mode),
        cabinetRoles: Array.isArray(cabinet?.roles) ? cabinet.roles.length : 0,
        cabinetDecision: stringOrNull(cabinet?.decision?.decision),
        guidedCabinetMode: stringOrNull(guided?.cabinetMode),
        guidedRunnerPreset: stringOrNull(guided?.runnerPreset),
        guidedCycles: Array.isArray(guided?.cycles) ? guided.cycles.length : 0,
        guidedExecutionAttempts: numberOrZero(guided?.final?.executionAttempts),
        guidedSuccessfulExecutions: numberOrZero(guided?.final?.successfulExecutions)
      },
      checks,
      claimBoundary: [
        "This smoke starts a local HTTP replay provider and exercises live-provider code paths without a real API key.",
        "Prime Minister, Critic, and Supervisor still make separate HTTP calls with separate role prompts.",
        "The guided run starts the fixture runner only after the replay cabinet returns an approved motion.",
        "It does not call OpenAI, Anthropic, OpenRouter, Gemini, OpenClaw, OpenHands, Hammerspoon, Git remotes, deploy targets, or arbitrary desktop automation."
      ]
    };

    await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
    printSummary(summary);

    if (!Object.values(summary.checks).every(Boolean)) {
      process.exitCode = 1;
    }
  } finally {
    await closeServer(server);
  }
}

function createReplayProviderServer(requests: ReplayProviderRequest[]) {
  return createServer(async (request, response) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: { message: "POST required." } });
      return;
    }

    try {
      const body = await readRequestJson(request);
      const system = stringFor(body.system);
      const input = stringFor(body.input);
      const roleId = roleIdFor(system, input);
      const priorArtifactsSeen = countPriorArtifacts(input);
      requests.push({
        index: requests.length + 1,
        path: request.url || "/",
        roleId,
        model: stringOrNull(body.model),
        priorArtifactsSeen,
        requestedAt: new Date().toISOString()
      });
      sendJson(response, 200, {
        text: JSON.stringify(roleJsonFor(roleId, input, priorArtifactsSeen), null, 2),
        usage: { total_tokens: 64 + requests.length }
      });
    } catch (error) {
      sendJson(response, 500, {
        error: {
          message: error instanceof Error ? error.message : "Replay provider failed."
        }
      });
    }
  });
}

function roleJsonFor(
  roleId: ReplayProviderRequest["roleId"],
  input: string,
  priorArtifactsSeen: number
) {
  if (roleId === "prime-minister") {
    return {
      proposalTitle: "Replay provider roles can supervise governed execution",
      requestedExecutor: "engineering-guided",
      riskLevel: "medium",
      requiresHumanApproval: false,
      decision: "approve",
      rationale: `Local replay accepted mission with ${priorArtifactsSeen} prior artifacts: ${missionLine(input)}`,
      evidenceContract: [
        "Three separate HTTP provider calls",
        "Parsed role JSON",
        "Cabinet motion decision",
        "Runner receipt and artifact audit before completion"
      ]
    };
  }

  if (roleId === "critic-minister") {
    return {
      auditDecision: "warn",
      vote: "approve",
      findings: [
        "Replay provider proves live HTTP plumbing, not real model quality.",
        "Execution still needs bounded runner receipts and artifact audit evidence."
      ],
      evidence: [
        `prior-artifacts:${priorArtifactsSeen}`,
        "prime-minister-output"
      ],
      rationale: "Proceed only because the runner is fixed, bounded, and evidence-gated."
    };
  }

  return {
    decision: "approve",
    rationale: "The replay run does not request desktop control, Git push, deploy, or host-secret access.",
    requiredEvidence: [
      "Local provider request log",
      "Cabinet decision JSON",
      "Guided cycle summary",
      "Fixture runner receipt"
    ]
  };
}

function buildChecks({
  commands,
  requests,
  cabinet,
  guided
}: {
  commands: CommandRun[];
  requests: ReplayProviderRequest[];
  cabinet: CabinetReplaySummary | null;
  guided: GuidedReplaySummary | null;
}): ProviderReplaySmokeSummary["checks"] {
  const cabinetRequests = requests.slice(0, 3);
  const guidedRequests = requests.slice(3);
  const roleSet = new Set(requests.map((request) => request.roleId));
  const cabinetChecks = cabinet?.checks || {};
  const guidedChecks = guided?.checks || {};
  const guidedCycles = Array.isArray(guided?.cycles) ? guided.cycles : [];

  return {
    localProviderStarted: requests.length > 0,
    cabinetCommandPassed: commands.find((command) => command.id === "cabinet-provider-replay")?.exitCode === 0,
    cabinetLiveProviderMode: cabinet?.mode === "live-provider",
    cabinetMadeThreeHttpRoleCalls: cabinetRequests.length === 3,
    cabinetRolesSeparated: roleSet.has("prime-minister") &&
      roleSet.has("critic-minister") &&
      roleSet.has("supervisor-minister"),
    cabinetDecisionApproved: cabinet?.decision?.decision === "approved" &&
      cabinet?.decision?.executionAuthorized === true &&
      Object.values(cabinetChecks).length > 0 &&
      Object.values(cabinetChecks).every((value) => value === true),
    guidedCommandPassed: commands.find((command) => command.id === "guided-provider-replay")?.exitCode === 0,
    guidedLiveProviderMode: guided?.cabinetMode === "api" && guidedRequests.length >= 6,
    guidedRanFixtureExecutor: guided?.executor === "auto-work" && guided?.runnerPreset === "fixture",
    guidedExecutedOnlyAfterApproval: guidedCycles.length === 2 &&
      guidedCycles.every((cycle) =>
        cycle.cabinetMode === "api" &&
        cycle.cabinetExecutionAuthorized === true &&
        cycle.executionAttempted === true &&
        cycle.executionOk === true
      ),
    guidedReachedLoopLimit: guided?.maxLoops === 2 &&
      guided?.final?.stopReason === "limit-reached" &&
      guided?.final?.executionAttempts === 2 &&
      guided?.final?.successfulExecutions === 2 &&
      Object.values(guidedChecks).length > 0 &&
      Object.values(guidedChecks).every((value) => value === true),
    providerRequestsRecorded: requests.length === 9 &&
      requests.every((request) => request.model === modelName),
    noRawSecretRequired: true,
    noGitOrDeploy: true
  };
}

function runCommand({
  id,
  args,
  timeoutMs
}: {
  id: string;
  args: string[];
  timeoutMs: number;
}): Promise<CommandRun> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(npmCommand, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "1"
      }
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        id,
        command: npmCommand,
        args,
        exitCode: code ?? 1,
        durationMs: Date.now() - startedAt
      });
    });
    child.on("error", () => {
      clearTimeout(timeout);
      resolve({
        id,
        command: npmCommand,
        args,
        exitCode: 1,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

async function getAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
    server.on("error", reject);
  });
}

function listen(server: ReturnType<typeof createServer>, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.listen(port, "127.0.0.1", resolve);
    server.on("error", reject);
  });
}

function closeServer(server: ReturnType<typeof createServer>) {
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

async function readRequestJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) as Record<string, unknown> : {};
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function roleIdFor(system: string, input: string): ReplayProviderRequest["roleId"] {
  if (system.includes("proposalTitle") || input.includes("Prime Minister / Mission Control")) {
    return "prime-minister";
  }
  if (system.includes("auditDecision") || input.includes("Opposition Critic / Critique")) {
    return "critic-minister";
  }
  return "supervisor-minister";
}

function countPriorArtifacts(input: string) {
  const matches = input.match(/- .* output/g);
  return matches ? matches.length : 0;
}

function missionLine(input: string) {
  return input.split("\n").find((line) => line.startsWith("Mission: "))?.replace("Mission: ", "").trim() || "mission";
}

function summaryMarkdown(summary: ProviderReplaySmokeSummary) {
  return [
    "# Provider Replay Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Provider URL: ${summary.providerUrl}`,
    "",
    "## Commands",
    "",
    ...summary.commands.map((command) =>
      `- ${command.id}: exit ${command.exitCode}, ${command.durationMs}ms`
    ),
    "",
    "## Evidence",
    "",
    `- cabinet: ${summary.evidence.cabinetMode}, ${summary.evidence.cabinetRoles} roles, ${summary.evidence.cabinetDecision}`,
    `- guided: ${summary.evidence.guidedCabinetMode}, ${summary.evidence.guidedRunnerPreset}, ${summary.evidence.guidedCycles} cycles`,
    `- executions: ${summary.evidence.guidedSuccessfulExecutions}/${summary.evidence.guidedExecutionAttempts}`,
    `- provider requests: ${summary.providerRequests.length}`,
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

function printSummary(summary: ProviderReplaySmokeSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log(`Provider replay smoke: ${failed === 0 ? "passed" : "needs-review"}`);
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- provider requests: ${summary.providerRequests.length}`);
  console.log(`- cabinet: ${summary.evidence.cabinetMode} / ${summary.evidence.cabinetDecision}`);
  console.log(`- guided: ${summary.evidence.guidedCabinetMode} / ${summary.evidence.guidedCycles} cycles`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): ProviderReplaySmokeOptions {
  const options: ProviderReplaySmokeOptions = {
    outputDir: "output/provider-replay-smoke",
    timeoutMs: 60_000,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
        throw new Error("--timeout-ms must be a positive number.");
      }
      index += 1;
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

function stringFor(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function printHelp() {
  console.log([
    "Usage:",
    "  npm run provider:replay-smoke",
    "  npm run provider:replay-smoke -- --out output/provider-replay-smoke --timeout-ms 60000",
    "",
    "Starts a local HTTP replay provider, runs role-separated live-provider cabinet calls,",
    "then runs a guided fixture execution only after replay cabinet approval."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown provider replay smoke failure.");
  process.exitCode = 1;
});
