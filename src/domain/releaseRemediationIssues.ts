import type {
  DevelopmentIssueDraft,
  DevelopmentIssueDrafts,
  ReleaseRehearsalReport,
  ReleaseRemediationItem
} from "./types";

export function buildReleaseRemediationIssueDrafts({
  report,
  generatedAt = new Date().toISOString()
}: {
  report: ReleaseRehearsalReport;
  generatedAt?: string;
}): DevelopmentIssueDrafts {
  const drafts = report.remediation.items.map((item) =>
    remediationItemToDraft(item, report, generatedAt)
  );
  const labels = Array.from(new Set(drafts.flatMap((draft) => draft.labels))).sort();

  return {
    schema: "naikaku.github-issue-drafts.v1",
    generatedAt,
    mission: report.mission,
    runId: report.runId,
    drafts,
    summary: {
      total: drafts.length,
      ready: drafts.length,
      blocked: 0,
      highPriority: drafts.filter((draft) => draft.priority === "high" || draft.priority === "critical").length,
      teams: new Set(drafts.map((draft) => draft.assigneeHint).filter(Boolean)).size,
      labels
    }
  };
}

function remediationItemToDraft(
  item: ReleaseRemediationItem,
  report: ReleaseRehearsalReport,
  generatedAt: string
): DevelopmentIssueDraft {
  const labels = remediationLabels(item);

  return {
    id: `issue-${item.id}`,
    sourceItemId: item.id,
    title: `[Release] ${item.title}`,
    body: issueBody(item, report, labels, generatedAt),
    labels,
    assigneeHint: item.owner,
    milestoneHint: `Release rehearsal ${report.runId}`,
    priority: item.priority,
    status: "todo",
    source: "release-remediation",
    runId: report.runId,
    acceptanceCriteria: item.acceptanceCriteria,
    deliverables: [
      `Evidence that ${item.verificationCommand} was rerun after remediation.`,
      "Updated release rehearsal report showing this source check no longer warns or blocks."
    ]
  };
}

function issueBody(
  item: ReleaseRemediationItem,
  report: ReleaseRehearsalReport,
  labels: string[],
  generatedAt: string
) {
  return [
    `Mission: ${report.mission}`,
    `Run: ${report.runId}`,
    `Source: release-remediation / ${item.sourceCheckId}`,
    `Owner hint: ${item.owner}`,
    `Category: ${item.category}`,
    `Priority: ${item.priority}`,
    `Status: ${item.status}`,
    `Generated: ${generatedAt}`,
    "",
    "## Work",
    item.action,
    "",
    "## Acceptance Criteria",
    ...checklist(item.acceptanceCriteria),
    "",
    "## Verification",
    `- [ ] Run \`${item.verificationCommand}\` after the fix.`,
    "- [ ] Attach the updated rehearsal report or console output.",
    "",
    "## Deliverables",
    `- [ ] Fix for source check \`${item.sourceCheckId}\`.`,
    "- [ ] Updated evidence in the release rehearsal output.",
    "",
    "## Labels",
    labels.map((label) => `\`${label}\``).join(" "),
    "",
    "## Traceability",
    `- Remediation item: ${item.id}`,
    `- Source check: ${item.sourceCheckId}`,
    `- Release run id: ${report.runId}`,
    `- Rehearsal decision: ${report.decision}`,
    `- Rehearsal score: ${report.score}/100`
  ].join("\n");
}

function remediationLabels(item: ReleaseRemediationItem) {
  return Array.from(new Set([
    "naikaku",
    "release",
    "remediation",
    "mvp",
    `source:release-remediation`,
    `status:${item.status}`,
    `priority:${item.priority}`,
    `category:${item.category}`,
    `check:${item.sourceCheckId}`,
    `owner:${normalizeLabel(item.owner)}`
  ])).filter(Boolean);
}

function checklist(items: string[]) {
  return items.length ? items.map((item) => `- [ ] ${item}`) : ["- [ ] Define this before implementation starts."];
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
