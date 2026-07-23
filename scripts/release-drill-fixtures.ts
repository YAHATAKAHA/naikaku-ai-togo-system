import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createApprovalRecord } from "../src/domain/automation";
import { createAuditEvent, serializeAuditEvents } from "../src/domain/auditLog";
import { buildMemoryCandidates, createMemoryDecision, serializeMemoryEntries } from "../src/domain/memory";
import { runCabinetMission } from "../src/domain/orchestrator";
import {
  buildProviderReadinessMatrix,
  createProviderReadinessCheck,
  serializeProviderReadinessMatrix
} from "../src/domain/providerReadiness";
import { createDefaultWorkspace, serializeWorkspace } from "../src/domain/storage";
import type {
  AutomationApprovalRecord,
  AuditEvent,
  CabinetRole,
  CabinetWorkspace,
  MemoryEntry,
  ProviderReadinessMatrix
} from "../src/domain/types";

interface ReleaseDrillOptions {
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const workspace = buildReleaseDrillWorkspace();
  const run = runCabinetMission(workspace);
  const providerReadiness = buildReadyProviderMatrix(workspace, options.generatedAt);
  const approvalRecords = approveReviewableActions(run.automationActions || [], options.generatedAt);
  const auditEvents = buildAuditEvents({
    runId: run.id,
    approvals: approvalRecords,
    providerReadiness,
    generatedAt: options.generatedAt
  });
  const memoryEntries = buildReviewedMemory(run, options.generatedAt);

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "workspace.json"), serializeWorkspace(workspace));
  await writeFile(path.join(outputDir, "run.json"), serializeRun(run));
  await writeFile(path.join(outputDir, "provider-readiness.json"), serializeProviderReadinessMatrix(providerReadiness));
  await writeFile(path.join(outputDir, "approvals.json"), serializeApprovals(approvalRecords, options.generatedAt));
  await writeFile(path.join(outputDir, "audit.json"), serializeAuditEvents(auditEvents));
  await writeFile(path.join(outputDir, "memory.json"), serializeMemoryEntries(memoryEntries));
  await writeFile(path.join(outputDir, "saved-items.json"), serializeSavedItems(options.generatedAt));
  await writeFile(path.join(outputDir, "manifest.json"), serializeManifest({
    outputDir,
    runId: run.id,
    generatedAt: options.generatedAt,
    files: [
      "workspace.json",
      "run.json",
      "provider-readiness.json",
      "approvals.json",
      "audit.json",
      "memory.json",
      "saved-items.json"
    ]
  }));

  console.log(`Release drill fixtures written to ${outputDir}`);
  console.log(`Run: ${run.id}`);
  console.log(`Provider readiness: ${providerReadiness.summary.ready}/${providerReadiness.summary.enabled} ready`);
  console.log(`Approvals: ${approvalRecords.length}`);
  console.log(`Audit events: ${auditEvents.length}`);
  console.log(`Memory entries: ${memoryEntries.length}`);
}

function buildReleaseDrillWorkspace(): CabinetWorkspace {
  const workspace = createDefaultWorkspace();

  return {
    ...workspace,
    roles: workspace.roles.map((role) => releaseDrillRole(role))
  };
}

function releaseDrillRole(role: CabinetRole): CabinetRole {
  if (role.id === "critic") {
    return {
      ...role,
      permissions: {
        ...role.permissions,
        canUseBrowser: true,
        canSendNetworkRequests: true
      }
    };
  }

  if (role.id === "scoring-office") {
    return {
      ...role,
      permissions: {
        ...role.permissions,
        canUseFiles: true
      }
    };
  }

  return role;
}

function buildReadyProviderMatrix(
  workspace: CabinetWorkspace,
  generatedAt: string
): ProviderReadinessMatrix {
  const base = buildProviderReadinessMatrix({
    roles: workspace.roles,
    sessionSecrets: Object.fromEntries(
      workspace.roles.map((role) => [role.id, `drill-secret-${role.id}`])
    ),
    generatedAt
  });
  const savedRows = base.rows.map((row) =>
    createProviderReadinessCheck({
      row,
      ok: true,
      secretReady: true,
      source: "gateway",
      checkedAt: generatedAt,
      message: "Release drill fixture supplies a reviewed gateway provider check; no raw secret is persisted."
    })
  );

  return buildProviderReadinessMatrix({
    roles: workspace.roles,
    savedRows,
    generatedAt
  });
}

function approveReviewableActions(
  actions: NonNullable<ReturnType<typeof runCabinetMission>["automationActions"]>,
  generatedAt: string
) {
  return actions
    .filter((action) => action.status === "needs-approval")
    .map((action) =>
      createApprovalRecord({
        action,
        decision: "approved",
        decidedAt: generatedAt,
        decidedBy: "release-drill-operator",
        reason: "Release drill approval for exact simulated payload inside sandbox policy."
      })
    );
}

function buildAuditEvents({
  runId,
  approvals,
  providerReadiness,
  generatedAt
}: {
  runId: string;
  approvals: AutomationApprovalRecord[];
  providerReadiness: ProviderReadinessMatrix;
  generatedAt: string;
}): AuditEvent[] {
  return [
    createAuditEvent({
      type: "cabinet.run.completed",
      severity: "success",
      summary: "Release drill cabinet run generated.",
      timestamp: generatedAt,
      actor: "release-drill",
      runId,
      metadata: {
        source: "release-drill"
      }
    }),
    createAuditEvent({
      type: "provider.readiness.checked",
      severity: "success",
      summary: "Release drill provider aliases checked through local fallback.",
      timestamp: generatedAt,
      actor: "release-drill",
      runId,
      metadata: {
        ready: providerReadiness.summary.ready,
        enabled: providerReadiness.summary.enabled
      }
    }),
    createAuditEvent({
      type: "automation.decision.recorded",
      severity: "success",
      summary: "Release drill approvals recorded for exact sandbox payloads.",
      timestamp: generatedAt,
      actor: "release-drill",
      runId,
      metadata: {
        approvals: approvals.length
      }
    }),
    createAuditEvent({
      type: "executor.run.dry.completed",
      severity: "success",
      summary: "Release drill executor dry-run evidence prepared.",
      timestamp: generatedAt,
      actor: "release-drill",
      runId,
      metadata: {
        mode: "dry-run"
      }
    })
  ];
}

function buildReviewedMemory(
  run: ReturnType<typeof runCabinetMission>,
  generatedAt: string
): MemoryEntry[] {
  return buildMemoryCandidates({ run, createdAt: generatedAt })
    .filter((entry) => entry.kind !== "risk")
    .map((entry) =>
      createMemoryDecision({
        entry,
        decision: "accepted",
        decidedAt: generatedAt,
        decidedBy: "release-drill-operator"
      })
    );
}

function serializeRun(run: ReturnType<typeof runCabinetMission>) {
  return JSON.stringify(
    {
      schema: "naikaku.run-fixture.v1",
      exportedAt: new Date().toISOString(),
      run
    },
    null,
    2
  );
}

function serializeApprovals(records: AutomationApprovalRecord[], generatedAt: string) {
  return JSON.stringify(
    {
      schema: "naikaku.approval-records.v1",
      exportedAt: generatedAt,
      approvalRecords: records
    },
    null,
    2
  );
}

function serializeSavedItems(generatedAt: string) {
  return JSON.stringify(
    {
      schema: "naikaku.saved-development-items.v1",
      exportedAt: generatedAt,
      items: []
    },
    null,
    2
  );
}

function serializeManifest({
  outputDir,
  runId,
  generatedAt,
  files
}: {
  outputDir: string;
  runId: string;
  generatedAt: string;
  files: string[];
}) {
  return JSON.stringify(
    {
      schema: "naikaku.release-drill-fixtures.v1",
      generatedAt,
      runId,
      outputDir,
      files,
      rehearsalCommand: [
        "npm run rehearsal -- --strict",
        `--workspace ${path.join(outputDir, "workspace.json")}`,
        `--run ${path.join(outputDir, "run.json")}`,
        `--provider-readiness ${path.join(outputDir, "provider-readiness.json")}`,
        `--approvals ${path.join(outputDir, "approvals.json")}`,
        `--audit ${path.join(outputDir, "audit.json")}`,
        `--memory ${path.join(outputDir, "memory.json")}`,
        `--saved-items ${path.join(outputDir, "saved-items.json")}`,
        "--secret-probe <redaction-probe-value>"
      ].join(" ")
    },
    null,
    2
  );
}

function parseArgs(args: string[]): ReleaseDrillOptions {
  const options: ReleaseDrillOptions = {
    outputDir: "output/release-drill",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function requireValue(args: string[], index: number, label: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${label} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Naikaku release drill fixtures

Usage:
  tsx scripts/release-drill-fixtures.ts [options]

Options:
  --out <dir>          Write fixture JSON files to this directory. Default: output/release-drill
  --generated-at <iso> Use a fixed generatedAt timestamp for deterministic fixtures.
  --help              Show this help.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown release drill fixture failure.");
  process.exitCode = 1;
});
