import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import {
  auditCodingAgentDispatchArchive,
  serializeCodingAgentDispatchArchiveAudit,
  serializeCodingAgentDispatchArchiveAuditMarkdown
} from "./codingAgentDispatchArchiveAudit";
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

describe("coding agent dispatch archive audit", () => {
  it("verifies a complete dispatch archive", () => {
    const archive = defaultArchive();
    const audit = auditCodingAgentDispatchArchive({
      archive,
      generatedAt: archive.generatedAt
    });

    expect(audit.schema).toBe("naikaku.coding-agent-dispatch-archive-audit.v1");
    expect(audit.decision).toBe("verified");
    expect(audit.summary.blockers).toBe(0);
    expect(audit.summary.missingPromptFiles).toBe(0);
    expect(audit.summary.unexpectedPromptFiles).toBe(0);
    expect(audit.summary.promptFiles).toBe(archive.summary.promptFiles);
    expect(audit.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("verifies that production-held archives remain unassigned", () => {
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

    expect(manifest.decision).toBe("blocked");
    expect(audit.decision).toBe("verified");
    expect(audit.summary.promptFiles).toBe(0);
    expect(audit.summary.receiptTemplates).toBe(0);
    expect(audit.summary.unassignedHeldItems).toBe(bundle.sessions.length);
  });

  it("blocks archives that lose a ready prompt file", () => {
    const archive = defaultArchive();
    const brokenArchive = {
      ...archive,
      files: archive.files.filter((file) => file.role !== "prompt" || file.path !== "prompts/01-execution-minister-implementation.md")
    };
    const audit = auditCodingAgentDispatchArchive({ archive: brokenArchive });

    expect(audit.decision).toBe("blocked");
    expect(audit.summary.missingPromptFiles).toBe(1);
    expect(audit.checks.find((check) => check.id === "ready-prompts")?.status).toBe("block");
  });

  it("blocks archives with unsafe paths", () => {
    const archive = defaultArchive();
    const brokenArchive = {
      ...archive,
      files: archive.files.map((file, index) =>
        index === 0 ? { ...file, path: "../escape.md" } : file
      )
    };
    const audit = auditCodingAgentDispatchArchive({ archive: brokenArchive });

    expect(audit.decision).toBe("blocked");
    expect(audit.summary.unsafePaths).toBeGreaterThan(0);
    expect(audit.checks.find((check) => check.id === "archive-file-inventory")?.status).toBe("block");
  });

  it("serializes audit JSON and Markdown", () => {
    const audit = auditCodingAgentDispatchArchive({ archive: defaultArchive() });
    const parsed = JSON.parse(serializeCodingAgentDispatchArchiveAudit(audit));
    const markdown = serializeCodingAgentDispatchArchiveAuditMarkdown(audit);

    expect(parsed.schema).toBe("naikaku.coding-agent-dispatch-archive-audit.v1");
    expect(markdown).toContain("Coding Agent Dispatch Archive Audit");
    expect(markdown).toContain("ready-prompts");
    expect(markdown).toContain("Honesty Claim");
  });
});

function defaultArchive() {
  const bundle = defaultBundle();
  const manifest = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle }),
    generatedAt: bundle.generatedAt
  });
  return buildCodingAgentDispatchArchive({
    bundle,
    manifest,
    generatedAt: bundle.generatedAt
  });
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
