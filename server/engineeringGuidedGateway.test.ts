import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runEngineeringGuidedGateway } from "./engineeringGuidedGateway";

describe("engineering guided gateway", () => {
  it("runs the fixture preset through the fixed guided command", () => {
    const cwd = mkdtempForGuided();
    const calls: Array<{ command: string; args: string[] }> = [];
    const result = runEngineeringGuidedGateway({
      mission: "Let the cabinet supervise a fixture runner",
      locale: "ja",
      cabinetMode: "api-mock",
      runnerPreset: "fixture",
      maxLoops: 2,
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
            cabinetVotedEveryCycle: true,
            apiCabinetEvidenceWrittenWhenUsed: true,
            successfulExecutionsHavePassingChecks: true
          }
        }));
        return { status: 0, signal: null, stdout: "ok", stderr: "" };
      }) as never
    });

    expect(result.statusCode).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.cabinetMode).toBe("api-mock");
    expect(result.body.preset).toBe("fixture");
    expect(result.body.maxLoops).toBe(2);
    expect(result.body.checks).toEqual({ pass: 3, fail: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("npm-test");
    expect(calls[0].args).toEqual(expect.arrayContaining([
      "run",
      "engineering:guided",
      "--cabinet-mode",
      "api-mock",
      "--runner-preset",
      "fixture",
      "--max-loops",
      "2",
      "--adapter-ready"
    ]));
  });

  it("blocks external presets until the operator marks the adapter ready", () => {
    const result = runEngineeringGuidedGateway({
      mission: "Use OpenHands for a real repo task",
      runnerPreset: "openhands",
      cabinetMode: "local"
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

  it("passes live provider cabinet options without persisting raw secrets", () => {
    const cwd = mkdtempForGuided();
    const calls: Array<{ args: string[] }> = [];
    const result = runEngineeringGuidedGateway({
      mission: "Use a live provider cabinet before fixture execution",
      cabinetMode: "api",
      cabinetProvider: "openrouter",
      cabinetEndpoint: "https://openrouter.ai/api/v1/chat/completions",
      cabinetModel: "openai/example",
      cabinetApiKeyAlias: "OPENROUTER_API_KEY",
      runnerPreset: "fixture",
      generatedAt: "2026-06-27T00:00:00.000Z"
    }, {
      cwd,
      npmCommand: "npm-test",
      spawn: ((_command: string, args: string[]) => {
        calls.push({ args });
        const outIndex = args.indexOf("--out");
        const outputDir = args[outIndex + 1];
        mkdirSync(join(cwd, outputDir), { recursive: true });
        writeFileSync(join(cwd, outputDir, "summary.json"), JSON.stringify({
          checks: {
            cabinetVotedEveryCycle: true
          }
        }));
        return { status: 0, signal: null, stdout: "ok", stderr: "" };
      }) as never
    });

    expect(result.statusCode).toBe(200);
    expect(result.body.cabinetMode).toBe("api");
    expect(calls[0].args).toEqual(expect.arrayContaining([
      "--cabinet-provider",
      "openrouter",
      "--cabinet-endpoint",
      "https://openrouter.ai/api/v1/chat/completions",
      "--cabinet-model",
      "openai/example",
      "--cabinet-api-key-alias",
      "OPENROUTER_API_KEY"
    ]));
    expect(calls[0].args.join(" ")).not.toContain("sk-");
  });

  it("rejects raw-looking cabinet API keys before spawning", () => {
    const result = runEngineeringGuidedGateway({
      mission: "Use a live provider cabinet before fixture execution",
      cabinetMode: "api",
      cabinetProvider: "openai",
      cabinetModel: "example-model",
      cabinetApiKeyAlias: "sk-live-raw-secret",
      runnerPreset: "fixture"
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
    expect(result.body.message).toContain("environment variable name");
  });
});

function mkdtempForGuided() {
  return mkdtempSync(join(tmpdir(), "naikaku-guided-gateway-"));
}
