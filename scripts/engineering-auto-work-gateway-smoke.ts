import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

interface EngineeringAutoWorkGatewaySmokeOptions {
  outputDir: string;
  timeoutMs: number;
  help: boolean;
}

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
  raw: string;
}

interface AutoWorkGatewayBody {
  ok?: boolean;
  preset?: string;
  outputDir?: string;
  checks?: {
    pass?: number;
    fail?: number;
  };
  command?: {
    args?: string[];
  };
  summary?: {
    mode?: string;
    counts?: {
      adapterCompletedJobs?: number;
      importedReceipts?: number;
      acceptedEvidence?: number;
      verifiedArtifactPaths?: number;
    };
  };
}

interface RunnerReadinessBody {
  summary?: {
    total?: number;
    ready?: number;
    detected?: number;
    launchableFromWorkbench?: number;
  };
  items?: Array<{
    adapterId?: string;
    status?: string;
    canLaunchFromWorkbench?: boolean;
    workbenchPreset?: string | null;
  }>;
}

interface RunnerPresetsBody {
  configPath?: string;
  summary?: {
    total?: number;
    builtIn?: number;
    configured?: number;
    availableInWorkbench?: number;
    errors?: number;
  };
  presets?: Array<{
    id?: string;
    kind?: string;
    source?: string;
    availableInWorkbench?: boolean;
  }>;
  templates?: Array<{
    id?: string;
    enabled?: boolean;
  }>;
}

interface RunnerPresetEnableBody {
  ok?: boolean;
  status?: string;
  templateId?: string;
  configPath?: string;
  preset?: {
    id?: string;
    source?: string;
  } | null;
  registry?: RunnerPresetsBody;
}

interface GatewaySmokeSummary {
  schema: "naikaku.engineering-auto-work-gateway-smoke.v1";
  generatedAt: string;
  outputDir: string;
  gatewayUrl: string;
  cases: {
    healthStatus: number;
    presetsStatus: number;
    presetEnableStatus: number;
    presetEnableResult: string | null;
    presetEnablePreset: string | null;
    presetEnableTemplates: string[];
    presetEnabledPresets: string[];
    presetsTotal: number;
    presetsBuiltIn: number;
    presetsConfigured: number;
    readinessStatus: number;
    readinessTotal: number;
    readinessReady: number;
    readinessDetected: number;
    readinessLaunchable: number;
    autoWorkStatus: number;
    autoWorkPreset: string | null;
    autoWorkMode: string | null;
    adapterCompletedJobs: number;
    importedReceipts: number;
    acceptedEvidence: number;
    verifiedArtifactPaths: number;
    checksPass: number;
    checksFail: number;
  };
  checks: {
    healthOk: boolean;
    capabilityAdvertised: boolean;
    presetsCapabilityAdvertised: boolean;
    presetEnableCapabilityAdvertised: boolean;
    presetsEndpointOk: boolean;
    presetEnableEndpointOk: boolean;
    safePresetTemplateEnabled: boolean;
    safeCodingRunnerTemplatesEnabled: boolean;
    builtInPresetsAvailable: boolean;
    readinessCapabilityAdvertised: boolean;
    readinessEndpointOk: boolean;
    localRunnerReady: boolean;
    launchableRunnerAvailable: boolean;
    autoWorkCompleted: boolean;
    fixturePresetUsed: boolean;
    externalRunAttempted: boolean;
    receiptImported: boolean;
    evidenceAccepted: boolean;
    artifactAuditVerified: boolean;
    noBrowserShellOverride: boolean;
  };
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const generatedAt = new Date().toISOString();
  const outputDir = path.resolve(options.outputDir);
  const presetConfigPath = path.join(outputDir, "engineering-runner-presets.json");
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const port = await getAvailablePort();
  const gatewayUrl = `http://127.0.0.1:${port}`;
  const gateway = await startGateway({ port, timeoutMs: options.timeoutMs, presetConfigPath });

  try {
    const health = await getJson<{ capabilities?: string[] }>(`${gatewayUrl}/health`);
    const presets = await getJson<RunnerPresetsBody>(`${gatewayUrl}/v1/engineering/runner-presets`);
    const safeTemplateIds = ["codex-cli-local", "claude-code-local", "openclaw-local"];
    const presetEnables: Array<JsonResponse<RunnerPresetEnableBody>> = [];
    for (const templateId of safeTemplateIds) {
      presetEnables.push(await postJson<RunnerPresetEnableBody>(
        `${gatewayUrl}/v1/engineering/runner-presets/enable`,
        { templateId }
      ));
    }
    const presetEnable = presetEnables[presetEnables.length - 1];
    const enabledPresetRegistry = presetEnable?.body.registry || presets.body;
    const readiness = await getJson<RunnerReadinessBody>(`${gatewayUrl}/v1/engineering/runner-readiness`);
    const autoWork = await postJson<AutoWorkGatewayBody>(
      `${gatewayUrl}/v1/engineering/auto-work`,
      {
        mission: "Gateway smoke: run fixture auto-work through the web endpoint",
        locale: "zh-Hans",
        runnerPreset: "fixture",
        adapterReady: true,
        worktree: "output/engineering-auto-work-ui/fixture-worktree",
        timeoutMs: options.timeoutMs
      }
    );
    const counts = autoWork.body.summary?.counts || {};
    const commandArgs = autoWork.body.command?.args || [];
    const presetSummary = enabledPresetRegistry.summary || {};
    const presetItems = enabledPresetRegistry.presets || [];
    const presetTemplates = enabledPresetRegistry.templates || [];
    const readinessSummary = readiness.body.summary || {};
    const readinessItems = readiness.body.items || [];
    const localRunner = readinessItems.find((item) =>
      item.adapterId === "naikaku-local-engineering-runner"
    );
    const summary: GatewaySmokeSummary = {
      schema: "naikaku.engineering-auto-work-gateway-smoke.v1",
      generatedAt,
      outputDir: relativePath(outputDir),
      gatewayUrl,
      cases: {
        healthStatus: health.status,
        presetsStatus: presets.status,
        presetEnableStatus: presetEnables.every((item) => item.status === 200 && item.body.ok === true)
          ? 200
          : presetEnable?.status || 0,
        presetEnableResult: presetEnables.map((item) => item.body.status || "unknown").join(", ") || null,
        presetEnablePreset: presetEnable?.body.preset?.id || null,
        presetEnableTemplates: safeTemplateIds,
        presetEnabledPresets: presetEnables
          .map((item) => item.body.preset?.id)
          .filter((id): id is string => Boolean(id)),
        presetsTotal: presetSummary.total || 0,
        presetsBuiltIn: presetSummary.builtIn || 0,
        presetsConfigured: presetSummary.configured || 0,
        readinessStatus: readiness.status,
        readinessTotal: readinessSummary.total || 0,
        readinessReady: readinessSummary.ready || 0,
        readinessDetected: readinessSummary.detected || 0,
        readinessLaunchable: readinessSummary.launchableFromWorkbench || 0,
        autoWorkStatus: autoWork.status,
        autoWorkPreset: autoWork.body.preset || null,
        autoWorkMode: autoWork.body.summary?.mode || null,
        adapterCompletedJobs: counts.adapterCompletedJobs || 0,
        importedReceipts: counts.importedReceipts || 0,
        acceptedEvidence: counts.acceptedEvidence || 0,
        verifiedArtifactPaths: counts.verifiedArtifactPaths || 0,
        checksPass: autoWork.body.checks?.pass || 0,
        checksFail: autoWork.body.checks?.fail || 0
      },
      checks: {
        healthOk: health.status === 200,
        capabilityAdvertised: Boolean(health.body.capabilities?.includes("engineering-auto-work")),
        presetsCapabilityAdvertised: Boolean(health.body.capabilities?.includes("engineering-runner-presets")),
        presetEnableCapabilityAdvertised: Boolean(health.body.capabilities?.includes("engineering-runner-preset-enable")),
        presetsEndpointOk: presets.status === 200,
        presetEnableEndpointOk: presetEnables.length === safeTemplateIds.length &&
          presetEnables.every((item) => item.status === 200 && item.body.ok === true),
        safePresetTemplateEnabled: presetEnable?.body.preset?.id === "openclaw-local" &&
          presetEnable.body.preset?.source === "file" &&
          presetTemplates.some((template) => template.id === "openclaw-local" && template.enabled === true) &&
          presetItems.some((preset) => preset.id === "openclaw-local" && preset.source === "file"),
        safeCodingRunnerTemplatesEnabled: ["codex-cli-local", "claude-code-local"].every((id) =>
          presetTemplates.some((template) => template.id === id && template.enabled === true) &&
          presetItems.some((preset) => preset.id === id && preset.source === "file")
        ),
        builtInPresetsAvailable: ["prepared", "fixture", "openhands"].every((id) =>
          presetItems.some((preset) => preset.id === id && preset.availableInWorkbench === true)
        ),
        readinessCapabilityAdvertised: Boolean(health.body.capabilities?.includes("engineering-runner-readiness")),
        readinessEndpointOk: readiness.status === 200,
        localRunnerReady: localRunner?.status === "ready" && localRunner.canLaunchFromWorkbench === true,
        launchableRunnerAvailable: (readinessSummary.launchableFromWorkbench || 0) >= 1,
        autoWorkCompleted: autoWork.status === 200 && autoWork.body.ok === true,
        fixturePresetUsed: autoWork.body.preset === "fixture",
        externalRunAttempted: autoWork.body.summary?.mode === "external-run-attempted",
        receiptImported: (counts.importedReceipts || 0) >= 1,
        evidenceAccepted: (counts.acceptedEvidence || 0) >= 1,
        artifactAuditVerified: (counts.verifiedArtifactPaths || 0) >= 1,
        noBrowserShellOverride: !commandArgs.includes("--command")
      }
    };

    await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

    printSummary(summary);

    if (!Object.values(summary.checks).every(Boolean)) {
      process.exitCode = 1;
    }
  } finally {
    await stopGateway(gateway);
  }
}

function parseArgs(args: string[]): EngineeringAutoWorkGatewaySmokeOptions {
  const options: EngineeringAutoWorkGatewaySmokeOptions = {
    outputDir: "output/engineering-auto-work-gateway-smoke",
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
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
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

function printHelp() {
  console.log([
    "Usage:",
    "  npm run engineering:auto-work-gateway-smoke",
    "",
    "Options:",
    "  --out <dir>          Output directory. Default: output/engineering-auto-work-gateway-smoke.",
    "  --timeout-ms <ms>    Adapter timeout. Default: 60000."
  ].join("\n"));
}

async function getAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate test gateway port."));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function startGateway({
  port,
  timeoutMs,
  presetConfigPath
}: {
  port: number;
  timeoutMs: number;
  presetConfigPath: string;
}) {
  const child = spawn(npmCommand, ["run", "gateway"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NAIKAKU_GATEWAY_PORT: String(port),
      NAIKAKU_CORS_ORIGIN: "http://127.0.0.1:5173",
      NAIKAKU_ENGINEERING_RUNNER_PRESETS_FILE: presetConfigPath
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  const startedAt = Date.now();
  let lastError: unknown;
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Gateway exited early with code ${child.exitCode}.`);
    }
    try {
      await getJson(`http://127.0.0.1:${port}/health`);
      return child;
    } catch (error) {
      lastError = error;
      await delay(150);
    }
  }

  await stopGateway(child);
  throw new Error(`Gateway did not become ready. ${lastError instanceof Error ? lastError.message : ""}`);
}

async function stopGateway(child: ChildProcess) {
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
      resolve();
    }, 2_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function getJson<T>(url: string): Promise<JsonResponse<T>> {
  const response = await fetch(url);
  const raw = await response.text();
  return {
    status: response.status,
    body: raw ? JSON.parse(raw) as T : {} as T,
    raw
  };
}

async function postJson<T>(url: string, body: unknown): Promise<JsonResponse<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const raw = await response.text();
  return {
    status: response.status,
    body: raw ? JSON.parse(raw) as T : {} as T,
    raw
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printSummary(summary: GatewaySmokeSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).filter((value) => !value).length;
  console.log("Engineering auto-work gateway smoke: " + (failed === 0 ? "passed" : "failed"));
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Gateway: ${summary.gatewayUrl}`);
  console.log(`Runner presets: ${summary.cases.presetsBuiltIn} built-in, ${summary.cases.presetsConfigured} configured`);
  console.log(`Preset enable: ${summary.cases.presetEnableResult || "unknown"} / ${summary.cases.presetEnabledPresets.join(", ") || "unknown"}`);
  console.log(`Runner readiness: ${summary.cases.readinessReady}/${summary.cases.readinessTotal} ready, ${summary.cases.readinessLaunchable} launchable`);
  console.log(`Auto-work: ${summary.cases.autoWorkPreset || "unknown"} / ${summary.cases.autoWorkMode || "unknown"}`);
  console.log(`Receipts: ${summary.cases.importedReceipts}, evidence: ${summary.cases.acceptedEvidence}, artifacts: ${summary.cases.verifiedArtifactPaths}`);
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

function summaryMarkdown(summary: GatewaySmokeSummary) {
  const lines = [
    "# Engineering Auto-Work Gateway Smoke",
    "",
    `Generated: ${summary.generatedAt}`,
    `Gateway: ${summary.gatewayUrl}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Cases",
    "",
    `- health: HTTP ${summary.cases.healthStatus}`,
    `- runner-presets: HTTP ${summary.cases.presetsStatus}`,
    `- runner-preset-enable: HTTP ${summary.cases.presetEnableStatus}`,
    `- runner-preset-enable result: ${summary.cases.presetEnableResult || "unknown"} / ${summary.cases.presetEnabledPresets.join(", ") || "unknown"}`,
    `- runner-preset-enable templates: ${summary.cases.presetEnableTemplates.join(", ")}`,
    `- runner presets: ${summary.cases.presetsBuiltIn} built-in, ${summary.cases.presetsConfigured} configured, ${summary.cases.presetsTotal} total`,
    `- runner-readiness: HTTP ${summary.cases.readinessStatus}`,
    `- runner readiness: ${summary.cases.readinessReady}/${summary.cases.readinessTotal} ready, ${summary.cases.readinessDetected} detected, ${summary.cases.readinessLaunchable} launchable`,
    `- auto-work: HTTP ${summary.cases.autoWorkStatus}`,
    `- preset: ${summary.cases.autoWorkPreset || "unknown"}`,
    `- mode: ${summary.cases.autoWorkMode || "unknown"}`,
    `- completed jobs: ${summary.cases.adapterCompletedJobs}`,
    `- imported receipts: ${summary.cases.importedReceipts}`,
    `- accepted evidence: ${summary.cases.acceptedEvidence}`,
    `- verified artifact paths: ${summary.cases.verifiedArtifactPaths}`,
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([key, value]) => `- ${value ? "pass" : "fail"}: ${key}`),
    ""
  ];
  return `${lines.join("\n")}\n`;
}

function relativePath(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/") || ".";
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown gateway smoke failure.");
  process.exitCode = 1;
});
