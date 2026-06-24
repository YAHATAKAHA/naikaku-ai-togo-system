import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { runCabinetMission, scoreCabinetRun } from "./orchestrator";
import { stripUnsafeSecrets } from "./storage";

describe("cabinet orchestrator", () => {
  it("runs every cabinet stage in order", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });

    expect(run.artifacts.map((artifact) => artifact.stageId)).toEqual([
      "intake",
      "planning",
      "execution",
      "critique",
      "supervision",
      "scoring",
      "iteration"
    ]);
    expect(run.score.overall).toBeGreaterThan(70);
    expect(run.logs.length).toBeGreaterThanOrEqual(7);
  });

  it("blocks when sandbox safety controls are weakened", () => {
    const unsafePolicy = {
      ...defaultSandboxPolicy,
      killSwitchArmed: false,
      requireHumanApproval: false,
      blockedActions: []
    };

    const score = scoreCabinetRun([], defaultRoles, unsafePolicy);
    expect(score.safety).toBeLessThan(70);
    expect(score.decision).toBe("block");
  });

  it("keeps saved config free of raw secret fields", () => {
    const saved = stripUnsafeSecrets({
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy,
      mission: defaultMission
    });

    expect(JSON.stringify(saved)).not.toContain("sessionSecret");
    expect(saved.roles[0].provider.apiKeyAlias).toBe("NAIKAKU_OPENAI_API_KEY");
  });
});
