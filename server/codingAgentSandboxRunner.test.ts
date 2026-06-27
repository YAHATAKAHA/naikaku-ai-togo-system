import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../src/data/defaultCabinet";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "../src/domain/codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "../src/domain/codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "../src/domain/codingAgentDispatchSimulation";
import { buildCodingAgentRunnerManifest } from "../src/domain/codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "../src/domain/codingAgentRunnerSelfTest";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import { runCodingAgentSandboxRunner } from "./codingAgentSandboxRunner";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent sandbox runner", () => {
  it("blocks commands outside the local allowlist without spawning processes", async () => {
    const originalCwd = process.cwd();
    const tempDir = mkdtempSync(join(tmpdir(), "naikaku-sandbox-runner-"));

    try {
      process.chdir(tempDir);
      const bundle = defaultBundle();
      const selfTest = defaultSelfTest(bundle);
      const result = await runCodingAgentSandboxRunner({
        selfTest,
        bundle,
        generatedAt: "2026-01-01T00:00:00.000Z",
        caseName: "unit",
        commandAllowlist: []
      });

      expect(result.schema).toBe("naikaku.coding-agent-sandbox-runner-result.v1");
      expect(result.report.schema).toBe("naikaku.coding-agent-sandbox-runner.v1");
      expect(result.report.decision).toBe("blocked");
      expect(result.report.summary.processExecutions).toBe(0);
      expect(result.report.summary.executedTasks).toBe(0);
      expect(result.report.summary.blockedCommands).toBe(selfTest.summary.pendingCommands);
      expect(result.report.summary.failedCommands).toBe(selfTest.summary.pendingCommands);
      expect(result.report.items.every((item) =>
        item.commandResults.every((command) => command.status === "blocked")
      )).toBe(true);
      expect(result.honestyClaim.limitations.join(" ")).toContain("does not ask a model");
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function defaultSelfTest(bundle: ReturnType<typeof defaultBundle>) {
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle }),
    generatedAt: bundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest: dispatch,
    generatedAt: dispatch.generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: dispatch.generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit,
    generatedAt: dispatch.generatedAt
  });
  const manifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: draftPathsFor(simulation),
    generatedAt: simulation.generatedAt
  });
  return buildCodingAgentRunnerSelfTest({
    manifest,
    generatedAt: manifest.generatedAt
  });
}

function draftPathsFor(simulation: ReturnType<typeof buildCodingAgentDispatchSimulation>) {
  return Object.fromEntries(simulation.items.map((item, index) => [
    item.sessionId,
    `output/coding-agent-dispatch-simulation/valid/receipt-drafts/${String(index + 1).padStart(2, "0")}-${item.sessionId}.json`
  ]));
}

function defaultBundle() {
  const briefs = defaultBriefs();
  return buildCodingAgentSessionBundle({
    briefs,
    generatedAt: briefs.generatedAt
  });
}

function defaultBriefs() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  return buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
}
