import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentImplementationEvidence } from "./codingAgentImplementationEvidence";
import { reconcileCodingAgentImplementationEvidence } from "./codingAgentImplementationReconciliation";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "./codingAgentSessionReceipt";
import { buildDevelopmentBoard, updateDevelopmentWorkItemStatus } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";
import type {
  CodingAgentSessionBundle,
  CodingAgentSessionReceipt
} from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent implementation reconciliation", () => {
  it("marks matched todo or active development items done from accepted implementation evidence", () => {
    const { board, evidence } = acceptedEvidenceFixture();
    const result = reconcileCodingAgentImplementationEvidence({
      evidence,
      items: board.items,
      generatedAt: evidence.generatedAt
    });

    expect(result.reconciliation.schema).toBe("naikaku.coding-agent-implementation-reconciliation.v1");
    expect(result.reconciliation.decision).toBe("applied");
    expect(result.reconciliation.summary.applied).toBe(board.items.length);
    expect(result.updatedItems.every((item) => item.status === "done")).toBe(true);
    expect(result.reconciliation.honestyClaim.limitations.join(" ")).toContain("does not independently rerun");
  });

  it("does not resolve blocked items automatically", () => {
    const { board, evidence } = acceptedEvidenceFixture();
    const blocked = updateDevelopmentWorkItemStatus({
      item: board.items[0],
      status: "blocked",
      updatedAt: evidence.generatedAt
    });
    const items = [blocked, ...board.items.slice(1)];
    const result = reconcileCodingAgentImplementationEvidence({
      evidence,
      items,
      generatedAt: evidence.generatedAt
    });

    expect(result.reconciliation.decision).toBe("partial");
    expect(result.reconciliation.summary.applied).toBe(board.items.length - 1);
    expect(result.updatedItems.find((item) => item.id === blocked.id)?.status).toBe("blocked");
    expect(result.reconciliation.items.find((item) => item.sourceItemId === blocked.id)?.reason).toContain("blocked");
  });
});

function acceptedEvidenceFixture() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  const briefs = buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
  const bundle = buildCodingAgentSessionBundle({
    briefs,
    generatedAt: briefs.generatedAt
  });
  const receipt = reviewCodingAgentSessionReceipt({
    bundle,
    receipt: completedReceiptFor(bundle),
    generatedAt: bundle.generatedAt
  });
  const evidence = buildCodingAgentImplementationEvidence({
    receipt,
    generatedAt: receipt.generatedAt
  });

  return { board, evidence };
}

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

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
