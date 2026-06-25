# Architecture

Naikaku AI Togo System is designed as a cabinet-style automation platform. It separates decision roles from execution tools so the product can grow without turning into an unsafe monolithic agent.

## Core Modules

```text
User mission
  -> Prime Minister intake
  -> Strategy planning
  -> Execution ministry
  -> Sandbox operator
  -> Opposition critique
  -> Safety supervision
  -> Scoring office
  -> Memory secretary
```

## Frontend Workbench

The current app is a React/Vite TypeScript workbench. It provides:

- Role configuration.
- Custom role creation, duplication, deletion, and workspace persistence.
- Per-role provider settings.
- Provider Readiness matrix with one row per role, session-only secret checks, gateway/local fallback test results, audit events, and export.
- Per-role executor and permission settings.
- Editable ministry, cabinet stage, and risk posture per role.
- Mission pipeline visualization.
- Sandbox policy editing.
- Sandbox Capability matrix with one card per executor profile, representative action policy results, runner contracts, evidence requirements, and role coverage.
- Run artifacts, logs, and score cards.
- Automation queue review with allowed, approval-required, and blocked action proposals.
- Local audit trail with export for operator actions and automation milestones.
- Development Board for role-owned implementation items, next-loop tasks, accepted memory, status tracking, and JSON export.
- Memory Inbox review for candidate lessons, decisions, skill proposals, risks, and next-cycle follow-ups.

## Domain Layer

`src/domain/types.ts` defines the stable product contracts:

- `CabinetRole`
- `ProviderConfig`
- `ProviderReadinessMatrix`
- `ProviderReadinessRow`
- `SandboxPolicy`
- `ExecutorProfile`
- `SandboxCapabilityRegistry`
- `SandboxCapabilityCard`
- `CabinetRun`
- `CabinetArtifact`
- `CabinetScore`
- `TeamHandoff`
- `TeamWorkPackage`
- `DevelopmentBoard`
- `DevelopmentWorkItem`
- `AuditEvent`
- `MemoryEntry`

These contracts are intentionally framework-neutral so backend services, local CLIs, or remote workers can reuse them later.

## Orchestrator

`src/domain/orchestrator.ts` contains the first local orchestration engine. It currently produces deterministic artifacts and scores so the UI, role boundaries, and safety logic can be tested before live model calls are connected.

The production orchestrator should keep the same stage model but replace simulated text with adapter calls:

```text
stage definition
  -> owner role
  -> provider adapter invoke
  -> sandbox/tool action request
  -> automation queue policy decision
  -> approval record
  -> executor handoff
  -> executor dry-run or runner service
  -> artifact
  -> audit log
  -> scoring pass
```

The current gateway already supports this in two modes:

- `dry-run`: deterministic artifacts for local development and review.
- `live`: server-side provider adapters attempt role-level model calls and annotate each artifact with `providerStatus`, `providerDetail`, token usage, and latency.

## Provider Adapters

`src/domain/adapters.ts` defines the adapter shape. Real adapters should live behind a backend or local gateway so browser clients do not expose raw API keys.

Provider Readiness is the operator-facing preflight for those adapters. The frontend derives static readiness from each role's endpoint, model, alias, and session-only secret state. Operators can test one role or all roles through `/v1/provider/test`; if the gateway is offline, the local fallback validates endpoint/model shape without persisting secrets. Results are stored locally as status metadata only and can be exported as `naikaku.provider-readiness.v1`.

## Sandbox Executors

Executor profiles model the runtime that can perform actions:

- Browser Sandbox
- Desktop VM
- Shell Container
- MCP Proxy
- Human Approval Gate

Executors should be implemented as independent services. The frontend should never directly run host commands.

`SandboxCapabilityRegistry` is the bridge between product policy and future runner implementation. It evaluates representative Browser, Desktop VM, Shell Container, MCP Proxy, and Human Approval actions against the current `SandboxPolicy`, then exposes the result as `naikaku.sandbox-capabilities.v1`. Runner teams can use this contract to see what evidence they must emit before real computer-use backends are connected.

Before an executor receives work, the run creates `AutomationAction` proposals. Each proposal contains the stage, role, executor profile, target, risk level, policy decision, and audit tags. Human decisions become `AutomationApprovalRecord` entries. Executors should only consume `ExecutorHandoff.readyActions`, never raw queue rows. The current runner is a dry-run simulator that produces `ExecutorRun` audit steps without performing external actions.

## Team Handoffs

Parallel development starts from `TeamHandoff`. A handoff turns the current workspace, and optionally the latest run, into one `TeamWorkPackage` per enabled role. Each package includes the role mandate, provider alias, executor boundary, permissions, stage tasks, dependencies, deliverables, acceptance criteria, security notes, automation action ids, and run linkage.

The workbench can export these packages as JSON. The local gateway also exposes `/v1/team/packages` so backend services, separate teams, or future CI workflows can request the same structure without scraping frontend state.

## Development Board

The Development Board converts planning output into work that separate teams can own. It merges:

- One work item per enabled role package.
- One work item per next-iteration task from the latest run.
- Accepted memory items that represent skills, follow-ups, or risks.

Each `DevelopmentWorkItem` keeps source linkage, owner role, stage, priority, acceptance criteria, deliverables, tags, and operator-controlled status. Status changes are stored locally and audited. The board can be exported as `naikaku.development-board.v1` JSON so human teams, GitHub issue tooling, or future automation services can consume the same work queue.

## Memory and Learning

The Memory Secretary produces reviewable `MemoryEntry` candidates from the latest cabinet run:

- Scoring decisions.
- Iteration-stage lessons.
- Skill extraction proposals.
- Next-cycle follow-up tasks.
- Blocked automation risks.

Candidates are not persisted automatically. An operator must accept or reject each candidate. Accepted and rejected entries are both stored locally so future development can learn from approved lessons while preserving rejected decisions as governance evidence. The current memory log is exportable JSON and should later move behind durable storage, retention policy enforcement, search, and operator identity.

## Persistence

The frontend uses local storage for non-secret workspace configuration. Raw session secrets are kept in React state only and are not persisted by `saveWorkspace`.

Production persistence should store:

- Role definitions.
- Provider aliases, not raw keys.
- Provider readiness rows with test status, source, alias, model, endpoint, and secret-ready flag.
- Sandbox policy.
- Sandbox capability registry snapshots for runner compatibility and preflight review.
- Runs, artifacts, logs, approvals, and score history.
- Executor handoff bundles for replay and runner development.
- Team handoff packages for parallel development.
- Development board items and status changes for separate implementation teams.
- Custom role definitions beyond the default cabinet.
- Audit events for workspace changes, role changes, run completion, approvals, executor dry-runs, and exports.
- Reviewed memory entries with accepted and rejected decisions, retention labels, and consent tags.

The current audit trail is local and exportable, not tamper-proof. Production should replace it with an authenticated append-only server-side store.

## Parallel Development Boundaries

- UI team: `src/components`, visual state, accessibility, responsive behavior.
- Orchestration team: `src/domain/orchestrator.ts`, stage transitions, retry policy.
- Provider team: `src/domain/adapters.ts`, backend adapter implementations.
- Sandbox team: executor gateway contracts, browser/desktop/shell runners.
- Security team: policy engine, approval gates, prompt-injection handling, audit storage.
- Memory team: lessons, durable skills, search, retention and consent rules.
