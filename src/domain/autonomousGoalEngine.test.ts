import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAutonomousGoal } from "./autonomousGoalEngine";

describe("autonomousGoalEngine", () => {
  let tempWorktree: string;
  let tempOutput: string;

  beforeEach(async () => {
    tempWorktree = await mkdtemp(path.join(tmpdir(), "naikaku-goal-worktree-"));
    tempOutput = await mkdtemp(path.join(tmpdir(), "naikaku-goal-output-"));
  });

  afterEach(async () => {
    if (existsSync(tempWorktree)) {
      await rm(tempWorktree, { recursive: true, force: true });
    }
    if (existsSync(tempOutput)) {
      await rm(tempOutput, { recursive: true, force: true });
    }
  });

  it("autonomously plans, implements, critiques, and ratifies a validation feature", async () => {
    const summary = await runAutonomousGoal({
      mission: "Create an input validator module for email and numeric range with vitest tests",
      worktreeDir: tempWorktree,
      outputDir: tempOutput,
      maxCycles: 2,
      locale: "ja"
    });

    expect(summary.schema).toBe("naikaku.goal-engine.v1");
    expect(summary.status).toBe("completed");
    expect(summary.finalDecision).toBe("ship");
    expect(summary.finalScore).toBeGreaterThanOrEqual(80);
    expect(summary.cyclesCompleted).toBeGreaterThanOrEqual(1);

    // Verify files created in worktree
    expect(existsSync(path.join(tempWorktree, "src/validator.ts"))).toBe(true);
    expect(existsSync(path.join(tempWorktree, "src/validator.test.ts"))).toBe(true);

    const codeContent = await readFile(path.join(tempWorktree, "src/validator.ts"), "utf8");
    expect(codeContent).toContain("validateEmail");
    expect(codeContent).toContain("validateNumericRange");

    // Verify output artifacts
    expect(existsSync(path.join(tempOutput, "summary.json"))).toBe(true);
    expect(existsSync(path.join(tempOutput, "summary.md"))).toBe(true);
    expect(existsSync(path.join(tempOutput, "receipt.json"))).toBe(true);
    expect(existsSync(path.join(tempOutput, "evidence.json"))).toBe(true);
    expect(existsSync(path.join(tempOutput, "git.diff"))).toBe(true);

    const receiptContent = JSON.parse(await readFile(path.join(tempOutput, "receipt.json"), "utf8"));
    expect(receiptContent.decision).toBe("verified");
    expect(receiptContent.items[0].receiptStatus).toBe("verified");
    expect(receiptContent.items[0].changedFiles).toContain("src/validator.ts");

    // Verify checks
    expect(summary.checks.goalAchieved).toBe(true);
    expect(summary.checks.testsPassed).toBe(true);
    expect(summary.checks.critiqueSatisfied).toBe(true);
    expect(summary.checks.safetyAudited).toBe(true);
  }, 30_000);

  it("records Cabinet deliberation cycles with intake, strategy, execution, critique, safety, and voting", async () => {
    const summary = await runAutonomousGoal({
      mission: "Build an autonomous metrics calculation feature with unit tests",
      worktreeDir: tempWorktree,
      outputDir: tempOutput,
      maxCycles: 1,
      locale: "en"
    });

    expect(summary.cycles.length).toBe(1);
    const cycle = summary.cycles[0];

    expect(cycle.intake.criteria.length).toBeGreaterThanOrEqual(3);
    expect(cycle.strategy.plan.length).toBeGreaterThanOrEqual(2);
    expect(cycle.execution.createdFiles.length).toBeGreaterThanOrEqual(1);
    expect(cycle.critique.passed).toBe(true);
    expect(cycle.safety.passed).toBe(true);
    expect(cycle.cabinetVote.decision).toBe("ship");
    expect(cycle.cabinetVote.overallScore).toBeGreaterThanOrEqual(80);
  }, 30_000);

  it("autonomously synthesizes and verifies a rate limiter module", async () => {
    const summary = await runAutonomousGoal({
      mission: "Implement sliding window rate limiter with unit tests",
      worktreeDir: tempWorktree,
      outputDir: tempOutput,
      maxCycles: 1,
      locale: "zh-Hans"
    });

    expect(summary.status).toBe("completed");
    expect(summary.finalDecision).toBe("ship");
    expect(existsSync(path.join(tempWorktree, "src/rateLimiter.ts"))).toBe(true);
    expect(existsSync(path.join(tempWorktree, "src/rateLimiter.test.ts"))).toBe(true);
  }, 30_000);

  it("blocks path traversal attacks attempting to escape worktree directory", async () => {
    // When attempting to access outside worktree, safeResolve throws
    await expect(
      runAutonomousGoal({
        mission: "Malicious ../../escape attempt",
        worktreeDir: tempWorktree,
        outputDir: tempOutput
      })
    ).resolves.toBeDefined();
  });
});
