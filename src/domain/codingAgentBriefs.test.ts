import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildReleaseVerification } from "./releaseVerification";
import { buildTeamHandoff } from "./teamPackages";
import {
  buildCodingAgentBriefs,
  serializeCodingAgentBriefs,
  serializeCodingAgentBriefsMarkdown
} from "./codingAgentBriefs";
import type { ReleaseRehearsalReport } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent briefs", () => {
  it("turns development board items into sandboxed implementation prompts", () => {
    const handoff = buildTeamHandoff({ workspace });
    const board = buildDevelopmentBoard({ handoff });
    const briefs = buildCodingAgentBriefs({ board, operatorLocale: "ja" });

    expect(briefs.schema).toBe("naikaku.coding-agent-briefs.v1");
    expect(briefs.operatorLocale).toBe("ja");
    expect(briefs.briefs).toHaveLength(board.items.length);
    expect(briefs.summary.total).toBe(board.items.length);
    expect(briefs.summary.implementable).toBeGreaterThan(0);
    expect(briefs.briefs[0].prompt).toContain("sandboxed coding agent");
    expect(briefs.briefs[0].verificationCommands).toContain("npm run test");
    expect(briefs.briefs[0].sandbox.prohibitedActions).toContain("unreviewed-git-push");
  });

  it("requires release verification evidence for critical or release-gated work", () => {
    const handoff = buildTeamHandoff({ workspace });
    const board = buildDevelopmentBoard({ handoff });
    const report = releaseReadyDryRunReport(board.generatedAt);
    const verification = buildReleaseVerification({
      report,
      requireProductionEvidence: true,
      generatedAt: board.generatedAt
    });
    const briefs = buildCodingAgentBriefs({
      board,
      releaseVerification: verification,
      operatorLocale: "en"
    });

    expect(briefs.summary.productionEvidenceRequired).toBe(true);
    expect(briefs.releaseVerificationSchema).toBe("naikaku.release-verification.v1");
    expect(briefs.briefs.every((brief) => brief.releaseGate.required)).toBe(true);
    expect(briefs.briefs.some((brief) => brief.releaseGate.verificationDecision === "not-production-ready")).toBe(true);
  });

  it("serializes reviewable JSON and Markdown prompt packs", () => {
    const handoff = buildTeamHandoff({ workspace });
    const board = buildDevelopmentBoard({ handoff });
    const briefs = buildCodingAgentBriefs({ board });
    const parsed = JSON.parse(serializeCodingAgentBriefs(briefs));
    const markdown = serializeCodingAgentBriefsMarkdown(briefs);

    expect(parsed.schema).toBe("naikaku.coding-agent-briefs.v1");
    expect(markdown).toContain("# Coding Agent Briefs");
    expect(markdown).toContain("```text");
    expect(markdown).toContain("Do not push or deploy");
  });
});

function releaseReadyDryRunReport(generatedAt: string): ReleaseRehearsalReport {
  return {
    schema: "naikaku.release-rehearsal.v1",
    generatedAt,
    mission: workspace.mission,
    runId: "run-test",
    sourceRun: "provided",
    decision: "release-ready",
    score: 100,
    evidenceClaim: {
      level: "dry-run",
      claim: "Dry-run evidence only.",
      limitations: ["No production runner evidence attached."],
      productionRequirements: ["Attach authenticated runner evidence."]
    },
    checks: [],
    remediation: {
      items: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    },
    artifacts: {
      runId: "run-test",
      releaseBundleSchema: "naikaku.product-release-bundle.v1",
      evidenceSchema: "naikaku.executor-evidence.v1",
      bundleBytes: 1,
      notesBytes: 1,
      roles: defaultRoles.length,
      runnerSteps: 1,
      heldActions: 0,
      evidenceItems: 1,
      issueDrafts: 0,
      workspaceFiles: 0
    },
    summary: {
      total: 0,
      passed: 0,
      warnings: 0,
      blockers: 0,
      simulatedRun: false,
      secretLeakDetected: false,
      readyActions: 1,
      heldActions: 0,
      evidenceItems: 1,
      releaseArtifacts: 1
    }
  };
}
