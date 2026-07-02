import { describe, expect, it } from "vitest";
import { defaultRoles } from "../data/defaultCabinet";
import {
  buildRoleDataAccessMatrix,
  completeRoleDataAccessPolicy,
  evaluateRoleDataAccess,
  serializeRoleDataAccessMatrix
} from "./dataAccessPolicy";

describe("role data access policy", () => {
  it("blocks planning roles from restricted data by default", () => {
    const strategy = defaultRoles.find((role) => role.id === "strategy-minister");
    if (!strategy) {
      throw new Error("Expected strategy role.");
    }

    const decision = evaluateRoleDataAccess({
      role: strategy,
      requestedClassifications: ["secret", "customer-data"],
      generatedAt: "2026-07-02T00:00:00.000Z"
    });

    expect(decision.decision).toBe("blocked");
    expect(decision.deniedClassifications).toEqual(["secret", "customer-data"]);
  });

  it("allows safety review of restricted data only through redaction or a local gate", () => {
    const safetyAuditor = defaultRoles.find((role) => role.id === "safety-auditor");
    if (!safetyAuditor) {
      throw new Error("Expected safety auditor role.");
    }

    const decision = evaluateRoleDataAccess({
      role: safetyAuditor,
      requestedClassifications: ["secret", "personal-data"],
      generatedAt: "2026-07-02T00:00:00.000Z"
    });

    expect(decision.decision).toBe("redact");
    expect(decision.allowedClassifications).toEqual(["secret", "personal-data"]);
    expect(decision.requiredRedactions).toEqual(["secret", "personal-data"]);
  });

  it("builds an auditable matrix for role-level data boundaries", () => {
    const matrix = buildRoleDataAccessMatrix({
      roles: defaultRoles,
      requestedClassifications: ["secret", "customer-data"],
      generatedAt: "2026-07-02T00:00:00.000Z"
    });

    expect(matrix.schema).toBe("naikaku.role-data-access-matrix.v1");
    expect(matrix.rows).toHaveLength(defaultRoles.length);
    expect(matrix.summary.blocked).toBeGreaterThan(0);
    expect(matrix.summary.redact).toBe(1);
    expect(serializeRoleDataAccessMatrix(matrix)).not.toContain("sessionSecret");
  });

  it("completes legacy policies with safe defaults", () => {
    const policy = completeRoleDataAccessPolicy({
      allowedClassifications: ["public", "internal", "secret"]
    });

    expect(policy.allowedClassifications).toEqual(["public", "internal", "secret"]);
    expect(policy.deniedClassifications).toEqual(["confidential", "personal-data", "customer-data"]);
    expect(policy.localOnlyClassifications).toEqual(["secret", "personal-data", "customer-data"]);
  });

  it("keeps local-only markers for denied restricted classifications", () => {
    const policy = completeRoleDataAccessPolicy({
      allowedClassifications: ["public", "internal"],
      deniedClassifications: ["secret", "personal-data", "customer-data"],
      localOnlyClassifications: ["secret", "personal-data", "customer-data"]
    });

    expect(policy.localOnlyClassifications).toEqual(["secret", "personal-data", "customer-data"]);
  });
});
