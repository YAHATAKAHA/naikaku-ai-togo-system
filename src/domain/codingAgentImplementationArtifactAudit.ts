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
  text?: string;
}

interface CommandTranscriptExpectation {
  command: string;
  exitCode: number | null;
}

export function auditCodingAgentImplementationArtifacts({
  evidence,
  generatedAt = new Date().toISOString(),
  artifactProbe,
  pathExists
}: AuditCodingAgentImplementationArtifactsInput): CodingAgentImplementationArtifactAudit {
  const probe = artifactProbe ?? pathExistsProbe(pathExists);
  const transcriptUsage = transcriptUsageFor(evidence);
  const changedFileUsage = changedFileUsageFor(evidence);
  const items = evidence.items.map((item) =>
    auditItem(item, evidence, transcriptUsage, changedFileUsage, probe)
  );
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
  transcriptUsage: Map<string, number>,
  changedFileUsage: Map<string, number>,
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
    const usageCount = changedFileUsage.get(path) ?? 0;
    if (usageCount > 1) {
      missing.push(
        `Changed file reference is reused by ${usageCount} sessions: ${path}. Provide session-specific changed-file evidence or keep this item for manual review.`
      );
    }
    paths.push(checkPath("changed-file", path, artifactProbe));
  });

  if (!item.evidence.length) {
    missing.push("At least one evidence artifact reference is required.");
  }

  item.evidence.forEach((entry) => {
    const artifactPath = evidenceArtifactPathFrom(entry);
    if (!artifactPath) {
      missing.push(
        `Evidence artifact must include a local artifact path, not only a claim: ${entry || "(empty)"}.`
      );
      paths.push({
        kind: "evidence-artifact",
        path: entry,
        status: "missing",
        reason: "Evidence artifact entry did not include a path-like local artifact reference."
      });
      return;
    }
    paths.push(checkPath("evidence-artifact", artifactPath, artifactProbe));
  });

  item.commandResults.forEach((result) => {
    if (typeof result.exitCode === "number" && result.exitCode !== 0) {
      missing.push(`Command failed and cannot support completion: ${result.command}.`);
    }

    if (!result.transcriptRef) {
      missing.push(`Transcript reference is required: ${result.command}.`);
      return;
    }

    const usageCount = transcriptUsage.get(result.transcriptRef) ?? 0;
    if (usageCount > 1) {
      missing.push(
        `Transcript reference is reused by ${usageCount} command results: ${result.transcriptRef}. Provide one transcript artifact per command result.`
      );
    }

    paths.push(checkPath("command-transcript", result.transcriptRef, artifactProbe, {
      command: result.command,
      exitCode: result.exitCode
    }));
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
  artifactProbe?: (relativePath: string) => CodingAgentArtifactProbeResult,
  transcriptExpectation?: CommandTranscriptExpectation
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

  const transcriptContentCheck = kind === "command-transcript" && transcriptExpectation
    ? checkTranscriptContent(probeResult.text, transcriptExpectation)
    : null;

  if (transcriptContentCheck && !transcriptContentCheck.ok) {
    return {
      kind,
      path,
      status: "missing",
      reason: transcriptContentCheck.reason,
      bytes: probeResult.bytes,
      sha256: probeResult.sha256,
      modifiedAt: probeResult.modifiedAt,
      transcriptCommandMatched: transcriptContentCheck.commandMatched,
      transcriptExitCodeMatched: transcriptContentCheck.exitCodeMatched
    };
  }

  return {
    kind,
    path,
    status: "verified",
    reason: "Artifact path exists in the local sandbox workspace.",
    bytes: probeResult.bytes,
    sha256: probeResult.sha256,
    modifiedAt: probeResult.modifiedAt,
    transcriptCommandMatched: transcriptContentCheck?.commandMatched,
    transcriptExitCodeMatched: transcriptContentCheck?.exitCodeMatched
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
  const transcriptRefCounts = countTranscriptRefs(paths);
  const reusedTranscriptCounts = [...transcriptRefCounts.values()].filter((count) => count > 1);
  const changedFileRefCounts = countChangedFileRefs(paths);
  const reusedChangedFileCounts = [...changedFileRefCounts.values()].filter((count) => count > 1);
  const evidenceArtifactRefs = paths.filter((path) => path.kind === "evidence-artifact");
  const uniqueEvidenceArtifactRefs = new Set(evidenceArtifactRefs.map((path) => path.path));
  const transcriptContentChecked = paths.filter((path) =>
    typeof path.transcriptCommandMatched === "boolean" || typeof path.transcriptExitCodeMatched === "boolean"
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
    uniqueFingerprintBytes: uniqueFingerprintBytes(paths),
    evidenceArtifactRefs: evidenceArtifactRefs.length,
    evidenceArtifactPaths: uniqueEvidenceArtifactRefs.size,
    reusedTranscriptPaths: reusedTranscriptCounts.length,
    reusedTranscriptRefs: reusedTranscriptCounts.reduce((total, count) => total + count - 1, 0),
    reusedChangedFilePaths: reusedChangedFileCounts.length,
    reusedChangedFileRefs: reusedChangedFileCounts.reduce((total, count) => total + count - 1, 0),
    transcriptContentChecked: transcriptContentChecked.length,
    transcriptContentMismatches: transcriptContentChecked.filter((path) =>
      path.transcriptCommandMatched === false || path.transcriptExitCodeMatched === false
    ).length
  };
}

function checkTranscriptContent(
  text: string | undefined,
  expectation: CommandTranscriptExpectation
) {
  if (typeof text !== "string") return null;

  const commandMatched = normalizedIncludes(text, expectation.command);
  const exitCodeMatched = typeof expectation.exitCode === "number"
    ? transcriptMentionsExitCode(text, expectation.exitCode)
    : undefined;

  if (!commandMatched) {
    return {
      ok: false,
      reason: "Command transcript does not mention the expected command.",
      commandMatched,
      exitCodeMatched
    };
  }

  if (exitCodeMatched === false) {
    return {
      ok: false,
      reason: "Command transcript does not mention the expected exit code.",
      commandMatched,
      exitCodeMatched
    };
  }

  return {
    ok: true,
    reason: "Command transcript mentions the expected command and exit code.",
    commandMatched,
    exitCodeMatched
  };
}

function normalizedIncludes(text: string, expected: string) {
  return normalizeWhitespace(text).includes(normalizeWhitespace(expected));
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function transcriptMentionsExitCode(text: string, exitCode: number) {
  const escapedExitCode = String(exitCode).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:exit\\s*code|exitCode)\\s*[:=]?\\s*${escapedExitCode}\\b`, "i").test(text);
}

function evidenceArtifactPathFrom(entry: string) {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  const markdownLink = trimmed.match(/\[[^\]]+\]\(([^)]+)\)/);
  const separatorSuffix = trimmed.match(/(?:=>|->|:)\s*([^:]+)$/);
  const candidates = [
    markdownLink?.[1],
    separatorSuffix?.[1],
    trimmed
  ]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => candidate.trim());

  return candidates.find((candidate) => looksLikeArtifactPath(candidate)) ?? null;
}

function looksLikeArtifactPath(path: string) {
  const trimmed = path.trim();
  if (/^(attached|pending|none|n\/a|not applicable)$/i.test(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  return /[/.\\]/.test(path) || path.startsWith("~") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
}

function changedFileUsageFor(evidence: CodingAgentImplementationEvidence) {
  const usage = new Map<string, Set<string>>();
  evidence.items.forEach((item) => {
    item.changedFiles.forEach((path) => {
      const sessions = usage.get(path) ?? new Set<string>();
      sessions.add(item.sessionId);
      usage.set(path, sessions);
    });
  });
  return new Map([...usage.entries()].map(([path, sessions]) => [path, sessions.size]));
}

function transcriptUsageFor(evidence: CodingAgentImplementationEvidence) {
  const usage = new Map<string, number>();
  evidence.items.forEach((item) => {
    item.commandResults.forEach((result) => {
      if (!result.transcriptRef) return;
      usage.set(result.transcriptRef, (usage.get(result.transcriptRef) ?? 0) + 1);
    });
  });
  return usage;
}

function countChangedFileRefs(paths: CodingAgentImplementationArtifactPath[]) {
  const counts = new Map<string, number>();
  paths
    .filter((path) => path.kind === "changed-file")
    .forEach((path) => {
      counts.set(path.path, (counts.get(path.path) ?? 0) + 1);
    });
  return counts;
}

function countTranscriptRefs(paths: CodingAgentImplementationArtifactPath[]) {
  const counts = new Map<string, number>();
  paths
    .filter((path) => path.kind === "command-transcript")
    .forEach((path) => {
      counts.set(path.path, (counts.get(path.path) ?? 0) + 1);
    });
  return counts;
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
