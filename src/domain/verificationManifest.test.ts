import { describe, expect, it } from "vitest";
import {
  buildVerificationManifest,
  serializeVerificationManifest
} from "./verificationManifest";
import type {
  CodingAgentReceiptDrillSummary,
  ReleaseVerificationReport
} from "./types";

const inputs = {
  codingAgentReceiptDrill: "output/coding-agent-receipt-drill/summary.json",
  releaseVerification: "output/rehearsal-drill/release-verification-latest.json"
};

describe("verification manifest", () => {
  it("aggregates passing coding-agent and release verification gates", () => {
    const manifest = buildVerificationManifest({
      codingAgentReport: codingAgentReportFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });

    expect(manifest.schema).toBe("naikaku.verification-manifest.v1");
    expect(manifest.decision).toBe("verified");
    expect(manifest.summary).toEqual({
      total: 4,
      passed: 4,
      failed: 0
    });
    expect(manifest.checks.map((check) => check.id)).toEqual([
      "coding-agent-valid-receipt",
      "coding-agent-mismatched-receipt",
      "release-verification",
      "dry-run-boundary"
    ]);
    expect(serializeVerificationManifest(manifest)).toContain("naikaku.verification-manifest.v1");
  });

  it("invalidates the manifest when mismatched coding-agent evidence updates the board", () => {
    const codingAgentReport = codingAgentReportFixture();
    codingAgentReport.mismatched.boardItemsApplied = 1;

    const manifest = buildVerificationManifest({
      codingAgentReport,
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const mismatchCheck = manifest.checks.find((check) => check.id === "coding-agent-mismatched-receipt");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(mismatchCheck?.status).toBe("fail");
    expect(mismatchCheck?.summary).toContain("not blocked correctly");
  });

  it("invalidates the manifest when release verification is not dry-run verified", () => {
    const releaseVerification = releaseVerificationFixture();
    releaseVerification.decision = "not-production-ready";
    releaseVerification.scope = "production";
    releaseVerification.requireProductionEvidence = true;
    releaseVerification.summary = {
      total: 5,
      passed: 4,
      failed: 1
    };
    releaseVerification.checks = releaseVerification.checks.map((check) =>
      check.id === "production-evidence-required"
        ? {
          ...check,
          status: "fail",
          evidence: [
            "Required production evidence: yes",
            "Evidence level: dry-run"
          ]
        }
        : check
    );

    const manifest = buildVerificationManifest({
      codingAgentReport: codingAgentReportFixture(),
      releaseVerification,
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(2);
    expect(manifest.checks.find((check) => check.id === "release-verification")?.status).toBe("fail");
    expect(manifest.checks.find((check) => check.id === "dry-run-boundary")?.status).toBe("fail");
  });
});

function codingAgentReportFixture(): CodingAgentReceiptDrillSummary {
  return {
    schema: "naikaku.coding-agent-receipt-drill.v1",
    generatedAt: "2026-06-27T00:00:00.000Z",
    operatorLocale: "ja",
    outputDir: "output/coding-agent-receipt-drill",
    source: {
      boardItems: 8,
      briefs: 8,
      reviewDecision: "ready",
      bundleDecision: "ready",
      readySessions: 8,
      heldSessions: 0
    },
    valid: {
      receiptDecision: "verified",
      evidenceDecision: "accepted-for-handoff",
      artifactAuditDecision: "verified",
      transcriptContentMismatches: 0,
      boardItemsApplied: 8,
      boardItemsSkipped: 0
    },
    mismatched: {
      receiptDecision: "needs-evidence",
      pendingEvidence: 1,
      evidenceDecision: "needs-evidence",
      artifactAuditDecision: "needs-artifacts",
      boardItemsApplied: 0,
      boardItemsSkipped: 8,
      firstMissingEvidence: "Evidence artifact is required for: Changed files summary."
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local drill.",
      limitations: ["No production runner evidence."],
      productionRequirements: ["Attach production runner evidence."]
    }
  };
}

function releaseVerificationFixture(): ReleaseVerificationReport {
  return {
    schema: "naikaku.release-verification.v1",
    generatedAt: "2026-06-27T00:05:00.000Z",
    sourceRunId: "run-test",
    scope: "dry-run",
    requireProductionEvidence: false,
    decision: "verified",
    checks: [
      {
        id: "rehearsal-schema",
        status: "pass",
        summary: "Release rehearsal report uses the expected schema.",
        evidence: ["Schema: naikaku.release-rehearsal.v1"],
        nextAction: "Use this report as the verification source."
      },
      {
        id: "production-evidence-required",
        status: "pass",
        summary: "Dry-run evidence is accepted for sandbox drill verification only.",
        evidence: [
          "Required production evidence: no",
          "Evidence level: dry-run"
        ],
        nextAction: "Use --require-production before any real release or external handoff."
      }
    ],
    summary: {
      total: 2,
      passed: 2,
      failed: 0
    }
  };
}
