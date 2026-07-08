import { describe, expect, it } from "vitest";
import {
  buildStrategyIterationReport,
  serializeStrategyIterationReport,
  serializeStrategyIterationReportMarkdown
} from "./strategyIterations";

const completeDocuments = {
  "README.md": "Japan-built Commercial use",
  "README.ja.md": "日本発",
  "docs/architecture.md": "Japanese-led AI cabinet",
  "docs/localization.md": "Japanese",
  "src/domain/dataAccessPolicy.ts": "RoleDataAccessMatrix",
  "src/domain/productReadiness.ts": "data-governance",
  "src/components/RoleInspector.tsx": "Data access",
  "docs/security-sandbox.md": "Role Data Access Policy production evidence",
  "Dockerfile": "FROM node",
  "compose.yaml": "services:",
  "docs/deployment.md": "commercial license",
  "docs/deployment.ja.md": "商用",
  "COMMERCIAL-LICENSE.md": "合同会社EMYSTI",
  "CHANGELOG.md": "Changelog",
  "CONTRIBUTING.md": "Contributing",
  ".github/pull_request_template.md": "Verification",
  ".github/ISSUE_TEMPLATE/deployment-readiness.md": "Deployment readiness",
  "PUBLIC-SOURCE-SCOPE.md": "Excluded",
  "docs/strategy-iterations.md": "Strategy Iterations",
  "docs/adr/README.md": "Architecture Decision Records",
  "docs/adr/0001-strategy-iteration-gate.md": "Accepted",
  "docs/releases/v0.1.0.md": "Verification"
};

const completeScripts = {
  "deployment:check": "tsx scripts/deployment-readiness.ts",
  "ci:open-source": "npm run public-scope:check",
  "open-source:mvp-check": "tsx scripts/open-source-mvp-check.ts",
  "release:verify": "npm run localization:drill",
  "release:mac-dev-package": "node scripts/package-mac-dev-preview.mjs"
};

describe("strategy iteration report", () => {
  it("passes all five iterations when strategic evidence is present", () => {
    const report = buildStrategyIterationReport({
      documents: completeDocuments,
      packageScripts: completeScripts,
      generatedAt: "2026-07-08T00:00:00.000Z"
    });

    expect(report.schema).toBe("naikaku.strategy-iterations.v1");
    expect(report.decision).toBe("aligned");
    expect(report.summary).toEqual({
      total: 5,
      passed: 5,
      warnings: 0,
      blockers: 0
    });
    expect(serializeStrategyIterationReport(report)).not.toContain("sessionSecret");
    expect(serializeStrategyIterationReportMarkdown(report)).toContain("Naikaku Strategy Iteration Report");
  });

  it("blocks when commercial deployment evidence is missing", () => {
    const report = buildStrategyIterationReport({
      documents: {
        ...completeDocuments,
        Dockerfile: undefined,
        "compose.yaml": undefined,
        "docs/deployment.md": ""
      },
      packageScripts: completeScripts,
      generatedAt: "2026-07-08T00:00:00.000Z"
    });

    const commercial = report.iterations.find(
      (iteration) => iteration.id === "deployment-commercial-readiness"
    );

    expect(report.decision).toBe("blocked");
    expect(commercial?.status).toBe("block");
  });
});
