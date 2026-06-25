import { describe, expect, it } from "vitest";
import { evaluateRunnerAuth, runnerAuthPosture } from "./runnerAuth";

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
    expect(decision.mode).toBe("token-required");
    expect(decision.runnerId).toBe("shell-runner-01");
    expect(decision.auditTags).toContain("token-accepted");
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
});
