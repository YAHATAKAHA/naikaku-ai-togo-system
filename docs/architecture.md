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

`ProductReleaseBundle` packages the same state into `naikaku.product-release-bundle.v1`. It includes the workspace, optional run, provider readiness, product readiness report, automation runbook, team handoff, role workspace scaffolds, development board, issue drafts, approvals, audit events, reviewed memory, and a release manifest. The manifest marks included, missing, and review-required artifacts, then adds operator commands, handoff checklist items, and security notes for delivery. The workbench also derives Markdown release notes from the bundle so operators can review blockers, warnings, handoff steps, and commands without opening the JSON artifact.

`ReleaseRehearsalReport` is the local self-check before handoff. It reuses the same domain builders to simulate or reuse a cabinet run, create automation runbook data, run executor dry-run evidence, build the release bundle and notes, then scan for `sessionSecret` fields and current session secret probe values. It returns `naikaku.release-rehearsal.v1` with pass, warning, and blocker checks across cabinet run, role API, automation, evidence, release artifacts, secret redaction, and parallel team readiness. Every report also carries an `evidenceClaim` that states whether the proof is dry-run or production evidence, names limitations, and lists production requirements. Every non-passing check becomes a remediation item with owner, priority, action, acceptance criteria, and verification command. Those remediation items can be serialized into GitHub-ready issue drafts and a reviewable `gh issue create` script without calling GitHub. The CLI can also load a provided run, provider-readiness matrix, approval records, audit events, memory entries, saved development items, and secret probes so strict mode can be replayed against reviewed evidence instead of only the default simulation. The `rehearsal:drill` script generates local fixture evidence to prove that this plumbing can close cleanly while still keeping production provider keys and real runners outside the fixture. The workbench panel, gateway endpoint, and `npm run rehearsal` CLI share this builder so manual UI checks and command-line gates report the same truth.

`ReleaseVerificationReport` is the machine gate after rehearsal. It validates a rehearsal report into `naikaku.release-verification.v1`, checking schema, clear rehearsal gates, secret redaction, explicit evidence claims, and optional production evidence. The workbench panel, local gateway, and CLI share the same verifier and can export the verification JSON for review. Dry-run verification can pass for sandbox drill scope. Production verification fails with `not-production-ready` until the evidence claim is upgraded from dry-run to production, which prevents a 100/100 drill from being treated as a real external handoff.

## Localization

The product is Japanese-first, with English, Simplified Chinese, Traditional Chinese, and Korean as first-class operator locales. Locale switching is a UI concern and must not mutate workspace JSON schemas, provider aliases, runner credentials, approval records, or release evidence artifacts. Operator-facing copy should preserve the core cabinet idea in every language: plan software work, generate implementation artifacts, run only approved sandbox actions, and verify evidence before claiming completion. The implementation details and completion gate are tracked in [localization.md](localization.md).

## Development Board

The Development Board converts planning output into work that separate teams can own. It merges:

- One work item per enabled role package.
- One work item per next-iteration task from the latest run.
- Accepted memory items that represent skills, follow-ups, or risks.

`CodingAgentBriefs` is the bridge from cabinet planning to Codex-like implementation. It turns Development Board items into `naikaku.coding-agent-briefs.v1`, with one sandboxed prompt per item. Each brief includes the role context, objective, acceptance criteria, deliverables, verification commands, prohibited actions, executor profile, release-gate requirement, and evidence expected before the agent can claim completion. The workbench and gateway can export JSON for automation and Markdown for human review or copy-paste into a coding agent session. The brief does not execute code, push Git changes, deploy, or read secrets; it is the governed handoff contract for a later implementation agent.

`CodingAgentBriefReviewReport` validates those generated prompts into `naikaku.coding-agent-brief-review.v1` before handoff. The review checks schema and prompt completeness, required `npm run test` / `npm run build` commands, release verification commands when a release gate is present, full prohibited-action coverage, human approval flags, and whether production handoff is backed by production-scoped release verification instead of dry-run evidence. The workbench can run the same review locally or through the gateway and exports the report for audit.

`CodingAgentSessionBundle` turns reviewed briefs into `naikaku.coding-agent-session-bundle.v1`. It packages prompt-file names, per-session Markdown handoffs, verification commands, evidence checklists, safety stops, and next actions. A ready review creates `ready-for-agent` sessions. A warning or blocker creates held sessions, and production-required exports rebuild the review in production mode so a stale dry-run review cannot accidentally release work. The bundle is still a handoff artifact only: it does not execute code, run shell commands, browse, deploy, send messages, or push Git.

`CodingAgentSessionDrillReport` turns a session bundle into `naikaku.coding-agent-session-drill.v1`. It simulates the assignment decision that a future sandboxed coding-agent dispatcher would make: `would-assign` for ready sessions, `needs-operator-review` for review-held sessions, and `not-assigned` for blocked or production-evidence-held sessions. The report includes prompt byte counts, required commands, evidence requirements, safety stops, and a dry-run honesty claim. It never calls a model provider, external coding agent, shell, browser, deploy target, or Git remote, so it can support operator rehearsal without being accepted as implementation proof.

`CodingAgentSessionReceipt` is the return contract after a real coding agent completes work. The workbench can export `naikaku.coding-agent-session-receipt.v1` as an evidence template, import a filled receipt for operator review, and ask the gateway to review changed files, command results with exit codes, evidence artifacts, and risk notes. A complete receipt can be `verified`, missing proof becomes `needs-evidence`, and held or failed sessions are `blocked`. The review is intentionally structural: it does not run commands, inspect files, call providers, browse, deploy, or push Git. Production release still requires authenticated runner evidence and production-mode release verification.

`CodingAgentImplementationEvidence` turns a reviewed receipt into `naikaku.coding-agent-implementation-evidence.v1` for operator handoff. It summarizes accepted sessions, changed files, command results, failed commands, evidence artifacts, and risk notes in JSON and Markdown. It is derived from the receipt; it still does not rerun verification commands or independently inspect changed files.

`CodingAgentImplementationArtifactAudit` adds a local anti-fake gate before status is updated. It checks that accepted implementation evidence references safe relative changed-file paths and command transcript paths. When the gateway is available, those paths must exist inside the current sandbox workspace; browser-only fallback can flag path safety but leaves existence as unresolved. The audit still does not rerun commands or prove command output contents.

`CodingAgentImplementationReconciliation` closes the local planning loop without pretending to be an executor. Coding-agent briefs, sessions, receipts, and implementation evidence now preserve the source Development Board item id. When an imported receipt produces accepted implementation evidence and the matching artifact audit item is verified, the workbench can mark matched, unblocked Development Board items as `done`, store those status changes locally, and audit the reconciliation. Evidence that is blocked, incomplete, artifact-unverified, unmatched, or tied to a blocked work item is skipped with a reason instead of being auto-resolved.

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
