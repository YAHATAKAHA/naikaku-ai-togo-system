import { describe, expect, it } from "vitest";
import { decideGuidedCycleContinuation } from "./guidedEngineeringCycle";

describe("guided engineering cycle", () => {
  it("continues revise decisions until the configured loop limit", () => {
    expect(decideGuidedCycleContinuation({
      cabinetDecision: "revise",
      executionOk: true,
      cycle: 1,
      maxCycles: 3
    })).toEqual({
      shouldContinue: true,
      stopReason: "continue"
    });

    expect(decideGuidedCycleContinuation({
      cabinetDecision: "revise",
      executionOk: true,
      cycle: 3,
      maxCycles: 3
    })).toEqual({
      shouldContinue: false,
      stopReason: "limit-reached"
    });
  });

  it("stops unattended execution on ship, block, or failed execution", () => {
    expect(decideGuidedCycleContinuation({
      cabinetDecision: "ship",
      executionOk: true,
      cycle: 1,
      maxCycles: 3
    }).stopReason).toBe("ship");

    expect(decideGuidedCycleContinuation({
      cabinetDecision: "block",
      executionOk: true,
      cycle: 1,
      maxCycles: 3
    }).stopReason).toBe("cabinet-blocked");

    expect(decideGuidedCycleContinuation({
      cabinetDecision: "revise",
      executionOk: false,
      cycle: 1,
      maxCycles: 3
    }).stopReason).toBe("execution-failed");
  });
});
