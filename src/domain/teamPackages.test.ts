import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { runCabinetMission } from "./orchestrator";
import { buildTeamHandoff, serializeTeamHandoff } from "./teamPackages";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("team work packages", () => {
  it("creates one package per enabled role with safe provider handoff data", () => {
    const handoff = buildTeamHandoff({
      workspace,
      generatedAt: "2026-06-24T00:00:00.000Z"
    });
    const exported = serializeTeamHandoff(handoff);

    expect(handoff.schema).toBe("naikaku.team-handoff.v1");
    expect(handoff.packages).toHaveLength(defaultRoles.filter((role) => role.enabled).length);
    expect(handoff.summary.templates).toBe(handoff.packages.length);
    expect(handoff.packages.every((workPackage) => workPackage.provider.apiKeyAlias)).toBe(true);
    expect(handoff.packages.every((workPackage) => workPackage.dataAccess.allowedClassifications.length > 0))
      .toBe(true);
    expect(handoff.packages[0].securityNotes.some((note) => note.startsWith("Data access:"))).toBe(true);
    expect(exported).not.toContain("sessionSecret");
  });

  it("adds run status, automation ids, and team dependencies", () => {
    const run = runCabinetMission(workspace);
    const handoff = buildTeamHandoff({
      workspace,
      run,
      generatedAt: "2026-06-24T00:00:00.000Z"
    });
    const executionPackage = handoff.packages.find(
      (workPackage) => workPackage.roleId === "execution-minister"
    );
    const criticPackage = handoff.packages.find((workPackage) => workPackage.roleId === "critic");

    expect(handoff.runId).toBe(run.id);
    expect(handoff.summary.needsApproval).toBeGreaterThan(0);
    expect(handoff.summary.blocked).toBeGreaterThan(0);
    expect(executionPackage?.status).toBe("needs-approval");
    expect(executionPackage?.automationActionIds.length).toBeGreaterThan(0);
    expect(executionPackage?.dependencies).toContain("Prime Minister (Mission Control)");
    expect(criticPackage?.status).toBe("blocked");
    expect(criticPackage?.acceptanceCriteria.some((criterion) => criterion.includes("Blocked actions"))).toBe(true);
  });
});
