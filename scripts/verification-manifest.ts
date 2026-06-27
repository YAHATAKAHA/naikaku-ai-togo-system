import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildVerificationManifest,
  serializeVerificationManifest
} from "../src/domain/verificationManifest";
import type {
  CodingAgentDispatchDrillSummary,
  CodingAgentDispatchSimulationSummary,
  CodingAgentReceiptDrillSummary,
  CodingAgentRunnerInvocationDrillSummary,
  CodingAgentRunnerManifestDrillSummary,
  CodingAgentRunnerSelfTestDrillSummary,
  CodingAgentSandboxRunnerDrillSummary,
  ExecutorContractDrillSummary,
  LocalizationDrillSummary,
  ProductionBoundaryDrillSummary,
  ReleaseVerificationReport,
  VerificationManifest
} from "../src/domain/types";

interface VerificationManifestOptions {
  codingAgentDispatchPath: string;
  codingAgentSimulationPath: string;
  codingAgentRunnerManifestPath: string;
  codingAgentRunnerInvocationPath: string;
  codingAgentRunnerSelfTestPath: string;
  codingAgentSandboxRunnerPath: string;
  codingAgentReportPath: string;
  localizationDrillPath: string;
  executorContractDrillPath: string;
  productionBoundaryDrillPath: string;
  releaseVerificationPath: string;
  outputPath: string;
  generatedAt?: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const codingAgentDispatchDrill = await loadCodingAgentDispatchDrill(options.codingAgentDispatchPath);
  const codingAgentDispatchSimulation = await loadCodingAgentDispatchSimulation(options.codingAgentSimulationPath);
  const codingAgentRunnerManifest = await loadCodingAgentRunnerManifest(options.codingAgentRunnerManifestPath);
  const codingAgentRunnerInvocation = await loadCodingAgentRunnerInvocation(options.codingAgentRunnerInvocationPath);
  const codingAgentRunnerSelfTest = await loadCodingAgentRunnerSelfTest(options.codingAgentRunnerSelfTestPath);
  const codingAgentSandboxRunner = await loadCodingAgentSandboxRunner(options.codingAgentSandboxRunnerPath);
  const codingAgentReport = await loadCodingAgentReport(options.codingAgentReportPath);
  const localizationDrill = await loadLocalizationDrill(options.localizationDrillPath);
  const executorContractDrill = await loadExecutorContractDrill(options.executorContractDrillPath);
  const productionBoundaryDrill = await loadProductionBoundaryDrill(options.productionBoundaryDrillPath);
  const releaseVerification = await loadReleaseVerification(options.releaseVerificationPath);
  const manifest = buildVerificationManifest({
    codingAgentDispatchDrill,
    codingAgentDispatchSimulation,
    codingAgentRunnerManifest,
    codingAgentRunnerInvocation,
    codingAgentRunnerSelfTest,
    codingAgentSandboxRunner,
    codingAgentReport,
    localizationDrill,
    executorContractDrill,
    productionBoundaryDrill,
    releaseVerification,
    generatedAt: options.generatedAt,
    inputs: {
      codingAgentDispatchDrill: options.codingAgentDispatchPath,
      codingAgentDispatchSimulation: options.codingAgentSimulationPath,
      codingAgentRunnerManifest: options.codingAgentRunnerManifestPath,
      codingAgentRunnerInvocation: options.codingAgentRunnerInvocationPath,
      codingAgentRunnerSelfTest: options.codingAgentRunnerSelfTestPath,
      codingAgentSandboxRunner: options.codingAgentSandboxRunnerPath,
      codingAgentReceiptDrill: options.codingAgentReportPath,
      localizationDrill: options.localizationDrillPath,
      executorContractDrill: options.executorContractDrillPath,
      productionBoundaryDrill: options.productionBoundaryDrillPath,
      releaseVerification: options.releaseVerificationPath
    }
  });

  await writeManifest(manifest, options.outputPath);
  printSummary(manifest, options.outputPath);

  if (manifest.decision !== "verified") {
    process.exitCode = 2;
  }
}

async function loadCodingAgentReport(reportPath: string): Promise<CodingAgentReceiptDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentReceiptDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-receipt-drill.v1") {
    throw new Error("Coding-agent report must use schema naikaku.coding-agent-receipt-drill.v1.");
  }
  return parsed;
}

async function loadCodingAgentDispatchDrill(reportPath: string): Promise<CodingAgentDispatchDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentDispatchDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-dispatch-drill.v1") {
    throw new Error("Coding-agent dispatch drill must use schema naikaku.coding-agent-dispatch-drill.v1.");
  }
  return parsed;
}

async function loadCodingAgentDispatchSimulation(reportPath: string): Promise<CodingAgentDispatchSimulationSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentDispatchSimulationSummary;
  if (parsed.schema !== "naikaku.coding-agent-dispatch-simulation.v1") {
    throw new Error("Coding-agent dispatch simulation must use schema naikaku.coding-agent-dispatch-simulation.v1.");
  }
  return parsed;
}

async function loadCodingAgentRunnerManifest(reportPath: string): Promise<CodingAgentRunnerManifestDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentRunnerManifestDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-runner-manifest-drill.v1") {
    throw new Error("Coding-agent runner manifest must use schema naikaku.coding-agent-runner-manifest-drill.v1.");
  }
  return parsed;
}

async function loadCodingAgentRunnerInvocation(reportPath: string): Promise<CodingAgentRunnerInvocationDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentRunnerInvocationDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-runner-invocation-drill.v1") {
    throw new Error("Coding-agent runner invocation must use schema naikaku.coding-agent-runner-invocation-drill.v1.");
  }
  return parsed;
}

async function loadCodingAgentRunnerSelfTest(reportPath: string): Promise<CodingAgentRunnerSelfTestDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentRunnerSelfTestDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-runner-self-test-drill.v1") {
    throw new Error("Coding-agent runner self-test must use schema naikaku.coding-agent-runner-self-test-drill.v1.");
  }
  return parsed;
}

async function loadCodingAgentSandboxRunner(reportPath: string): Promise<CodingAgentSandboxRunnerDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as CodingAgentSandboxRunnerDrillSummary;
  if (parsed.schema !== "naikaku.coding-agent-sandbox-runner-drill.v1") {
    throw new Error("Coding-agent sandbox runner must use schema naikaku.coding-agent-sandbox-runner-drill.v1.");
  }
  return parsed;
}

async function loadLocalizationDrill(reportPath: string): Promise<LocalizationDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as LocalizationDrillSummary;
  if (parsed.schema !== "naikaku.localization-drill.v1") {
    throw new Error("Localization drill must use schema naikaku.localization-drill.v1.");
  }
  return parsed;
}

async function loadExecutorContractDrill(reportPath: string): Promise<ExecutorContractDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as ExecutorContractDrillSummary;
  if (parsed.schema !== "naikaku.executor-contract-drill.v1") {
    throw new Error("Executor contract drill must use schema naikaku.executor-contract-drill.v1.");
  }
  return parsed;
}

async function loadProductionBoundaryDrill(reportPath: string): Promise<ProductionBoundaryDrillSummary> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as ProductionBoundaryDrillSummary;
  if (parsed.schema !== "naikaku.production-boundary-drill.v1") {
    throw new Error("Production boundary drill must use schema naikaku.production-boundary-drill.v1.");
  }
  return parsed;
}

async function loadReleaseVerification(reportPath: string): Promise<ReleaseVerificationReport> {
  const parsed = JSON.parse(await readFile(reportPath, "utf8")) as ReleaseVerificationReport;
  if (parsed.schema !== "naikaku.release-verification.v1") {
    throw new Error("Release verification must use schema naikaku.release-verification.v1.");
  }
  return parsed;
}

async function writeManifest(manifest: VerificationManifest, outputPath: string) {
  const absolutePath = path.resolve(outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${serializeVerificationManifest(manifest)}\n`, "utf8");
}

function printSummary(manifest: VerificationManifest, outputPath: string) {
  console.log(`Verification manifest: ${manifest.decision}`);
  console.log(`Checks: ${manifest.summary.passed} pass, ${manifest.summary.failed} fail`);
  console.log(`Report: ${path.resolve(outputPath)}`);
  console.log("");

  for (const check of manifest.checks) {
    console.log(`[${check.status}] ${check.id}: ${check.summary}`);
    console.log(`  Next: ${check.nextAction}`);
  }
}

function parseArgs(args: string[]): VerificationManifestOptions {
  const options: VerificationManifestOptions = {
    codingAgentDispatchPath: "output/coding-agent-dispatch-drill/summary.json",
    codingAgentSimulationPath: "output/coding-agent-dispatch-simulation/summary.json",
    codingAgentRunnerManifestPath: "output/coding-agent-runner-manifest/summary.json",
    codingAgentRunnerInvocationPath: "output/coding-agent-runner-invocation/summary.json",
    codingAgentRunnerSelfTestPath: "output/coding-agent-runner-self-test/summary.json",
    codingAgentSandboxRunnerPath: "output/coding-agent-sandbox-runner/summary.json",
    codingAgentReportPath: "output/coding-agent-receipt-drill/summary.json",
    localizationDrillPath: "output/localization-drill/summary.json",
    executorContractDrillPath: "output/executor-contract-drill/summary.json",
    productionBoundaryDrillPath: "output/verification/production-boundary-latest.json",
    releaseVerificationPath: "output/rehearsal-drill/release-verification-latest.json",
    outputPath: "output/verification/verification-manifest-latest.json",
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--coding-agent-report") {
      options.codingAgentReportPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--coding-agent-dispatch") {
      options.codingAgentDispatchPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--coding-agent-simulation") {
      options.codingAgentSimulationPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--coding-agent-runner-manifest") {
      options.codingAgentRunnerManifestPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--coding-agent-runner-invocation") {
      options.codingAgentRunnerInvocationPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--coding-agent-runner-self-test") {
      options.codingAgentRunnerSelfTestPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--coding-agent-sandbox-runner") {
      options.codingAgentSandboxRunnerPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--localization-drill") {
      options.localizationDrillPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--executor-contract-drill") {
      options.executorContractDrillPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--production-boundary-drill") {
      options.productionBoundaryDrillPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--release-verification") {
      options.releaseVerificationPath = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.outputPath = requireValue(args, index, arg);
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
  console.log(`Naikaku verification manifest

Usage:
  npm run verification:manifest -- [options]

Options:
  --coding-agent-dispatch <path>
                                  Read coding-agent dispatch drill summary.
  --coding-agent-simulation <path>
                                  Read coding-agent dispatch simulation summary.
  --coding-agent-runner-manifest <path>
                                  Read coding-agent runner manifest summary.
  --coding-agent-runner-invocation <path>
                                  Read coding-agent runner invocation summary.
  --coding-agent-runner-self-test <path>
                                  Read coding-agent runner self-test summary.
  --coding-agent-sandbox-runner <path>
                                  Read coding-agent sandbox runner summary.
  --coding-agent-report <path>   Read coding-agent receipt drill summary.
  --localization-drill <path>    Read localization drill summary.
  --executor-contract-drill <path>
                                  Read executor contract drill summary.
  --production-boundary-drill <path>
                                  Read production boundary drill summary.
  --release-verification <path>  Read release verification JSON.
  --out <path>                   Write naikaku.verification-manifest.v1 JSON.
  --generated-at <iso>           Use a stable timestamp.
  --help                         Show this help.

Exit codes:
  0  All local verification gates are proven by the referenced reports.
  2  One or more manifest checks failed.
`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown verification manifest failure.");
  process.exitCode = 1;
});
