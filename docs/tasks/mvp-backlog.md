# MVP Backlog

This backlog is written so different contributors can work in parallel.

## Track 1: Product Workbench

- Refine responsive dashboard layout.
- Add run history list.
- Add role duplication and custom role creation.
- Add keyboard shortcuts for run, save, and switch role.
- Add import/export workspace JSON.

Acceptance:

- UI remains readable on desktop and tablet.
- No raw API keys appear in exported JSON.

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
