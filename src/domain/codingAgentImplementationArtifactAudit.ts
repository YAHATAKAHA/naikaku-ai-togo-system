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
  artifactProbe?: (relativePath: string) => CodingAgentArtifactProbeResult;
  pathExists?: (relativePath: string) => boolean;
}

export interface CodingAgentArtifactProbeResult {
  exists: boolean;
  bytes?: number;
  sha256?: string;
  modifiedAt?: string;
}

export function auditCodingAgentImplementationArtifacts({
  evidence,
  generatedAt = new Date().toISOString(),
  artifactProbe,
  pathExists
}: AuditCodingAgentImplementationArtifactsInput): CodingAgentImplementationArtifactAudit {
  const probe = artifactProbe ?? pathExistsProbe(pathExists);
  const items = evidence.items.map((item) => auditItem(item, evidence, probe));
  const paths = items.flatMap((item) => item.paths);
  const summary = summarizeAudit(items, paths);

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
        "It verifies local path safety and, when a gateway supplies filesystem access, local path existence plus optional sha256 and byte fingerprints.",
        "It does not rerun commands or prove command output contents are truthful.",
        "It does not verify remote workspaces, external repositories, deploy targets, model calls, or Git remotes."
      ]
    }
  };
}

function auditItem(
  item: CodingAgentImplementationEvidenceItem,
  evidence: CodingAgentImplementationEvidence,
  artifactProbe?: (relativePath: string) => CodingAgentArtifactProbeResult
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
    paths.push(checkPath("changed-file", path, artifactProbe));
  });

  item.commandResults.forEach((result) => {
    if (typeof result.exitCode === "number" && result.exitCode !== 0) {
      missing.push(`Command failed and cannot support completion: ${result.command}.`);
    }

    if (!result.transcriptRef) {
      missing.push(`Transcript reference is required: ${result.command}.`);
      return;
    }

    paths.push(checkPath("command-transcript", result.transcriptRef, artifactProbe));
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
  artifactProbe?: (relativePath: string) => CodingAgentArtifactProbeResult
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

  if (!artifactProbe) {
    return {
      kind,
      path,
      status: "not-checked",
      reason: "Local filesystem access was not available for path existence verification."
    };
  }

  let probeResult: CodingAgentArtifactProbeResult;
  try {
    probeResult = artifactProbe(path);
  } catch (error) {
    return {
      kind,
      path,
      status: "missing",
      reason: `Artifact path probe failed: ${error instanceof Error ? error.message : "unknown error"}.`
    };
  }

  if (!probeResult.exists) {
    return {
      kind,
      path,
      status: "missing",
      reason: "Artifact path was not found in the local sandbox workspace."
    };
  }

  if (kind === "command-transcript" && typeof probeResult.bytes === "number" && probeResult.bytes <= 0) {
    return {
      kind,
      path,
      status: "missing",
      reason: "Command transcript artifact exists but is empty.",
      bytes: probeResult.bytes,
      sha256: probeResult.sha256,
      modifiedAt: probeResult.modifiedAt
    };
  }

  return {
    kind,
    path,
    status: "verified",
    reason: "Artifact path exists in the local sandbox workspace.",
    bytes: probeResult.bytes,
    sha256: probeResult.sha256,
    modifiedAt: probeResult.modifiedAt
  };
}

function pathExistsProbe(pathExists?: (relativePath: string) => boolean) {
  if (!pathExists) return undefined;
  return (relativePath: string): CodingAgentArtifactProbeResult => ({
    exists: pathExists(relativePath)
  });
}

function summarizeAudit(
  items: CodingAgentImplementationArtifactAuditItem[],
  paths: CodingAgentImplementationArtifactPath[]
): CodingAgentImplementationArtifactAudit["summary"] {
  const uniquePathKeys = new Set(paths.map((path) => path.path));
  const uniqueFingerprintedPathKeys = new Set(
    paths.filter((path) => Boolean(path.sha256)).map((path) => path.path)
  );

  return {
    total: items.length,
    verified: items.filter((item) => item.decision === "verified").length,
    needsArtifacts: items.filter((item) => item.decision === "needs-artifacts").length,
    blocked: items.filter((item) => item.decision === "blocked").length,
    paths: paths.length,
    verifiedPaths: paths.filter((path) => path.status === "verified").length,
    missingPaths: paths.filter((path) => path.status === "missing").length,
    unsafePaths: paths.filter((path) => path.status === "unsafe").length,
    uncheckedPaths: paths.filter((path) => path.status === "not-checked").length,
    fingerprintedPaths: paths.filter((path) => Boolean(path.sha256)).length,
    totalBytes: paths.reduce((total, path) => total + (path.bytes ?? 0), 0),
    uniquePaths: uniquePathKeys.size,
    duplicatePathRefs: paths.length - uniquePathKeys.size,
    uniqueFingerprintedPaths: uniqueFingerprintedPathKeys.size,
    uniqueFingerprintBytes: uniqueFingerprintBytes(paths)
  };
}

function uniqueFingerprintBytes(paths: CodingAgentImplementationArtifactPath[]) {
  const seen = new Set<string>();
  return paths.reduce((total, path) => {
    if (!path.sha256 || seen.has(path.path)) return total;
    seen.add(path.path);
    return total + (path.bytes ?? 0);
  }, 0);
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
