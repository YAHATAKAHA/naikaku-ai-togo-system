import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy, executorProfiles } from "../data/defaultCabinet";
import { buildAutomationRunbook } from "./automationRunbook";
import { createAuditEvent } from "./auditLog";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildDevelopmentIssueDrafts } from "./developmentIssues";
import { runCabinetMission } from "./orchestrator";
import { buildProductReadinessReport, serializeProductReadinessReport } from "./productReadiness";
import { buildProviderReadinessMatrix, createProviderReadinessCheck } from "./providerReadiness";
import { buildRoleWorkspaceScaffolds } from "./roleWorkspaceScaffolds";
import { buildSandboxCapabilityRegistry } from "./sandboxCapabilities";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("product readiness report", () => {
  it("blocks delivery until a cabinet run exists", () => {
    const providerReadiness = buildProviderReadinessMatrix({
      roles: workspace.roles,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const sandboxCapabilities = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: workspace.roles,
      sandboxPolicy: workspace.sandboxPolicy,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const teamHandoff = buildTeamHandoff({
      workspace,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const roleWorkspaces = buildRoleWorkspaceScaffolds({ handoff: teamHandoff });
    const developmentBoard = buildDevelopmentBoard({ handoff: teamHandoff });
    const issueDrafts = buildDevelopmentIssueDrafts({ board: developmentBoard });
    const report = buildProductReadinessReport({
      workspace,
      providerReadiness,
      sandboxCapabilities,
      teamHandoff,
      roleWorkspaces,
      developmentBoard,
      issueDrafts,
      generatedAt: "2026-06-26T00:01:00.000Z"
    });

    expect(report.schema).toBe("naikaku.product-readiness.v1");
    expect(report.decision).toBe("blocked");
    expect(report.summary.blockers).toBeGreaterThan(0);
    expect(report.gates.find((gate) => gate.id === "cabinet-run")?.status).toBe("block");
    expect(report.gates.find((gate) => gate.id === "role-data-access")?.status).toBe("pass");
    expect(serializeProductReadinessReport(report)).not.toContain("sessionSecret");
  });

  it("reports a reviewable product state from generated workbench artifacts", () => {
    const run = runCabinetMission(workspace);
    const staticProviderReadiness = buildProviderReadinessMatrix({
      roles: workspace.roles,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const providerReadiness = {
      ...staticProviderReadiness,
      rows: staticProviderReadiness.rows.map((row) =>
        createProviderReadinessCheck({
          row,
          ok: true,
          secretReady: true,
          source: "gateway",
          message: "ready",
          checkedAt: "2026-06-26T00:00:00.000Z"
        })
      )
    };
    providerReadiness.summary = {
      roles: providerReadiness.rows.length,
      ready: providerReadiness.rows.length,
      unchecked: 0,
      missingConfig: 0,
      missingSecret: 0,
      failed: 0,
      enabled: providerReadiness.rows.filter((row) => row.enabled).length
    };
    const sandboxCapabilities = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: workspace.roles,
      sandboxPolicy: workspace.sandboxPolicy,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const automationRunbook = buildAutomationRunbook({
      run,
      approvalRecords: [],
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const teamHandoff = buildTeamHandoff({
      workspace,
      run,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const roleWorkspaces = buildRoleWorkspaceScaffolds({ handoff: teamHandoff });
    const developmentBoard = buildDevelopmentBoard({ handoff: teamHandoff, run });
    const issueDrafts = buildDevelopmentIssueDrafts({ board: developmentBoard });
    const report = buildProductReadinessReport({
      workspace,
      run,
      providerReadiness,
      sandboxCapabilities,
      automationRunbook,
      teamHandoff,
      roleWorkspaces,
      developmentBoard,
      issueDrafts,
      auditEvents: [
        createAuditEvent({
          type: "cabinet.run.completed",
          summary: "Run completed.",
          runId: run.id
        })
      ],
      generatedAt: "2026-06-26T00:01:00.000Z"
    });

    expect(report.decision).toBe("needs-review");
    expect(report.score).toBeGreaterThan(0);
    expect(report.gates.find((gate) => gate.id === "role-api-configured")?.status).toBe("pass");
    expect(report.gates.find((gate) => gate.id === "role-data-access")?.status).toBe("pass");
    expect(report.gates.find((gate) => gate.id === "role-workspaces")?.status).toBe("pass");
    expect(report.gates.find((gate) => gate.id === "memory-review")?.status).toBe("warn");
    expect(report.summary.categories).toContain("automation");
    expect(report.summary.categories).toContain("data-governance");
  });
});
