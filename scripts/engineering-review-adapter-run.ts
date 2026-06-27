import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { auditCodingAgentImplementationArtifacts } from "../src/domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationEvidence";
import { reviewCodingAgentSessionReceipt } from "../src/domain/codingAgentSessionReceipt";
import type {
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem
} from "../src/domain/types";

interface EngineeringReviewAdapterRunOptions {
  bundlePath: string;
  adapterRunPath: string;
  outputDir: string;
  worktreeDir: string | null;
  generatedAt: string;
  help: boolean;
}

interface AdapterRunSummary {
  schema: "naikaku.external-runner-adapter-run.v1";
  generatedAt: string;
  jobs: Array<{
    sessionId: string;
    status: string;
    startedAt: string;
    receiptDraftPath: string | null;
    externalReceiptStatus: string;
    canEnterImplementationReview: boolean;
    adapterExecutionReceiptPath: string;
  }>;
  summary: {
    readyForImplementationReview: number;
  };
}

interface ReviewAdapterRunSummary {
  schema: "naikaku.engineering-adapter-run-review.v1";
  generatedAt: string;
  bundlePath: string;
  adapterRunPath: string;
  outputDir: string;
  source: {
    bundleSchema: string;
    adapterRunSchema: string;
    adapterReadyForImplementationReview: number;
    bundleSessions: number;
    reviewedSessions: number;
  };
  adapterReceipts: {
    totalJobs: number;
    reviewReadyJobs: number;
    loadedReceipts: number;
    skippedReceipts: number;
    staleReceipts: number;
    invalidReceipts: number;
    unreadableReceipts: number;
  };
  receipt: {
    decision: string;
    verified: number;
    pendingEvidence: number;
    failed: number;
  };
  evidence: {
    decision: string;
    accepted: number;
    needsEvidence: number;
    blocked: number;
    commandResults: number;
    changedFiles: number;
  };
  artifactAudit: {
    decision: string;
    verifiedPaths: number;
    missingPaths: number;
    unsafePaths: number;
    uncheckedPaths: number;
    transcriptContentChecked: number;
    worktreeChangedFiles: number;
    worktreeCheckedChangedFiles: number;
    worktreeUnchangedFiles: number;
    transcriptContentMismatches: number;
  };
  files: {
    submittedReceipt: string;
    receiptReview: string;
    implementationEvidence: string;
    artifactAudit: string;
  };
  checks: Record<string, boolean>;
  honestyClaim: {
    claim: string;
    limitations: string[];
    nextActions: string[];
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

  const bundle = await readJson<CodingAgentSessionBundle>(path.resolve(options.bundlePath));
  const adapterRun = await readJson<AdapterRunSummary>(path.resolve(options.adapterRunPath));
  const reviewBundle = bundleForAdapterRun(bundle, adapterRun);
  const loaded = loadAdapterReceipts(adapterRun);
  const submittedReceipt = mergedReceipt({
    bundle: reviewBundle,
    loadedItems: loaded.items,
    generatedAt: options.generatedAt
  });
  const receiptReview = reviewCodingAgentSessionReceipt({
    bundle: reviewBundle,
    receipt: submittedReceipt,
    generatedAt: options.generatedAt
  });
  const evidence = buildCodingAgentImplementationEvidence({
    receipt: receiptReview,
    generatedAt: options.generatedAt
  });
  const artifactAudit = auditCodingAgentImplementationArtifacts({
    evidence,
    generatedAt: options.generatedAt,
    artifactProbe: localArtifactProbe,
    worktreeProbe: options.worktreeDir ? worktreeProbe(path.resolve(options.worktreeDir)) : undefined
  });
  const files = {
    submittedReceipt: relativePath(path.join(outputDir, "submitted-receipt.json")),
    receiptReview: relativePath(path.join(outputDir, "receipt-review.json")),
    implementationEvidence: relativePath(path.join(outputDir, "implementation-evidence.json")),
    artifactAudit: relativePath(path.join(outputDir, "artifact-audit.json"))
  };
  const summary = buildSummary({
    options,
    bundle,
    reviewBundle,
    adapterRun,
    loaded,
    receiptReview,
    evidence,
    artifactAudit,
    files,
    outputDir
  });

  await writeJson(path.resolve(files.submittedReceipt), submittedReceipt);
  await writeJson(path.resolve(files.receiptReview), receiptReview);
  await writeJson(path.resolve(files.implementationEvidence), evidence);
  await writeJson(path.resolve(files.artifactAudit), artifactAudit);
  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 2;
  }
}

function bundleForAdapterRun(
  bundle: CodingAgentSessionBundle,
  adapterRun: AdapterRunSummary
): CodingAgentSessionBundle {
  const sessionIds = new Set(adapterRun.jobs.map((job) => job.sessionId));
  const sessions = bundle.sessions.filter((session) => sessionIds.has(session.id));
  return {
    ...bundle,
    sessions,
    summary: {
      ...bundle.summary,
      total: sessions.length,
      ready: sessions.filter((session) => session.status === "ready-for-agent").length,
      held: sessions.filter((session) => session.status !== "ready-for-agent").length,
      humanApproval: sessions.filter((session) => session.sandboxContract.requiresHumanApproval).length,
      productionHeld: sessions.filter((session) => session.status === "held-for-production-evidence").length,
      verificationCommands: sessions.reduce((total, session) => total + session.verificationCommands.length, 0),
      evidenceItems: sessions.reduce((total, session) => total + session.evidenceRequired.length, 0)
    }
  };
}

function loadAdapterReceipts(adapterRun: AdapterRunSummary) {
  const items: CodingAgentSessionReceiptItem[] = [];
  const stats = {
    loadedReceipts: 0,
    skippedReceipts: 0,
    staleReceipts: 0,
    invalidReceipts: 0,
    unreadableReceipts: 0
  };

  for (const job of adapterRun.jobs) {
    if (!job.canEnterImplementationReview || job.externalReceiptStatus !== "present" || !job.receiptDraftPath) {
      stats.skippedReceipts += 1;
      continue;
    }

    try {
      const fileStat = statSync(path.resolve(job.receiptDraftPath));
      if (fileStat.mtimeMs + 1 < Date.parse(job.startedAt)) {
        stats.staleReceipts += 1;
        continue;
      }
      const receipt = JSON.parse(readFileSync(path.resolve(job.receiptDraftPath), "utf8")) as CodingAgentSessionReceipt;
      if (receipt.schema !== "naikaku.coding-agent-session-receipt.v1" || !Array.isArray(receipt.items)) {
        stats.invalidReceipts += 1;
        continue;
      }
      items.push(...receipt.items.filter((item) => item.sessionId === job.sessionId));
      stats.loadedReceipts += 1;
    } catch {
      stats.unreadableReceipts += 1;
    }
  }

  return {
    items,
    stats
  };
}

function mergedReceipt({
  bundle,
  loadedItems,
  generatedAt
}: {
  bundle: CodingAgentSessionBundle;
  loadedItems: CodingAgentSessionReceiptItem[];
  generatedAt: string;
}): CodingAgentSessionReceipt {
  const bySession = new Map(loadedItems.map((item) => [item.sessionId, item]));

  return {
    schema: "naikaku.coding-agent-session-receipt.v1",
    generatedAt,
    mode: "evidence-review",
    sourceSchema: bundle.schema,
    bundleDecision: bundle.decision,
    decision: "needs-evidence",
    runId: bundle.runId,
    operatorLocale: bundle.operatorLocale,
    items: bundle.sessions.map((session) => {
      const submitted = bySession.get(session.id);
      if (submitted) return submitted;
      return {
        sessionId: session.id,
        briefId: session.briefId,
        sourceItemId: session.sourceItemId,
        title: session.title,
        sessionStatus: session.status,
        receiptStatus: "pending-evidence",
        changedFiles: [],
        commandResults: [],
        evidence: [],
        risks: [],
        missing: ["Adapter run did not return a reviewable receipt for this session."],
        nextAction: "Run the adapter job and require a fresh Naikaku session receipt."
      };
    }),
    honestyClaim: {
      level: "submitted-evidence-review",
      claim: "This receipt merges session receipts produced by external adapter jobs for Naikaku review.",
      limitations: [
        "It does not run commands.",
        "It does not infer missing changed files, transcripts, evidence artifacts, or risks.",
        "It rejects missing, stale, unreadable, invalid, or out-of-session receipts."
      ],
      productionRequirements: [
        "Run receipt review, implementation evidence, artifact audit, and release verification before claiming completion."
      ]
    },
    summary: {
      total: 0,
      verified: 0,
      pendingEvidence: 0,
      failed: 0,
      held: 0,
      changedFiles: 0,
      commandResults: 0,
      evidenceItems: 0,
      risks: 0
    }
  };
}

function buildSummary({
  options,
  bundle,
  reviewBundle,
  adapterRun,
  loaded,
  receiptReview,
  evidence,
  artifactAudit,
  files,
  outputDir
}: {
  options: EngineeringReviewAdapterRunOptions;
  bundle: CodingAgentSessionBundle;
  reviewBundle: CodingAgentSessionBundle;
  adapterRun: AdapterRunSummary;
  loaded: ReturnType<typeof loadAdapterReceipts>;
  receiptReview: CodingAgentSessionReceipt;
  evidence: CodingAgentImplementationEvidence;
  artifactAudit: CodingAgentImplementationArtifactAudit;
  files: ReviewAdapterRunSummary["files"];
  outputDir: string;
}): ReviewAdapterRunSummary {
  const reviewReadyJobs = adapterRun.jobs.filter((job) => job.canEnterImplementationReview).length;
  const checks = {
    adapterRunSchemaValid: adapterRun.schema === "naikaku.external-runner-adapter-run.v1",
    bundleSchemaValid: bundle.schema === "naikaku.coding-agent-session-bundle.v1",
    reviewReadyJobsMatchedReceipts: reviewReadyJobs === loaded.stats.loadedReceipts,
    noRejectedReadyReceipts: loaded.stats.staleReceipts === 0 &&
      loaded.stats.invalidReceipts === 0 &&
      loaded.stats.unreadableReceipts === 0,
    receiptReviewVerified: receiptReview.decision === "verified" && receiptReview.summary.verified > 0,
    implementationEvidenceAccepted: evidence.decision === "accepted-for-handoff" && evidence.summary.accepted > 0,
    artifactAuditVerified: artifactAudit.decision === "verified" && artifactAudit.summary.verified > 0
  };

  return {
    schema: "naikaku.engineering-adapter-run-review.v1",
    generatedAt: options.generatedAt,
    bundlePath: relativePath(path.resolve(options.bundlePath)),
    adapterRunPath: relativePath(path.resolve(options.adapterRunPath)),
    outputDir: relativePath(outputDir),
    source: {
      bundleSchema: bundle.schema,
      adapterRunSchema: adapterRun.schema,
      adapterReadyForImplementationReview: adapterRun.summary.readyForImplementationReview,
      bundleSessions: bundle.sessions.length,
      reviewedSessions: reviewBundle.sessions.length
    },
    adapterReceipts: {
      totalJobs: adapterRun.jobs.length,
      reviewReadyJobs,
      loadedReceipts: loaded.stats.loadedReceipts,
      skippedReceipts: loaded.stats.skippedReceipts,
      staleReceipts: loaded.stats.staleReceipts,
      invalidReceipts: loaded.stats.invalidReceipts,
      unreadableReceipts: loaded.stats.unreadableReceipts
    },
    receipt: {
      decision: receiptReview.decision,
      verified: receiptReview.summary.verified,
      pendingEvidence: receiptReview.summary.pendingEvidence,
      failed: receiptReview.summary.failed
    },
    evidence: {
      decision: evidence.decision,
      accepted: evidence.summary.accepted,
      needsEvidence: evidence.summary.needsEvidence,
      blocked: evidence.summary.blocked,
      commandResults: evidence.summary.commandResults,
      changedFiles: evidence.summary.changedFiles
    },
    artifactAudit: {
      decision: artifactAudit.decision,
      verifiedPaths: artifactAudit.summary.verifiedPaths,
      missingPaths: artifactAudit.summary.missingPaths,
      unsafePaths: artifactAudit.summary.unsafePaths,
      uncheckedPaths: artifactAudit.summary.uncheckedPaths,
      transcriptContentChecked: artifactAudit.summary.transcriptContentChecked,
      worktreeChangedFiles: artifactAudit.summary.worktreeChangedFiles,
      worktreeCheckedChangedFiles: artifactAudit.summary.worktreeCheckedChangedFiles,
      worktreeUnchangedFiles: artifactAudit.summary.worktreeUnchangedFiles,
      transcriptContentMismatches: artifactAudit.summary.transcriptContentMismatches
    },
    files,
    checks,
    honestyClaim: {
      claim: "This review imports external adapter receipts and runs Naikaku receipt review, implementation evidence, and artifact audit.",
      limitations: [
        "It does not execute adapter commands.",
        "It does not prove model quality by itself.",
        "It only accepts receipts that the adapter-run summary marked fresh and review-ready."
      ],
      nextActions: [
        "Inspect receipt-review.json, implementation-evidence.json, and artifact-audit.json.",
        "Run release verification before marking real Development Board work complete.",
        "Keep Git push, deploy, and external sends behind explicit approval."
      ]
    }
  };
}

function localArtifactProbe(relativePath: string) {
  const fullPath = path.resolve(relativePath);
  if (!existsSync(fullPath)) {
    return {
      exists: false
    };
  }
  const fileStat = statSync(fullPath);
  const buffer = readFileSync(fullPath);
  return {
    exists: true,
    bytes: fileStat.size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    modifiedAt: fileStat.mtime.toISOString(),
    text: buffer.toString("utf8")
  };
}

function worktreeProbe(worktreeDir: string) {
  return (relativePath: string) => {
    const fullPath = path.resolve(relativePath);
    const worktreeRelative = path.relative(worktreeDir, fullPath).replace(/\\/g, "/");

    if (!worktreeRelative || worktreeRelative.startsWith("../") || path.isAbsolute(worktreeRelative)) {
      return {
        checked: false,
        changed: false,
        status: "unknown" as const,
        reason: "Changed-file reference is outside the configured worktree."
      };
    }

    const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", worktreeRelative], {
      cwd: worktreeDir,
      shell: false,
      encoding: "utf8",
      maxBuffer: 2_000_000
    });
    if (status.status !== 0) {
      return {
        checked: false,
        changed: false,
        status: "unknown" as const,
        reason: `${status.stdout || ""}${status.stderr || ""}`.trim() || "Git status failed."
      };
    }

    const line = `${status.stdout || ""}`.trim().split(/\r?\n/).filter(Boolean)[0] || "";
    return {
      checked: true,
      changed: Boolean(line),
      status: worktreeStatusFromPorcelain(line),
      reason: line ? `Git status contains ${line}.` : "Git status is clean for this changed-file reference."
    };
  };
}

function worktreeStatusFromPorcelain(line: string) {
  if (!line) return "clean" as const;
  if (line.startsWith("??")) return "untracked" as const;
  const code = line.slice(0, 2);
  if (code.includes("U")) return "unmerged" as const;
  if (code.includes("R")) return "renamed" as const;
  if (code.includes("C")) return "copied" as const;
  if (code.includes("D")) return "deleted" as const;
  if (code.includes("A")) return "added" as const;
  if (code.includes("T")) return "typechange" as const;
  if (code.includes("M")) return "modified" as const;
  return "unknown" as const;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function summaryMarkdown(summary: ReviewAdapterRunSummary) {
  return [
    "# Engineering Adapter Run Review",
    "",
    `Generated: ${summary.generatedAt}`,
    `Bundle: ${summary.bundlePath}`,
    `Adapter run: ${summary.adapterRunPath}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Summary",
    "",
    `- Review-ready jobs: ${summary.adapterReceipts.reviewReadyJobs}`,
    `- Loaded receipts: ${summary.adapterReceipts.loadedReceipts}`,
    `- Stale receipts: ${summary.adapterReceipts.staleReceipts}`,
    `- Invalid receipts: ${summary.adapterReceipts.invalidReceipts}`,
    `- Receipt review: ${summary.receipt.decision}`,
    `- Implementation evidence: ${summary.evidence.decision}`,
    `- Artifact audit: ${summary.artifactAudit.decision}`,
    `- Verified artifact paths: ${summary.artifactAudit.verifiedPaths}`,
    `- Missing artifact paths: ${summary.artifactAudit.missingPaths}`,
    `- Transcript content checked: ${summary.artifactAudit.transcriptContentChecked}`,
    `- Worktree checked changed files: ${summary.artifactAudit.worktreeCheckedChangedFiles}`,
    `- Worktree changed files: ${summary.artifactAudit.worktreeChangedFiles}`,
    "",
    "## Files",
    "",
    ...Object.entries(summary.files).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.nextActions.map((item) => `- Next action: ${item}`),
    ""
  ].join("\n");
}

function printSummary(summary: ReviewAdapterRunSummary) {
  const passed = Object.values(summary.checks).filter(Boolean).length;
  const failed = Object.values(summary.checks).length - passed;

  console.log(`Engineering adapter run review: ${failed === 0 ? "verified" : "needs-review"}`);
  console.log(`- loaded receipts: ${summary.adapterReceipts.loadedReceipts}`);
  console.log(`- receipt review: ${summary.receipt.decision}`);
  console.log(`- implementation evidence: ${summary.evidence.decision}`);
  console.log(`- artifact audit: ${summary.artifactAudit.decision}`);
  console.log(`- checks: ${passed} pass, ${failed} fail`);
}

function parseArgs(args: string[]): EngineeringReviewAdapterRunOptions {
  const options: EngineeringReviewAdapterRunOptions = {
    bundlePath: "output/engineering-simulate/session-bundle.json",
    adapterRunPath: "output/engineering-adapter-run/summary.json",
    outputDir: "output/engineering-adapter-review",
    worktreeDir: null,
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--bundle") {
      options.bundlePath = args[index + 1] || options.bundlePath;
      index += 1;
    } else if (arg === "--adapter-run") {
      options.adapterRunPath = args[index + 1] || options.adapterRunPath;
      index += 1;
    } else if (arg === "--out") {
      options.outputDir = args[index + 1] || options.outputDir;
      index += 1;
    } else if (arg === "--worktree") {
      options.worktreeDir = args[index + 1] || "";
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

function printHelp() {
  console.log([
    "Usage: npm run engineering:review-adapter-run -- --bundle output/engineering-simulate/session-bundle.json --adapter-run output/engineering-adapter-run/summary.json",
    "",
    "Options:",
    "  --bundle <path>       Coding-agent session bundle JSON.",
    "  --adapter-run <path>  engineering:run-adapter summary JSON.",
    "  --out <dir>           Output directory. Default: output/engineering-adapter-review.",
    "  --worktree <dir>      Optional Git worktree for changed-file verification.",
    "  --generated-at <iso>  Stable timestamp for tests.",
    "  --help, -h            Show this help.",
    "",
    "This command imports fresh external adapter receipts and runs Naikaku receipt review, implementation evidence, and artifact audit. It does not run adapter commands."
  ].join("\n"));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown adapter run review failure.");
  process.exitCode = 1;
});
