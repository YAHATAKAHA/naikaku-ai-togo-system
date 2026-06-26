import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { serializeDevelopmentIssueDrafts, serializeDevelopmentIssueGhScript } from "./developmentIssues";
import { buildProviderReadinessMatrix } from "./providerReadiness";
import { buildReleaseRehearsalReport } from "./releaseRehearsal";
import { buildReleaseRemediationIssueDrafts } from "./releaseRemediationIssues";

const workspace = {
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy,
  mission: defaultMission
};

describe("release remediation issue drafts", () => {
  it("turns remediation items into GitHub-ready issue drafts", () => {
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness: buildProviderReadinessMatrix({ roles: workspace.roles }),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const drafts = buildReleaseRemediationIssueDrafts({
      report,
      generatedAt: "2026-06-27T00:01:00.000Z"
    });

    expect(drafts.schema).toBe("naikaku.github-issue-drafts.v1");
    expect(drafts.summary.total).toBe(report.remediation.summary.total);
    expect(drafts.summary.highPriority).toBe(report.remediation.summary.high + report.remediation.summary.critical);
    expect(drafts.summary.labels).toContain("source:release-remediation");
    expect(drafts.drafts.every((draft) => draft.title.startsWith("[Release]"))).toBe(true);
    expect(drafts.drafts.every((draft) => draft.body.includes("## Verification"))).toBe(true);
    expect(drafts.drafts.every((draft) => draft.acceptanceCriteria.length > 0)).toBe(true);
  });

  it("serializes remediation issue JSON and gh script without raw secrets", () => {
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness: buildProviderReadinessMatrix({ roles: workspace.roles }),
      secretProbeValues: ["sk-release-remediation-secret"],
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const drafts = buildReleaseRemediationIssueDrafts({ report });
    const json = serializeDevelopmentIssueDrafts(drafts);
    const script = serializeDevelopmentIssueGhScript(drafts);

    expect(JSON.parse(json).schema).toBe("naikaku.github-issue-drafts.v1");
    expect(script).toContain("gh issue create");
    expect(script).toContain("--label 'release'");
    expect(script).toContain("--label 'remediation'");
    expect(json).not.toContain("sk-release-remediation-secret");
    expect(script).not.toContain("sk-release-remediation-secret");
    expect(json).not.toContain("sessionSecret");
    expect(script).not.toContain("sessionSecret");
  });
});
