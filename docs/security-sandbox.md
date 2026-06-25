# Sandbox and Computer-Use Security

Naikaku treats computer control as a privileged capability. The default posture is sandbox-first and approval-first.

## Executor Profiles

### Browser Sandbox

Use for web workflows, research, and browser-only automation.

Controls:

- Empty browser environment.
- Domain allowlist.
- Extension and local-file restrictions where possible.
- Screenshot capture and action replay.
- Human pause and resume.

### Desktop VM

Use for GUI tasks that require a full desktop.

Controls:

- Disposable Linux VM or remote sandbox provider.
- VNC stream for observation.
- Keyboard/mouse event logging.
- No inherited host secrets.
- Kill switch.

### Shell Container

Use for code execution, test runs, and file transformations.

Controls:

- Scoped mounts only.
- Empty environment by default.
- Command allowlist for production workflows.
- CPU, memory, time, and network limits.
- Artifact export instead of broad host access.

### MCP Proxy

Use for structured tool integrations.

Controls:

- Tool allowlist.
- Per-tool credential scope.
- Schema validation.
- Rate limits.
- Audited inputs and outputs.

### Human Approval Gate

Use for high-impact or irreversible actions:

- Purchases.
- External messages.
- Deletes.
- Deployments.
- Credential changes.
- Legal, financial, medical, or identity-sensitive actions.

## Policy Defaults

The current workbench starts with:

- Human approval required.
- Kill switch armed.
- Network allowlist enabled.
- Destructive and external-send actions blocked.
- Raw secrets session-only.

## Automation Queue

Cabinet runs now produce sandbox action proposals before any executor work. Each proposal records:

- Stage and owning role.
- Executor profile.
- Action and target.
- Risk level.
- Policy status: `allowed`, `needs-approval`, or `blocked`.
- Audit tags and reason.

Executors must treat this queue as the handoff boundary. A Browser Sandbox, Shell Container, Desktop VM, or MCP Proxy should not run a proposed action unless it is policy-allowed or has an explicit human approval record.

Approval records are stored separately from action proposals and include the run id, action id, decision, timestamp, operator id, reason, and action snapshot. Executor handoff JSON is generated from the run plus those approval records:

- `allowed` actions are handoff-ready.
- `needs-approval` actions become handoff-ready only with an `approved` record.
- `rejected`, `blocked`, and unapproved actions stay held.

The workbench can export this handoff JSON for executor development. The gateway also exposes `/v1/executor/handoff` so runner services can use the same contract without reading frontend state.

The current `/v1/executor/run` runner is deliberately dry-run only. It simulates what each executor profile would receive and records audit output, but it does not run commands, browse sites, control desktops, write files, send network requests, or call MCP tools.

Each dry-run step emits `ExecutorEvidenceItem` records and an evidence hash. Browser actions receive screenshot and URL-log placeholders, shell actions receive command transcript and artifact-manifest placeholders, desktop actions receive frame and input-event placeholders, MCP actions receive schema and request-log placeholders, and approval-gate actions receive approval evidence. These are intentionally marked as dry-run evidence so production runners can replace them with real artifacts without changing the export contract.

## Sandbox Capability Registry

The workbench now derives a `naikaku.sandbox-capabilities.v1` registry from the active roles, executor profiles, and sandbox policy. Each profile card lists representative actions, policy status, runner contract, evidence requirements, role coverage, and risk notes. This makes OpenClaw-style local control, E2B-style desktop sandboxes, Browser Use-style harnesses, and MCP tool runners pluggable without letting them bypass Naikaku policy.

The registry is a preflight and implementation contract. It does not grant runtime permission by itself. Real runners must still consume `ExecutorHandoff.readyActions`, enforce server-side allowlists, emit the required evidence, and stop when the kill switch or approval gate blocks an action.

Team package exports use provider aliases and role configuration only. They are intended for parallel development handoff and must not contain raw session secrets.

## Audit Trail

The workbench records local `AuditEvent` entries for workspace save/import/export/reset, custom role create/duplicate/delete, provider readiness checks/exports, cabinet run completion, approval decisions, executor handoff export, executor dry-run completion, executor evidence export, team handoff export, memory review, and development board status/export events. Operators can inspect and export these events from the UI.

This is a local development ledger, not an immutable production ledger. Production should move audit events into authenticated append-only backend storage with server timestamps and operator identity.

## Memory Review

Memory candidates are treated as privileged project knowledge. The Memory Inbox only persists a candidate after an operator accepts or rejects it. Entries carry retention labels and consent tags so production storage can enforce project policy instead of silently accumulating raw run context.

Memory exports should not include raw provider secrets. Production memory storage should add search, deletion workflows, operator identity, and retention enforcement before long-term use.

## Provider Secret Handling

Provider readiness exports include provider, model, endpoint, alias, status, source, and whether a secret was available. They do not include raw session secrets. Alias values must be environment-variable names; raw-looking key strings are treated as missing secret configuration.

## Prompt-Injection Handling

Treat web pages, emails, documents, files, and tool outputs as untrusted. A sandboxed agent can summarize them, but cannot inherit instructions from them. The Safety Auditor role should inspect external content before it affects tools, files, credentials, or outbound messages.

## Production Gates

Before real computer control is enabled:

1. Implement executor gateway authentication.
2. Move per-run approval records from local storage into durable authenticated storage.
3. Replace the local audit trail with immutable server-side audit logs.
4. Add emergency kill switch enforcement server-side.
5. Add domain/action allowlist enforcement server-side.
6. Replace the dry-run executor with authenticated Browser/Shell/Desktop/MCP runner services.
7. Make runner services emit the evidence required by the Sandbox Capability registry and `naikaku.executor-evidence.v1`.
8. Replace dry-run evidence placeholders with replayable screenshots, terminal logs, artifact manifests, and tool-call transcripts.
9. Add red-team tests for prompt injection and localhost/control-plane attacks.
10. Move reviewed memory entries to durable storage with retention and deletion controls.
