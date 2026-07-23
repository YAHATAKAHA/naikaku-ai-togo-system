import { describe, expect, it } from "vitest";
import {
  buildExternalRunnerAdapterRegistry,
  serializeExternalRunnerAdapterRegistry,
  serializeExternalRunnerAdapterRegistryMarkdown
} from "./externalRunnerAdapters";

describe("external runner adapter registry", () => {
  it("keeps third-party runners as adapter candidates instead of enabled host control", () => {
    const registry = buildExternalRunnerAdapterRegistry({
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(registry.schema).toBe("naikaku.external-runner-adapter-registry.v1");
    expect(registry.summary.availableNow).toBe(1);
    expect(registry.adapters).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "naikaku-local-engineering-runner",
        status: "available-now"
      }),
      expect.objectContaining({
        id: "openclaw-desktop-runner",
        status: "needs-license-review",
        risk: "critical"
      }),
      expect.objectContaining({
        id: "openhands-coding-agent",
        status: "needs-license-review"
      }),
      expect.objectContaining({
        id: "codex-cli-runner",
        status: "needs-license-review"
      }),
      expect.objectContaining({
        id: "claude-code-runner",
        status: "needs-license-review"
      }),
      expect.objectContaining({
        id: "qwen-code-runner",
        status: "needs-license-review"
      }),
      expect.objectContaining({
        id: "browser-use-runner",
        status: "needs-license-review"
      })
    ]));
    expect(registry.summary.capabilityCoverage["mac-desktop-control"]).toBeGreaterThan(0);
    expect(registry.summary.capabilityCoverage["repo-coding"]).toBeGreaterThan(0);
    expect(registry.adapters.every((adapter) => adapter.contractInput && adapter.receiptOutput)).toBe(true);
    expect(registry.adapters.every((adapter) => adapter.prohibitedByDefault.length > 0)).toBe(true);
  });

  it("requires install and explicit approval before critical desktop adapters become contract-ready", () => {
    const licenseReviewed = buildExternalRunnerAdapterRegistry({
      licenseReviewedAdapterIds: ["openclaw-desktop-runner"],
      installedAdapterIds: ["openclaw-desktop-runner"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const approved = buildExternalRunnerAdapterRegistry({
      licenseReviewedAdapterIds: ["openclaw-desktop-runner"],
      installedAdapterIds: ["openclaw-desktop-runner"],
      approvedAdapterIds: ["openclaw-desktop-runner"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(licenseReviewed.adapters.find((item) => item.id === "openclaw-desktop-runner")?.status)
      .toBe("approval-required");
    expect(approved.adapters.find((item) => item.id === "openclaw-desktop-runner")?.status)
      .toBe("contract-ready");
  });

  it("lets approved OpenHands become contract-ready without vendoring upstream code", () => {
    const registry = buildExternalRunnerAdapterRegistry({
      licenseReviewedAdapterIds: ["openhands-coding-agent"],
      installedAdapterIds: ["openhands-coding-agent"],
      approvedAdapterIds: ["openhands-coding-agent"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    const openHands = registry.adapters.find((item) => item.id === "openhands-coding-agent");

    expect(openHands?.status).toBe("contract-ready");
    expect(openHands?.projectUrl).toBe("https://github.com/OpenHands/openhands");
    expect(registry.integrationPolicy.defaultMode).toBe("adapter-process");
  });

  it("serializes JSON and Markdown for open-source adapter review", () => {
    const registry = buildExternalRunnerAdapterRegistry();
    const parsed = JSON.parse(serializeExternalRunnerAdapterRegistry(registry));
    const markdown = serializeExternalRunnerAdapterRegistryMarkdown(registry);

    expect(parsed.schema).toBe("naikaku.external-runner-adapter-registry.v1");
    expect(markdown).toContain("External Runner Adapter Registry");
    expect(markdown).toContain("OpenHands coding agent");
    expect(markdown).toContain("Codex CLI runner");
    expect(markdown).toContain("Claude Code runner");
    expect(markdown).toContain("Qwen Code runner");
    expect(markdown).toContain("OpenClaw desktop runner");
    expect(markdown).toContain("Prefer user-installed upstream runners");
  });
});
