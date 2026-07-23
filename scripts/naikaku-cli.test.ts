import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(projectRoot, "bin", "naikaku.mjs");

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8"
  });
}

describe("Naikaku CLI", () => {
  it("exposes a Japanese-first, governed local workflow command surface", () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin?.naikaku).toBe("./bin/naikaku.mjs");

    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("内閣ワークベンチ CLI");
    expect(result.stdout).toContain("naikaku doctor");
    expect(result.stdout).toContain("naikaku task");
    expect(result.stdout).toContain("既定では外部 runner を始めません");
    expect(result.stdout).not.toContain("\u001b[");
  });

  it("renders human-readable help in a requested supported locale", () => {
    const result = runCli(["help", "--locale", "en"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Cabinet Workbench CLI");
    expect(result.stdout).toContain("Run local AI work with approvals");
  });

  it("reports local coding CLI and gateway readiness without running a model", () => {
    const result = runCli(["doctor", "--gateway", "http://127.0.0.1:9", "--json"]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      schema: string;
      codingCli: Array<{ command: string; path: string | null }>;
      claimBoundary: string;
    };
    expect(report.schema).toBe("naikaku.cli-doctor.v1");
    expect(report.codingCli.map((item) => item.command)).toEqual(["codex", "claude", "qwen"]);
    expect(report.claimBoundary).toContain("does not execute models");
  });

  it("keeps task help polished while preserving advanced script help", () => {
    const result = runCli(["task", "--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("統制された task");
    expect(result.stdout).toContain("naikaku task --self-test");
    expect(result.stdout).toContain("npm run naikaku:task -- --help");
  });
});
