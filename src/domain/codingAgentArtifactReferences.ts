export function evidenceArtifactPathFrom(entry: string) {
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

export function looksLikeArtifactPath(path: string) {
  const trimmed = path.trim();
  if (/^(attached|pending|none|n\/a|not applicable)$/i.test(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  return /[/.\\]/.test(path) || path.startsWith("~") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);
}

export function isSafeRelativeArtifactPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("~")) return false;
  if (/^[a-zA-Z]:/.test(trimmed)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  if (trimmed.includes("\\")) return false;
  return !trimmed.split("/").some((part) => part === "..");
}
