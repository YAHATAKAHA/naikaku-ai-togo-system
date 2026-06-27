import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildExternalRunnerAdapterRegistry,
  serializeExternalRunnerAdapterRegistryMarkdown,
  type ExternalRunnerAdapterId
} from "../src/domain/externalRunnerAdapters";

interface EngineeringAdaptersOptions {
  outputDir: string;
  installedAdapterIds: ExternalRunnerAdapterId[];
  licenseReviewedAdapterIds: ExternalRunnerAdapterId[];
  approvedAdapterIds: ExternalRunnerAdapterId[];
  generatedAt: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const registry = buildExternalRunnerAdapterRegistry({
    generatedAt: options.generatedAt,
    installedAdapterIds: options.installedAdapterIds,
    licenseReviewedAdapterIds: options.licenseReviewedAdapterIds,
    approvedAdapterIds: options.approvedAdapterIds
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "adapter-registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(outputDir, "adapter-registry.md"),
    serializeExternalRunnerAdapterRegistryMarkdown(registry),
    "utf8"
  );

  console.log("Engineering adapter registry written.");
  console.log(`- output: ${relativePath(outputDir)}`);
  console.log(`- adapters: ${registry.summary.total}`);
  console.log(`- available now: ${registry.summary.availableNow}`);
  console.log(`- needs license review: ${registry.summary.needsLicenseReview}`);
  console.log(`- approval required: ${registry.summary.approvalRequired}`);
}

function parseArgs(args: string[]): EngineeringAdaptersOptions {
  const options: EngineeringAdaptersOptions = {
    outputDir: "output/engineering-adapters",
    installedAdapterIds: [],
    licenseReviewedAdapterIds: [],
    approvedAdapterIds: [],
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--out") {
      options.outputDir = args[index + 1] || options.outputDir;
      index += 1;
    } else if (arg === "--installed") {
      options.installedAdapterIds = parseAdapterIds(args[index + 1] || "");
      index += 1;
    } else if (arg === "--license-reviewed") {
      options.licenseReviewedAdapterIds = parseAdapterIds(args[index + 1] || "");
      index += 1;
    } else if (arg === "--approved") {
      options.approvedAdapterIds = parseAdapterIds(args[index + 1] || "");
      index += 1;
    } else if (arg === "--generated-at") {
      options.generatedAt = args[index + 1] || options.generatedAt;
      index += 1;
    }
  }

  return options;
}

function parseAdapterIds(value: string): ExternalRunnerAdapterId[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ExternalRunnerAdapterId[];
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:adapters",
    "",
    "Options:",
    "  --out <dir>                 Output directory. Default: output/engineering-adapters.",
    "  --installed <ids>           Comma-separated adapter ids installed by the user.",
    "  --license-reviewed <ids>    Comma-separated adapter ids whose licenses were reviewed.",
    "  --approved <ids>            Comma-separated adapter ids approved for this machine/session.",
    "  --generated-at <iso>        Stable timestamp for tests.",
    "  --help, -h                  Show this help.",
    "",
    "This command writes a machine-readable adapter registry. It does not install, launch, or grant permissions to external runners."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering adapter registry failure.");
  process.exitCode = 1;
});
