import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  evaluateRunnerAuth,
  runnerAuthPosture,
  runnerCanUseExecutorProfile
} from "./runnerAuth";

describe("runner auth", () => {
  it("declares development-open posture when no token is configured", () => {
    const posture = runnerAuthPosture({});
    const decision = evaluateRunnerAuth({
      headers: {},
      env: {}
    });

    expect(posture.mode).toBe("development-open");
    expect(posture.warning).toContain("local development");
    expect(decision.ok).toBe(true);
    expect(decision.runnerId).toBe("anonymous-dev-runner");
    expect(decision.allExecutorProfiles).toBe(true);
  });

  it("requires runner id when token auth is configured", () => {
    const decision = evaluateRunnerAuth({
      headers: {
        authorization: "Bearer runner-secret"
      },
      env: {
        NAIKAKU_RUNNER_TOKEN: "runner-secret"
      }
    });

    expect(decision.ok).toBe(false);
    expect(decision.status).toBe(401);
    expect(decision.mode).toBe("shared-token-required");
    expect(decision.auditTags).toContain("missing-runner-id");
  });

  it("accepts authorization bearer tokens with runner identity", () => {
    const decision = evaluateRunnerAuth({
      headers: {
        authorization: "Bearer runner-secret",
        "x-naikaku-runner-id": "shell-runner-01"
      },
      env: {
        NAIKAKU_RUNNER_TOKEN: "runner-secret"
      }
    });

    expect(decision.ok).toBe(true);
    expect(decision.mode).toBe("shared-token-required");
    expect(decision.runnerId).toBe("shell-runner-01");
    expect(decision.auditTags).toContain("shared-token-accepted");
    expect(decision.allExecutorProfiles).toBe(true);
  });

  it("accepts the direct runner token header", () => {
    const decision = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-token": "runner-secret",
        "x-naikaku-runner-id": "browser-runner-01"
      },
      env: {
        NAIKAKU_RUNNER_TOKEN: "runner-secret"
      }
    });

    expect(decision.ok).toBe(true);
    expect(decision.runnerId).toBe("browser-runner-01");
  });

  it("rejects invalid tokens without leaking the expected token", () => {
    const decision = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-token": "wrong-token",
        "x-naikaku-runner-id": "desktop-runner-01"
      },
      env: {
        NAIKAKU_RUNNER_TOKEN: "runner-secret"
      }
    });

    expect(decision.ok).toBe(false);
    expect(decision.status).toBe(401);
    expect(decision.message).not.toContain("runner-secret");
    expect(decision.auditTags).toContain("token-denied");
  });

  it("prefers scoped runner credentials over the shared token", () => {
    const env = {
      NAIKAKU_RUNNER_TOKEN: "legacy-token",
      NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify([
        {
          runnerId: "shell-runner-01",
          token: "shell-token",
          executorProfiles: ["shell-container"],
          rotatedAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2027-01-01T00:00:00.000Z"
        }
      ])
    };
    const posture = runnerAuthPosture(env, new Date("2026-06-27T00:00:00.000Z"));
    const decision = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-token": "shell-token",
        "x-naikaku-runner-id": "shell-runner-01"
      },
      env,
      now: new Date("2026-06-27T00:00:00.000Z")
    });

    expect(posture.mode).toBe("scoped-credentials-required");
    expect(posture.scopedRunnerCredentials).toHaveLength(1);
    expect(posture.scopedRunnerCredentials[0].tokenFingerprint).toMatch(/^sha256:/);
    expect(decision.ok).toBe(true);
    expect(decision.mode).toBe("scoped-credentials-required");
    expect(decision.allExecutorProfiles).toBe(false);
    expect(decision.allowedExecutorProfiles).toEqual(["shell-container"]);
    expect(runnerCanUseExecutorProfile(decision, "shell-container")).toBe(true);
    expect(runnerCanUseExecutorProfile(decision, "browser-sandbox")).toBe(false);
  });

  it("accepts scoped credentials configured with token hashes", () => {
    const token = "browser-token";
    const env = {
      NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify({
        runners: [{
          runnerId: "browser-runner-01",
          tokenSha256: sha256(token),
          executorProfiles: ["browser-sandbox"]
        }]
      })
    };
    const decision = evaluateRunnerAuth({
      headers: {
        authorization: `Bearer ${token}`,
        "x-naikaku-runner-id": "browser-runner-01"
      },
      env
    });

    expect(decision.ok).toBe(true);
    expect(decision.allowedExecutorProfiles).toEqual(["browser-sandbox"]);
    expect(decision.tokenFingerprint).toBe(`sha256:${sha256(token).slice(0, 12)}`);
  });

  it("rejects unknown runner ids in scoped credential mode", () => {
    const decision = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-token": "shell-token",
        "x-naikaku-runner-id": "desktop-runner-01"
      },
      env: {
        NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify([
          {
            runnerId: "shell-runner-01",
            token: "shell-token",
            executorProfiles: ["shell-container"]
          }
        ])
      }
    });

    expect(decision.ok).toBe(false);
    expect(decision.status).toBe(401);
    expect(decision.auditTags).toContain("unknown-runner-id");
  });

  it("rejects expired scoped credentials without exposing tokens", () => {
    const decision = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-token": "old-token",
        "x-naikaku-runner-id": "shell-runner-01"
      },
      env: {
        NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify([
          {
            runnerId: "shell-runner-01",
            token: "old-token",
            executorProfiles: ["shell-container"],
            expiresAt: "2026-01-01T00:00:00.000Z"
          }
        ])
      },
      now: new Date("2026-06-27T00:00:00.000Z")
    });

    expect(decision.ok).toBe(false);
    expect(decision.auditTags).toContain("credential-expired");
    expect(decision.message).not.toContain("old-token");
  });

  it("fails closed when scoped credential config is malformed", () => {
    const posture = runnerAuthPosture({
      NAIKAKU_RUNNER_CREDENTIALS: "{broken"
    });
    const decision = evaluateRunnerAuth({
      headers: {
        "x-naikaku-runner-token": "anything",
        "x-naikaku-runner-id": "shell-runner-01"
      },
      env: {
        NAIKAKU_RUNNER_CREDENTIALS: "{broken"
      }
    });

    expect(posture.mode).toBe("misconfigured");
    expect(posture.warning).toContain("valid JSON");
    expect(decision.ok).toBe(false);
    expect(decision.mode).toBe("misconfigured");
    expect(decision.auditTags).toContain("misconfigured");
  });
});

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
