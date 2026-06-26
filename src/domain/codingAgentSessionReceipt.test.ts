import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt,
  serializeCodingAgentSessionReceipt,
  serializeCodingAgentSessionReceiptMarkdown
} from "./codingAgentSessionReceipt";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";
import type { CodingAgentSessionBundle, CodingAgentSessionReceipt } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent session receipt", () => {
  it("builds a receipt template that cannot claim implementation without evidence", () => {
    const bundle = defaultBundle();
    const receipt = buildCodingAgentSessionReceiptTemplate({
      bundle,
      generatedAt: bundle.generatedAt
    });

    expect(receipt.schema).toBe("naikaku.coding-agent-session-receipt.v1");
    expect(receipt.decision).toBe("needs-evidence");
    expect(receipt.summary.pendingEvidence).toBe(bundle.sessions.length);
    expect(receipt.summary.verified).toBe(0);
    expect(receipt.items[0].missing.join(" ")).toContain("Changed files");
    expect(receipt.honestyClaim.limitations.join(" ")).toContain("No command was run");
  });

  it("blocks receipts for held production sessions", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const receipt = buildCodingAgentSessionReceiptTemplate({ bundle });

    expect(bundle.decision).toBe("blocked");
    expect(receipt.decision).toBe("blocked");
    expect(receipt.summary.held).toBe(bundle.sessions.length);
    expect(receipt.items.every((item) => item.receiptStatus === "held")).toBe(true);
  });

  it("verifies a structurally complete submitted receipt", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    const reviewed = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted,
      generatedAt: submitted.generatedAt
    });
    const parsed = JSON.parse(serializeCodingAgentSessionReceipt(reviewed));
    const markdown = serializeCodingAgentSessionReceiptMarkdown(reviewed);

    expect(reviewed.decision).toBe("verified");
    expect(reviewed.summary.verified).toBe(bundle.sessions.length);
    expect(reviewed.summary.failed).toBe(0);
    expect(reviewed.items[0].sourceItemId).toBe(bundle.sessions[0].sourceItemId);
    expect(parsed.schema).toBe("naikaku.coding-agent-session-receipt.v1");
    expect(parsed.items[0].sourceItemId).toBe(bundle.sessions[0].sourceItemId);
    expect(markdown).toContain("Changed Files");
    expect(markdown).toContain(`Source item: ${bundle.sessions[0].sourceItemId}`);
    expect(markdown).toContain("No command was run");
  });

  it("keeps receipts pending when command transcript references are missing", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    submitted.items[0].commandResults = submitted.items[0].commandResults.map((result) => ({
      command: result.command,
      exitCode: result.exitCode,
      outputSummary: result.outputSummary
    }));

    const reviewed = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted
    });

    expect(reviewed.decision).toBe("needs-evidence");
    expect(reviewed.summary.pendingEvidence).toBe(1);
    expect(reviewed.items[0].receiptStatus).toBe("pending-evidence");
    expect(reviewed.items[0].missing.join(" ")).toContain("Command transcript artifact reference is required");
  });

  it("keeps receipts pending when evidence items are only attached claims", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    submitted.items[0].evidence = bundle.sessions[0].evidenceRequired.map((evidence) => `${evidence}: attached`);

    const reviewed = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted
    });

    expect(reviewed.decision).toBe("needs-evidence");
    expect(reviewed.summary.pendingEvidence).toBe(1);
    expect(reviewed.items[0].missing.join(" ")).toContain("Evidence artifact must include a local artifact path");
  });

  it("keeps receipts pending when evidence artifacts do not cover the requested evidence items", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    submitted.items[0].evidence = bundle.sessions[0].evidenceRequired.map((_, index) =>
      `Unrelated proof ${index + 1}: output/coding-agent/${bundle.sessions[0].id}/unrelated-${index + 1}.txt`
    );

    const reviewed = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted
    });

    expect(reviewed.decision).toBe("needs-evidence");
    expect(reviewed.summary.pendingEvidence).toBe(1);
    expect(reviewed.items[0].missing.join(" ")).toContain("Evidence artifact is required for: Changed files summary.");
    expect(reviewed.items[0].missing.join(" ")).toContain("Evidence artifact is required for: Relevant command output with exit codes.");
  });

  it("keeps receipts pending when submitted artifact paths escape the sandbox", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    submitted.items[0].changedFiles = ["../secrets.env"];
    submitted.items[0].commandResults[0].transcriptRef = "../logs/test.log";
    submitted.items[0].evidence[0] = "Browser screenshot: ../screens/private.png";

    const reviewed = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted
    });

    expect(reviewed.decision).toBe("needs-evidence");
    expect(reviewed.summary.pendingEvidence).toBe(1);
    expect(reviewed.items[0].missing.join(" ")).toContain("Changed file path must be a safe relative artifact path");
    expect(reviewed.items[0].missing.join(" ")).toContain("Command transcript path must be a safe relative artifact path");
    expect(reviewed.items[0].missing.join(" ")).toContain("Evidence artifact path must be a safe relative artifact path");
  });

  it("blocks a submitted receipt when a verification command failed", () => {
    const bundle = defaultBundle();
    const submitted = completedReceiptFor(bundle);
    submitted.items[0].commandResults[0].exitCode = 1;
    submitted.items[0].commandResults[0].outputSummary = "test command failed";

    const reviewed = reviewCodingAgentSessionReceipt({
      bundle,
      receipt: submitted
    });

    expect(reviewed.decision).toBe("blocked");
    expect(reviewed.summary.failed).toBe(1);
    expect(reviewed.items[0].receiptStatus).toBe("failed");
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
        evidence: session.evidenceRequired.map((evidence, index) =>
          `${evidence}: output/coding-agent/${session.id}/evidence-${index + 1}.txt`
        ),
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
