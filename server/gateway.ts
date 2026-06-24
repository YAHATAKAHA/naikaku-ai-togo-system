import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../src/data/defaultCabinet";
import { buildAutomationPlan, buildExecutorHandoff } from "../src/domain/automation";
import { runExecutorHandoff } from "../src/domain/executorRunner";
import { buildTeamHandoff } from "../src/domain/teamPackages";
import type {
  AutomationApprovalRecord,
  CabinetRun,
  CabinetRunMode,
  CabinetRole,
  CabinetWorkspace,
  ExecutorHandoff,
  ProviderConfig,
  SandboxPolicy
} from "../src/domain/types";
import { runGatewayCabinet } from "./liveCabinet";
import { validateProviderConfig } from "./providerAdapters";
import { evaluateSandboxAction, type SandboxActionRequest } from "./sandboxPolicy";

const port = Number(process.env.NAIKAKU_GATEWAY_PORT || 8787);
const host = process.env.NAIKAKU_GATEWAY_HOST || "127.0.0.1";
const corsOrigin = process.env.NAIKAKU_CORS_ORIGIN || "http://127.0.0.1:5173";

const server = createServer(async (request, response) => {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "naikaku-local-gateway",
        capabilities: [
          "provider-test",
          "cabinet-run",
          "automation-plan",
          "executor-handoff",
          "executor-run-dry",
          "team-packages",
          "sandbox-policy-check"
        ],
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (request.method === "POST" && request.url === "/v1/provider/test") {
      const body = await readJson<{ provider: ProviderConfig; sessionSecret?: string }>(request);
      const validation = validateProviderConfig(body.provider, process.env, body.sessionSecret);
      sendJson(response, validation.ok ? 200 : 422, validation);
      return;
    }

    if (request.method === "POST" && request.url === "/v1/cabinet/run") {
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

    if (request.method === "POST" && request.url === "/v1/automation/plan") {
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

    if (request.method === "POST" && request.url === "/v1/executor/handoff") {
      const body = await readJson<{
        run: CabinetRun;
        approvalRecords?: AutomationApprovalRecord[];
      }>(request);
      const handoff = buildExecutorHandoff({
        run: body.run,
        approvalRecords: body.approvalRecords || []
      });
      sendJson(response, 200, handoff);
      return;
    }

    if (request.method === "POST" && request.url === "/v1/executor/run") {
      const body = await readJson<{
        handoff: ExecutorHandoff;
      }>(request);
      const executorRun = runExecutorHandoff({
        handoff: body.handoff
      });
      sendJson(response, 200, executorRun);
      return;
    }

    if (request.method === "POST" && request.url === "/v1/team/packages") {
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

    if (request.method === "POST" && request.url === "/v1/sandbox/check") {
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
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
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
