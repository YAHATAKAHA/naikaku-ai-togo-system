# Local Gateway

The local gateway is a small JSON service for development. It gives backend and sandbox contributors a real target without giving the browser direct host control.

Start it with:

```bash
npm run gateway
```

Default URL:

```text
http://127.0.0.1:8787
```

Environment:

```bash
VITE_NAIKAKU_GATEWAY_URL=http://127.0.0.1:8787
NAIKAKU_GATEWAY_HOST=127.0.0.1
NAIKAKU_GATEWAY_PORT=8787
NAIKAKU_CORS_ORIGIN=http://127.0.0.1:5173
```

`VITE_NAIKAKU_GATEWAY_URL` is read by the browser app. The other values are read by the Node gateway.

## Endpoints

### `GET /health`

Returns service status and supported capabilities.

### `POST /v1/provider/test`

Validates a provider configuration structurally. It does not persist secrets.
If `sessionSecret` is provided, the gateway only uses it to mark this one-off test as secret-ready.
Live cabinet runs still resolve role secrets from gateway environment variables.

```json
{
  "provider": {
    "provider": "openai",
    "endpoint": "https://api.openai.com/v1/responses",
    "model": "gpt-5.4",
    "apiKeyAlias": "NAIKAKU_OPENAI_API_KEY",
    "temperature": 0.3,
    "maxTokens": 1800
  },
  "sessionSecret": "optional-session-only-secret"
}
```

### `POST /v1/cabinet/run`

Runs the cabinet orchestrator and returns artifacts, automation actions, logs, scores, and next-iteration tasks.

```json
{
  "mission": "Build a sandbox-first cabinet automation system",
  "mode": "dry-run"
}
```

`mode` can be:

- `dry-run`: no external model calls.
- `live`: provider calls are attempted through server-side adapters. Missing keys or provider failures are recorded in artifact provider status fields.

Live mode uses role-level `apiKeyAlias` values to read environment variables from the gateway process. The browser never receives raw provider keys.

### `POST /v1/automation/plan`

Builds sandbox action proposals for an existing run. This does not execute anything.

```json
{
  "run": { "id": "run-...", "artifacts": [] },
  "roles": [],
  "sandboxPolicy": {}
}
```

Response:

```json
{
  "actions": [
    {
      "status": "needs-approval",
      "executorProfileId": "shell-container",
      "action": "run_shell",
      "target": "/workspace:npm run test"
    }
  ]
}
```

### `POST /v1/executor/handoff`

Builds the executor-facing handoff from a run plus approval records. This does not execute actions. It filters out blocked, rejected, and still-unapproved work.

```json
{
  "run": { "id": "run-...", "automationActions": [] },
  "approvalRecords": []
}
```

Response:

```json
{
  "id": "run-...-executor-handoff",
  "runId": "run-...",
  "readyActions": [],
  "heldActions": [],
  "approvalRecords": []
}
```

Executors should consume `readyActions` only. A `needs-approval` action appears there only when it has a matching approved `AutomationApprovalRecord`.

### `POST /v1/executor/run`

Dry-runs executor-ready actions from a handoff. This endpoint does not execute shell commands, browser navigation, desktop input, file writes, or MCP calls. It returns simulated executor steps for audit and UI development.

```json
{
  "handoff": {
    "id": "run-...-executor-handoff",
    "runId": "run-...",
    "readyActions": [],
    "heldActions": []
  }
}
```

Response:

```json
{
  "mode": "dry-run",
  "summary": {
    "ready": 2,
    "simulated": 2,
    "held": 5,
    "evidenceItems": 6,
    "replayableSteps": 2
  },
  "steps": [
    {
      "runnerId": "naikaku.shell-container.dry-run",
      "evidenceHash": "fnv1a-...",
      "evidence": []
    }
  ]
}
```

### `POST /v1/executor/evidence`

Builds an exportable evidence bundle from an `ExecutorRun`. This endpoint does not execute anything. It normalizes per-step evidence, evidence hashes, runner ids, and replay flags into `naikaku.executor-evidence.v1` so future Browser, Shell, Desktop, and MCP runner services can satisfy the same audit contract.

```json
{
  "executorRun": {
    "id": "run-...-executor-run",
    "handoffId": "run-...-executor-handoff",
    "runId": "run-...",
    "mode": "dry-run",
    "steps": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.executor-evidence.v1",
  "summary": {
    "steps": 2,
    "evidenceItems": 6,
    "replayableSteps": 2
  },
  "steps": []
}
```

### `POST /v1/team/packages`

Builds role-level development packages for parallel teams. The response is safe to export because it includes provider aliases and configuration, not raw session secrets. Include a full `CabinetRun` when packages should reflect automation status; omit it to create workspace templates.

```json
{
  "workspace": {
    "mission": "Build a sandbox-first multi-model AI cabinet",
    "roles": [],
    "sandboxPolicy": {}
  },
  "run": {
    "id": "run-...",
    "artifacts": [],
    "automationActions": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.team-handoff.v1",
  "summary": {
    "roles": 8,
    "ready": 1,
    "needsApproval": 4,
    "blocked": 2,
    "templates": 1
  },
  "packages": []
}
```

### `POST /v1/sandbox/check`

Checks whether a proposed action is allowed inside the current sandbox policy.

```json
{
  "request": {
    "executorProfileId": "browser-sandbox",
    "action": "open_url",
    "target": "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
    "risk": "low"
  }
}
```

### `POST /v1/sandbox/capabilities`

Builds the executor capability registry for the current roles and sandbox policy. This endpoint does not execute actions. It evaluates representative actions for Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate, then returns runner contracts, evidence requirements, role coverage, and policy status.

```json
{
  "roles": [],
  "sandboxPolicy": {}
}
```

Response:

```json
{
  "schema": "naikaku.sandbox-capabilities.v1",
  "summary": {
    "profiles": 5,
    "rolesCovered": 8,
    "dryRunReady": 0,
    "needsApproval": 5,
    "blocked": 0,
    "approvalActions": 7,
    "blockedActions": 1,
    "killSwitchArmed": true
  },
  "cards": []
}
```

## Production Notes

The gateway is intentionally conservative:

- It does not run shell commands.
- It does not operate the host desktop.
- It does not persist raw secrets.
- It checks blocked actions and network allowlists before sandbox work.

Production work should add authentication, durable audit storage, real provider adapters, and executor backends.
