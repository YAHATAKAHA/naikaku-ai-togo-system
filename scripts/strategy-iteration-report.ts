import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildStrategyIterationReport,
  serializeStrategyIterationReport,
  serializeStrategyIterationReportMarkdown
} from "../src/domain/strategyIterations";

interface Options {
  outputDir: string;
  generatedAt?: string;
}

const evidenceFiles = [
  "README.md",
  "README.ja.md",
  "docs/architecture.md",
  "docs/localization.md",
  "src/domain/dataAccessPolicy.ts",
  "src/domain/productReadiness.ts",
  "src/components/RoleInspector.tsx",
  "docs/security-sandbox.md",
  "Dockerfile",
  "compose.yaml",
  "docs/deployment.md",
  "docs/deployment.ja.md",
  "COMMERCIAL-LICENSE.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/deployment-readiness.md",
  "PUBLIC-SOURCE-SCOPE.md",
  "docs/strategy-iterations.md",
  "docs/adr/README.md",
  "docs/adr/0001-strategy-iteration-gate.md",
  "docs/releases/v0.1.0.md"
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  const documents = Object.fromEntries(
    evidenceFiles.map((file) => [file, readOptional(file)])
  );
  const report = buildStrategyIterationReport({
    documents,
    packageScripts: packageJson.scripts || {},
    generatedAt: options.generatedAt
  });

  mkdirSync(options.outputDir, { recursive: true });
  const jsonPath = path.join(options.outputDir, "strategy-iterations.json");
  const markdownPath = path.join(options.outputDir, "strategy-iterations.md");
  writeFileSync(jsonPath, serializeStrategyIterationReport(report));
  writeFileSync(markdownPath, serializeStrategyIterationReportMarkdown(report));

  console.log(`Naikaku strategy iterations: ${report.decision}`);
  console.log(`Output: ${options.outputDir}`);
  console.log(`Iterations: ${report.summary.passed}/${report.summary.total} pass, ${report.summary.warnings} warn, ${report.summary.blockers} block`);
  report.iterations.forEach((iteration, index) => {
    console.log(`- ${index + 1}. ${iteration.id}: ${iteration.status}`);
  });

  if (report.decision === "blocked") {
    process.exit(1);
  }
}

function readOptional(file: string) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    outputDir: "output/strategy-iterations"
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
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
    if (arg === "--help" || arg === "-h") {
      console.log(`Naikaku strategy iteration report

Usage:
  npm run strategy:iterate -- [options]

Options:
  --out <dir>             Output directory. Default: output/strategy-iterations
  --generated-at <iso>    Override report timestamp.
`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown strategy iteration failure.");
  process.exit(1);
});
