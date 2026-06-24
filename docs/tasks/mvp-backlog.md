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

Acceptance:

- UI remains readable on desktop and tablet.
- No raw API keys appear in exported JSON.
- Each enabled role can receive a standalone package with provider alias, executor boundary, tasks, and acceptance criteria.

## Track 2: Provider Adapters

- Implement backend gateway for provider calls.
- Add OpenAI adapter.
- Add Anthropic adapter.
- Add OpenRouter adapter.
- Add custom local endpoint adapter.
- Add connection test with normalized errors.

Acceptance:

- Frontend uses aliases only.
- Provider errors are normalized into role-readable messages.

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
- Add safe executor dry-run runner.
- Move approval records to durable backend storage.
- Replace dry-run runner with authenticated Shell/Browser/Desktop executors.
- Add action replay logs.

Acceptance:

- No executor inherits host secrets by default.
- Kill switch stops an active run.

## Track 5: Security and Governance

- Add prompt-injection classifier.
- Add high-impact action classifier.
- Add approval payload preview.
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
- Add searchable run lessons.

Acceptance:

- Memory entries are reviewable before persistence.
- Rejected decisions are stored separately from accepted skills.
