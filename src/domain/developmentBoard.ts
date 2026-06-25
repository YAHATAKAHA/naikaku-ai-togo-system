import type {
  CabinetRun,
  DevelopmentBoard,
  DevelopmentWorkItem,
  DevelopmentWorkItemPriority,
  DevelopmentWorkItemStatus,
  MemoryEntry,
  TeamHandoff,
  TeamPackageStatus,
  TeamWorkPackage
} from "./types";

export interface BuildDevelopmentBoardInput {
  handoff: TeamHandoff;
  run?: CabinetRun | null;
  memoryEntries?: MemoryEntry[];
  savedItems?: DevelopmentWorkItem[];
  generatedAt?: string;
}

export function buildDevelopmentBoard({
  handoff,
  run,
  memoryEntries = [],
  savedItems = [],
  generatedAt = handoff.generatedAt
}: BuildDevelopmentBoardInput): DevelopmentBoard {
  const savedById = new Map(savedItems.map((item) => [item.id, item]));
  const generatedItems = [
    ...handoff.packages.map((workPackage) => packageToWorkItem(workPackage, generatedAt)),
    ...nextIterationToWorkItems(run || null, generatedAt),
    ...memoryEntriesToWorkItems(memoryEntries, generatedAt)
  ];
  const items = generatedItems.map((item) => mergeSavedItem(item, savedById.get(item.id)));

  return {
    schema: "naikaku.development-board.v1",
    generatedAt,
    mission: handoff.mission,
    runId: handoff.runId,
    items,
    summary: summarizeItems(items)
  };
}

export function updateDevelopmentWorkItemStatus({
  item,
  status,
  updatedAt = new Date().toISOString()
}: {
  item: DevelopmentWorkItem;
  status: DevelopmentWorkItemStatus;
  updatedAt?: string;
}): DevelopmentWorkItem {
  return {
    ...item,
    status,
    updatedAt
  };
}

export function serializeDevelopmentBoard(board: DevelopmentBoard) {
  return JSON.stringify(board, null, 2);
}

function packageToWorkItem(
  workPackage: TeamWorkPackage,
  generatedAt: string
): DevelopmentWorkItem {
  return {
    id: `team-${workPackage.id}`,
    title: `${workPackage.roleName}: ${workPackage.ministry}`,
    body: workPackage.objectives.join("\n"),
    status: defaultStatusForPackage(workPackage.status),
    priority: priorityForPackage(workPackage.status),
    source: "team-package",
    sourceId: workPackage.id,
    roleId: workPackage.roleId,
    roleName: workPackage.roleName,
    stageId: workPackage.stageId,
    runId: workPackage.sourceRunId,
    generatedAt,
    acceptanceCriteria: workPackage.acceptanceCriteria,
    deliverables: workPackage.deliverables,
    tags: [
      workPackage.stageId,
      workPackage.status,
      workPackage.executorProfileId,
      workPackage.provider.provider,
      ...workPackage.automationActionIds.map((id) => `action:${id}`)
    ]
  };
}

function nextIterationToWorkItems(
  run: CabinetRun | null,
  generatedAt: string
): DevelopmentWorkItem[] {
  if (!run) {
    return [];
  }

  return run.nextIteration.map((task, index) => ({
    id: `${slug(run.id)}-next-${index + 1}`,
    title: `Next loop ${index + 1}: ${compactTitle(task)}`,
    body: task,
    status: "todo",
    priority: index === 0 ? "high" : "medium",
    source: "next-iteration",
    sourceId: `${run.id}:next:${index + 1}`,
    runId: run.id,
    generatedAt,
    acceptanceCriteria: [
      "Owner is assigned before implementation begins.",
      "Evidence is attached through tests, screenshots, logs, or audit events."
    ],
    deliverables: [
      "Updated code or documentation.",
      "Verification note linked to the run."
    ],
    tags: ["next-iteration", `priority-${index + 1}`]
  }));
}

function memoryEntriesToWorkItems(
  memoryEntries: MemoryEntry[],
  generatedAt: string
): DevelopmentWorkItem[] {
  return memoryEntries
    .filter((entry) => entry.status === "accepted")
    .filter((entry) => entry.kind === "follow-up" || entry.kind === "skill" || entry.kind === "risk")
    .map((entry) => ({
      id: `memory-${entry.id}`,
      title: `Memory: ${entry.title}`,
      body: entry.body,
      status: entry.kind === "risk" ? "blocked" : "todo",
      priority: priorityForMemory(entry),
      source: "memory-entry",
      sourceId: entry.id,
      runId: entry.runId,
      stageId: entry.sourceStageId,
      generatedAt,
      acceptanceCriteria: [
        "Accepted memory is translated into a concrete implementation or governance action.",
        "Retained output keeps consent tag and retention policy visible."
      ],
      deliverables: [
        "Implementation task, runbook, or policy update.",
        "Audit evidence for the memory-derived action."
      ],
      tags: ["memory", entry.kind, entry.retention, ...entry.tags]
    }));
}

function mergeSavedItem(
  item: DevelopmentWorkItem,
  savedItem?: DevelopmentWorkItem
): DevelopmentWorkItem {
  if (!savedItem) {
    return item;
  }

  return {
    ...item,
    status: savedItem.status,
    updatedAt: savedItem.updatedAt
  };
}

function summarizeItems(items: DevelopmentWorkItem[]): DevelopmentBoard["summary"] {
  const teams = new Set(items.map((item) => item.roleId).filter(Boolean)).size;

  return items.reduce<DevelopmentBoard["summary"]>((summary, item) => ({
    total: summary.total + 1,
    todo: summary.todo + (item.status === "todo" ? 1 : 0),
    inProgress: summary.inProgress + (item.status === "in-progress" ? 1 : 0),
    blocked: summary.blocked + (item.status === "blocked" ? 1 : 0),
    done: summary.done + (item.status === "done" ? 1 : 0),
    highPriority:
      summary.highPriority + (item.priority === "high" || item.priority === "critical" ? 1 : 0),
    teams
  }), {
    total: 0,
    todo: 0,
    inProgress: 0,
    blocked: 0,
    done: 0,
    highPriority: 0,
    teams
  });
}

function defaultStatusForPackage(status: TeamPackageStatus): DevelopmentWorkItemStatus {
  return status === "blocked" ? "blocked" : "todo";
}

function priorityForPackage(status: TeamPackageStatus): DevelopmentWorkItemPriority {
  if (status === "blocked") return "critical";
  if (status === "needs-approval") return "high";
  if (status === "ready") return "medium";
  return "low";
}

function priorityForMemory(entry: MemoryEntry): DevelopmentWorkItemPriority {
  if (entry.kind === "risk") return "critical";
  if (entry.kind === "skill") return "high";
  return "medium";
}

function compactTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.length > 68 ? `${title.slice(0, 65)}...` : title;
}

function slug(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}
