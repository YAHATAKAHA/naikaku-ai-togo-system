import { describe, expect, it } from "vitest";
import { defaultRoles } from "../data/defaultCabinet";
import { completeRole, createCustomRole, isDefaultRoleId } from "./roles";

describe("role helpers", () => {
  it("creates a custom role with a unique id and provider alias", () => {
    const customRole = createCustomRole({ roles: defaultRoles });

    expect(isDefaultRoleId(customRole.id)).toBe(false);
    expect(customRole.id).toBe("custom-minister");
    expect(customRole.provider.apiKeyAlias).toBe("NAIKAKU_CUSTOM_ROLE_API_KEY");
    expect(customRole.enabled).toBe(true);
  });

  it("duplicates a role without reusing id or api alias", () => {
    const duplicate = createCustomRole({
      roles: defaultRoles,
      sourceRole: defaultRoles[2]
    });

    expect(duplicate.id).toBe("execution-minister-copy");
    expect(duplicate.name).toBe("Execution Minister Copy");
    expect(duplicate.provider.apiKeyAlias).toBe("NAIKAKU_OPENROUTER_API_KEY_COPY");
    expect(duplicate.permissions.canUseShell).toBe(true);
  });

  it("completes legacy custom roles with safe defaults", () => {
    const role = completeRole({
      id: "legacy-reviewer",
      name: "Legacy Reviewer"
    });

    expect(role.name).toBe("Legacy Reviewer");
    expect(role.stage).toBe("execution");
    expect(role.provider.provider).toBe("custom");
    expect(role.permissions.requiresApprovalForHighImpact).toBe(true);
  });
});
