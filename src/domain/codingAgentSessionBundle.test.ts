import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentBriefReview } from "./codingAgentBriefReview";
import {
  buildCodingAgentSessionBundle,
  serializeCodingAgentSessionBundle,
  serializeCodingAgentSessionBundleMarkdown
} from "./codingAgentSessionBundle";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildReleaseVerification } from "./releaseVerification";
import { buildTeamHandoff } from "./teamPackages";
import type { ReleaseRehearsalReport } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent session bundle", () => {
  it("creates ready sessions from reviewed default briefs", () => {
    const briefs = defaultBriefs();
    const review = buildCodingAgentBriefReview({
      briefs,
      generatedAt: briefs.generatedAt
    });
    const bundle = buildCodingAgentSessionBundle({
      briefs,
      review,
      generatedAt: briefs.generatedAt
    });

    expect(bundle.schema).toBe("naikaku.coding-agent-session-bundle.v1");
    expect(bundle.decision).toBe("ready");
    expect(bundle.summary.ready).toBe(briefs.briefs.length);
    expect(bundle.summary.held).toBe(0);
    expect(bundle.sessions.every((session) => session.status === "ready-for-agent")).toBe(true);
    expect(bundle.sessions[0].handoffMarkdown).toContain("Do not perform: unreviewed-git-push");
  });

  it("holds every session when production evidence is required but only dry-run proof exists", () => {
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
    const bundle = buildCodingAgentSessionBundle({
      briefs,
      releaseVerification: verification,
      requireProductionEvidence: true,
      generatedAt: board.generatedAt
    });

    expect(bundle.review.decision).toBe("blocked");
    expect(bundle.decision).toBe("blocked");
    expect(bundle.summary.ready).toBe(0);
    expect(bundle.summary.productionHeld).toBe(briefs.briefs.length);
    expect(bundle.sessions.every((session) => session.status === "held-for-production-evidence")).toBe(true);
    expect(bundle.sessions[0].nextAction).toContain("production evidence");
  });

  it("rebuilds review when a stale dry-run review is reused for production session export", () => {
    const briefs = defaultBriefs();
    const dryRunReview = buildCodingAgentBriefReview({
      briefs,
      generatedAt: briefs.generatedAt
    });
    const bundle = buildCodingAgentSessionBundle({
      briefs,
      review: dryRunReview,
      requireProductionEvidence: true,
      generatedAt: briefs.generatedAt
    });

    expect(dryRunReview.decision).toBe("ready");
    expect(bundle.review.decision).toBe("blocked");
    expect(bundle.decision).toBe("blocked");
    expect(bundle.summary.productionHeld).toBe(briefs.briefs.length);
  });

  it("serializes JSON and Markdown without claiming implementation happened", () => {
    const briefs = defaultBriefs();
    const bundle = buildCodingAgentSessionBundle({ briefs });
    const parsed = JSON.parse(serializeCodingAgentSessionBundle(bundle));
    const markdown = serializeCodingAgentSessionBundleMarkdown(bundle);

    expect(parsed.schema).toBe("naikaku.coding-agent-session-bundle.v1");
    expect(markdown).toContain("This bundle does not execute code");
    expect(markdown).toContain("Held sessions must not be assigned");
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
