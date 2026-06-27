import { describe, expect, it } from "vitest";
import { buildEngineeringLaunchProfile } from "./engineeringLaunchProfile";
import {
  buildEngineeringMacRunnerReadiness,
  serializeEngineeringMacRunnerReadiness,
  serializeEngineeringMacRunnerReadinessMarkdown
} from "./engineeringMacRunnerReadiness";
import type { EngineeringExecutionReceipt } from "./engineeringExecutionReceipt";
import type { EngineeringLaunchQueue } from "./engineeringLaunchQueue";

describe("engineering Mac runner readiness", () => {
  it("does not expose computer control before a mission exists", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: " ",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const readiness = buildEngineeringMacRunnerReadiness({
      profile,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(readiness.schema).toBe("naikaku.engineering-mac-runner-readiness.v1");
    expect(readiness.decision).toBe("needs-mission");
    expect(readiness.canPrepareCodingWork).toBe(false);
    expect(readiness.canControlMacDesktop).toBe(false);
    expect(readiness.permissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "host-secrets", status: "denied-by-default" }),
      expect.objectContaining({ id: "mac-accessibility", status: "not-requested" })
    ]));
    expect(readiness.adapters).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "openclaw-style-desktop", status: "not-requested" })
    ]));
  });

  it("turns OpenClaw and Hammerspoon style requests into gated Mac runner requirements", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "参考 OpenClaw 和 Hammerspoon，在 Mac 上做基础电脑控制、看屏幕、点击、键盘操作和浏览器验证。",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const readiness = buildEngineeringMacRunnerReadiness({
      profile,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(readiness.decision).toBe("runtime-needed");
    expect(readiness.macRequested).toBe(true);
    expect(readiness.canPrepareCodingWork).toBe(true);
    expect(readiness.canControlMacDesktop).toBe(false);
    expect(readiness.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "repo-coding", status: "ready" }),
      expect.objectContaining({ id: "screen-observation", status: "approval-required" }),
      expect.objectContaining({ id: "keyboard-mouse", status: "needs-runtime" }),
      expect.objectContaining({ id: "app-window-control", status: "needs-runtime" })
    ]));
    expect(readiness.permissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "browser-profile", status: "ask-before-use" }),
      expect.objectContaining({ id: "mac-accessibility", status: "ask-before-use" }),
      expect.objectContaining({ id: "mac-screen-recording", status: "ask-before-use" }),
      expect.objectContaining({ id: "mac-automation", status: "ask-before-use" })
    ]));
    expect(readiness.adapters).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "hammerspoon-adapter", status: "needs-runtime" }),
      expect.objectContaining({ id: "openclaw-style-desktop", status: "needs-runtime" })
    ]));
    expect(readiness.honestyClaim.claim).toContain("Mac desktop control remains");
  });

  it("separates ready coding queue work from accepted execution evidence", () => {
    const profile = buildEngineeringLaunchProfile({
      mission: "Implement code in the repo and verify with npm run test.",
      activeRoles: 8,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const queueReady = buildEngineeringMacRunnerReadiness({
      profile,
      launchQueue: {
        decision: "preflight-ready"
      } as EngineeringLaunchQueue,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const accepted = buildEngineeringMacRunnerReadiness({
      profile,
      launchQueue: {
        decision: "preflight-ready"
      } as EngineeringLaunchQueue,
      executionReceipt: {
        decision: "accepted"
      } as EngineeringExecutionReceipt,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(queueReady.decision).toBe("code-ready");
    expect(queueReady.canRunCodeSandbox).toBe(true);
    expect(queueReady.adapters).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "codex-style-coding-agent", status: "available-now" })
    ]));
    expect(accepted.decision).toBe("evidence-ready");
    expect(serializeEngineeringMacRunnerReadiness(accepted)).toContain(
      "naikaku.engineering-mac-runner-readiness.v1"
    );
    expect(serializeEngineeringMacRunnerReadinessMarkdown(accepted)).toContain(
      "Can control Mac desktop: no"
    );
  });
});
