import type {
  AutomationAction,
  CabinetArtifact,
  CabinetRun,
  MemoryEntry,
  MemoryEntryStatus
} from "./types";

export interface BuildMemoryCandidatesInput {
  run: CabinetRun;
  createdAt?: string;
}

export interface MemoryDecisionInput {
  entry: MemoryEntry;
  decision: Exclude<MemoryEntryStatus, "candidate">;
  decidedAt?: string;
  decidedBy?: string;
}

export function buildMemoryCandidates({
  run,
  createdAt = run.completedAt
}: BuildMemoryCandidatesInput): MemoryEntry[] {
  const entries: MemoryEntry[] = [
    buildScoreDecision(run, createdAt),
    ...buildIterationLessons(run, createdAt),
    ...buildNextIterationFollowUps(run, createdAt),
    ...buildBlockedActionRisks(run, createdAt)
  ];

  return entries.filter((entry, index, current) =>
    current.findIndex((candidate) => candidate.id === entry.id) === index
  );
}

export function createMemoryDecision({
  entry,
  decision,
  decidedAt = new Date().toISOString(),
  decidedBy = "operator"
}: MemoryDecisionInput): MemoryEntry {
  return {
    ...entry,
    status: decision,
    consentTag: "operator-reviewed",
    decidedAt,
    decidedBy
  };
}

export function serializeMemoryEntries(entries: MemoryEntry[]) {
  return JSON.stringify(
    {
      schema: "naikaku.memory-log.v1",
      exportedAt: new Date().toISOString(),
      entries
    },
    null,
    2
  );
}

function buildScoreDecision(run: CabinetRun, createdAt: string): MemoryEntry {
  return {
    id: `${memoryRunId(run.id)}-score-decision`,
    runId: run.id,
    createdAt,
    status: "candidate",
    kind: "decision",
    title: `Run decision: ${run.score.decision}`,
    body: `Overall ${run.score.overall}/100 with readiness ${run.score.readiness}, safety ${run.score.safety}, execution ${run.score.execution}, and critique ${run.score.critique}.`,
    source: "scoring",
    retention: "project",
    consentTag: "needs-review",
    tags: ["score", run.score.decision, `overall-${run.score.overall}`],
    metadata: {
      decision: run.score.decision,
      overall: run.score.overall,
      safety: run.score.safety
    }
  };
}

function buildIterationLessons(run: CabinetRun, createdAt: string): MemoryEntry[] {
  const iterationArtifact = run.artifacts.find((artifact) => artifact.stageId === "iteration");
  if (!iterationArtifact) {
    return [];
  }

  return [
    artifactToLesson(run, iterationArtifact, createdAt),
    artifactToSkillProposal(run, iterationArtifact, createdAt)
  ];
}

function artifactToLesson(
  run: CabinetRun,
  artifact: CabinetArtifact,
  createdAt: string
): MemoryEntry {
  return {
    id: `${memoryRunId(run.id)}-${artifact.id}-lesson`,
    runId: run.id,
    createdAt,
    status: "candidate",
    kind: "lesson",
    title: "Lesson: keep the cabinet loop inspectable",
    body: artifact.body,
    source: "artifact",
    retention: "project",
    consentTag: "needs-review",
    tags: ["iteration", "lesson", artifact.roleId],
    sourceStageId: artifact.stageId,
    sourceArtifactId: artifact.id,
    metadata: {
      riskLevel: artifact.riskLevel,
      roleId: artifact.roleId
    }
  };
}

function artifactToSkillProposal(
  run: CabinetRun,
  artifact: CabinetArtifact,
  createdAt: string
): MemoryEntry {
  return {
    id: `${memoryRunId(run.id)}-${artifact.id}-skill`,
    runId: run.id,
    createdAt,
    status: "candidate",
    kind: "skill",
    title: "Skill proposal: reusable cabinet review loop",
    body: "Convert accepted iteration lessons into a reusable runbook for plan, act, audit, score, and revise cycles.",
    source: "iteration",
    retention: "long-term",
    consentTag: "needs-review",
    tags: ["skill", "cabinet-loop", artifact.roleId],
    sourceStageId: artifact.stageId,
    sourceArtifactId: artifact.id,
    metadata: {
      roleId: artifact.roleId,
      stageId: artifact.stageId
    }
  };
}

function buildNextIterationFollowUps(run: CabinetRun, createdAt: string): MemoryEntry[] {
  return run.nextIteration.map((task, index) => ({
    id: `${memoryRunId(run.id)}-next-${index + 1}`,
    runId: run.id,
    createdAt,
    status: "candidate",
    kind: "follow-up",
    title: `Next cycle: ${compactTitle(task)}`,
    body: task,
    source: "iteration",
    retention: "project",
    consentTag: "needs-review",
    tags: ["next-iteration", `priority-${index + 1}`],
    metadata: {
      priority: index + 1
    }
  }));
}

function buildBlockedActionRisks(run: CabinetRun, createdAt: string): MemoryEntry[] {
  return (run.automationActions || [])
    .filter((action) => action.status === "blocked")
    .map((action) => actionToRisk(run, action, createdAt));
}

function actionToRisk(
  run: CabinetRun,
  action: AutomationAction,
  createdAt: string
): MemoryEntry {
  return {
    id: `${memoryRunId(run.id)}-${action.id}-risk`,
    runId: run.id,
    createdAt,
    status: "candidate",
    kind: "risk",
    title: `Blocked action: ${action.title}`,
    body: `${action.reason}\nTarget: ${action.target}`,
    source: "automation",
    retention: "project",
    consentTag: "needs-review",
    tags: ["automation", "blocked", action.riskLevel],
    sourceStageId: action.stageId,
    sourceActionId: action.id,
    metadata: {
      roleId: action.roleId,
      riskLevel: action.riskLevel,
      executorProfileId: action.executorProfileId
    }
  };
}

function compactTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.length > 72 ? `${title.slice(0, 69)}...` : title;
}

function memoryRunId(runId: string) {
  return runId.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}
