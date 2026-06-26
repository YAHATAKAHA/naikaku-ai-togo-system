import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import {
  buildCodingAgentImplementationEvidence,
  serializeCodingAgentImplementationEvidence,
  serializeCodingAgentImplementationEvidenceMarkdown
} from "./codingAgentImplementationEvidence";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "./codingAgentSessionReceipt";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";
import type { CodingAgentSessionBundle, CodingAgentSessionReceipt } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent implementation evidence", () => {
  it("summarizes a verified receipt for operator handoff without claiming execution", () => {
    const bundle = defaultBundle();
    const receipt = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: completedReceiptFor(bundle),
      generatedAt: bundle.generatedAt
    });
    const evidence = buildCodingAgentImplementationEvidence({
      receipt,
      generatedAt: receipt.generatedAt
    });
    const parsed = JSON.parse(serializeCodingAgentImplementationEvidence(evidence));
    const markdown = serializeCodingAgentImplementationEvidenceMarkdown(evidence);

    expect(evidence.schema).toBe("naikaku.coding-agent-implementation-evidence.v1");
    expect(evidence.decision).toBe("accepted-for-handoff");
    expect(evidence.summary.accepted).toBe(bundle.sessions.length);
    expect(evidence.summary.failedCommands).toBe(0);
    expect(evidence.items[0].sourceItemId).toBe(bundle.sessions[0].sourceItemId);
    expect(parsed.sourceSchema).toBe("naikaku.coding-agent-session-receipt.v1");
    expect(parsed.items[0].sourceItemId).toBe(bundle.sessions[0].sourceItemId);
    expect(markdown).toContain("does not rerun commands");
    expect(markdown).toContain(`Source item: ${bundle.sessions[0].sourceItemId}`);
    expect(markdown).toContain("Changed Files");
  });

  it("blocks implementation evidence when the reviewed receipt contains failed commands", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    submitted.items[0].commandResults[0].exitCode = 1;
    submitted.items[0].commandResults[0].outputSummary = "test command failed";
    const receipt = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted
    });
    const evidence = buildCodingAgentImplementationEvidence({ receipt });

    expect(receipt.decision).toBe("blocked");
    expect(evidence.decision).toBe("blocked");
    expect(evidence.summary.blocked).toBe(1);
    expect(evidence.summary.failedCommands).toBe(1);
    expect(evidence.items[0].accepted).toBe(false);
  });
});

function completedReceiptFor(bundle: CodingAgentSessionBundle): CodingAgentSessionReceipt {
  const template = buildCodingAgentSessionReceiptTemplate({
    bundle,
    generatedAt: bundle.generatedAt
  });

  return {
    ...template,
    items: template.items.map((item) => {
      const session = bundle.sessions.find((candidate) => candidate.id === item.sessionId);
      if (!session) return item;
      return {
        ...item,
        changedFiles: [`src/${session.id}.ts`],
        commandResults: session.verificationCommands.map((command) => ({
          command,
          exitCode: 0,
          outputSummary: `${command} passed in sandbox workspace.`,
          transcriptRef: `output/coding-agent/${session.id}/${slug(command)}.log`
        })),
        evidence: session.evidenceRequired.map((evidence) => `${evidence}: attached`),
        risks: ["No known remaining risks after local verification."]
      };
    })
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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
