import type { CabinetScore } from "./types";

export type GuidedCycleStopReason =
  | "continue"
  | "cabinet-blocked"
  | "execution-failed"
  | "ship"
  | "limit-reached";

export interface GuidedCycleContinuationInput {
  cabinetDecision: CabinetScore["decision"];
  executionOk: boolean;
  cycle: number;
  maxCycles: number;
}

export interface GuidedCycleContinuationDecision {
  shouldContinue: boolean;
  stopReason: GuidedCycleStopReason;
}

export function decideGuidedCycleContinuation({
  cabinetDecision,
  executionOk,
  cycle,
  maxCycles
}: GuidedCycleContinuationInput): GuidedCycleContinuationDecision {
  if (cabinetDecision === "block") {
    return {
      shouldContinue: false,
      stopReason: "cabinet-blocked"
    };
  }

  if (!executionOk) {
    return {
      shouldContinue: false,
      stopReason: "execution-failed"
    };
  }

  if (cabinetDecision === "ship") {
    return {
      shouldContinue: false,
      stopReason: "ship"
    };
  }

  if (cycle >= maxCycles) {
    return {
      shouldContinue: false,
      stopReason: "limit-reached"
    };
  }

  return {
    shouldContinue: true,
    stopReason: "continue"
  };
}
