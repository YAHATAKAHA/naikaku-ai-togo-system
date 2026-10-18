import path from "node:path";
import type { DataClassification } from "./types";

export interface LeakFinding {
  id: string;
  category: "credential" | "pii" | "system-secret" | "exfiltration-vector";
  severity: "critical" | "high" | "medium";
  patternName: string;
  matchedPreview: string;
  summary: string;
}

export interface SanitizeResult {
  sanitized: string;
  redactedCount: number;
  findings: LeakFinding[];
}

export interface LeakDetectionRule {
  id: string;
  category: LeakFinding["category"];
  severity: LeakFinding["severity"];
  name: string;
  summary: string;
  regex: RegExp;
  redactReplacement: string;
}

export const leakDetectionRules: LeakDetectionRule[] = [
  // 1. Cloud & Provider Credentials
  {
    id: "aws-access-key",
    category: "credential",
    severity: "critical",
    name: "AWS Access Key",
    summary: "Standard AWS Access Key ID detected.",
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    redactReplacement: "[REDACTED_AWS_ACCESS_KEY]"
  },
  {
    id: "github-pat",
    category: "credential",
    severity: "critical",
    name: "GitHub Personal Access Token",
    summary: "GitHub Personal Access Token detected.",
    regex: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,82})\b/g,
    redactReplacement: "[REDACTED_GITHUB_TOKEN]"
  },
  {
    id: "private-ssh-or-rsa-key",
    category: "credential",
    severity: "critical",
    name: "Private Key Header",
    summary: "RSA, EC, or OpenSSH Private Key block detected.",
    regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----/g,
    redactReplacement: "[REDACTED_PRIVATE_KEY_BLOCK]"
  },
  {
    id: "google-api-key",
    category: "credential",
    severity: "critical",
    name: "Google API Key",
    summary: "Google API key pattern detected.",
    regex: /\b(AIza[0-9A-Za-z_-]{30,40})\b/g,
    redactReplacement: "[REDACTED_GOOGLE_API_KEY]"
  },
  {
    id: "jwt-token",
    category: "credential",
    severity: "high",
    name: "JSON Web Token (JWT)",
    summary: "JWT authentication bearer token detected.",
    regex: /\beyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\b/g,
    redactReplacement: "[REDACTED_JWT_TOKEN]"
  },
  {
    id: "inlined-secret-assignment",
    category: "credential",
    severity: "critical",
    name: "Inline Secret Assignment",
    summary: "Hardcoded secret, token, or password assignment detected in code or config.",
    regex: /(?:api[_-]?key|secret|password|access[_-]?token|private[_-]?key)\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi,
    redactReplacement: "[REDACTED_HARDCODED_SECRET]"
  },

  // 2. Japanese & International Personal Identifiable Information (PII)
  {
    id: "credit-card-number",
    category: "pii",
    severity: "critical",
    name: "Credit Card Number",
    summary: "Major credit card number pattern (Visa, Mastercard, JCB, Amex) detected.",
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    redactReplacement: "[REDACTED_CREDIT_CARD]"
  },
  {
    id: "jp-my-number",
    category: "pii",
    severity: "critical",
    name: "Japanese Individual Number (マイナンバー)",
    summary: "12-digit Japanese Individual Number pattern detected.",
    regex: /(?<!\d)(?:\d{4}[ -]?\d{4}[ -]?\d{4})(?!\d|[- ]\d{4})/g,
    redactReplacement: "[REDACTED_MY_NUMBER]"
  },
  {
    id: "jp-phone-number",
    category: "pii",
    severity: "medium",
    name: "Japanese Phone Number",
    summary: "Japanese telephone or mobile phone number detected.",
    regex: /\b(0[1-9]\d{0,3}[- ]?\d{1,4}[- ]?\d{4})\b/g,
    redactReplacement: "[REDACTED_PHONE_NUMBER]"
  },

  // 3. System Files & Exfiltration Targets
  {
    id: "system-secret-file-ref",
    category: "system-secret",
    severity: "critical",
    name: "Sensitive System File Reference",
    summary: "Reference or attempt to access private credentials file (.env, id_rsa, etc.).",
    regex: /(?:\/\.env|\.env\.local|\/\.ssh\/id_[a-z0-9]+|\/\.aws\/credentials|\/etc\/shadow|\/etc\/passwd|\/\.kube\/config)\b/gi,
    redactReplacement: "[REDACTED_SYSTEM_SECRET_FILE]"
  },
  {
    id: "outbound-exfiltration-vector",
    category: "exfiltration-vector",
    severity: "critical",
    name: "Data Exfiltration Command Vector",
    summary: "Command attempting to upload or pipe data to external destination.",
    regex: /\b(?:curl|wget)\s+.*(?:--data|-d|--upload-file|-T|--post-data)\s+.*(?:https?:\/\/|\$)/gi,
    redactReplacement: "[BLOCKED_EXFILTRATION_COMMAND]"
  }
];

/**
 * Detects all information leaks and credential/PII exposures in a given text string.
 */
export function detectInformationLeaks(text: string): LeakFinding[] {
  if (!text || typeof text !== "string") return [];

  const findings: LeakFinding[] = [];

  for (const rule of leakDetectionRules) {
    const rx = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null = null;

    while ((match = rx.exec(text)) !== null) {
      const fullMatch = match[0];
      const preview =
        fullMatch.length > 40
          ? `${fullMatch.slice(0, 16)}...${fullMatch.slice(-8)}`
          : fullMatch;

      findings.push({
        id: rule.id,
        category: rule.category,
        severity: rule.severity,
        patternName: rule.name,
        matchedPreview: preview,
        summary: rule.summary
      });

      // Avoid infinite loop on zero-width match
      if (match.index === rx.lastIndex) {
        rx.lastIndex += 1;
      }
    }
  }

  return findings;
}

/**
 * Automatically masks and redacts all detected secrets, credentials, and PII from text.
 * Ensures the sanitized output is safe for logging, audit receipts, git diffs, and LLM context.
 */
export function sanitizeInformationLeaks(text: string): SanitizeResult {
  if (!text || typeof text !== "string") {
    return { sanitized: "", redactedCount: 0, findings: [] };
  }

  let sanitized = text;
  const findings: LeakFinding[] = [];
  let redactedCount = 0;

  for (const rule of leakDetectionRules) {
    const rx = new RegExp(rule.regex.source, rule.regex.flags);
    const matches = sanitized.match(rx);

    if (matches && matches.length > 0) {
      for (const m of matches) {
        findings.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          patternName: rule.name,
          matchedPreview: m.length > 30 ? `${m.slice(0, 10)}...${m.slice(-6)}` : m,
          summary: rule.summary
        });
        redactedCount += 1;
      }

      // Handle replacement
      if (rule.id === "inlined-secret-assignment") {
        sanitized = sanitized.replace(
          /(api[_-]?key|secret|password|access[_-]?token|private[_-]?key)\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi,
          `$1 = "${rule.redactReplacement}"`
        );
      } else {
        sanitized = sanitized.replace(rx, rule.redactReplacement);
      }
    }
  }

  return {
    sanitized,
    redactedCount,
    findings
  };
}

/**
 * Validates whether a file target is safely contained within the designated worktree sandbox,
 * strictly preventing path traversal attacks (../../), access to ~/.ssh, /etc, or root.
 */
export function validateWorktreeSafeBoundary(
  targetFilePath: string,
  worktreeDir: string
): { safe: boolean; resolvedPath?: string; reason?: string } {
  if (!targetFilePath || typeof targetFilePath !== "string") {
    return { safe: false, reason: "Target file path is empty or invalid." };
  }

  const resolvedWorktree = path.resolve(worktreeDir);
  const resolvedTarget = path.resolve(resolvedWorktree, targetFilePath);

  // 1. Path Traversal check: resolved target must start with worktreeDir
  if (!resolvedTarget.startsWith(resolvedWorktree)) {
    return {
      safe: false,
      reason: `Path traversal violation: Target '${targetFilePath}' escapes sandbox worktree '${worktreeDir}'.`
    };
  }

  // 2. Sensitive directory and file blocklist within worktree
  const normalizedRel = path.relative(resolvedWorktree, resolvedTarget).replace(/\\/g, "/");
  const prohibitedPatterns = [
    /^\.env(?:\..+)?$/i,
    /^\.git\/config$/i,
    /^\.git\/hooks/i,
    /(?:^|\/)id_[a-z0-9]+$/i,
    /(?:^|\/)\.aws\//i,
    /(?:^|\/)\.ssh\//i
  ];

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(normalizedRel)) {
      return {
        safe: false,
        reason: `Access to restricted security asset prohibited: '${normalizedRel}'.`
      };
    }
  }

  return {
    safe: true,
    resolvedPath: resolvedTarget
  };
}

/**
 * Enforces organizational data classification clearance.
 * If data contains elements exceeding the allowed classification, flags violations.
 */
export function auditDataClearance(
  text: string,
  clearance: DataClassification
): { allowed: boolean; violations: string[]; sanitized: string } {
  const leaks = detectInformationLeaks(text);
  const violations: string[] = [];

  for (const leak of leaks) {
    if (clearance === "public") {
      violations.push(`[${clearance}] ${leak.patternName} is prohibited under public clearance.`);
    } else if (clearance === "internal") {
      if (leak.category === "credential" || leak.category === "pii" || leak.category === "system-secret") {
        violations.push(`[${clearance}] ${leak.patternName} cannot be shared without explicit secret clearance.`);
      }
    } else if (clearance === "confidential") {
      if (leak.category === "credential" && leak.severity === "critical") {
        violations.push(`[${clearance}] Critical credential (${leak.patternName}) requires dedicated secret vault isolation.`);
      }
    }
  }

  const { sanitized } = sanitizeInformationLeaks(text);
  return {
    allowed: violations.length === 0,
    violations,
    sanitized
  };
}
