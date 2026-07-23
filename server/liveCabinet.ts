import { cabinetStages } from "../src/data/defaultCabinet";
import { buildAutomationPlan } from "../src/domain/automation";
import { runCabinetMission, scoreCabinetRun } from "../src/domain/orchestrator";
import type {
  CabinetArtifact,
  CabinetLogEntry,
  CabinetRole,
  CabinetRun,
  CabinetRunMode,
  CabinetWorkspace
} from "../src/domain/types";
import { invokeRoleProvider } from "./providerAdapters";

export interface GatewayCabinetRunInput extends CabinetWorkspace {
  mode?: CabinetRunMode;
}

export async function runGatewayCabinet(input: GatewayCabinetRunInput): Promise<CabinetRun> {
  const mode = input.mode || "dry-run";
  const baseRun = runCabinetMission(input);

  if (mode === "dry-run") {
    const artifacts = baseRun.artifacts.map((artifact) => ({
      ...artifact,
      providerStatus: "dry-run" as const,
      providerDetail: "Deterministic dry-run artifact; no external model call."
    }));
    const dryRun = {
      ...baseRun,
      artifacts
    };

    return {
      ...dryRun,
      automationActions: buildAutomationPlan({
        run: dryRun,
        roles: input.roles.filter((role) => role.enabled),
        sandboxPolicy: input.sandboxPolicy
      }),
      logs: [
        ...baseRun.logs,
        {
          id: "log-provider-dry-run",
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Gateway completed dry-run mode without external provider calls."
        }
      ]
    };
  }

  const artifacts: CabinetArtifact[] = [];
  const providerLogs: CabinetLogEntry[] = [];

  for (const stage of cabinetStages) {
    const baseArtifact = baseRun.artifacts.find((artifact) => artifact.stageId === stage.id);
    if (!baseArtifact) continue;

    const role =
      input.roles.find((candidate) => candidate.id === baseArtifact.roleId) ||
      input.roles.find((candidate) => candidate.stage === stage.id);

    if (!role || !role.enabled) {
      artifacts.push({
        ...baseArtifact,
        body: unavailableLiveArtifactBody("No enabled role owns this stage."),
        providerStatus: "skipped",
        providerDetail: "No enabled role owns this stage."
      });
      continue;
    }

    const providerResult = await invokeRoleProvider({
      role,
      mission: input.mission,
      context: artifacts
    });
    const hasLiveArtifact = providerResult.status === "called" && Boolean(providerResult.text.trim());
    const nextArtifact: CabinetArtifact = {
      ...baseArtifact,
      body: hasLiveArtifact
        ? providerResult.text
        : unavailableLiveArtifactBody(
            providerResult.status === "called"
              ? "The provider returned an empty artifact."
              : providerResult.detail
          ),
      providerStatus: providerResult.status,
      providerDetail: providerResult.detail,
      tokensUsed: providerResult.tokensUsed,
      latencyMs: providerResult.latencyMs
    };
    artifacts.push(nextArtifact);
    providerLogs.push({
      id: `log-provider-${stage.id}`,
      timestamp: new Date().toISOString(),
      level: providerResult.status === "called" ? "success" : providerResult.status === "failed" ? "error" : "warning",
      message: `${role.name} provider ${providerResult.status}: ${providerResult.detail}`
    });
  }

  const skippedOrFailed = artifacts.filter(
    (artifact) => artifact.providerStatus === "skipped" || artifact.providerStatus === "failed"
  );
  const score = scoreCabinetRun(
    artifacts,
    input.roles.filter((role) => role.enabled),
    input.sandboxPolicy
  );
  const runWithArtifacts = {
    ...baseRun,
    artifacts,
    score
  };

  return {
    ...runWithArtifacts,
    automationActions: buildAutomationPlan({
      run: runWithArtifacts,
      roles: input.roles.filter((role) => role.enabled),
      sandboxPolicy: input.sandboxPolicy
    }),
    logs: [...baseRun.logs, ...providerLogs],
    nextIteration: skippedOrFailed.length
      ? [
          `Resolve ${skippedOrFailed.length} provider configuration issue(s) before full live automation.`,
          ...baseRun.nextIteration
        ]
      : baseRun.nextIteration
  };
}

function unavailableLiveArtifactBody(detail: string) {
  return [
    "No live model artifact was generated for this stage.",
    `Reason: ${detail}`,
    "The deterministic dry-run draft is intentionally withheld in live mode."
  ].join("\n");
}
