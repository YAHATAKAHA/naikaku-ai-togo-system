import { describe, expect, it } from "vitest";
import { defaultRoles } from "../data/defaultCabinet";
import {
  buildProviderReadinessMatrix,
  createProviderReadinessCheck,
  serializeProviderReadinessMatrix
} from "./providerReadiness";

describe("provider readiness", () => {
  it("builds unchecked rows for structurally complete role providers", () => {
    const matrix = buildProviderReadinessMatrix({
      roles: defaultRoles,
      generatedAt: "2026-06-25T00:00:00.000Z"
    });

    expect(matrix.schema).toBe("naikaku.provider-readiness.v1");
    expect(matrix.rows).toHaveLength(defaultRoles.length);
    expect(matrix.summary.unchecked).toBeGreaterThan(0);
    expect(matrix.rows[0].apiKeyAlias).toBe(defaultRoles[0].provider.apiKeyAlias);
  });

  it("detects missing model or endpoint before gateway tests", () => {
    const matrix = buildProviderReadinessMatrix({
      roles: [
        {
          ...defaultRoles[0],
          provider: {
            ...defaultRoles[0].provider,
            model: ""
          }
        }
      ]
    });

    expect(matrix.rows[0].status).toBe("missing-config");
    expect(matrix.summary.missingConfig).toBe(1);
  });

  it("rejects raw-looking API key aliases", () => {
    const matrix = buildProviderReadinessMatrix({
      roles: [
        {
          ...defaultRoles[0],
          provider: {
            ...defaultRoles[0].provider,
            apiKeyAlias: "sk-raw-secret"
          }
        }
      ]
    });

    expect(matrix.rows[0].status).toBe("missing-secret");
    expect(matrix.rows[0].message).toContain("environment variable");
  });

  it("requires an alias before accepting a session-only test secret", () => {
    const matrix = buildProviderReadinessMatrix({
      roles: [
        {
          ...defaultRoles[0],
          provider: {
            ...defaultRoles[0].provider,
            apiKeyAlias: ""
          }
        }
      ],
      sessionSecrets: {
        [defaultRoles[0].id]: "temporary-secret"
      }
    });

    expect(matrix.rows[0].status).toBe("missing-secret");
    expect(matrix.rows[0].secretReady).toBe(false);
    expect(matrix.rows[0].message).toContain("API key alias");
  });

  it("does not mark local/custom aliases ready until a secret is available", () => {
    const localRole = defaultRoles.find((role) => role.provider.provider === "local");
    if (!localRole) {
      throw new Error("Expected a local role.");
    }

    const matrix = buildProviderReadinessMatrix({
      roles: [localRole]
    });

    expect(matrix.rows[0].status).toBe("unchecked");
    expect(matrix.rows[0].secretReady).toBe(false);
  });

  it("preserves a saved readiness result when the provider config is unchanged", () => {
    const matrix = buildProviderReadinessMatrix({ roles: [defaultRoles[0]] });
    const checked = createProviderReadinessCheck({
      row: matrix.rows[0],
      ok: true,
      source: "gateway",
      secretReady: true,
      message: "Resolved alias.",
      checkedAt: "2026-06-25T01:00:00.000Z"
    });
    const next = buildProviderReadinessMatrix({
      roles: [defaultRoles[0]],
      savedRows: [checked]
    });

    expect(next.rows[0].status).toBe("ready");
    expect(next.rows[0].source).toBe("gateway");
    expect(next.rows[0].checkedAt).toBe("2026-06-25T01:00:00.000Z");
  });

  it("keeps a gateway-offline structural check unchecked", () => {
    const matrix = buildProviderReadinessMatrix({ roles: [defaultRoles[0]] });
    const checked = createProviderReadinessCheck({
      row: {
        ...matrix.rows[0],
        status: "ready",
        source: "gateway"
      },
      ok: true,
      secretReady: true,
      source: "local-fallback",
      message: "Local structural check passed."
    });

    expect(checked.status).toBe("unchecked");
    expect(checked.source).toBe("local-fallback");
  });

  it("exports readiness without raw session secrets", () => {
    const exported = serializeProviderReadinessMatrix(
      buildProviderReadinessMatrix({
        roles: [defaultRoles[0]],
        sessionSecrets: {
          [defaultRoles[0].id]: "temporary-secret"
        }
      })
    );
    const parsed = JSON.parse(exported) as { schema: string; rows: unknown[] };

    expect(parsed.schema).toBe("naikaku.provider-readiness.v1");
    expect(parsed.rows).toHaveLength(1);
    expect(exported).not.toContain("temporary-secret");
  });
});
