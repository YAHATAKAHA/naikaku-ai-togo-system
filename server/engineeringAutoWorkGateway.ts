import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { supportedLocales, type SupportedLocale } from "../src/i18n";
import {
  buildEngineeringRunnerPresetRegistry,
  findEngineeringRunnerPreset,
  type EngineeringAutoWorkGatewayPreset,
  type EngineeringRunnerPresetRegistry
} from "./engineeringRunnerPresets";

export interface EngineeringAutoWorkGatewayRequest {
  mission?: string;
  locale?: SupportedLocale;
  runnerPreset?: EngineeringAutoWorkGatewayPreset;
  adapterReady?: boolean;
  worktree?: string;
  outputDir?: string;
  timeoutMs?: number;
  generatedAt?: string;
}

export interface EngineeringAutoWorkGatewayResponse {
  schema: "naikaku.engineering-auto-work-gateway.v1";
  ok: boolean;
  decision: "completed" | "failed" | "blocked";
  message: string;
  preset: EngineeringAutoWorkGatewayPreset;
  adapterReady: boolean;
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

interface EngineeringAutoWorkGatewayRun {
  statusCode: number;
  body: EngineeringAutoWorkGatewayResponse;
}

interface RunDependencies {
  cwd?: string;
  npmCommand?: string;
  spawn?: EngineeringAutoWorkSpawn;
  now?: () => string;
  runnerPresetsEnv?: string;
}

type EngineeringAutoWorkSpawn = (
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

const DEFAULT_OUTPUT_DIR = "output/engineering-auto-work-ui";
const DEFAULT_TIMEOUT_MS = 180_000;
const MAX_TIMEOUT_MS = 600_000;

export function runEngineeringAutoWorkGateway(
  request: EngineeringAutoWorkGatewayRequest,
  dependencies: RunDependencies = {}
): EngineeringAutoWorkGatewayRun {
  const cwd = dependencies.cwd || process.cwd();
  const npmCommand = dependencies.npmCommand || npmBinary();
  const spawn = dependencies.spawn || ((command, args, options) => spawnSync(command, args, options));
  const now = dependencies.now || (() => new Date().toISOString());

  let validation: ReturnType<typeof buildEngineeringAutoWorkCommand>;
  try {
    const runnerPresetRegistry = buildEngineeringRunnerPresetRegistry({
      generatedAt: request.generatedAt || now(),
      envValue: dependencies.runnerPresetsEnv
    });
    validation = buildEngineeringAutoWorkCommand({
      request,
      cwd,
      npmCommand,
      generatedAt: request.generatedAt || now(),
      runnerPresetRegistry
    });
  } catch (error) {
    return blocked(
      error instanceof Error ? error.message : "Invalid engineering auto-work request.",
      typeof request.runnerPreset === "string" && request.runnerPreset.trim() ? request.runnerPreset.trim() : "prepared",
      Boolean(request.adapterReady),
      cwd,
      npmCommand
    );
  }
  if ("statusCode" in validation) {
    return validation;
  }

  const result = spawn(validation.command, validation.args, {
    cwd,
    encoding: "utf8",
    timeout: Math.max(validation.timeoutMs + 30_000, 60_000),
    maxBuffer: 1024 * 1024 * 8
  });
  const summary = readSummary(resolve(cwd, validation.outputDir, "summary.json"));
  const checks = checkCounts(summary);
  const exitCode = typeof result.status === "number" ? result.status : null;
  const ok = exitCode === 0 && checks.fail === 0;

  return {
    statusCode: ok ? 200 : 500,
    body: {
      schema: "naikaku.engineering-auto-work-gateway.v1",
      ok,
      decision: ok ? "completed" : "failed",
      message: ok
        ? `Engineering auto-work completed with ${checks.pass} passing checks.`
        : `Engineering auto-work failed with exit ${exitCode ?? "unknown"}.`,
      preset: validation.preset,
      adapterReady: validation.adapterReady,
      exitCode,
      signal: result.signal ?? null,
      outputDir: validation.outputDir,
      summaryPath: `${validation.outputDir}/summary.json`,
      summary,
      checks,
      command: {
        command: validation.command,
        args: validation.args,
        cwd,
        timeoutMs: validation.timeoutMs
      },
      stdoutTail: tail(result.stdout || ""),
      stderrTail: tail(result.stderr || result.error?.message || "")
    }
  };
}

function buildEngineeringAutoWorkCommand({
  request,
  cwd,
  npmCommand,
  generatedAt,
  runnerPresetRegistry
}: {
  request: EngineeringAutoWorkGatewayRequest;
  cwd: string;
  npmCommand: string;
  generatedAt: string;
  runnerPresetRegistry: EngineeringRunnerPresetRegistry;
}): EngineeringAutoWorkGatewayRun | {
  preset: EngineeringAutoWorkGatewayPreset;
  adapterReady: boolean;
  command: string;
  args: string[];
  outputDir: string;
  timeoutMs: number;
} {
  const mission = typeof request.mission === "string" ? request.mission.trim() : "";
  if (!mission) {
    return blocked("Mission is required before starting engineering auto-work.", "prepared", false, cwd, npmCommand);
  }

  const preset = findEngineeringRunnerPreset(request.runnerPreset, runnerPresetRegistry);
  if (!preset) {
    return blocked(
      `Unknown runner preset: ${request.runnerPreset || "prepared"}. Refresh runner presets or configure NAIKAKU_ENGINEERING_RUNNER_PRESETS on the local gateway.`,
      typeof request.runnerPreset === "string" && request.runnerPreset.trim() ? request.runnerPreset.trim() : "prepared",
      Boolean(request.adapterReady),
      cwd,
      npmCommand
    );
  }
  const adapterReady = Boolean(request.adapterReady);
  if (preset.requiresAdapterReady && !adapterReady) {
    return blocked(
      `${preset.label} requires adapterReady=true after the local adapter is installed, license-reviewed, and approved for this run.`,
      preset.id,
      adapterReady,
      cwd,
      npmCommand
    );
  }

  const locale = normalizeLocale(request.locale);
  const outputDir = normalizeRelativePath(request.outputDir, DEFAULT_OUTPUT_DIR, "outputDir", {
    requireOutputPrefix: true,
    allowDot: false
  });
  const fixtureWorktree = `${outputDir}/fixture-worktree`;
  const requestedWorktree = typeof request.worktree === "string" && request.worktree.trim()
    ? request.worktree.trim()
    : undefined;
  const worktreeInput = preset.kind === "fixture" && (!requestedWorktree || requestedWorktree === ".")
    ? fixtureWorktree
    : requestedWorktree;
  const worktree = normalizeRelativePath(worktreeInput, preset.kind === "fixture" ? fixtureWorktree : ".", "worktree", {
    requireOutputPrefix: false,
    allowDot: true
  });
  const timeoutMs = normalizeTimeout(request.timeoutMs);
  const args = [
    "run",
    "engineering:auto-work",
    "--",
    "--mission",
    mission,
    "--locale",
    locale,
    "--out",
    outputDir,
    "--worktree",
    worktree,
    "--timeout-ms",
    String(timeoutMs),
    "--generated-at",
    generatedAt
  ];

  if (preset.kind === "fixture") {
    args.push("--runner-preset", preset.id);
  } else if (preset.kind === "external-command") {
    if (!preset.adapterId || !preset.command) {
      return blocked(`Runner preset ${preset.id} is missing adapter command metadata.`, preset.id, adapterReady, cwd, npmCommand);
    }
    args.push(
      "--adapter",
      preset.adapterId,
      "--command",
      preset.command,
      "--max-jobs",
      String(preset.maxJobs)
    );
    preset.args.forEach((arg) => {
      args.push("--arg", arg);
    });
    if (!preset.receiptRequired) {
      args.push("--no-require-receipt");
    }
  }
  if (adapterReady) {
    args.push("--adapter-ready");
  }

  return {
    preset: preset.id,
    adapterReady,
    command: npmCommand,
    args,
    outputDir,
    timeoutMs
  };
}

function blocked(
  message: string,
  preset: EngineeringAutoWorkGatewayPreset,
  adapterReady: boolean,
  cwd: string,
  npmCommand = npmBinary()
): EngineeringAutoWorkGatewayRun {
  return {
    statusCode: 422,
    body: {
      schema: "naikaku.engineering-auto-work-gateway.v1",
      ok: false,
      decision: "blocked",
      message,
      preset,
      adapterReady,
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

function normalizeLocale(value: EngineeringAutoWorkGatewayRequest["locale"]): SupportedLocale {
  return supportedLocales.some((locale) => locale.code === value) ? value as SupportedLocale : "ja";
}

function normalizeTimeout(value: EngineeringAutoWorkGatewayRequest["timeoutMs"]) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(5_000, Math.min(MAX_TIMEOUT_MS, Math.floor(value)));
}

function normalizeRelativePath(
  value: string | undefined,
  fallback: string,
  field: string,
  options: {
    requireOutputPrefix: boolean;
    allowDot: boolean;
  }
) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const normalized = raw.replace(/\\/g, "/").replace(/^\.\/+/, "");

  if (raw.includes("\0") || raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) {
    throw new Error(`${field} must be a relative workspace path.`);
  }
  if (normalized === ".") {
    if (options.allowDot) return ".";
    throw new Error(`${field} cannot be the workspace root.`);
  }
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized.endsWith("/..")
  ) {
    throw new Error(`${field} cannot leave the workspace.`);
  }
  if (options.requireOutputPrefix && normalized !== "output" && !normalized.startsWith("output/")) {
    throw new Error(`${field} must stay under output/.`);
  }

  return normalized || fallback;
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
