import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import {
  buildCodingAgentRunnerSelfTest,
  serializeCodingAgentRunnerSelfTest,
  serializeCodingAgentRunnerSelfTestMarkdown
} from "./codingAgentRunnerSelfTest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent runner self-test", () => {
  it("simulates runner preflight without executing commands", () => {
    const manifest = defaultRunnerManifest();
    const report = buildCodingAgentRunnerSelfTest({
      manifest,
      generatedAt: manifest.generatedAt
    });

    expect(report.schema).toBe("naikaku.coding-agent-runner-self-test.v1");
    expect(report.decision).toBe("self-test-ready");
    expect(report.summary.wouldRun).toBe(manifest.summary.runnerTasks);
    expect(report.summary.blocked).toBe(0);
    expect(report.summary.pendingCommands).toBe(manifest.summary.plannedCommands);
    expect(report.summary.notExecutedCommands).toBe(manifest.summary.plannedCommands);
    expect(report.summary.receiptDraftPaths).toBe(manifest.summary.receiptDraftPaths);
    expect(report.summary.unsafePaths).toBe(0);
    expect(report.items.every((item) => item.selfTestStatus === "would-run")).toBe(true);
    expect(report.items.every((item) =>
      item.commands.every((command) => command.status === "not-executed" && command.exitCode === null)
    )).toBe(true);
    expect(report.honestyClaim.claim).toContain("without executing implementation work");
  });

  it("blocks self-test when runner manifest is missing receipt drafts", () => {
    const simulation = defaultSimulation();
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths: {}
    });
    const report = buildCodingAgentRunnerSelfTest({ manifest });

    expect(manifest.decision).toBe("blocked");
    expect(report.decision).toBe("blocked");
    expect(report.summary.wouldRun).toBe(0);
    expect(report.summary.blocked).toBe(simulation.summary.readyForAgent);
    expect(report.summary.notExecutedCommands).toBe(manifest.summary.plannedCommands);
  });

  it("keeps production-held runner tasks out of self-test execution", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const dispatch = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle })
    });
    const archive = buildCodingAgentDispatchArchive({ bundle, manifest: dispatch });
    const audit = auditCodingAgentDispatchArchive({ archive });
    const simulation = buildCodingAgentDispatchSimulation({ manifest: dispatch, archiveAudit: audit });
    const manifest = buildCodingAgentRunnerManifest({ simulation });
    const report = buildCodingAgentRunnerSelfTest({ manifest });

    expect(manifest.decision).toBe("needs-review");
    expect(report.decision).toBe("needs-review");
    expect(report.summary.wouldRun).toBe(0);
    expect(report.summary.held).toBe(bundle.sessions.length);
    expect(report.summary.blocked).toBe(0);
  });

  it("serializes runner self-test JSON and Markdown", () => {
    const report = buildCodingAgentRunnerSelfTest({
      manifest: defaultRunnerManifest()
    });
    const parsed = JSON.parse(serializeCodingAgentRunnerSelfTest(report));
    const markdown = serializeCodingAgentRunnerSelfTestMarkdown(report);

    expect(parsed.schema).toBe("naikaku.coding-agent-runner-self-test.v1");
    expect(markdown).toContain("Coding Agent Runner Self-Test");
    expect(markdown).toContain("Not-Executed Commands");
    expect(markdown).toContain("Honesty Boundary");
  });
});

function defaultRunnerManifest() {
  const simulation = defaultSimulation();
  return buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: draftPathsFor(simulation),
    generatedAt: simulation.generatedAt
  });
}

function defaultSimulation() {
  const bundle = defaultBundle();
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
  const audit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: dispatch.generatedAt
  });
  return buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit: audit,
    generatedAt: dispatch.generatedAt
  });
}

function draftPathsFor(simulation: ReturnType<typeof defaultSimulation>) {
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
