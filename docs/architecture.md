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
- Per-role provider settings.
- Per-role executor and permission settings.
- Mission pipeline visualization.
- Sandbox policy editing.
- Run artifacts, logs, and score cards.

## Domain Layer

`src/domain/types.ts` defines the stable product contracts:

- `CabinetRole`
- `ProviderConfig`
- `SandboxPolicy`
- `ExecutorProfile`
- `CabinetRun`
- `CabinetArtifact`
- `CabinetScore`

These contracts are intentionally framework-neutral so backend services, local CLIs, or remote workers can reuse them later.

## Orchestrator

`src/domain/orchestrator.ts` contains the first local orchestration engine. It currently produces deterministic artifacts and scores so the UI, role boundaries, and safety logic can be tested before live model calls are connected.

The production orchestrator should keep the same stage model but replace simulated text with adapter calls:

```text
stage definition
  -> owner role
  -> provider adapter invoke
  -> sandbox/tool action request
  -> artifact
  -> audit log
  -> scoring pass
```

The current gateway already supports this in two modes:

- `dry-run`: deterministic artifacts for local development and review.
- `live`: server-side provider adapters attempt role-level model calls and annotate each artifact with `providerStatus`, `providerDetail`, token usage, and latency.

## Provider Adapters

`src/domain/adapters.ts` defines the adapter shape. Real adapters should live behind a backend or local gateway so browser clients do not expose raw API keys.

## Sandbox Executors

Executor profiles model the runtime that can perform actions:

- Browser Sandbox
- Desktop VM
- Shell Container
- MCP Proxy
- Human Approval Gate

Executors should be implemented as independent services. The frontend should never directly run host commands.

## Persistence

The frontend uses local storage for non-secret workspace configuration. Raw session secrets are kept in React state only and are not persisted by `saveWorkspace`.

Production persistence should store:

- Role definitions.
- Provider aliases, not raw keys.
- Sandbox policy.
- Runs, artifacts, logs, approvals, and score history.
- Memory entries that pass retention policy.

## Parallel Development Boundaries

- UI team: `src/components`, visual state, accessibility, responsive behavior.
- Orchestration team: `src/domain/orchestrator.ts`, stage transitions, retry policy.
- Provider team: `src/domain/adapters.ts`, backend adapter implementations.
- Sandbox team: executor gateway contracts, browser/desktop/shell runners.
- Security team: policy engine, approval gates, prompt-injection handling, audit storage.
- Memory team: lessons, durable skills, search, retention and consent rules.
