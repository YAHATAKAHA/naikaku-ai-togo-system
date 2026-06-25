import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../src/data/defaultCabinet";
import { buildExecutorHandoff, createApprovalRecord } from "../src/domain/automation";
import { buildExecutorEvidenceBundle, runExecutorHandoff } from "../src/domain/executorRunner";
import { runCabinetMission } from "../src/domain/orchestrator";
import {
  ledgerSummary,
  listApprovalRecordsFromLedger,
  listEvidenceBundlesFromLedger,
  saveApprovalRecordToLedger,
  saveEvidenceBundleToLedger
} from "./ledgerStore";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "naikaku-ledger-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("ledger store", () => {
  it("upserts approval records by run action", async () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const action = run.automationActions?.find((candidate) => candidate.status === "needs-approval");
    if (!action) {
      throw new Error("Expected an approval-gated action.");
    }
    const approved = createApprovalRecord({ action, decision: "approved" });
    const rejected = createApprovalRecord({ action, decision: "rejected" });

    await saveApprovalRecordToLedger({ record: approved, dir });
    await saveApprovalRecordToLedger({ record: rejected, dir });

    const records = await listApprovalRecordsFromLedger({ runId: run.id, dir });
    expect(records).toHaveLength(1);
    expect(records[0].decision).toBe("rejected");
  });

  it("upserts evidence bundles by executor run id", async () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const action = run.automationActions?.find((candidate) => candidate.status === "needs-approval");
    if (!action) {
      throw new Error("Expected an approval-gated action.");
    }
    const approval = createApprovalRecord({ action, decision: "approved" });
    const handoff = buildExecutorHandoff({ run, approvalRecords: [approval] });
    const executorRun = runExecutorHandoff({ handoff });
    const firstBundle = buildExecutorEvidenceBundle({
      executorRun,
      exportedAt: "2026-06-25T00:00:00.000Z"
    });
    const secondBundle = buildExecutorEvidenceBundle({
      executorRun,
      exportedAt: "2026-06-25T00:01:00.000Z"
    });

    await saveEvidenceBundleToLedger({ bundle: firstBundle, dir });
    await saveEvidenceBundleToLedger({ bundle: secondBundle, dir });

    const bundles = await listEvidenceBundlesFromLedger({ runId: run.id, dir });
    expect(bundles).toHaveLength(1);
    expect(bundles[0].exportedAt).toBe("2026-06-25T00:01:00.000Z");
    expect(bundles[0].summary.evidenceItems).toBeGreaterThan(0);
  });

  it("summarizes approvals and evidence bundles", async () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const action = run.automationActions?.find((candidate) => candidate.status === "needs-approval");
    if (!action) {
      throw new Error("Expected an approval-gated action.");
    }
    const approval = createApprovalRecord({ action, decision: "approved" });
    const handoff = buildExecutorHandoff({ run, approvalRecords: [approval] });
    const executorRun = runExecutorHandoff({ handoff });

    await saveApprovalRecordToLedger({ record: approval, dir });
    await saveEvidenceBundleToLedger({
      bundle: buildExecutorEvidenceBundle({ executorRun }),
      dir
    });

    const summary = await ledgerSummary({ dir });
    expect(summary.schema).toBe("naikaku.ledger-summary.v1");
    expect(summary.approvals).toBe(1);
    expect(summary.evidenceBundles).toBe(1);
  });
});
