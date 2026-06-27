# Sandbox and Computer-Use Security

Naikaku treats computer control as a privileged capability. The default posture is sandbox-first and approval-first.

This is how Codex-like programming and OpenClaw-style computer control fit the product direction: agents may plan, edit, test, browse, or operate desktops only through explicit executor profiles, with policy decisions, human approval where needed, runner identity, local artifacts, and release verification attached before the cabinet accepts the work as complete.

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
When the gateway receives approval records through handoff or `/v1/ledger/approvals`, it upserts them into the local ledger under `NAIKAKU_LEDGER_DIR`.

The current `/v1/executor/run` runner is deliberately dry-run only. It simulates what each executor profile would receive and records audit output, but it does not run commands, browse sites, control desktops, write files, send network requests, or call MCP tools.

Executor-facing gateway routes now support runner authentication. When `NAIKAKU_RUNNER_TOKEN` is configured, `/v1/executor/handoff`, `/v1/executor/run`, and `/v1/executor/evidence` require a valid bearer token or `x-naikaku-runner-token` plus `x-naikaku-runner-id`. If the token is not configured, `/health` reports `development-open` so local development is explicit rather than silently pretending to be production-secure.

Each dry-run step emits `ExecutorEvidenceItem` records and an evidence hash. Browser actions receive screenshot and URL-log placeholders, shell actions receive command transcript and artifact-manifest placeholders, desktop actions receive frame and input-event placeholders, MCP actions receive schema and request-log placeholders, and approval-gate actions receive approval evidence. These are intentionally marked as dry-run evidence so production runners can replace them with real artifacts without changing the export contract.
Generated evidence bundles are also upserted into the local evidence ledger and can be queried through `/v1/ledger/evidence`.

Release rehearsal reports include an `evidenceClaim` object so a passing sandbox drill cannot be mistaken for production runner proof. In the current implementation the claim level is `dry-run`; it explicitly states that no shell, browser, desktop, or MCP action was actually executed, then lists the runner identity, real artifact, append-only ledger, and server-side provider-readiness requirements needed for production handoff.

The release verifier makes that boundary executable. The workbench panel, local gateway, and `npm run release:verify` accept clean localization, executor contract, sandbox capability, security red-team, coding-agent dispatch, coding-agent dispatch simulation, coding-agent runner manifest, coding-agent runner invocation, coding-agent runner intake audit, coding-agent runner self-test, coding-agent sandbox runner, coding-agent receipt, and release dry-run drills as sandbox evidence, then run a production boundary drill and write a verification manifest that records all gates. `npm run release:verify:production` returns code 4 until authenticated production runner evidence is attached. `npm run verify:all` treats that code 4 as the expected negative gate after tests, build, and dry-run verification pass, and CI should run the same command. This gives CI and operators a hard stop between "the drills work" and "real computer-control backends are safe to release."

Coding Agent Briefs extend the same boundary to programming agents. They convert development work items into reviewable prompts that tell an implementation agent what to build, which verification commands to run, which executor boundary applies, and which actions are forbidden. The brief explicitly prohibits raw-secret export, unreviewed Git push, production deploys, remote deletes, purchases, and external message sends. It is a handoff artifact, not proof that implementation has happened.

The Coding Agent Brief Review gate checks that every generated prompt still carries those prohibitions, core build/test commands, release verification commands when required, human approval flags for blocked or critical work, and honest dry-run versus production wording. If production evidence is required but the attached release verification is missing or only dry-run scoped, the review decision is `blocked`.

Coding Agent Session Bundles package only the reviewed handoff state. They separate `ready-for-agent` sessions from held sessions, preserve safety stops and next actions, and carry a structured sandbox contract for each session: sandbox-only boundary, executor profile, allowed actions, prohibited actions, human-approval requirement, evidence artifact prefix, and receipt schema. They explicitly state that no implementation, command execution, browser control, deploy, external message, or Git push has happened. Production session exports force a production-mode review before any session can be marked ready.

Coding Agent Session Drills add one more rehearsal boundary before real programming work. A drill can say a session `would-assign`, `needs-operator-review`, or is `not-assigned`, and it preserves the same sandbox contract for future dispatchers, but it cannot be used as proof that files changed, tests ran, providers answered, browser actions occurred, or Git operations completed. Real coding-agent execution must return changed files, command output with exit codes, remaining risks, and production-mode release verification before any implementation claim is accepted.

Coding Agent Dispatch Manifests are the outgoing package boundary. Ready sessions can receive prompt paths, expected transcript refs, evidence artifact paths, and a receipt template; held or production-evidence-held sessions remain listed but do not receive assignable prompt files. Coding Agent Dispatch Archives turn that boundary into a reviewable one-file export containing the manifest, README, ready prompt contents, and receipt template. Coding Agent Dispatch Archive Audits verify archive schema, path safety, manifest consistency, prompt coverage, held-session non-assignment, and receipt template presence before handoff. The dispatch drill writes a valid local package and a production-held negative package, then fails if held work becomes dispatchable, archive paths become unsafe, or archive audit is not verified. A dispatch package is useful handoff material for a governed coding agent, but it is still not proof that code was edited or tests were run.

Coding Agent Session Receipts are that return boundary. A receipt template tells real coding agents what evidence to submit, and the workbench can import a filled receipt for gateway-backed or local structural review. Receipt review checks the submitted shape for safe relative changed files, command exit codes, command transcript artifact references, evidence artifact references that cover every requested evidence item, and whether transcript/evidence artifacts stay under the session sandbox evidence prefix from the session contract. The review still does not inspect files or rerun commands; production handoff must attach authenticated runner transcripts and production-mode release verification before the system can claim real implementation completion.

Coding Agent Implementation Evidence is the handoff summary derived from a reviewed receipt. It makes the implementation claim easier to archive and share, but it inherits the same boundary: it summarizes submitted changed files, command results, evidence artifacts, and risks without independently executing or inspecting them.

Implementation evidence can reconcile back into the local Development Board only through preserved source work-item ids and a verified local artifact audit item. The workbench checks safe relative changed-file, evidence-artifact, and transcript paths, asks the local gateway to confirm those paths are real files when gateway filesystem access is available, records local `sha256` and byte fingerprints, separates repeated references from unique artifacts, rejects evidence claims that only say an artifact is attached, rejects evidence-artifact reuse across required evidence items, rejects changed-file reuse across sessions, rejects empty command transcripts and transcript reuse across command results, and checks locally readable transcript text for the expected command plus exit code without returning the transcript text in the audit response. It then marks matched unblocked items done and writes audit events. It does not unblock blocked items, infer missing source links, rerun tests, prove command output truthfulness, push Git, deploy, or prove that a transcript came from a production runner. This keeps the "coding agent completed work" signal useful while still requiring real runner evidence for production claims.

The Coding Agent Dispatch and Receipt Drills turn that boundary into repeatable local regression gates. The dispatch drill proves ready prompt packages can be written while production-held sessions stay unassigned. The receipt drill creates local sandbox artifacts for a valid receipt, a deliberately mismatched receipt, and an out-of-scope receipt whose artifact labels look correct but point outside the session sandbox prefix. It fails if the valid path cannot verify, or if either negative path updates any Development Board item. These drills are useful as anti-fake evidence for the product itself, but they remain local drill evidence: they do not prove a real external coding agent, production runner, browser, provider, deploy target, or Git remote performed the work.

The Coding Agent Runner Invocation Drill narrows the handoff gap between a runner manifest and a future Codex/OpenClaw-style coding runner. It writes one JSON/Markdown invocation file for each ready runner task, carrying the prompt path, receipt draft path, pending commands, evidence targets, runner instructions, and stop conditions. The Workbench and local gateway expose the same invocation package as downloadable JSON/Markdown so a sandboxed runner can consume a concrete contract instead of inferring work from prose. Held and production-held tasks remain visible but receive zero executable invocation files. The invocation files still contain null exit codes and pending command contracts only; they are not implementation receipts, do not prove command execution, and cannot update the Development Board.

The Coding Agent Runner Intake Audit checks that those invocation files are readable and still safe before a governed coding runner receives them. It verifies safe paths, pending command contracts, transcript and evidence scope, receipt-return instructions, stop conditions, inherited package checks, security-classifier decisions, and zero completed command results. The Workbench and local gateway expose the same audit as JSON/Markdown downloads after runner invocation packaging, but they still do not execute commands or inspect prompt contents. Production-held tasks stay visible but receive zero accepted intakes. This keeps the handoff concrete without pretending that intake review is implementation evidence.

The Coding Agent Sandbox Runner Drill is deliberately narrower than a real coding agent but stronger than a no-execution self-test. Before execution, the sandbox runner preflight checks bundle/session match, self-test readiness, allowlisted commands, expected process count, and safe artifact paths without running commands. The runner then consumes runner self-test artifacts, executes only allowlisted local verification commands, writes per-session transcripts and evidence artifacts under the session sandbox prefix, submits and reviews a receipt, and audits artifact existence plus transcript command/exit-code content. Its negative production-held case must execute zero commands. The Workbench can invoke the same preflight and runner through the local gateway, and the execution route reruns preflight server-side before executing, returns `409` without command execution when preflight is not ready, and uses runner authentication when `NAIKAKU_RUNNER_TOKEN` is configured. This proves the local runner plumbing can actually run safe commands and produce reviewable evidence, but it still does not implement backlog work, reconcile the Development Board, push Git, deploy, call providers, control browsers/desktops, or prove production readiness.

The Executor Contract Drill adds the same honesty boundary to computer-use runners. `npm run executor:drill` creates synthetic local actions for Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate, then pushes them through executor handoff, automation runbook, dry-run executor, and evidence bundle builders. It requires dry-run runner ids, scoped runner commands, replayable evidence, and profile-specific evidence kinds. It also creates a blocked `deploy_production` action and fails if that action is ever executed. This proves the runner contract shape without claiming that a real browser, desktop, shell, MCP server, or production approval system was controlled.

The Sandbox Capability Drill covers the policy surface before any runner handoff is accepted. `npm run sandbox:capabilities` generates the normal capability registry and a kill-switch-open negative registry. It fails if profile readiness checks, approval gates, blocked reasons, role coverage, evidence artifact requirements, or kill-switch blocking disappear. This is the direct guardrail for OpenClaw-style local control, E2B-style desktops, Browser Use-style browser harnesses, shell runners, and MCP tools: they can be plugged in only after the readiness contract remains machine-checkable.

## Sandbox Capability Registry

The workbench now derives a `naikaku.sandbox-capabilities.v1` registry from the active roles, executor profiles, and sandbox policy. Each profile card lists representative actions, policy status, runner readiness checks, required approvals, blocked reasons, runner contract, evidence requirements, role coverage, and risk notes. This makes OpenClaw-style local control, E2B-style desktop sandboxes, Browser Use-style harnesses, and MCP tool runners pluggable without letting them bypass Naikaku policy.

The registry is a preflight and implementation contract. It does not grant runtime permission by itself. Real runners must still consume `ExecutorHandoff.readyActions`, enforce server-side allowlists, satisfy the readiness checks, emit the required evidence, and stop when the kill switch or approval gate blocks an action.

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

The local security classifier makes this rule executable before real runners attach. It flags prompt-injection overrides, hidden-instruction extraction, credential requests, approval bypass claims, localhost/control-plane access, cloud metadata access, destructive Git/filesystem mutations, production deployments, direct network escape attempts, and external sends. Runner intake applies the classifier to pending command contracts before accepting invocation files, and sandbox-runner preflight applies it again before allowlisted local commands can execute. `npm run security:red-team` runs hostile fixtures plus one safe allowlisted URL through the classifier and sandbox policy. The drill must pass before `npm run release:verify` and the verification manifest can pass, and it records that no browser, shell, MCP, deployment, Git, or network action was executed.

## Production Gates

Before real computer control is enabled:

1. Move runner authentication from shared-token development mode to per-runner scoped identities.
2. Replace the local file ledger with durable authenticated append-only storage.
3. Replace the local audit trail with immutable server-side audit logs.
4. Add emergency kill switch enforcement server-side.
5. Add domain/action allowlist enforcement server-side.
6. Replace the dry-run executor with authenticated Browser/Shell/Desktop/MCP runner services.
7. Make runner services emit the evidence required by the Sandbox Capability registry and `naikaku.executor-evidence.v1`.
8. Replace dry-run evidence placeholders with replayable screenshots, terminal logs, artifact manifests, and tool-call transcripts.
9. Enforce the red-team classifier server-side for prompt injection, localhost/control-plane attacks, metadata services, credential exfiltration, Git mutations, deployments, and external sends.
10. Move reviewed memory entries to durable storage with retention and deletion controls.
