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
    expect(audit.summary.evidenceArtifactRefs).toBe(evidence.items.flatMap((item) => item.evidence).length);
    expect(audit.summary.evidenceArtifactPaths).toBe(audit.summary.evidenceArtifactRefs);
    expect(audit.summary.reusedEvidenceArtifactPaths).toBe(0);
    expect(audit.summary.reusedEvidenceArtifactRefs).toBe(0);
    expect(audit.summary.reusedTranscriptPaths).toBe(0);
    expect(audit.summary.reusedTranscriptRefs).toBe(0);
    expect(audit.summary.reusedChangedFilePaths).toBe(0);
    expect(audit.summary.reusedChangedFileRefs).toBe(0);
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
    expect(audit.summary.transcriptContentChecked).toBe(0);
    expect(audit.summary.transcriptContentMismatches).toBe(0);
  });

  it("verifies transcript content when command and exit code markers are present", () => {
    const evidence = acceptedEvidenceFixture();
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: (relativePath) => ({
        exists: true,
        bytes: relativePath.length,
        sha256: "e".repeat(64),
        modifiedAt: evidence.generatedAt,
        text: relativePath.endsWith(".log") ? transcriptTextFor(relativePath, 0) : undefined
      })
    });

    const transcriptPath = audit.items[0].paths.find((path) => path.kind === "command-transcript");

    expect(audit.decision).toBe("verified");
    expect(audit.summary.transcriptContentChecked).toBe(16);
    expect(audit.summary.transcriptContentMismatches).toBe(0);
    expect(transcriptPath).toMatchObject({
      transcriptCommandMatched: true,
      transcriptExitCodeMatched: true
    });
  });

  it("rejects transcripts that do not mention the expected command", () => {
    const evidence = acceptedEvidenceFixture();
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: (relativePath) => ({
        exists: true,
        bytes: relativePath.length,
        sha256: "f".repeat(64),
        modifiedAt: evidence.generatedAt,
        text: relativePath.endsWith(".log") ? "command=npm run lint\nexitCode=0\nresult=passed" : undefined
      })
    });

    const transcriptPath = audit.items[0].paths.find((path) => path.kind === "command-transcript");

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.transcriptContentChecked).toBe(16);
    expect(audit.summary.transcriptContentMismatches).toBe(16);
    expect(transcriptPath).toMatchObject({
      status: "missing",
      reason: "Command transcript does not mention the expected command.",
      transcriptCommandMatched: false,
      transcriptExitCodeMatched: true
    });
  });

  it("rejects transcripts that do not mention the expected exit code", () => {
    const evidence = acceptedEvidenceFixture();
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      artifactProbe: (relativePath) => ({
        exists: true,
        bytes: relativePath.length,
        sha256: "f".repeat(64),
        modifiedAt: evidence.generatedAt,
        text: relativePath.endsWith(".log") ? transcriptTextFor(relativePath, 1) : undefined
      })
    });

    const transcriptPath = audit.items[0].paths.find((path) => path.kind === "command-transcript");

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.transcriptContentChecked).toBe(16);
    expect(audit.summary.transcriptContentMismatches).toBe(16);
    expect(transcriptPath).toMatchObject({
      status: "missing",
      reason: "Command transcript does not mention the expected exit code.",
      transcriptCommandMatched: true,
      transcriptExitCodeMatched: false
    });
  });

  it("holds shared changed files for manual review even when transcripts are unique", () => {
    const evidence = acceptedEvidenceFixture();
    evidence.items.forEach((item) => {
      item.changedFiles = ["src/shared-artifact.ts"];
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

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.paths).toBe(56);
    expect(audit.summary.uniquePaths).toBe(49);
    expect(audit.summary.duplicatePathRefs).toBe(7);
    expect(audit.summary.evidenceArtifactRefs).toBe(32);
    expect(audit.summary.evidenceArtifactPaths).toBe(32);
    expect(audit.summary.reusedEvidenceArtifactPaths).toBe(0);
    expect(audit.summary.reusedEvidenceArtifactRefs).toBe(0);
    expect(audit.summary.reusedTranscriptPaths).toBe(0);
    expect(audit.summary.reusedTranscriptRefs).toBe(0);
    expect(audit.summary.reusedChangedFilePaths).toBe(1);
    expect(audit.summary.reusedChangedFileRefs).toBe(7);
    expect(audit.items[0].missing.join(" ")).toContain("Changed file reference is reused by 8 sessions");
  });

  it("rejects reused transcript references across command results", () => {
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

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.paths).toBe(56);
    expect(audit.summary.fingerprintedPaths).toBe(56);
    expect(audit.summary.uniquePaths).toBe(34);
    expect(audit.summary.duplicatePathRefs).toBe(22);
    expect(audit.summary.uniqueFingerprintedPaths).toBe(34);
    expect(audit.summary.totalBytes).toBeGreaterThan(audit.summary.uniqueFingerprintBytes);
    expect(audit.summary.uniqueFingerprintBytes).toBe(4515);
    expect(audit.summary.evidenceArtifactRefs).toBe(32);
    expect(audit.summary.evidenceArtifactPaths).toBe(32);
    expect(audit.summary.reusedEvidenceArtifactPaths).toBe(0);
    expect(audit.summary.reusedEvidenceArtifactRefs).toBe(0);
    expect(audit.summary.reusedTranscriptPaths).toBe(1);
    expect(audit.summary.reusedTranscriptRefs).toBe(15);
    expect(audit.items[0].missing.join(" ")).toContain("Transcript reference is reused by 16 command results");
  });

  it("holds reused evidence artifact references for manual review", () => {
    const evidence = acceptedEvidenceFixture();
    evidence.items.forEach((item) => {
      item.evidence = item.evidence.map((entry, index) => {
        const label = entry.split(":")[0];
        return `${label}: output/coding-agent/shared-evidence-${index + 1}.txt`;
      });
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

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.summary.paths).toBe(56);
    expect(audit.summary.uniquePaths).toBe(28);
    expect(audit.summary.duplicatePathRefs).toBe(28);
    expect(audit.summary.evidenceArtifactRefs).toBe(32);
    expect(audit.summary.evidenceArtifactPaths).toBe(4);
    expect(audit.summary.reusedEvidenceArtifactPaths).toBe(4);
    expect(audit.summary.reusedEvidenceArtifactRefs).toBe(28);
    expect(audit.summary.reusedTranscriptRefs).toBe(0);
    expect(audit.summary.reusedChangedFileRefs).toBe(0);
    expect(audit.items[0].missing.join(" ")).toContain("Evidence artifact reference is reused by 8 evidence items");
  });

  it("rejects evidence claims that are not local artifact references", () => {
    const evidence = acceptedEvidenceFixture();
    evidence.items[0].evidence = ["Browser screenshot evidence: attached"];

    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      pathExists: () => true
    });

    const evidencePath = audit.items[0].paths.find((path) => path.kind === "evidence-artifact");

    expect(audit.decision).toBe("needs-artifacts");
    expect(audit.items[0].missing.join(" ")).toContain("Evidence artifact must include a local artifact path");
    expect(evidencePath).toMatchObject({
      status: "missing",
      reason: "Evidence artifact entry did not include a path-like local artifact reference."
    });
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

  it("blocks unsafe evidence artifact paths", () => {
    const evidence = acceptedEvidenceFixture();
    evidence.items[0].evidence = ["screenshot: ../private-frame.png"];
    const audit = auditCodingAgentImplementationArtifacts({
      evidence,
      generatedAt: evidence.generatedAt,
      pathExists: () => true
    });

    const evidencePath = audit.items[0].paths.find((path) => path.kind === "evidence-artifact");

    expect(audit.decision).toBe("blocked");
    expect(evidencePath).toMatchObject({
      kind: "evidence-artifact",
      path: "../private-frame.png",
      status: "unsafe"
    });
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
      const evidencePrefix = session.sandboxContract.evidenceArtifactPrefix;
      return {
        ...item,
        changedFiles: [`src/${session.id}.ts`],
        commandResults: session.verificationCommands.map((command) => ({
          command,
          exitCode: 0,
          outputSummary: `${command} passed in sandbox workspace.`,
          transcriptRef: `${evidencePrefix}${slug(command)}.log`
        })),
        evidence: session.evidenceRequired.map((evidence, index) =>
          `${evidence}: ${evidencePrefix}evidence-${index + 1}.txt`
        ),
        risks: ["No known remaining risks after local verification."]
      };
    })
  };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function transcriptTextFor(relativePath: string, exitCode: number) {
  const command = relativePath.includes("npm-run-test") ? "npm run test" : "npm run build";
  return `command=${command}\nexitCode=${exitCode}\nresult=passed`;
}
