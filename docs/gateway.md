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
NAIKAKU_RUNNER_TOKEN=optional-local-runner-token
NAIKAKU_LEDGER_DIR=.naikaku-data
```

`VITE_NAIKAKU_GATEWAY_URL` is read by the browser app. The other values are read by the Node gateway.

`NAIKAKU_RUNNER_TOKEN` protects executor-facing routes when it is set. Local development can omit it, but `/health` will then report `runnerAuth.mode` as `development-open`.

`NAIKAKU_LEDGER_DIR` controls where the gateway stores local approval and evidence ledgers. The default is `.naikaku-data`, which is ignored by Git.

The workbench Server Ledger panel reads `/v1/ledger/status`, `/v1/ledger/approvals`, and `/v1/ledger/evidence` for operator review. It does not store or send runner tokens from the browser; when evidence reads are protected by `NAIKAKU_RUNNER_TOKEN`, the panel surfaces the gateway authentication error and still shows approval/status data.

Authenticated runner requests use either:

```http
Authorization: Bearer <NAIKAKU_RUNNER_TOKEN>
x-naikaku-runner-id: shell-runner-01
```

or:

```http
x-naikaku-runner-token: <NAIKAKU_RUNNER_TOKEN>
x-naikaku-runner-id: shell-runner-01
```

## Endpoints

### `GET /health`

Returns service status and supported capabilities.

The response also includes runner auth posture:

```json
{
  "runnerAuth": {
    "mode": "token-required",
    "configured": true,
    "acceptedHeaders": ["Authorization: Bearer <token>", "x-naikaku-runner-token"],
    "runnerIdRequired": true
  }
}
```

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

### `POST /v1/automation/runbook`

Builds a runner-facing automation runbook from a run plus approval records. This does not execute actions. It converts executor-ready actions into command templates, preflight checks, evidence requirements, verification gates, and rollback notes for Shell, Browser, Desktop, MCP, and Human Approval runner teams.

```json
{
  "run": { "id": "run-...", "automationActions": [] },
  "approvalRecords": []
}
```

Response:

```json
{
  "schema": "naikaku.automation-runbook.v1",
  "runId": "run-...",
  "handoffId": "run-...-executor-handoff",
  "summary": {
    "ready": 2,
    "held": 5,
    "approvalGated": 1
  },
  "steps": [
    {
      "runnerId": "naikaku.shell-container.runner",
      "command": "sandbox.shell.run --cwd \"/workspace\" --command \"npm run test\"",
      "evidenceRequired": ["Command transcript", "Exit code and runtime"]
    }
  ]
}
```

### `POST /v1/executor/handoff`

Builds the executor-facing handoff from a run plus approval records. This does not execute actions. It filters out blocked, rejected, and still-unapproved work.

If `NAIKAKU_RUNNER_TOKEN` is set, this route requires runner authentication.
Any supplied approval records are also upserted into the local ledger.

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

If `NAIKAKU_RUNNER_TOKEN` is set, this route requires runner authentication.

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

If `NAIKAKU_RUNNER_TOKEN` is set, this route requires runner authentication.
The generated bundle is also upserted into the local evidence ledger.

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

### `GET /v1/ledger/status`

Returns local ledger counts and the active ledger directory.

```json
{
  "schema": "naikaku.ledger-summary.v1",
  "ledgerDir": ".naikaku-data",
  "approvals": 3,
  "evidenceBundles": 2
}
```

### `GET /v1/ledger/approvals`

Lists stored approval records. Add `?runId=run-...` to filter.

```json
{
  "schema": "naikaku.approval-ledger-query.v1",
  "runId": "run-...",
  "records": []
}
```

### `POST /v1/ledger/approvals`

Upserts one `AutomationApprovalRecord` into the local ledger.

```json
{
  "record": {
    "id": "run-action-approved",
    "runId": "run-...",
    "actionId": "action-...",
    "decision": "approved"
  }
}
```

### `GET /v1/ledger/evidence`

Lists stored executor evidence bundles. Add `?runId=run-...` or `?executorRunId=...` to filter. If `NAIKAKU_RUNNER_TOKEN` is set, this route requires runner authentication.

```json
{
  "schema": "naikaku.evidence-ledger-query.v1",
  "bundles": []
}
```

### `POST /v1/ledger/evidence`

Upserts one `naikaku.executor-evidence.v1` bundle. If `NAIKAKU_RUNNER_TOKEN` is set, this route requires runner authentication.

```json
{
  "bundle": {
    "schema": "naikaku.executor-evidence.v1",
    "executorRunId": "run-...-executor-run"
  }
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

### `POST /v1/team/workspaces`

Builds per-role workspace scaffolds from the same team handoff contract. The response is safe to export because it includes `.env.example` placeholders and provider aliases, not raw session secrets. The workbench can derive a reviewable shell script from this response to create local starter folders for each role team.

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
  "schema": "naikaku.role-workspace-scaffolds.v1",
  "summary": {
    "roles": 8,
    "files": 40,
    "envFiles": 8,
    "runnerNotes": 8
  },
  "scaffolds": [
    {
      "rootPath": "team-workspaces/prime-minister",
      "files": [
        {
          "path": "team-workspaces/prime-minister/.env.example",
          "purpose": "env-example"
        }
      ]
    }
  ]
}
```

### `POST /v1/product/readiness`

Builds the product delivery gate from the current workspace and optional run state. This endpoint does not execute providers or runners. It combines provider readiness, sandbox capability coverage, automation runbook status, team handoffs, role workspace scaffolds, development board items, issue drafts, audit events, approvals, and memory review into `naikaku.product-readiness.v1`.

```json
{
  "workspace": {
    "mission": "Build a sandbox-first multi-model AI cabinet",
    "roles": [],
    "sandboxPolicy": {}
  },
  "providerReadiness": {
    "schema": "naikaku.provider-readiness.v1",
    "rows": []
  },
  "run": {
    "id": "run-...",
    "artifacts": [],
    "automationActions": []
  },
  "approvalRecords": [],
  "memoryEntries": [],
  "savedItems": [],
  "auditEvents": []
}
```

Response:

```json
{
  "schema": "naikaku.product-readiness.v1",
  "decision": "needs-review",
  "score": 72,
  "summary": {
    "passed": 8,
    "warnings": 3,
    "blockers": 1
  },
  "gates": [
    {
      "category": "automation",
      "status": "warn",
      "label": "Automation runbook"
    }
  ]
}
```

### `POST /v1/product/release-bundle`

Builds a single release handoff artifact from the same state used by Product Readiness. This endpoint does not execute providers, runners, shell scripts, or GitHub calls. It packages the current workspace evidence into `naikaku.product-release-bundle.v1` with a manifest of included, missing, and review-required artifacts. The gateway returns JSON only; the workbench can derive paired Markdown release notes locally from the returned bundle.

```json
{
  "workspace": {
    "mission": "Build a sandbox-first multi-model AI cabinet",
    "roles": [],
    "sandboxPolicy": {}
  },
  "providerReadiness": {
    "schema": "naikaku.provider-readiness.v1",
    "rows": []
  },
  "run": {
    "id": "run-...",
    "artifacts": [],
    "automationActions": []
  },
  "approvalRecords": [],
  "memoryEntries": [],
  "savedItems": [],
  "auditEvents": []
}
```

Response:

```json
{
  "schema": "naikaku.product-release-bundle.v1",
  "readiness": {
    "decision": "needs-review",
    "score": 72
  },
  "summary": {
    "artifacts": 12,
    "missing": 1,
    "reviewRequired": 4
  },
  "manifest": {
    "items": [
      {
        "id": "product-readiness",
        "status": "review-required"
      }
    ],
    "operatorCommands": ["npm run test", "npm run build"]
  }
}
```

### `POST /v1/product/rehearsal`

Builds an end-to-end release rehearsal report from the same delivery state. This endpoint does not execute providers, runners, shell scripts, or GitHub calls. If no run is provided, it creates a deterministic dry-run cabinet simulation, then derives automation runbook data, executor evidence, release bundle data, and release notes checks into `naikaku.release-rehearsal.v1`. Browser session secrets should stay local; the workbench performs raw secret probe scans locally instead of sending secret values to this endpoint.

```json
{
  "workspace": {
    "mission": "Build a sandbox-first multi-model AI cabinet",
    "roles": [],
    "sandboxPolicy": {}
  },
  "providerReadiness": {
    "schema": "naikaku.provider-readiness.v1",
    "rows": []
  },
  "run": {
    "id": "run-...",
    "artifacts": [],
    "automationActions": []
  },
  "approvalRecords": [],
  "memoryEntries": [],
  "savedItems": [],
  "auditEvents": []
}
```

Response:

```json
{
  "schema": "naikaku.release-rehearsal.v1",
  "decision": "needs-review",
  "score": 72,
  "summary": {
    "passed": 5,
    "warnings": 3,
    "blockers": 0,
    "secretLeakDetected": false,
    "evidenceItems": 3
  },
  "remediation": {
    "summary": {
      "total": 3,
      "high": 2
    },
    "items": [
      {
        "sourceCheckId": "provider-readiness",
        "owner": "Provider adapter team",
        "priority": "high",
        "verificationCommand": "npm run rehearsal:strict"
      }
    ]
  },
  "artifacts": {
    "releaseBundleSchema": "naikaku.product-release-bundle.v1",
    "evidenceSchema": "naikaku.executor-evidence.v1",
    "runnerSteps": 1,
    "heldActions": 6
  }
}
```

### `POST /v1/product/release-verification`

Verifies a `naikaku.release-rehearsal.v1` report without executing providers, runners, shell commands, or GitHub calls. The default mode accepts dry-run evidence for sandbox handoff checks. Set `requireProductionEvidence` to `true` before any real release handoff; dry-run evidence will then produce `not-production-ready` unless all other release gates are already clear.

```json
{
  "report": {
    "schema": "naikaku.release-rehearsal.v1",
    "runId": "run-...",
    "decision": "release-ready",
    "evidenceClaim": {
      "level": "dry-run",
      "claim": "Sandbox dry-run evidence only.",
      "limitations": ["No live provider or runner execution."],
      "productionRequirements": ["Attach authenticated runner evidence."]
    },
    "summary": {
      "warnings": 0,
      "blockers": 0,
      "secretLeakDetected": false
    }
  },
  "requireProductionEvidence": true
}
```

Response:

```json
{
  "schema": "naikaku.release-verification.v1",
  "sourceRunId": "run-...",
  "scope": "production",
  "requireProductionEvidence": true,
  "decision": "not-production-ready",
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1
  },
  "checks": [
    {
      "id": "production-evidence-required",
      "status": "fail",
      "nextAction": "Attach authenticated runner evidence before production handoff."
    }
  ]
}
```

### `POST /v1/development/issues`

Builds GitHub-ready issue drafts from the current workspace, optional run, reviewed memory, and saved development item statuses. This endpoint does not call GitHub. It returns labeled Markdown payloads that a human, CLI, or future GitHub connector can use after repository authentication. The workbench can also derive a reviewable `gh issue create` shell script from this response, but the gateway still does not hold GitHub credentials or create issues directly.

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
  },
  "memoryEntries": [],
  "savedItems": []
}
```

Response:

```json
{
  "schema": "naikaku.github-issue-drafts.v1",
  "summary": {
    "total": 12,
    "ready": 10,
    "blocked": 2,
    "highPriority": 6,
    "teams": 8
  },
  "drafts": [
    {
      "title": "[Team] Execution Minister: Implementation",
      "labels": ["naikaku", "mvp", "source:team-package"],
      "body": "Mission: ...\n\n## Work\n..."
    }
  ]
}
```

### `POST /v1/development/coding-briefs`

Builds Codex-like coding agent briefs from the current workspace, optional run, reviewed memory, saved development item statuses, optional release verification, and operator locale. This endpoint does not execute code, call providers, run shell commands, open browsers, push Git, or deploy. It returns reviewable implementation prompts with sandbox boundaries, prohibited actions, verification commands, and evidence requirements.

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
  },
  "memoryEntries": [],
  "savedItems": [],
  "releaseVerification": {
    "schema": "naikaku.release-verification.v1",
    "decision": "not-production-ready"
  },
  "operatorLocale": "ja"
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-briefs.v1",
  "operatorLocale": "ja",
  "summary": {
    "total": 12,
    "implementable": 9,
    "blocked": 2,
    "humanReview": 3,
    "highPriority": 5,
    "productionEvidenceRequired": false
  },
  "briefs": [
    {
      "title": "Execution Minister: Implementation",
      "mode": "implement",
      "sandbox": {
        "executorProfileId": "shell-container",
        "prohibitedActions": ["raw-secret-export", "unreviewed-git-push"]
      },
      "verificationCommands": ["npm run test", "npm run build"],
      "releaseGate": {
        "required": true
      }
    }
  ]
}
```

### `POST /v1/development/coding-briefs/review`

Reviews generated coding agent briefs before they are handed to an implementation agent. This endpoint does not execute code, run tests, push Git, deploy, read secrets, or call providers. It checks that the prompt package contains the required schema, complete task data, sandbox prohibitions, verification commands, human-approval flags, and truthful release-gate evidence.

The `briefs` payload should be the full object returned by `/v1/development/coding-briefs`; the example below is abbreviated for readability.

```json
{
  "briefs": {
    "schema": "naikaku.coding-agent-briefs.v1",
    "briefs": [
      {
        "id": "coding-brief-dev-1",
        "title": "Implement sandbox check",
        "verificationCommands": ["npm run test", "npm run build"],
        "sandbox": {
          "prohibitedActions": ["raw-secret-export", "production-deploy", "remote-delete", "purchase", "external-message-send", "unreviewed-git-push"]
        }
      }
    ]
  },
  "releaseVerification": {
    "schema": "naikaku.release-verification.v1",
    "decision": "verified",
    "scope": "dry-run"
  },
  "requireProductionEvidence": false
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-brief-review.v1",
  "decision": "ready",
  "summary": {
    "passed": 5,
    "warnings": 0,
    "blockers": 0,
    "briefs": 12
  },
  "checks": [
    {
      "id": "coding-brief-sandbox-boundary",
      "status": "pass",
      "nextAction": "Keep these boundaries visible when copying prompts to coding agents."
    }
  ]
}
```

### `POST /v1/development/coding-briefs/session-bundle`

Builds a handoff bundle for sandboxed coding-agent sessions from generated briefs and an optional review report. This endpoint does not execute code, run tests, browse, deploy, send external messages, or push Git. If `requireProductionEvidence` is true, the gateway rebuilds the embedded review in production mode so a stale dry-run review cannot be reused for production handoff.

The `briefs` payload should be the full object returned by `/v1/development/coding-briefs`; the example below is abbreviated for readability.

```json
{
  "briefs": {
    "schema": "naikaku.coding-agent-briefs.v1",
    "briefs": []
  },
  "review": {
    "schema": "naikaku.coding-agent-brief-review.v1",
    "decision": "ready"
  },
  "releaseVerification": {
    "schema": "naikaku.release-verification.v1",
    "decision": "verified",
    "scope": "dry-run"
  },
  "requireProductionEvidence": false
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-session-bundle.v1",
  "mode": "dry-run",
  "decision": "ready",
  "summary": {
    "total": 8,
    "ready": 8,
    "held": 0,
    "productionHeld": 0
  },
  "sessions": [
    {
      "status": "ready-for-agent",
      "promptFileName": "01-team-execution-minister-implementation.md",
      "verificationCommands": ["npm run test", "npm run build"],
      "nextAction": "Assign to a sandboxed coding agent and require changed files, command output, and remaining risk notes."
    }
  ]
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
- It requires runner authentication for executor routes when `NAIKAKU_RUNNER_TOKEN` is configured.
- It stores local ledger files under `NAIKAKU_LEDGER_DIR` and keeps that directory out of Git.

Production work should add authentication, durable audit storage, real provider adapters, and executor backends.
