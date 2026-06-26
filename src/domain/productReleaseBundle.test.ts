import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy, executorProfiles } from "../data/defaultCabinet";
import { buildAutomationRunbook } from "./automationRunbook";
import { createAuditEvent } from "./auditLog";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildDevelopmentIssueDrafts } from "./developmentIssues";
import { runCabinetMission } from "./orchestrator";
import { buildProductReadinessReport } from "./productReadiness";
import { buildProductReleaseBundle, serializeProductReleaseBundle } from "./productReleaseBundle";
import { buildProviderReadinessMatrix } from "./providerReadiness";
import { buildRoleWorkspaceScaffolds } from "./roleWorkspaceScaffolds";
import { buildSandboxCapabilityRegistry } from "./sandboxCapabilities";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("product release bundle", () => {
  it("collects release artifacts into a single manifest", () => {
    const run = runCabinetMission(workspace);
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const sandboxCapabilities = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: workspace.roles,
      sandboxPolicy: workspace.sandboxPolicy
    });
    const automationRunbook = buildAutomationRunbook({ run, approvalRecords: [] });
    const teamHandoff = buildTeamHandoff({ workspace, run });
    const roleWorkspaces = buildRoleWorkspaceScaffolds({ handoff: teamHandoff });
    const developmentBoard = buildDevelopmentBoard({ handoff: teamHandoff, run });
    const issueDrafts = buildDevelopmentIssueDrafts({ board: developmentBoard });
    const productReadiness = buildProductReadinessReport({
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
      ]
    });
    const bundle = buildProductReleaseBundle({
      workspace,
      run,
      providerReadiness,
      productReadiness,
      automationRunbook,
      teamHandoff,
      roleWorkspaces,
      developmentBoard,
      issueDrafts,
      auditEvents: [
        createAuditEvent({
          type: "product.readiness.exported",
          summary: "Readiness exported.",
          runId: run.id
        })
      ],
      generatedAt: "2026-06-26T00:00:00.000Z"
    });

    expect(bundle.schema).toBe("naikaku.product-release-bundle.v1");
    expect(bundle.runId).toBe(run.id);
    expect(bundle.readiness.decision).toBe(productReadiness.decision);
    expect(bundle.summary.roles).toBe(defaultRoles.filter((role) => role.enabled).length);
    expect(bundle.summary.issueDrafts).toBe(issueDrafts.summary.total);
    expect(bundle.manifest.items.map((item) => item.id)).toContain("product-readiness");
    expect(bundle.manifest.items.map((item) => item.id)).toContain("role-workspaces");
    expect(bundle.manifest.operatorCommands).toContain("npm run build");
    expect(serializeProductReleaseBundle(bundle)).not.toContain("sessionSecret");
  });

  it("marks missing run and automation artifacts for review", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const sandboxCapabilities = buildSandboxCapabilityRegistry({
      profiles: executorProfiles,
      roles: workspace.roles,
      sandboxPolicy: workspace.sandboxPolicy
    });
    const teamHandoff = buildTeamHandoff({ workspace });
    const roleWorkspaces = buildRoleWorkspaceScaffolds({ handoff: teamHandoff });
    const developmentBoard = buildDevelopmentBoard({ handoff: teamHandoff });
    const issueDrafts = buildDevelopmentIssueDrafts({ board: developmentBoard });
    const productReadiness = buildProductReadinessReport({
      workspace,
      providerReadiness,
      sandboxCapabilities,
      teamHandoff,
      roleWorkspaces,
      developmentBoard,
      issueDrafts
    });
    const bundle = buildProductReleaseBundle({
      workspace,
      providerReadiness,
      productReadiness,
      teamHandoff,
      roleWorkspaces,
      developmentBoard,
      issueDrafts
    });

    expect(bundle.readiness.decision).toBe("blocked");
    expect(bundle.summary.missing).toBeGreaterThan(0);
    expect(bundle.manifest.items.find((item) => item.id === "run")?.status).toBe("missing");
    expect(bundle.manifest.items.find((item) => item.id === "automation-runbook")?.status).toBe("missing");
  });
});
