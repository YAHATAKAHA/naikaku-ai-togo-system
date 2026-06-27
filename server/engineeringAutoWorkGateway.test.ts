import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runEngineeringAutoWorkGateway } from "./engineeringAutoWorkGateway";

describe("engineering auto-work gateway", () => {
  it("runs the fixture preset through the existing npm auto-work command", () => {
    const cwd = mkdtempSync(join(tmpdir(), "naikaku-auto-work-gateway-"));
    const calls: Array<{ command: string; args: string[] }> = [];
    const result = runEngineeringAutoWorkGateway({
      mission: "Run the fixture coding agent loop",
      locale: "zh-Hans",
      runnerPreset: "fixture",
      timeoutMs: 60_000,
      generatedAt: "2026-06-27T00:00:00.000Z"
    }, {
      cwd,
      npmCommand: "npm-test",
      now: () => "2026-06-27T00:00:00.000Z",
      spawn: ((command: string, args: string[]) => {
        calls.push({ command, args });
        const outIndex = args.indexOf("--out");
        const outputDir = args[outIndex + 1];
        mkdirSync(join(cwd, outputDir), { recursive: true });
        writeFileSync(join(cwd, outputDir, "summary.json"), JSON.stringify({
          checks: {
            handoffPrepared: true,
            externalRunnerStarted: true,
            externalReceiptImported: true
          }
        }));
        return { status: 0, signal: null, stdout: "ok", stderr: "" };
      }) as never
    });

    expect(result.statusCode).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.preset).toBe("fixture");
    expect(result.body.checks).toEqual({ pass: 3, fail: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("npm-test");
    expect(calls[0].args).toEqual(expect.arrayContaining([
      "run",
      "engineering:auto-work",
      "--runner-preset",
      "fixture",
      "--locale",
      "zh-Hans"
    ]));
    expect(calls[0].args).toEqual(expect.arrayContaining([
      "--worktree",
      "output/engineering-auto-work-ui/fixture-worktree"
    ]));
    expect(existsSync(join(cwd, "output/engineering-auto-work-ui/summary.json"))).toBe(true);
  });

  it("blocks OpenHands until the local adapter is explicitly marked ready", () => {
    const result = runEngineeringAutoWorkGateway({
      mission: "Use OpenHands for a real repo task",
      runnerPreset: "openhands"
    }, {
      cwd: process.cwd(),
      npmCommand: "npm-test",
      spawn: (() => {
        throw new Error("spawn should not run");
      }) as never
    });

    expect(result.statusCode).toBe(422);
    expect(result.body.ok).toBe(false);
    expect(result.body.decision).toBe("blocked");
    expect(result.body.message).toContain("adapterReady=true");
  });

  it("rejects output paths outside the local output directory", () => {
    const result = runEngineeringAutoWorkGateway({
      mission: "Try unsafe output",
      outputDir: "../outside"
    }, {
      cwd: process.cwd(),
      npmCommand: "npm-test",
      spawn: (() => {
        throw new Error("spawn should not run");
      }) as never
    });

    expect(result.statusCode).toBe(422);
    expect(result.body.stderrTail).toContain("workspace");
  });
});
