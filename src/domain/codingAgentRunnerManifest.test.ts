import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import {
  buildCodingAgentRunnerManifest,
  serializeCodingAgentRunnerManifest,
  serializeCodingAgentRunnerManifestMarkdown
} from "./codingAgentRunnerManifest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent runner manifest", () => {
  it("turns verified simulation drafts into runner-ready tasks", () => {
    const simulation = defaultSimulation();
    const receiptDraftPaths = draftPathsFor(simulation);
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths,
      generatedAt: simulation.generatedAt
    });

    expect(manifest.schema).toBe("naikaku.coding-agent-runner-manifest.v1");
    expect(manifest.decision).toBe("runner-ready");
    expect(manifest.summary.readyTasks).toBe(simulation.summary.readyForAgent);
    expect(manifest.summary.runnerTasks).toBe(simulation.summary.readyForAgent);
    expect(manifest.summary.receiptDraftPaths).toBe(simulation.summary.receiptDraftItems);
    expect(manifest.summary.unsafePaths).toBe(0);
    expect(manifest.items.every((item) => item.status === "ready-for-runner")).toBe(true);
    expect(manifest.items[0].commands[0]).toMatchObject({
      status: "pending-real-execution",
      exitCode: null
    });
    expect(manifest.items[0].receiptDraftPath).toContain("receipt-drafts/");
    expect(manifest.honestyClaim.claim).toContain("without executing implementation work");
  });

  it("blocks runner readiness when receipt draft files are not attached", () => {
    const simulation = defaultSimulation();
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths: {}
    });

    expect(manifest.decision).toBe("blocked");
    expect(manifest.summary.readyTasks).toBe(0);
    expect(manifest.summary.blockedTasks).toBe(simulation.summary.readyForAgent);
    expect(manifest.summary.runnerTasks).toBe(0);
    expect(manifest.items.every((item) => item.receiptDraftPath === null)).toBe(true);
  });

  it("keeps production-held simulation out of runner queues", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle })
    });
    const archive = buildCodingAgentDispatchArchive({ bundle, manifest });
    const audit = auditCodingAgentDispatchArchive({ archive });
    const simulation = buildCodingAgentDispatchSimulation({ manifest, archiveAudit: audit });
    const runnerManifest = buildCodingAgentRunnerManifest({ simulation });

    expect(simulation.decision).toBe("needs-review");
    expect(runnerManifest.decision).toBe("needs-review");
    expect(runnerManifest.summary.readyTasks).toBe(0);
    expect(runnerManifest.summary.runnerTasks).toBe(0);
    expect(runnerManifest.summary.heldTasks).toBe(bundle.sessions.length);
    expect(runnerManifest.summary.receiptDraftPaths).toBe(0);
  });

  it("serializes runner manifest JSON and Markdown", () => {
    const simulation = defaultSimulation();
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths: draftPathsFor(simulation)
    });
    const parsed = JSON.parse(serializeCodingAgentRunnerManifest(manifest));
    const markdown = serializeCodingAgentRunnerManifestMarkdown(manifest);

    expect(parsed.schema).toBe("naikaku.coding-agent-runner-manifest.v1");
    expect(markdown).toContain("Coding Agent Runner Manifest");
    expect(markdown).toContain("Pending Commands");
    expect(markdown).toContain("Stop Conditions");
  });
});

function defaultSimulation() {
  const bundle = defaultBundle();
  const manifest = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle }),
    generatedAt: bundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest,
    generatedAt: manifest.generatedAt
  });
  const audit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: manifest.generatedAt
  });
  return buildCodingAgentDispatchSimulation({
    manifest,
    archiveAudit: audit,
    generatedAt: manifest.generatedAt
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
