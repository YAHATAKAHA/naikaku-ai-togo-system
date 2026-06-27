import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ExternalRunnerAdapterJob } from "../src/domain/externalRunnerHandoff";

interface FixtureExternalRunnerOptions {
  jobPath: string;
  worktreeDir: string;
  generatedAt: string;
  help: boolean;
}

interface PendingCommand {
  command: string;
  transcriptRef: string;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const job = readJson<ExternalRunnerAdapterJob>(path.resolve(options.jobPath));
  const taskText = readFileSync(path.resolve(job.taskPath), "utf8");
  const worktreeDir = path.resolve(options.worktreeDir);
  const changedFile = fixtureChangedFileFor(worktreeDir, job.sessionId);
  const changedFileRelative = relativePath(changedFile);
  const commands = pendingCommandsFrom(taskText);

  initializeFixtureWorktree(worktreeDir, changedFile);
  writeFileSync(
    changedFile,
    [
      `session=${job.sessionId}`,
      `title=${job.title}`,
      `generatedAt=${options.generatedAt}`,
      `runStartedAt=${new Date().toISOString()}`,
      "This file was modified by the Naikaku fixture external runner.",
      ""
    ].join("\n"),
    "utf8"
  );

  const commandResults = commands.map((item) => {
    writeArtifact(path.resolve(item.transcriptRef), transcriptFor(item.command, job, options.generatedAt));
    return {
      command: item.command,
      exitCode: 0,
      outputSummary: `Fixture external runner recorded success for ${item.command}.`,
      transcriptRef: item.transcriptRef
    };
  });
  const evidence = job.evidence.expectedArtifacts.map((artifact, index) => {
    writeArtifact(path.resolve(artifact.path), [
      `Evidence ${index + 1}: ${artifact.label}`,
      `Session: ${job.sessionId}`,
      `Changed file: ${changedFileRelative}`,
      "Fixture-only evidence for adapter orchestration smoke testing.",
      ""
    ].join("\n"));
    return `${artifact.label} -> ${artifact.path}`;
  });
  const receipt = {
    schema: "naikaku.coding-agent-session-receipt.v1",
    generatedAt: options.generatedAt,
    mode: "evidence-review",
    sourceSchema: "naikaku.coding-agent-session-bundle.v1",
    bundleDecision: "ready",
    decision: "needs-evidence",
    operatorLocale: "ja",
    items: [{
      sessionId: job.sessionId,
      title: job.title,
      sessionStatus: "ready-for-agent",
      receiptStatus: "pending-evidence",
      changedFiles: [changedFileRelative],
      commandResults,
      evidence,
      risks: [
        "Fixture-only external adapter run.",
        "No real model provider, browser, desktop, deployment, Git remote, or external service was used."
      ],
      missing: [],
      nextAction: "Import this fixture receipt through Naikaku adapter-run review."
    }],
    honestyClaim: {
      level: "submitted-evidence-review",
      claim: "This fixture runner writes a Naikaku receipt to prove adapter orchestration plumbing.",
      limitations: [
        "It does not implement the requested product task.",
        "It does not run a real upstream coding model."
      ],
      productionRequirements: [
        "Replace this runner with a user-installed adapter such as OpenHands, OpenClaw, browser-use, Hammerspoon, MCP, or Hermes-style runtime."
      ]
    },
    summary: {
      total: 1,
      verified: 0,
      pendingEvidence: 1,
      failed: 0,
      held: 0,
      changedFiles: 1,
      commandResults: commandResults.length,
      evidenceItems: evidence.length,
      risks: 2
    }
  };

  if (!job.receiptDraftPath) {
    throw new Error("Adapter job did not include a receiptDraftPath.");
  }
  writeArtifact(path.resolve(job.receiptDraftPath), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Fixture external runner wrote ${job.receiptDraftPath}`);
}

function initializeFixtureWorktree(worktreeDir: string, changedFile: string) {
  mkdirSync(path.dirname(changedFile), { recursive: true });
  if (!existsSync(path.join(worktreeDir, ".git"))) {
    mkdirSync(worktreeDir, { recursive: true });
    assertGitOk(runGit(["init"], worktreeDir), "git init");
  }

  if (!pathExists(changedFile)) {
    writeFileSync(changedFile, "baseline fixture file\n", "utf8");
  }

  const hasCommit = runGit(["rev-parse", "--verify", "HEAD"], worktreeDir).ok;
  if (!hasCommit) {
    assertGitOk(runGit(["add", "."], worktreeDir), "git add");
    assertGitOk(runGit([
      "-c",
      "user.name=Naikaku Fixture Runner",
      "-c",
      "user.email=fixture-runner@example.invalid",
      "commit",
      "-m",
      "fixture external runner baseline"
    ], worktreeDir), "git commit");
  }
}

function pendingCommandsFrom(taskText: string): PendingCommand[] {
  const matches = [...taskText.matchAll(/^- (.+?) -> transcript (.+?); exit code/mg)];
  if (!matches.length) {
    return [{
      command: "fixture external runner",
      transcriptRef: "output/engineering-auto-work/fixture-transcript.log"
    }];
  }
  return matches.map((match) => ({
    command: match[1].trim(),
    transcriptRef: match[2].trim()
  }));
}

function transcriptFor(command: string, job: ExternalRunnerAdapterJob, generatedAt: string) {
  return [
    `command: ${command}`,
    "exit code: 0",
    "exitCode: 0",
    `session: ${job.sessionId}`,
    `title: ${job.title}`,
    `generatedAt: ${generatedAt}`,
    "note: Fixture external runner transcript for adapter orchestration smoke testing.",
    ""
  ].join("\n");
}

function fixtureChangedFileFor(worktreeDir: string, sessionId: string) {
  return path.join(worktreeDir, "src", `${safeFileStem(sessionId)}.txt`);
}

function writeArtifact(filePath: string, content: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function runGit(args: string[], cwd: string) {
  const result = spawnSync("git", args, {
    cwd,
    shell: false,
    encoding: "utf8",
    maxBuffer: 2_000_000
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function assertGitOk(result: ReturnType<typeof runGit>, label: string) {
  if (!result.ok) {
    throw new Error(`${label} failed: ${result.output.trim() || "unknown Git error"}`);
  }
}

function pathExists(filePath: string) {
  try {
    readFileSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function parseArgs(args: string[]): FixtureExternalRunnerOptions {
  const options: FixtureExternalRunnerOptions = {
    jobPath: "",
    worktreeDir: "output/engineering-auto-work/fixture-worktree",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--job") {
      options.jobPath = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--worktree") {
      options.worktreeDir = requireValue(args, index, arg);
      index += 1;
    } else if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
    } else if (!options.jobPath) {
      options.jobPath = arg;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.jobPath && !options.help) {
    throw new Error("--job is required.");
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

function safeFileStem(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "session";
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

function printHelp() {
  console.log([
    "Usage: tsx scripts/engineering-fixture-external-runner.ts --job <adapter-job.json>",
    "",
    "Options:",
    "  --job <path>           Adapter job JSON path.",
    "  --worktree <dir>       Fixture Git worktree. Default: output/engineering-auto-work/fixture-worktree.",
    "  --generated-at <iso>   Stable timestamp for tests.",
    "  --help, -h             Show this help.",
    "",
    "This fixture runner is for local smoke tests. It writes a Naikaku receipt and evidence artifacts, but does not implement product work."
  ].join("\n"));
}

void main();
