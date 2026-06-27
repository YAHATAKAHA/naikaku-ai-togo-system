# Naikaku AI Togo System

Japan-born multi-model AI cabinet system for planning, execution, critique, supervision, scoring, sandboxed computer use, and iterative refinement.

Naikaku is an operator workbench for teams that want multiple AI roles to cooperate like a cabinet: one mission enters, specialized ministers reason over it, controlled tools execute it, auditors challenge it, and a scoring office decides whether the result is ready or needs another cycle.

## Core Direction

Naikaku's north star is a Japan-first governed coding cabinet. It should feel closer to a careful Codex-style operator bench than a generic chatbot: cabinet roles plan software work, generate implementation briefs, run only approved sandbox actions, import completion receipts, verify local artifacts, and then update the Development Board. Japanese is the primary operator language, with English, Simplified Chinese, Traditional Chinese, and Korean supported as first-class locales. OpenClaw-style computer control, desktop sandboxes, browser automation, shell runners, and MCP tools should plug in as governed executor profiles, not as unbounded host power.

## What Exists Now

- A React/Vite TypeScript workbench.
- Cabinet roles with independent provider, endpoint, model, API key alias, system prompt, and permission settings.
- Editable Provider Readiness matrix for filling every role API configuration, session-only secret, gateway/local fallback test status, secret readiness, and exportable results.
- Custom role creation, role duplication, and editable ministry/stage/risk settings for parallel feature teams.
- A local automation pipeline for planning, execution, critique, supervision, scoring, and iteration.
- A sandbox-first computer-use model with Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate executor profiles.
- Sandbox Capability matrix that maps each executor profile to representative actions, approval gates, runner readiness checks, blocked reasons, runner contracts, and required evidence before real computer-use runners are attached.
- Local security classifier and red-team drill for prompt-injection, credential, localhost/control-plane, metadata, Git/deploy, external-send, and high-impact runner-action boundaries; runner intake and sandbox-runner preflight apply the same classifier before a governed runner consumes or executes commands.
- Local-only configuration persistence that deliberately strips raw API secrets before saving.
- Browser-to-gateway run path with local fallback when the gateway is offline.
- Product Readiness gate that scores role APIs, automation, sandbox safety, parallel development artifacts, evidence, and memory review before handoff.
- Product Release Bundle export that packages workspace, run, readiness, automation, team handoffs, issue drafts, audit, and memory into one safe handoff artifact, with paired Markdown release notes for operator review.
- Release Rehearsal self-check that locally simulates a cabinet run, automation handoff, executor evidence, release bundle, notes, remediation plan, GitHub-ready issue drafts, and secret redaction before handoff.
- Automation queue proposals, persisted approval records, executor handoff export, and a safe executor dry-run before any real runner consumes work.
- Automation Runbook export that turns executor-ready actions into runner commands, evidence gates, verification gates, and rollback notes for parallel runner teams.
- Executor evidence bundles with per-step simulated transcripts, screenshot/artifact placeholders, evidence hashes, replay flags, and JSON export for future runner audit.
- Runner authentication gate for executor handoff, dry-run, sandbox-runner, and evidence endpoints, with legacy shared-token mode plus scoped per-runner credentials through `NAIKAKU_RUNNER_CREDENTIALS`.
- Local gateway ledger for storing approval decisions and executor evidence bundles in `.naikaku-data`, with a Server Ledger panel for refreshing gateway-side records from the workbench.
- Local audit trail for workspace changes, role changes, runs, approvals, executor dry-runs, executor evidence exports, and team handoff exports.
- Team work package generation so each role can split provider, executor, safety, memory, and UI work into parallel handoffs.
- Role workspace scaffold script export that creates per-role README, `.env.example`, task list, runner notes, and security notes for separate teams.
- Development Board that converts role packages, next-loop tasks, and accepted memory into status-trackable work items for separate teams.
- Coding Agent Briefs export that turns development work items into sandboxed Codex-like implementation prompts with verification commands, prohibited actions, and release-gate evidence requirements.
- Coding Agent Brief Review gate that checks generated implementation prompts for schema completeness, sandbox prohibitions, required verification commands, and dry-run versus production evidence truthfulness before handoff.
- Coding Agent Session Bundle export that packages reviewed briefs into ready/held coding-agent sessions with prompt files, verification commands, evidence checklists, structured sandbox contracts, safety stops, and explicit no-execution boundaries.
- Coding Agent Session Drill that simulates sandboxed coding-agent assignment decisions, preserves the session sandbox contract, exports JSON/Markdown, and explicitly states that no code, tests, providers, browser, deploy, or Git action ran.
- Coding Agent Dispatch Manifest, Archive, Archive Audit, and Dispatch Simulation workbench/CLI path that writes ready prompt packages, audits them, then self-simulates the next execution handoff without claiming implementation work happened.
- Coding Agent Runner Invocation package that writes one governed JSON/Markdown handoff file per ready runner task while held sessions receive zero executable files.
- Coding Agent Runner Intake Audit CLI that checks readable invocation files, pending command contracts, scoped artifact paths, receipt instructions, security-classifier decisions, and production-held non-assignment before a governed coding runner consumes work.
- Coding Agent Runner Lease Drill CLI that self-simulates exclusive runner task ownership, same-runner idempotent claims, duplicate-runner blocking, lease expiry reclaim, profile-scope denial, and production-held non-assignment before sandbox command execution.
- Coding Agent Sandbox Runner Drill CLI that consumes runner self-tests, executes only allowlisted local verification commands, writes transcript/evidence/receipt/audit artifacts, and keeps the result scoped to local runner plumbing proof rather than feature completion.
- Coding Agent Session Receipt template/import/review flow that requires changed files, command exit codes, evidence artifacts, and risk notes before implementation can be claimed.
- Coding Agent Implementation Evidence export that turns reviewed receipts into JSON/Markdown handoff summaries without rerunning commands or inspecting files.
- Coding Agent Implementation Artifact Audit that checks local changed-file and transcript references before accepted evidence can mark Development Board items done.
- Coding Agent Implementation Evidence reconciliation that maps accepted, locally audited evidence back to source Development Board items and marks only matched, unblocked work as done.
- Coding Agent Receipt Drill CLI that locally self-simulates a valid receipt, a mismatched receipt, and an out-of-scope sandbox-prefix receipt, proving accepted evidence can update Development Board items while unrelated or cross-session evidence stays blocked.
- GitHub Issue Drafts export that turns development work items into labeled, Markdown-ready issue payloads plus a reviewable `gh issue create` script for parallel implementation.
- Memory Inbox for reviewable lessons, decisions, skill proposals, risks, and follow-up items before local persistence.
- Workspace JSON import/export and recent run history for operator handoff.
- Developer docs for architecture, adapter boundaries, sandbox security, open-source references, and MVP work streams.

## Product Principles

1. Cabinet before chat. Roles have mandates, permissions, and scoring responsibilities.
2. Sandbox before power. Computer control belongs in bounded executors with allowlists, approvals, logs, and kill switches.
3. Bring your own model. Every role can use a different provider, model, endpoint, and secret alias.
4. Split work cleanly. UI, orchestration, providers, sandbox runners, memory, and audit can be developed in parallel.
5. Japanese first, multilingual by design. Japanese is the default operator language, with English, Simplified Chinese, Traditional Chinese, and Korean as first-class UI locales; human-facing summaries localize, while schemas, paths, commands, and evidence contracts stay stable.
6. Programmable under governance. Cabinet members can produce Codex-like coding briefs and consume completion receipts, but coding-agent work must move through sandbox boundaries, receipts, local artifact fingerprints, and release gates before the board marks anything complete.
7. Craft matters. The system should feel deliberate, readable, inspectable, and calm under pressure.

## Quick Start

```bash
npm install
npm run dev
```

Then open the local Vite URL and try the default mission. Use the right inspector to change role provider settings and the center workspace to run a cabinet cycle.

For the local JSON gateway:

```bash
npm run gateway
```

It starts on `http://127.0.0.1:8787` by default and exposes health, provider test, cabinet run, automation plan, automation runbook, executor handoff, executor dry-run, executor evidence, team package, role workspace scaffold, product readiness, product release bundle, release rehearsal, release verification, development issue draft, coding agent brief, coding agent brief review, coding agent session bundle, coding agent dispatch manifest, coding agent dispatch simulation, coding agent runner manifest, coding agent runner invocation package, coding agent runner intake audit, coding agent runner self-test, coding agent sandbox runner preflight, coding agent sandbox runner, coding agent session drill, coding agent session receipt, coding agent implementation evidence, coding agent artifact audit, sandbox capability, and sandbox policy-check endpoints. The GitHub CLI issue script is generated locally from issue drafts and must be run only inside a repository where `gh` is already authenticated.

For local runner auth checks, the legacy shared-token mode is still supported:

```bash
NAIKAKU_RUNNER_TOKEN=dev-runner-token npm run gateway
```

Executor clients then send `Authorization: Bearer dev-runner-token` and `x-naikaku-runner-id`.

Scoped runner credentials are preferred before real runner services attach:

```bash
NAIKAKU_RUNNER_CREDENTIALS='[
  {
    "runnerId": "shell-runner-01",
    "token": "shell-token",
    "executorProfiles": ["shell-container"],
    "rotatedAt": "2026-06-27T00:00:00.000Z",
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }
]' npm run gateway
```

`NAIKAKU_RUNNER_CREDENTIALS` takes precedence over `NAIKAKU_RUNNER_TOKEN`, can use `tokenSha256` instead of `token`, and limits each runner to its listed executor profiles. Malformed scoped config fails closed instead of falling back open.

Approval and evidence ledger files default to `.naikaku-data`; set `NAIKAKU_LEDGER_DIR` to move them elsewhere.

The workbench defaults to `dry-run`. Switch to `live providers` only when the gateway has the needed environment variables. Browser storage keeps aliases such as `NAIKAKU_OPENAI_API_KEY`; raw secrets stay server-side.

## Scripts

```bash
npm run dev       # start the app
npm run gateway   # start the local cabinet/sandbox gateway
npm run rehearsal # run local release rehearsal and write output/rehearsal
npm run rehearsal:strict # fail when warnings remain
npm run rehearsal:drill # generate reviewed drill fixtures, then run strict rehearsal against them
npm run coding-agent:dispatch # write ready coding-agent prompt package and production-held negative package
npm run coding-agent:simulate # self-simulate dispatch execution planning and pending receipt drafts
npm run coding-agent:runner-manifest # convert pending receipt drafts into runner-facing task manifests
npm run coding-agent:runner-invocation # write per-task runner invocation files without executing work
npm run coding-agent:runner-intake # audit invocation files before runner handoff without executing work
npm run coding-agent:runner-self-test # preflight runner manifests without executing commands
npm run coding-agent:runner-lease # self-simulate exclusive runner task leasing before execution
npm run coding-agent:sandbox-runner # execute allowlisted local verification commands and audit drill receipts
npm run coding-agent:drill # self-simulate valid, mismatched, and sandbox-prefix coding-agent receipt evidence
npm run localization:drill # self-simulate coding-agent handoff in every supported operator language
npm run executor:drill # self-simulate every sandbox executor profile and evidence contract
npm run sandbox:capabilities # self-simulate executor readiness checks, approval gates, evidence contracts, and kill-switch blocking
npm run security:red-team # self-simulate hostile prompt, credential, control-plane, Git/deploy, and external-send red-team cases
npm run runner-auth:drill # self-simulate scoped runner credentials, rotation expiry, and fail-closed auth
npm run production:boundary # confirm production verifier rejects dry-run evidence with code 4
npm run verification:manifest # aggregate localization, executor, sandbox capability, security red-team, dispatch, simulation, runner, invocation, intake, self-test, lease, sandbox-runner, receipt, and release evidence
npm run release:verify # run all local drills, then verify dry-run scope
npm run release:verify:production # fail unless the latest report has production evidence
npm run verify:all # run tests, build, dry-run verification, production negative gate, and diff check
npm run build     # type-check and build
npm run test      # run unit tests
npm run preview   # preview the production build
```

`npm run rehearsal` runs the same delivery self-check used by the workbench: cabinet dry-run, automation runbook, executor evidence, release bundle, release notes, remediation plan, remediation issue drafts, and redaction checks. It exits non-zero for blockers and writes JSON, Markdown, issue draft, and reviewable `gh issue create` script artifacts under `output/rehearsal`. Use `npm run rehearsal:strict` when warnings should fail CI or final handoff.

`npm run rehearsal:drill` first writes reviewed local fixtures under `output/release-drill`, then runs strict rehearsal with a provided run, provider-readiness export, approval records, audit events, reviewed memory, saved development items, and a secret probe. It is a reproducible sandbox drill for the release gate; it proves the evidence plumbing can close cleanly without claiming that real provider keys or production runners have been attached. Rehearsal JSON, CLI output, and the UI panel include an evidence claim that names this as `dry-run` evidence and lists the remaining production requirements.

`npm run coding-agent:dispatch` writes `naikaku.coding-agent-dispatch-drill.v1` under `output/coding-agent-dispatch-drill`. It builds the default Development Board, coding-agent briefs, review, session bundle, assignment drill, dispatch manifest, dispatch archive, archive audit, ready prompt files, and receipt template. It also builds a production-held negative package and fails if any held session receives a prompt file or receipt template, if archive paths become unsafe, or if the archive audit cannot verify manifest/prompt/receipt consistency. The workbench Coding Agent panel exposes the same dispatch manifest path with gateway/local fallback plus JSON and Markdown downloads for the manifest, archive, archive audit, and dispatch simulation. This is the practical handoff surface for Codex-like programming agents: ready sessions become prompt files, expected transcript/evidence paths stay under each session prefix, and implementation still requires a completed receipt before the Development Board can move.

`npm run coding-agent:simulate` writes `naikaku.coding-agent-dispatch-simulation.v1` under `output/coding-agent-dispatch-simulation`. It rebuilds the reviewed dispatch chain, audits the archive, creates pending receipt drafts for ready sessions, and writes one per-session draft JSON under `valid/receipt-drafts/` so a real coding agent can pick up the prompt, planned steps, pending command results, and evidence prefix. It proves production-held sessions stay visible but unassigned and writes zero held-session draft files. It does not edit files, run commands, open a browser, call providers, commit, push, or deploy. It is a local self-simulation of the next coding-agent execution handoff, not implementation evidence.

`npm run coding-agent:runner-manifest` writes `naikaku.coding-agent-runner-manifest-drill.v1` under `output/coding-agent-runner-manifest`. It reads the dispatch simulation JSON plus `valid/receipt-drafts/*.json`, then writes runner-facing task manifests for ready sessions with prompt paths, receipt draft paths, pending commands, evidence targets, executor profile ids, and stop conditions. Production-held sessions must produce zero runner tasks and zero receipt draft paths. This is the bridge toward Codex/OpenClaw-style governed executors; it still does not run a model, command, browser, desktop, MCP tool, Git operation, or deploy.

`npm run coding-agent:runner-invocation` writes `naikaku.coding-agent-runner-invocation-drill.v1` under `output/coding-agent-runner-invocation`. It consumes the runner manifest drill output and writes one `naikaku.coding-agent-runner-invocation.v1` JSON/Markdown file per ready runner task with prompt path, receipt draft path, pending command contracts, evidence targets, runner instructions, and stop conditions. Production-held sessions must write zero invocation files. The Workbench now prepares the same package after dispatch/runner-manifest generation and exposes JSON/Markdown downloads, while the local gateway exposes `/v1/development/coding-briefs/runner-invocation` for automation clients. This is the handoff file a future Codex/OpenClaw-style runner can consume inside a governed workspace; it still does not edit files, execute commands, call providers, browse, deploy, commit, push, or claim implementation evidence.

`npm run coding-agent:runner-intake` writes `naikaku.coding-agent-runner-intake-audit-drill.v1` under `output/coding-agent-runner-intake-audit`. It reads the runner invocation drill output, verifies the expected invocation JSON/Markdown files are readable, and audits each ready invocation for safe paths, pending command contracts, transcript/evidence scope, receipt-return instructions, stop conditions, security-classifier blocks, and zero completed command results. The drill also mutates one local fixture with a dangerous Git command and must prove the security classifier blocks that tampered handoff before a runner can consume it. Production-held sessions must stay visible but receive zero accepted intakes. The Workbench now prepares the same intake audit after runner invocation generation and exposes JSON/Markdown downloads, while the local gateway exposes `/v1/development/coding-briefs/runner-intake` for automation clients. This is a pre-runner acceptance gate, not execution proof: it still does not read prompt contents, edit files, execute commands, call providers, browse, deploy, commit, push, or claim implementation evidence.

`npm run coding-agent:runner-self-test` writes `naikaku.coding-agent-runner-self-test-drill.v1` under `output/coding-agent-runner-self-test`. It consumes the runner manifest artifacts and simulates a governed runner preflight: ready tasks become would-run tasks, all commands stay `not-executed`, transcripts/evidence remain scoped under the session prefix, and production-held tasks stay at zero would-run. This is a self-test of the handoff contract, not implementation evidence.

`npm run coding-agent:runner-lease` writes `naikaku.coding-agent-runner-lease-drill.v1` under `output/coding-agent-runner-lease`. It consumes runner self-test artifacts and self-simulates the queue ownership step before execution: one scoped runner receives a lease, the same runner can retry idempotently, a competing runner is blocked while the lease is active, an expired lease can be reclaimed, a wrong-profile runner is denied, and production-held sessions receive no active leases. It does not execute commands or prove implementation work.

`npm run coding-agent:sandbox-runner` writes `naikaku.coding-agent-sandbox-runner-drill.v1` under `output/coding-agent-sandbox-runner`. It consumes the runner self-test artifacts, executes only allowlisted local verification commands in this repository, writes session-scoped transcripts and evidence artifacts, submits a local receipt, reviews it, builds implementation evidence, and audits local artifact paths and transcript contents. Today the allowlist is intentionally narrow (`npm run test` and `npm run build`). The drill also creates a security-blocked preflight where `git push origin main` is deliberately added to the command allowlist; the security classifier must still block it before any process execution can happen. The workbench exposes a sandbox preflight plus the same executable runner through the local gateway after a dispatch package and runner self-test are ready, with JSON/Markdown preflight and sandbox runner report downloads plus receipt and implementation-evidence downloads. The gateway execution route reruns the preflight server-side and returns `409` without command execution when the preflight is not ready, so direct API callers cannot bypass the sandbox gate. A passing drill proves the local runner command/evidence/receipt plumbing works; it explicitly does not prove that a model implemented the queued backlog work, and it must not be reconciled into the Development Board as feature completion.

`npm run coding-agent:drill` writes a reproducible coding-agent receipt drill under `output/coding-agent-receipt-drill`. It builds the default Development Board, coding-agent briefs, brief review, session bundle, a valid receipt, a mismatched receipt, and an out-of-scope receipt whose labels look correct but whose artifacts are outside the session sandbox evidence prefix. The valid path must produce verified receipt review, accepted implementation evidence, verified artifact audit, and applied Development Board reconciliation. The mismatched and out-of-scope paths must stay `needs-evidence` / `needs-artifacts` with zero board items applied. The drill is local proof that the anti-fake evidence gate works; it is not production runner evidence.

`npm run localization:drill` writes `naikaku.localization-drill.v1` under `output/localization-drill`. It verifies Japanese-first locale order, then runs the coding-agent brief, review, session bundle, dispatch manifest, dispatch archive audit, dispatch simulation, runner manifest, runner invocation package, runner intake audit, runner self-test, sandbox runner preflight, assignment drill, and receipt-template chain for Japanese, English, Simplified Chinese, Traditional Chinese, and Korean. It fails if a locale drops the operator-language instruction, changes machine contracts such as commands or evidence paths, loses the structured session sandbox contract, cannot produce assignable sandbox sessions, dispatch simulations, runner manifests, runner invocation packages, runner intake audits, runner self-tests, or sandbox preflights, or lets a receipt template claim implementation without evidence.

`npm run executor:drill` writes `naikaku.executor-contract-drill.v1` under `output/executor-contract-drill`. It self-simulates Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate handoff actions through the same handoff, runbook, dry-run executor, and evidence bundle builders. It also includes a deliberately blocked production deployment and fails if that blocked action reaches execution evidence.

`npm run sandbox:capabilities` writes `naikaku.sandbox-capability-drill.v1` under `output/sandbox-capability-drill`. It self-simulates the Sandbox Capability registry and a kill-switch-open negative case. The drill fails if any executor profile loses its readiness checks, approval gates, blocked reasons, evidence artifact contract, role coverage, or if opening the kill switch no longer blocks every runner profile. It does not execute browser, desktop, shell, MCP, provider, deployment, or Git actions.

`npm run security:red-team` writes `naikaku.security-red-team-drill.v1` under `output/security-red-team-drill`. It runs deterministic hostile-input fixtures against the local security classifier and sandbox policy, covering prompt-injection override attempts, credential exfiltration, localhost/control-plane access, metadata service access, Git mutation, production deployment claims, external-send requests, approval-gated shell verification, and one safe allowlisted research action. It fails if hostile cases are not blocked, if high-impact local verification stops requiring approval, if the safe case is blocked, or if any fixture claims an action was executed.

`npm run production:boundary` calls the production verifier, expects exit code 4 while evidence is still dry-run, and writes `naikaku.production-boundary-drill.v1` to `output/verification/production-boundary-latest.json`. It fails if dry-run evidence ever passes as production-ready.

`npm run runner-auth:drill` writes `naikaku.runner-auth-drill.v1` under `output/runner-auth-drill`. It self-simulates development-open local posture, legacy shared-token compatibility, scoped runner credentials, token-hash credentials, profile-limited runners, expired credential rejection, malformed scoped config fail-closed behavior, token redaction, and a mixed handoff/evidence scope probe proving a shell runner receives only shell actions and shell evidence from a broader runner payload. It does not start the gateway or execute runner actions.

`npm run verification:manifest` reads the latest localization drill, executor contract drill, sandbox capability drill, security red-team drill, runner auth drill, production boundary drill, coding-agent dispatch drill, coding-agent dispatch simulation drill, coding-agent runner manifest drill, coding-agent runner invocation drill, coding-agent runner intake audit drill, coding-agent runner self-test drill, coding-agent runner lease drill, coding-agent sandbox runner drill, coding-agent receipt drill, and release verification report, then writes `naikaku.verification-manifest.v1` to `output/verification/verification-manifest-latest.json`. The manifest fails if any supported locale drops the coding-agent handoff contract, if dispatch packaging writes prompts for production-held sessions, if dispatch simulation fails to write one pending receipt draft file per ready session, if runner manifest loses a ready task or receipt draft path, if it creates runner tasks for held sessions, if runner invocation packaging fails to write one executable handoff file per ready task, if it writes invocation files for production-held sessions, if runner intake cannot read ready invocation files, observes completed command results, inherits blocked package checks, accepts production-held work, reports blocked security classifications on clean input, or fails to block the tampered dangerous-command fixture, if runner self-test claims executed commands or queues production-held work, if runner lease stops proving exclusive ownership, idempotent same-runner retries, duplicate-runner blocking, expiry reclaim, profile-scope denial, or production-held non-assignment, if the sandbox runner fails to execute allowlisted local commands, write transcripts, verify receipt/audit artifacts, keep production-held work unrun, or block an allowlisted dangerous command in preflight, if any executor profile loses scoped dry-run evidence, if the sandbox capability registry loses readiness checks, approval gates, evidence artifacts, blocked reasons, or kill-switch blocking, if the security red-team drill stops blocking hostile prompt, credential, localhost/control-plane, metadata, Git, deploy, or external-send cases, if runner auth stops proving scoped credentials, token-hash acceptance, profile limits, handoff/evidence scope filtering, credential expiry rejection, or fail-closed malformed config, if a blocked production action reaches execution evidence, if the production verifier does not reject dry-run evidence with code 4, if the valid coding-agent receipt does not apply all board items, if the mismatched or out-of-scope receipt updates any board item, if release verification fails, or if the dry-run versus production boundary is unclear.

`npm run release:verify` first runs the localization drill, executor contract drill, sandbox capability drill, security red-team drill, runner auth drill, coding-agent dispatch drill, coding-agent dispatch simulation drill, coding-agent runner manifest drill, coding-agent runner invocation drill, coding-agent runner intake audit drill, coding-agent runner self-test drill, coding-agent runner lease drill, coding-agent sandbox runner drill, coding-agent receipt drill, and release rehearsal drill, then turns the latest drill rehearsal into `naikaku.release-verification.v1`, runs the production boundary drill, and finally writes the verification manifest. It fails if localization contracts drift, dispatch packaging assigns held sessions, dispatch simulation overclaims execution readiness, runner manifest queues held work, runner invocation packaging loses ready files or writes held files, runner intake accepts unreadable or overclaimed invocation files, runner intake or sandbox preflight fail their dangerous-command classifier probes, runner self-test overclaims execution, runner lease breaks exclusive ownership or profile-scope rejection, sandbox runner local command/receipt/audit plumbing breaks or overclaims feature completion, executor contracts overclaim, sandbox capability readiness or kill-switch behavior drifts, security red-team hostile-input boundaries drift, runner auth scope or rotation boundaries drift, coding-agent evidence gates accept mismatched or out-of-scope sandbox evidence, the production boundary stops rejecting dry-run evidence, warnings, blockers, schema drift, or secret leakage are present, release verification cannot pass for dry-run scope, or the manifest cannot prove every local gate. The workbench panel and local gateway expose the same release verifier for operator review and downloadable JSON. `npm run release:verify:production` is intentionally stricter: it returns code 4 while the evidence claim is still `dry-run`, so a sandbox drill cannot be mistaken for a production handoff.

`npm run verify:all` is the recommended local and CI gate. It runs unit/domain tests, the production build, `npm run release:verify`, confirms `npm run release:verify:production` returns code 4, and finishes with `git diff --check`. CI should reuse the same command so local and remote verification share one contract.

## Repository Map

```text
src/
  components/       React UI sections
  data/             default cabinet, stages, sandbox profiles
  domain/           role types, orchestration engine, storage, adapter contracts
docs/
  architecture.md
  api-adapters.md
  gateway.md
  localization.md
  security-sandbox.md
  reference/open-source-research.md
  tasks/mvp-backlog.md
CONTRIBUTING.md
```

## Visual Direction

The primary workbench concept is saved at:

```text
docs/design/naikaku-workbench-concept.png
```

## Safety Note

Raw provider API keys are not persisted by the frontend. The current workbench accepts a session secret field for testing and an API key alias for future backend or vault resolution. Production connectors should resolve secrets server-side or through a local encrypted vault.

## License

Private repository. License decision pending.
