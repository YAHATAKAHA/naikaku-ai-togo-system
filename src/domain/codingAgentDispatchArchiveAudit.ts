import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import type {
  CodingAgentDispatchArchive,
  CodingAgentDispatchArchiveAudit,
  CodingAgentDispatchArchiveAuditCheck,
  CodingAgentDispatchArchiveAuditCheckStatus,
  CodingAgentDispatchArchiveAuditDecision,
  CodingAgentDispatchManifest,
  CodingAgentSessionReceipt
} from "./types";

export interface AuditCodingAgentDispatchArchiveInput {
  archive: CodingAgentDispatchArchive;
  generatedAt?: string;
}

interface ParsedDispatchManifest {
  manifest: CodingAgentDispatchManifest | null;
  errors: string[];
}

interface ParsedReceiptTemplate {
  receipt: CodingAgentSessionReceipt | null;
  errors: string[];
}

export function auditCodingAgentDispatchArchive({
  archive,
  generatedAt = new Date().toISOString()
}: AuditCodingAgentDispatchArchiveInput): CodingAgentDispatchArchiveAudit {
  const manifestResult = parseDispatchManifest(archive);
  const manifest = manifestResult.manifest;
  const receiptResult = parseReceiptTemplate(archive, manifest?.receiptTemplatePath || null);
  const safePathIssues = archive.files.filter((file) => !isSafeRelativeArtifactPath(file.path));
  const duplicatePaths = duplicatePathCount(archive.files.map((file) => file.path));
  const byteMismatches = archive.files.filter((file) =>
    file.byteLength !== new TextEncoder().encode(file.content).length
  );
  const emptyContent = archive.files.filter((file) => !file.content.trim());
  const promptFiles = archive.files.filter((file) => file.role === "prompt");
  const receiptTemplates = archive.files.filter((file) => file.role === "receipt-template");
  const readyItems = manifest?.items.filter((item) => item.dispatchStatus === "ready-to-dispatch") || [];
  const heldItems = manifest?.items.filter((item) => item.dispatchStatus !== "ready-to-dispatch") || [];
  const missingPromptFiles = manifest
    ? readyItems.filter((item) => !item.promptPath || !fileByPath(archive, item.promptPath)).length
    : promptFiles.length;
  const expectedPromptPaths = new Set(readyItems.map((item) => item.promptPath).filter((path): path is string => Boolean(path)));
  const unexpectedPromptFiles = promptFiles.filter((file) => !expectedPromptPaths.has(file.path)).length;
  const missingReceiptTemplates = expectedReceiptTemplateCount(manifest) - receiptTemplates.length;
  const heldAssigned = heldItems.filter((item) => Boolean(item.promptPath) || Boolean(item.receiptTemplatePath)).length;
  const promptContentMismatches = manifest ? readyItems.filter((item) =>
    !item.promptPath || !promptContentMatches(item, fileByPath(archive, item.promptPath)?.content || "")
  ).length : 0;

  const checks: CodingAgentDispatchArchiveAuditCheck[] = [
    check({
      id: "archive-schema",
      status: archive.schema === "naikaku.coding-agent-dispatch-archive.v1" ? "pass" : "block",
      summary: archive.schema === "naikaku.coding-agent-dispatch-archive.v1"
        ? "Dispatch archive schema is recognized."
        : "Dispatch archive schema is not recognized.",
      evidence: [`Schema: ${archive.schema}`],
      nextAction: "Regenerate the dispatch archive from the current workbench or CLI."
    }),
    check({
      id: "archive-file-inventory",
      status: safePathIssues.length || duplicatePaths || byteMismatches.length || emptyContent.length ? "block" : "pass",
      summary: safePathIssues.length || duplicatePaths || byteMismatches.length || emptyContent.length
        ? "Dispatch archive file inventory has unsafe, duplicate, empty, or byte-mismatched entries."
        : "Dispatch archive file inventory uses safe unique paths with matching byte counts.",
      evidence: [
        `Files: ${archive.files.length}`,
        `Unsafe paths: ${safePathIssues.length}`,
        `Duplicate paths: ${duplicatePaths}`,
        `Byte mismatches: ${byteMismatches.length}`,
        `Empty files: ${emptyContent.length}`
      ],
      nextAction: "Regenerate the archive and keep all package paths relative and unique."
    }),
    check({
      id: "archive-summary",
      status: summaryMatches(archive) ? "pass" : "block",
      summary: summaryMatches(archive)
        ? "Dispatch archive summary matches the file inventory."
        : "Dispatch archive summary does not match the file inventory.",
      evidence: [
        `Summary files: ${archive.summary.files}`,
        `Actual files: ${archive.files.length}`,
        `Summary prompts: ${archive.summary.promptFiles}`,
        `Actual prompts: ${promptFiles.length}`,
        `Summary bytes: ${archive.summary.totalBytes}`,
        `Actual bytes: ${archive.files.reduce((total, file) => total + file.byteLength, 0)}`
      ],
      nextAction: "Regenerate the archive so the summary cannot overstate package contents."
    }),
    check({
      id: "dispatch-manifest",
      status: manifestResult.errors.length ? "block" : "pass",
      summary: manifestResult.errors.length
        ? "Embedded dispatch manifest is missing or invalid."
        : "Embedded dispatch manifest is valid and parseable.",
      evidence: manifestResult.errors.length ? manifestResult.errors : [
        `Decision: ${manifest?.decision}`,
        `Ready: ${manifest?.summary.ready}`,
        `Held: ${manifest?.summary.held}`
      ],
      nextAction: "Keep dispatch-manifest.json attached before handing prompts to coding agents."
    }),
    check({
      id: "manifest-archive-consistency",
      status: manifest && manifestArchiveMatches(archive, manifest) ? "pass" : "block",
      summary: manifest && manifestArchiveMatches(archive, manifest)
        ? "Archive metadata agrees with the embedded dispatch manifest."
        : "Archive metadata does not agree with the embedded dispatch manifest.",
      evidence: [
        `Archive decision: ${archive.decision}`,
        `Manifest decision: ${manifest?.decision || "missing"}`,
        `Archive locale: ${archive.operatorLocale}`,
        `Manifest locale: ${manifest?.operatorLocale || "missing"}`,
        `Archive ready: ${archive.summary.readyItems}`,
        `Manifest ready: ${manifest?.summary.ready ?? "missing"}`
      ],
      nextAction: "Regenerate the archive from the same manifest that will be handed off."
    }),
    check({
      id: "ready-prompts",
      status: missingPromptFiles || unexpectedPromptFiles || promptContentMismatches ? "block" : "pass",
      summary: missingPromptFiles || unexpectedPromptFiles || promptContentMismatches
        ? "Ready dispatch sessions do not match the prompt files in the archive."
        : "Every ready dispatch session has exactly one matching prompt file.",
      evidence: [
        `Ready items: ${readyItems.length}`,
        `Prompt files: ${promptFiles.length}`,
        `Missing prompt files: ${missingPromptFiles}`,
        `Unexpected prompt files: ${unexpectedPromptFiles}`,
        `Prompt content mismatches: ${promptContentMismatches}`
      ],
      nextAction: "Regenerate the prompt package and do not hand off incomplete prompts."
    }),
    check({
      id: "held-unassigned",
      status: heldAssigned ? "block" : "pass",
      summary: heldAssigned
        ? "Held dispatch sessions received assignable prompt or receipt paths."
        : "Held dispatch sessions remain visible but unassigned.",
      evidence: [
        `Held items: ${heldItems.length}`,
        `Held items with assignment paths: ${heldAssigned}`,
        `Archive unassigned held: ${archive.summary.unassignedHeldItems}`
      ],
      nextAction: "Restore dispatch gating so held sessions cannot receive prompt files or receipt templates."
    }),
    check({
      id: "receipt-template",
      status: receiptTemplateStatus({ manifest, receiptTemplates, receiptResult, missingReceiptTemplates }),
      summary: receiptTemplateSummary({ manifest, receiptTemplates, receiptResult, missingReceiptTemplates }),
      evidence: [
        `Manifest receipt path: ${manifest?.receiptTemplatePath || "not-written"}`,
        `Receipt template files: ${receiptTemplates.length}`,
        `Missing receipt templates: ${Math.max(0, missingReceiptTemplates)}`,
        ...receiptResult.errors,
        receiptResult.receipt ? `Receipt schema: ${receiptResult.receipt.schema}` : "Receipt schema: missing"
      ],
      nextAction: "Keep one receipt template only when ready prompt files exist."
    })
  ];

  return {
    schema: "naikaku.coding-agent-dispatch-archive-audit.v1",
    generatedAt,
    sourceSchema: archive.schema,
    sourceDecision: archive.decision,
    decision: auditDecision(checks),
    runId: archive.runId,
    operatorLocale: archive.operatorLocale,
    checks,
    summary: {
      files: archive.files.length,
      promptFiles: promptFiles.length,
      receiptTemplates: receiptTemplates.length,
      readyItems: readyItems.length,
      heldItems: heldItems.length,
      unassignedHeldItems: heldItems.filter((item) => !item.promptPath && !item.receiptTemplatePath).length,
      unsafePaths: safePathIssues.length + (manifest?.summary.unsafePaths || 0),
      duplicatePaths,
      missingPromptFiles,
      unexpectedPromptFiles,
      missingReceiptTemplates: Math.max(0, missingReceiptTemplates),
      blockers: checks.filter((item) => item.status === "block").length,
      warnings: checks.filter((item) => item.status === "warn").length,
      passed: checks.filter((item) => item.status === "pass").length
    },
    honestyClaim: {
      level: "dispatch-archive-audit",
      claim: "This audit checks dispatch archive structure and handoff boundaries without executing implementation work.",
      limitations: [
        "It does not run prompt files, commands, browser actions, providers, deploys, commits, or pushes.",
        "It proves the archive is internally consistent, not that a coding agent completed the work.",
        "It checks embedded receipt templates structurally, not submitted implementation evidence."
      ],
      productionRequirements: [
        "Run the prompt files inside governed coding workspaces or sandbox executor profiles.",
        "Review completed receipts and local artifacts before marking Development Board items done.",
        "Attach production-mode release verification before external production handoff."
      ]
    }
  };
}

export function serializeCodingAgentDispatchArchiveAudit(audit: CodingAgentDispatchArchiveAudit) {
  return JSON.stringify(audit, null, 2);
}

export function serializeCodingAgentDispatchArchiveAuditMarkdown(audit: CodingAgentDispatchArchiveAudit) {
  return [
    "# Coding Agent Dispatch Archive Audit",
    "",
    `Decision: ${audit.decision}`,
    `Source decision: ${audit.sourceDecision}`,
    `Locale: ${audit.operatorLocale}`,
    `Run: ${audit.runId || "workspace"}`,
    `Generated: ${audit.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Files: ${audit.summary.files}`,
    `- Prompt files: ${audit.summary.promptFiles}`,
    `- Receipt templates: ${audit.summary.receiptTemplates}`,
    `- Ready items: ${audit.summary.readyItems}`,
    `- Held items: ${audit.summary.heldItems}`,
    `- Missing prompt files: ${audit.summary.missingPromptFiles}`,
    `- Unexpected prompt files: ${audit.summary.unexpectedPromptFiles}`,
    `- Unsafe paths: ${audit.summary.unsafePaths}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    "",
    "## Checks",
    "",
    ...audit.checks.flatMap((checkItem) => [
      `### ${checkItem.id}`,
      "",
      `- Status: ${checkItem.status}`,
      `- Summary: ${checkItem.summary}`,
      `- Next action: ${checkItem.nextAction}`,
      ...checkItem.evidence.map((item) => `- Evidence: ${item}`),
      ""
    ]),
    "## Honesty Claim",
    "",
    `- ${audit.honestyClaim.claim}`,
    ...audit.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...audit.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function check(input: CodingAgentDispatchArchiveAuditCheck): CodingAgentDispatchArchiveAuditCheck {
  return input;
}

function parseDispatchManifest(archive: CodingAgentDispatchArchive): ParsedDispatchManifest {
  const file = fileByPath(archive, "dispatch-manifest.json");
  if (!file) {
    return {
      manifest: null,
      errors: ["dispatch-manifest.json is missing."]
    };
  }

  try {
    const manifest = JSON.parse(file.content) as CodingAgentDispatchManifest;
    if (manifest.schema !== "naikaku.coding-agent-dispatch-manifest.v1") {
      return {
        manifest: null,
        errors: [`Unexpected dispatch manifest schema: ${String(manifest.schema)}`]
      };
    }
    return {
      manifest,
      errors: []
    };
  } catch (error) {
    return {
      manifest: null,
      errors: [`dispatch-manifest.json is not parseable JSON: ${error instanceof Error ? error.message : "unknown"}`]
    };
  }
}

function parseReceiptTemplate(
  archive: CodingAgentDispatchArchive,
  receiptTemplatePath: string | null
): ParsedReceiptTemplate {
  if (!receiptTemplatePath) {
    return {
      receipt: null,
      errors: []
    };
  }

  const file = fileByPath(archive, receiptTemplatePath);
  if (!file) {
    return {
      receipt: null,
      errors: [`Receipt template is missing: ${receiptTemplatePath}`]
    };
  }

  try {
    const receipt = JSON.parse(file.content) as CodingAgentSessionReceipt;
    if (receipt.schema !== "naikaku.coding-agent-session-receipt.v1") {
      return {
        receipt: null,
        errors: [`Unexpected receipt template schema: ${String(receipt.schema)}`]
      };
    }
    return {
      receipt,
      errors: []
    };
  } catch (error) {
    return {
      receipt: null,
      errors: [`Receipt template is not parseable JSON: ${error instanceof Error ? error.message : "unknown"}`]
    };
  }
}

function fileByPath(archive: CodingAgentDispatchArchive, path: string) {
  return archive.files.find((file) => file.path === path) || null;
}

function duplicatePathCount(paths: string[]) {
  return paths.length - new Set(paths).size;
}

function summaryMatches(archive: CodingAgentDispatchArchive) {
  const promptFiles = archive.files.filter((file) => file.role === "prompt").length;
  const receiptTemplates = archive.files.filter((file) => file.role === "receipt-template").length;
  const totalBytes = archive.files.reduce((total, file) => total + file.byteLength, 0);
  const unsafePaths = archive.files.filter((file) => !isSafeRelativeArtifactPath(file.path)).length;
  return archive.summary.files === archive.files.length
    && archive.summary.promptFiles === promptFiles
    && archive.summary.receiptTemplates === receiptTemplates
    && archive.summary.totalBytes === totalBytes
    && archive.summary.unsafePaths >= unsafePaths;
}

function manifestArchiveMatches(
  archive: CodingAgentDispatchArchive,
  manifest: CodingAgentDispatchManifest
) {
  return archive.sourceSchema === manifest.schema
    && archive.decision === manifest.decision
    && archive.mission === manifest.mission
    && archive.runId === manifest.runId
    && archive.operatorLocale === manifest.operatorLocale
    && archive.summary.readyItems === manifest.summary.ready
    && archive.summary.heldItems === manifest.summary.held
    && archive.summary.promptFiles === manifest.summary.promptFiles
    && archive.summary.receiptTemplates === manifest.summary.receiptTemplates;
}

function promptContentMatches(
  item: CodingAgentDispatchManifest["items"][number],
  content: string
) {
  return content.includes(`# ${item.title}`)
    && content.includes("## Sandbox Contract")
    && content.includes("## Verification")
    && content.includes(item.evidenceArtifactPrefix);
}

function expectedReceiptTemplateCount(manifest: CodingAgentDispatchManifest | null) {
  return manifest?.receiptTemplatePath ? 1 : 0;
}

function receiptTemplateStatus({
  manifest,
  receiptTemplates,
  receiptResult,
  missingReceiptTemplates
}: {
  manifest: CodingAgentDispatchManifest | null;
  receiptTemplates: Array<{ path: string }>;
  receiptResult: ParsedReceiptTemplate;
  missingReceiptTemplates: number;
}): CodingAgentDispatchArchiveAuditCheckStatus {
  if (!manifest) return "block";
  if (missingReceiptTemplates > 0 || receiptResult.errors.length) return "block";
  if (!manifest.receiptTemplatePath && receiptTemplates.length > 0) return "block";
  if (manifest.receiptTemplatePath && receiptTemplates.length !== 1) return "block";
  return "pass";
}

function receiptTemplateSummary({
  manifest,
  receiptTemplates,
  receiptResult,
  missingReceiptTemplates
}: {
  manifest: CodingAgentDispatchManifest | null;
  receiptTemplates: Array<{ path: string }>;
  receiptResult: ParsedReceiptTemplate;
  missingReceiptTemplates: number;
}) {
  const hasError = !manifest
    || missingReceiptTemplates > 0
    || receiptResult.errors.length > 0
    || (!manifest.receiptTemplatePath && receiptTemplates.length > 0)
    || (Boolean(manifest.receiptTemplatePath) && receiptTemplates.length !== 1);
  return hasError
    ? "Receipt template presence does not match dispatch readiness."
    : "Receipt template presence matches dispatch readiness.";
}

function auditDecision(checks: CodingAgentDispatchArchiveAuditCheck[]): CodingAgentDispatchArchiveAuditDecision {
  if (checks.some((item) => item.status === "block")) return "blocked";
  if (checks.some((item) => item.status === "warn")) return "needs-review";
  return "verified";
}
