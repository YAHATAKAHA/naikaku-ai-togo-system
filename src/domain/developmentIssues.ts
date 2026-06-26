import type {
  DevelopmentBoard,
  DevelopmentIssueDraft,
  DevelopmentIssueDrafts,
  DevelopmentWorkItem
} from "./types";

export function buildDevelopmentIssueDrafts({
  board,
  generatedAt = new Date().toISOString()
}: {
  board: DevelopmentBoard;
  generatedAt?: string;
}): DevelopmentIssueDrafts {
  const drafts = board.items.map((item) => itemToDraft(item, board, generatedAt));
  const labels = Array.from(new Set(drafts.flatMap((draft) => draft.labels))).sort();
  const teams = new Set(drafts.map((draft) => draft.roleId).filter(Boolean)).size;

  return {
    schema: "naikaku.github-issue-drafts.v1",
    generatedAt,
    mission: board.mission,
    runId: board.runId,
    drafts,
    summary: {
      total: drafts.length,
      ready: drafts.filter((draft) => draft.status !== "blocked" && draft.status !== "done").length,
      blocked: drafts.filter((draft) => draft.status === "blocked").length,
      highPriority: drafts.filter((draft) => draft.priority === "high" || draft.priority === "critical").length,
      teams,
      labels
    }
  };
}

export function serializeDevelopmentIssueDrafts(drafts: DevelopmentIssueDrafts) {
  return JSON.stringify(drafts, null, 2);
}

export function serializeDevelopmentIssueMarkdown(drafts: DevelopmentIssueDrafts) {
  return drafts.drafts.map((draft) => `# ${draft.title}\n\n${draft.body}`).join("\n\n---\n\n");
}

function itemToDraft(
  item: DevelopmentWorkItem,
  board: DevelopmentBoard,
  generatedAt: string
): DevelopmentIssueDraft {
  const labels = issueLabels(item);

  return {
    id: `issue-${item.id}`,
    sourceItemId: item.id,
    title: issueTitle(item),
    body: issueBody(item, board, labels, generatedAt),
    labels,
    assigneeHint: item.roleName,
    milestoneHint: item.runId ? `Run ${item.runId}` : "MVP",
    priority: item.priority,
    status: item.status,
    source: item.source,
    roleId: item.roleId,
    roleName: item.roleName,
    stageId: item.stageId,
    runId: item.runId,
    acceptanceCriteria: item.acceptanceCriteria,
    deliverables: item.deliverables
  };
}

function issueTitle(item: DevelopmentWorkItem) {
  const prefix = item.source === "team-package"
    ? "Team"
    : item.source === "memory-entry"
      ? "Memory"
      : "Next";
  return `[${prefix}] ${item.title}`;
}

function issueBody(
  item: DevelopmentWorkItem,
  board: DevelopmentBoard,
  labels: string[],
  generatedAt: string
) {
  const lines = [
    `Mission: ${board.mission}`,
    item.runId ? `Run: ${item.runId}` : "Run: workspace template",
    `Source: ${item.source} / ${item.sourceId}`,
    item.roleName ? `Owner hint: ${item.roleName}` : "Owner hint: unassigned",
    item.stageId ? `Stage: ${item.stageId}` : "Stage: cross-stage",
    `Priority: ${item.priority}`,
    `Status: ${item.status}`,
    `Generated: ${generatedAt}`,
    "",
    "## Work",
    item.body,
    "",
    "## Acceptance Criteria",
    ...checklist(item.acceptanceCriteria),
    "",
    "## Deliverables",
    ...checklist(item.deliverables),
    "",
    "## Labels",
    labels.map((label) => `\`${label}\``).join(" "),
    "",
    "## Traceability",
    `- Development item: ${item.id}`,
    `- Source id: ${item.sourceId}`,
    item.runId ? `- Run id: ${item.runId}` : "- Run id: none",
    item.updatedAt ? `- Last status update: ${item.updatedAt}` : "- Last status update: none"
  ];

  return lines.join("\n");
}

function issueLabels(item: DevelopmentWorkItem) {
  return Array.from(new Set([
    "naikaku",
    "mvp",
    `source:${item.source}`,
    `status:${item.status}`,
    `priority:${item.priority}`,
    ...(item.stageId ? [`stage:${item.stageId}`] : []),
    ...(item.roleId ? [`role:${item.roleId}`] : []),
    ...item.tags.slice(0, 8).map((tag) => normalizeLabel(tag))
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
