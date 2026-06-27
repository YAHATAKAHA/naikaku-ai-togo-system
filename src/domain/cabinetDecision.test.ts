import { describe, expect, it } from "vitest";
import { decideCabinetMotion } from "./cabinetDecision";

describe("cabinet motion decision", () => {
  it("approves by majority while preserving supervision dissent", () => {
    const report = decideCabinetMotion({
      motion: {
        id: "motion-openclaw-smoke",
        title: "Run OpenClaw through a scoped Naikaku preset",
        requestedExecutor: "openclaw-local",
        riskLevel: "medium",
        requiresHumanApproval: false
      },
      votes: [
        vote("prime-minister", "Prime Minister", "intake", "approve"),
        vote("execution-minister", "Execution Minister", "execution", "approve"),
        vote("audit-minister", "Audit Minister", "supervision", "reject", "Require receipt before completion.")
      ],
      audit: {
        decision: "warn",
        findings: ["Receipt required before board reconciliation."],
        evidence: ["runner-preset=openclaw-local"]
      }
    });

    expect(report.decision).toBe("approved");
    expect(report.reason).toBe("approved-with-audit-warning");
    expect(report.executionAuthorized).toBe(true);
    expect(report.dissent).toEqual([
      expect.objectContaining({
        roleId: "audit-minister",
        roleStage: "supervision"
      })
    ]);
    expect(report.nextAction).toContain("dissent notes");
  });

  it("blocks a motion when audit blocks even with majority approval", () => {
    const report = decideCabinetMotion({
      motion: {
        id: "motion-send-message",
        title: "Send a result to an external chat",
        requestedExecutor: "openclaw-local",
        riskLevel: "high",
        requiresHumanApproval: false
      },
      votes: [
        vote("prime-minister", "Prime Minister", "intake", "approve"),
        vote("execution-minister", "Execution Minister", "execution", "approve"),
        vote("strategy-minister", "Strategy Minister", "planning", "approve")
      ],
      audit: {
        decision: "block",
        findings: ["external-send requires explicit payload approval"],
        evidence: ["security-classification=external-send"]
      }
    });

    expect(report.decision).toBe("blocked");
    expect(report.reason).toBe("audit-blocked");
    expect(report.executionAuthorized).toBe(false);
  });

  it("requires approval only for high-impact motions instead of every automation step", () => {
    const base = {
      motion: {
        id: "motion-hammerspoon-desktop",
        title: "Use Hammerspoon to run a scoped desktop proof",
        requestedExecutor: "hammerspoon-mac-adapter",
        riskLevel: "critical" as const,
        requiresHumanApproval: true
      },
      votes: [
        vote("prime-minister", "Prime Minister", "intake", "approve"),
        vote("execution-minister", "Execution Minister", "execution", "approve"),
        vote("audit-minister", "Audit Minister", "supervision", "approve")
      ],
      audit: {
        decision: "pass" as const,
        findings: [],
        evidence: ["hs-ipc-proof-path=output/local-tool-smoke/hammerspoon-proof.txt"]
      }
    };

    const blocked = decideCabinetMotion(base);
    const approved = decideCabinetMotion({ ...base, humanApprovalGranted: true });

    expect(blocked.decision).toBe("blocked");
    expect(blocked.reason).toBe("human-approval-required");
    expect(approved.decision).toBe("approved");
    expect(approved.executionAuthorized).toBe(true);
  });

  it("asks for revision when quorum is not met", () => {
    const report = decideCabinetMotion({
      motion: {
        id: "motion-too-small",
        title: "Run without enough cabinet members",
        requestedExecutor: "fixture",
        riskLevel: "low",
        requiresHumanApproval: false
      },
      votes: [
        vote("prime-minister", "Prime Minister", "intake", "approve")
      ],
      audit: {
        decision: "pass",
        findings: [],
        evidence: []
      }
    });

    expect(report.decision).toBe("revise");
    expect(report.reason).toBe("quorum-not-met");
  });
});

function vote(
  roleId: string,
  roleName: string,
  roleStage: string,
  decision: "approve" | "reject" | "abstain",
  rationale = "Reviewed by cabinet role."
) {
  return {
    roleId,
    roleName,
    roleStage,
    decision,
    rationale
  };
}
