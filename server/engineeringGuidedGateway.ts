import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { supportedLocales, type SupportedLocale } from "../src/i18n";
import {
  buildEngineeringRunnerPresetRegistry,
  findEngineeringRunnerPreset,
  type EngineeringAutoWorkGatewayPreset
} from "./engineeringRunnerPresets";

export type EngineeringGuidedCabinetMode = "local" | "api-mock" | "api";

export interface EngineeringGuidedGatewayRequest {
  mission?: string;
  locale?: SupportedLocale;
  cabinetMode?: EngineeringGuidedCabinetMode;
  cabinetProvider?: string;
  cabinetEndpoint?: string;
  cabinetModel?: string;
  cabinetApiKeyAlias?: string;
  runnerPreset?: EngineeringAutoWorkGatewayPreset;
  adapterReady?: boolean;
  worktree?: string;
  maxLoops?: number;
  outputDir?: string;
  timeoutMs?: number;
  generatedAt?: string;
}

export interface EngineeringGuidedGatewayResponse {
  schema: "naikaku.engineering-guided-gateway.v1";
  ok: boolean;
  decision: "completed" | "failed" | "blocked";
  message: string;
  cabinetMode: EngineeringGuidedCabinetMode;
  preset: EngineeringAutoWorkGatewayPreset;
  adapterReady: boolean;
  maxLoops: number;
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

interface EngineeringGuidedGatewayRun {
  statusCode: number;
  body: EngineeringGuidedGatewayResponse;
}

interface RunDependencies {
  cwd?: string;
  npmCommand?: string;
  spawn?: EngineeringGuidedSpawn;
  now?: () => string;
  runnerPresetsEnv?: string;
}

type EngineeringGuidedSpawn = (
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

const DEFAULT_OUTPUT_DIR = "output/engineering-guided-ui";
const DEFAULT_TIMEOUT_MS = 180_000;
const MAX_TIMEOUT_MS = 900_000;

export function runEngineeringGuidedGateway(
  request: EngineeringGuidedGatewayRequest,
  dependencies: RunDependencies = {}
): EngineeringGuidedGatewayRun {
  const cwd = dependencies.cwd || process.cwd();
  const npmCommand = dependencies.npmCommand || npmBinary();
  const spawn = dependencies.spawn || ((command, args, options) => spawnSync(command, args, options));
  const now = dependencies.now || (() => new Date().toISOString());

  let commandSpec: ReturnType<typeof buildEngineeringGuidedCommand>;
  try {
    const runnerPresetRegistry = buildEngineeringRunnerPresetRegistry({
      generatedAt: request.generatedAt || now(),
      envValue: dependencies.runnerPresetsEnv
    });
    commandSpec = buildEngineeringGuidedCommand({
      request,
      cwd,
      npmCommand,
      generatedAt: request.generatedAt || now(),
      runnerPresetRegistry
    });
  } catch (error) {
    return blocked(
      error instanceof Error ? error.message : "Invalid guided engineering request.",
      typeof request.cabinetMode === "string" ? request.cabinetMode : "local",
      typeof request.runnerPreset === "string" && request.runnerPreset.trim() ? request.runnerPreset.trim() : "fixture",
      Boolean(request.adapterReady),
      1,
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
    timeout: Math.max(commandSpec.timeoutMs * commandSpec.maxLoops + 60_000, 90_000),
    maxBuffer: 1024 * 1024 * 14
  });
  const summary = readSummary(resolve(cwd, commandSpec.outputDir, "summary.json"));
  const checks = checkCounts(summary);
  const exitCode = typeof result.status === "number" ? result.status : null;
  const ok = exitCode === 0 && checks.fail === 0;

  return {
    statusCode: ok ? 200 : 500,
    body: {
      schema: "naikaku.engineering-guided-gateway.v1",
      ok,
      decision: ok ? "completed" : "failed",
      message: ok
        ? `Guided engineering cycle completed with ${checks.pass} passing checks.`
        : `Guided engineering cycle failed with exit ${exitCode ?? "unknown"}.`,
      cabinetMode: commandSpec.cabinetMode,
      preset: commandSpec.preset,
      adapterReady: commandSpec.adapterReady,
      maxLoops: commandSpec.maxLoops,
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

function buildEngineeringGuidedCommand({
  request,
  cwd,
  npmCommand,
  generatedAt,
  runnerPresetRegistry
}: {
  request: EngineeringGuidedGatewayRequest;
  cwd: string;
  npmCommand: string;
  generatedAt: string;
  runnerPresetRegistry: ReturnType<typeof buildEngineeringRunnerPresetRegistry>;
}): EngineeringGuidedGatewayRun | {
  cabinetMode: EngineeringGuidedCabinetMode;
  preset: EngineeringAutoWorkGatewayPreset;
  adapterReady: boolean;
  command: string;
  args: string[];
  outputDir: string;
  timeoutMs: number;
  maxLoops: number;
} {
  const mission = typeof request.mission === "string" ? request.mission.trim() : "";
  if (!mission) {
    return blocked("Mission is required before starting the guided engineering cycle.", "local", "fixture", false, 1, cwd, npmCommand);
  }

  const cabinetMode = normalizeCabinetMode(request.cabinetMode);
  const preset = findEngineeringRunnerPreset(request.runnerPreset || "fixture", runnerPresetRegistry);
  if (!preset) {
    return blocked(
      `Unknown runner preset: ${request.runnerPreset || "fixture"}. Refresh runner presets or configure NAIKAKU_ENGINEERING_RUNNER_PRESETS on the local gateway.`,
      cabinetMode,
      typeof request.runnerPreset === "string" && request.runnerPreset.trim() ? request.runnerPreset.trim() : "fixture",
      Boolean(request.adapterReady),
      normalizeMaxLoops(request.maxLoops),
      cwd,
      npmCommand
    );
  }
  const adapterReady = Boolean(request.adapterReady) || preset.kind === "fixture";
  if (preset.requiresAdapterReady && !adapterReady) {
    return blocked(
      `${preset.label} requires adapterReady=true after the local adapter is installed, license-reviewed, and approved for this run.`,
      cabinetMode,
      preset.id,
      adapterReady,
      normalizeMaxLoops(request.maxLoops),
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
  const maxLoops = normalizeMaxLoops(request.maxLoops);
  const cabinetApiKeyAlias = typeof request.cabinetApiKeyAlias === "string"
    ? request.cabinetApiKeyAlias.trim()
    : "";
  if (cabinetMode === "api" && cabinetApiKeyAlias && !isEnvAlias(cabinetApiKeyAlias)) {
    return blocked(
      "Cabinet API key alias must be an environment variable name, not a raw secret.",
      cabinetMode,
      preset.id,
      adapterReady,
      maxLoops,
      cwd,
      npmCommand
    );
  }
  const args = [
    "run",
    "engineering:guided",
    "--",
    "--mission",
    mission,
    "--locale",
    locale,
    "--cabinet-mode",
    cabinetMode,
    "--max-loops",
    String(maxLoops),
    "--runner-preset",
    preset.id,
    "--out",
    outputDir,
    "--worktree",
    worktree,
    "--timeout-ms",
    String(timeoutMs),
    "--generated-at",
    generatedAt
  ];

  if (cabinetMode === "api") {
    args.push("--cabinet-provider", request.cabinetProvider || "openai");
    if (request.cabinetEndpoint) args.push("--cabinet-endpoint", request.cabinetEndpoint);
    if (request.cabinetModel) args.push("--cabinet-model", request.cabinetModel);
    if (cabinetApiKeyAlias) args.push("--cabinet-api-key-alias", cabinetApiKeyAlias);
  }
  if (adapterReady) {
    args.push("--adapter-ready");
  }

  return {
    cabinetMode,
    preset: preset.id,
    adapterReady,
    command: npmCommand,
    args,
    outputDir,
    timeoutMs,
    maxLoops
  };
}

function blocked(
  message: string,
  cabinetMode: EngineeringGuidedCabinetMode,
  preset: EngineeringAutoWorkGatewayPreset,
  adapterReady: boolean,
  maxLoops: number,
  cwd: string,
  npmCommand = npmBinary()
): EngineeringGuidedGatewayRun {
  return {
    statusCode: 422,
    body: {
      schema: "naikaku.engineering-guided-gateway.v1",
      ok: false,
      decision: "blocked",
      message,
      cabinetMode,
      preset,
      adapterReady,
      maxLoops,
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

function normalizeCabinetMode(value: EngineeringGuidedGatewayRequest["cabinetMode"]): EngineeringGuidedCabinetMode {
  if (value === "api" || value === "api-mock" || value === "local") return value;
  return "local";
}

function isEnvAlias(value: string) {
  return /^[A-Z][A-Z0-9_]*$/.test(value);
}

function normalizeLocale(value: EngineeringGuidedGatewayRequest["locale"]) {
  if (typeof value === "string" && supportedLocales.some((locale) => locale.code === value)) {
    return value;
  }
  return "ja";
}

function normalizeTimeout(value: EngineeringGuidedGatewayRequest["timeoutMs"]) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(30_000, Math.min(MAX_TIMEOUT_MS, Math.floor(value)));
}

function normalizeMaxLoops(value: EngineeringGuidedGatewayRequest["maxLoops"]) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(3, Math.floor(value)));
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
  if (
    (!options.allowDot && normalized === ".") ||
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

function tail(value: string, max = 4000) {
  return value.length <= max ? value : value.slice(value.length - max);
}

function npmBinary() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
