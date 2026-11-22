import type { CabinetRun, CabinetStageId, RiskLevel } from "../domain/types";

const stageBlueprints: Array<{
  stageId: CabinetStageId;
  roleId: string;
  riskLevel: RiskLevel;
}> = [
  { stageId: "intake", roleId: "prime-minister", riskLevel: "medium" },
  { stageId: "planning", roleId: "strategy-minister", riskLevel: "medium" },
  { stageId: "execution", roleId: "execution-minister", riskLevel: "high" },
  { stageId: "critique", roleId: "critic", riskLevel: "low" },
  { stageId: "supervision", roleId: "safety-auditor", riskLevel: "critical" },
  { stageId: "scoring", roleId: "scoring-office", riskLevel: "medium" },
  { stageId: "iteration", roleId: "memory-secretary", riskLevel: "medium" }
];

export function createBrowserDemoRun({
  mission,
  fallbackMission
}: {
  mission: string;
  fallbackMission: string;
}): CabinetRun {
  const normalizedMission = mission.trim() || fallbackMission;
  const timestamp = new Date().toISOString();

  return {
    id: `browser-demo-${timestamp}`,
    mission: normalizedMission,
    startedAt: timestamp,
    completedAt: timestamp,
    artifacts: stageBlueprints.map((stage, index) => ({
      id: `browser-demo-${stage.stageId}-${index}`,
      stageId: stage.stageId,
      roleId: stage.roleId,
      title: `Browser demo: ${stage.stageId}`,
      body: "Browser-only workflow demonstration. No provider request or tool action was made.",
      riskLevel: stage.riskLevel,
      scoreImpact: 0,
      providerStatus: "dry-run" as const,
      providerDetail: "Browser-only workflow demonstration. No provider request was made."
    })),
    logs: stageBlueprints.map((stage, index) => ({
      id: `browser-demo-log-${stage.stageId}`,
      timestamp,
      level: index === 0 ? "success" as const : "info" as const,
      message: `Browser-only ${stage.stageId} record created.`
    })),
    score: {
      readiness: 100,
      safety: 84,
      execution: 81,
      critique: 87,
      overall: 88,
      decision: "ship"
    },
    nextIteration: [
      "Review the record with a human operator.",
      "Run real work only from the local Workbench or approved self-hosted environment."
    ]
  };
}

export function serializeBrowserDemoRun(run: CabinetRun) {
  return JSON.stringify(
    {
      schema: "naikaku.browser-demo.v1",
      mode: "browser-only-dry-run",
      disclaimer: "No API key, model request, code execution, local CLI, or remote persistence was used.",
      run: {
        id: run.id,
        mission: run.mission,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        score: run.score,
        stages: run.artifacts.map((artifact) => ({
          stageId: artifact.stageId,
          roleId: artifact.roleId,
          riskLevel: artifact.riskLevel,
          providerStatus: artifact.providerStatus
        }))
      }
    },
    null,
    2
  );
}
