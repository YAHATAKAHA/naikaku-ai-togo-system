export type StrategyIterationStatus = "pass" | "warn" | "block";

export interface StrategyIterationEvidence {
  id: string;
  source: string;
  present: boolean;
  summary: string;
}

export interface StrategyIteration {
  id: string;
  title: string;
  status: StrategyIterationStatus;
  thesis: string;
  evidence: StrategyIterationEvidence[];
  nextAction: string;
}

export interface StrategyIterationReport {
  schema: "naikaku.strategy-iterations.v1";
  generatedAt: string;
  decision: "aligned" | "needs-review" | "blocked";
  iterations: StrategyIteration[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    blockers: number;
  };
}

export interface BuildStrategyIterationReportInput {
  documents: Partial<Record<string, string>>;
  packageScripts: Record<string, string>;
  generatedAt?: string;
}

export function buildStrategyIterationReport({
  documents,
  packageScripts,
  generatedAt = new Date().toISOString()
}: BuildStrategyIterationReportInput): StrategyIterationReport {
  const iterations = [
    japanEnterprisePositioning(documents),
    roleDataGovernance(documents),
    deploymentCommercialReadiness(documents, packageScripts),
    openSourceGitProfessionalism(documents),
    verificationReleaseProof(documents, packageScripts)
  ];
  const summary = summarize(iterations);

  return {
    schema: "naikaku.strategy-iterations.v1",
    generatedAt,
    decision: summary.blockers > 0
      ? "blocked"
      : summary.warnings > 0
        ? "needs-review"
        : "aligned",
    iterations,
    summary
  };
}

export function serializeStrategyIterationReport(report: StrategyIterationReport) {
  return JSON.stringify(report, null, 2);
}

export function serializeStrategyIterationReportMarkdown(report: StrategyIterationReport) {
  return [
    "# Naikaku Strategy Iteration Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Decision: ${report.decision}`,
    "",
    "## Summary",
    "",
    `- Total: ${report.summary.total}`,
    `- Passed: ${report.summary.passed}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Blockers: ${report.summary.blockers}`,
    "",
    "## Iterations",
    "",
    ...report.iterations.flatMap((iteration, index) => [
      `### ${index + 1}. ${iteration.title}`,
      "",
      `Status: ${iteration.status}`,
      "",
      iteration.thesis,
      "",
      "Evidence:",
      ...iteration.evidence.map((item) =>
        `- ${item.present ? "PASS" : "MISSING"} ${item.id} (${item.source}): ${item.summary}`
      ),
      "",
      `Next action: ${iteration.nextAction}`,
      ""
    ])
  ].join("\n");
}

function japanEnterprisePositioning(documents: Partial<Record<string, string>>): StrategyIteration {
  return iteration({
    id: "japan-enterprise-positioning",
    title: "Japan-led enterprise AI positioning",
    thesis:
      "Naikaku should stay positioned as a Japan-led, Japanese-first, enterprise-cautious AI cabinet workbench rather than a generic autonomous agent.",
    evidence: [
      textEvidence(documents, "README.md", "Japan-built", "English README states Japan-built positioning."),
      textEvidence(documents, "README.ja.md", "日本発", "Japanese README states Japan-origin positioning."),
      textEvidence(documents, "docs/architecture.md", "Japanese-led AI cabinet", "Architecture keeps the Japanese-led product direction explicit."),
      textEvidence(documents, "docs/localization.md", "Japanese", "Localization docs preserve Japanese-first operation.")
    ],
    nextAction:
      "Keep Japanese-first language, enterprise caution, and Japan-origin positioning visible in README, website links, and release notes."
  });
}

function roleDataGovernance(documents: Partial<Record<string, string>>): StrategyIteration {
  return iteration({
    id: "role-data-governance",
    title: "Role-based data governance",
    thesis:
      "Enterprise credibility depends on proving secret, personal, customer, confidential, internal, and public data boundaries per role.",
    evidence: [
      textEvidence(documents, "src/domain/dataAccessPolicy.ts", "RoleDataAccessMatrix", "Domain model can evaluate role data-access decisions."),
      textEvidence(documents, "src/domain/productReadiness.ts", "data-governance", "Product readiness has a data-governance gate."),
      textEvidence(documents, "src/components/RoleInspector.tsx", "Data access", "Operators can edit role data policy in the Workbench."),
      textEvidence(documents, "docs/security-sandbox.md", "Role Data Access Policy", "Security docs describe role data classification policy.")
    ],
    nextAction:
      "Next implementation step is runtime enforcement: provider prompts and runner handoffs should apply redaction/blocking before context leaves the role boundary."
  });
}

function deploymentCommercialReadiness(
  documents: Partial<Record<string, string>>,
  packageScripts: Record<string, string>
): StrategyIteration {
  return iteration({
    id: "deployment-commercial-readiness",
    title: "Deployment and commercial readiness",
    thesis:
      "The public repository should let evaluators self-host safely while keeping commercial use behind explicit EMYSTI permission.",
    evidence: [
      fileEvidence(documents, "Dockerfile", "Dockerfile exists for self-host preview images."),
      fileEvidence(documents, "compose.yaml", "Compose preview topology exists."),
      scriptEvidence(packageScripts, "deployment:check", "Deployment readiness script exists."),
      textEvidence(documents, "docs/deployment.md", "commercial license", "English deployment guide states commercial boundary."),
      textEvidence(documents, "docs/deployment.ja.md", "商用", "Japanese deployment guide states commercial boundary."),
      textEvidence(documents, "COMMERCIAL-LICENSE.md", "合同会社EMYSTI", "Commercial license summary names EMYSTI.")
    ],
    nextAction:
      "For production customers, replace local file ledgers with durable authenticated storage and publish a signed installer or managed gateway plan."
  });
}

function openSourceGitProfessionalism(documents: Partial<Record<string, string>>): StrategyIteration {
  return iteration({
    id: "open-source-git-professionalism",
    title: "Professional GitHub contribution surface",
    thesis:
      "The repository should look contribution-ready while clearly protecting private deployment, website, customer, and credential material.",
    evidence: [
      fileEvidence(documents, "CHANGELOG.md", "Changelog exists."),
      fileEvidence(documents, "CONTRIBUTING.md", "Contribution guide exists."),
      fileEvidence(documents, ".github/pull_request_template.md", "Pull request template exists."),
      fileEvidence(documents, ".github/ISSUE_TEMPLATE/deployment-readiness.md", "Deployment readiness issue template exists."),
      textEvidence(documents, "PUBLIC-SOURCE-SCOPE.md", "Excluded", "Public source scope states excluded private material."),
      fileEvidence(documents, "docs/adr/README.md", "ADR index exists."),
      textEvidence(documents, "docs/adr/0001-strategy-iteration-gate.md", "Accepted", "ADR records the strategy gate decision.")
    ],
    nextAction:
      "Add GitHub Actions when repository settings are ready, using ci:open-source as the canonical public-source gate."
  });
}

function verificationReleaseProof(
  documents: Partial<Record<string, string>>,
  packageScripts: Record<string, string>
): StrategyIteration {
  return iteration({
    id: "verification-release-proof",
    title: "Verification and release evidence",
    thesis:
      "Naikaku should distinguish dry-run, fixture, preview, and production evidence before claiming completion or readiness.",
    evidence: [
      scriptEvidence(packageScripts, "ci:open-source", "Repository-level open-source CI command exists."),
      scriptEvidence(packageScripts, "open-source:mvp-check", "Open-source MVP smoke check exists."),
      scriptEvidence(packageScripts, "release:verify", "Release verification command exists."),
      scriptEvidence(packageScripts, "release:mac-dev-package", "Mac developer package command exists."),
      textEvidence(documents, "docs/strategy-iterations.md", "Strategy Iterations", "Strategy iteration guide explains the five checks."),
      textEvidence(documents, "docs/security-sandbox.md", "production evidence", "Security docs preserve dry-run versus production boundary."),
      textEvidence(documents, "docs/releases/v0.1.0.md", "Verification", "Release notes carry verification evidence.")
    ],
    nextAction:
      "Keep every public release tied to ci:open-source output, checksums, release notes, and explicit production-boundary language."
  });
}

function iteration({
  id,
  title,
  thesis,
  evidence,
  nextAction
}: Omit<StrategyIteration, "status">): StrategyIteration {
  const missing = evidence.filter((item) => !item.present).length;
  const status = missing === 0 ? "pass" : missing >= 2 ? "block" : "warn";

  return {
    id,
    title,
    status,
    thesis,
    evidence,
    nextAction
  };
}

function fileEvidence(
  documents: Partial<Record<string, string>>,
  source: string,
  summary: string
): StrategyIterationEvidence {
  return {
    id: source,
    source,
    present: Boolean(documents[source]?.trim()),
    summary
  };
}

function textEvidence(
  documents: Partial<Record<string, string>>,
  source: string,
  needle: string,
  summary: string
): StrategyIterationEvidence {
  return {
    id: `${source}:${needle}`,
    source,
    present: Boolean(documents[source]?.includes(needle)),
    summary
  };
}

function scriptEvidence(
  packageScripts: Record<string, string>,
  script: string,
  summary: string
): StrategyIterationEvidence {
  return {
    id: `script:${script}`,
    source: "package.json",
    present: Boolean(packageScripts[script]),
    summary
  };
}

function summarize(iterations: StrategyIteration[]): StrategyIterationReport["summary"] {
  return iterations.reduce<StrategyIterationReport["summary"]>((summary, iteration) => ({
    total: summary.total + 1,
    passed: summary.passed + (iteration.status === "pass" ? 1 : 0),
    warnings: summary.warnings + (iteration.status === "warn" ? 1 : 0),
    blockers: summary.blockers + (iteration.status === "block" ? 1 : 0)
  }), {
    total: 0,
    passed: 0,
    warnings: 0,
    blockers: 0
  });
}
