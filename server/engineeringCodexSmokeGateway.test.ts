import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runEngineeringCodexSmokeGateway } from "./engineeringCodexSmokeGateway";

describe("engineering Codex smoke gateway", () => {
  it("runs the fixed Codex smoke command and reads its summary", () => {
    const cwd = mkdtempSync(join(tmpdir(), "naikaku-codex-smoke-gateway-"));
    const calls: Array<{ command: string; args: string[] }> = [];
    const result = runEngineeringCodexSmokeGateway({
      mission: "Prove a governed Codex coding run",
      outputDir: "output/codex-smoke-ui-test",
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
          schema: "naikaku.codex-engineer-smoke.v1",
          mission: "Prove a governed Codex coding run",
          codex: {
            exitCode: 0
          },
          tests: {
            baselineExitCode: 1,
            finalExitCode: 0
          },
          files: {
            changedFiles: ["src/cabinetScore.mjs"]
          },
          checks: {
            cabinetApprovedBeforeRun: true,
            codexCliDetected: true,
            baselineTestFailed: true,
            codexExitedZero: true,
            finalTestPassed: true,
            expectedFileChanged: true,
            noGitCommitOrPush: true,
            receiptWritten: true
          }
        }));
        return { status: 0, signal: null, stdout: "codex smoke passed", stderr: "" };
      }) as never
    });

    expect(result.statusCode).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.executor).toBe("codex-cli");
    expect(result.body.checks).toEqual({ pass: 8, fail: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("npm-test");
    expect(calls[0].args).toEqual([
      "run",
      "codex:engineer-smoke",
      "--",
      "--mission",
      "Prove a governed Codex coding run",
      "--out",
      "output/codex-smoke-ui-test",
      "--generated-at",
      "2026-06-27T00:00:00.000Z"
    ]);
    expect(existsSync(join(cwd, "output/codex-smoke-ui-test/summary.json"))).toBe(true);
  });

  it("blocks missing missions before spawning Codex", () => {
    const result = runEngineeringCodexSmokeGateway({
      mission: " "
    }, {
      cwd: process.cwd(),
      npmCommand: "npm-test",
      spawn: (() => {
        throw new Error("spawn should not run");
      }) as never
    });

    expect(result.statusCode).toBe(422);
    expect(result.body.decision).toBe("blocked");
    expect(result.body.message).toContain("Mission is required");
  });

  it("rejects output directories outside output", () => {
    const result = runEngineeringCodexSmokeGateway({
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
