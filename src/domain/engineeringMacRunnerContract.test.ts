import { describe, expect, it } from "vitest";
import { buildEngineeringLaunchProfile } from "./engineeringLaunchProfile";
import { buildEngineeringMacRunnerContract } from "./engineeringMacRunnerContract";
import { buildEngineeringMacRunnerReadiness } from "./engineeringMacRunnerReadiness";

describe("engineering Mac runner contract", () => {
  it("keeps non-Mac missions as non-executable placeholders", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Implement code in the repo and run npm run test.",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const readiness = buildEngineeringMacRunnerReadiness({
      profile,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const contract = buildEngineeringMacRunnerContract({
      profile,
      readiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(contract.schema).toBe("naikaku.engineering-mac-runner-contract.v1");
    expect(contract.decision).toBe("not-requested");
    expect(contract.canExecuteWithoutApproval).toBe(false);
    expect(contract.actions).toEqual([]);
    expect(contract.runnerInstructions).toEqual(["do-not-start", "audit-only"]);
  });

  it("generates governed OpenClaw and Hammerspoon style action contracts without claiming execution", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "参考 OpenClaw 和 Hammerspoon，为 Mac 版做基础电脑控制：看屏幕、点击、键盘输入、窗口控制、剪贴板和浏览器验证。Git push 必须人工批准。",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const readiness = buildEngineeringMacRunnerReadiness({
      profile,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const contract = buildEngineeringMacRunnerContract({
      profile,
      readiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(contract.decision).toBe("blocked");
    expect(contract.canExecuteWithoutApproval).toBe(false);
    expect(contract.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "observe-screen",
        adapterId: "openclaw-style-desktop",
        status: "needs-runtime",
        permissions: ["mac-screen-recording"]
      }),
      expect.objectContaining({
        id: "click",
        adapterId: "openclaw-style-desktop",
        status: "needs-runtime",
        permissions: ["mac-accessibility", "mac-screen-recording"]
      }),
      expect.objectContaining({
        id: "type-text",
        adapterId: "hammerspoon-adapter",
        status: "needs-runtime"
      }),
      expect.objectContaining({
        id: "move-window",
        adapterId: "hammerspoon-adapter",
        status: "needs-runtime"
      }),
      expect.objectContaining({
        id: "browser-open-url",
        adapterId: "browser-profile-runner",
        status: "ready-for-approval"
      }),
      expect.objectContaining({
        id: "external-write",
        adapterId: "external-write-gateway",
        status: "blocked"
      })
    ]));
    expect(contract.summary).toMatchObject({
      totalActions: 10,
      needsRuntime: 8,
      blocked: 1
    });
    expect(contract.deniedActions).toContain("host-secrets");
    expect(contract.deniedActions).toContain("unapproved-external-write");
    expect(contract.honestyClaim.claim).toContain("does not control the Mac");
  });

  it("keeps all evidence paths under the Mac action prefix", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Mac runner should observe screen and click inside the approved app only.",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const readiness = buildEngineeringMacRunnerReadiness({
      profile,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const contract = buildEngineeringMacRunnerContract({
      profile,
      readiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const evidencePaths = contract.actions.flatMap((action) =>
      action.evidenceTargets.map((target) => target.path)
    );

    expect(contract.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "path-scope", status: "pass" }),
      expect.objectContaining({ id: "host-secrets-denied", status: "pass" })
    ]));
    expect(evidencePaths.length).toBeGreaterThan(0);
    expect(evidencePaths.every((path) => path.startsWith(contract.actionPrefix))).toBe(true);
    expect(contract.receiptPath.startsWith(contract.actionPrefix)).toBe(true);
  });
});
