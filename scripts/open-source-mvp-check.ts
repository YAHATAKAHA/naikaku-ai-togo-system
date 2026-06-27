import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

interface OpenSourceMvpCheckOptions {
  outputDir: string;
  timeoutMs: number;
  help: boolean;
}

interface CheckStep {
  id: string;
  label: string;
  command: string;
  args: string[];
  proves: string;
}

interface CheckResult extends CheckStep {
  commandLine: string;
  exitCode: number;
  expectedExitCode: number;
  passed: boolean;
  durationMs: number;
}

interface OpenSourceMvpCheckSummary {
  schema: "naikaku.open-source-mvp-check.v1";
  generatedAt: string;
  outputDir: string;
  cases: CheckResult[];
  checks: {
    buildPassed: boolean;
    targetedTestsPassed: boolean;
    gatewayAutoWorkPassed: boolean;
    fixtureCodingLoopPassed: boolean;
    allPassed: boolean;
  };
  evidence: {
    gatewayAutoWorkSummary: string;
    fixtureCodingLoopSummary: string;
  };
  claimBoundary: string[];
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

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

  const steps = buildSteps({
    outputDir,
    timeoutMs: options.timeoutMs
  });
  const results: CheckResult[] = [];

  for (const step of steps) {
    console.log(`\n==> ${step.label}`);
    console.log(`$ ${formatCommandLine(step.command, step.args)}`);
    const result = runStep(step);
    results.push(result);
  }

  const summary = buildSummary({
    outputDir,
    results,
    generatedAt: new Date().toISOString()
  });

  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!summary.checks.allPassed) {
    process.exitCode = 1;
  }
}

function buildSteps({
  outputDir,
  timeoutMs
}: {
  outputDir: string;
  timeoutMs: number;
}): CheckStep[] {
  return [
    {
      id: "build",
      label: "Type-check and production build",
      command: npmCommand,
      args: ["run", "build"],
      proves: "The TypeScript/Vite app compiles from a fresh checkout."
    },
    {
      id: "targeted-tests",
      label: "MVP targeted tests",
      command: npxCommand,
      args: [
        "vitest",
        "run",
        "src/i18n.test.ts",
        "server/engineeringAutoWorkGateway.test.ts",
        "server/engineeringRunnerPresets.test.ts",
        "server/engineeringRunnerReadiness.test.ts",
        "src/domain/engineeringSelfSimulation.test.ts"
      ],
      proves: "Japanese-first localization, runner presets/readiness, gateway auto-work, and engineering self-simulation contracts still hold."
    },
    {
      id: "gateway-auto-work",
      label: "Gateway fixture auto-work smoke",
      command: npmCommand,
      args: [
        "run",
        "engineering:auto-work-gateway-smoke",
        "--",
        "--out",
        path.join(outputDir, "gateway-auto-work"),
        "--timeout-ms",
        String(timeoutMs)
      ],
      proves: "The local gateway can accept a mission through /v1/engineering/auto-work, run the fixture adapter, import a receipt, and audit evidence/artifacts."
    },
    {
      id: "fixture-coding-loop",
      label: "Fixture coding-agent engineering loop",
      command: npmCommand,
      args: [
        "run",
        "coding-agent:engineering-sim",
        "--",
        "--out",
        path.join(outputDir, "fixture-coding-loop"),
        "--locale",
        "ja"
      ],
      proves: "A generated fixture repository can fail a test, receive a patch, pass the test, and produce receipt/evidence/artifact audit output."
    }
  ];
}

function runStep(step: CheckStep): CheckResult {
  const startedAt = Date.now();
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false
  });
  const durationMs = Date.now() - startedAt;
  const exitCode = typeof result.status === "number" ? result.status : 1;

  if (result.error) {
    console.error(result.error instanceof Error ? result.error.message : result.error);
  }

  return {
    ...step,
    commandLine: formatCommandLine(step.command, step.args),
    exitCode,
    expectedExitCode: 0,
    passed: exitCode === 0,
    durationMs
  };
}

function buildSummary({
  outputDir,
  results,
  generatedAt
}: {
  outputDir: string;
  results: CheckResult[];
  generatedAt: string;
}): OpenSourceMvpCheckSummary {
  const byId = new Map(results.map((result) => [result.id, result]));
  const checks = {
    buildPassed: byId.get("build")?.passed === true,
    targetedTestsPassed: byId.get("targeted-tests")?.passed === true,
    gatewayAutoWorkPassed: byId.get("gateway-auto-work")?.passed === true,
    fixtureCodingLoopPassed: byId.get("fixture-coding-loop")?.passed === true,
    allPassed: results.every((result) => result.passed)
  };

  return {
    schema: "naikaku.open-source-mvp-check.v1",
    generatedAt,
    outputDir: relativePath(outputDir),
    cases: results,
    checks,
    evidence: {
      gatewayAutoWorkSummary: relativePath(path.join(outputDir, "gateway-auto-work", "summary.json")),
      fixtureCodingLoopSummary: relativePath(path.join(outputDir, "fixture-coding-loop", "summary.json"))
    },
    claimBoundary: [
      "This check proves local build/test health, gateway auto-work plumbing, and a no-provider fixture coding loop.",
      "It does not prove a real OpenClaw/OpenHands/Hermes run, arbitrary desktop control, production deployment, Git push, or completion of real backlog work.",
      "External CLI runners should be invoked as governed adapters that return Naikaku receipts and evidence, not as unbounded host automation."
    ]
  };
}

function parseArgs(args: string[]): OpenSourceMvpCheckOptions {
  const options: OpenSourceMvpCheckOptions = {
    outputDir: "output/open-source-mvp-check",
    timeoutMs: 60_000,
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

    if (arg === "--timeout-ms") {
      options.timeoutMs = Number(requireValue(args, index, arg));
      if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
        throw new Error("--timeout-ms must be a positive number.");
      }
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

function assertSafeOutputDir(outputDir: string) {
  const outputRoot = path.resolve("output");
  const relative = path.relative(outputRoot, outputDir);
  if (!existsSync(outputRoot)) {
    mkdirSync(outputRoot, { recursive: true });
  }
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must point to a subdirectory under output/.");
  }
}

function printHelp() {
  console.log([
    "Naikaku open-source MVP check",
    "",
    "Usage:",
    "  npm run open-source:mvp-check -- [options]",
    "",
    "Options:",
    "  --out <dir>          Output directory under output/. Default: output/open-source-mvp-check",
    "  --timeout-ms <ms>    Gateway auto-work timeout. Default: 60000",
    "  -h, --help           Show this help.",
    "",
    "The check builds the app, runs targeted MVP tests, exercises the gateway auto-work endpoint,",
    "and runs the fixture coding loop that patches a generated repository and verifies receipts/evidence."
  ].join("\n"));
}

function printSummary(summary: OpenSourceMvpCheckSummary) {
  const passed = summary.cases.filter((item) => item.passed).length;
  const failed = summary.cases.length - passed;
  console.log("\nOpen-source MVP check: " + (summary.checks.allPassed ? "passed" : "failed"));
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Checks: ${passed} pass, ${failed} fail`);
  console.log(`Summary: ${path.resolve(summary.outputDir, "summary.json")}`);
  console.log(`Report: ${path.resolve(summary.outputDir, "summary.md")}`);
}

function summaryMarkdown(summary: OpenSourceMvpCheckSummary) {
  const lines = [
    "# Open-Source MVP Check",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Result",
    "",
    `- overall: ${summary.checks.allPassed ? "pass" : "fail"}`,
    `- build: ${summary.checks.buildPassed ? "pass" : "fail"}`,
    `- targeted tests: ${summary.checks.targetedTestsPassed ? "pass" : "fail"}`,
    `- gateway auto-work: ${summary.checks.gatewayAutoWorkPassed ? "pass" : "fail"}`,
    `- fixture coding loop: ${summary.checks.fixtureCodingLoopPassed ? "pass" : "fail"}`,
    "",
    "## Cases",
    "",
    ...summary.cases.flatMap((item) => [
      `### ${item.label}`,
      "",
      `- status: ${item.passed ? "pass" : "fail"}`,
      `- command: \`${item.commandLine}\``,
      `- exit: ${item.exitCode} (expected ${item.expectedExitCode})`,
      `- duration: ${item.durationMs} ms`,
      `- proves: ${item.proves}`,
      ""
    ]),
    "## Evidence",
    "",
    `- gateway auto-work summary: ${summary.evidence.gatewayAutoWorkSummary}`,
    `- fixture coding loop summary: ${summary.evidence.fixtureCodingLoopSummary}`,
    "",
    "## Claim Boundary",
    "",
    ...summary.claimBoundary.map((item) => `- ${item}`),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function formatCommandLine(command: string, args: string[]) {
  return [command, ...args].map(quoteShellArg).join(" ");
}

function quoteShellArg(value: string) {
  if (/^[A-Za-z0-9_./:@=+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown open-source MVP check failure.");
  process.exitCode = 1;
}
