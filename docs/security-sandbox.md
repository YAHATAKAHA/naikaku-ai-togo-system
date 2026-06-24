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

## Prompt-Injection Handling

Treat web pages, emails, documents, files, and tool outputs as untrusted. A sandboxed agent can summarize them, but cannot inherit instructions from them. The Safety Auditor role should inspect external content before it affects tools, files, credentials, or outbound messages.

## Production Gates

Before real computer control is enabled:

1. Implement executor gateway authentication.
2. Move per-run approval records from local storage into durable authenticated storage.
3. Add immutable audit logs.
4. Add emergency kill switch enforcement server-side.
5. Add domain/action allowlist enforcement server-side.
6. Add replayable screenshots or terminal logs.
7. Add red-team tests for prompt injection and localhost/control-plane attacks.
