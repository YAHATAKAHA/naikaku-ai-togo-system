import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Finding = {
  file: string;
  reason: string;
};

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const findings: Finding[] = [];

const forbiddenPathPrefixes = ["site/", "deploy/", "infra/private/", ".keys/", "output/"];
const forbiddenExactFiles = new Set([".env", ".env.local"]);
const forbiddenExtensions = [".pem", ".key", ".p12", ".mobileprovision"];

const allowedEnvExamples = new Set([".env.example"]);

const secretPatterns: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { reason: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/ },
  { reason: "AWS access key id", pattern: /AKIA[0-9A-Z]{16}/ },
  { reason: "Google API key", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { reason: "OpenAI project/user key", pattern: /sk-(?:proj|user)-[A-Za-z0-9_-]{20,}/ },
  { reason: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { reason: "OpenRouter API key", pattern: /sk-or-v1-[A-Za-z0-9_-]{20,}/ }
];

function isBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0);
}

for (const file of trackedFiles) {
  if (forbiddenPathPrefixes.some((prefix) => file.startsWith(prefix))) {
    findings.push({ file, reason: "forbidden public-repo path" });
    continue;
  }

  if (forbiddenExactFiles.has(file) || (file.startsWith(".env.") && !allowedEnvExamples.has(file))) {
    findings.push({ file, reason: "environment file must not be tracked" });
    continue;
  }

  if (forbiddenExtensions.some((extension) => file.endsWith(extension))) {
    findings.push({ file, reason: "secret-bearing file extension must not be tracked" });
    continue;
  }

  let buffer: Buffer;
  try {
    buffer = readFileSync(file);
  } catch {
    continue;
  }

  if (isBinary(buffer)) continue;

  const text = buffer.toString("utf8");
  for (const check of secretPatterns) {
    if (check.pattern.test(text)) {
      findings.push({ file, reason: check.reason });
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("Public source scope check failed.");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason}`);
  }
  process.exit(1);
}

console.log("Public source scope check passed.");
