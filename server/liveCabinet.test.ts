import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../src/data/defaultCabinet";
import { runGatewayCabinet } from "./liveCabinet";

describe("gateway cabinet modes", () => {
  it("marks dry-run artifacts without external provider calls", async () => {
    const run = await runGatewayCabinet({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy,
      mode: "dry-run"
    });

    expect(run.artifacts.every((artifact) => artifact.providerStatus === "dry-run")).toBe(true);
    expect(run.automationActions).toHaveLength(run.artifacts.length);
    expect(run.logs.some((log) => log.id === "log-provider-dry-run")).toBe(true);
  });

  it("keeps live mode safe when provider secrets are missing", async () => {
    const run = await runGatewayCabinet({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy,
      mode: "live"
    });

    expect(run.artifacts.some((artifact) => artifact.providerStatus === "skipped")).toBe(true);
    expect(run.artifacts.some((artifact) => artifact.body.includes("No live model artifact was generated"))).toBe(true);
    expect(run.artifacts.every((artifact) => artifact.body.includes("Mission focus:") === false)).toBe(true);
    expect(run.automationActions?.every((action) => action.status === "blocked")).toBe(true);
    expect(run.score.decision).toBe("revise");
    expect(run.nextIteration[0]).toContain("provider configuration");
  });
});
