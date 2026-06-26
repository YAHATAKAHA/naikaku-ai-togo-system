import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import {
  buildCodingAgentDispatchArchive,
  serializeCodingAgentDispatchArchive,
  serializeCodingAgentDispatchArchiveMarkdown
} from "./codingAgentDispatchArchive";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent dispatch archive", () => {
  it("packages ready prompts, manifest files, and a receipt template without claiming execution", () => {
    const bundle = defaultBundle();
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle }),
      generatedAt: bundle.generatedAt
    });
    const archive = buildCodingAgentDispatchArchive({
      bundle,
      manifest,
      generatedAt: bundle.generatedAt
    });

    expect(archive.schema).toBe("naikaku.coding-agent-dispatch-archive.v1");
    expect(archive.decision).toBe("dispatchable");
    expect(archive.summary.promptFiles).toBe(manifest.summary.promptFiles);
    expect(archive.summary.receiptTemplates).toBe(1);
    expect(archive.summary.unassignedHeldItems).toBe(0);
    expect(archive.summary.unsafePaths).toBe(0);
    expect(archive.files.some((file) => file.path === "dispatch-manifest.json")).toBe(true);
    expect(archive.files.some((file) => file.path === "receipt-template.json")).toBe(true);
    expect(archive.files.filter((file) => file.role === "prompt")).toHaveLength(bundle.sessions.length);
    expect(archive.files.find((file) => file.role === "prompt")?.content).toContain("## Sandbox Contract");
    expect(archive.files.find((file) => file.role === "receipt-template")?.content).toContain(
      "naikaku.coding-agent-session-receipt.v1"
    );
    expect(archive.honestyClaim.claim).toContain("without executing implementation work");
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

    expect(manifest.decision).toBe("blocked");
    expect(archive.decision).toBe("blocked");
    expect(archive.summary.promptFiles).toBe(0);
    expect(archive.summary.receiptTemplates).toBe(0);
    expect(archive.summary.unassignedHeldItems).toBe(bundle.sessions.length);
    expect(archive.files.some((file) => file.role === "prompt")).toBe(false);
    expect(archive.files.some((file) => file.role === "receipt-template")).toBe(false);
    expect(archive.files.find((file) => file.path === "dispatch-manifest.json")?.content).toContain(
      "held-for-production-evidence"
    );
  });

  it("serializes archive JSON and Markdown inventory", () => {
    const bundle = defaultBundle();
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle })
    });
    const archive = buildCodingAgentDispatchArchive({ bundle, manifest });
    const parsed = JSON.parse(serializeCodingAgentDispatchArchive(archive));
    const markdown = serializeCodingAgentDispatchArchiveMarkdown(archive);

    expect(parsed.schema).toBe("naikaku.coding-agent-dispatch-archive.v1");
    expect(parsed.files[0].content).toContain("Coding Agent Dispatch Package");
    expect(markdown).toContain("Coding Agent Dispatch Archive");
    expect(markdown).toContain("File Inventory");
    expect(markdown).toContain("prompts/");
    expect(markdown).toContain("Receipt templates: 1");
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
