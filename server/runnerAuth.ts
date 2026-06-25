import { timingSafeEqual } from "node:crypto";

type HeaderValue = string | string[] | undefined;

export interface RunnerAuthHeaders {
  authorization?: HeaderValue;
  "x-naikaku-runner-token"?: HeaderValue;
  "x-naikaku-runner-id"?: HeaderValue;
}

export interface RunnerAuthEnv {
  NAIKAKU_RUNNER_TOKEN?: string;
}

export type RunnerAuthMode = "development-open" | "token-required";

export interface RunnerAuthPosture {
  mode: RunnerAuthMode;
  configured: boolean;
  acceptedHeaders: string[];
  runnerIdRequired: boolean;
  warning?: string;
}

export interface RunnerAuthDecision {
  ok: boolean;
  status: 200 | 401;
  mode: RunnerAuthMode;
  runnerId: string;
  message: string;
  auditTags: string[];
}

export function runnerAuthPosture(env: RunnerAuthEnv = process.env): RunnerAuthPosture {
  const configured = Boolean(env.NAIKAKU_RUNNER_TOKEN?.trim());

  return {
    mode: configured ? "token-required" : "development-open",
    configured,
    acceptedHeaders: ["Authorization: Bearer <token>", "x-naikaku-runner-token"],
    runnerIdRequired: configured,
    warning: configured
      ? undefined
      : "NAIKAKU_RUNNER_TOKEN is not set; executor routes are open for local development only."
  };
}

export function evaluateRunnerAuth({
  headers,
  env = process.env
}: {
  headers: RunnerAuthHeaders;
  env?: RunnerAuthEnv;
}): RunnerAuthDecision {
  const posture = runnerAuthPosture(env);
  const runnerId = singleHeader(headers["x-naikaku-runner-id"]).trim();

  if (posture.mode === "development-open") {
    return {
      ok: true,
      status: 200,
      mode: posture.mode,
      runnerId: runnerId || "anonymous-dev-runner",
      message: "Runner auth is open because NAIKAKU_RUNNER_TOKEN is not configured.",
      auditTags: ["runner-auth", "development-open"]
    };
  }

  if (!runnerId) {
    return {
      ok: false,
      status: 401,
      mode: posture.mode,
      runnerId: "",
      message: "x-naikaku-runner-id is required for executor routes.",
      auditTags: ["runner-auth", "missing-runner-id"]
    };
  }

  const expectedToken = env.NAIKAKU_RUNNER_TOKEN?.trim() || "";
  const suppliedToken = extractRunnerToken(headers);

  if (!suppliedToken || !constantTimeEqual(suppliedToken, expectedToken)) {
    return {
      ok: false,
      status: 401,
      mode: posture.mode,
      runnerId,
      message: "Runner token is missing or invalid.",
      auditTags: ["runner-auth", "token-denied"]
    };
  }

  return {
    ok: true,
    status: 200,
    mode: posture.mode,
    runnerId,
    message: `Runner ${runnerId} authenticated.`,
    auditTags: ["runner-auth", "token-accepted", runnerId]
  };
}

function extractRunnerToken(headers: RunnerAuthHeaders) {
  const direct = singleHeader(headers["x-naikaku-runner-token"]).trim();
  if (direct) return direct;

  const authorization = singleHeader(headers.authorization).trim();
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || "";
}

function singleHeader(value: HeaderValue) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
