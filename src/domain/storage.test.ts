import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { parseWorkspaceExport, serializeWorkspace } from "./storage";

describe("workspace import/export", () => {
  it("round-trips a workspace export without raw session secrets", () => {
    const exported = serializeWorkspace({
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy,
      mission: defaultMission
    });
    const imported = parseWorkspaceExport(exported);

    expect(imported.roles).toHaveLength(defaultRoles.length);
    expect(imported.sandboxPolicy.killSwitchArmed).toBe(true);
    expect(imported.mission).toBe(defaultMission);
    expect(exported).not.toContain("sessionSecret");
  });

  it("accepts legacy raw workspace JSON", () => {
    const imported = parseWorkspaceExport(
      JSON.stringify({
        mission: "Imported mission",
        roles: [defaultRoles[0]],
        sandboxPolicy: {
          ...defaultSandboxPolicy,
          maxRunMinutes: 30
        }
      })
    );

    expect(imported.roles[0].name).toBe(defaultRoles[0].name);
    expect(imported.roles).toHaveLength(defaultRoles.length);
    expect(imported.sandboxPolicy.maxRunMinutes).toBe(30);
    expect(imported.mission).toBe("Imported mission");
  });
});
