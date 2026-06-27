import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExternalRunnerAdapterJob } from "../src/domain/externalRunnerHandoff";

type AdapterRunStatus =
  | "completed"
  | "failed"
  | "not-installed"
  | "timed-out"
  | "blocked-not-executable";

type ExternalReceiptStatus =
  | "present"
  | "missing"
  | "invalid-json"
  | "stale"
  | "not-requested";

interface EngineeringRunAdapterOptions {
  handoffDir: string;
  jobPath: string | null;
  outputDir: string;
  commandOverride: string | null;
  argOverride: string[];
  allowReviewOnly: boolean;
  requireReceipt: boolean;
  maxJobs: number;
  timeoutMs: number;
  generatedAt: string;
  help: boolean;
}

interface AdapterJobRun {
  jobPath: string;
  adapterId: string;
  sessionId: string;
  title: string;
  command: string;
  args: string[];
  status: AdapterRunStatus;
  startedAt: string;
  exitCode: number | null;
  signal: string | null;
  durationMs: number;
  stdoutTranscriptPath: string;
  stderrTranscriptPath: string;
  stdoutBytes: number;
  stderrBytes: number;
  receiptDraftPath: string | null;
  externalReceiptStatus: ExternalReceiptStatus;
  externalReceiptSchema: string | null;
  adapterExecutionReceiptPath: string;
  canEnterImplementationReview: boolean;
  nextAction: string;
  error: string | null;
}

interface EngineeringRunAdapterSummary {
  schema: "naikaku.external-runner-adapter-run.v1";
  generatedAt: string;
  handoffDir: string;
  outputDir: string;
  jobs: AdapterJobRun[];
  summary: {
    total: number;
    executed: number;
    completed: number;
    failed: number;
    notInstalled: number;
    timedOut: number;
    blocked: number;
    externalReceiptsPresent: number;
    externalReceiptsMissing: number;
    externalReceiptsStale: number;
    externalReceiptsInvalid: number;
    readyForImplementationReview: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const jobs = await loadJobs(options);
  const runs: AdapterJobRun[] = [];

  for (const item of jobs.slice(0, options.maxJobs)) {
    runs.push(await runJob({
      jobPath: item.path,
      job: item.job,
      options
    }));
  }

  const summary: EngineeringRunAdapterSummary = {
    schema: "naikaku.external-runner-adapter-run.v1",
    generatedAt: options.generatedAt,
    handoffDir: relativePath(path.resolve(options.handoffDir)),
    outputDir: relativePath(outputDir),
    jobs: runs,
    summary: {
      total: runs.length,
      executed: runs.filter((run) => run.status !== "blocked-not-executable").length,
      completed: runs.filter((run) => run.status === "completed").length,
      failed: runs.filter((run) => run.status === "failed").length,
      notInstalled: runs.filter((run) => run.status === "not-installed").length,
      timedOut: runs.filter((run) => run.status === "timed-out").length,
      blocked: runs.filter((run) => run.status === "blocked-not-executable").length,
      externalReceiptsPresent: runs.filter((run) => run.externalReceiptStatus === "present").length,
      externalReceiptsMissing: runs.filter((run) => run.externalReceiptStatus === "missing").length,
      externalReceiptsStale: runs.filter((run) => run.externalReceiptStatus === "stale").length,
      externalReceiptsInvalid: runs.filter((run) => run.externalReceiptStatus === "invalid-json").length,
      readyForImplementationReview: runs.filter((run) => run.canEnterImplementationReview).length
    },
    honestyClaim: {
      claim: "This report records Naikaku's adapter bridge invoking user-installed external runner commands from adapter job JSON.",
      limitations: [
        "It does not install upstream runners, grant macOS permissions, push Git, deploy, send messages, or verify implementation completion by itself.",
        "Completed means the external command exited 0 and transcripts plus an adapter execution receipt were captured.",
        "Implementation review starts only when the external runner also writes the expected Naikaku session receipt.",
        "not-installed means the configured command was not found on this machine."
      ]
    }
  };

  await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");
  printSummary(summary);

  if (
    summary.summary.failed ||
    summary.summary.notInstalled ||
    summary.summary.timedOut ||
    summary.summary.blocked ||
    (options.requireReceipt && summary.summary.readyForImplementationReview !== summary.summary.completed)
  ) {
    process.exitCode = 2;
  }
}

async function loadJobs(options: EngineeringRunAdapterOptions) {
  if (options.jobPath) {
    return [{
      path: relativePath(path.resolve(options.jobPath)),
      job: await readJson<ExternalRunnerAdapterJob>(path.resolve(options.jobPath))
    }];
  }

  const jobsDir = path.join(path.resolve(options.handoffDir), "jobs");
  const names = (await readdir(jobsDir)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => {
    const filePath = path.join(jobsDir, name);
    return {
      path: relativePath(filePath),
      job: await readJson<ExternalRunnerAdapterJob>(filePath)
    };
  }));
}

async function runJob({
  jobPath,
  job,
  options
}: {
  jobPath: string;
  job: ExternalRunnerAdapterJob;
  options: EngineeringRunAdapterOptions;
}): Promise<AdapterJobRun> {
  const command = options.commandOverride ?? job.commandPlan.command;
  const args = (options.commandOverride ? options.argOverride : job.commandPlan.args)
    .map((arg) => substituteArg(arg, { jobPath, job }));
  const stdoutPath = relativePath(path.resolve(options.outputDir, "transcripts", `${safeFileStem(job.sessionId)}.stdout.log`));
  const stderrPath = relativePath(path.resolve(options.outputDir, "transcripts", `${safeFileStem(job.sessionId)}.stderr.log`));
  const adapterExecutionReceiptPath = relativePath(path.resolve(
    options.outputDir,
    "adapter-receipts",
    `${safeFileStem(job.sessionId)}.json`
  ));

  await mkdir(path.dirname(path.resolve(stdoutPath)), { recursive: true });
  await mkdir(path.dirname(path.resolve(stderrPath)), { recursive: true });
  await mkdir(path.dirname(path.resolve(adapterExecutionReceiptPath)), { recursive: true });

  const base = {
    jobPath,
    adapterId: job.adapterId,
    sessionId: job.sessionId,
    title: job.title,
    command,
    args,
    stdoutTranscriptPath: stdoutPath,
    stderrTranscriptPath: stderrPath,
    adapterExecutionReceiptPath,
    receiptDraftPath: job.receiptDraftPath
  };

  if (!job.executable && !options.allowReviewOnly) {
    await writeFile(path.resolve(stdoutPath), "", "utf8");
    await writeFile(path.resolve(stderrPath), "Adapter job is not executable. Regenerate handoff after license/install/approval gates pass.\n", "utf8");
    return finalizeRun({
      ...base,
      status: "blocked-not-executable",
      exitCode: null,
      signal: null,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      error: "Adapter job is not executable."
    }, options.generatedAt);
  }

  return finalizeRun(await runProcess({
    ...base,
    cwd: path.resolve(job.commandPlan.workingDirectory || "."),
    timeoutMs: options.timeoutMs
  }), options.generatedAt);
}

async function finalizeRun(
  run: Omit<
    AdapterJobRun,
    | "stdoutBytes"
    | "stderrBytes"
    | "externalReceiptStatus"
    | "externalReceiptSchema"
    | "canEnterImplementationReview"
    | "nextAction"
  >,
  generatedAt: string
): Promise<AdapterJobRun> {
  const [stdoutBytes, stderrBytes] = await Promise.all([
    fileBytes(run.stdoutTranscriptPath),
    fileBytes(run.stderrTranscriptPath)
  ]);
  const receiptProbe = await externalReceiptProbe(run.receiptDraftPath, Date.parse(run.startedAt));
  const canEnterImplementationReview = run.status === "completed" && receiptProbe.status === "present";
  const completeRun: AdapterJobRun = {
    ...run,
    stdoutBytes,
    stderrBytes,
    externalReceiptStatus: receiptProbe.status,
    externalReceiptSchema: receiptProbe.schema,
    canEnterImplementationReview,
    nextAction: nextActionFor({
      status: run.status,
      receiptStatus: receiptProbe.status
    })
  };

  await writeFile(path.resolve(run.adapterExecutionReceiptPath), `${JSON.stringify({
    schema: "naikaku.external-runner-adapter-execution-receipt.v1",
    generatedAt,
    jobPath: run.jobPath,
    adapterId: run.adapterId,
    sessionId: run.sessionId,
    title: run.title,
    command: run.command,
    args: run.args,
    status: run.status,
    startedAt: run.startedAt,
    exitCode: run.exitCode,
    signal: run.signal,
    durationMs: run.durationMs,
    stdoutTranscriptPath: run.stdoutTranscriptPath,
    stderrTranscriptPath: run.stderrTranscriptPath,
    stdoutBytes,
    stderrBytes,
    externalReceiptPath: run.receiptDraftPath,
    externalReceiptStatus: receiptProbe.status,
    externalReceiptSchema: receiptProbe.schema,
    canEnterImplementationReview,
    nextAction: completeRun.nextAction,
    honestyClaim: {
      claim: "This adapter execution receipt proves that Naikaku invoked a user-installed runner command and captured transcripts.",
      limitations: [
        "It does not prove the external runner made correct code changes.",
        "It does not replace the required Naikaku coding-agent session receipt, implementation evidence, artifact audit, or release verification."
      ]
    }
  }, null, 2)}\n`, "utf8");

  return completeRun;
}

function runProcess({
  jobPath,
  adapterId,
  sessionId,
  title,
  command,
  args,
  cwd,
  timeoutMs,
  stdoutTranscriptPath,
  stderrTranscriptPath,
  receiptDraftPath,
  adapterExecutionReceiptPath
}: {
  jobPath: string;
  adapterId: string;
  sessionId: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  stdoutTranscriptPath: string;
  stderrTranscriptPath: string;
  receiptDraftPath: string | null;
  adapterExecutionReceiptPath: string;
}): Promise<AdapterJobRun> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        CI: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timedOut = false;
    let spawnError: Error | null = null;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      spawnError = error;
    });
    child.on("close", async (code, signal) => {
      clearTimeout(timeout);
      await writeFile(path.resolve(stdoutTranscriptPath), Buffer.concat(stdoutChunks), "utf8");
      await writeFile(path.resolve(stderrTranscriptPath), Buffer.concat(stderrChunks), "utf8");
      const status = spawnError && (spawnError as NodeJS.ErrnoException).code === "ENOENT"
        ? "not-installed"
        : timedOut
          ? "timed-out"
          : code === 0 ? "completed" : "failed";

      resolve({
        jobPath,
        adapterId,
        sessionId,
        title,
        command,
        args,
        status,
        startedAt: new Date(startedAt).toISOString(),
        exitCode: code,
        signal,
        durationMs: Date.now() - startedAt,
        stdoutTranscriptPath,
        stderrTranscriptPath,
        stdoutBytes: 0,
        stderrBytes: 0,
        receiptDraftPath,
        externalReceiptStatus: "not-requested",
        externalReceiptSchema: null,
        adapterExecutionReceiptPath,
        canEnterImplementationReview: false,
        nextAction: "Capture adapter execution receipt.",
        error: spawnError?.message ?? null
      });
    });
  });
}

async function externalReceiptProbe(receiptPath: string | null, notBeforeMs: number): Promise<{
  status: ExternalReceiptStatus;
  schema: string | null;
}> {
  if (!receiptPath) {
    return { status: "not-requested", schema: null };
  }
  try {
    const receiptStat = await stat(path.resolve(receiptPath));
    const raw = await readFile(path.resolve(receiptPath), "utf8");
    const parsed = JSON.parse(raw) as { schema?: unknown };
    if (Number.isFinite(notBeforeMs) && receiptStat.mtimeMs + 1 < notBeforeMs) {
      return { status: "stale", schema: typeof parsed.schema === "string" ? parsed.schema : null };
    }
    return {
      status: "present",
      schema: typeof parsed.schema === "string" ? parsed.schema : null
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "missing", schema: null };
    }
    return { status: "invalid-json", schema: null };
  }
}

async function fileBytes(filePath: string) {
  try {
    return (await stat(path.resolve(filePath))).size;
  } catch {
    return 0;
  }
}

function nextActionFor({
  status,
  receiptStatus
}: {
  status: AdapterRunStatus;
  receiptStatus: ExternalReceiptStatus;
}) {
  if (status === "not-installed") return "Install the configured upstream runner CLI or override --command.";
  if (status === "blocked-not-executable") return "Regenerate handoff after license, install, and approval gates pass.";
  if (status === "timed-out") return "Inspect transcripts, then rerun with a larger --timeout-ms or smaller task.";
  if (status === "failed") return "Inspect stderr/stdout transcripts, fix runner configuration or task scope, then rerun.";
  if (receiptStatus === "present") return "Import the external receipt into Naikaku receipt review and artifact audit.";
  if (receiptStatus === "stale") return "Rerun the adapter or clear the stale receipt; this receipt predates the current command run.";
  if (receiptStatus === "invalid-json") return "Fix the external receipt JSON before implementation review.";
  if (receiptStatus === "missing") return "Ask the runner to write the expected Naikaku session receipt before claiming implementation.";
  return "Attach a Naikaku session receipt before claiming implementation.";
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function substituteArg(arg: string, { jobPath, job }: { jobPath: string; job: ExternalRunnerAdapterJob }) {
  return arg
    .replaceAll("{jobPath}", jobPath)
    .replaceAll("{taskPath}", job.taskPath)
    .replaceAll("{receiptDraftPath}", job.receiptDraftPath ?? "")
    .replaceAll("{sessionId}", job.sessionId);
}

function summaryMarkdown(summary: EngineeringRunAdapterSummary) {
  return [
    "# External Runner Adapter Run",
    "",
    `Generated: ${summary.generatedAt}`,
    `Handoff: ${summary.handoffDir}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Summary",
    "",
    ...Object.entries(summary.summary).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Jobs",
    "",
    ...summary.jobs.flatMap((job, index) => [
      `### ${index + 1}. ${job.title}`,
      "",
      `- Session: ${job.sessionId}`,
      `- Adapter: ${job.adapterId}`,
      `- Status: ${job.status}`,
      `- Exit code: ${job.exitCode ?? "none"}`,
      `- Command: ${[job.command, ...job.args].join(" ")}`,
      `- Stdout: ${job.stdoutTranscriptPath}`,
      `- Stdout bytes: ${job.stdoutBytes}`,
      `- Stderr: ${job.stderrTranscriptPath}`,
      `- Stderr bytes: ${job.stderrBytes}`,
      `- Receipt: ${job.receiptDraftPath ?? "missing"}`,
      `- External receipt status: ${job.externalReceiptStatus}`,
      `- Adapter execution receipt: ${job.adapterExecutionReceiptPath}`,
      `- Ready for implementation review: ${job.canEnterImplementationReview ? "yes" : "no"}`,
      `- Next action: ${job.nextAction}`,
      ""
    ]),
    "## Honesty Boundary",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`)
  ].join("\n");
}

function printSummary(summary: EngineeringRunAdapterSummary) {
  console.log("Engineering adapter bridge run complete.");
  console.log(`- output: ${summary.outputDir}`);
  console.log(`- jobs: ${summary.summary.total}`);
  console.log(`- executed: ${summary.summary.executed}`);
  console.log(`- completed: ${summary.summary.completed}`);
  console.log(`- failed: ${summary.summary.failed}`);
  console.log(`- not installed: ${summary.summary.notInstalled}`);
  console.log(`- timed out: ${summary.summary.timedOut}`);
  console.log(`- blocked: ${summary.summary.blocked}`);
  console.log(`- external receipts present: ${summary.summary.externalReceiptsPresent}`);
  console.log(`- external receipts stale: ${summary.summary.externalReceiptsStale}`);
  console.log(`- ready for implementation review: ${summary.summary.readyForImplementationReview}`);
}

function parseArgs(args: string[]): EngineeringRunAdapterOptions {
  const options: EngineeringRunAdapterOptions = {
    handoffDir: "output/engineering-handoff",
    jobPath: null,
    outputDir: "output/engineering-adapter-run",
    commandOverride: null,
    argOverride: [],
    allowReviewOnly: false,
    requireReceipt: false,
    maxJobs: Number.POSITIVE_INFINITY,
    timeoutMs: 180_000,
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--handoff") {
      options.handoffDir = args[index + 1] || options.handoffDir;
      index += 1;
    } else if (arg === "--job") {
      options.jobPath = args[index + 1] || "";
      index += 1;
    } else if (arg === "--out") {
      options.outputDir = args[index + 1] || options.outputDir;
      index += 1;
    } else if (arg === "--command") {
      options.commandOverride = args[index + 1] || "";
      index += 1;
    } else if (arg === "--arg") {
      options.argOverride.push(args[index + 1] || "");
      index += 1;
    } else if (arg === "--allow-review-only") {
      options.allowReviewOnly = true;
    } else if (arg === "--require-receipt") {
      options.requireReceipt = true;
    } else if (arg === "--max-jobs") {
      options.maxJobs = Number(args[index + 1] || options.maxJobs);
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(args[index + 1] || options.timeoutMs);
      index += 1;
    } else if (arg === "--generated-at") {
      options.generatedAt = args[index + 1] || options.generatedAt;
      index += 1;
    }
  }

  return options;
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function safeFileStem(value: string) {
  const stem = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "session";
}

function printHelp() {
  console.log([
    "Usage: npm run engineering:run-adapter -- --handoff output/engineering-handoff",
    "",
    "Options:",
    "  --handoff <dir>         Read job JSON files from <dir>/jobs. Default: output/engineering-handoff.",
    "  --job <path>            Run one adapter job JSON file.",
    "  --out <dir>             Output directory. Default: output/engineering-adapter-run.",
    "  --command <cmd>         Override the job command, for example openhands or python.",
    "  --arg <value>           Add one override argument. Supports {taskPath}, {jobPath}, {receiptDraftPath}, {sessionId}. Repeat as needed.",
    "  --allow-review-only     Permit running non-executable review-only jobs for local experiments.",
    "  --require-receipt       Exit non-zero unless completed jobs also produced the expected Naikaku receipt.",
    "  --max-jobs <number>     Limit jobs. Default: all selected jobs.",
    "  --timeout-ms <number>   Per-job timeout. Default: 180000.",
    "  --generated-at <iso>    Stable timestamp for tests.",
    "  --help, -h              Show this help.",
    "",
    "Default OpenHands jobs run the configured CLI plan. Override with:",
    "  npm run engineering:run-adapter -- --job output/engineering-handoff/jobs/01-task.json --command python --arg -m --arg openhands.core.main --arg -f --arg {taskPath}",
    "",
    "This command launches user-installed runner commands and records transcripts. It does not install runners, grant permissions, push, deploy, send messages, or accept completion without returned evidence."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown engineering adapter bridge failure.");
  process.exitCode = 1;
});
