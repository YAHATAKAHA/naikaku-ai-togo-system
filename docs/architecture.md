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
- Editable Provider Readiness matrix with one row per role, provider/endpoint/model/API alias inputs, session-only secret checks, gateway/local fallback test results, audit events, and export.
- Per-role executor and permission settings.
- Editable ministry, cabinet stage, and risk posture per role.
- Mission pipeline visualization.
- Product Readiness gate with exportable blocker/warning evidence across role APIs, automation, sandbox policy, parallel development, audit, and memory.
- Product Release Bundle export for a single safe handoff artifact containing release manifest and current workbench evidence.
- Sandbox policy editing.
- Sandbox Capability matrix with one card per executor profile, representative action policy results, runner contracts, evidence requirements, and role coverage.
- Run artifacts, logs, and score cards.
- Automation queue review with allowed, approval-required, and blocked action proposals.
- Automation Runbook panel and export for runner commands, evidence requirements, verification gates, and rollback notes derived from executor-ready actions.
- Server Ledger panel for refreshing gateway-side approval records and executor evidence bundles without exposing runner credentials to the browser.
- Local audit trail with export for operator actions and automation milestones.
- Role Workspace scaffold export for per-role README, `.env.example`, task list, runner notes, and security notes.
- Development Board for role-owned implementation items, next-loop tasks, accepted memory, status tracking, and JSON export.
- GitHub Issue Drafts panel and export for labeled, Markdown-ready issue payloads and a reviewable GitHub CLI script derived from Development Board items.
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
- `ExecutorEvidenceBundle`
- `ExecutorEvidenceItem`
- `CabinetScore`
- `TeamHandoff`
- `TeamWorkPackage`
- `ProductReadinessReport`
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

`AutomationRunbook` sits between handoff and runner implementation. It converts executor-ready actions into `naikaku.automation-runbook.v1` steps with runner command templates, preflight checks, execution notes, required evidence, verification gates, rollback notes, and audit tags. This lets Shell, Browser, Desktop, MCP, and Human Approval runner teams build against the same operational contract while the current product remains sandbox-first.

Executor-facing gateway routes have a runner authentication gate. In local development, missing `NAIKAKU_RUNNER_TOKEN` is reported as `development-open` in `/health`. Once that token is configured, `/v1/executor/handoff`, `/v1/executor/run`, and `/v1/executor/evidence` require a runner token and runner id before returning handoff, dry-run, or evidence data.

Each executor step now carries `ExecutorEvidenceItem` records for policy decisions, simulated transcripts, screenshot placeholders, artifact manifests, approval records, or network logs depending on the executor profile. `ExecutorEvidenceBundle` exports those records as `naikaku.executor-evidence.v1` with runner ids, replay flags, and evidence hashes. Real runners should replace placeholders with actual screenshots, terminal transcripts, artifact manifests, and tool-call logs while preserving the same envelope.

## Team Handoffs

Parallel development starts from `TeamHandoff`. A handoff turns the current workspace, and optionally the latest run, into one `TeamWorkPackage` per enabled role. Each package includes the role mandate, provider alias, executor boundary, permissions, stage tasks, dependencies, deliverables, acceptance criteria, security notes, automation action ids, and run linkage.

The workbench can export these packages as JSON. The local gateway also exposes `/v1/team/packages` so backend services, separate teams, or future CI workflows can request the same structure without scraping frontend state.

`RoleWorkspaceScaffolds` turns the same handoff into `naikaku.role-workspace-scaffolds.v1`. Each scaffold creates a per-role workspace folder with a README, `.env.example`, task checklist, runner notes, and security notes. The workbench exports this as a reviewable shell script that only creates local files; it does not install dependencies, call providers, or embed raw secrets.

## Product Readiness

`ProductReadinessReport` is the workbench's delivery gate. It combines Provider Readiness, Sandbox Capability, Automation Runbook, Team Handoff, Role Workspace Scaffolds, Development Board, GitHub Issue Drafts, audit events, approvals, and reviewed memory into `naikaku.product-readiness.v1`.

The report gives a score, decision, and gate list. Gates are grouped into role API, automation, sandbox, parallel development, evidence, and memory. Each gate includes status, evidence, and next action so an operator can see whether the current state is ship-ready, needs review, or blocked. The local gateway exposes the same report through `/v1/product/readiness`.

`ProductReleaseBundle` packages the same state into `naikaku.product-release-bundle.v1`. It includes the workspace, optional run, provider readiness, product readiness report, automation runbook, team handoff, role workspace scaffolds, development board, issue drafts, approvals, audit events, reviewed memory, and a release manifest. The manifest marks included, missing, and review-required artifacts, then adds operator commands, handoff checklist items, and security notes for delivery.

## Development Board

The Development Board converts planning output into work that separate teams can own. It merges:

- One work item per enabled role package.
- One work item per next-iteration task from the latest run.
- Accepted memory items that represent skills, follow-ups, or risks.

Each `DevelopmentWorkItem` keeps source linkage, owner role, stage, priority, acceptance criteria, deliverables, tags, and operator-controlled status. Status changes are stored locally and audited. The board can be exported as `naikaku.development-board.v1` JSON so human teams, GitHub issue tooling, or future automation services can consume the same work queue.

`DevelopmentIssueDrafts` converts that board into `naikaku.github-issue-drafts.v1`. Each draft includes a title, Markdown body, labels, owner hints, priority, source links, acceptance criteria, deliverables, and run traceability. The current workbench exports drafts and can locally derive a `gh issue create` shell script from the same payload. The script is credential-free at export time; teams run it only inside their own authenticated repository environment after review. A later GitHub connector can create issues from the same payload after authentication and repository policy checks.

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
- Automation runbooks for runner implementation, evidence gates, and rollback review.
- Executor evidence bundles for replay, audit, and runner compatibility checks.
- Local gateway ledger records for approval decisions and executor evidence bundles.
- Product readiness reports for release review and handoff.
- Product release bundles for complete delivery handoff.
- Team handoff packages for parallel development.
- Role workspace scaffolds for separate team startup.
- Development board items and status changes for separate implementation teams.
- GitHub issue drafts and reviewable CLI scripts for parallel implementation handoff.
- Custom role definitions beyond the default cabinet.
- Audit events for workspace changes, role changes, run completion, approvals, executor dry-runs, and exports.
- Reviewed memory entries with accepted and rejected decisions, retention labels, and consent tags.

The current audit trail is local and exportable, not tamper-proof. The gateway now adds a local file ledger for approval records and executor evidence bundles under `NAIKAKU_LEDGER_DIR`, and the workbench can refresh that server ledger for operator review. Production should replace the local files with an authenticated append-only server-side store.

## Parallel Development Boundaries

- UI team: `src/components`, visual state, accessibility, responsive behavior.
- Orchestration team: `src/domain/orchestrator.ts`, stage transitions, retry policy.
- Provider team: `src/domain/adapters.ts`, backend adapter implementations.
- Sandbox team: executor gateway contracts, browser/desktop/shell runners.
- Security team: policy engine, approval gates, prompt-injection handling, audit storage.
- Memory team: lessons, durable skills, search, retention and consent rules.
