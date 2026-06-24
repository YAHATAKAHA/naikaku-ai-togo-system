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

  it("does not apply network allowlists to internal target schemes", () => {
    const decision = evaluateSandboxAction(
      {
        executorProfileId: "mcp-proxy",
        action: "create_plan",
        target: "artifact://planning",
        risk: "medium"
      },
      defaultSandboxPolicy
    );

    expect(decision.allowed).toBe(true);
    expect(decision.approvalRequired).toBe(false);
    expect(decision.auditTags).toContain("allowed");
  });

  it("requires approval for high-impact shell actions", () => {
    const decision = evaluateSandboxAction(
      {
        executorProfileId: "shell-container",
        action: "run_shell",
        target: "/workspace:npm run test",
        risk: "high"
      },
      defaultSandboxPolicy
    );

    expect(decision.allowed).toBe(true);
    expect(decision.approvalRequired).toBe(true);
    expect(decision.auditTags).toContain("approval-required");
  });
});
