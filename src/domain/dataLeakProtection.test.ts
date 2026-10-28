import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditDataClearance,
  detectInformationLeaks,
  sanitizeInformationLeaks,
  validateWorktreeSafeBoundary
} from "./dataLeakProtection";

describe("dataLeakProtection (情報漏洩防止・DLPエンジン)", () => {
  it("detects and redacts cloud credentials and API keys", () => {
    const awsAccessKey = ["AKIA", "1234567890ABCDEF"].join("");
    const githubToken = ["ghp_", "111122223333444455556666777788889999"].join("");
    const googleApiKey = ["AIza", "SyD-1234567890abcdefghijklmnopqrst"].join("");
    const inlineSecret = ["super_", "secret_password_12345"].join("");
    const raw = `
      const awsKey = "${awsAccessKey}";
      const ghToken = "${githubToken}";
      const gApiKey = "${googleApiKey}";
      const config = { secret: "${inlineSecret}" };
    `;

    const findings = detectInformationLeaks(raw);
    expect(findings.length).toBeGreaterThanOrEqual(4);
    expect(findings.map((f) => f.id)).toContain("aws-access-key");
    expect(findings.map((f) => f.id)).toContain("github-pat");
    expect(findings.map((f) => f.id)).toContain("google-api-key");
    expect(findings.map((f) => f.id)).toContain("inlined-secret-assignment");

    const { sanitized, redactedCount } = sanitizeInformationLeaks(raw);
    expect(redactedCount).toBeGreaterThanOrEqual(4);
    expect(sanitized).not.toContain(awsAccessKey);
    expect(sanitized).not.toContain(githubToken);
    expect(sanitized).not.toContain(googleApiKey);
    expect(sanitized).not.toContain(inlineSecret);
    expect(sanitized).toContain("[REDACTED_AWS_ACCESS_KEY]");
    expect(sanitized).toContain("[REDACTED_GITHUB_TOKEN]");
  });

  it("detects and redacts Japanese My Number, credit cards, and phone numbers", () => {
    const raw = `
      顧客マイナンバー: 1234-5678-9012
      クレカ番号: 4532-1234-5678-9010
      電話番号: 03-1234-5678 または 090-1234-5678
    `;

    const findings = detectInformationLeaks(raw);
    expect(findings.some((f) => f.id === "jp-my-number")).toBe(true);
    expect(findings.some((f) => f.id === "credit-card-number")).toBe(true);
    expect(findings.some((f) => f.id === "jp-phone-number")).toBe(true);

    const { sanitized, redactedCount } = sanitizeInformationLeaks(raw);
    expect(redactedCount).toBeGreaterThanOrEqual(3);
    expect(sanitized).not.toContain("1234-5678-9012");
    expect(sanitized).not.toContain("4532-1234-5678-9010");
    expect(sanitized).not.toContain("03-1234-5678");
    expect(sanitized).toContain("[REDACTED_MY_NUMBER]");
    expect(sanitized).toContain("[REDACTED_CREDIT_CARD]");
  });

  it("detects and redacts private key blocks and sensitive system file references", () => {
    const privateKeyHeader = ["-----BEGIN RSA", "PRIVATE KEY-----"].join(" ");
    const privateKeyFooter = ["-----END RSA", "PRIVATE KEY-----"].join(" ");
    const privateKeyBlock = `
${privateKeyHeader}
MIIEowIBAAKCAQEA0Y8...fake...private...key...
${privateKeyFooter}
`;
    const textWithEnv = `Check /path/.env and /.ssh/id_rsa for details.`;

    const leak1 = detectInformationLeaks(privateKeyBlock);
    expect(leak1.some((f) => f.id === "private-ssh-or-rsa-key")).toBe(true);

    const sanitizedKey = sanitizeInformationLeaks(privateKeyBlock).sanitized;
    expect(sanitizedKey).toContain("[REDACTED_PRIVATE_KEY_BLOCK]");

    const leak2 = detectInformationLeaks(textWithEnv);
    expect(leak2.some((f) => f.id === "system-secret-file-ref")).toBe(true);
    const sanitizedEnv = sanitizeInformationLeaks(textWithEnv).sanitized;
    expect(sanitizedEnv).toContain("[REDACTED_SYSTEM_SECRET_FILE]");
  });

  it("validates sandbox worktree boundaries and strictly blocks path traversal or sensitive file access", () => {
    const mockWorktree = "/tmp/sandbox-worktree";

    // 1. Safe target inside worktree
    const safeCheck = validateWorktreeSafeBoundary("src/domain/validator.ts", mockWorktree);
    expect(safeCheck.safe).toBe(true);
    expect(safeCheck.resolvedPath).toBe(path.resolve(mockWorktree, "src/domain/validator.ts"));

    // 2. Traversal attempt out of worktree
    const escapeCheck = validateWorktreeSafeBoundary("../../etc/passwd", mockWorktree);
    expect(escapeCheck.safe).toBe(false);
    expect(escapeCheck.reason).toContain("Path traversal violation");

    // 3. Prohibited security assets inside worktree (e.g. .env, .git/config)
    const envCheck = validateWorktreeSafeBoundary(".env", mockWorktree);
    expect(envCheck.safe).toBe(false);
    expect(envCheck.reason).toContain("restricted security asset prohibited");

    const gitConfigCheck = validateWorktreeSafeBoundary(".git/config", mockWorktree);
    expect(gitConfigCheck.safe).toBe(false);
  });

  it("enforces organizational data classification clearance levels", () => {
    const awsAccessKey = ["AKIA", "1234567890ABCDEF"].join("");
    const text = `Customer My Number: 1234-5678-9012, API Key: ${awsAccessKey}`;

    // Public clearance: strictly disallows both
    const pub = auditDataClearance(text, "public");
    expect(pub.allowed).toBe(false);
    expect(pub.violations.length).toBeGreaterThanOrEqual(2);

    // Internal clearance: disallows credentials
    const internal = auditDataClearance(text, "internal");
    expect(internal.allowed).toBe(false);

    // Clean text under public clearance
    const clean = auditDataClearance("This is a public documentation text.", "public");
    expect(clean.allowed).toBe(true);
    expect(clean.violations).toHaveLength(0);
  });
});
