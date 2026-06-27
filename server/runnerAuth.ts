import { createHash, timingSafeEqual } from "node:crypto";
import type { ExecutorProfileId } from "../src/domain/types";

type HeaderValue = string | string[] | undefined;

const executorProfileIds: ExecutorProfileId[] = [
  "browser-sandbox",
  "desktop-vm",
  "shell-container",
  "mcp-proxy",
  "human-approval"
];

export interface RunnerAuthHeaders {
  authorization?: HeaderValue;
  "x-naikaku-runner-token"?: HeaderValue;
  "x-naikaku-runner-id"?: HeaderValue;
}

export interface RunnerAuthEnv {
  NAIKAKU_RUNNER_TOKEN?: string;
  NAIKAKU_RUNNER_CREDENTIALS?: string;
}

export type RunnerAuthMode =
  | "development-open"
  | "shared-token-required"
  | "scoped-credentials-required"
  | "misconfigured";

export interface RunnerCredentialConfig {
  runnerId: string;
  token?: string;
  tokenSha256?: string;
  executorProfiles: Array<ExecutorProfileId | "*">;
  notBefore?: string;
  expiresAt?: string;
  rotatedAt?: string;
  label?: string;
}

export interface RunnerCredentialSummary {
  runnerId: string;
  executorProfiles: ExecutorProfileId[];
  allExecutorProfiles: boolean;
  tokenFingerprint: string;
  notBefore?: string;
  expiresAt?: string;
  rotatedAt?: string;
  label?: string;
  status: "active" | "not-yet-valid" | "expired";
}

export interface RunnerAuthPosture {
  mode: RunnerAuthMode;
  configured: boolean;
  acceptedHeaders: string[];
  runnerIdRequired: boolean;
  scopedRunnerCredentials: RunnerCredentialSummary[];
  supportsScopedCredentials: boolean;
  warning?: string;
}

export interface RunnerAuthDecision {
  ok: boolean;
  status: 200 | 401 | 403;
  mode: RunnerAuthMode;
  runnerId: string;
  message: string;
  auditTags: string[];
  allowedExecutorProfiles: ExecutorProfileId[];
  allExecutorProfiles: boolean;
  tokenFingerprint?: string;
}

export function runnerAuthPosture(env: RunnerAuthEnv = process.env, now = new Date()): RunnerAuthPosture {
  const scoped = parseScopedCredentials(env, now);
  const hasScopedConfig = Boolean(env.NAIKAKU_RUNNER_CREDENTIALS?.trim());
  const hasSharedToken = Boolean(env.NAIKAKU_RUNNER_TOKEN?.trim());

  if (scoped.error) {
    return {
      mode: "misconfigured",
      configured: true,
      acceptedHeaders: ["Authorization: Bearer <token>", "x-naikaku-runner-token"],
      runnerIdRequired: true,
      scopedRunnerCredentials: [],
      supportsScopedCredentials: true,
      warning: scoped.error
    };
  }

  if (hasScopedConfig) {
    return {
      mode: "scoped-credentials-required",
      configured: true,
      acceptedHeaders: ["Authorization: Bearer <token>", "x-naikaku-runner-token"],
      runnerIdRequired: true,
      scopedRunnerCredentials: scoped.credentials.map((credential) => credential.summary),
      supportsScopedCredentials: true,
      warning: scoped.credentials.some((credential) => credential.summary.status !== "active")
        ? "One or more runner credentials are outside their active rotation window."
        : undefined
    };
  }

  return {
    mode: hasSharedToken ? "shared-token-required" : "development-open",
    configured: hasSharedToken,
    acceptedHeaders: ["Authorization: Bearer <token>", "x-naikaku-runner-token"],
    runnerIdRequired: hasSharedToken,
    scopedRunnerCredentials: [],
    supportsScopedCredentials: true,
    warning: hasSharedToken
      ? undefined
      : "NAIKAKU_RUNNER_TOKEN is not set; executor routes are open for local development only."
  };
}

export function evaluateRunnerAuth({
  headers,
  env = process.env,
  now = new Date()
}: {
  headers: RunnerAuthHeaders;
  env?: RunnerAuthEnv;
  now?: Date;
}): RunnerAuthDecision {
  const posture = runnerAuthPosture(env, now);
  const runnerId = singleHeader(headers["x-naikaku-runner-id"]).trim();

  if (posture.mode === "development-open") {
    return {
      ok: true,
      status: 200,
      mode: posture.mode,
      runnerId: runnerId || "anonymous-dev-runner",
      message: "Runner auth is open because NAIKAKU_RUNNER_TOKEN is not configured.",
      auditTags: ["runner-auth", "development-open"],
      allowedExecutorProfiles: executorProfileIds,
      allExecutorProfiles: true
    };
  }

  if (posture.mode === "misconfigured") {
    return {
      ok: false,
      status: 401,
      mode: posture.mode,
      runnerId,
      message: "Runner credential configuration is invalid; executor routes fail closed.",
      auditTags: ["runner-auth", "misconfigured"],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false
    };
  }

  if (!runnerId) {
    return {
      ok: false,
      status: 401,
      mode: posture.mode,
      runnerId: "",
      message: "x-naikaku-runner-id is required for executor routes.",
      auditTags: ["runner-auth", "missing-runner-id"],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false
    };
  }

  const suppliedToken = extractRunnerToken(headers);

  if (posture.mode === "scoped-credentials-required") {
    return evaluateScopedCredential({
      runnerId,
      suppliedToken,
      env,
      now
    });
  }

  const expectedToken = env.NAIKAKU_RUNNER_TOKEN?.trim() || "";
  if (!suppliedToken || !constantTimeEqual(suppliedToken, expectedToken)) {
    return {
      ok: false,
      status: 401,
      mode: posture.mode,
      runnerId,
      message: "Runner token is missing or invalid.",
      auditTags: ["runner-auth", "token-denied"],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false
    };
  }

  return {
    ok: true,
    status: 200,
    mode: posture.mode,
    runnerId,
    message: `Runner ${runnerId} authenticated.`,
    auditTags: ["runner-auth", "shared-token-accepted", runnerId],
    allowedExecutorProfiles: executorProfileIds,
    allExecutorProfiles: true,
    tokenFingerprint: tokenFingerprint(expectedToken)
  };
}

export function runnerCanUseExecutorProfile(
  decision: RunnerAuthDecision,
  profileId: ExecutorProfileId
) {
  return decision.ok &&
    (decision.allExecutorProfiles || decision.allowedExecutorProfiles.includes(profileId));
}

function evaluateScopedCredential({
  runnerId,
  suppliedToken,
  env,
  now
}: {
  runnerId: string;
  suppliedToken: string;
  env: RunnerAuthEnv;
  now: Date;
}): RunnerAuthDecision {
  const parsed = parseScopedCredentials(env, now);
  if (parsed.error) {
    return {
      ok: false,
      status: 401,
      mode: "misconfigured",
      runnerId,
      message: "Runner credential configuration is invalid; executor routes fail closed.",
      auditTags: ["runner-auth", "misconfigured"],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false
    };
  }

  const credential = parsed.credentials.find((candidate) => candidate.runnerId === runnerId);
  if (!credential) {
    return {
      ok: false,
      status: 401,
      mode: "scoped-credentials-required",
      runnerId,
      message: "Runner id is not registered in NAIKAKU_RUNNER_CREDENTIALS.",
      auditTags: ["runner-auth", "unknown-runner-id", runnerId],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false
    };
  }

  if (credential.summary.status === "not-yet-valid") {
    return {
      ok: false,
      status: 401,
      mode: "scoped-credentials-required",
      runnerId,
      message: "Runner credential is not active yet.",
      auditTags: ["runner-auth", "credential-not-yet-valid", runnerId],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false,
      tokenFingerprint: credential.summary.tokenFingerprint
    };
  }

  if (credential.summary.status === "expired") {
    return {
      ok: false,
      status: 401,
      mode: "scoped-credentials-required",
      runnerId,
      message: "Runner credential is expired and must be rotated.",
      auditTags: ["runner-auth", "credential-expired", runnerId],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false,
      tokenFingerprint: credential.summary.tokenFingerprint
    };
  }

  if (!suppliedToken || !runnerCredentialTokenMatches(credential, suppliedToken)) {
    return {
      ok: false,
      status: 401,
      mode: "scoped-credentials-required",
      runnerId,
      message: "Runner token is missing or invalid.",
      auditTags: ["runner-auth", "token-denied", runnerId],
      allowedExecutorProfiles: [],
      allExecutorProfiles: false,
      tokenFingerprint: credential.summary.tokenFingerprint
    };
  }

  return {
    ok: true,
    status: 200,
    mode: "scoped-credentials-required",
    runnerId,
    message: `Runner ${runnerId} authenticated with scoped credentials.`,
    auditTags: ["runner-auth", "scoped-token-accepted", runnerId],
    allowedExecutorProfiles: credential.summary.executorProfiles,
    allExecutorProfiles: credential.summary.allExecutorProfiles,
    tokenFingerprint: credential.summary.tokenFingerprint
  };
}

interface ParsedRunnerCredential {
  runnerId: string;
  token?: string;
  tokenSha256?: string;
  summary: RunnerCredentialSummary;
}

function parseScopedCredentials(env: RunnerAuthEnv, now: Date): {
  credentials: ParsedRunnerCredential[];
  error?: string;
} {
  const raw = env.NAIKAKU_RUNNER_CREDENTIALS?.trim();
  if (!raw) return { credentials: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      credentials: [],
      error: "NAIKAKU_RUNNER_CREDENTIALS must be valid JSON."
    };
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.runners)
      ? parsed.runners
      : null;
  if (!entries) {
    return {
      credentials: [],
      error: "NAIKAKU_RUNNER_CREDENTIALS must be a JSON array or an object with a runners array."
    };
  }

  const seen = new Set<string>();
  const credentials: ParsedRunnerCredential[] = [];

  for (const entry of entries) {
    if (!isRecord(entry)) {
      return { credentials: [], error: "Each runner credential must be an object." };
    }

    const runnerId = stringField(entry.runnerId);
    if (!runnerId) {
      return { credentials: [], error: "Each runner credential requires runnerId." };
    }
    if (seen.has(runnerId)) {
      return { credentials: [], error: `Duplicate runner credential for ${runnerId}.` };
    }
    seen.add(runnerId);

    const token = stringField(entry.token);
    const tokenSha256 = normalizedTokenSha256(stringField(entry.tokenSha256));
    if (!token && !tokenSha256) {
      return { credentials: [], error: `Runner credential ${runnerId} requires token or tokenSha256.` };
    }

    const profiles = Array.isArray(entry.executorProfiles) ? entry.executorProfiles : [];
    const allExecutorProfiles = profiles.includes("*");
    const executorProfiles = allExecutorProfiles
      ? executorProfileIds
      : profiles.filter((profile): profile is ExecutorProfileId => isExecutorProfileId(profile));
    if (executorProfiles.length === 0) {
      return {
        credentials: [],
        error: `Runner credential ${runnerId} requires at least one valid executor profile.`
      };
    }
    if (!allExecutorProfiles && executorProfiles.length !== profiles.length) {
      return {
        credentials: [],
        error: `Runner credential ${runnerId} contains an unknown executor profile.`
      };
    }

    const notBefore = optionalIsoDateField(entry.notBefore, `Runner credential ${runnerId} has invalid notBefore.`);
    if (notBefore.error) return { credentials: [], error: notBefore.error };
    const expiresAt = optionalIsoDateField(entry.expiresAt, `Runner credential ${runnerId} has invalid expiresAt.`);
    if (expiresAt.error) return { credentials: [], error: expiresAt.error };
    const rotatedAt = optionalIsoDateField(entry.rotatedAt, `Runner credential ${runnerId} has invalid rotatedAt.`);
    if (rotatedAt.error) return { credentials: [], error: rotatedAt.error };
    const status = credentialStatus({
      now,
      notBefore: notBefore.value,
      expiresAt: expiresAt.value
    });

    credentials.push({
      runnerId,
      token,
      tokenSha256,
      summary: {
        runnerId,
        executorProfiles,
        allExecutorProfiles,
        tokenFingerprint: tokenSha256
          ? `sha256:${tokenSha256.slice(0, 12)}`
          : tokenFingerprint(token),
        notBefore: notBefore.value,
        expiresAt: expiresAt.value,
        rotatedAt: rotatedAt.value,
        label: stringField(entry.label) || undefined,
        status
      }
    });
  }

  return { credentials };
}

function runnerCredentialTokenMatches(credential: ParsedRunnerCredential, suppliedToken: string) {
  if (credential.tokenSha256) {
    return constantTimeEqual(hashToken(suppliedToken), credential.tokenSha256);
  }
  return Boolean(credential.token) && constantTimeEqual(suppliedToken, credential.token || "");
}

function extractRunnerToken(headers: RunnerAuthHeaders) {
  const direct = singleHeader(headers["x-naikaku-runner-token"]).trim();
  if (direct) return direct;

  const authorization = singleHeader(headers.authorization).trim();
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || "";
}

function tokenFingerprint(token: string) {
  return `sha256:${hashToken(token).slice(0, 12)}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function singleHeader(value: HeaderValue) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedTokenSha256(value: string) {
  const normalized = value.replace(/^sha256:/i, "").trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : "";
}

function isExecutorProfileId(value: unknown): value is ExecutorProfileId {
  return typeof value === "string" && executorProfileIds.includes(value as ExecutorProfileId);
}

function optionalIsoDateField(value: unknown, error: string): { value?: string; error?: string } {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value !== "string") return { error };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error };
  return { value };
}

function credentialStatus({
  now,
  notBefore,
  expiresAt
}: {
  now: Date;
  notBefore?: string;
  expiresAt?: string;
}): RunnerCredentialSummary["status"] {
  const nowMs = now.getTime();
  if (notBefore && Date.parse(notBefore) > nowMs) return "not-yet-valid";
  if (expiresAt && Date.parse(expiresAt) <= nowMs) return "expired";
  return "active";
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
