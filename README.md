# Naikaku AI Togo System

Japan-born multi-model AI cabinet system for planning, execution, critique, supervision, scoring, sandboxed computer use, and iterative refinement.

Naikaku is an operator workbench for teams that want multiple AI roles to cooperate like a cabinet: one mission enters, specialized ministers reason over it, controlled tools execute it, auditors challenge it, and a scoring office decides whether the result is ready or needs another cycle.

The product is not meant to make operators babysit every automation prompt. Its job is to turn annoying confirmations and single-agent drift into a cabinet protocol: one role proposes, another implements, critics and supervisors can object with evidence, and the cabinet vote decides whether a governed runner may continue. Human approval is reserved for genuinely high-impact actions such as desktop permissions, external sends, Git push, deploy, secrets, purchases, or broad host control. Routine low-risk progress should keep moving while transcripts, receipts, and artifact audits stay attached.

## Core Direction

Naikaku's north star is a Japan-first governed coding cabinet. It should feel closer to a careful Codex-style operator bench than a generic chatbot: cabinet roles plan software work, generate implementation briefs, run only approved sandbox actions, import completion receipts, verify local artifacts, and then update the Development Board. Japanese is the primary operator language, with English, Simplified Chinese, Traditional Chinese, and Korean supported as first-class locales. Codex CLI, Claude Code, OpenHands, OpenClaw-style computer control, Hammerspoon Mac automation, desktop sandboxes, browser automation, shell runners, and MCP tools should plug in as governed executor profiles, not as unbounded host power.

## Current Reality

This repository is an MVP foundation, not a finished OpenClaw/Hermes replacement. Today it can show one clear mission input, split that mission into supervised cabinet/coding-agent work, call local Codex CLI as separated cabinet roles when Codex auth is available, prepare runner contracts, run local dry-run drills, probe installed OpenClaw/Hammerspoon tools, and keep receipt/evidence gates honest. It does not currently grant arbitrary Mac desktop control, operate arbitrary apps, run live implementation without a configured runner wrapper, or push/deploy without an external runner and explicit approval. If a capability is not wired, the UI should say so.

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
- Engineering Launchpad in the main workspace that shows where to enter the task, run the supervising cabinet, prepare coding-agent runner packages, check Mac permissions, run the local sandbox, and export GitHub issue scripts from one visible flow.
- Coding Agent Briefs export that turns development work items into sandboxed Codex-like implementation prompts with verification commands, prohibited actions, and release-gate evidence requirements.
- Coding Agent Brief Review gate that checks generated implementation prompts for schema completeness, sandbox prohibitions, required verification commands, and dry-run versus production evidence truthfulness before handoff.
- Coding Agent Session Bundle export that packages reviewed briefs into ready/held coding-agent sessions with prompt files, verification commands, evidence checklists, structured sandbox contracts, safety stops, and explicit no-execution boundaries.
- Coding Agent Session Drill that simulates sandboxed coding-agent assignment decisions, preserves the session sandbox contract, exports JSON/Markdown, and explicitly states that no code, tests, providers, browser, deploy, or Git action ran.
- Coding Agent Dispatch Manifest, Archive, Archive Audit, and Dispatch Simulation workbench/CLI path that writes ready prompt packages, audits them, then self-simulates the next execution handoff without claiming implementation work happened.
- Coding Agent Runner Invocation package that writes one governed JSON/Markdown handoff file per ready runner task while held sessions receive zero executable files.
- Coding Agent Runner Intake Audit CLI that checks readable invocation files, pending command contracts, scoped artifact paths, receipt instructions, security-classifier decisions, and production-held non-assignment before a governed coding runner consumes work.
- Coding Agent Runner Lease Drill CLI that self-simulates exclusive runner task ownership, same-runner idempotent claims, duplicate-runner blocking, lease expiry reclaim, profile-scope denial, and production-held non-assignment before sandbox command execution.
- Coding Agent Sandbox Runner Drill CLI that consumes runner self-tests, executes only allowlisted local verification commands, writes transcript/evidence/receipt/audit artifacts, and keeps the result scoped to local runner plumbing proof rather than feature completion.
- Coding Agent Gateway Runner Smoke CLI that starts the local gateway with scoped runner credentials, proves missing and unissued leases are rejected over HTTP, then executes the sandbox-runner route with a gateway-issued lease.
- Coding Agent Engineering Self-Simulation CLI that creates a temporary fixture Git workspace, observes a failing test, patches one fixture source file, reruns the test, and verifies receipt/evidence/artifact audit without claiming real backlog completion.
- Coding Agent Session Receipt template/import/review flow that requires changed files, command exit codes, evidence artifacts, and risk notes before implementation can be claimed.
- Coding Agent Implementation Evidence export that turns reviewed receipts into JSON/Markdown handoff summaries without rerunning commands or inspecting files.
- Coding Agent Implementation Artifact Audit that checks local changed-file and transcript references, plus gateway-backed Git worktree status for changed-file claims, before accepted evidence can mark Development Board items done.
- Coding Agent Implementation Evidence reconciliation that maps accepted, locally audited evidence back to source Development Board items and marks only matched, unblocked work as done.
- Coding Agent Receipt Drill CLI that locally self-simulates a valid receipt, a mismatched receipt, and an out-of-scope sandbox-prefix receipt, proving accepted evidence can update Development Board items while unrelated or cross-session evidence stays blocked.
- Engineering Auto Work CLI that takes one mission, prepares supervised runner tasks, optionally starts a user-installed adapter CLI, imports fresh receipts, and runs evidence/artifact audit in one non-interactive command.
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

Then open the local Vite URL and try the default mission. The center column now starts with the Engineering Launchpad: use "Go to input" to edit the mission, "Check runners" to detect local command-line adapters, "Split by cabinet" to create supervised work, "Prepare agents" to build the coding-agent runner package, "Check permission" to preflight Mac-local execution, and "Run local sandbox" after the gateway is running. Use the right inspector to change role provider settings.

To answer "does this actually automate anything?" from a fresh checkout, run the open-source MVP check first:

```bash
npm run open-source:mvp-check
```

It builds the app, runs targeted MVP tests, starts the local gateway on a temporary port, exercises `/v1/engineering/auto-work` through the fixture adapter, runs a configured CLI preset bridge, generates and smoke-tests a local runner wrapper kit, and runs the fixture coding loop that observes a failing generated repository test, patches the fixture source, reruns the test, and verifies receipt/evidence/artifact audit output. It writes `output/open-source-mvp-check/summary.md` and `summary.json`. This is the quickest no-provider proof that Naikaku is more than prompt copying; it still does not claim real OpenClaw/OpenHands/Hermes execution, arbitrary Mac desktop control, production deployment, Git push, or real backlog completion.

To enter one task from the command line without learning the whole pipeline:

```bash
npm run naikaku:task -- "Implement the settings panel and run npm test"
```

By default this prepares supervised handoff files and evidence boundaries without starting external tools. Use `--self-test` to run the deterministic fixture automation path, or `--runner-preset <id> --adapter-ready` after installing and approving a fixed local CLI such as OpenHands, OpenClaw, Hammerspoon, browser-use, Playwright, MCP, or a Hermes-style wrapper.

To prove the same one-task entry can call a real AI coding runner without handing it the whole repository:

```bash
npm run naikaku:task -- --codex-smoke "Prove the cabinet can supervise an AI coder"
```

This records the operator mission, asks the cabinet motion gate to authorize local Codex CLI, lets Codex patch only a generated toy worktree, reruns the generated test, and returns the Codex transcript, diff, receipt, and task summary under `output/naikaku-task/codex-engineer-smoke`. It is the quick proof that Naikaku can be an automation wrapper, not just a prompt exporter; it still does not edit product source, control the desktop, push Git, deploy, or claim real backlog completion.

To prove the local adapter idea with installed tools, run:

```bash
npm run local-tools:smoke
```

It writes a tiny cabinet-vote project, runs its tests, reads OpenClaw CLI/model readiness, and asks Hammerspoon to write one scoped proof file under `output/`. This is a local Mac/tool smoke, not a CI requirement; OpenClaw still needs provider auth before real agent turns, and Hammerspoon still needs its IPC module enabled before `hs` can receive command-line tasks.

To prove separated AI roles with the local Codex CLI:

```bash
npm run cabinet:codex-smoke
```

It calls Codex three times in read-only mode as Prime Minister, Critic, and Supervisor, then lets Naikaku make the deterministic cabinet motion decision from their proposal, audit, dissent, and vote. This is the minimum proof of the product idea: AI roles can disagree, an audit can block unsafe work, and execution is authorized only after the cabinet decision.

To prove Codex can act as a governed implementation runner on a generated toy project:

```bash
npm run codex:engineer-smoke
```

This creates a broken tiny project under `output/codex-engineer-smoke/worktree`, records a cabinet motion approval, asks Codex CLI to patch only that generated worktree in `workspace-write` mode, reruns `npm test`, and writes transcript, diff, changed-file, summary, and receipt artifacts. It does not edit the Naikaku source tree or claim real backlog completion.

For the local gate intended for GitHub Actions and pull request review:

```bash
npm run ci:open-source
```

The workflow template is saved at `docs/ci/open-source-mvp-ci.yml`. Copy it to `.github/workflows/ci.yml` with a GitHub token that has `workflow` scope when you are ready to enable repository Actions.

To build a local wrapper kit for an external CLI runner:

```bash
npm run engineering:runner-kit -- --mission "Connect my local coding runner and return Naikaku evidence"
```

It writes `output/engineering-runner-kit/README.md`, a fixed `runner-preset.example.json`, a runnable `runner-wrapper-example.mjs`, sample handoff/job files, and a self-test summary. The wrapper example consumes Naikaku adapter job JSON and writes the required receipt/evidence artifacts; replace its internals with a real OpenHands/OpenClaw/Hammerspoon/browser-use/MCP command while keeping the same receipt contract.

For the local JSON gateway:

```bash
npm run gateway
```

It starts on `http://127.0.0.1:8787` by default and exposes health, provider test, cabinet run, engineering auto-work, engineering runner readiness, automation plan, automation runbook, executor handoff, executor dry-run, executor evidence, team package, role workspace scaffold, product readiness, product release bundle, release rehearsal, release verification, development issue draft, coding agent brief, coding agent brief review, coding agent session bundle, coding agent dispatch manifest, coding agent dispatch simulation, coding agent runner manifest, coding agent runner invocation package, coding agent runner intake audit, coding agent runner self-test, coding agent runner lease, coding agent sandbox runner preflight, coding agent sandbox runner, coding agent session drill, coding agent session receipt, coding agent implementation evidence, coding agent artifact audit, sandbox capability, and sandbox policy-check endpoints. The GitHub CLI issue script is generated locally from issue drafts and must be run only inside a repository where `gh` is already authenticated.

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

To use the operator-facing web entry, run the local gateway and app, then use the Mac engineering launchpad panel:

```bash
npm run gateway
npm run dev
```

Enter the task in the engineering mission box, then click `Fixture self-test` to prove the local no-provider auto-work loop before installing any external runner. To prove a real AI coder can be governed from the same screen, click `Let Codex handle a tiny job`; the browser calls `/v1/engineering/codex-smoke`, the gateway runs the fixed `codex:engineer-smoke` command, and the result shows Codex transcript, diff, receipt, changed-file count, and baseline/final test status. Both paths write under `output/` and do not modify the main repository.

The browser calls the local gateway endpoint `/v1/engineering/auto-work` for fixture and preset runners, starts the same `engineering:auto-work` pipeline, imports receipts, audits evidence, and writes `output/engineering-auto-work-ui/summary.json`. Fixture runs use `output/engineering-auto-work-ui/fixture-worktree` so the web smoke does not modify the main repository.

For external tools, click `Check runners` to inspect local CLI/app candidates such as OpenHands, OpenClaw, browser-use, Playwright, Hammerspoon, E2B, MCP, and Hermes-style runtimes, choose `OpenHands CLI` after installing and license-reviewing the local OpenHands command, or enable the safe `OpenClaw local agent` template from the runner check panel. Then click `Start auto work`. Runner readiness detection and template enablement do not install tools, accept licenses, expose arbitrary shell, grant push/deploy, grant host-secret access, or allow unbounded Mac control. The operator still confirms adapter readiness before launching any external command.

To make Naikaku act as a safe Workbench wrapper around another local open-source CLI, use the UI template buttons or configure named presets on the gateway host. UI-enabled templates are written to `.naikaku-data/engineering-runner-presets.json` by default. Set `NAIKAKU_ENGINEERING_RUNNER_PRESETS_FILE` to move that file. The browser can select the preset id after `Check runners`, but cannot submit arbitrary shell:

```bash
NAIKAKU_ENGINEERING_RUNNER_PRESETS='[
  {
    "id": "openclaw-local",
    "label": "OpenClaw local agent",
    "adapterId": "openclaw-desktop-runner",
    "command": "openclaw",
    "args": ["agent", "--agent", "naikaku", "--message-file", "{taskPath}", "--local", "--json"],
    "commandCandidates": ["openclaw"]
  }
]' npm run gateway
```

The same pattern can wrap `browser-use`, `npx playwright`, `hs`, MCP runners, or a Hermes-style runtime as long as the command can consume the scoped task file and write the expected Naikaku receipt. External presets require the Workbench adapter-ready checkbox by default, so installation, license review, and approval stay explicit.

The command-line path uses the same preset registry. After defining `NAIKAKU_ENGINEERING_RUNNER_PRESETS` or enabling a gateway template, pass the preset id directly:

```bash
npm run engineering:auto-work -- \
  --mission "Run the configured local coding adapter and return evidence" \
  --adapter-ready \
  --runner-preset openclaw-local
```

Naikaku expands that fixed preset server-side into `--adapter`, `--command`, and `--arg` values, so operators select a known runner id instead of pasting arbitrary shell into the browser.

For the simplest command-line MVP flow, run one mission through the adapter registry, supervised engineering simulator, external-runner handoff package, deterministic adapter self-test, local verification runner, and fixture-only coding loop:

```bash
npm run engineering:mvp -- --mission "Implement the settings panel and run npm test"
```

This writes `output/engineering-mvp/summary.md` and keeps the claim boundary explicit: local commands can run, a generated fixture workspace can be patched/tested automatically, the adapter bridge can launch a deterministic external CLI runner, and OpenHands-style handoff files can be prepared, but real product code changes and completion are not claimed unless a patch or external coding runner returns accepted evidence. To inspect or run each stage manually:

For the shortest operator-facing path, use `engineering:auto-work`. With only a mission it prepares reviewable runner tasks without starting external tools:

```bash
npm run engineering:auto-work -- --mission "Implement the settings panel and run npm test"
```

To launch a user-installed command-line adapter and automatically import its returned receipt, add `--adapter-ready --command ...`. Keep `--max-jobs 1` until the adapter reliably writes Naikaku receipts:

```bash
npm run engineering:auto-work -- \
  --mission "Implement the settings panel and run npm test" \
  --adapter-ready \
  --runner-preset openhands \
  --worktree .
```

`--runner-preset openhands` expands to `openhands --always-approve -f {taskPath}`; use `--command` and repeated `--arg` flags if the upstream tool needs a different command line. `--adapter-ready` is a non-interactive local assertion that the selected adapter is installed, license-reviewed, and approved for this run. It does not grant Mac desktop control, Git push, deploy, external sends, or host-secret access.

```bash
npm run engineering:adapters
npm run engineering:simulate -- --mission "Implement the settings panel and run npm test"
npm run engineering:handoff -- --input output/engineering-simulate --adapter openhands-coding-agent
npm run engineering:adapter-self-test
npm run engineering:run-local
```

The adapter command writes `output/engineering-adapters/adapter-registry.json` and `.md`, listing the built-in local runner plus external candidates such as OpenHands, OpenClaw, browser-use, Playwright, Hammerspoon, E2B, MCP runners, and Hermes-style runtimes. `engineering:simulate` writes `output/engineering-simulate/summary.md` plus JSON contracts for the launch profile, self-simulation, launch queue, runner manifest, Mac readiness, Mac contract, and adapter registry. `engineering:handoff` consumes that package and writes `output/engineering-handoff/summary.md` plus per-session task Markdown files for a selected adapter. By default OpenHands handoff is review-only until the operator records upstream license review, installation, and approval:

```bash
npm run engineering:handoff -- \
  --input output/engineering-simulate \
  --adapter openhands-coding-agent \
  --license-reviewed openhands-coding-agent \
  --installed openhands-coding-agent \
  --approved openhands-coding-agent
```

Those flags produce executable job JSON under `output/engineering-handoff/jobs`. To run a user-installed adapter automatically instead of copying prompts by hand:

```bash
npm run engineering:run-adapter -- --handoff output/engineering-handoff --max-jobs 1
```

Then import the returned receipts into Naikaku review automatically:

```bash
npm run engineering:review-adapter-run -- \
  --bundle output/engineering-simulate/session-bundle.json \
  --adapter-run output/engineering-adapter-run/summary.json \
  --worktree /path/to/the/runner/worktree
```

For OpenHands, the default job command is `openhands --always-approve -f <task-file>`. If the upstream tool uses another command line, override it without changing Naikaku:

```bash
npm run engineering:run-adapter -- \
  --job output/engineering-handoff/jobs/01-coding-session.json \
  --command python \
  --arg -m --arg openhands.core.main --arg -f --arg {taskPath}
```

`engineering:run-adapter` writes stdout/stderr transcripts, one `naikaku.external-runner-adapter-execution-receipt.v1` per job, and a run summary. It also checks whether the external runner wrote the expected Naikaku session receipt after the command started, so stale receipts are not accepted. Add `--require-receipt` when a CI or local smoke should fail unless the external runner produced that receipt. `engineering:review-adapter-run` reads that run summary, imports only fresh review-ready receipts, writes a merged submitted receipt, runs receipt review, builds implementation evidence, and audits artifact paths plus optional Git worktree changed-file status. A zero exit code is still not enough to mark work done; Naikaku still needs the returned receipt, implementation evidence, artifact audit, and release verification. `engineering:run-local` consumes the simulation package, runs only preflight-allowed local verification commands, and writes transcripts, receipts, implementation evidence, artifact audit, and execution receipt under `output/engineering-run-local` plus the session evidence prefixes. Without an explicit `--patch-file`, it can claim local command execution but not code changes or completion. None of these commands controls macOS, commits, pushes, deploys, or sends messages. The fixture coding loop modifies only generated files under the output directory.

`engineering:adapter-self-test` is the no-provider proof that the bridge is more than prompt copying: it creates a tiny fixture Git workspace, launches a deterministic fake external CLI runner through adapter job JSON, observes a failing test, patches the fixture, reruns the test, writes a Naikaku session receipt, then calls the same adapter-run review importer to verify receipt/evidence/artifact audit. It modifies only ignored output files and does not claim a real OpenHands model run.

For desktop or browser control, Naikaku should use existing open-source runners as adapters instead of rebuilding the control layer. OpenHands/Codex-style coding agents should handle repository implementation; OpenClaw-style desktop control and Hammerspoon Mac automation should handle approved desktop actions; browser-use or Playwright should handle browser workflows; E2B-style desktops, MCP runners, and Hermes-style runtimes can plug in behind the same approval, allowlist, log, receipt, and artifact-audit contracts. Compatible licenses and attribution must be checked before vendoring code; the safer default is invoking user-installed runners through scoped adapter processes and importing their receipts.

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
npm run coding-agent:gateway-smoke # start local gateway and prove lease-gated sandbox execution over HTTP
npm run coding-agent:engineering-sim # patch a fixture Git workspace, run its test, and verify receipt/audit evidence
npm run engineering:mvp # one-command adapter registry, engineering simulation, external handoff, adapter self-test, local verification, fixture coding loop, and honest claim summary
npm run engineering:adapter-self-test # launch a deterministic fake external CLI through adapter jobs and verify receipt/evidence/audit
npm run engineering:adapters # write the external runner adapter registry for OpenHands/OpenClaw/browser-use/Hammerspoon-style integrations
npm run engineering:auto-work # prepare a mission, optionally launch an adapter CLI, import receipts, and audit evidence
npm run naikaku:task # one-mission task entry for prepare, self-test, codex-smoke, or fixed runner-preset modes
npm run engineering:auto-work-gateway-smoke # start the local gateway and prove the web auto-work endpoint can run the fixture adapter
npm run engineering:auto-work-smoke # run auto-work through the local fixture external CLI and verify receipt/evidence/audit
npm run open-source:mvp-check # build, targeted tests, gateway auto-work, and fixture coding loop in one contributor-facing check
npm run engineering:runner-kit # generate and smoke-test a runnable local wrapper kit for external CLI adapters
npm run local-tools:smoke # generate a tiny cabinet-vote project and probe local OpenClaw/Hammerspoon adapters
npm run cabinet:codex-smoke # call Codex CLI as separate cabinet roles, then vote locally
npm run codex:engineer-smoke # let Codex patch a generated tiny project and return local evidence
npm run engineering:handoff # write external-runner task Markdown and adapter job JSON from engineering:simulate output
npm run engineering:run-adapter # launch user-installed runner CLI commands from adapter job JSON and capture transcripts
npm run engineering:review-adapter-run # import fresh adapter receipts and run receipt/evidence/artifact audit
npm run engineering:simulate # prepare a mission's launch profile, self-simulation, queue, runner contracts, and Mac readiness without executing work
npm run engineering:run-local # consume engineering:simulate output, run preflight-allowed local commands, and write receipts/evidence
npm run coding-agent:drill # self-simulate valid, mismatched, and sandbox-prefix coding-agent receipt evidence
npm run localization:drill # self-simulate coding-agent handoff in every supported operator language
npm run executor:drill # self-simulate every sandbox executor profile and evidence contract
npm run sandbox:capabilities # self-simulate executor readiness checks, approval gates, evidence contracts, and kill-switch blocking
npm run security:red-team # self-simulate hostile prompt, credential, control-plane, Git/deploy, and external-send red-team cases
npm run runner-auth:drill # self-simulate scoped runner credentials, rotation expiry, and fail-closed auth
npm run production:boundary # confirm production verifier rejects dry-run evidence with code 4
npm run verification:manifest # aggregate localization, executor, sandbox capability, security red-team, dispatch, simulation, runner, invocation, intake, self-test, lease, sandbox-runner, engineering-sim, receipt, and release evidence
npm run release:verify # run all local drills, then verify dry-run scope
npm run release:verify:production # fail unless the latest report has production evidence
npm run verify:all # run tests, build, gateway smoke, engineering sim, auto-work smoke, dry-run verification, production negative gate, and diff check
npm run ci:open-source # run the contributor-facing MVP automation gate, full tests, and git diff whitespace check
npm run build     # type-check and build
npm run test      # run unit tests
npm run preview   # preview the production build
```

`npm run open-source:mvp-check` is the recommended first command for contributors who want to validate the current MVP without configuring providers or installing external automation tools. It runs the production build, a focused test set for localization and engineering runner contracts, the gateway-backed fixture auto-work path, a configured preset CLI bridge, the runner wrapper kit smoke, and the fixture coding-agent self-simulation. The generated summary names both the evidence paths and the claim boundary, so a passing check means local governed automation works, not that Naikaku has secretly run a real desktop/coding agent or modified product backlog code.

`npm run rehearsal` runs the same delivery self-check used by the workbench: cabinet dry-run, automation runbook, executor evidence, release bundle, release notes, remediation plan, remediation issue drafts, and redaction checks. It exits non-zero for blockers and writes JSON, Markdown, issue draft, and reviewable `gh issue create` script artifacts under `output/rehearsal`. Use `npm run rehearsal:strict` when warnings should fail CI or final handoff.

`npm run rehearsal:drill` first writes reviewed local fixtures under `output/release-drill`, then runs strict rehearsal with a provided run, provider-readiness export, approval records, audit events, reviewed memory, saved development items, and a secret probe. It is a reproducible sandbox drill for the release gate; it proves the evidence plumbing can close cleanly without claiming that real provider keys or production runners have been attached. Rehearsal JSON, CLI output, and the UI panel include an evidence claim that names this as `dry-run` evidence and lists the remaining production requirements.

`npm run coding-agent:dispatch` writes `naikaku.coding-agent-dispatch-drill.v1` under `output/coding-agent-dispatch-drill`. It builds the default Development Board, coding-agent briefs, review, session bundle, assignment drill, dispatch manifest, dispatch archive, archive audit, ready prompt files, and receipt template. It also builds a production-held negative package and fails if any held session receives a prompt file or receipt template, if archive paths become unsafe, or if the archive audit cannot verify manifest/prompt/receipt consistency. The workbench Coding Agent panel exposes the same dispatch manifest path with gateway/local fallback plus JSON and Markdown downloads for the manifest, archive, archive audit, and dispatch simulation. This is the practical handoff surface for Codex-like programming agents: ready sessions become prompt files, expected transcript/evidence paths stay under each session prefix, and implementation still requires a completed receipt before the Development Board can move.

`npm run coding-agent:simulate` writes `naikaku.coding-agent-dispatch-simulation.v1` under `output/coding-agent-dispatch-simulation`. It rebuilds the reviewed dispatch chain, audits the archive, creates pending receipt drafts for ready sessions, and writes one per-session draft JSON under `valid/receipt-drafts/` so a real coding agent can pick up the prompt, planned steps, pending command results, and evidence prefix. It proves production-held sessions stay visible but unassigned and writes zero held-session draft files. It does not edit files, run commands, open a browser, call providers, commit, push, or deploy. It is a local self-simulation of the next coding-agent execution handoff, not implementation evidence.

`npm run coding-agent:runner-manifest` writes `naikaku.coding-agent-runner-manifest-drill.v1` under `output/coding-agent-runner-manifest`. It reads the dispatch simulation JSON plus `valid/receipt-drafts/*.json`, then writes runner-facing task manifests for ready sessions with prompt paths, receipt draft paths, pending commands, evidence targets, executor profile ids, and stop conditions. Production-held sessions must produce zero runner tasks and zero receipt draft paths. This is the bridge toward Codex/OpenClaw-style governed executors; it still does not run a model, command, browser, desktop, MCP tool, Git operation, or deploy.

`npm run coding-agent:runner-invocation` writes `naikaku.coding-agent-runner-invocation-drill.v1` under `output/coding-agent-runner-invocation`. It consumes the runner manifest drill output and writes one `naikaku.coding-agent-runner-invocation.v1` JSON/Markdown file per ready runner task with prompt path, receipt draft path, pending command contracts, evidence targets, runner instructions, and stop conditions. Production-held sessions must write zero invocation files. The Workbench now prepares the same package after dispatch/runner-manifest generation and exposes JSON/Markdown downloads, while the local gateway exposes `/v1/development/coding-briefs/runner-invocation` for automation clients. This is the handoff file a future Codex/OpenClaw-style runner can consume inside a governed workspace; it still does not edit files, execute commands, call providers, browse, deploy, commit, push, or claim implementation evidence.

`npm run coding-agent:runner-intake` writes `naikaku.coding-agent-runner-intake-audit-drill.v1` under `output/coding-agent-runner-intake-audit`. It reads the runner invocation drill output, verifies the expected invocation JSON/Markdown files are readable, and audits each ready invocation for safe paths, pending command contracts, transcript/evidence scope, receipt-return instructions, stop conditions, security-classifier blocks, and zero completed command results. The drill also mutates one local fixture with a dangerous Git command and must prove the security classifier blocks that tampered handoff before a runner can consume it. Production-held sessions must stay visible but receive zero accepted intakes. The Workbench now prepares the same intake audit after runner invocation generation and exposes JSON/Markdown downloads, while the local gateway exposes `/v1/development/coding-briefs/runner-intake` for automation clients. This is a pre-runner acceptance gate, not execution proof: it still does not read prompt contents, edit files, execute commands, call providers, browse, deploy, commit, push, or claim implementation evidence.

`npm run coding-agent:runner-self-test` writes `naikaku.coding-agent-runner-self-test-drill.v1` under `output/coding-agent-runner-self-test`. It consumes the runner manifest artifacts and simulates a governed runner preflight: ready tasks become would-run tasks, all commands stay `not-executed`, transcripts/evidence remain scoped under the session prefix, and production-held tasks stay at zero would-run. This is a self-test of the handoff contract, not implementation evidence.

`npm run coding-agent:runner-lease` writes `naikaku.coding-agent-runner-lease-drill.v1` under `output/coding-agent-runner-lease`. It consumes runner self-test artifacts and self-simulates the queue ownership step before execution: one scoped runner receives a lease, the same runner can retry idempotently, a competing runner is blocked while the lease is active, an expired lease can be reclaimed, a wrong-profile runner is denied, and production-held sessions receive no active leases. The local gateway also exposes `/v1/development/coding-briefs/runner-lease`, records issued active lease ids in its current process, and the Workbench now claims a lease automatically before starting the gateway sandbox runner. It does not execute commands or prove implementation work.

`npm run coding-agent:sandbox-runner` writes `naikaku.coding-agent-sandbox-runner-drill.v1` under `output/coding-agent-sandbox-runner`. It consumes the runner self-test artifacts, executes only allowlisted local verification commands in this repository, writes session-scoped transcripts and evidence artifacts, submits a local receipt, reviews it, builds implementation evidence, and audits local artifact paths and transcript contents. Today the allowlist is intentionally narrow (`npm run test` and `npm run build`). The drill also creates a security-blocked preflight where `git push origin main` is deliberately added to the command allowlist; the security classifier must still block it before any process execution can happen. The workbench exposes a sandbox preflight plus the same executable runner through the local gateway after a dispatch package and runner self-test are ready, with JSON/Markdown preflight and sandbox runner report downloads plus receipt and implementation-evidence downloads. The gateway execution route reruns the preflight server-side, requires an active matching runner lease ledger issued by the current gateway process, and returns `409` without command execution when preflight or lease validation is not ready, so direct API callers cannot bypass the sandbox gate. A passing drill proves the local runner command/evidence/receipt plumbing works; it explicitly does not prove that a model implemented the queued backlog work, and it must not be reconciled into the Development Board as feature completion.

`npm run coding-agent:gateway-smoke` writes `naikaku.coding-agent-gateway-runner-smoke.v1` under `output/coding-agent-gateway-runner-smoke`. It starts the local gateway on a temporary `127.0.0.1` port with synthetic scoped runner credentials, checks health, builds a fresh coding-agent session bundle and runner self-test, verifies the sandbox-runner route rejects missing lease ledgers, verifies a locally fabricated but unissued lease ledger is rejected, claims a real lease through `/v1/development/coding-briefs/runner-lease`, and then executes `/v1/development/coding-briefs/sandbox-runner` with that gateway-issued lease. It also creates and cleans up a temporary untracked worktree probe file to prove the gateway artifact-audit route can verify changed-file claims against `git status`, then submits a clean tracked file as a changed-file claim and expects `needs-artifacts`. This is a stronger local HTTP smoke than the pure domain drills; it still does not call providers, browse, control desktops, deploy, commit, push, or prove a model implemented backlog work.

`npm run coding-agent:engineering-sim` writes `naikaku.coding-agent-engineering-self-simulation.v1` under `output/coding-agent-engineering-self-simulation`. It creates a temporary fixture Git workspace, commits a deliberately broken score-normalization implementation, proves the fixture test fails, patches exactly one fixture source file, reruns the fixture test, writes baseline/final transcripts and a patch artifact under the session evidence prefix, submits a receipt, builds implementation evidence, and audits local artifacts plus fixture Git worktree status. It also submits two negative evidence cases: a failed-test receipt must stay blocked, and a clean tracked file claimed as changed must stay `needs-artifacts`. A passing run proves that the local engineering evidence loop can close for a tiny task while rejecting common fake-completion evidence. It still does not call a model provider, browse, control desktops, use MCP tools, touch production code, deploy, commit or push the main repository, reconcile real Development Board items, or prove that a real backlog item was implemented.

`npm run coding-agent:drill` writes a reproducible coding-agent receipt drill under `output/coding-agent-receipt-drill`. It builds the default Development Board, coding-agent briefs, brief review, session bundle, a valid receipt, a mismatched receipt, and an out-of-scope receipt whose labels look correct but whose artifacts are outside the session sandbox evidence prefix. The valid path must produce verified receipt review, accepted implementation evidence, verified artifact audit, and applied Development Board reconciliation. The mismatched and out-of-scope paths must stay `needs-evidence` / `needs-artifacts` with zero board items applied. The drill is local proof that the anti-fake evidence gate works; it is not production runner evidence.

`npm run localization:drill` writes `naikaku.localization-drill.v1` under `output/localization-drill`. It verifies Japanese-first locale order, then runs the coding-agent brief, review, session bundle, dispatch manifest, dispatch archive audit, dispatch simulation, runner manifest, runner invocation package, runner intake audit, runner self-test, sandbox runner preflight, assignment drill, and receipt-template chain for Japanese, English, Simplified Chinese, Traditional Chinese, and Korean. It fails if a locale drops the operator-language instruction, changes machine contracts such as commands or evidence paths, loses the structured session sandbox contract, cannot produce assignable sandbox sessions, dispatch simulations, runner manifests, runner invocation packages, runner intake audits, runner self-tests, or sandbox preflights, or lets a receipt template claim implementation without evidence.

`npm run executor:drill` writes `naikaku.executor-contract-drill.v1` under `output/executor-contract-drill`. It self-simulates Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate handoff actions through the same handoff, runbook, dry-run executor, and evidence bundle builders. It also includes a deliberately blocked production deployment and fails if that blocked action reaches execution evidence.

`npm run sandbox:capabilities` writes `naikaku.sandbox-capability-drill.v1` under `output/sandbox-capability-drill`. It self-simulates the Sandbox Capability registry and a kill-switch-open negative case. The drill fails if any executor profile loses its readiness checks, approval gates, blocked reasons, evidence artifact contract, role coverage, or if opening the kill switch no longer blocks every runner profile. It does not execute browser, desktop, shell, MCP, provider, deployment, or Git actions.

`npm run security:red-team` writes `naikaku.security-red-team-drill.v1` under `output/security-red-team-drill`. It runs deterministic hostile-input fixtures against the local security classifier and sandbox policy, covering prompt-injection override attempts, credential exfiltration, localhost/control-plane access, metadata service access, Git mutation, production deployment claims, external-send requests, approval-gated shell verification, and one safe allowlisted research action. It fails if hostile cases are not blocked, if high-impact local verification stops requiring approval, if the safe case is blocked, or if any fixture claims an action was executed.

`npm run production:boundary` calls the production verifier, expects exit code 4 while evidence is still dry-run, and writes `naikaku.production-boundary-drill.v1` to `output/verification/production-boundary-latest.json`. It fails if dry-run evidence ever passes as production-ready.

`npm run runner-auth:drill` writes `naikaku.runner-auth-drill.v1` under `output/runner-auth-drill`. It self-simulates development-open local posture, legacy shared-token compatibility, scoped runner credentials, token-hash credentials, profile-limited runners, expired credential rejection, malformed scoped config fail-closed behavior, token redaction, and a mixed handoff/evidence scope probe proving a shell runner receives only shell actions and shell evidence from a broader runner payload. It does not start the gateway or execute runner actions.

`npm run verification:manifest` reads the latest localization drill, executor contract drill, sandbox capability drill, security red-team drill, runner auth drill, production boundary drill, coding-agent dispatch drill, coding-agent dispatch simulation drill, coding-agent runner manifest drill, coding-agent runner invocation drill, coding-agent runner intake audit drill, coding-agent runner self-test drill, coding-agent runner lease drill, coding-agent sandbox runner drill, coding-agent engineering self-simulation, coding-agent receipt drill, and release verification report, then writes `naikaku.verification-manifest.v1` to `output/verification/verification-manifest-latest.json`. The manifest fails if any supported locale drops the coding-agent handoff contract, if dispatch packaging writes prompts for production-held sessions, if dispatch simulation fails to write one pending receipt draft file per ready session, if runner manifest loses a ready task or receipt draft path, if it creates runner tasks for held sessions, if runner invocation packaging fails to write one executable handoff file per ready task, if it writes invocation files for production-held sessions, if runner intake cannot read ready invocation files, observes completed command results, inherits blocked package checks, accepts production-held work, reports blocked security classifications on clean input, or fails to block the tampered dangerous-command fixture, if runner self-test claims executed commands or queues production-held work, if runner lease stops proving exclusive ownership, idempotent same-runner retries, duplicate-runner blocking, expiry reclaim, profile-scope denial, or production-held non-assignment, if the sandbox runner fails to execute allowlisted local commands, write transcripts, verify receipt/audit artifacts, keep production-held work unrun, or block an allowlisted dangerous command in preflight, if the engineering self-simulation fails to prove fail-before/pass-after fixture patching with verified receipt, artifact fingerprints, transcript checks, fixture Git worktree status, failed-test rejection, and clean-worktree claim rejection, if any executor profile loses scoped dry-run evidence, if the sandbox capability registry loses readiness checks, approval gates, evidence artifacts, blocked reasons, or kill-switch blocking, if the security red-team drill stops blocking hostile prompt, credential, localhost/control-plane, metadata, Git, deploy, or external-send cases, if runner auth stops proving scoped credentials, token-hash acceptance, profile limits, handoff/evidence scope filtering, credential expiry rejection, or fail-closed malformed config, if a blocked production action reaches execution evidence, if the production verifier does not reject dry-run evidence with code 4, if the valid coding-agent receipt does not apply all board items, if the mismatched or out-of-scope receipt updates any board item, if release verification fails, or if the dry-run versus production boundary is unclear.

`npm run release:verify` first runs the localization drill, executor contract drill, sandbox capability drill, security red-team drill, runner auth drill, coding-agent dispatch drill, coding-agent dispatch simulation drill, coding-agent runner manifest drill, coding-agent runner invocation drill, coding-agent runner intake audit drill, coding-agent runner self-test drill, coding-agent runner lease drill, coding-agent sandbox runner drill, coding-agent engineering self-simulation, coding-agent receipt drill, and release rehearsal drill, then turns the latest drill rehearsal into `naikaku.release-verification.v1`, runs the production boundary drill, and finally writes the verification manifest. It fails if localization contracts drift, dispatch packaging assigns held sessions, dispatch simulation overclaims execution readiness, runner manifest queues held work, runner invocation packaging loses ready files or writes held files, runner intake accepts unreadable or overclaimed invocation files, runner intake or sandbox preflight fail their dangerous-command classifier probes, runner self-test overclaims execution, runner lease breaks exclusive ownership or profile-scope rejection, sandbox runner local command/receipt/audit plumbing breaks or overclaims feature completion, engineering self-simulation stops proving fixture edit-test-receipt-audit closure, executor contracts overclaim, sandbox capability readiness or kill-switch behavior drifts, security red-team hostile-input boundaries drift, runner auth scope or rotation boundaries drift, coding-agent evidence gates accept mismatched or out-of-scope sandbox evidence, the production boundary stops rejecting dry-run evidence, warnings, blockers, schema drift, or secret leakage are present, release verification cannot pass for dry-run scope, or the manifest cannot prove every local gate. The workbench panel and local gateway expose the same release verifier for operator review and downloadable JSON. `npm run release:verify:production` is intentionally stricter: it returns code 4 while the evidence claim is still `dry-run`, so a sandbox drill cannot be mistaken for a production handoff.

`npm run verify:all` is the recommended local and CI gate. It runs unit/domain tests, the production build, the gateway runner smoke, the fixture engineering self-simulation, the `engineering:auto-work-smoke` external CLI receipt-import path, the `engineering:auto-work-gateway-smoke` web endpoint path, `npm run release:verify`, confirms `npm run release:verify:production` returns code 4, and finishes with `git diff --check`. CI should reuse the same command so local and remote verification share one contract.

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
