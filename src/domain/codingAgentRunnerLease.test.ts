import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import {
  buildCodingAgentRunnerLeaseLedger,
  claimAvailableCodingAgentRunnerLeases,
  claimCodingAgentRunnerLease,
  serializeCodingAgentRunnerLeaseLedger,
  serializeCodingAgentRunnerLeaseLedgerMarkdown,
  validateCodingAgentRunnerLeaseForPreflight
} from "./codingAgentRunnerLease";
import { buildCodingAgentRunnerSelfTest } from "./codingAgentRunnerSelfTest";
import { buildCodingAgentSandboxRunnerPreflight } from "./codingAgentSandboxRunnerPreflight";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";
import type { ExecutorProfileId } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent runner lease", () => {
  it("leases a would-run task once and treats same-runner retries as idempotent", () => {
    const selfTest = defaultSelfTest();
    const firstTask = selfTest.items.find((item) => item.selfTestStatus === "would-run");
    if (!firstTask) throw new Error("Fixture must include a would-run task.");
    const ledger = buildCodingAgentRunnerLeaseLedger({
      selfTest,
      generatedAt: "2026-06-27T00:00:00.000Z"
    });
    const leased = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-alpha",
      allowedExecutorProfiles: [firstTask.executorProfileId],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:01:00.000Z"
    });
    const retried = claimCodingAgentRunnerLease({
      ledger: leased,
      runnerId: "runner-alpha",
      allowedExecutorProfiles: [firstTask.executorProfileId],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:02:00.000Z"
    });

    expect(leased.decision).toBe("lease-ready");
    expect(leased.summary.activeLeases).toBe(1);
    expect(leased.summary.grantedAttempts).toBe(1);
    expect(leased.items.find((item) => item.sessionId === firstTask.sessionId)?.leaseStatus).toBe("leased");
    expect(retried.summary.activeLeases).toBe(1);
    expect(retried.summary.idempotentClaims).toBe(1);
    expect(retried.attempts.at(-1)?.decision).toBe("already-leased");
    expect(retried.attempts.at(-1)?.leaseId).toBe(leased.leases[0].leaseId);
  });

  it("blocks a competing runner while a lease is active", () => {
    const selfTest = defaultSelfTest();
    const firstTask = selfTest.items.find((item) => item.selfTestStatus === "would-run");
    if (!firstTask) throw new Error("Fixture must include a would-run task.");
    const ledger = claimCodingAgentRunnerLease({
      ledger: buildCodingAgentRunnerLeaseLedger({ selfTest }),
      runnerId: "runner-alpha",
      allowedExecutorProfiles: [firstTask.executorProfileId],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });
    const contested = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-beta",
      allowedExecutorProfiles: [firstTask.executorProfileId],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:05:00.000Z"
    });

    expect(contested.summary.activeLeases).toBe(1);
    expect(contested.summary.duplicateBlocks).toBe(1);
    expect(contested.summary.deniedAttempts).toBe(1);
    expect(contested.attempts.at(-1)?.decision).toBe("denied");
    expect(contested.attempts.at(-1)?.reason).toContain("active lease owned by runner-alpha");
  });

  it("expires and reclaims leases after the TTL", () => {
    const selfTest = defaultSelfTest();
    const firstTask = selfTest.items.find((item) => item.selfTestStatus === "would-run");
    if (!firstTask) throw new Error("Fixture must include a would-run task.");
    const leased = claimCodingAgentRunnerLease({
      ledger: buildCodingAgentRunnerLeaseLedger({
        selfTest,
        leaseTtlMs: 60_000
      }),
      runnerId: "runner-alpha",
      allowedExecutorProfiles: [firstTask.executorProfileId],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });
    const reclaimed = claimCodingAgentRunnerLease({
      ledger: leased,
      runnerId: "runner-beta",
      allowedExecutorProfiles: [firstTask.executorProfileId],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:02:00.000Z"
    });

    expect(reclaimed.summary.activeLeases).toBe(1);
    expect(reclaimed.summary.expiredLeases).toBe(1);
    expect(reclaimed.summary.reclaimedLeases).toBe(1);
    expect(reclaimed.leases.find((lease) => lease.runnerId === "runner-alpha")?.status).toBe("expired");
    expect(reclaimed.leases.find((lease) => lease.runnerId === "runner-beta")?.status).toBe("active");
    expect(reclaimed.attempts.at(-1)?.decision).toBe("reclaimed");
  });

  it("denies runner claims outside their executor profile scope", () => {
    const selfTest = defaultSelfTest();
    const firstTask = selfTest.items.find((item) => item.selfTestStatus === "would-run");
    if (!firstTask) throw new Error("Fixture must include a would-run task.");
    const deniedProfile = otherProfile(firstTask.executorProfileId);
    const ledger = claimCodingAgentRunnerLease({
      ledger: buildCodingAgentRunnerLeaseLedger({ selfTest }),
      runnerId: "runner-wrong-profile",
      allowedExecutorProfiles: [deniedProfile],
      requestedSessionId: firstTask.sessionId,
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(ledger.summary.activeLeases).toBe(0);
    expect(ledger.summary.profileDeniedAttempts).toBe(1);
    expect(ledger.summary.deniedAttempts).toBe(1);
    expect(ledger.attempts.at(-1)?.decision).toBe("denied");
    expect(ledger.attempts.at(-1)?.reason).toContain(firstTask.executorProfileId);
  });

  it("validates active leases for every ready preflight task", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({ selfTest, bundle });
    const ledger = claimAvailableCodingAgentRunnerLeases({
      ledger: buildCodingAgentRunnerLeaseLedger({
        selfTest,
        leaseTtlMs: 60_000
      }),
      runnerId: "runner-alpha",
      allowedExecutorProfiles: ["shell-container", "browser-sandbox", "desktop-vm", "mcp-proxy", "human-approval"],
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });
    const validation = validateCodingAgentRunnerLeaseForPreflight({
      ledger,
      preflight,
      runnerId: "runner-alpha",
      checkedAt: "2026-06-27T00:00:30.000Z"
    });

    expect(ledger.summary.activeLeases).toBe(preflight.summary.readyTasks);
    expect(validation.ok).toBe(true);
    expect(validation.acceptedLeaseIds).toHaveLength(preflight.summary.readyTasks);
    expect(validation.missingSessionIds).toEqual([]);
    expect(validation.unissuedSessionIds).toEqual([]);
  });

  it("fails validation when ready tasks are missing leases", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({ selfTest, bundle });
    const ledger = buildCodingAgentRunnerLeaseLedger({ selfTest });
    const validation = validateCodingAgentRunnerLeaseForPreflight({
      ledger,
      preflight,
      runnerId: "runner-alpha",
      checkedAt: "2026-06-27T00:00:30.000Z"
    });

    expect(validation.ok).toBe(false);
    expect(validation.missingSessionIds).toHaveLength(preflight.summary.readyTasks);
    expect(validation.message).toContain("Missing active leases");
  });

  it("fails validation when leases belong to another runner or are expired", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({ selfTest, bundle });
    const ledger = claimAvailableCodingAgentRunnerLeases({
      ledger: buildCodingAgentRunnerLeaseLedger({
        selfTest,
        leaseTtlMs: 60_000
      }),
      runnerId: "runner-alpha",
      allowedExecutorProfiles: ["shell-container", "browser-sandbox", "desktop-vm", "mcp-proxy", "human-approval"],
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });
    const wrongRunner = validateCodingAgentRunnerLeaseForPreflight({
      ledger,
      preflight,
      runnerId: "runner-beta",
      checkedAt: "2026-06-27T00:00:30.000Z"
    });
    const expired = validateCodingAgentRunnerLeaseForPreflight({
      ledger,
      preflight,
      runnerId: "runner-alpha",
      checkedAt: "2026-06-27T00:02:00.000Z"
    });

    expect(wrongRunner.ok).toBe(false);
    expect(wrongRunner.runnerMismatchSessionIds).toHaveLength(preflight.summary.readyTasks);
    expect(expired.ok).toBe(false);
    expect(expired.expiredSessionIds).toHaveLength(preflight.summary.readyTasks);
  });

  it("fails validation when the lease ledger came from a different self-test source", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({ selfTest, bundle });
    const ledger = claimAvailableCodingAgentRunnerLeases({
      ledger: {
        ...buildCodingAgentRunnerLeaseLedger({ selfTest }),
        runId: "different-run"
      },
      runnerId: "runner-alpha",
      allowedExecutorProfiles: ["shell-container", "browser-sandbox", "desktop-vm", "mcp-proxy", "human-approval"],
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });
    const validation = validateCodingAgentRunnerLeaseForPreflight({
      ledger,
      preflight,
      runnerId: "runner-alpha",
      checkedAt: "2026-06-27T00:00:30.000Z"
    });

    expect(validation.ok).toBe(false);
    expect(validation.sourceMismatch).toBe(true);
    expect(validation.message).toContain("does not match");
  });

  it("keeps production-held self-tests out of the lease queue", () => {
    const selfTest = productionHeldSelfTest();
    const ledger = buildCodingAgentRunnerLeaseLedger({ selfTest });
    const attempted = claimCodingAgentRunnerLease({
      ledger,
      runnerId: "runner-alpha",
      allowedExecutorProfiles: ["shell-container"],
      attemptedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(ledger.decision).toBe("needs-review");
    expect(ledger.summary.availableTasks).toBe(0);
    expect(ledger.summary.activeLeases).toBe(0);
    expect(ledger.summary.heldTasks).toBe(selfTest.items.length);
    expect(attempted.summary.deniedAttempts).toBe(1);
    expect(attempted.attempts.at(-1)?.decision).toBe("no-task");
  });

  it("serializes lease JSON and Markdown", () => {
    const ledger = buildCodingAgentRunnerLeaseLedger({
      selfTest: defaultSelfTest()
    });
    const parsed = JSON.parse(serializeCodingAgentRunnerLeaseLedger(ledger));
    const markdown = serializeCodingAgentRunnerLeaseLedgerMarkdown(ledger);

    expect(parsed.schema).toBe("naikaku.coding-agent-runner-lease.v1");
    expect(markdown).toContain("Coding Agent Runner Lease Ledger");
    expect(markdown).toContain("Honesty Boundary");
  });
});

function defaultSelfTest(bundle?: ReturnType<typeof defaultBundle>) {
  const manifest = defaultRunnerManifest(bundle);
  return buildCodingAgentRunnerSelfTest({
    manifest,
    generatedAt: manifest.generatedAt
  });
}

function productionHeldSelfTest() {
  const bundle = buildCodingAgentSessionBundle({
    briefs: defaultBriefs(),
    requireProductionEvidence: true
  });
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle })
  });
  const archive = buildCodingAgentDispatchArchive({ bundle, manifest: dispatch });
  const audit = auditCodingAgentDispatchArchive({ archive });
  const simulation = buildCodingAgentDispatchSimulation({ manifest: dispatch, archiveAudit: audit });
  const manifest = buildCodingAgentRunnerManifest({ simulation });
  return buildCodingAgentRunnerSelfTest({ manifest });
}

function defaultRunnerManifest(bundle?: ReturnType<typeof defaultBundle>) {
  const simulation = defaultSimulation(bundle);
  return buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: draftPathsFor(simulation),
    generatedAt: simulation.generatedAt
  });
}

function defaultSimulation(bundle = defaultBundle()) {
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle }),
    generatedAt: bundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest: dispatch,
    generatedAt: dispatch.generatedAt
  });
  const audit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: dispatch.generatedAt
  });
  return buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit: audit,
    generatedAt: dispatch.generatedAt
  });
}

function draftPathsFor(simulation: ReturnType<typeof defaultSimulation>) {
  return Object.fromEntries(simulation.items.map((item, index) => [
    item.sessionId,
    `output/coding-agent-dispatch-simulation/valid/receipt-drafts/${String(index + 1).padStart(2, "0")}-${item.sessionId}.json`
  ]));
}

function defaultBundle() {
  const briefs = defaultBriefs();
  return buildCodingAgentSessionBundle({
    briefs,
    generatedAt: briefs.generatedAt
  });
}

function defaultBriefs() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  return buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
}

function otherProfile(profile: ExecutorProfileId): ExecutorProfileId {
  return profile === "shell-container" ? "browser-sandbox" : "shell-container";
}
