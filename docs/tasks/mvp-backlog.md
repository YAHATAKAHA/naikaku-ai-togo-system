# MVP Backlog

This backlog is written so different contributors can work in parallel.

## Track 1: Product Workbench

- Refine responsive dashboard layout.
- Add run history list.
- Add role duplication and custom role creation.
- Persist custom roles through save, export, and import.
- Add keyboard shortcuts for run, save, and switch role.
- Add import/export workspace JSON.
- Add role-level team work package export.
- Add gateway endpoint for team work packages.
- Add role workspace scaffold script export for separate team startup.
- Add local audit trail panel and audit JSON export.
- Add local Development Board with team work items, status tracking, and JSON export.
- Add GitHub Issue Drafts export and reviewable `gh issue create` script export from Development Board items for parallel implementation handoff.

Acceptance:

- UI remains readable on desktop and tablet.
- No raw API keys appear in exported JSON.
- Each enabled role can receive a standalone package with provider alias, executor boundary, tasks, and acceptance criteria.
- Each enabled role can receive a starter workspace with `.env.example`, runner notes, tasks, and security notes.
- Role packages can become status-trackable work items for parallel teams.
- Development items can become labeled, Markdown-ready issue drafts and credential-free CLI scripts without requiring GitHub credentials in the browser.

## Track 2: Provider Adapters

- Implement backend gateway for provider calls.
- Add OpenAI adapter.
- Add Anthropic adapter.
- Add OpenRouter adapter.
- Add custom local endpoint adapter.
- Add connection test with normalized errors.
- Add Provider Readiness matrix with bulk role checks and readiness export.
- Add editable per-role API matrix for provider, endpoint, model, alias, and session-only test secrets.

Acceptance:

- Frontend uses aliases only.
- Role API edits can be made from the readiness matrix without persisting raw session secrets.
- Provider errors are normalized into role-readable messages.
- Readiness exports never contain raw session secrets.

## Track 3: Orchestration Engine

- Replace deterministic artifacts with adapter-backed stage execution.
- Add stage retry policy.
- Add artifact dependency graph.
- Add scoring rubric configuration.
- Add revision loops with max-iteration controls.

Acceptance:

- A run can be replayed from stored artifacts.
- Stage transitions are visible and auditable.

## Track 4: Sandbox Executors

- Implement Browser Sandbox runner.
- Implement Shell Container runner.
- Design Desktop VM gateway contract.
- Add MCP Proxy allowlist.
- Add automation action proposal queue.
- Add per-action approval UI.
- Persist per-action approvals.
- Add executor handoff export.
- Add Automation Runbook export with runner command templates, evidence gates, verification gates, and rollback notes.
- Add safe executor dry-run runner.
- Add Sandbox Capability registry with runner contracts, evidence requirements, and policy-evaluated representative actions.
- Add executor evidence bundle export with per-step hashes, runner ids, replay flags, and dry-run evidence placeholders.
- Add runner authentication gate for executor handoff, dry-run, and evidence endpoints.
- Add local gateway ledger for approval records and executor evidence bundles.
- Add Server Ledger panel for refreshing gateway-side approvals and evidence bundle status from the workbench.
- Convert next-loop and automation work into status-trackable development items.
- Replace local file ledger with durable backend storage.
- Replace shared runner token with per-runner scoped credentials and rotation.
- Replace dry-run runner with authenticated Shell/Browser/Desktop executors that emit real evidence artifacts.
- Add action replay logs backed by screenshots, terminal transcripts, artifact manifests, and MCP request logs.

Acceptance:

- No executor inherits host secrets by default.
- Kill switch stops an active run.
- Every executor-ready action produces an auditable evidence bundle before it can be considered complete.
- Runner teams can consume a runbook before implementing real Shell, Browser, Desktop, or MCP executors.

## Track 5: Security and Governance

- Add prompt-injection classifier.
- Add high-impact action classifier.
- Add approval payload preview.
- Add local audit event ledger for operator and automation milestones.
- Add immutable audit log store.
- Add policy tests for blocked actions.
- Add policy tests for automation proposal gates.
- Add red-team fixtures for localhost/control-plane attacks.

Acceptance:

- Unsafe external instructions cannot call tools directly.
- Sensitive actions require explicit human approval.

## Track 6: Memory and Learning

- Add Memory Secretary storage.
- Add retention policy.
- Add consent tags.
- Add skill extraction proposal flow.
- Add local Memory Inbox with accepted/rejected review decisions.
- Add memory JSON export.
- Add searchable run lessons.

Acceptance:

- Memory entries are reviewable before persistence.
- Rejected decisions are stored separately from accepted skills.
- Memory exports avoid raw session secrets.
