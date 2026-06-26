import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { auditCodingAgentImplementationArtifacts } from "../src/domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationEvidence";
import { reconcileCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationReconciliation";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "../src/domain/codingAgentSessionReceipt";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { createDefaultWorkspace } from "../src/domain/storage";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type {
  CodingAgentCommandResult,
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentSession,
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt,
  CodingAgentSessionReceiptItem,
  DevelopmentBoard
} from "../src/domain/types";

interface ReceiptDrillOptions {
  outputDir: string;
  generatedAt: string;
  operatorLocale: string;
  help: boolean;
}

interface DrillCaseResult {
  receipt: CodingAgentSessionReceipt;
  review: CodingAgentSessionReceipt;
  evidence: CodingAgentImplementationEvidence;
  audit: CodingAgentImplementationArtifactAudit;
  reconciliation: ReturnType<typeof reconcileCodingAgentImplementationEvidence>["reconciliation"];
}

interface DrillCaseSummary {
  receiptDecision: string;
  verifiedReceipts: number;
  pendingEvidence: number;
  evidenceDecision: string;
  artifactAuditDecision: string;
  verifiedArtifactPaths: number;
  missingArtifactPaths: number;
  transcriptContentMismatches: number;
  reconciliationDecision: string;
  boardItemsApplied: number;
  boardItemsSkipped: number;
  firstMissingEvidence: string | null;
}

interface ReceiptDrillSummary {
  schema: "naikaku.coding-agent-receipt-drill.v1";
  generatedAt: string;
  operatorLocale: string;
  outputDir: string;
  source: {
    boardItems: number;
    briefs: number;
    reviewDecision: string;
    bundleDecision: string;
    readySessions: number;
    heldSessions: number;
  };
  valid: DrillCaseSummary;
  mismatched: DrillCaseSummary;
  outOfScope: DrillCaseSummary;
  honestyClaim: {
    level: "local-drill";
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const outputRelativeDir = relativeOutputDir(outputDir);
  const context = buildDrillContext(options);

  await mkdir(outputDir, { recursive: true });
  await writeJson(path.join(outputDir, "coding-briefs.json"), context.briefs);
  await writeJson(path.join(outputDir, "coding-brief-review.json"), context.review);
  await writeJson(path.join(outputDir, "session-bundle.json"), context.bundle);

  const valid = await runCase({
    name: "valid",
    bundle: context.bundle,
    board: context.board,
    outputDir,
    generatedAt: options.generatedAt,
    mismatchFirstEvidence: false
  });
  const mismatched = await runCase({
    name: "mismatched",
    bundle: context.bundle,
    board: context.board,
    outputDir,
    generatedAt: options.generatedAt,
    mismatchFirstEvidence: true
  });
  const outOfScope = await runCase({
    name: "out-of-scope",
    bundle: context.bundle,
    board: context.board,
    outputDir,
    generatedAt: options.generatedAt,
    outOfScopeFirstEvidence: true
  });

  assertDrillResults(valid, mismatched, outOfScope);

  const summary: ReceiptDrillSummary = {
    schema: "naikaku.coding-agent-receipt-drill.v1",
    generatedAt: options.generatedAt,
    operatorLocale: options.operatorLocale,
    outputDir: outputRelativeDir,
    source: {
      boardItems: context.board.summary.total,
      briefs: context.briefs.summary.total,
      reviewDecision: context.review.decision,
      bundleDecision: context.bundle.decision,
      readySessions: context.bundle.summary.ready,
      heldSessions: context.bundle.summary.held
    },
    valid: caseSummary(valid),
    mismatched: caseSummary(mismatched),
    outOfScope: caseSummary(outOfScope),
    honestyClaim: {
      level: "local-drill",
      claim: "This drill creates local sandbox artifacts and verifies receipt review, implementation evidence, artifact audit, and Development Board reconciliation behavior.",
      limitations: [
        "It does not call a model provider, external coding agent, browser, deploy target, external service, or Git remote.",
        "It proves the local evidence gates reject mismatched evidence labels and artifacts outside the session sandbox prefix; it is not production runner evidence."
      ],
      productionRequirements: [
        "Attach real coding-agent changed-file evidence before production handoff.",
        "Attach authenticated runner command transcripts before production handoff.",
        "Run production-mode release verification before external delivery."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary));

  printSummary(summary);
}

function buildDrillContext(options: ReceiptDrillOptions) {
  const workspace = createDefaultWorkspace();
  const handoff = buildTeamHandoff({
    workspace,
    generatedAt: options.generatedAt
  });
  const board = buildDevelopmentBoard({
    handoff,
    generatedAt: options.generatedAt
  });
  const briefs = buildCodingAgentBriefs({
    board,
    operatorLocale: options.operatorLocale,
    generatedAt: options.generatedAt
  });
  const review = buildCodingAgentBriefReview({
    briefs,
    generatedAt: options.generatedAt
  });
  const bundle = buildCodingAgentSessionBundle({
    briefs,
    review,
    generatedAt: options.generatedAt
  });

  return {
    workspace,
    handoff,
    board,
    briefs,
    review,
    bundle
  };
}

async function runCase({
  name,
  bundle,
  board,
  outputDir,
  generatedAt,
  mismatchFirstEvidence = false,
  outOfScopeFirstEvidence = false
}: {
  name: string;
  bundle: CodingAgentSessionBundle;
  board: DevelopmentBoard;
  outputDir: string;
  generatedAt: string;
  mismatchFirstEvidence?: boolean;
  outOfScopeFirstEvidence?: boolean;
}): Promise<DrillCaseResult> {
  const receipt = await completedReceiptFor({
    name,
    bundle,
    generatedAt,
    mismatchFirstEvidence,
    outOfScopeFirstEvidence
  });
  const review = reviewCodingAgentSessionReceipt({
    bundle,
    receipt,
    generatedAt
  });
  const evidence = buildCodingAgentImplementationEvidence({
    receipt: review,
    generatedAt
  });
  const audit = auditCodingAgentImplementationArtifacts({
    evidence,
    generatedAt,
    artifactProbe: localArtifactProbe
  });
  const { reconciliation } = reconcileCodingAgentImplementationEvidence({
    evidence,
    artifactAudit: audit,
    items: board.items,
    generatedAt
  });

  const caseDir = path.join(outputDir, name);
  await mkdir(caseDir, { recursive: true });
  await writeJson(path.join(caseDir, "receipt.json"), receipt);
  await writeJson(path.join(caseDir, "receipt-review.json"), review);
  await writeJson(path.join(caseDir, "implementation-evidence.json"), evidence);
  await writeJson(path.join(caseDir, "artifact-audit.json"), audit);
  await writeJson(path.join(caseDir, "reconciliation.json"), reconciliation);

  return {
    receipt,
    review,
    evidence,
    audit,
    reconciliation
  };
}

async function completedReceiptFor({
  name,
  bundle,
  generatedAt,
  mismatchFirstEvidence = false,
  outOfScopeFirstEvidence = false
}: {
  name: string;
  bundle: CodingAgentSessionBundle;
  generatedAt: string;
  mismatchFirstEvidence?: boolean;
  outOfScopeFirstEvidence?: boolean;
}) {
  const template = buildCodingAgentSessionReceiptTemplate({
    bundle,
    generatedAt
  });
  const sessions = new Map(bundle.sessions.map((session) => [session.id, session]));
  const items: CodingAgentSessionReceiptItem[] = [];

  for (let index = 0; index < template.items.length; index += 1) {
    const item = template.items[index];
    const session = sessions.get(item.sessionId);
    if (!session) {
      throw new Error(`Session not found for receipt item ${item.sessionId}`);
    }

    items.push(await completedReceiptItemFor({
      name,
      item,
      session,
      itemIndex: index,
      mismatchEvidence: mismatchFirstEvidence && index === 0,
      outOfScopeEvidence: outOfScopeFirstEvidence && index === 0
    }));
  }

  return {
    ...template,
    items
  };
}

async function completedReceiptItemFor({
  name,
  item,
  session,
  itemIndex,
  mismatchEvidence,
  outOfScopeEvidence
}: {
  name: string;
  item: CodingAgentSessionReceiptItem;
  session: CodingAgentSession;
  itemIndex: number;
  mismatchEvidence: boolean;
  outOfScopeEvidence: boolean;
}): Promise<CodingAgentSessionReceiptItem> {
  const sessionPath = outOfScopeEvidence
    ? `output/coding-agent/out-of-scope/${safeSlug(item.sessionId)}`
    : `${normalizedPrefix(session.sandboxContract.evidenceArtifactPrefix)}${name}`;
  const changedFile = `${sessionPath}/changed-file-${itemIndex + 1}.txt`;
  await writeArtifact(path.resolve(sessionPath, `changed-file-${itemIndex + 1}.txt`), [
    `Changed files summary for ${item.sessionId}`,
    `Source item: ${item.sourceItemId || "none"}`,
    "Local coding-agent receipt drill artifact."
  ].join("\n"));

  const commandResults: CodingAgentCommandResult[] = [];
  for (let commandIndex = 0; commandIndex < session.verificationCommands.length; commandIndex += 1) {
    const command = session.verificationCommands[commandIndex];
    const transcriptRef = `${sessionPath}/transcript-${commandIndex + 1}.log`;
    await writeArtifact(path.resolve(sessionPath, `transcript-${commandIndex + 1}.log`), [
      `command: ${command}`,
      "exit code: 0",
      "exitCode: 0",
      "Local coding-agent receipt drill transcript."
    ].join("\n"));
    commandResults.push({
      command,
      exitCode: 0,
      outputSummary: `${command} passed with exit code 0 in local coding-agent receipt drill.`,
      transcriptRef
    });
  }

  const evidence: string[] = [];
  for (let evidenceIndex = 0; evidenceIndex < session.evidenceRequired.length; evidenceIndex += 1) {
    const required = session.evidenceRequired[evidenceIndex];
    const artifactPath = `${sessionPath}/evidence-${evidenceIndex + 1}.txt`;
    await writeArtifact(path.resolve(sessionPath, `evidence-${evidenceIndex + 1}.txt`), [
      required,
      `Session: ${item.sessionId}`,
      "Local coding-agent receipt drill evidence artifact."
    ].join("\n"));
    const label = mismatchEvidence ? `Unrelated proof ${evidenceIndex + 1}` : required;
    evidence.push(`${label} -> ${artifactPath}`);
  }

  return {
    ...item,
    changedFiles: [changedFile],
    commandResults,
    evidence,
    risks: ["No remaining local drill risks."]
  };
}

function localArtifactProbe(relativePath: string) {
  const root = process.cwd();
  const absolutePath = path.resolve(root, relativePath);
  const workspaceRelativePath = path.relative(root, absolutePath);
  if (!workspaceRelativePath || workspaceRelativePath.startsWith("..")) {
    return { exists: false };
  }
  if (!existsSync(absolutePath)) {
    return { exists: false };
  }

  const stats = statSync(absolutePath);
  if (!stats.isFile()) {
    return { exists: false };
  }

  const content = readFileSync(absolutePath);
  return {
    exists: true,
    bytes: stats.size,
    sha256: createHash("sha256").update(content).digest("hex"),
    modifiedAt: stats.mtime.toISOString(),
    text: content.length <= 1024 * 1024 ? content.toString("utf8") : undefined
  };
}

function assertDrillResults(valid: DrillCaseResult, mismatched: DrillCaseResult, outOfScope: DrillCaseResult) {
  assertEqual(valid.review.decision, "verified", "valid receipt review decision");
  assertEqual(valid.evidence.decision, "accepted-for-handoff", "valid implementation evidence decision");
  assertEqual(valid.audit.decision, "verified", "valid artifact audit decision");
  assertEqual(valid.audit.summary.transcriptContentMismatches, 0, "valid transcript mismatches");
  assertEqual(valid.reconciliation.decision, "applied", "valid reconciliation decision");
  assertEqual(valid.reconciliation.summary.applied, valid.review.summary.total, "valid reconciliation applied count");

  assertEqual(mismatched.review.decision, "needs-evidence", "mismatched receipt review decision");
  assertEqual(mismatched.review.summary.pendingEvidence, 1, "mismatched pending evidence count");
  if (!mismatched.review.items[0].missing.some((item) =>
    item.includes("Evidence artifact is required for: Changed files summary.")
  )) {
    throw new Error("Mismatched drill did not report missing Changed files summary evidence coverage.");
  }
  assertEqual(mismatched.evidence.decision, "needs-evidence", "mismatched implementation evidence decision");
  assertEqual(mismatched.audit.decision, "needs-artifacts", "mismatched artifact audit decision");
  assertEqual(mismatched.reconciliation.summary.applied, 0, "mismatched reconciliation applied count");

  assertEqual(outOfScope.review.decision, "needs-evidence", "out-of-scope receipt review decision");
  assertEqual(outOfScope.review.summary.pendingEvidence, 1, "out-of-scope pending evidence count");
  if (!outOfScope.review.items[0].missing.some((item) =>
    item.includes("Evidence artifact must stay under session evidence prefix")
  )) {
    throw new Error("Out-of-scope drill did not report evidence outside the session sandbox prefix.");
  }
  assertEqual(outOfScope.evidence.decision, "needs-evidence", "out-of-scope implementation evidence decision");
  assertEqual(outOfScope.audit.decision, "needs-artifacts", "out-of-scope artifact audit decision");
  assertEqual(outOfScope.reconciliation.summary.applied, 0, "out-of-scope reconciliation applied count");
}

function caseSummary(result: DrillCaseResult): DrillCaseSummary {
  return {
    receiptDecision: result.review.decision,
    verifiedReceipts: result.review.summary.verified,
    pendingEvidence: result.review.summary.pendingEvidence,
    evidenceDecision: result.evidence.decision,
    artifactAuditDecision: result.audit.decision,
    verifiedArtifactPaths: result.audit.summary.verifiedPaths,
    missingArtifactPaths: result.audit.summary.missingPaths,
    transcriptContentMismatches: result.audit.summary.transcriptContentMismatches,
    reconciliationDecision: result.reconciliation.decision,
    boardItemsApplied: result.reconciliation.summary.applied,
    boardItemsSkipped: result.reconciliation.summary.skipped,
    firstMissingEvidence: result.review.items.find((item) => item.missing.length)?.missing[0] || null
  };
}

function summaryMarkdown(summary: ReceiptDrillSummary) {
  return [
    "# Coding Agent Receipt Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Operator locale: ${summary.operatorLocale}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Source",
    "",
    `- Board items: ${summary.source.boardItems}`,
    `- Briefs: ${summary.source.briefs}`,
    `- Brief review: ${summary.source.reviewDecision}`,
    `- Session bundle: ${summary.source.bundleDecision}`,
    `- Ready sessions: ${summary.source.readySessions}`,
    `- Held sessions: ${summary.source.heldSessions}`,
    "",
    "## Valid Receipt",
    "",
    `- Receipt review: ${summary.valid.receiptDecision}`,
    `- Implementation evidence: ${summary.valid.evidenceDecision}`,
    `- Artifact audit: ${summary.valid.artifactAuditDecision}`,
    `- Development Board applied: ${summary.valid.boardItemsApplied}`,
    `- Transcript mismatches: ${summary.valid.transcriptContentMismatches}`,
    "",
    "## Mismatched Receipt",
    "",
    `- Receipt review: ${summary.mismatched.receiptDecision}`,
    `- Pending evidence: ${summary.mismatched.pendingEvidence}`,
    `- First missing evidence: ${summary.mismatched.firstMissingEvidence || "none"}`,
    `- Implementation evidence: ${summary.mismatched.evidenceDecision}`,
    `- Artifact audit: ${summary.mismatched.artifactAuditDecision}`,
    `- Development Board applied: ${summary.mismatched.boardItemsApplied}`,
    "",
    "## Out-of-Scope Receipt",
    "",
    `- Receipt review: ${summary.outOfScope.receiptDecision}`,
    `- Pending evidence: ${summary.outOfScope.pendingEvidence}`,
    `- First missing evidence: ${summary.outOfScope.firstMissingEvidence || "none"}`,
    `- Implementation evidence: ${summary.outOfScope.evidenceDecision}`,
    `- Artifact audit: ${summary.outOfScope.artifactAuditDecision}`,
    `- Development Board applied: ${summary.outOfScope.boardItemsApplied}`,
    "",
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item: string) => `- Limitation: ${item}`),
    ...summary.honestyClaim.productionRequirements.map((item: string) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function parseArgs(args: string[]): ReceiptDrillOptions {
  const options: ReceiptDrillOptions = {
    outputDir: "output/coding-agent-receipt-drill",
    generatedAt: new Date().toISOString(),
    operatorLocale: "ja",
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

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--locale") {
      options.operatorLocale = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run coding-agent:drill -- [options]

Options:
  --out <dir>            Output directory. Default: output/coding-agent-receipt-drill
  --locale <locale>      Operator locale for generated coding briefs. Default: ja
  --generated-at <iso>   Stable timestamp for generated artifacts.
  -h, --help             Show this help.

The drill writes valid, mismatched, and out-of-scope receipt flows, then fails
if the valid flow does not verify or if either negative flow is accepted.`);
}

function printSummary(summary: ReceiptDrillSummary) {
  console.log("Coding agent receipt drill: passed");
  console.log(`Output: ${summary.outputDir}`);
  console.log(
    `Source: ${summary.source.boardItems} board items, bundle ${summary.source.bundleDecision}, ` +
    `${summary.source.readySessions} ready / ${summary.source.heldSessions} held`
  );
  console.log(
    `Valid: receipt ${summary.valid.receiptDecision}, evidence ${summary.valid.evidenceDecision}, ` +
    `audit ${summary.valid.artifactAuditDecision}, board applied ${summary.valid.boardItemsApplied}`
  );
  console.log(
    `Mismatched: receipt ${summary.mismatched.receiptDecision}, pending ${summary.mismatched.pendingEvidence}, ` +
    `audit ${summary.mismatched.artifactAuditDecision}, board applied ${summary.mismatched.boardItemsApplied}`
  );
  console.log(`Mismatched first missing: ${summary.mismatched.firstMissingEvidence}`);
  console.log(
    `Out-of-scope: receipt ${summary.outOfScope.receiptDecision}, pending ${summary.outOfScope.pendingEvidence}, ` +
    `audit ${summary.outOfScope.artifactAuditDecision}, board applied ${summary.outOfScope.boardItemsApplied}`
  );
  console.log(`Out-of-scope first missing: ${summary.outOfScope.firstMissingEvidence}`);
}

async function writeArtifact(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${content}\n`, "utf8");
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function relativeOutputDir(outputDir: string) {
  const relative = path.relative(process.cwd(), outputDir).replaceAll(path.sep, "/");
  if (!relative || relative.startsWith("..")) {
    throw new Error("Output directory must be inside the repository workspace.");
  }
  return relative;
}

function safeSlug(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function normalizedPrefix(prefix: string) {
  const normalized = prefix.trim().replace(/^\.\/+/, "").replace(/\/+/g, "/");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
