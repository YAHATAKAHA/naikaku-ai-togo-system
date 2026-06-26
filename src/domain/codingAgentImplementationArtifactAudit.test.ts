import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { auditCodingAgentImplementationArtifacts } from "./codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "./codingAgentImplementationEvidence";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import {
  buildCodingAgentSessionReceiptTemplate,
  reviewCodingAgentSessionReceipt
} from "./codingAgentSessionReceipt";
import { buildDevelopmentBoard } from "./developmentBoard";
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

describe("coding agent implementation artifact audit", () => {
  it("verifies accepted implementation evidence when local artifact paths exist", () => {
    const evidence = acceptedEvidenceFixture();
    const sha256 = "a".repeat(64);
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: (relativePath) => ({
        exists: true,
        bytes: relativePath.length,
        sha256,
        modifiedAt: evidence.generatedAt
      })
    });

    expect(audit.schema).toBe("naikaku.coding-agent-implementation-artifact-audit.v1");
    expect(audit.decision).toBe("verified");
    expect(audit.summary.verified).toBe(evidence.items.length);
    expect(audit.summary.verifiedPaths).toBeGreaterThan(0);
    expect(audit.summary.fingerprintedPaths).toBe(audit.summary.verifiedPaths);
    expect(audit.summary.totalBytes).toBeGreaterThan(0);
    expect(audit.summary.uniquePaths).toBe(audit.summary.paths);
    expect(audit.summary.duplicatePathRefs).toBe(0);
    expect(audit.summary.uniqueFingerprintedPaths).toBe(audit.summary.fingerprintedPaths);
    expect(audit.summary.uniqueFingerprintBytes).toBe(audit.summary.totalBytes);
    expect(audit.items[0].paths[0]).toMatchObject({
      status: "verified",
      sha256,
      modifiedAt: evidence.generatedAt
    });
    expect(audit.honestyClaim.limitations.join(" ")).toContain("does not rerun commands");
  });

  it("keeps legacy path existence checks compatible without fingerprints", () => {
    const evidence = acceptedEvidenceFixture();
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      pathExists: () => true
    });

    expect(audit.decision).toBe("verified");
    expect(audit.summary.verifiedPaths).toBeGreaterThan(0);
    expect(audit.summary.fingerprintedPaths).toBe(0);
    expect(audit.summary.totalBytes).toBe(0);
    expect(audit.summary.uniqueFingerprintedPaths).toBe(0);
    expect(audit.summary.uniqueFingerprintBytes).toBe(0);
  });

  it("separates repeated artifact references from unique fingerprinted files", () => {
    const evidence = acceptedEvidenceFixture();
    evidence.items.forEach((item) => {
      item.changedFiles = ["src/shared-artifact.ts"];
      item.commandResults = item.commandResults.map((result) => ({
        ...result,
        transcriptRef: "output/coding-agent/shared-transcript.log"
      }));
    });

    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: (relativePath) => ({
        exists: true,
        bytes: relativePath.endsWith(".log") ? 456 : 123,
        sha256: relativePath.endsWith(".log") ? "b".repeat(64) : "c".repeat(64),
        modifiedAt: evidence.generatedAt
      })
    });

    expect(audit.decision).toBe("verified");
    expect(audit.summary.paths).toBe(24);
    expect(audit.summary.fingerprintedPaths).toBe(24);
    expect(audit.summary.uniquePaths).toBe(2);
    expect(audit.summary.duplicatePathRefs).toBe(22);
    expect(audit.summary.uniqueFingerprintedPaths).toBe(2);
    expect(audit.summary.totalBytes).toBeGreaterThan(audit.summary.uniqueFingerprintBytes);
    expect(audit.summary.uniqueFingerprintBytes).toBe(579);
  });

  it("rejects empty command transcript artifacts", () => {
    const evidence = acceptedEvidenceFixture();
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: (relativePath) => ({
        exists: true,
        bytes: relativePath.endsWith(".log") ? 0 : 10,
        sha256: relativePath.endsWith(".log") ? "0".repeat(64) : "d".repeat(64),
        modifiedAt: evidence.generatedAt
      })
    });

    const transcriptPath = audit.items[0].paths.find((path) => path.kind === "command-transcript");

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.verified).toBe(0);
    expect(audit.summary.missingPaths).toBeGreaterThan(0);
    expect(transcriptPath).toMatchObject({
      status: "missing",
      reason: "Command transcript artifact exists but is empty.",
      bytes: 0,
      sha256: "0".repeat(64)
    });
  });

  it("holds evidence when local artifact paths cannot be checked", () => {
    const evidence = acceptedEvidenceFixture();
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt
    });

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.uncheckedPaths).toBeGreaterThan(0);
  });

  it("blocks unsafe artifact paths", () => {
    const evidence = acceptedEvidenceFixture();
    evidence.items[0].changedFiles = ["../secrets.env"];
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      pathExists: () => true
    });

    expect(audit.decision).toBe("blocked");
    expect(audit.items[0].paths[0].status).toBe("unsafe");
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
  return buildCodingAgentImplementationEvidence({
    receipt,
    generatedAt: receipt.generatedAt
  });
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
