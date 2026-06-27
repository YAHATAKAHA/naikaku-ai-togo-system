import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildEngineeringRunnerPresetRegistry,
  enableEngineeringRunnerPresetTemplate,
  findEngineeringRunnerPreset
} from "./engineeringRunnerPresets";

describe("engineering runner presets", () => {
  it("always exposes built-in workbench presets", () => {
    const registry = buildEngineeringRunnerPresetRegistry({
      generatedAt: "2026-06-27T00:00:00.000Z",
      envValue: undefined,
      configPath: tempPresetPath()
    });

    expect(registry.schema).toBe("naikaku.engineering-runner-presets.v1");
    expect(registry.errors).toHaveLength(0);
    expect(registry.presets.map((preset) => preset.id)).toEqual(["prepared", "fixture", "openhands"]);
    expect(registry.templates).toContainEqual(expect.objectContaining({
      id: "openclaw-local",
      enabled: false
    }));
    expect(findEngineeringRunnerPreset("openhands", registry)).toMatchObject({
      kind: "external-command",
      adapterId: "openhands-coding-agent",
      command: "openhands",
      requiresAdapterReady: true
    });
  });

  it("loads server-configured CLI presets without exposing browser shell input", () => {
    const registry = buildEngineeringRunnerPresetRegistry({
      envValue: JSON.stringify([
        {
          id: "openclaw-local",
          label: "OpenClaw local agent",
          adapterId: "openclaw-desktop-runner",
          command: "openclaw",
          args: ["agent", "--agent", "naikaku", "--message-file", "{taskPath}", "--local", "--json"],
          commandCandidates: ["openclaw"],
          nextAction: "Run a configured OpenClaw local agent against one scoped task file."
        }
      ]),
      configPath: tempPresetPath()
    });

    expect(registry.errors).toHaveLength(0);
    expect(registry.summary.configured).toBe(1);
    expect(findEngineeringRunnerPreset("openclaw-local", registry)).toMatchObject({
      source: "env",
      kind: "external-command",
      adapterId: "openclaw-desktop-runner",
      command: "openclaw",
      args: ["agent", "--agent", "naikaku", "--message-file", "{taskPath}", "--local", "--json"],
      availableInWorkbench: true
    });
  });

  it("rejects unsafe configured command templates", () => {
    const registry = buildEngineeringRunnerPresetRegistry({
      envValue: JSON.stringify([
        {
          id: "bad",
          adapterId: "openclaw-desktop-runner",
          command: "/bin/sh",
          args: ["-c", "echo unsafe"]
        }
      ]),
      configPath: tempPresetPath()
    });

    expect(registry.presets.map((preset) => preset.id)).not.toContain("bad");
    expect(registry.errors[0]).toContain("bare command name");
  });

  it("enables a safe local preset template through the gateway config file", () => {
    const configPath = tempPresetPath();
    const first = enableEngineeringRunnerPresetTemplate({
      templateId: "openclaw-local",
      generatedAt: "2026-06-27T00:00:00.000Z",
      configPath
    });

    expect(first.ok).toBe(true);
    expect(first.status).toBe("enabled");
    expect(first.preset).toMatchObject({
      id: "openclaw-local",
      source: "file",
      command: "openclaw",
      args: ["agent", "--agent", "naikaku", "--message-file", "{taskPath}", "--local", "--json"]
    });
    expect(first.registry.templates.find((template) => template.id === "openclaw-local")?.enabled).toBe(true);
    expect(existsSync(configPath)).toBe(true);
    expect(JSON.parse(readFileSync(configPath, "utf8"))).toMatchObject({
      schema: "naikaku.engineering-runner-presets-config.v1",
      presets: [expect.objectContaining({ id: "openclaw-local" })]
    });

    const second = enableEngineeringRunnerPresetTemplate({
      templateId: "openclaw-local",
      generatedAt: "2026-06-27T00:01:00.000Z",
      configPath
    });

    expect(second.ok).toBe(true);
    expect(second.status).toBe("already-enabled");
    expect(second.registry.summary.configured).toBe(1);
  });

  it("blocks unknown safe preset templates", () => {
    const result = enableEngineeringRunnerPresetTemplate({
      templateId: "unknown-runner",
      configPath: tempPresetPath()
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.message).toContain("Unknown runner preset template");
  });
});

function tempPresetPath() {
  return join(mkdtempSync(join(tmpdir(), "naikaku-runner-presets-")), "engineering-runner-presets.json");
}
