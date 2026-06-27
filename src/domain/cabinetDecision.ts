import type { RiskLevel } from "./types";

export type CabinetMotionDecision = "approved" | "revise" | "blocked";
export type CabinetVoteDecision = "approve" | "reject" | "abstain";
export type CabinetAuditDecision = "pass" | "warn" | "block";

export interface CabinetMotion {
  id: string;
  title: string;
  requestedExecutor: string;
  riskLevel: RiskLevel;
  requiresHumanApproval: boolean;
}

export interface CabinetVote {
  roleId: string;
  roleName: string;
  roleStage: string;
  decision: CabinetVoteDecision;
  rationale: string;
}

export interface CabinetMotionAudit {
  decision: CabinetAuditDecision;
  findings: string[];
  evidence: string[];
}

export interface CabinetMotionDecisionReport {
  schema: "naikaku.cabinet-motion-decision.v1";
  motion: CabinetMotion;
  decision: CabinetMotionDecision;
  reason: string;
  executionAuthorized: boolean;
  humanApprovalRequired: boolean;
  humanApprovalGranted: boolean;
  tally: {
    approve: number;
    reject: number;
    abstain: number;
    total: number;
    quorumMet: boolean;
  };
  dissent: Array<{
    roleId: string;
    roleName: string;
    roleStage: string;
    rationale: string;
  }>;
  audit: CabinetMotionAudit;
  nextAction: string;
}

export function decideCabinetMotion({
  motion,
  votes,
  audit,
  requiredQuorum = 3,
  humanApprovalGranted = false
}: {
  motion: CabinetMotion;
  votes: CabinetVote[];
  audit: CabinetMotionAudit;
  requiredQuorum?: number;
  humanApprovalGranted?: boolean;
}): CabinetMotionDecisionReport {
  const tally = {
    approve: votes.filter((vote) => vote.decision === "approve").length,
    reject: votes.filter((vote) => vote.decision === "reject").length,
    abstain: votes.filter((vote) => vote.decision === "abstain").length,
    total: votes.length,
    quorumMet: votes.length >= requiredQuorum
  };
  const dissent = votes
    .filter((vote) => vote.decision === "reject")
    .map((vote) => ({
      roleId: vote.roleId,
      roleName: vote.roleName,
      roleStage: vote.roleStage,
      rationale: vote.rationale
    }));
  const humanApprovalRequired = motion.requiresHumanApproval || motion.riskLevel === "critical";
  const decision = decisionFor({
    tally,
    audit,
    humanApprovalRequired,
    humanApprovalGranted
  });

  return {
    schema: "naikaku.cabinet-motion-decision.v1",
    motion,
    decision,
    reason: reasonFor({
      decision,
      tally,
      audit,
      humanApprovalRequired,
      humanApprovalGranted
    }),
    executionAuthorized: decision === "approved",
    humanApprovalRequired,
    humanApprovalGranted,
    tally,
    dissent,
    audit,
    nextAction: nextActionFor({
      decision,
      audit,
      humanApprovalRequired,
      humanApprovalGranted,
      dissent
    })
  };
}

function decisionFor({
  tally,
  audit,
  humanApprovalRequired,
  humanApprovalGranted
}: {
  tally: CabinetMotionDecisionReport["tally"];
  audit: CabinetMotionAudit;
  humanApprovalRequired: boolean;
  humanApprovalGranted: boolean;
}): CabinetMotionDecision {
  if (audit.decision === "block") return "blocked";
  if (humanApprovalRequired && !humanApprovalGranted) return "blocked";
  if (!tally.quorumMet) return "revise";
  if (tally.approve > tally.reject) return "approved";
  return "revise";
}

function reasonFor({
  decision,
  tally,
  audit,
  humanApprovalRequired,
  humanApprovalGranted
}: {
  decision: CabinetMotionDecision;
  tally: CabinetMotionDecisionReport["tally"];
  audit: CabinetMotionAudit;
  humanApprovalRequired: boolean;
  humanApprovalGranted: boolean;
}) {
  if (audit.decision === "block") return "audit-blocked";
  if (humanApprovalRequired && !humanApprovalGranted) return "human-approval-required";
  if (!tally.quorumMet) return "quorum-not-met";
  if (decision === "approved" && audit.decision === "warn") return "approved-with-audit-warning";
  if (decision === "approved") return "approved-by-majority";
  return "needs-revision-by-vote";
}

function nextActionFor({
  decision,
  audit,
  humanApprovalRequired,
  humanApprovalGranted,
  dissent
}: {
  decision: CabinetMotionDecision;
  audit: CabinetMotionAudit;
  humanApprovalRequired: boolean;
  humanApprovalGranted: boolean;
  dissent: CabinetMotionDecisionReport["dissent"];
}) {
  if (audit.decision === "block") {
    return "Resolve audit blockers before any external runner receives the task.";
  }
  if (humanApprovalRequired && !humanApprovalGranted) {
    return "Show the exact runner, worktree, command preset, and evidence contract for human approval.";
  }
  if (decision === "approved" && dissent.length > 0) {
    return "Execute only the approved scope and attach dissent notes to the runner receipt for review.";
  }
  if (decision === "approved") {
    return "Dispatch to the selected governed runner and require receipt/evidence before completion.";
  }
  return "Revise the proposal, address objections, and call another cabinet vote.";
}
