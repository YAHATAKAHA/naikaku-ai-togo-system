# Naikaku AI Togo System

Japan-born multi-model AI cabinet system for planning, execution, critique, supervision, scoring, sandboxed computer use, and iterative refinement.

Naikaku is an operator workbench for teams that want multiple AI roles to cooperate like a cabinet: one mission enters, specialized ministers reason over it, controlled tools execute it, auditors challenge it, and a scoring office decides whether the result is ready or needs another cycle.

## What Exists Now

- A React/Vite TypeScript workbench.
- Cabinet roles with independent provider, endpoint, model, API key alias, system prompt, and permission settings.
- Editable Provider Readiness matrix for filling every role API configuration, session-only secret, gateway/local fallback test status, secret readiness, and exportable results.
- Custom role creation, role duplication, and editable ministry/stage/risk settings for parallel feature teams.
- A local automation pipeline for planning, execution, critique, supervision, scoring, and iteration.
- A sandbox-first computer-use model with Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate executor profiles.
- Sandbox Capability matrix that maps each executor profile to representative actions, approval gates, runner contracts, and required evidence before real computer-use runners are attached.
- Local-only configuration persistence that deliberately strips raw API secrets before saving.
- Browser-to-gateway run path with local fallback when the gateway is offline.
- Product Readiness gate that scores role APIs, automation, sandbox safety, parallel development artifacts, evidence, and memory review before handoff.
- Product Release Bundle export that packages workspace, run, readiness, automation, team handoffs, issue drafts, audit, and memory into one safe handoff artifact, with paired Markdown release notes for operator review.
- Release Rehearsal self-check that locally simulates a cabinet run, automation handoff, executor evidence, release bundle, notes, remediation plan, GitHub-ready issue drafts, and secret redaction before handoff.
- Automation queue proposals, persisted approval records, executor handoff export, and a safe executor dry-run before any real runner consumes work.
- Automation Runbook export that turns executor-ready actions into runner commands, evidence gates, verification gates, and rollback notes for parallel runner teams.
- Executor evidence bundles with per-step simulated transcripts, screenshot/artifact placeholders, evidence hashes, replay flags, and JSON export for future runner audit.
- Runner authentication gate for executor handoff, dry-run, and evidence endpoints when `NAIKAKU_RUNNER_TOKEN` is configured.
- Local gateway ledger for storing approval decisions and executor evidence bundles in `.naikaku-data`, with a Server Ledger panel for refreshing gateway-side records from the workbench.
- Local audit trail for workspace changes, role changes, runs, approvals, executor dry-runs, executor evidence exports, and team handoff exports.
- Team work package generation so each role can split provider, executor, safety, memory, and UI work into parallel handoffs.
- Role workspace scaffold script export that creates per-role README, `.env.example`, task list, runner notes, and security notes for separate teams.
- Development Board that converts role packages, next-loop tasks, and accepted memory into status-trackable work items for separate teams.
- Coding Agent Briefs export that turns development work items into sandboxed Codex-like implementation prompts with verification commands, prohibited actions, and release-gate evidence requirements.
- Coding Agent Brief Review gate that checks generated implementation prompts for schema completeness, sandbox prohibitions, required verification commands, and dry-run versus production evidence truthfulness before handoff.
- Coding Agent Session Bundle export that packages reviewed briefs into ready/held coding-agent sessions with prompt files, verification commands, evidence checklists, safety stops, and explicit no-execution boundaries.
- Coding Agent Session Drill that simulates sandboxed coding-agent assignment decisions, exports JSON/Markdown, and explicitly states that no code, tests, providers, browser, deploy, or Git action ran.
- Coding Agent Session Receipt template/import/review flow that requires changed files, command exit codes, evidence artifacts, and risk notes before implementation can be claimed.
- Coding Agent Implementation Evidence export that turns reviewed receipts into JSON/Markdown handoff summaries without rerunning commands or inspecting files.
- GitHub Issue Drafts export that turns development work items into labeled, Markdown-ready issue payloads plus a reviewable `gh issue create` script for parallel implementation.
- Memory Inbox for reviewable lessons, decisions, skill proposals, risks, and follow-up items before local persistence.
- Workspace JSON import/export and recent run history for operator handoff.
- Developer docs for architecture, adapter boundaries, sandbox security, open-source references, and MVP work streams.

## Product Principles

1. Cabinet before chat. Roles have mandates, permissions, and scoring responsibilities.
2. Sandbox before power. Computer control belongs in bounded executors with allowlists, approvals, logs, and kill switches.
3. Bring your own model. Every role can use a different provider, model, endpoint, and secret alias.
4. Split work cleanly. UI, orchestration, providers, sandbox runners, memory, and audit can be developed in parallel.
5. Craft matters. The system should feel deliberate, readable, inspectable, and calm under pressure.

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

It starts on `http://127.0.0.1:8787` by default and exposes health, provider test, cabinet run, automation plan, automation runbook, executor handoff, executor dry-run, executor evidence, team package, role workspace scaffold, product readiness, product release bundle, release rehearsal, release verification, development issue draft, coding agent brief, coding agent brief review, coding agent session bundle, coding agent session drill, coding agent session receipt, coding agent implementation evidence, sandbox capability, and sandbox policy-check endpoints. The GitHub CLI issue script is generated locally from issue drafts and must be run only inside a repository where `gh` is already authenticated.

For local runner auth checks, set:

```bash
NAIKAKU_RUNNER_TOKEN=dev-runner-token npm run gateway
```

Executor clients then send `Authorization: Bearer dev-runner-token` and `x-naikaku-runner-id`.

Approval and evidence ledger files default to `.naikaku-data`; set `NAIKAKU_LEDGER_DIR` to move them elsewhere.

The workbench defaults to `dry-run`. Switch to `live providers` only when the gateway has the needed environment variables. Browser storage keeps aliases such as `NAIKAKU_OPENAI_API_KEY`; raw secrets stay server-side.

## Scripts

```bash
npm run dev       # start the app
npm run gateway   # start the local cabinet/sandbox gateway
npm run rehearsal # run local release rehearsal and write output/rehearsal
npm run rehearsal:strict # fail when warnings remain
npm run rehearsal:drill # generate reviewed drill fixtures, then run strict rehearsal against them
npm run release:verify # run drill, then verify the latest rehearsal report for dry-run scope
npm run release:verify:production # fail unless the latest report has production evidence
npm run build     # type-check and build
npm run test      # run unit tests
npm run preview   # preview the production build
```

`npm run rehearsal` runs the same delivery self-check used by the workbench: cabinet dry-run, automation runbook, executor evidence, release bundle, release notes, remediation plan, remediation issue drafts, and redaction checks. It exits non-zero for blockers and writes JSON, Markdown, issue draft, and reviewable `gh issue create` script artifacts under `output/rehearsal`. Use `npm run rehearsal:strict` when warnings should fail CI or final handoff.

`npm run rehearsal:drill` first writes reviewed local fixtures under `output/release-drill`, then runs strict rehearsal with a provided run, provider-readiness export, approval records, audit events, reviewed memory, saved development items, and a secret probe. It is a reproducible sandbox drill for the release gate; it proves the evidence plumbing can close cleanly without claiming that real provider keys or production runners have been attached. Rehearsal JSON, CLI output, and the UI panel include an evidence claim that names this as `dry-run` evidence and lists the remaining production requirements.

`npm run release:verify` turns the latest drill rehearsal into `naikaku.release-verification.v1` and fails if warnings, blockers, schema drift, or secret leakage are present. The workbench panel and local gateway expose the same verifier for operator review and downloadable JSON. `npm run release:verify:production` is intentionally stricter: it returns code 4 while the evidence claim is still `dry-run`, so a sandbox drill cannot be mistaken for a production handoff.

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
