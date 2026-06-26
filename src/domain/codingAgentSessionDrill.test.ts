import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import {
  buildCodingAgentSessionDrill,
  serializeCodingAgentSessionDrill,
  serializeCodingAgentSessionDrillMarkdown
} from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent session drill", () => {
  it("simulates assignable sessions without claiming execution", () => {
    const bundle = defaultBundle();
    const drill = buildCodingAgentSessionDrill({
      bundle,
      generatedAt: bundle.generatedAt
    });

    expect(drill.schema).toBe("naikaku.coding-agent-session-drill.v1");
    expect(drill.decision).toBe("assignable");
    expect(drill.summary.wouldAssign).toBe(bundle.sessions.length);
    expect(drill.summary.notAssigned).toBe(0);
    expect(drill.items.every((item) => item.action === "would-assign")).toBe(true);
    expect(drill.honestyClaim.limitations.join(" ")).toContain("No code was edited");
  });

  it("does not assign production-held sessions", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const drill = buildCodingAgentSessionDrill({ bundle });

    expect(bundle.decision).toBe("blocked");
    expect(drill.decision).toBe("blocked");
    expect(drill.summary.wouldAssign).toBe(0);
    expect(drill.summary.notAssigned).toBe(bundle.sessions.length);
    expect(drill.items.every((item) => item.action === "not-assigned")).toBe(true);
    expect(drill.items[0].reason).toContain("production evidence");
  });

  it("serializes JSON and Markdown with dry-run boundaries", () => {
    const drill = buildCodingAgentSessionDrill({ bundle: defaultBundle() });
    const parsed = JSON.parse(serializeCodingAgentSessionDrill(drill));
    const markdown = serializeCodingAgentSessionDrillMarkdown(drill);

    expect(parsed.schema).toBe("naikaku.coding-agent-session-drill.v1");
    expect(markdown).toContain("No code was edited");
    expect(markdown).toContain("Would assign");
    expect(markdown).toContain("Required Evidence");
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
