import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildProviderReadinessMatrix } from "./providerReadiness";
import { buildReleaseRehearsalReport, serializeReleaseRehearsalReport } from "./releaseRehearsal";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("release rehearsal", () => {
  it("runs a local release rehearsal across cabinet, automation, evidence, and release artifacts", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.schema).toBe("naikaku.release-rehearsal.v1");
    expect(report.sourceRun).toBe("simulated");
    expect(report.runId).toMatch(/^run-/);
    expect(report.artifacts.releaseBundleSchema).toBe("naikaku.product-release-bundle.v1");
    expect(report.artifacts.evidenceSchema).toBe("naikaku.executor-evidence.v1");
    expect(report.artifacts.bundleBytes).toBeGreaterThan(1000);
    expect(report.artifacts.notesBytes).toBeGreaterThan(500);
    expect(report.summary.total).toBe(report.checks.length);
    expect(report.summary.evidenceItems).toBeGreaterThan(0);
    expect(report.checks.map((check) => check.id)).toContain("security-redaction");
  });

  it("marks default rehearsal as needs review instead of pretending it is complete", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(report.decision).toBe("needs-review");
    expect(report.summary.warnings).toBeGreaterThan(0);
    expect(report.checks.some((check) => check.status === "warn")).toBe(true);
    expect(report.checks.find((check) => check.id === "provider-readiness")?.status).toBe("warn");
  });

  it("does not serialize raw session secrets in rehearsal output", () => {
    const providerReadiness = buildProviderReadinessMatrix({ roles: workspace.roles });
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness,
      secretProbeValues: ["sk-local-rehearsal-secret"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const serialized = serializeReleaseRehearsalReport(report);

    expect(report.summary.secretLeakDetected).toBe(false);
    expect(serialized).not.toContain("sk-local-rehearsal-secret");
    expect(serialized).not.toContain("sessionSecret");
  });
});
