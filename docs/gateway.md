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

### `POST /v1/development/coding-briefs/dispatch-manifest`

Builds a dispatch manifest from a reviewed coding-agent session bundle and an optional session drill report. This endpoint does not execute code, call providers, run shell commands, write files, browse, deploy, send external messages, or push Git. It only decides which sessions should receive prompt paths and receipt-template instructions inside a governed dispatch package.

```json
{
  "bundle": {
    "schema": "naikaku.coding-agent-session-bundle.v1",
    "decision": "ready",
    "sessions": []
  },
  "drill": {
    "schema": "naikaku.coding-agent-session-drill.v1",
    "decision": "assignable",
    "items": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-dispatch-manifest.v1",
  "mode": "dry-run-dispatch",
  "decision": "dispatchable",
  "receiptTemplatePath": "receipt-template.json",
  "summary": {
    "total": 8,
    "ready": 8,
    "held": 0,
    "promptFiles": 8,
    "unsafePaths": 0
  },
  "items": [
    {
      "dispatchStatus": "ready-to-dispatch",
      "promptPath": "prompts/01-team-execution-minister-implementation.md",
      "receiptTemplatePath": "receipt-template.json",
      "evidenceArtifactPrefix": "output/coding-agent/coding-brief-example/",
      "expectedTranscriptRefs": [
        "output/coding-agent/coding-brief-example/transcript-1.log"
      ]
    }
  ]
}
```

If the bundle is held for review or production evidence, the manifest stays `held` or `blocked`; held items do not receive prompt paths or receipt-template paths. This prevents dry-run packages from becoming accidental implementation assignments.

### `POST /v1/development/coding-briefs/dispatch-simulation`

Self-simulates the next coding-agent execution handoff from a dispatch manifest and optional archive audit. This endpoint does not execute code, run shell commands, inspect files, call providers, open browsers, write implementation artifacts, deploy, send external messages, commit, or push Git. It prepares pending receipt drafts only for ready sessions and keeps held sessions visible but unassigned.

```json
{
  "manifest": {
    "schema": "naikaku.coding-agent-dispatch-manifest.v1",
    "decision": "dispatchable",
    "items": []
  },
  "archiveAudit": {
    "schema": "naikaku.coding-agent-dispatch-archive-audit.v1",
    "decision": "verified"
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-dispatch-simulation.v1",
  "mode": "local-simulation",
  "decision": "ready-for-real-agent",
  "dispatchDecision": "dispatchable",
  "archiveAuditDecision": "verified",
  "summary": {
    "total": 8,
    "readyForAgent": 8,
    "held": 0,
    "blocked": 0,
    "receiptDraftItems": 8,
    "unsafePaths": 0
  },
  "honestyClaim": {
    "level": "local-dispatch-simulation",
    "claim": "This report simulates the next coding-agent execution handoff from a dispatch manifest without executing implementation work."
  }
}
```

If the archive audit is blocked, ready sessions stay blocked. If a session is held for review or production evidence, the simulation must not create a receipt draft for it. A ready simulation still means only that the handoff is prepared; a completed receipt and artifact audit are required before implementation can be claimed.

### `POST /v1/development/coding-briefs/runner-manifest`

Converts a dispatch simulation and pending receipt draft paths into a runner-facing coding-agent task manifest. This endpoint does not execute the runner, run commands, open a browser, control a desktop, call MCP tools, edit files, commit, push, deploy, or claim implementation evidence. It only prepares the queue contract future Codex/OpenClaw-style executors can consume inside governed workspaces.

```json
{
  "simulation": {
    "schema": "naikaku.coding-agent-dispatch-simulation.v1",
    "decision": "ready-for-real-agent",
    "items": []
  },
  "receiptDraftPaths": {
    "coding-session-example": "receipt-drafts/01-coding-session-example.json"
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-runner-manifest.v1",
  "mode": "runner-handoff-planning",
  "decision": "runner-ready",
  "summary": {
    "readyTasks": 8,
    "runnerTasks": 8,
    "receiptDraftPaths": 8,
    "unsafePaths": 0
  },
  "honestyClaim": {
    "level": "runner-handoff-planning",
    "claim": "This manifest prepares runner-facing coding-agent handoff tasks without executing implementation work."
  }
}
```

Ready tasks require safe prompt paths, safe receipt draft paths, pending command results, expected evidence paths, and stop conditions. Held or production-evidence-held sessions must remain out of the runner task queue.

### `POST /v1/development/coding-briefs/runner-invocation`

Consumes a runner manifest and prepares one runner invocation package plus one invocation file contract per ready task. This endpoint does not execute commands, read prompt contents, open browsers, control desktops, call MCP tools, call providers, edit files, commit, push, deploy, or claim implementation evidence. It only turns a runner-ready manifest into governed handoff files that future Codex/OpenClaw-style coding runners can consume inside a sandbox.

```json
{
  "manifest": {
    "schema": "naikaku.coding-agent-runner-manifest.v1",
    "decision": "runner-ready",
    "items": []
  },
  "invocationBasePath": "output/coding-agent-runner-invocation/run-ja/invocations"
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-runner-invocation-package.v1",
  "mode": "runner-invocation-packaging",
  "decision": "package-ready",
  "summary": {
    "readyInvocations": 8,
    "invocationFiles": 8,
    "commandContracts": 16,
    "receiptDraftPaths": 8,
    "unsafePaths": 0
  },
  "honestyClaim": {
    "level": "runner-invocation-packaging",
    "claim": "This package prepares runner-consumable coding-agent invocation files without executing implementation work."
  }
}
```

Ready tasks receive safe JSON/Markdown invocation file paths, prompt paths, receipt draft paths, pending command contracts, expected transcript paths, evidence targets, runner instructions, and stop conditions. Held or production-evidence-held tasks remain visible in the package summary but must receive zero executable invocation files.

### `POST /v1/development/coding-briefs/runner-self-test`

Consumes a runner manifest and simulates the local runner preflight contract. This endpoint does not read prompt file contents, execute commands, open browsers, control desktops, call MCP tools, call providers, edit files, commit, push, deploy, or claim implementation evidence. It only reports whether a governed runner could consume the manifest and which tasks would stay held or blocked.

```json
{
  "manifest": {
    "schema": "naikaku.coding-agent-runner-manifest.v1",
    "decision": "runner-ready",
    "items": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-runner-self-test.v1",
  "mode": "local-runner-self-test",
  "decision": "self-test-ready",
  "summary": {
    "wouldRun": 8,
    "notExecutedCommands": 16,
    "receiptDraftPaths": 8,
    "unsafePaths": 0
  },
  "honestyClaim": {
    "level": "local-runner-self-test",
    "claim": "This self-test simulates runner preflight consumption of a coding-agent runner manifest without executing implementation work."
  }
}
```

The response must keep command exit codes null and command status `not-executed`. A self-test-ready decision means the runner contract is consumable, not that a coding agent has completed the task.

### `POST /v1/development/coding-briefs/sandbox-runner/preflight`

Consumes a runner self-test plus the matching session bundle and checks whether the sandbox runner may execute. This endpoint does not execute commands. It verifies the self-test status, bundle/session match, local command allowlist, expected transcript/evidence paths, and the honesty boundary before the executable sandbox runner route is called.

```json
{
  "selfTest": {
    "schema": "naikaku.coding-agent-runner-self-test.v1",
    "decision": "self-test-ready",
    "items": []
  },
  "bundle": {
    "schema": "naikaku.coding-agent-session-bundle.v1",
    "decision": "ready",
    "sessions": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-sandbox-runner-preflight.v1",
  "mode": "local-sandbox-runner-preflight",
  "decision": "ready",
  "summary": {
    "readyTasks": 8,
    "heldTasks": 0,
    "blockedTasks": 0,
    "allowedCommands": 16,
    "blockedCommands": 0,
    "expectedProcessExecutions": 2
  },
  "honestyClaim": {
    "level": "local-sandbox-runner-preflight"
  }
}
```

A `ready` preflight means the inputs are eligible for the local sandbox runner. It still does not prove feature implementation and does not replace the executable runner report, receipt review, artifact audit, or production evidence.

### `POST /v1/development/coding-briefs/sandbox-runner`

Consumes a ready runner self-test and the matching session bundle, then executes only the gateway's local sandbox-runner allowlist. Today that allowlist is `npm run test` and `npm run build`. The endpoint writes session-scoped transcripts, changed-file summary placeholders, evidence artifacts, a submitted receipt, receipt review, implementation evidence, and artifact audit. It does not call a model, implement backlog work, browse, control desktops, call MCP tools, call providers, deploy, commit, push, or claim production evidence.

The execution route always reruns the sandbox runner preflight server-side before any command starts, even if the caller already used the preflight endpoint. If that server-side preflight is not `ready`, the route returns `409` with the preflight payload and does not execute commands. This prevents direct API callers from bypassing the Workbench preflight step.

If `NAIKAKU_RUNNER_TOKEN` is set, this route requires runner authentication.

```json
{
  "selfTest": {
    "schema": "naikaku.coding-agent-runner-self-test.v1",
    "decision": "self-test-ready",
    "items": []
  },
  "bundle": {
    "schema": "naikaku.coding-agent-session-bundle.v1",
    "decision": "ready",
    "sessions": []
  },
  "timeoutMs": 120000
}
```

Blocked preflight response:

```json
{
  "ok": false,
  "message": "Sandbox runner preflight is not ready; execution was not started.",
  "preflight": {
    "schema": "naikaku.coding-agent-sandbox-runner-preflight.v1",
    "decision": "blocked"
  },
  "gatewayRunnerId": "local-gateway",
  "authMode": "development-open"
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-sandbox-runner-result.v1",
  "preflight": {
    "schema": "naikaku.coding-agent-sandbox-runner-preflight.v1",
    "decision": "ready"
  },
  "report": {
    "schema": "naikaku.coding-agent-sandbox-runner.v1",
    "mode": "local-sandbox-runner-drill",
    "decision": "sandbox-runner-verified",
    "summary": {
      "executedTasks": 8,
      "processExecutions": 2,
      "commandResults": 16,
      "failedCommands": 0,
      "blockedCommands": 0
    }
  },
  "receiptReview": {
    "schema": "naikaku.coding-agent-session-receipt.v1"
  },
  "implementationEvidence": {
    "schema": "naikaku.coding-agent-implementation-evidence.v1"
  },
  "artifactAudit": {
    "schema": "naikaku.coding-agent-implementation-artifact-audit.v1"
  },
  "honestyClaim": {
    "level": "local-sandbox-runner-drill"
  }
}
```

A `sandbox-runner-verified` decision proves the local command/evidence/receipt/audit plumbing can run inside the current workspace. It must not be treated as proof that feature implementation work was done by a real coding agent.

### `POST /v1/development/coding-briefs/session-drill`

Simulates assignment decisions for a previously built coding-agent session bundle. This endpoint does not call a model provider, external coding agent, shell, browser, deploy target, external service, or Git remote. It only reports which sessions would be assignable in a governed sandbox and which must stay held.

```json
{
  "bundle": {
    "schema": "naikaku.coding-agent-session-bundle.v1",
    "decision": "ready",
    "sessions": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-session-drill.v1",
  "mode": "dry-run",
  "decision": "assignable",
  "bundleDecision": "ready",
  "summary": {
    "total": 8,
    "wouldAssign": 8,
    "notAssigned": 0,
    "needsReview": 0,
    "blocked": 0
  },
  "honestyClaim": {
    "level": "dry-run",
    "claim": "This drill only simulates coding-agent session assignment decisions."
  }
}
```

### `POST /v1/development/coding-briefs/session-receipt-template`

Builds a receipt template for real coding-agent completion evidence. This endpoint does not execute code, inspect files, run shell commands, call providers, browse, deploy, send external messages, or push Git. It prepares the fields a receiving coding agent must fill: changed files, command results with exit codes, evidence artifacts, and remaining risk notes.

```json
{
  "bundle": {
    "schema": "naikaku.coding-agent-session-bundle.v1",
    "decision": "ready",
    "sessions": []
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-session-receipt.v1",
  "mode": "evidence-review",
  "decision": "needs-evidence",
  "summary": {
    "total": 8,
    "verified": 0,
    "pendingEvidence": 8,
    "failed": 0,
    "held": 0
  },
  "honestyClaim": {
    "level": "submitted-evidence-review",
    "claim": "This receipt reviews submitted coding-agent evidence and does not execute the work itself."
  }
}
```

### `POST /v1/development/coding-briefs/session-receipt-review`

Reviews a filled receipt against the original session bundle. The workbench uses the same contract when an operator imports a completed receipt JSON. A verified review means the submitted evidence is structurally complete, includes safe relative changed-file references, command-transcript and evidence-artifact references under the session sandbox evidence prefix, and covers every requested `evidenceRequired` item from the original session; it still does not prove Naikaku independently reran commands or inspected files.

```json
{
  "bundle": {
    "schema": "naikaku.coding-agent-session-bundle.v1"
  },
  "receipt": {
    "schema": "naikaku.coding-agent-session-receipt.v1",
    "items": []
  }
}
```

Receipt review decisions are:

- `verified`: every ready session includes safe relative changed files, passing command exit codes with transcript references under the session evidence prefix, evidence artifact references under the same prefix that cover each requested evidence item, and risk notes.
- `needs-evidence`: no command failed, but required implementation evidence is still missing, mismatched to the requested evidence item, unsafe, outside the session evidence prefix, or only a claim without a local artifact reference.
- `blocked`: a command failed, a session is held, or production evidence is required before acceptance.

### `POST /v1/development/coding-briefs/implementation-evidence`

Builds a handoff summary from a reviewed coding-agent receipt. This endpoint does not execute code, inspect changed files, rerun commands, call providers, browse, deploy, send external messages, or push Git. It only converts the receipt into `naikaku.coding-agent-implementation-evidence.v1` with accepted sessions, source work-item ids when available, command results, evidence artifacts, missing proof, and risk notes.

```json
{
  "receipt": {
    "schema": "naikaku.coding-agent-session-receipt.v1",
    "decision": "verified"
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-implementation-evidence.v1",
  "sourceDecision": "verified",
  "decision": "accepted-for-handoff",
  "summary": {
    "accepted": 8,
    "failedCommands": 0,
    "evidenceItems": 32
  }
}
```

Implementation evidence decisions are:

- `accepted-for-handoff`: the reviewed receipt is structurally complete for handoff.
- `needs-evidence`: the reviewed receipt still lacks required implementation evidence.
- `blocked`: a command failed, a session is held, or production evidence is required before acceptance.

### `POST /v1/development/coding-briefs/implementation-artifact-audit`

Checks local artifact references from implementation evidence before the workbench updates Development Board status. This endpoint does not rerun commands, prove command output truthfulness, call providers, browse, deploy, or push Git. It verifies that changed-file, evidence-artifact, and command-transcript references are safe relative paths and, when found inside the current gateway workspace, records local `sha256`, byte count, and modified-time fingerprints. Repeated references are reported separately from unique files. Evidence entries that only claim an artifact is "attached" without a local artifact path, evidence artifacts reused across required evidence items, changed files reused across multiple sessions, empty command transcripts, transcript files reused by multiple command results, and transcripts that do not mention the expected command plus exit code are treated as missing proof for automatic board updates. Transcript text is inspected locally for this structural check but is not returned in the audit response.

```json
{
  "evidence": {
    "schema": "naikaku.coding-agent-implementation-evidence.v1",
    "decision": "accepted-for-handoff"
  }
}
```

Response:

```json
{
  "schema": "naikaku.coding-agent-implementation-artifact-audit.v1",
  "decision": "verified",
  "summary": {
    "verified": 8,
    "verifiedPaths": 56,
    "missingPaths": 0,
    "unsafePaths": 0,
    "fingerprintedPaths": 56,
    "totalBytes": 112000,
    "uniquePaths": 41,
    "duplicatePathRefs": 15,
    "uniqueFingerprintedPaths": 41,
    "uniqueFingerprintBytes": 81920,
    "evidenceArtifactRefs": 32,
    "evidenceArtifactPaths": 32,
    "reusedEvidenceArtifactPaths": 0,
    "reusedEvidenceArtifactRefs": 0,
    "reusedTranscriptPaths": 0,
    "reusedTranscriptRefs": 0,
    "reusedChangedFilePaths": 0,
    "reusedChangedFileRefs": 0,
    "transcriptContentChecked": 16,
    "transcriptContentMismatches": 0
  },
  "items": [
    {
      "paths": [
        {
          "kind": "evidence-artifact",
          "path": "output/coding-agent/session-1/evidence-1.txt",
          "status": "verified",
          "bytes": 2048,
          "sha256": "..."
        },
        {
          "kind": "changed-file",
          "path": "src/App.tsx",
          "status": "verified",
          "bytes": 2400,
          "sha256": "..."
        }
      ]
    }
  ]
}
```

Artifact audit decisions are:

- `verified`: every accepted item has safe, existing local changed-file, evidence-artifact, and transcript references; gateway-backed checks include local file fingerprints.
- `needs-artifacts`: required references are missing, non-path evidence claims, absent, reused as evidence artifacts or changed files, empty for command transcripts, reused across command results, structurally mismatched against the command result, or could not be checked without gateway filesystem access.
- `blocked`: a referenced path is unsafe or implementation evidence is blocked.

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
