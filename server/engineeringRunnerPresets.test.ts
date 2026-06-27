import { describe, expect, it } from "vitest";
import { buildEngineeringRunnerPresetRegistry, findEngineeringRunnerPreset } from "./engineeringRunnerPresets";

describe("engineering runner presets", () => {
  it("always exposes built-in workbench presets", () => {
    const registry = buildEngineeringRunnerPresetRegistry({
      generatedAt: "2026-06-27T00:00:00.000Z",
      envValue: undefined
    });

    expect(registry.schema).toBe("naikaku.engineering-runner-presets.v1");
    expect(registry.errors).toHaveLength(0);
    expect(registry.presets.map((preset) => preset.id)).toEqual(["prepared", "fixture", "openhands"]);
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
      ])
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
      ])
    });

    expect(registry.presets.map((preset) => preset.id)).not.toContain("bad");
    expect(registry.errors[0]).toContain("bare command name");
  });
});
