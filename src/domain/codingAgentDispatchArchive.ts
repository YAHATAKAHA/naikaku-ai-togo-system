import { isSafeRelativeArtifactPath } from "./codingAgentArtifactReferences";
import {
  serializeCodingAgentDispatchManifest,
  serializeCodingAgentDispatchManifestMarkdown
} from "./codingAgentDispatchManifest";
import {
  buildCodingAgentSessionReceiptTemplate,
  serializeCodingAgentSessionReceipt
} from "./codingAgentSessionReceipt";
import type {
  CodingAgentDispatchArchive,
  CodingAgentDispatchArchiveFile,
  CodingAgentDispatchArchiveFileRole,
  CodingAgentDispatchManifest,
  CodingAgentSessionBundle
} from "./types";

export interface BuildCodingAgentDispatchArchiveInput {
  bundle: CodingAgentSessionBundle;
  manifest: CodingAgentDispatchManifest;
  generatedAt?: string;
}

export function buildCodingAgentDispatchArchive({
  bundle,
  manifest,
  generatedAt = manifest.generatedAt
}: BuildCodingAgentDispatchArchiveInput): CodingAgentDispatchArchive {
  const files: CodingAgentDispatchArchiveFile[] = [
    archiveFile({
      path: "README.md",
      role: "readme",
      contentType: "text/markdown",
      content: archiveReadme(manifest)
    }),
    archiveFile({
      path: "dispatch-manifest.json",
      role: "manifest-json",
      contentType: "application/json",
      content: `${serializeCodingAgentDispatchManifest(manifest)}\n`
    }),
    archiveFile({
      path: "dispatch-manifest.md",
      role: "manifest-markdown",
      contentType: "text/markdown",
      content: serializeCodingAgentDispatchManifestMarkdown(manifest)
    })
  ];

  for (const item of manifest.items) {
    if (!item.promptPath) continue;
    const session = bundle.sessions.find((candidate) => candidate.id === item.sessionId);
    if (!session) continue;
    files.push(archiveFile({
      path: item.promptPath,
      role: "prompt",
      contentType: "text/markdown",
      sessionId: session.id,
      dispatchStatus: item.dispatchStatus,
      content: session.handoffMarkdown
    }));
  }

  if (manifest.receiptTemplatePath) {
    const receiptTemplate = buildCodingAgentSessionReceiptTemplate({
      bundle,
      generatedAt
    });
    files.push(archiveFile({
      path: manifest.receiptTemplatePath,
      role: "receipt-template",
      contentType: "application/json",
      content: `${serializeCodingAgentSessionReceipt(receiptTemplate)}\n`
    }));
  }

  const unsafePaths = files.filter((file) => !isSafeRelativeArtifactPath(file.path)).length + manifest.summary.unsafePaths;
  const promptFiles = files.filter((file) => file.role === "prompt").length;
  const receiptTemplates = files.filter((file) => file.role === "receipt-template").length;
  const heldItems = manifest.items.filter((item) => item.dispatchStatus !== "ready-to-dispatch").length;

  return {
    schema: "naikaku.coding-agent-dispatch-archive.v1",
    generatedAt,
    mode: "dry-run-dispatch",
    sourceSchema: manifest.schema,
    bundleSchema: bundle.schema,
    decision: manifest.decision,
    mission: manifest.mission,
    runId: manifest.runId,
    operatorLocale: manifest.operatorLocale,
    files,
    summary: {
      files: files.length,
      totalBytes: files.reduce((total, file) => total + file.byteLength, 0),
      promptFiles,
      receiptTemplates,
      readyItems: manifest.summary.ready,
      heldItems,
      unassignedHeldItems: manifest.items.filter((item) =>
        item.dispatchStatus !== "ready-to-dispatch" && !item.promptPath && !item.receiptTemplatePath
      ).length,
      unsafePaths
    },
    honestyClaim: {
      level: "dry-run-dispatch",
      claim: "This archive packages reviewed coding-agent prompts and receipt instructions without executing implementation work.",
      limitations: [
        "It contains handoff files only; it does not edit code, run commands, browse, deploy, commit, push, or call providers.",
        "Prompt files are included only for ready-to-dispatch sessions.",
        "Held sessions remain visible in the manifest but are not assigned through prompt files."
      ],
      productionRequirements: [
        "Run prompt files inside governed coding workspaces or sandbox executor profiles.",
        "Return completed receipts with real changed files, command transcripts, evidence artifacts, and remaining risks.",
        "Run production-mode release verification before external production handoff."
      ]
    }
  };
}

export function serializeCodingAgentDispatchArchive(archive: CodingAgentDispatchArchive) {
  return JSON.stringify(archive, null, 2);
}

export function serializeCodingAgentDispatchArchiveMarkdown(archive: CodingAgentDispatchArchive) {
  return [
    "# Coding Agent Dispatch Archive",
    "",
    `Mission: ${archive.mission}`,
    `Mode: ${archive.mode}`,
    `Decision: ${archive.decision}`,
    `Locale: ${archive.operatorLocale}`,
    `Run: ${archive.runId || "workspace"}`,
    `Generated: ${archive.generatedAt}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${archive.honestyClaim.claim}`,
    ...archive.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...archive.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Files: ${archive.summary.files}`,
    `- Total bytes: ${archive.summary.totalBytes}`,
    `- Prompt files: ${archive.summary.promptFiles}`,
    `- Receipt templates: ${archive.summary.receiptTemplates}`,
    `- Ready items: ${archive.summary.readyItems}`,
    `- Held items: ${archive.summary.heldItems}`,
    `- Held items without prompt files: ${archive.summary.unassignedHeldItems}`,
    `- Unsafe paths: ${archive.summary.unsafePaths}`,
    "",
    "## File Inventory",
    "",
    ...archive.files.map((file) =>
      `- ${file.path} (${file.role}, ${file.contentType}, ${file.byteLength} bytes${file.sessionId ? `, ${file.sessionId}` : ""})`
    ),
    ""
  ].join("\n");
}

function archiveFile({
  path,
  role,
  contentType,
  sessionId,
  dispatchStatus,
  content
}: {
  path: string;
  role: CodingAgentDispatchArchiveFileRole;
  contentType: CodingAgentDispatchArchiveFile["contentType"];
  sessionId?: string;
  dispatchStatus?: CodingAgentDispatchArchiveFile["dispatchStatus"];
  content: string;
}): CodingAgentDispatchArchiveFile {
  return {
    path,
    role,
    contentType,
    byteLength: new TextEncoder().encode(content).length,
    sessionId,
    dispatchStatus,
    content
  };
}

function archiveReadme(manifest: CodingAgentDispatchManifest) {
  return [
    "# Coding Agent Dispatch Package",
    "",
    `Decision: ${manifest.decision}`,
    `Locale: ${manifest.operatorLocale}`,
    `Receipt template: ${manifest.receiptTemplatePath || "not written"}`,
    "",
    "This package is a reviewed handoff surface for governed coding-agent work. It does not prove implementation.",
    "",
    "Only items marked `ready-to-dispatch` have prompt files. Held items must stay with the operator until their next action is resolved.",
    "",
    "Expected evidence must return under the session evidence prefixes listed in `dispatch-manifest.json`."
  ].join("\n");
}
