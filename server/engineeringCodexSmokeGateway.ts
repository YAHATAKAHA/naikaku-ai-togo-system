import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface EngineeringCodexSmokeGatewayRequest {
  mission?: string;
  outputDir?: string;
  timeoutMs?: number;
  generatedAt?: string;
}

export interface EngineeringCodexSmokeGatewayResponse {
  schema: "naikaku.engineering-codex-smoke-gateway.v1";
  ok: boolean;
  decision: "completed" | "failed" | "blocked";
  message: string;
  executor: "codex-cli";
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  outputDir: string;
  summaryPath: string;
  summary: unknown | null;
  checks: {
    pass: number;
    fail: number;
  };
  command: {
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
  } | null;
  stdoutTail: string;
  stderrTail: string;
}

interface EngineeringCodexSmokeGatewayRun {
  statusCode: number;
  body: EngineeringCodexSmokeGatewayResponse;
}

interface RunDependencies {
  cwd?: string;
  npmCommand?: string;
  spawn?: EngineeringCodexSmokeSpawn;
  now?: () => string;
}

type EngineeringCodexSmokeSpawn = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    encoding: "utf8";
    timeout: number;
    maxBuffer: number;
  }
) => {
  status: number | null;
  signal?: NodeJS.Signals | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
};

const DEFAULT_OUTPUT_DIR = "output/engineering-codex-smoke-ui";
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_TIMEOUT_MS = 600_000;

export function runEngineeringCodexSmokeGateway(
  request: EngineeringCodexSmokeGatewayRequest,
  dependencies: RunDependencies = {}
): EngineeringCodexSmokeGatewayRun {
  const cwd = dependencies.cwd || process.cwd();
  const npmCommand = dependencies.npmCommand || npmBinary();
  const spawn = dependencies.spawn || ((command, args, options) => spawnSync(command, args, options));
  const generatedAt = request.generatedAt || dependencies.now?.() || new Date().toISOString();

  let commandSpec: ReturnType<typeof buildCodexSmokeCommand>;
  try {
    commandSpec = buildCodexSmokeCommand({
      request,
      cwd,
      npmCommand,
      generatedAt
    });
  } catch (error) {
    return blocked(
      error instanceof Error ? error.message : "Invalid Codex smoke request.",
      cwd,
      npmCommand
    );
  }
  if ("statusCode" in commandSpec) {
    return commandSpec;
  }

  const result = spawn(commandSpec.command, commandSpec.args, {
    cwd,
    encoding: "utf8",
    timeout: Math.max(commandSpec.timeoutMs + 30_000, 60_000),
    maxBuffer: 1024 * 1024 * 12
  });
  const summary = readSummary(resolve(cwd, commandSpec.outputDir, "summary.json"));
  const checks = checkCounts(summary);
  const exitCode = typeof result.status === "number" ? result.status : null;
  const ok = exitCode === 0 && checks.fail === 0;

  return {
    statusCode: ok ? 200 : 500,
    body: {
      schema: "naikaku.engineering-codex-smoke-gateway.v1",
      ok,
      decision: ok ? "completed" : "failed",
      message: ok
        ? `Codex smoke completed with ${checks.pass} passing checks.`
        : `Codex smoke failed with exit ${exitCode ?? "unknown"}.`,
      executor: "codex-cli",
      exitCode,
      signal: result.signal ?? null,
      outputDir: commandSpec.outputDir,
      summaryPath: `${commandSpec.outputDir}/summary.json`,
      summary,
      checks,
      command: {
        command: commandSpec.command,
        args: commandSpec.args,
        cwd,
        timeoutMs: commandSpec.timeoutMs
      },
      stdoutTail: tail(result.stdout || ""),
      stderrTail: tail(result.stderr || result.error?.message || "")
    }
  };
}

function buildCodexSmokeCommand({
  request,
  cwd,
  npmCommand,
  generatedAt
}: {
  request: EngineeringCodexSmokeGatewayRequest;
  cwd: string;
  npmCommand: string;
  generatedAt: string;
}): EngineeringCodexSmokeGatewayRun | {
  command: string;
  args: string[];
  outputDir: string;
  timeoutMs: number;
} {
  const mission = typeof request.mission === "string" ? request.mission.trim() : "";
  if (!mission) {
    return blocked("Mission is required before starting the governed Codex smoke.", cwd, npmCommand);
  }

  const outputDir = normalizeOutputPath(request.outputDir, DEFAULT_OUTPUT_DIR);
  const timeoutMs = normalizeTimeout(request.timeoutMs);
  return {
    command: npmCommand,
    args: [
      "run",
      "codex:engineer-smoke",
      "--",
      "--mission",
      mission,
      "--out",
      outputDir,
      "--generated-at",
      generatedAt
    ],
    outputDir,
    timeoutMs
  };
}

function blocked(
  message: string,
  cwd: string,
  npmCommand = npmBinary()
): EngineeringCodexSmokeGatewayRun {
  return {
    statusCode: 422,
    body: {
      schema: "naikaku.engineering-codex-smoke-gateway.v1",
      ok: false,
      decision: "blocked",
      message,
      executor: "codex-cli",
      exitCode: null,
      signal: null,
      outputDir: DEFAULT_OUTPUT_DIR,
      summaryPath: `${DEFAULT_OUTPUT_DIR}/summary.json`,
      summary: null,
      checks: { pass: 0, fail: 1 },
      command: {
        command: npmCommand,
        args: [],
        cwd,
        timeoutMs: DEFAULT_TIMEOUT_MS
      },
      stdoutTail: "",
      stderrTail: message
    }
  };
}

function normalizeOutputPath(value: string | undefined, fallback: string) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const normalized = raw.replace(/\\/g, "/").replace(/^\.\/+/, "");

  if (raw.includes("\0") || raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) {
    throw new Error("outputDir must be a relative workspace path.");
  }
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.endsWith("/..")
  ) {
    throw new Error("outputDir cannot leave the workspace.");
  }
  if (normalized !== "output" && !normalized.startsWith("output/")) {
    throw new Error("outputDir must stay under output/.");
  }

  return normalized || fallback;
}

function normalizeTimeout(value: EngineeringCodexSmokeGatewayRequest["timeoutMs"]) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(30_000, Math.min(MAX_TIMEOUT_MS, Math.floor(value)));
}

function readSummary(summaryPath: string) {
  if (!existsSync(summaryPath)) return null;

  try {
    return JSON.parse(readFileSync(summaryPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function checkCounts(summary: unknown) {
  if (!summary || typeof summary !== "object" || !("checks" in summary)) {
    return { pass: 0, fail: 0 };
  }

  const checks = (summary as { checks?: unknown }).checks;
  if (!checks || typeof checks !== "object") {
    return { pass: 0, fail: 0 };
  }

  const values = Object.values(checks as Record<string, unknown>);
  return {
    pass: values.filter(Boolean).length,
    fail: values.filter((value) => !value).length
  };
}

function tail(value: string) {
  return value.length > 6000 ? value.slice(-6000) : value;
}

function npmBinary() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
