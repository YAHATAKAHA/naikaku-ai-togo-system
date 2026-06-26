import type {
  CodingAgentCommandResult,
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationArtifactAuditDecision,
  CodingAgentImplementationArtifactAuditItem,
  CodingAgentImplementationArtifactPath,
  CodingAgentImplementationArtifactPathKind,
  CodingAgentImplementationEvidence,
  CodingAgentImplementationEvidenceItem
} from "./types";

export interface AuditCodingAgentImplementationArtifactsInput {
  evidence: CodingAgentImplementationEvidence;
  generatedAt?: string;
  pathExists?: (relativePath: string) => boolean;
}

export function auditCodingAgentImplementationArtifacts({
  evidence,
  generatedAt = new Date().toISOString(),
  pathExists
}: AuditCodingAgentImplementationArtifactsInput): CodingAgentImplementationArtifactAudit {
  const items = evidence.items.map((item) => auditItem(item, evidence, pathExists));
  const paths = items.flatMap((item) => item.paths);
  const summary = {
    total: items.length,
    verified: items.filter((item) => item.decision === "verified").length,
    needsArtifacts: items.filter((item) => item.decision === "needs-artifacts").length,
    blocked: items.filter((item) => item.decision === "blocked").length,
    paths: paths.length,
    verifiedPaths: paths.filter((path) => path.status === "verified").length,
    missingPaths: paths.filter((path) => path.status === "missing").length,
    unsafePaths: paths.filter((path) => path.status === "unsafe").length,
    uncheckedPaths: paths.filter((path) => path.status === "not-checked").length
  };

  return {
    schema: "naikaku.coding-agent-implementation-artifact-audit.v1",
    generatedAt,
    sourceSchema: evidence.schema,
    sourceDecision: evidence.decision,
    decision: artifactAuditDecision(evidence, summary),
    runId: evidence.runId,
    items,
    summary,
    honestyClaim: {
      claim: "This audit checks local coding-agent artifact references before updating development-board status.",
      limitations: [
        "It verifies local path safety and, when a gateway supplies filesystem access, local path existence.",
        "It does not rerun commands or prove command output contents are truthful.",
        "It does not verify remote workspaces, external repositories, deploy targets, model calls, or Git remotes."
      ]
    }
  };
}

function auditItem(
  item: CodingAgentImplementationEvidenceItem,
  evidence: CodingAgentImplementationEvidence,
  pathExists?: (relativePath: string) => boolean
): CodingAgentImplementationArtifactAuditItem {
  const paths: CodingAgentImplementationArtifactPath[] = [];
  const missing: string[] = [];

  if (evidence.decision !== "accepted-for-handoff" || !item.accepted) {
    missing.push(`Implementation evidence is not accepted: ${evidence.decision}.`);
  }

  if (!item.changedFiles.length) {
    missing.push("At least one changed file path is required.");
  }

  item.changedFiles.forEach((path) => {
    paths.push(checkPath("changed-file", path, pathExists));
  });

  item.commandResults.forEach((result) => {
    if (typeof result.exitCode === "number" && result.exitCode !== 0) {
      missing.push(`Command failed and cannot support completion: ${result.command}.`);
    }

    if (!result.transcriptRef) {
      missing.push(`Transcript reference is required: ${result.command}.`);
      return;
    }

    paths.push(checkPath("command-transcript", result.transcriptRef, pathExists));
  });

  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    decision: itemDecision(paths, missing),
    paths,
    missing
  };
}

function checkPath(
  kind: CodingAgentImplementationArtifactPathKind,
  path: string,
  pathExists?: (relativePath: string) => boolean
): CodingAgentImplementationArtifactPath {
  if (!path.trim()) {
    return {
      kind,
      path,
      status: "missing",
      reason: "Artifact path is empty."
    };
  }

  if (!isSafeRelativePath(path)) {
    return {
      kind,
      path,
      status: "unsafe",
      reason: "Artifact path must be a safe relative path inside the sandbox workspace."
    };
  }

  if (!pathExists) {
    return {
      kind,
      path,
      status: "not-checked",
      reason: "Local filesystem access was not available for path existence verification."
    };
  }

  return pathExists(path)
    ? {
        kind,
        path,
        status: "verified",
        reason: "Artifact path exists in the local sandbox workspace."
      }
    : {
        kind,
        path,
        status: "missing",
        reason: "Artifact path was not found in the local sandbox workspace."
      };
}

function itemDecision(
  paths: CodingAgentImplementationArtifactPath[],
  missing: string[]
): CodingAgentImplementationArtifactAuditDecision {
  if (paths.some((path) => path.status === "unsafe")) return "blocked";
  if (missing.length) return "needs-artifacts";
  if (paths.some((path) => path.status === "missing" || path.status === "not-checked")) {
    return "needs-artifacts";
  }
  return "verified";
}

function artifactAuditDecision(
  evidence: CodingAgentImplementationEvidence,
  summary: CodingAgentImplementationArtifactAudit["summary"]
): CodingAgentImplementationArtifactAuditDecision {
  if (evidence.decision === "blocked" || summary.blocked > 0) return "blocked";
  if (evidence.decision !== "accepted-for-handoff" || summary.needsArtifacts > 0) return "needs-artifacts";
  return "verified";
}

function isSafeRelativePath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("~")) return false;
  if (/^[a-zA-Z]:/.test(trimmed)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  if (trimmed.includes("\\")) return false;
  return !trimmed.split("/").some((part) => part === "..");
}
