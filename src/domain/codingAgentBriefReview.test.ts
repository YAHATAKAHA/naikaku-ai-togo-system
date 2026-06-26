import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentBriefReview, serializeCodingAgentBriefReview } from "./codingAgentBriefReview";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildReleaseVerification } from "./releaseVerification";
import { buildTeamHandoff } from "./teamPackages";
import type { CodingAgentBriefs, ReleaseRehearsalReport } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent brief review", () => {
  it("marks complete default coding briefs as ready", () => {
    const briefs = defaultBriefs();
    const review = buildCodingAgentBriefReview({
      briefs,
      generatedAt: briefs.generatedAt
    });

    expect(review.schema).toBe("naikaku.coding-agent-brief-review.v1");
    expect(review.decision).toBe("ready");
    expect(review.summary.blockers).toBe(0);
    expect(review.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("blocks briefs that omit required prohibited actions", () => {
    const briefs = defaultBriefs();
    const unsafeBriefs: CodingAgentBriefs = {
      ...briefs,
      briefs: briefs.briefs.map((brief, index) => index === 0
        ? {
            ...brief,
            sandbox: {
              ...brief.sandbox,
              prohibitedActions: brief.sandbox.prohibitedActions.filter((action) => action !== "unreviewed-git-push")
            }
          }
        : brief)
    };
    const review = buildCodingAgentBriefReview({ briefs: unsafeBriefs });

    expect(review.decision).toBe("blocked");
    expect(review.checks.find((check) => check.id === "coding-brief-sandbox-boundary")?.status).toBe("block");
  });

  it("blocks production handoff when attached verification is still dry-run", () => {
    const handoff = buildTeamHandoff({ workspace });
    const board = buildDevelopmentBoard({ handoff });
    const verification = buildReleaseVerification({
      report: releaseReadyDryRunReport(board.generatedAt),
      requireProductionEvidence: true,
      generatedAt: board.generatedAt
    });
    const briefs = buildCodingAgentBriefs({
      board,
      releaseVerification: verification,
      generatedAt: board.generatedAt
    });
    const review = buildCodingAgentBriefReview({
      briefs,
      releaseVerification: verification,
      requireProductionEvidence: true,
      generatedAt: board.generatedAt
    });

    expect(verification.decision).toBe("not-production-ready");
    expect(review.decision).toBe("blocked");
    expect(review.checks.find((check) => check.id === "coding-brief-release-gate-truthfulness")?.status).toBe("block");
  });

  it("serializes review JSON for export", () => {
    const briefs = defaultBriefs();
    const parsed = JSON.parse(serializeCodingAgentBriefReview(buildCodingAgentBriefReview({ briefs })));

    expect(parsed.schema).toBe("naikaku.coding-agent-brief-review.v1");
    expect(parsed.summary.briefs).toBe(briefs.briefs.length);
  });
});

function defaultBriefs() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  return buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
}

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
