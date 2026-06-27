import type {
  AutomationAction,
  ExecutorEvidenceBundle,
  ExecutorHandoff,
  ExecutorProfileId
} from "../src/domain/types";
import { runnerCanUseExecutorProfile, type RunnerAuthDecision } from "./runnerAuth";

export interface RunnerScopePayload {
  allExecutorProfiles: boolean;
  allowedExecutorProfiles: ExecutorProfileId[];
  tokenFingerprint?: string;
}

export function scopeExecutorHandoffForRunner(
  handoff: ExecutorHandoff,
  auth: RunnerAuthDecision
): ExecutorHandoff {
  if (auth.allExecutorProfiles) return handoff;

  const readyActions = handoff.readyActions.filter((action) =>
    runnerCanUseExecutorProfile(auth, action.executorProfileId)
  );
  const scopedOutActions = handoff.readyActions
    .filter((action) => !runnerCanUseExecutorProfile(auth, action.executorProfileId))
    .map((action): AutomationAction => {
      const { handoffStatus: _handoffStatus, approvalRecordId: _approvalRecordId, ...automationAction } = action;
      return {
        ...automationAction,
        status: "blocked",
        approvalRequired: true,
        reason: `Runner ${auth.runnerId} is not scoped for ${action.executorProfileId}.`,
        auditTags: [...action.auditTags, "runner-scope-held", auth.runnerId]
      };
    });

  return {
    ...handoff,
    readyActions,
    heldActions: [...handoff.heldActions, ...scopedOutActions]
  };
}

export function scopeEvidenceBundleForRunner(
  bundle: ExecutorEvidenceBundle,
  auth: RunnerAuthDecision
): ExecutorEvidenceBundle {
  if (auth.allExecutorProfiles) return bundle;
  const steps = bundle.steps.filter((step) =>
    runnerCanUseExecutorProfile(auth, step.executorProfileId)
  );

  return {
    ...bundle,
    steps,
    summary: {
      steps: steps.length,
      evidenceItems: steps.reduce((total, step) => total + step.evidence.length, 0),
      replayableSteps: steps.filter((step) => step.replayable).length
    }
  };
}

export function deniedExecutorProfilesForRunner(
  auth: RunnerAuthDecision,
  profiles: ExecutorProfileId[]
) {
  return [...new Set(profiles)].filter((profile) =>
    !runnerCanUseExecutorProfile(auth, profile)
  );
}

export function runnerCanAccessExecutorProfiles(
  auth: RunnerAuthDecision,
  profiles: ExecutorProfileId[]
) {
  return deniedExecutorProfilesForRunner(auth, profiles).length === 0;
}

export function runnerScopePayload(auth: RunnerAuthDecision): RunnerScopePayload {
  return {
    allExecutorProfiles: auth.allExecutorProfiles,
    allowedExecutorProfiles: auth.allowedExecutorProfiles,
    tokenFingerprint: auth.tokenFingerprint
  };
}
