import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

interface LocalToolSmokeOptions {
  outputDir: string;
  mission: string;
  generatedAt: string;
  help: boolean;
}

interface CommandResult {
  commandLine: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface ToolProbe {
  installed: boolean;
  commandPath: string | null;
  version: string | null;
  usable: boolean;
  blockedReason: string | null;
  evidencePath: string | null;
}

interface LocalToolSmokeSummary {
  schema: "naikaku.local-tool-smoke.v1";
  generatedAt: string;
  outputDir: string;
  mission: string;
  tinyProject: {
    path: string;
    testExitCode: number;
    testPassed: boolean;
    resultPath: string;
  };
  openclaw: ToolProbe & {
    authReadable: boolean;
    providerReady: boolean;
    missingProviders: string[];
  };
  hammerspoon: ToolProbe & {
    appInstalled: boolean;
    ipcWritable: boolean;
  };
  checks: {
    tinyProjectWritten: boolean;
    tinyProjectTestsPassed: boolean;
    openclawCliDetected: boolean;
    openclawStatusReadable: boolean;
    hammerspoonDetected: boolean;
    hammerspoonIpcWritable: boolean;
    noExternalMessagesSent: boolean;
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

  const tinyProject = writeTinyCabinetProject(outputDir, options);
  const openclaw = probeOpenClaw(outputDir);
  const hammerspoon = probeHammerspoon(outputDir);
  const summary: LocalToolSmokeSummary = {
    schema: "naikaku.local-tool-smoke.v1",
    generatedAt: options.generatedAt,
    outputDir: relativePath(outputDir),
    mission: options.mission,
    tinyProject,
    openclaw,
    hammerspoon,
    checks: {
      tinyProjectWritten: existsSync(path.join(outputDir, "tiny-cabinet-project", "src", "cabinetDecision.mjs")),
      tinyProjectTestsPassed: tinyProject.testPassed,
      openclawCliDetected: openclaw.installed,
      openclawStatusReadable: openclaw.usable,
      hammerspoonDetected: hammerspoon.installed && hammerspoon.appInstalled,
      hammerspoonIpcWritable: hammerspoon.ipcWritable,
      noExternalMessagesSent: true,
      noGitOrDeploy: true
    },
    claimBoundary: [
      "This smoke writes and tests a tiny local cabinet-vote project to prove basic code generation and verification plumbing.",
      "It probes installed OpenClaw and Hammerspoon as local adapter candidates, but it does not ask either tool to send messages, push Git, deploy, or control arbitrary desktop state.",
      "OpenClaw agent execution is intentionally not attempted unless provider auth is configured; missing provider auth is reported as readiness evidence, not treated as a Naikaku bug.",
      "Hammerspoon proof is limited to a scoped command-line IPC write under output/ so desktop Automation/Accessibility permissions are not silently expanded.",
      "Real external runner work still requires a Naikaku task receipt, implementation evidence, artifact audit, and cabinet acceptance vote."
    ]
  };

  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (!summary.checks.tinyProjectTestsPassed || !summary.checks.openclawCliDetected || !summary.checks.hammerspoonIpcWritable) {
    process.exitCode = 1;
  }
}

function writeTinyCabinetProject(outputDir: string, options: LocalToolSmokeOptions) {
  const projectDir = path.join(outputDir, "tiny-cabinet-project");
  const srcDir = path.join(projectDir, "src");
  mkdirSync(srcDir, { recursive: true });

  writeFileSync(path.join(projectDir, "package.json"), `${JSON.stringify({
    name: "naikaku-tiny-cabinet-vote",
    private: true,
    type: "module",
    scripts: {
      test: "node test.mjs"
    }
  }, null, 2)}\n`, "utf8");
  writeFileSync(path.join(srcDir, "cabinetDecision.mjs"), [
    "export function decideCabinetMotion({ proposal, votes, audit }) {",
    "  const approve = votes.filter((vote) => vote.decision === 'approve').length;",
    "  const reject = votes.filter((vote) => vote.decision === 'reject').length;",
    "  const abstain = votes.filter((vote) => vote.decision === 'abstain').length;",
    "  const supervisorVeto = votes.some((vote) => vote.role === 'supervisor' && vote.decision === 'reject');",
    "  const auditBlocked = audit?.status === 'blocked';",
    "  const decision = auditBlocked || supervisorVeto ? 'blocked' : approve > reject ? 'approved' : 'revise';",
    "  return {",
    "    proposal,",
    "    tally: { approve, reject, abstain },",
    "    decision,",
    "    dissent: votes.filter((vote) => vote.decision === 'reject').map((vote) => vote.role),",
    "    reason: auditBlocked ? audit.reason : supervisorVeto ? 'supervisor-veto' : 'majority-vote'",
    "  };",
    "}",
    ""
  ].join("\n"), "utf8");
  writeFileSync(path.join(projectDir, "test.mjs"), [
    "import assert from 'node:assert/strict';",
    "import { decideCabinetMotion } from './src/cabinetDecision.mjs';",
    "",
    "const approved = decideCabinetMotion({",
    `  proposal: ${JSON.stringify(options.mission)},`,
    "  votes: [",
    "    { role: 'prime-minister', decision: 'approve' },",
    "    { role: 'executor', decision: 'approve' },",
    "    { role: 'critic', decision: 'reject' }",
    "  ],",
    "  audit: { status: 'passed' }",
    "});",
    "assert.equal(approved.decision, 'approved');",
    "assert.deepEqual(approved.tally, { approve: 2, reject: 1, abstain: 0 });",
    "assert.deepEqual(approved.dissent, ['critic']);",
    "",
    "const blocked = decideCabinetMotion({",
    "  proposal: 'Run an unapproved external tool',",
    "  votes: [",
    "    { role: 'prime-minister', decision: 'approve' },",
    "    { role: 'executor', decision: 'approve' },",
    "    { role: 'supervisor', decision: 'reject' }",
    "  ],",
    "  audit: { status: 'passed' }",
    "});",
    "assert.equal(blocked.decision, 'blocked');",
    "assert.equal(blocked.reason, 'supervisor-veto');",
    "",
    "const auditBlocked = decideCabinetMotion({",
    "  proposal: 'Send external message without approval',",
    "  votes: [{ role: 'prime-minister', decision: 'approve' }],",
    "  audit: { status: 'blocked', reason: 'external-send-needs-approval' }",
    "});",
    "assert.equal(auditBlocked.decision, 'blocked');",
    "assert.equal(auditBlocked.reason, 'external-send-needs-approval');",
    "",
    "console.log(JSON.stringify({ approved, blocked, auditBlocked }, null, 2));",
    ""
  ].join("\n"), "utf8");

  const test = runCommand("node", ["test.mjs"], projectDir);
  const resultPath = path.join(projectDir, "test-output.json");
  writeFileSync(resultPath, test.stdout || test.stderr, "utf8");

  return {
    path: relativePath(projectDir),
    testExitCode: test.exitCode,
    testPassed: test.exitCode === 0,
    resultPath: relativePath(resultPath)
  };
}

function probeOpenClaw(outputDir: string): LocalToolSmokeSummary["openclaw"] {
  const commandPath = which("openclaw");
  if (!commandPath) {
    return {
      installed: false,
      commandPath: null,
      version: null,
      usable: false,
      blockedReason: "openclaw command was not found in PATH.",
      evidencePath: null,
      authReadable: false,
      providerReady: false,
      missingProviders: []
    };
  }

  const version = runCommand("openclaw", ["--version"], process.cwd());
  const status = runCommand("openclaw", ["status", "--json"], process.cwd());
  const models = runCommand("openclaw", ["models", "status", "--json"], process.cwd());
  const evidencePath = path.join(outputDir, "openclaw-status.json");
  writeFileSync(evidencePath, JSON.stringify({
    commandPath,
    version: cleanOneLine(version.stdout || version.stderr),
    status: parseJsonOrText(status.stdout || status.stderr),
    models: parseJsonOrText(models.stdout || models.stderr)
  }, null, 2) + "\n", "utf8");
  const modelJson = parseJsonOrText(models.stdout || models.stderr) as {
    auth?: {
      missingProvidersInUse?: string[];
    };
  };
  const missingProviders = Array.isArray(modelJson?.auth?.missingProvidersInUse)
    ? modelJson.auth.missingProvidersInUse.filter((item) => typeof item === "string")
    : [];

  return {
    installed: true,
    commandPath,
    version: cleanOneLine(version.stdout || version.stderr),
    usable: status.exitCode === 0 && models.exitCode === 0,
    blockedReason: missingProviders.length
      ? `OpenClaw provider auth missing for: ${missingProviders.join(", ")}.`
      : null,
    evidencePath: relativePath(evidencePath),
    authReadable: models.exitCode === 0,
    providerReady: missingProviders.length === 0,
    missingProviders
  };
}

function probeHammerspoon(outputDir: string): LocalToolSmokeSummary["hammerspoon"] {
  const commandPath = which("hs");
  const appInstalled = existsSync("/Applications/Hammerspoon.app");
  if (!commandPath) {
    return {
      installed: false,
      commandPath: null,
      version: null,
      usable: false,
      blockedReason: "hs command was not found in PATH.",
      evidencePath: null,
      appInstalled,
      ipcWritable: false
    };
  }

  if (process.platform === "darwin" && appInstalled) {
    runCommand("open", ["-ga", "Hammerspoon"], process.cwd());
  }
  const proofPath = path.join(outputDir, "hammerspoon-proof.txt");
  const lua = [
    `local f, err = io.open(${JSON.stringify(proofPath)}, "w")`,
    "if not f then return 'error:' .. tostring(err) end",
    "f:write('hammerspoon wrote this through hs ipc\\n')",
    "f:close()",
    `return 'wrote:${proofPath}'`
  ].join("; ");
  const ipc = runCommand("hs", ["-A", "-c", lua], process.cwd());

  return {
    installed: true,
    commandPath,
    version: null,
    usable: ipc.exitCode === 0 && existsSync(proofPath),
    blockedReason: ipc.exitCode === 0
      ? null
      : "Hammerspoon IPC was not reachable. Open Hammerspoon once and ensure hs.ipc.cliInstall() is loaded in ~/.hammerspoon/init.lua.",
    evidencePath: existsSync(proofPath) ? relativePath(proofPath) : null,
    appInstalled,
    ipcWritable: ipc.exitCode === 0 && existsSync(proofPath)
  };
}

function runCommand(command: string, args: string[], cwd: string): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024 * 4,
    shell: false
  });

  return {
    commandLine: [command, ...args].join(" "),
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || ""
  };
}

function which(command: string) {
  const result = runCommand(process.platform === "win32" ? "where" : "which", [command], process.cwd());
  if (result.exitCode !== 0) return null;
  return result.stdout.split(/\r?\n/).find(Boolean) || null;
}

function parseJsonOrText(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { text: value.trim() };
  }
}

function cleanOneLine(value: string) {
  return value.trim().split(/\r?\n/)[0] || null;
}

function summaryMarkdown(summary: LocalToolSmokeSummary) {
  return [
    "# Local Tool Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    `Mission: ${summary.mission}`,
    "",
    "## Tiny Project",
    "",
    `- path: ${summary.tinyProject.path}`,
    `- test: ${summary.tinyProject.testPassed ? "pass" : "fail"} (${summary.tinyProject.testExitCode})`,
    `- result: ${summary.tinyProject.resultPath}`,
    "",
    "## Tools",
    "",
    `- OpenClaw: ${summary.openclaw.installed ? "installed" : "missing"}; usable=${summary.openclaw.usable}; providerReady=${summary.openclaw.providerReady}`,
    `- OpenClaw evidence: ${summary.openclaw.evidencePath || "none"}`,
    `- Hammerspoon: ${summary.hammerspoon.installed ? "installed" : "missing"}; app=${summary.hammerspoon.appInstalled}; ipcWritable=${summary.hammerspoon.ipcWritable}`,
    `- Hammerspoon evidence: ${summary.hammerspoon.evidencePath || "none"}`,
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

function printSummary(summary: LocalToolSmokeSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;
  console.log("Local tool smoke: " + (failed === 0 ? "passed" : "needs-review"));
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- tiny project: ${summary.tinyProject.testPassed ? "pass" : "fail"}`);
  console.log(`- openclaw: ${summary.openclaw.installed ? summary.openclaw.version || "installed" : "missing"}`);
  console.log(`- openclaw auth: ${summary.openclaw.providerReady ? "ready" : summary.openclaw.blockedReason || "not-ready"}`);
  console.log(`- hammerspoon ipc: ${summary.hammerspoon.ipcWritable ? "wrote proof" : summary.hammerspoon.blockedReason || "not-ready"}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): LocalToolSmokeOptions {
  const options: LocalToolSmokeOptions = {
    outputDir: "output/local-tool-smoke",
    mission: "Use a cabinet vote with audit and supervisor dissent to decide whether an external runner may execute.",
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
    "  npm run local-tools:smoke",
    "  npm run local-tools:smoke -- --mission \"Use OpenClaw and Hammerspoon as governed runners\"",
    "",
    "This writes a tiny cabinet-vote project, runs its tests, probes OpenClaw readiness,",
    "and asks Hammerspoon to write a scoped proof file under output/ through hs IPC.",
    "It does not send messages, control arbitrary desktop state, push Git, deploy, or call model providers."
  ].join("\n"));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown local tool smoke failure.");
  process.exitCode = 1;
}
