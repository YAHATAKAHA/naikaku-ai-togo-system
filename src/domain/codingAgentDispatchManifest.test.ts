import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import {
  buildCodingAgentDispatchManifest,
  serializeCodingAgentDispatchManifest,
  serializeCodingAgentDispatchManifestMarkdown
} from "./codingAgentDispatchManifest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent dispatch manifest", () => {
  it("turns assignable sessions into prompt and receipt dispatch paths", () => {
    const bundle = defaultBundle();
    const drill = buildCodingAgentSessionDrill({
      bundle,
      generatedAt: bundle.generatedAt
    });
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill,
      generatedAt: bundle.generatedAt
    });

    expect(manifest.schema).toBe("naikaku.coding-agent-dispatch-manifest.v1");
    expect(manifest.decision).toBe("dispatchable");
    expect(manifest.receiptTemplatePath).toBe("receipt-template.json");
    expect(manifest.summary.ready).toBe(bundle.sessions.length);
    expect(manifest.summary.held).toBe(0);
    expect(manifest.summary.promptFiles).toBe(bundle.sessions.length);
    expect(manifest.summary.receiptTemplates).toBe(1);
    expect(manifest.summary.unsafePaths).toBe(0);
    expect(manifest.summary.uniqueEvidencePrefixes).toBe(bundle.sessions.length);
    expect(manifest.items[0].dispatchStatus).toBe("ready-to-dispatch");
    expect(manifest.items[0].promptPath).toBe(`prompts/${bundle.sessions[0].promptFileName}`);
    expect(manifest.items[0].receiptTemplatePath).toBe("receipt-template.json");
    expect(manifest.items[0].expectedTranscriptRefs[0]).toBe(
      `${bundle.sessions[0].sandboxContract.evidenceArtifactPrefix}transcript-1.log`
    );
    expect(manifest.items[0].expectedEvidenceArtifacts[0].path).toBe(
      `${bundle.sessions[0].sandboxContract.evidenceArtifactPrefix}evidence-1.txt`
    );
  });

  it("does not produce prompt paths for production-held sessions", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const drill = buildCodingAgentSessionDrill({ bundle });
    const manifest = buildCodingAgentDispatchManifest({ bundle, drill });

    expect(bundle.decision).toBe("blocked");
    expect(manifest.decision).toBe("blocked");
    expect(manifest.receiptTemplatePath).toBeNull();
    expect(manifest.summary.ready).toBe(0);
    expect(manifest.summary.productionHeld).toBe(bundle.sessions.length);
    expect(manifest.summary.promptFiles).toBe(0);
    expect(manifest.summary.receiptTemplates).toBe(0);
    expect(manifest.items.every((item) => item.dispatchStatus === "held-for-production-evidence")).toBe(true);
    expect(manifest.items.every((item) => item.promptPath === null)).toBe(true);
    expect(manifest.items.every((item) => item.receiptTemplatePath === null)).toBe(true);
  });

  it("serializes JSON and Markdown without claiming execution happened", () => {
    const bundle = defaultBundle();
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle })
    });
    const parsed = JSON.parse(serializeCodingAgentDispatchManifest(manifest));
    const markdown = serializeCodingAgentDispatchManifestMarkdown(manifest);

    expect(parsed.schema).toBe("naikaku.coding-agent-dispatch-manifest.v1");
    expect(parsed.items[0].evidenceArtifactPrefix).toContain("output/coding-agent/");
    expect(markdown).toContain("This manifest prepares a local coding-agent dispatch package without executing implementation work.");
    expect(markdown).toContain("Prompt path: prompts/");
    expect(markdown).toContain("Receipt template: receipt-template.json");
    expect(markdown).toContain("Expected Evidence Artifacts");
  });
});

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
