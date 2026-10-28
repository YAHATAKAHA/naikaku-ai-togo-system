import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GatewayConnectionError,
  gatewayBaseUrl,
  getEngineeringRunnerReadinessViaGateway,
  isGatewayConnectionError,
} from "./gatewayClient";

describe("gateway client runtime configuration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses runtime gateway configuration before build-time defaults", () => {
    vi.stubGlobal("window", {
      NAIKAKU_CONFIG: {
        gatewayUrl: "https://gateway.example.test/"
      }
    });

    expect(gatewayBaseUrl()).toBe("https://gateway.example.test");
  });

  it("falls back to the local gateway when runtime config is absent", () => {
    vi.stubGlobal("window", {});

    expect(gatewayBaseUrl()).toBe("http://127.0.0.1:8787");
  });

  it("turns an unreachable local runner gateway into an actionable connection error", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await getEngineeringRunnerReadinessViaGateway().catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(GatewayConnectionError);
    expect(isGatewayConnectionError(error)).toBe(true);
    expect(error).toMatchObject({ gatewayUrl: "http://127.0.0.1:8787" });
  });
});
