import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { runCabinetMission } from "./orchestrator";
import {
  buildRoleWorkspaceScaffolds,
  serializeRoleWorkspaceScaffolds,
  serializeRoleWorkspaceScaffoldScript
} from "./roleWorkspaceScaffolds";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("role workspace scaffolds", () => {
  it("builds one scaffold per team package with starter files", () => {
    const handoff = buildTeamHandoff({
      workspace,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const scaffolds = buildRoleWorkspaceScaffolds({
      handoff,
      generatedAt: "2026-06-26T00:01:00.000Z"
    });
    const firstScaffold = scaffolds.scaffolds[0];

    expect(scaffolds.schema).toBe("naikaku.role-workspace-scaffolds.v1");
    expect(scaffolds.scaffolds).toHaveLength(handoff.packages.length);
    expect(scaffolds.summary.roles).toBe(handoff.summary.roles);
    expect(scaffolds.summary.files).toBe(handoff.packages.length * 5);
    expect(scaffolds.summary.envFiles).toBe(handoff.packages.length);
    expect(firstScaffold.rootPath).toMatch(/^team-workspaces\//);
    expect(firstScaffold.files.map((file) => file.purpose)).toEqual([
      "readme",
      "env-example",
      "tasks",
      "runner-notes",
      "security"
    ]);
    expect(firstScaffold.files.find((file) => file.path.endsWith(".env.example"))?.content)
      .toContain("NAIKAKU_API_KEY_ALIAS=");
    expect(firstScaffold.files.find((file) => file.path.endsWith("runner-notes.md"))?.content)
      .toContain("Executor profile:");
    expect(firstScaffold.files.find((file) => file.path.endsWith("security.md"))?.content)
      .toContain("## Data Access Policy");
  });

  it("serializes JSON and creation scripts without session secrets", () => {
    const run = runCabinetMission(workspace);
    const handoff = buildTeamHandoff({
      workspace,
      run,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const scaffolds = buildRoleWorkspaceScaffolds({ handoff });
    const json = serializeRoleWorkspaceScaffolds(scaffolds);
    const script = serializeRoleWorkspaceScaffoldScript(scaffolds);

    expect(JSON.parse(json).schema).toBe("naikaku.role-workspace-scaffolds.v1");
    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain("mkdir -p 'team-workspaces/prime-minister'");
    expect(script).toContain("cat > 'team-workspaces/prime-minister/.env.example'");
    expect(script).toContain("NAIKAKU_OPENAI_API_KEY=");
    expect(script).toContain("chmod 0644 'team-workspaces/prime-minister/README.md'");
    expect(script).not.toContain("sessionSecret");
    expect(json).not.toContain("sessionSecret");
  });
});
