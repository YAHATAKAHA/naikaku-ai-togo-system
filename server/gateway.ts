import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { defaultMission, defaultRoles, defaultSandboxPolicy, executorProfiles } from "../src/data/defaultCabinet";
import { buildAutomationPlan, buildExecutorHandoff } from "../src/domain/automation";
import { buildAutomationRunbook } from "../src/domain/automationRunbook";
import { buildCodingAgentBriefReview } from "../src/domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "../src/domain/codingAgentBriefs";
import { buildCodingAgentDispatchManifest } from "../src/domain/codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "../src/domain/codingAgentDispatchSimulation";
import { buildCodingAgentRunnerIntakeAudit } from "../src/domain/codingAgentRunnerIntakeAudit";
import { buildCodingAgentRunnerInvocationPackage } from "../src/domain/codingAgentRunnerInvocation";
import {
  buildCodingAgentRunnerLeaseLedger,
  claimAvailableCodingAgentRunnerLeases,
  claimCodingAgentRunnerLease,
  validateCodingAgentRunnerLeaseForPreflight
} from "../src/domain/codingAgentRunnerLease";
import { buildCodingAgentRunnerManifest } from "../src/domain/codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "../src/domain/codingAgentRunnerSelfTest";
import { buildCodingAgentSandboxRunnerPreflight } from "../src/domain/codingAgentSandboxRunnerPreflight";
import {
  auditCodingAgentImplementationArtifacts,
  type CodingAgentWorktreeProbeResult
} from "../src/domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "../src/domain/codingAgentImplementationEvidence";
import { buildCodingAgentSessionBundle } from "../src/domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "../src/domain/codingAgentSessionDrill";
import { buildCodingAgentSessionReceiptTemplate, reviewCodingAgentSessionReceipt } from "../src/domain/codingAgentSessionReceipt";
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
import { runCodingAgentSandboxRunner } from "./codingAgentSandboxRunner";
import {
  runEngineeringAutoWorkGateway,
  type EngineeringAutoWorkGatewayRequest
} from "./engineeringAutoWorkGateway";
import { buildEngineeringRunnerReadiness } from "./engineeringRunnerReadiness";
import { buildEngineeringRunnerPresetRegistry } from "./engineeringRunnerPresets";
import type {
  AutomationApprovalRecord,
  AuditEvent,
  CabinetRun,
  CabinetRunMode,
  CabinetRole,
  CabinetWorkspace,
  CodingAgentBriefReviewReport,
  CodingAgentBriefs,
  CodingAgentDispatchArchiveAudit,
  CodingAgentDispatchManifest,
  CodingAgentDispatchSimulation,
  CodingAgentRunnerIntakeAudit,
  CodingAgentRunnerInvocationPackage,
  CodingAgentRunnerLeaseLedger,
  CodingAgentRunnerLeaseValidation,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerResult,
  CodingAgentImplementationEvidence,
  CodingAgentSessionBundle,
  CodingAgentSessionDrillReport,
  CodingAgentSessionReceipt,
  DevelopmentWorkItem,
  ExecutorProfileId,
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
import {
  evaluateRunnerAuth,
  runnerAuthPosture,
  type RunnerAuthDecision
} from "./runnerAuth";
import {
  deniedExecutorProfilesForRunner,
  runnerScopePayload,
  scopeEvidenceBundleForRunner,
  scopeExecutorHandoffForRunner
} from "./runnerScope";
import { evaluateSandboxAction, type SandboxActionRequest } from "./sandboxPolicy";

const port = Number(process.env.NAIKAKU_GATEWAY_PORT || 8787);
const host = process.env.NAIKAKU_GATEWAY_HOST || "127.0.0.1";
const corsOrigin = process.env.NAIKAKU_CORS_ORIGIN || "http://127.0.0.1:5173";
const issuedCodingAgentRunnerLeases = new Map<string, {
  leaseId: string;
  sessionId: string;
  runnerId: string;
  executorProfileId: ExecutorProfileId;
  sourceSchema: CodingAgentRunnerLeaseLedger["sourceSchema"];
  sourceDecision: CodingAgentRunnerLeaseLedger["sourceDecision"];
  runId?: string;
  operatorLocale: string;
  expiresAt: string;
}>();

const server = createServer(async (request, response) => {
  setCors(response, request);
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
          "coding-agent-brief-review",
          "coding-agent-session-bundle",
          "coding-agent-dispatch-manifest",
          "coding-agent-dispatch-simulation",
          "coding-agent-runner-manifest",
          "coding-agent-runner-invocation",
          "coding-agent-runner-intake-audit",
          "coding-agent-runner-self-test",
          "coding-agent-runner-lease",
          "coding-agent-sandbox-runner-preflight",
          "coding-agent-sandbox-runner",
          "coding-agent-session-drill",
          "coding-agent-session-receipt",
          "coding-agent-implementation-evidence",
          "coding-agent-implementation-artifact-audit",
          "engineering-auto-work",
          "engineering-runner-presets",
          "engineering-runner-readiness",
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
      const scopedHandoff = scopeExecutorHandoffForRunner(handoff, auth);
      sendJson(response, 200, {
        ...scopedHandoff,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth),
        gatewayRunnerScopeFilteredActions: handoff.readyActions.length - scopedHandoff.readyActions.length
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/executor/run") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        handoff: ExecutorHandoff;
      }>(request);
      if (!ensureRunnerCanAccessProfiles({
        auth,
        response,
        profiles: body.handoff?.readyActions?.map((action) => action.executorProfileId) || [],
        operation: "executor run"
      })) {
        return;
      }
      const executorRun = runExecutorHandoff({
        handoff: body.handoff
      });
      sendJson(response, 200, {
        ...executorRun,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth)
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
      if (!ensureRunnerCanAccessProfiles({
        auth,
        response,
        profiles: body.executorRun.steps.map((step) => step.executorProfileId),
        operation: "executor evidence export"
      })) {
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
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth)
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
      const bundles = (await listEvidenceBundlesFromLedger({ runId, executorRunId }))
        .map((bundle) => scopeEvidenceBundleForRunner(bundle, auth))
        .filter((bundle) => auth.allExecutorProfiles || bundle.steps.length > 0);
      sendJson(response, 200, {
        schema: "naikaku.evidence-ledger-query.v1",
        runId: runId || null,
        executorRunId: executorRunId || null,
        bundles,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth)
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
      if (!ensureRunnerCanAccessProfiles({
        auth,
        response,
        profiles: body.bundle.steps.map((step) => step.executorProfileId),
        operation: "executor evidence ledger write"
      })) {
        return;
      }
      const bundle = await saveEvidenceBundleToLedger({ bundle: body.bundle });
      sendJson(response, 200, {
        ok: true,
        stored: true,
        bundle,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth)
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

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/review") {
      const body = await readJson<{
        briefs?: CodingAgentBriefs;
        releaseVerification?: ReleaseVerificationReport;
        requireProductionEvidence?: boolean;
      }>(request);
      if (body.briefs?.schema !== "naikaku.coding-agent-briefs.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "briefs with schema naikaku.coding-agent-briefs.v1 are required."
        });
        return;
      }
      const review = buildCodingAgentBriefReview({
        briefs: body.briefs,
        releaseVerification: body.releaseVerification?.schema === "naikaku.release-verification.v1"
          ? body.releaseVerification
          : null,
        requireProductionEvidence: Boolean(body.requireProductionEvidence)
      });
      sendJson(response, 200, review);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/session-bundle") {
      const body = await readJson<{
        briefs?: CodingAgentBriefs;
        review?: CodingAgentBriefReviewReport;
        releaseVerification?: ReleaseVerificationReport;
        requireProductionEvidence?: boolean;
      }>(request);
      if (body.briefs?.schema !== "naikaku.coding-agent-briefs.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "briefs with schema naikaku.coding-agent-briefs.v1 are required."
        });
        return;
      }
      const bundle = buildCodingAgentSessionBundle({
        briefs: body.briefs,
        review: body.review?.schema === "naikaku.coding-agent-brief-review.v1" ? body.review : null,
        releaseVerification: body.releaseVerification?.schema === "naikaku.release-verification.v1"
          ? body.releaseVerification
          : null,
        requireProductionEvidence: Boolean(body.requireProductionEvidence)
      });
      sendJson(response, 200, bundle);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/session-drill") {
      const body = await readJson<{
        bundle?: CodingAgentSessionBundle;
      }>(request);
      if (body.bundle?.schema !== "naikaku.coding-agent-session-bundle.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.coding-agent-session-bundle.v1 is required."
        });
        return;
      }
      const drill = buildCodingAgentSessionDrill({ bundle: body.bundle });
      sendJson(response, 200, drill);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/dispatch-manifest") {
      const body = await readJson<{
        bundle?: CodingAgentSessionBundle;
        drill?: CodingAgentSessionDrillReport;
      }>(request);
      if (body.bundle?.schema !== "naikaku.coding-agent-session-bundle.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.coding-agent-session-bundle.v1 is required."
        });
        return;
      }
      if (body.drill && body.drill.schema !== "naikaku.coding-agent-session-drill.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "drill must use schema naikaku.coding-agent-session-drill.v1."
        });
        return;
      }
      const manifest: CodingAgentDispatchManifest = buildCodingAgentDispatchManifest({
        bundle: body.bundle,
        drill: body.drill?.schema === "naikaku.coding-agent-session-drill.v1" ? body.drill : null
      });
      sendJson(response, 200, manifest);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/dispatch-simulation") {
      const body = await readJson<{
        manifest?: CodingAgentDispatchManifest;
        archiveAudit?: CodingAgentDispatchArchiveAudit;
      }>(request);
      if (body.manifest?.schema !== "naikaku.coding-agent-dispatch-manifest.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "manifest with schema naikaku.coding-agent-dispatch-manifest.v1 is required."
        });
        return;
      }
      if (body.archiveAudit && body.archiveAudit.schema !== "naikaku.coding-agent-dispatch-archive-audit.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "archiveAudit must use schema naikaku.coding-agent-dispatch-archive-audit.v1."
        });
        return;
      }
      const simulation: CodingAgentDispatchSimulation = buildCodingAgentDispatchSimulation({
        manifest: body.manifest,
        archiveAudit: body.archiveAudit?.schema === "naikaku.coding-agent-dispatch-archive-audit.v1"
          ? body.archiveAudit
          : null
      });
      sendJson(response, 200, simulation);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/runner-manifest") {
      const body = await readJson<{
        simulation?: CodingAgentDispatchSimulation;
        receiptDraftPaths?: Record<string, string>;
      }>(request);
      if (body.simulation?.schema !== "naikaku.coding-agent-dispatch-simulation.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "simulation with schema naikaku.coding-agent-dispatch-simulation.v1 is required."
        });
        return;
      }
      const manifest: CodingAgentRunnerManifest = buildCodingAgentRunnerManifest({
        simulation: body.simulation,
        receiptDraftPaths: body.receiptDraftPaths || {}
      });
      sendJson(response, 200, manifest);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/runner-invocation") {
      const body = await readJson<{
        manifest?: CodingAgentRunnerManifest;
        invocationBasePath?: string;
      }>(request);
      if (body.manifest?.schema !== "naikaku.coding-agent-runner-manifest.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "manifest with schema naikaku.coding-agent-runner-manifest.v1 is required."
        });
        return;
      }
      const invocationPackage: CodingAgentRunnerInvocationPackage = buildCodingAgentRunnerInvocationPackage({
        manifest: body.manifest,
        invocationBasePath: body.invocationBasePath
      });
      sendJson(response, 200, invocationPackage);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/runner-intake") {
      const body = await readJson<{
        invocationPackage?: CodingAgentRunnerInvocationPackage;
        sandboxPolicy?: SandboxPolicy;
      }>(request);
      if (body.invocationPackage?.schema !== "naikaku.coding-agent-runner-invocation-package.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "invocationPackage with schema naikaku.coding-agent-runner-invocation-package.v1 is required."
        });
        return;
      }
      const audit: CodingAgentRunnerIntakeAudit = buildCodingAgentRunnerIntakeAudit({
        invocationPackage: body.invocationPackage,
        sandboxPolicy: body.sandboxPolicy || defaultSandboxPolicy
      });
      sendJson(response, 200, audit);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/runner-self-test") {
      const body = await readJson<{
        manifest?: CodingAgentRunnerManifest;
      }>(request);
      if (body.manifest?.schema !== "naikaku.coding-agent-runner-manifest.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "manifest with schema naikaku.coding-agent-runner-manifest.v1 is required."
        });
        return;
      }
      const report: CodingAgentRunnerSelfTest = buildCodingAgentRunnerSelfTest({
        manifest: body.manifest
      });
      sendJson(response, 200, report);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/runner-lease") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        selfTest?: CodingAgentRunnerSelfTest;
        leaseLedger?: CodingAgentRunnerLeaseLedger;
        requestedSessionId?: string;
        claimAll?: boolean;
      }>(request);
      if (body.selfTest?.schema !== "naikaku.coding-agent-runner-self-test.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "selfTest with schema naikaku.coding-agent-runner-self-test.v1 is required."
        });
        return;
      }
      if (body.leaseLedger && body.leaseLedger.schema !== "naikaku.coding-agent-runner-lease.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "leaseLedger with schema naikaku.coding-agent-runner-lease.v1 is required."
        });
        return;
      }

      const sourceLedger = body.leaseLedger || buildCodingAgentRunnerLeaseLedger({
        selfTest: body.selfTest
      });
      const leaseLedger = body.requestedSessionId || body.claimAll === false
        ? claimCodingAgentRunnerLease({
          ledger: sourceLedger,
          runnerId: auth.runnerId,
          allowedExecutorProfiles: auth.allowedExecutorProfiles,
          requestedSessionId: body.requestedSessionId
        })
        : claimAvailableCodingAgentRunnerLeases({
          ledger: sourceLedger,
          runnerId: auth.runnerId,
          allowedExecutorProfiles: auth.allowedExecutorProfiles
        });
      rememberIssuedCodingAgentRunnerLeases(leaseLedger);

      sendJson(response, 200, {
        ...leaseLedger,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth)
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/sandbox-runner/preflight") {
      const body = await readJson<{
        selfTest?: CodingAgentRunnerSelfTest;
        bundle?: CodingAgentSessionBundle;
        sandboxPolicy?: SandboxPolicy;
      }>(request);
      if (body.selfTest?.schema !== "naikaku.coding-agent-runner-self-test.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "selfTest with schema naikaku.coding-agent-runner-self-test.v1 is required."
        });
        return;
      }
      if (body.bundle?.schema !== "naikaku.coding-agent-session-bundle.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.coding-agent-session-bundle.v1 is required."
        });
        return;
      }
      const preflight: CodingAgentSandboxRunnerPreflight = buildCodingAgentSandboxRunnerPreflight({
        selfTest: body.selfTest,
        bundle: body.bundle,
        sandboxPolicy: body.sandboxPolicy || defaultSandboxPolicy
      });
      sendJson(response, 200, preflight);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/sandbox-runner") {
      const auth = authorizeExecutorRequest(request, response);
      if (!auth) return;

      const body = await readJson<{
        selfTest?: CodingAgentRunnerSelfTest;
        bundle?: CodingAgentSessionBundle;
        leaseLedger?: CodingAgentRunnerLeaseLedger;
        sandboxPolicy?: SandboxPolicy;
        timeoutMs?: number;
      }>(request);
      if (body.selfTest?.schema !== "naikaku.coding-agent-runner-self-test.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "selfTest with schema naikaku.coding-agent-runner-self-test.v1 is required."
        });
        return;
      }
      if (body.bundle?.schema !== "naikaku.coding-agent-session-bundle.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.coding-agent-session-bundle.v1 is required."
        });
        return;
      }
      if (body.leaseLedger?.schema !== "naikaku.coding-agent-runner-lease.v1") {
        sendJson(response, 409, {
          ok: false,
          message: "Sandbox runner execution requires an active runner lease ledger.",
          gatewayRunnerId: auth.runnerId,
          authMode: auth.mode,
          gatewayRunnerScope: runnerScopePayload(auth)
        });
        return;
      }
      const preflight: CodingAgentSandboxRunnerPreflight = buildCodingAgentSandboxRunnerPreflight({
        selfTest: body.selfTest,
        bundle: body.bundle,
        sandboxPolicy: body.sandboxPolicy || defaultSandboxPolicy
      });
      if (!ensureRunnerCanAccessProfiles({
        auth,
        response,
        profiles: preflight.items
          .filter((item) => item.preflightStatus === "ready")
          .map((item) => item.executorProfileId),
        operation: "coding-agent sandbox runner"
      })) {
        return;
      }
      if (preflight.decision !== "ready") {
        sendJson(response, 409, {
          ok: false,
          message: "Sandbox runner preflight is not ready; execution was not started.",
          preflight,
          gatewayRunnerId: auth.runnerId,
          authMode: auth.mode,
          gatewayRunnerScope: runnerScopePayload(auth)
        });
        return;
      }
      const leaseValidation: CodingAgentRunnerLeaseValidation = validateCodingAgentRunnerLeaseForPreflight({
        ledger: body.leaseLedger,
        preflight,
        runnerId: auth.runnerId
      });
      if (!leaseValidation.ok) {
        sendJson(response, 409, {
          ok: false,
          message: "Sandbox runner lease is not valid; execution was not started.",
          preflight,
          leaseValidation,
          gatewayRunnerId: auth.runnerId,
          authMode: auth.mode,
          gatewayRunnerScope: runnerScopePayload(auth)
        });
        return;
      }
      const gatewayIssuedLeaseValidation = validateGatewayIssuedCodingAgentRunnerLeases({
        ledger: body.leaseLedger,
        validation: leaseValidation
      });
      if (!gatewayIssuedLeaseValidation.ok) {
        sendJson(response, 409, {
          ok: false,
          message: "Sandbox runner lease was not issued by this gateway; execution was not started.",
          preflight,
          leaseValidation: gatewayIssuedLeaseValidation,
          gatewayRunnerId: auth.runnerId,
          authMode: auth.mode,
          gatewayRunnerScope: runnerScopePayload(auth)
        });
        return;
      }
      const result: CodingAgentSandboxRunnerResult = await runCodingAgentSandboxRunner({
        selfTest: body.selfTest,
        bundle: body.bundle,
        timeoutMs: typeof body.timeoutMs === "number" ? body.timeoutMs : undefined,
        preflight
      });
      sendJson(response, 200, {
        ...result,
        gatewayRunnerId: auth.runnerId,
        authMode: auth.mode,
        gatewayRunnerScope: runnerScopePayload(auth),
        leaseValidation: gatewayIssuedLeaseValidation
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/session-receipt-template") {
      const body = await readJson<{
        bundle?: CodingAgentSessionBundle;
      }>(request);
      if (body.bundle?.schema !== "naikaku.coding-agent-session-bundle.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.coding-agent-session-bundle.v1 is required."
        });
        return;
      }
      const receipt = buildCodingAgentSessionReceiptTemplate({ bundle: body.bundle });
      sendJson(response, 200, receipt);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/session-receipt-review") {
      const body = await readJson<{
        bundle?: CodingAgentSessionBundle;
        receipt?: CodingAgentSessionReceipt;
      }>(request);
      if (body.bundle?.schema !== "naikaku.coding-agent-session-bundle.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "bundle with schema naikaku.coding-agent-session-bundle.v1 is required."
        });
        return;
      }
      if (body.receipt?.schema !== "naikaku.coding-agent-session-receipt.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "receipt with schema naikaku.coding-agent-session-receipt.v1 is required."
        });
        return;
      }
      const receipt = reviewCodingAgentSessionReceipt({
        bundle: body.bundle,
        receipt: body.receipt
      });
      sendJson(response, 200, receipt);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/implementation-evidence") {
      const body = await readJson<{
        receipt?: CodingAgentSessionReceipt;
      }>(request);
      if (body.receipt?.schema !== "naikaku.coding-agent-session-receipt.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "receipt with schema naikaku.coding-agent-session-receipt.v1 is required."
        });
        return;
      }
      const evidence = buildCodingAgentImplementationEvidence({
        receipt: body.receipt
      });
      sendJson(response, 200, evidence);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/development/coding-briefs/implementation-artifact-audit") {
      const body = await readJson<{
        evidence?: CodingAgentImplementationEvidence;
      }>(request);
      if (body.evidence?.schema !== "naikaku.coding-agent-implementation-evidence.v1") {
        sendJson(response, 422, {
          ok: false,
          message: "evidence with schema naikaku.coding-agent-implementation-evidence.v1 is required."
        });
        return;
      }
      const audit = auditCodingAgentImplementationArtifacts({
        evidence: body.evidence,
        artifactProbe: localArtifactProbe,
        worktreeProbe: localGitWorktreeProbe
      });
      sendJson(response, 200, audit);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/v1/engineering/auto-work") {
      const body = await readJson<EngineeringAutoWorkGatewayRequest>(request);
      const result = runEngineeringAutoWorkGateway(body);
      sendJson(response, result.statusCode, result.body);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/engineering/runner-readiness") {
      sendJson(response, 200, buildEngineeringRunnerReadiness());
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/engineering/runner-presets") {
      sendJson(response, 200, buildEngineeringRunnerPresetRegistry());
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

function setCors(response: ServerResponse, request: IncomingMessage) {
  response.setHeader("Access-Control-Allow-Origin", allowedCorsOrigin(request.headers.origin));
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,x-naikaku-runner-id,x-naikaku-runner-token"
  );
}

function allowedCorsOrigin(origin: string | undefined) {
  if (!origin) return corsOrigin;

  const configured = corsOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return origin;

  try {
    const parsed = new URL(origin);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
    ) {
      return origin;
    }
  } catch {
    return configured[0] || "http://127.0.0.1:5173";
  }

  return configured[0] || "http://127.0.0.1:5173";
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function localArtifactProbe(relativePath: string) {
  const root = process.cwd();
  const absolutePath = resolve(root, relativePath);
  const workspaceRelativePath = relative(root, absolutePath);
  if (!workspaceRelativePath || workspaceRelativePath.startsWith("..")) {
    return { exists: false };
  }
  if (!existsSync(absolutePath)) {
    return { exists: false };
  }

  const stats = statSync(absolutePath);
  if (!stats.isFile()) {
    return { exists: false };
  }

  const content = readFileSync(absolutePath);
  return {
    exists: true,
    bytes: stats.size,
    sha256: createHash("sha256").update(content).digest("hex"),
    modifiedAt: stats.mtime.toISOString(),
    text: content.length <= 1024 * 1024 ? content.toString("utf8") : undefined
  };
}

function localGitWorktreeProbe(relativePath: string): CodingAgentWorktreeProbeResult {
  const root = process.cwd();
  const absolutePath = resolve(root, relativePath);
  const workspaceRelativePath = relative(root, absolutePath).replace(/\\/g, "/");

  if (!workspaceRelativePath || workspaceRelativePath.startsWith("..")) {
    return {
      checked: false,
      changed: false,
      status: "unknown",
      reason: "Changed-file path is outside the current gateway workspace."
    };
  }

  const result = spawnSync("git", [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    workspaceRelativePath
  ], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.error || result.status !== 0) {
    return {
      checked: false,
      changed: false,
      status: "unknown",
      reason: `git status failed for ${workspaceRelativePath}.`
    };
  }

  const line = result.stdout.split(/\r?\n/).find((entry) => entry.trim().length > 0);
  if (!line) {
    return {
      checked: true,
      changed: false,
      status: "clean",
      reason: `Git worktree has no changed entry for ${workspaceRelativePath}.`
    };
  }

  const status = worktreeStatusForPorcelain(line.slice(0, 2));
  return {
    checked: true,
    changed: true,
    status,
    reason: `Git worktree reports ${status} for ${workspaceRelativePath}.`
  };
}

function worktreeStatusForPorcelain(code: string): CodingAgentWorktreeProbeResult["status"] {
  if (code.includes("?")) return "untracked";
  if (code.includes("U")) return "unmerged";
  if (code.includes("R")) return "renamed";
  if (code.includes("C")) return "copied";
  if (code.includes("A")) return "added";
  if (code.includes("D")) return "deleted";
  if (code.includes("M")) return "modified";
  if (code.includes("T")) return "typechange";
  return "unknown";
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function ensureRunnerCanAccessProfiles({
  auth,
  response,
  profiles,
  operation
}: {
  auth: RunnerAuthDecision;
  response: ServerResponse;
  profiles: ExecutorProfileId[];
  operation: string;
}) {
  const deniedProfiles = deniedExecutorProfilesForRunner(auth, profiles);

  if (deniedProfiles.length === 0) return true;

  sendJson(response, 403, {
    ok: false,
    message: `Runner ${auth.runnerId} is not scoped for ${operation}.`,
    runnerAuth: {
      mode: auth.mode,
      runnerId: auth.runnerId,
      allowedExecutorProfiles: auth.allowedExecutorProfiles,
      allExecutorProfiles: auth.allExecutorProfiles
    },
    deniedExecutorProfiles: deniedProfiles,
    auditTags: ["runner-auth", "scope-denied", auth.runnerId, ...deniedProfiles]
  });
  return false;
}

function rememberIssuedCodingAgentRunnerLeases(ledger: CodingAgentRunnerLeaseLedger) {
  pruneIssuedCodingAgentRunnerLeases(new Date().toISOString());

  for (const lease of ledger.leases) {
    if (lease.status !== "active") continue;
    issuedCodingAgentRunnerLeases.set(lease.leaseId, {
      leaseId: lease.leaseId,
      sessionId: lease.sessionId,
      runnerId: lease.runnerId,
      executorProfileId: lease.executorProfileId,
      sourceSchema: ledger.sourceSchema,
      sourceDecision: ledger.sourceDecision,
      runId: ledger.runId,
      operatorLocale: ledger.operatorLocale,
      expiresAt: lease.expiresAt
    });
  }
}

function validateGatewayIssuedCodingAgentRunnerLeases({
  ledger,
  validation
}: {
  ledger: CodingAgentRunnerLeaseLedger;
  validation: CodingAgentRunnerLeaseValidation;
}): CodingAgentRunnerLeaseValidation {
  pruneIssuedCodingAgentRunnerLeases(validation.checkedAt);
  const acceptedLeaseIds = new Set(validation.acceptedLeaseIds);
  const unissuedSessionIds = ledger.leases
    .filter((lease) => lease.status === "active" && acceptedLeaseIds.has(lease.leaseId))
    .filter((lease) => {
      const issued = issuedCodingAgentRunnerLeases.get(lease.leaseId);
      return !issued ||
        issued.sessionId !== lease.sessionId ||
        issued.runnerId !== validation.runnerId ||
        issued.executorProfileId !== lease.executorProfileId ||
        issued.sourceSchema !== ledger.sourceSchema ||
        issued.sourceDecision !== ledger.sourceDecision ||
        issued.runId !== ledger.runId ||
        issued.operatorLocale !== ledger.operatorLocale;
    })
    .map((lease) => lease.sessionId);

  if (unissuedSessionIds.length === 0) return validation;

  return {
    ...validation,
    ok: false,
    unissuedSessionIds,
    message: `Lease ids were not issued by this gateway for ${unissuedSessionIds.length} ready task(s).`
  };
}

function pruneIssuedCodingAgentRunnerLeases(now: string) {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) return;

  for (const [leaseId, lease] of issuedCodingAgentRunnerLeases.entries()) {
    if (Date.parse(lease.expiresAt) <= nowMs) {
      issuedCodingAgentRunnerLeases.delete(leaseId);
    }
  }
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
