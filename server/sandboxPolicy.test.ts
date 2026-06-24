import { describe, expect, it } from "vitest";
import { defaultSandboxPolicy } from "../src/data/defaultCabinet";
import { evaluateSandboxAction } from "./sandboxPolicy";

describe("sandbox policy gateway checks", () => {
  it("allows low-risk browser actions on allowlisted hosts", () => {
    const decision = evaluateSandboxAction(
      {
        executorProfileId: "browser-sandbox",
        action: "open_url",
        target: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
        risk: "low"
      },
      defaultSandboxPolicy
    );

    expect(decision.allowed).toBe(true);
    expect(decision.approvalRequired).toBe(false);
  });

  it("blocks configured destructive actions", () => {
    const decision = evaluateSandboxAction(
      {
        executorProfileId: "shell-container",
        action: "deploy_production",
        target: "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
        risk: "critical"
      },
      defaultSandboxPolicy
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("blocked");
  });

  it("denies hosts outside the allowlist", () => {
    const decision = evaluateSandboxAction(
      {
        executorProfileId: "browser-sandbox",
        action: "open_url",
        target: "https://example.com",
        risk: "low"
      },
      defaultSandboxPolicy
    );

    expect(decision.allowed).toBe(false);
    expect(decision.auditTags).toContain("network-denied");
  });
});
