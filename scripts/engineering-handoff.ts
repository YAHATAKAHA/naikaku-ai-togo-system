import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildExternalRunnerAdapterRegistry,
  externalRunnerAdapterIds,
  type ExternalRunnerAdapterId,
  type ExternalRunnerAdapterRegistry
} from "../src/domain/externalRunnerAdapters";
import {
  buildExternalRunnerAdapterJob,
  buildExternalRunnerHandoff,
  serializeExternalRunnerAdapterJob,
  serializeExternalRunnerHandoff,
  serializeExternalRunnerHandoffMarkdown,
  serializeExternalRunnerHandoffTaskMarkdown
} from "../src/domain/externalRunnerHandoff";
import type {
  CodingAgentRunnerInvocationPackage,
  CodingAgentSessionBundle
} from "../src/domain/types";

interface EngineeringHandoffOptions {
  inputDir: string;
  outputDir: string;
  adapterId: ExternalRunnerAdapterId;
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

  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativePath(outputDir);
  const runnerInvocation = await readJson<CodingAgentRunnerInvocationPackage>(
    path.join(inputDir, "runner-invocation.json")
  );
  const adapterRegistry = await registryFor({
    inputDir,
    options
  });
  const handoff = buildExternalRunnerHandoff({
    adapterRegistry,
    runnerInvocation,
    adapterId: options.adapterId,
    outputDir: outputRelativeDir,
    generatedAt: options.generatedAt
  });

  const sessionBundle = await readJsonIfExists<CodingAgentSessionBundle>(
    path.join(inputDir, "session-bundle.json")
  );
  const promptBySessionId = new Map(
    (sessionBundle?.sessions ?? []).map((session) => [session.id, session.handoffMarkdown])
  );

  await mkdir(outputDir, { recursive: true });
  await mkdir(path.join(outputDir, "tasks"), { recursive: true });
  await mkdir(path.join(outputDir, "jobs"), { recursive: true });
  await mkdir(path.join(outputDir, "prompts"), { recursive: true });
  await writeFile(path.join(outputDir, "summary.json"), `${serializeExternalRunnerHandoff(handoff)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), serializeExternalRunnerHandoffMarkdown(handoff), "utf8");

  let promptFilesWritten = 0;
  let promptFilesMissing = 0;

  for (const task of handoff.tasks) {
    if (!task.taskPath) continue;
    // A task file without its prompt on disk is not dispatchable: the runner is told to read a
    // prompt path, so the prompt has to exist before the task claims ready-for-adapter.
    if (task.promptPath) {
      const prompt = promptBySessionId.get(task.sessionId);
      if (prompt) {
        await writeFile(resolveOutputPath(task.promptPath), prompt.endsWith("\n") ? prompt : `${prompt}\n`, "utf8");
        promptFilesWritten += 1;
      } else {
        promptFilesMissing += 1;
      }
    }
    await writeFile(resolveOutputPath(task.taskPath), serializeExternalRunnerHandoffTaskMarkdown({
      handoff,
      task
    }), "utf8");
    if (!task.jobPath) continue;
    await writeFile(resolveOutputPath(task.jobPath), `${serializeExternalRunnerAdapterJob(buildExternalRunnerAdapterJob({
      handoff,
      task
    }))}\n`, "utf8");
  }

  printSummary(handoff, { promptFilesWritten, promptFilesMissing });

  if (handoff.decision === "blocked") {
    process.exitCode = 2;
  }

  if (promptFilesMissing > 0) {
    console.error(
      `${promptFilesMissing} ready task(s) have no prompt file. Provide session-bundle.json in --input so prompts can be written.`
    );
    process.exitCode = 2;
  }
}

async function registryFor({
  inputDir,
  options
}: {
  inputDir: string;
  options: EngineeringHandoffOptions;
}) {
  const shouldRebuild = options.installedAdapterIds.length > 0 ||
    options.licenseReviewedAdapterIds.length > 0 ||
    options.approvedAdapterIds.length > 0;

  if (shouldRebuild) {
    return buildExternalRunnerAdapterRegistry({
      generatedAt: options.generatedAt,
      installedAdapterIds: options.installedAdapterIds,
      licenseReviewedAdapterIds: options.licenseReviewedAdapterIds,
      approvedAdapterIds: options.approvedAdapterIds
    });
  }

  try {
    return await readJson<ExternalRunnerAdapterRegistry>(path.join(inputDir, "adapter-registry.json"));
  } catch {
    return buildExternalRunnerAdapterRegistry({
      generatedAt: options.generatedAt
    });
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T>(filePath);
  } catch {
    return null;
  }
}

function printSummary(
  handoff: ReturnType<typeof buildExternalRunnerHandoff>,
  prompts: { promptFilesWritten: number; promptFilesMissing: number }
) {
  console.log("Engineering external runner handoff written.");
  console.log(`- output: ${handoff.outputDir}`);
  console.log(`- adapter: ${handoff.adapter ? `${handoff.adapter.label} (${handoff.adapter.status})` : "missing"}`);
  console.log(`- decision: ${handoff.decision}`);
  console.log(`- can start external runner: ${handoff.canStartExternalRunner ? "yes" : "no"}`);
  console.log(`- task files: ${handoff.summary.handoffTaskFiles}`);
  console.log(`- job files: ${handoff.summary.adapterJobFiles}`);
  console.log(`- ready task files: ${handoff.summary.readyTaskFiles}`);
  console.log(`- prompt files: ${prompts.promptFilesWritten}${prompts.promptFilesMissing ? ` (${prompts.promptFilesMissing} missing)` : ""}`);
  console.log(`- blockers: ${handoff.summary.blockers}`);
}

function parseArgs(args: string[]): EngineeringHandoffOptions {
  const options: EngineeringHandoffOptions = {
    inputDir: "output/engineering-simulate",
    outputDir: "output/engineering-handoff",
    adapterId: "openhands-coding-agent",
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
    } else if (arg === "--input") {
      options.inputDir = args[index + 1] || options.inputDir;
      index += 1;
    } else if (arg === "--out") {
      options.outputDir = args[index + 1] || options.outputDir;
      index += 1;
    } else if (arg === "--adapter") {
      options.adapterId = parseAdapterId(args[index + 1] || options.adapterId);
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

function parseAdapterIds(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).map(parseAdapterId);
}

function parseAdapterId(value: string): ExternalRunnerAdapterId {
  if (externalRunnerAdapterIds.includes(value as ExternalRunnerAdapterId)) {
    return value as ExternalRunnerAdapterId;
  }
  throw new Error(`Unsupported adapter id: ${value}. Use one of ${externalRunnerAdapterIds.join(", ")}.`);
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function resolveOutputPath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:handoff -- --input output/engineering-simulate --adapter openhands-coding-agent",
    "",
    "Options:",
    "  --input <dir>                 Read engineering:simulate output. Default: output/engineering-simulate.",
    "  --out <dir>                   Output directory. Default: output/engineering-handoff.",
    "  --adapter <id>                Adapter id. Default: openhands-coding-agent.",
    "  --installed <ids>             Comma-separated adapter ids installed by the user.",
    "  --license-reviewed <ids>      Comma-separated adapter ids whose licenses were reviewed.",
    "  --approved <ids>              Comma-separated adapter ids approved for this machine/session.",
    "  --generated-at <iso>          Stable timestamp for tests.",
    "  --help, -h                   Show this help.",
    "",
    "This command writes an external runner handoff package, task Markdown files, and adapter job JSON files. It does not install, launch, control, commit, push, deploy, browse, or call providers."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering handoff failure.");
  process.exitCode = 1;
});
