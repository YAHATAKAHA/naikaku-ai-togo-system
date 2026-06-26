import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { createApprovalRecord } from "./automation";
import { createAuditEvent } from "./auditLog";
import { buildMemoryCandidates, createMemoryDecision } from "./memory";
import { runCabinetMission } from "./orchestrator";
import { buildProviderReadinessMatrix, createProviderReadinessCheck } from "./providerReadiness";
import {
  buildReleaseRehearsalReport,
  serializeReleaseRehearsalReport,
  serializeReleaseRemediationMarkdown
} from "./releaseRehearsal";
import type { CabinetRole } from "./types";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("release rehearsal", () => {
  it("runs a local release rehearsal across cabinet, automation, evidence, and release artifacts", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.schema).toBe("naikaku.release-rehearsal.v1");
    expect(report.sourceRun).toBe("simulated");
    expect(report.runId).toMatch(/^run-/);
    expect(report.artifacts.releaseBundleSchema).toBe("naikaku.product-release-bundle.v1");
    expect(report.artifacts.evidenceSchema).toBe("naikaku.executor-evidence.v1");
    expect(report.artifacts.bundleBytes).toBeGreaterThan(1000);
    expect(report.artifacts.notesBytes).toBeGreaterThan(500);
    expect(report.evidenceClaim.level).toBe("dry-run");
    expect(report.evidenceClaim.claim).toContain("Dry-run release gate evidence");
    expect(report.evidenceClaim.limitations.some((item) => item.includes("not actually executed"))).toBe(true);
    expect(report.evidenceClaim.productionRequirements.length).toBeGreaterThan(0);
    expect(report.summary.total).toBe(report.checks.length);
    expect(report.summary.evidenceItems).toBeGreaterThan(0);
    expect(report.remediation.summary.total).toBe(report.summary.warnings + report.summary.blockers);
    expect(report.remediation.items.map((item) => item.sourceCheckId)).toContain("provider-readiness");
    expect(report.checks.map((check) => check.id)).toContain("security-redaction");
  });

  it("marks default rehearsal as needs review instead of pretending it is complete", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.decision).toBe("needs-review");
    expect(report.summary.warnings).toBeGreaterThan(0);
    expect(report.checks.some((check) => check.status === "warn")).toBe(true);
    expect(report.checks.find((check) => check.id === "provider-readiness")?.status).toBe("warn");
    expect(report.remediation.items.some((item) => item.priority === "high")).toBe(true);
  });

  it("does not serialize raw session secrets in rehearsal output", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness,
      secretProbeValues: ["sk-local-rehearsal-secret"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const serialized = serializeReleaseRehearsalReport(report);
    const markdown = serializeReleaseRemediationMarkdown(report);

    expect(report.summary.secretLeakDetected).toBe(false);
    expect(serialized).not.toContain("sk-local-rehearsal-secret");
    expect(serialized).not.toContain("sessionSecret");
    expect(markdown).toContain("# Naikaku Release Remediation Plan");
    expect(markdown).toContain("## Evidence Claim");
    expect(markdown).toContain("Evidence claim: dry-run");
    expect(markdown).not.toContain("sk-local-rehearsal-secret");
    expect(markdown).not.toContain("sessionSecret");
  });

  it("can pass strict rehearsal when reviewed release-drill evidence is provided", () => {
    const reviewedWorkspace = {
      ...workspace,
      roles: workspace.roles.map((role) => releaseDrillRole(role))
    };
    const run = runCabinetMission(reviewedWorkspace);
    const baseReadiness = buildProviderReadinessMatrix({
      roles: reviewedWorkspace.roles,
      sessionSecrets: Object.fromEntries(reviewedWorkspace.roles.map((role) => [role.id, `secret-${role.id}`])),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const providerReadiness = buildProviderReadinessMatrix({
      roles: reviewedWorkspace.roles,
      savedRows: baseReadiness.rows.map((row) =>
        createProviderReadinessCheck({
          row,
          ok: true,
          secretReady: true,
          source: "local-fallback",
          checkedAt: "2026-06-27T00:00:00.000Z",
          message: "Reviewed drill provider alias is ready."
        })
      ),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const approvalRecords = (run.automationActions || [])
      .filter((action) => action.status === "needs-approval")
      .map((action) =>
        createApprovalRecord({
          action,
          decision: "approved",
          decidedAt: "2026-06-27T00:00:00.000Z",
          decidedBy: "release-drill-operator"
        })
      );
    const auditEvents = [
      createAuditEvent({
        type: "cabinet.run.completed",
        summary: "Reviewed release drill completed.",
        severity: "success",
        timestamp: "2026-06-27T00:00:00.000Z",
        runId: run.id
      })
    ];
    const memoryEntries = buildMemoryCandidates({
      run,
      createdAt: "2026-06-27T00:00:00.000Z"
    })
      .filter((entry) => entry.kind !== "risk")
      .map((entry) =>
        createMemoryDecision({
          entry,
          decision: "accepted",
          decidedAt: "2026-06-27T00:00:00.000Z"
        })
      );
    const report = buildReleaseRehearsalReport({
      workspace: reviewedWorkspace,
      providerReadiness,
      run,
      approvalRecords,
      auditEvents,
      memoryEntries,
      secretProbeValues: ["strict-drill-secret"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.decision).toBe("release-ready");
    expect(report.score).toBe(100);
    expect(report.evidenceClaim.level).toBe("dry-run");
    expect(report.evidenceClaim.limitations[0]).toContain("dry-run simulator");
    expect(report.summary.warnings).toBe(0);
    expect(report.summary.blockers).toBe(0);
    expect(report.summary.heldActions).toBe(0);
    expect(report.remediation.summary.total).toBe(0);
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
    expect(serializeReleaseRehearsalReport(report)).not.toContain("strict-drill-secret");
  });
});

function releaseDrillRole(role: CabinetRole): CabinetRole {
  if (role.id === "critic") {
    return {
      ...role,
      permissions: {
        ...role.permissions,
        canUseBrowser: true,
        canSendNetworkRequests: true
      }
    };
  }

  if (role.id === "scoring-office") {
    return {
      ...role,
      permissions: {
        ...role.permissions,
        canUseFiles: true
      }
    };
  }

  return role;
}
