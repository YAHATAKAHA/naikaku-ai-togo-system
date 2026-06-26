import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { defaultMission, defaultRoles, defaultSandboxPolicy, executorProfiles } from "../src/data/defaultCabinet";
import { buildAutomationPlan, buildExecutorHandoff } from "../src/domain/automation";
import { buildAutomationRunbook } from "../src/domain/automationRunbook";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildDevelopmentBoard } from "../src/domain/developmentBoard";
import { buildDevelopmentIssueDrafts } from "../src/domain/developmentIssues";
import { buildExecutorEvidenceBundle, runExecutorHandoff } from "../src/domain/executorRunner";
import { buildProductReadinessReport } from "../src/domain/productReadiness";
import { buildProductReleaseBundle } from "../src/domain/productReleaseBundle";
import { buildProviderReadinessMatrix } from "../src/domain/providerReadiness";
import { buildReleaseRehearsalReport } from "../src/domain/releaseRehearsal";
import { buildReleaseVerification } from "../src/domain/releaseVerification";
import { buildRoleWorkspaceScaffolds } from "../src/domain/roleWorkspaceScaffolds";
import { buildSandboxCapabilityRegistry } from "../src/domain/sandboxCapabilities";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type {
  AutomationApprovalRecord,
  AuditEvent,
  CabinetRun,
  CabinetRunMode,
  CabinetRole,
  CabinetWorkspace,
  DevelopmentWorkItem,
  ExecutorEvidenceBundle,
  ExecutorRun,
  ExecutorHandoff,
  MemoryEntry,
  ProviderConfig,
  ProviderReadinessMatrix,
  ReleaseRehearsalReport,
  ReleaseVerificationReport,
  SandboxPolicy
} from "../src/domain/types";
import {
  ledgerSummary,
  listApprovalRecordsFromLedger,
  listEvidenceBundlesFromLedger,
  saveApprovalRecordToLedger,
  saveEvidenceBundleToLedger
} from "./ledgerStore";
import { runGatewayCabinet } from "./liveCabinet";
import { validateProviderConfig } from "./providerAdapters";
import { evaluateRunnerAuth, runnerAuthPosture, type RunnerAuthDecision } from "./runnerAuth";
import { evaluateSandboxAction, type SandboxActionRequest } from "./sandboxPolicy";

const port = Number(process.env.NAIKAKU_GATEWAY_PORT || 8787);
const host = process.env.NAIKAKU_GATEWAY_HOST || "127.0.0.1";
const corsOrigin = process.env.NAIKAKU_CORS_ORIGIN || "http://127.0.0.1:5173";

const server = createServer(async (request, response) => {
  setCors(response);
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && requestUrl.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "naikaku-local-gateway",
        capabilities: [
          "provider-test",
          "cabinet-run",
          "automation-plan",
          "automation-runbook",
          "executor-handoff",
          "executor-run-dry",
          "executor-evidence",
          "ledger-store",
          "team-packages",
          "role-workspace-scaffolds",
          "product-readiness",
          "product-release-bundle",
          "release-rehearsal",
          "release-verification",
          "development-issues",
          "coding-agent-briefs",
          "sandbox-capabilities",
          "sandbox-policy-check"
        ],
        runnerAuth: runnerAuthPosture(process.env),
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/provider/test") {
      const body = await readJson<{ provider: ProviderConfig; sessionSecret?: string }>(request);
      const validation = validateProviderConfig(body.provider, process.env, body.sessionSecret);
      sendJson(response, validation.ok ? 200 : 422, validation);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/cabinet/run") {
      const body = await readJson<{
        mission?: string;
        roles?: CabinetRole[];
        sandboxPolicy?: SandboxPolicy;
        mode?: CabinetRunMode;
      }>(request);
      const run = await runGatewayCabinet({
        mission: body.mission || defaultMission,
        roles: body.roles || defaultRoles,
        sandboxPolicy: body.sandboxPolicy || defaultSandboxPolicy,
        mode: body.mode || "dry-run"
      });
      sendJson(response, 200, run);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/automation/plan") {
      const body = await readJson<{
        run: CabinetRun;
        roles?: CabinetRole[];
        sandboxPolicy?: SandboxPolicy;
      }>(request);
      const plan = buildAutomationPlan({
        run: body.run,
        roles: body.roles || defaultRoles,
        sandboxPolicy: body.sandboxPolicy || defaultSandboxPolicy
      });
      sendJson(response, 200, { actions: plan });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/automation/runbook") {
      const body = await readJson<{
        run: CabinetRun;
        approvalRecords?: AutomationApprovalRecord[];
      }>(request);
      if (!body.run?.id) {
        sendJson(response, 422, {
          ok: false,
          message: "run is required."
        });
        return;
      }
      const runbook = buildAutomationRunbook({
        run: body.run,
        approvalRecords: body.approvalRecords || []
      });
      sendJson(response, 200, runbook);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/executor/handoff") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        run: CabinetRun;
        approvalRecords?: AutomationApprovalRecord[];
      }>(request);
      await Promise.all(
        (body.approvalRecords || []).map((record) => saveApprovalRecordToLedger({ record }))
      );
      const handoff = buildExecutorHandoff({
        run: body.run,
        approvalRecords: body.approvalRecords || []
      });
      sendJson(response, 200, {
        ...handoff,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/executor/run") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        handoff: ExecutorHandoff;
      }>(request);
      const executorRun = runExecutorHandoff({
        handoff: body.handoff
      });
      sendJson(response, 200, {
        ...executorRun,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/executor/evidence") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        executorRun: ExecutorRun;
      }>(request);
      if (!body.executorRun?.id) {
        sendJson(response, 422, {
          ok: false,
          message: "executorRun is required."
        });
        return;
      }
      const bundle = buildExecutorEvidenceBundle({
        executorRun: body.executorRun
      });
      await saveEvidenceBundleToLedger({ bundle });
      sendJson(response, 200, {
        ...bundle,
        stored: true,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/ledger/status") {
      sendJson(response, 200, await ledgerSummary());
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/ledger/approvals") {
      const runId = requestUrl.searchParams.get("runId") || undefined;
      const records = await listApprovalRecordsFromLedger({ runId });
      sendJson(response, 200, {
        schema: "naikaku.approval-ledger-query.v1",
        runId: runId || null,
        records
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/ledger/approvals") {
      const body = await readJson<{
        record?: AutomationApprovalRecord;
      }>(request);
      if (!body.record?.id) {
        sendJson(response, 422, {
          ok: false,
          message: "record is required."
        });
        return;
      }
      const record = await saveApprovalRecordToLedger({ record: body.record });
      sendJson(response, 200, {
        ok: true,
        stored: true,
        record
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/ledger/evidence") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const runId = requestUrl.searchParams.get("runId") || undefined;
      const executorRunId = requestUrl.searchParams.get("executorRunId") || undefined;
      const bundles = await listEvidenceBundlesFromLedger({ runId, executorRunId });
      sendJson(response, 200, {
        schema: "naikaku.evidence-ledger-query.v1",
        runId: runId || null,
        executorRunId: executorRunId || null,
        bundles,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/ledger/evidence") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        bundle?: ExecutorEvidenceBundle;
      }>(request);
      if (body.bundle?.schema !== "naikaku.executor-evidence.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.executor-evidence.v1 is required."
        });
        return;
      }
      const bundle = await saveEvidenceBundleToLedger({ bundle: body.bundle });
      sendJson(response, 200, {
        ok: true,
        stored: true,
        bundle,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/team/packages") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const teamHandoff = buildTeamHandoff({
        workspace,
        run: Array.isArray(body.run?.artifacts) ? body.run : undefined
      });
      sendJson(response, 200, teamHandoff);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/team/workspaces") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const run = Array.isArray(body.run?.artifacts) ? body.run : undefined;
      const teamHandoff = buildTeamHandoff({
        workspace,
        run
      });
      const scaffolds = buildRoleWorkspaceScaffolds({ handoff: teamHandoff });
      sendJson(response, 200, scaffolds);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/product/readiness") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
        providerReadiness?: ProviderReadinessMatrix;
        approvalRecords?: AutomationApprovalRecord[];
        memoryEntries?: MemoryEntry[];
        savedItems?: DevelopmentWorkItem[];
        auditEvents?: AuditEvent[];
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const run = Array.isArray(body.run?.artifacts) ? body.run : undefined;
      const providerReadiness = body.providerReadiness?.schema === "naikaku.provider-readiness.v1"
        ? body.providerReadiness
        : buildProviderReadinessMatrix({ roles: workspace.roles });
      const sandboxCapabilities = buildSandboxCapabilityRegistry({
        profiles: executorProfiles,
        roles: workspace.roles,
        sandboxPolicy: workspace.sandboxPolicy
      });
      const automationRunbook = run
        ? buildAutomationRunbook({
          run,
          approvalRecords: body.approvalRecords || []
        })
        : undefined;
      const handoff = buildTeamHandoff({
        workspace,
        run
      });
      const roleWorkspaces = buildRoleWorkspaceScaffolds({ handoff });
      const developmentBoard = buildDevelopmentBoard({
        handoff,
        run,
        memoryEntries: body.memoryEntries || [],
        savedItems: body.savedItems || []
      });
      const issueDrafts = buildDevelopmentIssueDrafts({ board: developmentBoard });
      const report = buildProductReadinessReport({
        workspace,
        run,
        providerReadiness,
        sandboxCapabilities,
        automationRunbook,
        teamHandoff: handoff,
        roleWorkspaces,
        developmentBoard,
        issueDrafts,
        approvalRecords: body.approvalRecords || [],
        memoryEntries: body.memoryEntries || [],
        auditEvents: body.auditEvents || []
      });
      sendJson(response, 200, report);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/product/release-bundle") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
        providerReadiness?: ProviderReadinessMatrix;
        approvalRecords?: AutomationApprovalRecord[];
        memoryEntries?: MemoryEntry[];
        savedItems?: DevelopmentWorkItem[];
        auditEvents?: AuditEvent[];
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const run = Array.isArray(body.run?.artifacts) ? body.run : undefined;
      const providerReadiness = body.providerReadiness?.schema === "naikaku.provider-readiness.v1"
        ? body.providerReadiness
        : buildProviderReadinessMatrix({ roles: workspace.roles });
      const sandboxCapabilities = buildSandboxCapabilityRegistry({
        profiles: executorProfiles,
        roles: workspace.roles,
        sandboxPolicy: workspace.sandboxPolicy
      });
      const automationRunbook = run
        ? buildAutomationRunbook({
          run,
          approvalRecords: body.approvalRecords || []
        })
        : undefined;
      const handoff = buildTeamHandoff({
        workspace,
        run
      });
      const roleWorkspaces = buildRoleWorkspaceScaffolds({ handoff });
      const developmentBoard = buildDevelopmentBoard({
        handoff,
        run,
        memoryEntries: body.memoryEntries || [],
        savedItems: body.savedItems || []
      });
      const issueDrafts = buildDevelopmentIssueDrafts({ board: developmentBoard });
      const productReadiness = buildProductReadinessReport({
        workspace,
        run,
        providerReadiness,
        sandboxCapabilities,
        automationRunbook,
        teamHandoff: handoff,
        roleWorkspaces,
        developmentBoard,
        issueDrafts,
        approvalRecords: body.approvalRecords || [],
        memoryEntries: body.memoryEntries || [],
        auditEvents: body.auditEvents || []
      });
      const bundle = buildProductReleaseBundle({
        workspace,
        run,
        providerReadiness,
        productReadiness,
        automationRunbook,
        teamHandoff: handoff,
        roleWorkspaces,
        developmentBoard,
        issueDrafts,
        approvalRecords: body.approvalRecords || [],
        memoryEntries: body.memoryEntries || [],
        auditEvents: body.auditEvents || []
      });
      sendJson(response, 200, bundle);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/product/rehearsal") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
        providerReadiness?: ProviderReadinessMatrix;
        approvalRecords?: AutomationApprovalRecord[];
        memoryEntries?: MemoryEntry[];
        savedItems?: DevelopmentWorkItem[];
        auditEvents?: AuditEvent[];
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const run = Array.isArray(body.run?.artifacts) ? body.run : undefined;
      const providerReadiness = body.providerReadiness?.schema === "naikaku.provider-readiness.v1"
        ? body.providerReadiness
        : buildProviderReadinessMatrix({ roles: workspace.roles });
      const report = buildReleaseRehearsalReport({
        workspace,
        run,
        providerReadiness,
        approvalRecords: body.approvalRecords || [],
        memoryEntries: body.memoryEntries || [],
        savedItems: body.savedItems || [],
        auditEvents: body.auditEvents || []
      });
      sendJson(response, 200, report);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/product/release-verification") {
      const body = await readJson<{
        report?: ReleaseRehearsalReport;
        requireProductionEvidence?: boolean;
      }>(request);
      if (body.report?.schema !== "naikaku.release-rehearsal.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "report with schema naikaku.release-rehearsal.v1 is required."
        });
        return;
      }
      const verification = buildReleaseVerification({
        report: body.report,
        requireProductionEvidence: Boolean(body.requireProductionEvidence)
      });
      sendJson(response, 200, verification);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/issues") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
        memoryEntries?: MemoryEntry[];
        savedItems?: DevelopmentWorkItem[];
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const run = Array.isArray(body.run?.artifacts) ? body.run : undefined;
      const handoff = buildTeamHandoff({
        workspace,
        run
      });
      const board = buildDevelopmentBoard({
        handoff,
        run,
        memoryEntries: body.memoryEntries || [],
        savedItems: body.savedItems || []
      });
      const drafts = buildDevelopmentIssueDrafts({ board });
      sendJson(response, 200, drafts);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs") {
      const body = await readJson<{
        workspace?: CabinetWorkspace;
        run?: CabinetRun;
        memoryEntries?: MemoryEntry[];
        savedItems?: DevelopmentWorkItem[];
        releaseVerification?: ReleaseVerificationReport;
        operatorLocale?: string;
      }>(request);
      const workspace = body.workspace || {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      };
      const run = Array.isArray(body.run?.artifacts) ? body.run : undefined;
      const handoff = buildTeamHandoff({
        workspace,
        run
      });
      const board = buildDevelopmentBoard({
        handoff,
        run,
        memoryEntries: body.memoryEntries || [],
        savedItems: body.savedItems || []
      });
      const briefs = buildCodingAgentBriefs({
        board,
        operatorLocale: body.operatorLocale || "ja",
        releaseVerification: body.releaseVerification?.schema === "naikaku.release-verification.v1"
          ? body.releaseVerification
          : null
      });
      sendJson(response, 200, briefs);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/sandbox/check") {
      const body = await readJson<{
        request: SandboxActionRequest;
        sandboxPolicy?: SandboxPolicy;
      }>(request);
      const decision = evaluateSandboxAction(
        body.request,
        body.sandboxPolicy || defaultSandboxPolicy
      );
      sendJson(response, decision.allowed ? 200 : 403, decision);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/sandbox/capabilities") {
      const body = await readJson<{
        roles?: CabinetRole[];
        sandboxPolicy?: SandboxPolicy;
      }>(request);
      const registry = buildSandboxCapabilityRegistry({
        profiles: executorProfiles,
        roles: body.roles || defaultRoles,
        sandboxPolicy: body.sandboxPolicy || defaultSandboxPolicy
      });
      sendJson(response, 200, registry);
      return;
    }

    sendJson(response, 404, {
      ok: false,
      message: "Route not found."
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown gateway error."
    });
  }
});

server.listen(port, host, () => {
  console.log(`Naikaku local gateway listening on http://${host}:${port}`);
});

function setCors(response: ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", corsOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,x-naikaku-runner-id,x-naikaku-runner-token"
  );
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function authorizeExecutorRequest(
  request: IncomingMessage,
  response: ServerResponse
): RunnerAuthDecision | null {
  const decision = evaluateRunnerAuth({
    headers: request.headers,
    env: process.env
  });

  if (!decision.ok) {
    sendJson(response, decision.status, {
      ok: false,
      message: decision.message,
      runnerAuth: {
        mode: decision.mode,
        runnerId: decision.runnerId || null
      },
      auditTags: decision.auditTags
    });
    return null;
  }

  return decision;
}
