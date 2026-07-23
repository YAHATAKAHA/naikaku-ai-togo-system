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

  it("detects Codex, Claude, and Qwen CLI candidates through safe local templates", () => {
    const report = buildEngineeringRunnerReadiness({
      runnerPresetRegistry: buildEngineeringRunnerPresetRegistry({
        envValue: JSON.stringify([
          {
            id: "codex-cli-local",
            label: "Codex CLI local runner",
            adapterId: "codex-cli-runner",
            command: "codex",
            args: ["-a", "never", "exec", "--sandbox", "workspace-write", "Read {taskPath}"]
          },
          {
            id: "claude-code-local",
            label: "Claude Code local runner",
            adapterId: "claude-code-runner",
            command: "claude",
            args: ["--print", "--permission-mode", "auto", "Read {taskPath}"]
          },
          {
            id: "qwen-code-local",
            label: "Qwen Code local runner",
            adapterId: "qwen-code-runner",
            command: "qwen",
            args: ["--prompt", "Read {taskPath}", "--approval-mode", "auto"]
          }
        ]),
        configPath: ""
      }),
      commandExists: (command) => ["npm", "npm.cmd", "codex", "claude", "qwen"].includes(command),
      pathExists: () => false
    });

    const codex = report.items.find((item) => item.adapterId === "codex-cli-runner");
    const claude = report.items.find((item) => item.adapterId === "claude-code-runner");
    const qwen = report.items.find((item) => item.adapterId === "qwen-code-runner");

    expect(codex?.detectedCommands).toEqual(["codex"]);
    expect(claude?.detectedCommands).toEqual(["claude"]);
    expect(qwen?.detectedCommands).toEqual(["qwen"]);
    expect(codex?.status).toBe("detected-needs-approval");
    expect(claude?.status).toBe("detected-needs-approval");
    expect(qwen?.status).toBe("detected-needs-approval");
    expect(codex?.canLaunchFromWorkbench).toBe(true);
    expect(claude?.canLaunchFromWorkbench).toBe(true);
    expect(qwen?.canLaunchFromWorkbench).toBe(true);
    expect(codex?.workbenchPreset).toBe("codex-cli-local");
    expect(claude?.workbenchPreset).toBe("claude-code-local");
    expect(qwen?.workbenchPreset).toBe("qwen-code-local");
  });
});

function builtInPresetRegistry() {
  return buildEngineeringRunnerPresetRegistry({
    envValue: undefined,
    configPath: ""
  });
}
