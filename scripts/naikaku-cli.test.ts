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
  it("exposes the package binary and governed local workflow commands", () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8")) as {
      bin?: Record<string, string>;
    };

    expect(packageJson.bin?.naikaku).toBe("./bin/naikaku.mjs");

    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("naikaku doctor");
    expect(result.stdout).toContain("naikaku task");
    expect(result.stdout).toContain("default mode prepares evidence only");
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

  it("delegates task help to the governed task entrypoint", () => {
    const result = runCli(["task", "--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("This is the operator-facing CLI entry");
    expect(result.stdout).toContain("--self-test");
  });
});
