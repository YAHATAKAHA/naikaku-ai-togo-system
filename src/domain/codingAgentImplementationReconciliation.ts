import { updateDevelopmentWorkItemStatus } from "./developmentBoard";
import type {
  CodingAgentImplementationEvidence,
  CodingAgentImplementationReconciliationDecision,
  CodingAgentImplementationReconciliation,
  CodingAgentImplementationReconciliationItem,
  DevelopmentWorkItem
} from "./types";

export interface ReconcileCodingAgentImplementationEvidenceInput {
  evidence: CodingAgentImplementationEvidence;
  items: DevelopmentWorkItem[];
  generatedAt?: string;
}

export interface ReconcileCodingAgentImplementationEvidenceResult {
  reconciliation: CodingAgentImplementationReconciliation;
  updatedItems: DevelopmentWorkItem[];
}

export function reconcileCodingAgentImplementationEvidence({
  evidence,
  items,
  generatedAt = new Date().toISOString()
}: ReconcileCodingAgentImplementationEvidenceInput): ReconcileCodingAgentImplementationEvidenceResult {
  const byId = new Map(items.map((item) => [item.id, item]));
  const updatedById = new Map(items.map((item) => [item.id, item]));
  const reconciliationItems: CodingAgentImplementationReconciliationItem[] = evidence.items.map((item) => {
    if (!item.accepted || evidence.decision !== "accepted-for-handoff") {
      return {
        sessionId: item.sessionId,
        sourceItemId: item.sourceItemId,
        title: item.title,
        applied: false,
        reason: evidence.decision === "accepted-for-handoff"
          ? "Implementation evidence item was not accepted."
          : `Implementation evidence decision is ${evidence.decision}.`
      };
    }

    if (!item.sourceItemId) {
      return {
        sessionId: item.sessionId,
        title: item.title,
        applied: false,
        reason: "No source development item id was available."
      };
    }

    const current = byId.get(item.sourceItemId);
    if (!current) {
      return {
        sessionId: item.sessionId,
        sourceItemId: item.sourceItemId,
        title: item.title,
        applied: false,
        reason: "Source development item was not found in the current board."
      };
    }

    if (current.status === "done") {
      return {
        sessionId: item.sessionId,
        sourceItemId: item.sourceItemId,
        title: item.title,
        currentStatus: current.status,
        nextStatus: current.status,
        applied: false,
        reason: "Source development item was already done."
      };
    }

    if (current.status === "blocked") {
      return {
        sessionId: item.sessionId,
        sourceItemId: item.sourceItemId,
        title: item.title,
        currentStatus: current.status,
        nextStatus: current.status,
        applied: false,
        reason: "Source development item is blocked and requires operator review before status changes."
      };
    }

    const next = updateDevelopmentWorkItemStatus({
      item: current,
      status: "done",
      updatedAt: generatedAt
    });
    updatedById.set(next.id, next);

    return {
      sessionId: item.sessionId,
      sourceItemId: item.sourceItemId,
      title: item.title,
      currentStatus: current.status,
      nextStatus: "done",
      applied: true,
      reason: "Accepted implementation evidence marked the source development item done."
    };
  });

  const summary = {
    total: reconciliationItems.length,
    matched: reconciliationItems.filter((item) => item.sourceItemId && byId.has(item.sourceItemId)).length,
    applied: reconciliationItems.filter((item) => item.applied).length,
    alreadyDone: reconciliationItems.filter((item) => item.reason === "Source development item was already done.").length,
    skipped: reconciliationItems.filter((item) => !item.applied).length,
    blocked: reconciliationItems.filter((item) => item.reason.includes("blocked") || evidence.decision === "blocked").length
  };

  return {
    reconciliation: {
      schema: "naikaku.coding-agent-implementation-reconciliation.v1",
      generatedAt,
      sourceSchema: evidence.schema,
      sourceDecision: evidence.decision,
      decision: reconciliationDecision(summary),
      runId: evidence.runId,
      items: reconciliationItems,
      summary,
      honestyClaim: {
        claim: "This reconciliation updates local development-board status from accepted implementation evidence.",
        limitations: [
          "It does not independently rerun verification commands.",
          "It does not inspect changed files or artifact paths.",
          "Blocked development items are not automatically resolved."
        ]
      }
    },
    updatedItems: items.map((item) => updatedById.get(item.id) || item)
  };
}

function reconciliationDecision(
  summary: CodingAgentImplementationReconciliation["summary"]
): CodingAgentImplementationReconciliationDecision {
  if (summary.blocked > 0 && summary.applied === 0) return "blocked";
  if (summary.matched === 0) return "no-match";
  if (summary.applied > 0 && summary.skipped === 0) return "applied";
  if (summary.applied > 0 || summary.alreadyDone > 0 || summary.matched > 0) return "partial";
  return "no-match";
}
