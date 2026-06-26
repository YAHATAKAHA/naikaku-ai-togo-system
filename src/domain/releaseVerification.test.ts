import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { createApprovalRecord } from "./automation";
import { createAuditEvent } from "./auditLog";
import { buildMemoryCandidates, createMemoryDecision } from "./memory";
import { runCabinetMission } from "./orchestrator";
import { buildProviderReadinessMatrix, createProviderReadinessCheck } from "./providerReadiness";
import { buildReleaseRehearsalReport } from "./releaseRehearsal";
import {
  buildReleaseVerification,
  serializeReleaseVerification
} from "./releaseVerification";
import type { CabinetRole, ReleaseRehearsalReport } from "./types";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("release verification", () => {
  it("verifies a reviewed dry-run drill report for dry-run scope", () => {
    const report = buildReviewedDrillReport();
    const verification = buildReleaseVerification({
      report,
      generatedAt: "2026-06-27T00:01:00.000Z"
    });

    expect(verification.schema).toBe("naikaku.release-verification.v1");
    expect(verification.decision).toBe("verified");
    expect(verification.scope).toBe("dry-run");
    expect(verification.summary.failed).toBe(0);
    expect(verification.checks.find((check) => check.id === "production-evidence-required")?.status).toBe("pass");
    expect(serializeReleaseVerification(verification)).toContain("naikaku.release-verification.v1");
  });

  it("blocks production verification when only dry-run evidence exists", () => {
    const report = buildReviewedDrillReport();
    const verification = buildReleaseVerification({
      report,
      requireProductionEvidence: true,
      generatedAt: "2026-06-27T00:01:00.000Z"
    });

    expect(verification.decision).toBe("not-production-ready");
    expect(verification.scope).toBe("production");
    expect(verification.summary.failed).toBe(1);
    expect(verification.checks.find((check) => check.id === "production-evidence-required")?.status).toBe("fail");
  });

  it("rejects a rehearsal report that still has warnings", () => {
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness: buildProviderReadinessMatrix({ roles: workspace.roles }),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const verification = buildReleaseVerification({
      report,
      generatedAt: "2026-06-27T00:01:00.000Z"
    });

    expect(report.decision).toBe("needs-review");
    expect(verification.decision).toBe("invalid");
    expect(verification.checks.find((check) => check.id === "rehearsal-gates-clear")?.status).toBe("fail");
  });
});

function buildReviewedDrillReport(): ReleaseRehearsalReport {
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

  return buildReleaseRehearsalReport({
    workspace: reviewedWorkspace,
    providerReadiness,
    run,
    approvalRecords,
    auditEvents,
    memoryEntries,
    secretProbeValues: ["strict-drill-secret"],
    generatedAt: "2026-06-27T00:00:00.000Z"
  });
}

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
