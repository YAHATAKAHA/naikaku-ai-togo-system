import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy, executorProfiles } from "../data/defaultCabinet";
import {
  buildSandboxCapabilityRegistry,
  serializeSandboxCapabilityRegistry
} from "./sandboxCapabilities";

describe("sandbox capability registry", () => {
  it("builds one capability card for every executor profile", () => {
    const registry = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy,
      generatedAt: "2026-06-25T00:00:00.000Z"
    });

    expect(registry.schema).toBe("naikaku.sandbox-capabilities.v1");
    expect(registry.cards).toHaveLength(executorProfiles.length);
    expect(registry.summary.profiles).toBe(executorProfiles.length);
    expect(registry.summary.rolesCovered).toBe(defaultRoles.length);
    expect(registry.summary.readinessChecks).toBe(executorProfiles.length * 5);
    expect(registry.summary.evidenceArtifacts).toBe(15);
  });

  it("evaluates representative actions against the current sandbox policy", () => {
    const registry = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const browser = registry.cards.find((card) => card.profileId === "browser-sandbox");
    const human = registry.cards.find((card) => card.profileId === "human-approval");

    expect(browser?.actions.find((action) => action.action === "open_url")?.status).toBe("allowed");
    expect(browser?.actions.find((action) => action.action === "submit_form")?.status).toBe("needs-approval");
    expect(human?.actions.find((action) => action.action === "deploy_production")?.status).toBe("blocked");
    expect(browser?.runnerReadiness.decision).toBe("needs-approval");
    expect(browser?.runnerReadiness.requiredApprovals.some((item) => item.includes("submit_form"))).toBe(true);
    expect(browser?.runnerReadiness.supportedEvidenceArtifacts).toContain("DOM action replay");
    expect(browser?.runnerReadiness.checks.find((check) => check.id === "policy-actions")?.status).toBe("warn");
    expect(human?.runnerReadiness.blockedReasons.some((item) => item.includes("deploy_production"))).toBe(true);
    expect(registry.summary.approvalActions).toBeGreaterThan(0);
    expect(registry.summary.blockedActions).toBeGreaterThan(0);
    expect(registry.summary.requiredApprovals).toBeGreaterThan(0);
    expect(registry.summary.warningReadinessChecks).toBeGreaterThan(0);
  });

  it("marks every capability blocked when the kill switch is not armed", () => {
    const registry = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: defaultRoles,
      sandboxPolicy: {
        ...defaultSandboxPolicy,
        killSwitchArmed: false
      }
    });

    expect(registry.summary.killSwitchArmed).toBe(false);
    expect(registry.summary.blocked).toBe(executorProfiles.length);
    expect(registry.summary.blockedReadinessChecks).toBeGreaterThanOrEqual(executorProfiles.length);
    expect(registry.cards.every((card) => card.status === "blocked")).toBe(true);
    expect(registry.cards.every((card) =>
      card.runnerReadiness.checks.find((check) => check.id === "kill-switch")?.status === "block"
    )).toBe(true);
  });

  it("keeps internal schemes outside the network allowlist requirement", () => {
    const registry = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: defaultRoles,
      sandboxPolicy: {
        ...defaultSandboxPolicy,
        networkAllowlist: []
      }
    });
    const mcp = registry.cards.find((card) => card.profileId === "mcp-proxy");
    const browser = registry.cards.find((card) => card.profileId === "browser-sandbox");

    expect(mcp?.actions.find((action) => action.action === "call_mcp_tool")?.status).toBe("needs-approval");
    expect(browser?.actions.find((action) => action.action === "open_url")?.status).toBe("blocked");
  });

  it("serializes the registry as a stable export envelope", () => {
    const registry = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const exported = serializeSandboxCapabilityRegistry(registry);
    const parsed = JSON.parse(exported) as { schema: string; cards: unknown[] };
    const firstCard = parsed.cards[0] as { runnerReadiness?: { checks?: unknown[]; supportedEvidenceArtifacts?: string[] } };

    expect(parsed.schema).toBe("naikaku.sandbox-capabilities.v1");
    expect(parsed.cards).toHaveLength(executorProfiles.length);
    expect(firstCard.runnerReadiness?.checks?.length).toBeGreaterThan(0);
    expect(firstCard.runnerReadiness?.supportedEvidenceArtifacts?.length).toBeGreaterThan(0);
    expect(exported).not.toContain("sessionSecret");
  });
});
