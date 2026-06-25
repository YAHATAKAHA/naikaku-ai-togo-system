import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AutomationApprovalRecord,
  ExecutorEvidenceBundle
} from "../src/domain/types";

export interface LedgerEnv {
  NAIKAKU_LEDGER_DIR?: string;
}

export interface LedgerSummary {
  schema: "naikaku.ledger-summary.v1";
  ledgerDir: string;
  approvals: number;
  evidenceBundles: number;
  updatedAt: string;
}

interface ApprovalLedger {
  schema: "naikaku.approval-ledger.v1";
  updatedAt: string;
  records: AutomationApprovalRecord[];
}

interface EvidenceLedger {
  schema: "naikaku.evidence-ledger.v1";
  updatedAt: string;
  bundles: ExecutorEvidenceBundle[];
}

export function ledgerDir(env: LedgerEnv = process.env) {
  return env.NAIKAKU_LEDGER_DIR || join(process.cwd(), ".naikaku-data");
}

export async function saveApprovalRecordToLedger({
  record,
  dir = ledgerDir()
}: {
  record: AutomationApprovalRecord;
  dir?: string;
}) {
  const ledger = await readApprovalLedger(dir);
  const records = [
    record,
    ...ledger.records.filter(
      (candidate) =>
        candidate.runId !== record.runId || candidate.actionId !== record.actionId
    )
  ];
  const nextLedger: ApprovalLedger = {
    schema: "naikaku.approval-ledger.v1",
    updatedAt: new Date().toISOString(),
    records
  };

  await writeLedger(approvalPath(dir), nextLedger);
  return record;
}

export async function listApprovalRecordsFromLedger({
  runId,
  dir = ledgerDir()
}: {
  runId?: string;
  dir?: string;
} = {}) {
  const ledger = await readApprovalLedger(dir);
  return runId ? ledger.records.filter((record) => record.runId === runId) : ledger.records;
}

export async function saveEvidenceBundleToLedger({
  bundle,
  dir = ledgerDir()
}: {
  bundle: ExecutorEvidenceBundle;
  dir?: string;
}) {
  const ledger = await readEvidenceLedger(dir);
  const bundles = [
    bundle,
    ...ledger.bundles.filter(
      (candidate) => candidate.executorRunId !== bundle.executorRunId
    )
  ];
  const nextLedger: EvidenceLedger = {
    schema: "naikaku.evidence-ledger.v1",
    updatedAt: new Date().toISOString(),
    bundles
  };

  await writeLedger(evidencePath(dir), nextLedger);
  return bundle;
}

export async function listEvidenceBundlesFromLedger({
  runId,
  executorRunId,
  dir = ledgerDir()
}: {
  runId?: string;
  executorRunId?: string;
  dir?: string;
} = {}) {
  const ledger = await readEvidenceLedger(dir);
  return ledger.bundles.filter((bundle) => {
    if (runId && bundle.runId !== runId) return false;
    if (executorRunId && bundle.executorRunId !== executorRunId) return false;
    return true;
  });
}

export async function ledgerSummary({
  dir = ledgerDir()
}: {
  dir?: string;
} = {}): Promise<LedgerSummary> {
  const [approvalLedger, evidenceLedger] = await Promise.all([
    readApprovalLedger(dir),
    readEvidenceLedger(dir)
  ]);

  return {
    schema: "naikaku.ledger-summary.v1",
    ledgerDir: dir,
    approvals: approvalLedger.records.length,
    evidenceBundles: evidenceLedger.bundles.length,
    updatedAt: new Date().toISOString()
  };
}

async function readApprovalLedger(dir: string): Promise<ApprovalLedger> {
  return readLedger<ApprovalLedger>(approvalPath(dir), {
    schema: "naikaku.approval-ledger.v1",
    updatedAt: new Date().toISOString(),
    records: []
  });
}

async function readEvidenceLedger(dir: string): Promise<EvidenceLedger> {
  return readLedger<EvidenceLedger>(evidencePath(dir), {
    schema: "naikaku.evidence-ledger.v1",
    updatedAt: new Date().toISOString(),
    bundles: []
  });
}

async function readLedger<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeLedger(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, path);
}

function approvalPath(dir: string) {
  return join(dir, "approvals.json");
}

function evidencePath(dir: string) {
  return join(dir, "evidence-bundles.json");
}
