import { describe, expect, it } from "vitest";
import { buildEngineeringRunnerPresetRegistry } from "./engineeringRunnerPresets";
import { buildEngineeringRunnerReadiness } from "./engineeringRunnerReadiness";

describe("engineering runner readiness", () => {
  it("keeps the built-in runner ready and marks detected OpenHands as approval-gated", () => {
    const report = buildEngineeringRunnerReadiness({
      generatedAt: "2026-06-27T00:00:00.000Z",
      cwd: "/tmp/repo",
      runnerPresetRegistry: builtInPresetRegistry(),
      commandExists: (command) => ["npm", "npm.cmd", "openhands"].includes(command),
      pathExists: () => false
    });

    const local = report.items.find((item) => item.adapterId === "naikaku-local-engineering-runner");
    const openHands = report.items.find((item) => item.adapterId === "openhands-coding-agent");

    expect(report.schema).toBe("naikaku.engineering-runner-readiness.v1");
    expect(local?.status).toBe("ready");
    expect(local?.canLaunchFromWorkbench).toBe(true);
    expect(local?.workbenchPreset).toBe("fixture");
    expect(openHands?.status).toBe("detected-needs-approval");
    expect(openHands?.detectedCommands).toEqual(["openhands"]);
    expect(openHands?.canLaunchFromWorkbench).toBe(true);
    expect(openHands?.workbenchPreset).toBe("openhands");
    expect(report.summary.ready).toBeGreaterThanOrEqual(1);
    expect(report.summary.detected).toBeGreaterThanOrEqual(2);
    expect(report.summary.launchableFromWorkbench).toBeGreaterThanOrEqual(2);
  });

  it("does not overclaim missing high-risk desktop runners", () => {
    const report = buildEngineeringRunnerReadiness({
      runnerPresetRegistry: builtInPresetRegistry(),
      commandExists: () => false,
      pathExists: () => false
    });

    const local = report.items.find((item) => item.adapterId === "naikaku-local-engineering-runner");
    const openHands = report.items.find((item) => item.adapterId === "openhands-coding-agent");
    const openClaw = report.items.find((item) => item.adapterId === "openclaw-desktop-runner");

    expect(local?.status).toBe("ready");
    expect(openHands?.status).toBe("missing");
    expect(openClaw?.status).toBe("blocked-by-default");
    expect(openClaw?.canLaunchFromWorkbench).toBe(false);
    expect(report.summary.blockedByDefault).toBeGreaterThanOrEqual(1);
  });

  it("detects Hammerspoon app installs while keeping desktop control blocked by default", () => {
    const report = buildEngineeringRunnerReadiness({
      runnerPresetRegistry: builtInPresetRegistry(),
      commandExists: () => false,
      pathExists: (candidatePath) => candidatePath === "/Applications/Hammerspoon.app"
    });

    const hammerspoon = report.items.find((item) => item.adapterId === "hammerspoon-mac-adapter");

    expect(hammerspoon?.detectedApplications).toEqual(["/Applications/Hammerspoon.app"]);
    expect(hammerspoon?.status).toBe("blocked-by-default");
    expect(hammerspoon?.canLaunchFromWorkbench).toBe(false);
    expect(hammerspoon?.nextAction).toContain("scoped command preset");
  });

  it("marks configured OpenClaw presets launchable after local command detection", () => {
    const report = buildEngineeringRunnerReadiness({
      runnerPresetRegistry: buildEngineeringRunnerPresetRegistry({
        envValue: JSON.stringify([
          {
            id: "openclaw-local",
            label: "OpenClaw local agent",
            adapterId: "openclaw-desktop-runner",
            command: "openclaw",
            args: ["agent", "--agent", "naikaku", "--message-file", "{taskPath}", "--local", "--json"]
          }
        ]),
        configPath: ""
      }),
      commandExists: (command) => ["npm", "npm.cmd", "openclaw"].includes(command),
      pathExists: () => false
    });

    const openClaw = report.items.find((item) => item.adapterId === "openclaw-desktop-runner");

    expect(openClaw?.status).toBe("detected-needs-approval");
    expect(openClaw?.canLaunchFromWorkbench).toBe(true);
    expect(openClaw?.workbenchPreset).toBe("openclaw-local");
    expect(openClaw?.detectedCommands).toEqual(["openclaw"]);
  });
});

function builtInPresetRegistry() {
  return buildEngineeringRunnerPresetRegistry({
    envValue: undefined,
    configPath: ""
  });
}
