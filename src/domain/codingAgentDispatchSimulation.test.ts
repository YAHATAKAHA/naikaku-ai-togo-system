import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import {
  buildCodingAgentDispatchSimulation,
  serializeCodingAgentDispatchSimulation,
  serializeCodingAgentDispatchSimulationMarkdown
} from "./codingAgentDispatchSimulation";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent dispatch simulation", () => {
  it("plans real-agent handoff drafts from a verified dispatch archive", () => {
    const { manifest, audit } = defaultDispatch();
    const simulation = buildCodingAgentDispatchSimulation({
      manifest,
      archiveAudit: audit,
      generatedAt: manifest.generatedAt
    });

    expect(simulation.schema).toBe("naikaku.coding-agent-dispatch-simulation.v1");
    expect(simulation.decision).toBe("ready-for-real-agent");
    expect(simulation.summary.readyForAgent).toBe(manifest.summary.ready);
    expect(simulation.summary.receiptDraftItems).toBe(manifest.summary.ready);
    expect(simulation.summary.unsafePaths).toBe(0);
    expect(simulation.items.every((item) => item.receiptDraft)).toBe(true);
    expect(simulation.items[0].receiptDraft?.commandResults[0].exitCode).toBeNull();
    expect(simulation.honestyClaim.claim).toContain("without executing implementation work");
  });

  it("keeps production-held sessions visible but unassigned", () => {
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

    expect(manifest.decision).toBe("blocked");
    expect(audit.decision).toBe("verified");
    expect(simulation.decision).toBe("needs-review");
    expect(simulation.summary.readyForAgent).toBe(0);
    expect(simulation.summary.held).toBe(bundle.sessions.length);
    expect(simulation.summary.receiptDraftItems).toBe(0);
    expect(simulation.summary.unsafePaths).toBe(0);
  });

  it("holds ready sessions when the archive audit is not attached", () => {
    const { manifest } = defaultDispatch();
    const simulation = buildCodingAgentDispatchSimulation({ manifest });

    expect(simulation.decision).toBe("needs-review");
    expect(simulation.summary.readyForAgent).toBe(0);
    expect(simulation.summary.held).toBe(manifest.summary.ready);
    expect(simulation.summary.receiptDraftItems).toBe(0);
  });

  it("blocks simulation when a verified-ready archive audit has blockers", () => {
    const { manifest, archive } = defaultDispatch();
    const brokenArchive = {
      ...archive,
      files: archive.files.filter((file) => file.role !== "prompt")
    };
    const blockedAudit = auditCodingAgentDispatchArchive({ archive: brokenArchive });
    const simulation = buildCodingAgentDispatchSimulation({
      manifest,
      archiveAudit: blockedAudit
    });

    expect(blockedAudit.decision).toBe("blocked");
    expect(simulation.decision).toBe("blocked");
    expect(simulation.summary.blocked).toBe(manifest.summary.ready);
    expect(simulation.items.every((item) => item.receiptDraft === null)).toBe(true);
  });

  it("serializes simulation JSON and Markdown", () => {
    const { manifest, audit } = defaultDispatch();
    const simulation = buildCodingAgentDispatchSimulation({ manifest, archiveAudit: audit });
    const parsed = JSON.parse(serializeCodingAgentDispatchSimulation(simulation));
    const markdown = serializeCodingAgentDispatchSimulationMarkdown(simulation);

    expect(parsed.schema).toBe("naikaku.coding-agent-dispatch-simulation.v1");
    expect(markdown).toContain("Coding Agent Dispatch Simulation");
    expect(markdown).toContain("Honesty Boundary");
    expect(markdown).toContain("Planned Steps");
  });
});

function defaultDispatch() {
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
  return {
    bundle,
    manifest,
    archive,
    audit
  };
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
