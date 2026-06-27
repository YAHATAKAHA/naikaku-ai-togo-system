import { createHash } from "node:crypto";
import type {
  CodingAgentRunnerLeaseAttempt,
  CodingAgentRunnerLeaseDecision,
  CodingAgentRunnerLeaseItem,
  CodingAgentRunnerLeaseItemStatus,
  CodingAgentRunnerLeaseLedger,
  CodingAgentRunnerLeaseRecord,
  CodingAgentRunnerSelfTest,
  CodingAgentRunnerSelfTestItem,
  ExecutorProfileId
} from "./types";

export const defaultCodingAgentRunnerLeaseTtlMs = 30 * 60 * 1000;

export interface BuildCodingAgentRunnerLeaseLedgerInput {
  selfTest: CodingAgentRunnerSelfTest;
  generatedAt?: string;
  leaseTtlMs?: number;
}

export interface ClaimCodingAgentRunnerLeaseInput {
  ledger: CodingAgentRunnerLeaseLedger;
  runnerId: string;
  allowedExecutorProfiles: ExecutorProfileId[];
  requestedSessionId?: string;
  attemptedAt?: string;
}

export function buildCodingAgentRunnerLeaseLedger({
  selfTest,
  generatedAt = new Date().toISOString(),
  leaseTtlMs = defaultCodingAgentRunnerLeaseTtlMs
}: BuildCodingAgentRunnerLeaseLedgerInput): CodingAgentRunnerLeaseLedger {
  return finalizeLedger({
    schema: "naikaku.coding-agent-runner-lease.v1",
    generatedAt,
    mode: "runner-task-lease",
    sourceSchema: selfTest.schema,
    sourceDecision: selfTest.decision,
    decision: "needs-review",
    runId: selfTest.runId,
    operatorLocale: selfTest.operatorLocale,
    leaseTtlMs,
    items: selfTest.items.map(itemFor),
    leases: [],
    attempts: [],
    summary: emptySummary(),
    honestyClaim: honestyClaim()
  });
}

export function claimCodingAgentRunnerLease({
  ledger,
  runnerId,
  allowedExecutorProfiles,
  requestedSessionId,
  attemptedAt = new Date().toISOString()
}: ClaimCodingAgentRunnerLeaseInput): CodingAgentRunnerLeaseLedger {
  const normalizedProfiles = [...new Set(allowedExecutorProfiles)];
  const base = expireLeases(ledger, attemptedAt);
  const target = selectTargetItem({
    ledger: base,
    allowedExecutorProfiles: normalizedProfiles,
    requestedSessionId
  });

  if (!target) {
    return appendAttempt(base, {
      attemptedAt,
      runnerId,
      allowedExecutorProfiles: normalizedProfiles,
      requestedSessionId: requestedSessionId || null,
      decision: "no-task",
      sessionId: null,
      leaseId: null,
      reason: requestedSessionId
        ? "Requested session is missing or not available for this runner profile."
        : "No available would-run task matches this runner profile."
    });
  }

  if (target.sourceSelfTestStatus !== "would-run") {
    return appendAttempt(base, {
      attemptedAt,
      runnerId,
      allowedExecutorProfiles: normalizedProfiles,
      requestedSessionId: requestedSessionId || target.sessionId,
      decision: "denied",
      sessionId: target.sessionId,
      leaseId: null,
      reason: `Session is ${target.sourceSelfTestStatus} and cannot be leased.`
    });
  }

  if (!normalizedProfiles.includes(target.executorProfileId)) {
    return appendAttempt(base, {
      attemptedAt,
      runnerId,
      allowedExecutorProfiles: normalizedProfiles,
      requestedSessionId: requestedSessionId || target.sessionId,
      decision: "denied",
      sessionId: target.sessionId,
      leaseId: null,
      reason: `Runner is not scoped for ${target.executorProfileId}.`
    });
  }

  const activeLease = activeLeaseFor(base, target.sessionId);
  if (activeLease && activeLease.runnerId === runnerId) {
    return appendAttempt(base, {
      attemptedAt,
      runnerId,
      allowedExecutorProfiles: normalizedProfiles,
      requestedSessionId: requestedSessionId || target.sessionId,
      decision: "already-leased",
      sessionId: target.sessionId,
      leaseId: activeLease.leaseId,
      reason: "Runner already owns the active lease; claim is idempotent."
    });
  }

  if (activeLease) {
    return appendAttempt(base, {
      attemptedAt,
      runnerId,
      allowedExecutorProfiles: normalizedProfiles,
      requestedSessionId: requestedSessionId || target.sessionId,
      decision: "denied",
      sessionId: target.sessionId,
      leaseId: activeLease.leaseId,
      reason: `Session already has an active lease owned by ${activeLease.runnerId}.`
    });
  }

  const hadExpiredLease = base.leases.some((lease) =>
    lease.sessionId === target.sessionId && lease.status === "expired"
  );
  const lease = leaseFor({
    ledger: base,
    item: target,
    runnerId,
    issuedAt: attemptedAt
  });
  const nextItems = base.items.map((item) =>
    item.sessionId === target.sessionId
      ? {
        ...item,
        leaseStatus: "leased" as const,
        activeLeaseId: lease.leaseId,
        nextAction: "Run this task only inside the leased governed runner workspace, then return a completed receipt for review."
      }
      : item
  );

  return appendAttempt({
    ...base,
    items: nextItems,
    leases: [...base.leases, lease]
  }, {
    attemptedAt,
    runnerId,
    allowedExecutorProfiles: normalizedProfiles,
    requestedSessionId: requestedSessionId || target.sessionId,
    decision: hadExpiredLease ? "reclaimed" : "leased",
    sessionId: target.sessionId,
    leaseId: lease.leaseId,
    reason: hadExpiredLease
      ? "Expired lease was reclaimed by a scoped runner."
      : "Lease granted to a scoped runner."
  });
}

export function serializeCodingAgentRunnerLeaseLedger(ledger: CodingAgentRunnerLeaseLedger) {
  return JSON.stringify(ledger, null, 2);
}

export function serializeCodingAgentRunnerLeaseLedgerMarkdown(ledger: CodingAgentRunnerLeaseLedger) {
  return [
    "# Coding Agent Runner Lease Ledger",
    "",
    `Mode: ${ledger.mode}`,
    `Decision: ${ledger.decision}`,
    `Source decision: ${ledger.sourceDecision}`,
    `Locale: ${ledger.operatorLocale}`,
    `Run: ${ledger.runId || "workspace"}`,
    `Generated: ${ledger.generatedAt}`,
    `Lease TTL ms: ${ledger.leaseTtlMs}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${ledger.honestyClaim.claim}`,
    ...ledger.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...ledger.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Available tasks: ${ledger.summary.availableTasks}`,
    `- Active leases: ${ledger.summary.activeLeases}`,
    `- Expired leases: ${ledger.summary.expiredLeases}`,
    `- Held tasks: ${ledger.summary.heldTasks}`,
    `- Blocked tasks: ${ledger.summary.blockedTasks}`,
    `- Attempts: ${ledger.summary.attempts}`,
    `- Granted attempts: ${ledger.summary.grantedAttempts}`,
    `- Idempotent claims: ${ledger.summary.idempotentClaims}`,
    `- Reclaimed leases: ${ledger.summary.reclaimedLeases}`,
    `- Denied attempts: ${ledger.summary.deniedAttempts}`,
    "",
    "## Attempts",
    "",
    ...(ledger.attempts.length ? ledger.attempts : []).map((attempt) =>
      `- ${attempt.decision}: ${attempt.runnerId} -> ${attempt.sessionId || "none"} (${attempt.reason})`
    ),
    "",
    "## Tasks",
    "",
    ...ledger.items.flatMap((item, index) => [
      `## ${index + 1}. ${item.title}`,
      "",
      `- Session: ${item.sessionId}`,
      `- Executor: ${item.executorProfileId}`,
      `- Self-test: ${item.sourceSelfTestStatus}`,
      `- Lease status: ${item.leaseStatus}`,
      `- Active lease: ${item.activeLeaseId || "none"}`,
      `- Next: ${item.nextAction}`,
      ""
    ])
  ].join("\n");
}

function itemFor(item: CodingAgentRunnerSelfTestItem): CodingAgentRunnerLeaseItem {
  const leaseStatus = itemStatusFor(item);
  return {
    sessionId: item.sessionId,
    sourceItemId: item.sourceItemId,
    title: item.title,
    executorProfileId: item.executorProfileId,
    sourceSelfTestStatus: item.selfTestStatus,
    leaseStatus,
    promptPath: item.promptPath,
    receiptDraftPath: item.receiptDraftPath,
    evidenceArtifactPrefix: item.evidenceArtifactPrefix,
    activeLeaseId: null,
    checks: [
      {
        id: "self-test-status",
        status: item.selfTestStatus === "would-run" ? "pass" : item.selfTestStatus === "held" ? "warn" : "block",
        summary: `Source self-test status is ${item.selfTestStatus}.`
      },
      {
        id: "lease-boundary",
        status: "pass",
        summary: "Lease planning assigns runner ownership only; it does not execute commands or prove implementation."
      }
    ],
    nextAction: nextActionFor(leaseStatus)
  };
}

function itemStatusFor(item: CodingAgentRunnerSelfTestItem): CodingAgentRunnerLeaseItemStatus {
  if (item.selfTestStatus === "blocked") return "blocked";
  if (item.selfTestStatus === "held") return "held";
  return "available";
}

function nextActionFor(status: CodingAgentRunnerLeaseItemStatus) {
  if (status === "available") return "Lease this task to exactly one scoped runner before command execution.";
  if (status === "leased") return "Wait for the owning runner receipt or lease expiry before reassigning.";
  if (status === "blocked") return "Fix blocked self-test checks before this task can be leased.";
  return "Resolve held runner checks before leasing this task.";
}

function selectTargetItem({
  ledger,
  allowedExecutorProfiles,
  requestedSessionId
}: {
  ledger: CodingAgentRunnerLeaseLedger;
  allowedExecutorProfiles: ExecutorProfileId[];
  requestedSessionId?: string;
}) {
  if (requestedSessionId) {
    return ledger.items.find((item) => item.sessionId === requestedSessionId) || null;
  }
  return ledger.items.find((item) =>
    item.sourceSelfTestStatus === "would-run" &&
    !activeLeaseFor(ledger, item.sessionId) &&
    allowedExecutorProfiles.includes(item.executorProfileId)
  ) || null;
}

function expireLeases(ledger: CodingAgentRunnerLeaseLedger, now: string): CodingAgentRunnerLeaseLedger {
  const nowMs = Date.parse(now);
  const leases = ledger.leases.map((lease) =>
    lease.status === "active" && Date.parse(lease.expiresAt) <= nowMs
      ? { ...lease, status: "expired" as const }
      : lease
  );
  const activeLeaseIds = new Set(leases
    .filter((lease) => lease.status === "active")
    .map((lease) => lease.leaseId));
  const items = ledger.items.map((item) => {
    if (!item.activeLeaseId || activeLeaseIds.has(item.activeLeaseId)) return item;
    return {
      ...item,
      activeLeaseId: null,
      leaseStatus: item.sourceSelfTestStatus === "would-run" ? "available" as const : item.leaseStatus,
      nextAction: item.sourceSelfTestStatus === "would-run"
        ? "Lease this task to exactly one scoped runner before command execution."
        : item.nextAction
    };
  });

  return finalizeLedger({
    ...ledger,
    leases,
    items
  });
}

function activeLeaseFor(ledger: CodingAgentRunnerLeaseLedger, sessionId: string) {
  return ledger.leases.find((lease) =>
    lease.sessionId === sessionId && lease.status === "active"
  ) || null;
}

function leaseFor({
  ledger,
  item,
  runnerId,
  issuedAt
}: {
  ledger: CodingAgentRunnerLeaseLedger;
  item: CodingAgentRunnerLeaseItem;
  runnerId: string;
  issuedAt: string;
}): CodingAgentRunnerLeaseRecord {
  return {
    leaseId: `lease-${hashFor([
      ledger.runId || "workspace",
      item.sessionId,
      runnerId,
      issuedAt
    ])}`,
    sessionId: item.sessionId,
    runnerId,
    executorProfileId: item.executorProfileId,
    issuedAt,
    expiresAt: new Date(Date.parse(issuedAt) + ledger.leaseTtlMs).toISOString(),
    status: "active"
  };
}

function appendAttempt(
  ledger: CodingAgentRunnerLeaseLedger,
  attempt: Omit<CodingAgentRunnerLeaseAttempt, "attemptId">
) {
  return finalizeLedger({
    ...ledger,
    attempts: [
      ...ledger.attempts,
      {
        attemptId: `attempt-${hashFor([
          ledger.runId || "workspace",
          attempt.runnerId,
          attempt.requestedSessionId || "auto",
          attempt.attemptedAt,
          String(ledger.attempts.length + 1)
        ])}`,
        ...attempt
      }
    ]
  });
}

function finalizeLedger(ledger: CodingAgentRunnerLeaseLedger): CodingAgentRunnerLeaseLedger {
  const activeLeaseIds = new Set(ledger.leases
    .filter((lease) => lease.status === "active")
    .map((lease) => lease.leaseId));
  const items = ledger.items.map((item) => {
    if (!item.activeLeaseId || !activeLeaseIds.has(item.activeLeaseId)) return item;
    return {
      ...item,
      leaseStatus: "leased" as const
    };
  });
  const summary = summaryFor({
    ...ledger,
    items
  });
  const decision = decisionFor({
    ...ledger,
    items,
    summary
  });

  return {
    ...ledger,
    items,
    summary,
    decision
  };
}

function summaryFor(ledger: CodingAgentRunnerLeaseLedger): CodingAgentRunnerLeaseLedger["summary"] {
  return {
    total: ledger.items.length,
    availableTasks: ledger.items.filter((item) => item.leaseStatus === "available").length,
    activeLeases: ledger.leases.filter((lease) => lease.status === "active").length,
    expiredLeases: ledger.leases.filter((lease) => lease.status === "expired").length,
    heldTasks: ledger.items.filter((item) => item.leaseStatus === "held").length,
    blockedTasks: ledger.items.filter((item) => item.leaseStatus === "blocked").length,
    attempts: ledger.attempts.length,
    grantedAttempts: ledger.attempts.filter((attempt) =>
      attempt.decision === "leased" || attempt.decision === "reclaimed"
    ).length,
    idempotentClaims: ledger.attempts.filter((attempt) => attempt.decision === "already-leased").length,
    reclaimedLeases: ledger.attempts.filter((attempt) => attempt.decision === "reclaimed").length,
    deniedAttempts: ledger.attempts.filter((attempt) => attempt.decision === "denied" || attempt.decision === "no-task").length,
    duplicateBlocks: ledger.attempts.filter((attempt) => attempt.reason.includes("active lease owned")).length,
    profileDeniedAttempts: ledger.attempts.filter((attempt) => attempt.reason.includes("not scoped")).length
  };
}

function decisionFor(ledger: CodingAgentRunnerLeaseLedger): CodingAgentRunnerLeaseDecision {
  if (ledger.sourceDecision === "blocked" || ledger.summary.blockedTasks > 0) return "blocked";
  if (ledger.summary.availableTasks + ledger.summary.activeLeases + ledger.summary.expiredLeases === 0) {
    return "needs-review";
  }
  return "lease-ready";
}

function emptySummary(): CodingAgentRunnerLeaseLedger["summary"] {
  return {
    total: 0,
    availableTasks: 0,
    activeLeases: 0,
    expiredLeases: 0,
    heldTasks: 0,
    blockedTasks: 0,
    attempts: 0,
    grantedAttempts: 0,
    idempotentClaims: 0,
    reclaimedLeases: 0,
    deniedAttempts: 0,
    duplicateBlocks: 0,
    profileDeniedAttempts: 0
  };
}

function honestyClaim(): CodingAgentRunnerLeaseLedger["honestyClaim"] {
  return {
    level: "runner-task-lease",
    claim: "This ledger coordinates exclusive runner task ownership before sandbox execution without running commands or claiming implementation work.",
    limitations: [
      "It does not read prompt contents, run shell commands, open browsers, control desktops, call MCP tools, call providers, edit files, deploy, commit, or push.",
      "A lease only proves which scoped runner may attempt a task until expiry; it is not a completed receipt or implementation evidence.",
      "Expired leases can be reclaimed, but completed work still requires reviewed receipts, transcripts, artifacts, and artifact audits."
    ],
    productionRequirements: [
      "Persist lease ledgers in a gateway-backed store before production runner fleets attach.",
      "Require authenticated runner identity and executor profile scope for every claim.",
      "Accept implementation only through completed receipts and artifact audits after the leased runner finishes."
    ]
  };
}

function hashFor(parts: string[]) {
  return createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 16);
}
