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
- Add Product Readiness gate with exportable release blockers, warnings, and evidence.
- Add Product Release Bundle export for a single handoff artifact plus Markdown release notes.
- Add Release Rehearsal self-check for local end-to-end delivery simulation, remediation planning, and redaction checks.
- Add `npm run rehearsal` and `npm run rehearsal:strict` for reproducible local and CI handoff gates.
- Add release remediation issue draft and reviewable `gh issue create` script exports.
- Add release drill fixtures and evidence-file inputs for strict rehearsal replay.
- Add release rehearsal evidence claims so dry-run proof cannot be confused with production runner proof.
- Add release verification gate with a production-evidence mode that blocks dry-run handoff.
- Add Japanese-first localization with English, Simplified Chinese, Traditional Chinese, and Korean locale support.
- Add local audit trail panel and audit JSON export.
- Add local Development Board with team work items, status tracking, and JSON export.
- Add Coding Agent Briefs export that turns Development Board work into sandboxed implementation prompts and verification checklists.
- Add Coding Agent Brief Review gate that blocks incomplete prompts, missing sandbox prohibitions, missing verification commands, and production evidence overclaims before agent handoff.
- Add Coding Agent Session Bundle export that separates ready and held coding-agent sessions with prompt files, verification commands, evidence requirements, and safety stops.
- Add Coding Agent Session Drill that simulates assignable versus held coding-agent sessions without claiming code execution, provider calls, browser control, deploy, or Git changes.
- Add Coding Agent Session Receipt template/import/review gate that requires changed files, command exit codes, evidence artifacts, and risk notes before accepting implementation claims.
- Add Coding Agent Implementation Evidence export that summarizes reviewed receipts into JSON/Markdown handoff artifacts without rerunning commands.
- Add Coding Agent Implementation Evidence reconciliation that updates matched, unblocked Development Board items from accepted evidence only.
- Add GitHub Issue Drafts export and reviewable `gh issue create` script export from Development Board items for parallel implementation handoff.

Acceptance:

- UI remains readable on desktop and tablet.
- No raw API keys appear in exported JSON.
- Each enabled role can receive a standalone package with provider alias, executor boundary, tasks, and acceptance criteria.
- Each enabled role can receive a starter workspace with `.env.example`, runner notes, tasks, and security notes.
- Operators can export a product readiness report that names remaining blockers before handoff.
- Operators can export one release bundle that indexes current artifacts and review requirements, plus human-readable release notes.
- Operators can run a local release rehearsal that proves the cabinet, automation, evidence, release bundle, notes, remediation plan, and secret redaction path before handoff.
- Operators and CI can rerun the rehearsal from the command line, with strict mode failing while warnings remain.
- Operators can convert rehearsal remediation into GitHub-ready issue drafts without giving browser code GitHub credentials.
- Operators can inspect the rehearsal evidence level, limitations, and production requirements in JSON, CLI output, and the UI panel.
- Operators can replay strict rehearsal with reviewed fixture evidence while keeping raw provider keys and real runner credentials out of the repo.
- Operators and CI can verify a rehearsal report for sandbox scope, and separately fail production verification while evidence remains dry-run.
- Operators can switch supported UI languages without resetting workspace state, session-only secrets, or release verification evidence.
- Role packages can become status-trackable work items for parallel teams.
- Development items can become coding-agent briefs with explicit sandbox, verification, release-gate, and prohibited-action guidance before an implementation agent starts work.
- Operators can review coding-agent briefs before handoff and receive a machine-readable `ready`, `needs-review`, or `blocked` decision with next actions.
- Operators can export a coding-agent session bundle that never claims implementation happened and holds sessions when review or production evidence is incomplete.
- Operators can run a coding-agent session drill that exports JSON/Markdown, separates `would-assign`, `needs-operator-review`, and `not-assigned`, and keeps dry-run limitations visible in every supported UI language.
- Operators can export a receipt template, import a filled receipt, and review it without treating structural evidence as independent command execution.
- Operators can export a coding-agent implementation evidence summary from reviewed receipts without treating the summary as independent execution proof.
- Operators can have accepted coding-agent implementation evidence mark matched Development Board items done while blocked, incomplete, and unmatched items remain held for review.
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
