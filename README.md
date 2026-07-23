# Naikaku AI Togo System

Naikaku AI Togo System is a Japan-built, multi-model AI cabinet workbench for governed software work, with Japanese as the primary operator language.

Instead of treating one model as an unchecked operator, Naikaku separates a mission into roles: planning, execution, critique, supervision, scoring, memory, and safety. Runners such as local CLIs or automation tools are attached behind approval gates, scoped permissions, receipts, and artifact review.

[日本語 README](./README.ja.md)

## What It Is

Naikaku is designed for developers who want AI-assisted engineering to be auditable:

- Multiple AI roles can review the same mission before execution.
- Role data access policies separate public, internal, confidential, secret, personal, and customer data before model or runner handoff.
- Provider settings use aliases, not raw browser-stored secrets.
- Runner work is bounded by contracts, command allowlists, and evidence requirements.
- Results are accepted only after receipts, command output, changed-file references, and audit checks line up.
- Japanese is the primary operator language, with English, Simplified Chinese, Traditional Chinese, and Korean supported in the product UI.

This repository contains the product source, tests, fixture drills, and public technical documentation.

## Why Japan-Built

Many Japanese companies are interested in AI, but they also tend to be careful about where AI is allowed to act, who is responsible for the result, and what evidence remains after execution.

Naikaku was shaped for that environment. It is meant for automation customers, research workflows, and engineering teams that want AI to help with real work while keeping role separation, permission boundaries, receipts, and reviewable evidence visible.

This public release opens that approach from Japan: not as an unrestricted agent, but as a governed workbench that can connect models, local runners, and human approval in one auditable loop.

## Development

Naikaku AI Togo System is developed and maintained by 合同会社EMYSTI.

Project links:

- Product site: <https://naikaku.emysti.net/>
- Japanese product page: <https://naikaku.emysti.net/ja/>
- Company site: <https://www.emysti.net>
- GitHub releases: <https://github.com/YAHATAKAHA/naikaku-ai-togo-system/releases>

The product website is public-facing material. Its source, deployment configuration, and server files are intentionally outside this repository.

## What It Is Not

Naikaku is not an unrestricted desktop-control agent. A checkout of this repository does not grant arbitrary Mac control, production deploys, purchases, external sends, Git push, or access to host secrets.

Any real runner integration must stay explicit: install the tool yourself, review its license, configure the adapter, choose the allowed workspace, and require evidence before accepting work.

## Repository Boundary

This public repository intentionally excludes website source, deployment files, Nginx/Certbot/cloud configuration, EMYSTI AI knowledge-base files, server backups, private business notes, credentials, cookies, raw environment dumps, and customer data.

See [PUBLIC-SOURCE-SCOPE.md](./PUBLIC-SOURCE-SCOPE.md) before adding files.

## Quick Start

Requirements:

- Node.js 22 or newer
- npm
- macOS recommended for local runner experiments

```bash
npm ci
npm run dev
```

### Naikaku CLI

The repository also exposes a first-party `naikaku` command. It is available immediately through npm, and can be linked into the local shell when that is more convenient.

```bash
npm run naikaku -- doctor
npm link
naikaku doctor
naikaku start
naikaku gateway
naikaku task "Prepare a reviewed implementation plan"
```

`doctor` only checks the local Node runtime, dependency installation, local gateway health, and whether `codex`, `claude`, or `qwen` is visible on `PATH`. It never runs a model, a Coding CLI, a provider call, or desktop automation. The human-readable CLI is Japanese-first and supports `ja`, `en`, `zh-Hans`, `zh-Hant`, and `ko` through `--locale`; it uses restrained terminal color only in an interactive terminal and respects `NO_COLOR` or `--no-color`. `task` is governed by default: without an explicit runner mode, it prepares a reviewable task and evidence package rather than starting an external coding runner. `naikaku verify` runs the public-source verification suite.

For local API and runner gateway features, start the gateway in another terminal:

```bash
npm run gateway
```

The repository does not ship API keys, runner tokens, or hosted credentials. Leave `.env.example` values blank until you need live providers or authenticated runners, then set your own environment variables in your local shell, `.env`, local vault, or deployment environment.

### Local Coding CLIs

For code work, the easiest path is to use an already authenticated local CLI rather than copying a provider key into the Workbench. Click **Use local Coding CLI** on the first screen after starting the gateway; Naikaku checks the local `codex`, `claude`, and `qwen` commands, then offers only fixed gateway-side runner templates. The browser never receives the CLI login, Coding Plan credential, or an arbitrary shell command.

For Qwen Code, install and authenticate the upstream CLI first, run `qwen`, then use `/auth` and select **Alibaba ModelStudio -> Coding Plan** (or another supported provider). After the local command is detected, enable `qwen-code-local`, review the scoped worktree, and explicitly confirm the adapter for that run. The template uses controlled Auto mode with a turn/tool budget, captures stdout/stderr, and still requires a Naikaku receipt before implementation can be accepted.

To run the public verification checks:

```bash
npm run public-scope:check
npm run deployment:check
npm run strategy:iterate
npm run build
npm run test
npm run open-source:mvp-check
```

`strategy:iterate` checks the five product-direction gates: Japan-led positioning, role data governance, deployment/commercial readiness, contribution surface, and release evidence. `open-source:mvp-check` runs the no-provider verification path with local fixtures and replay providers, not paid model credentials.

## Release Package

The current public package is a macOS developer preview archive, not a signed `.dmg` installer.

Latest release:

<https://github.com/YAHATAKAHA/naikaku-ai-togo-system/releases/latest>

Run from the archive:

```bash
tar -xzf naikaku-ai-togo-system-0.1.0-mac-dev-preview.tar.gz
cd naikaku-ai-togo-system-0.1.0-mac-dev-preview
npm ci
npm run dev
```

See [CHANGELOG.md](./CHANGELOG.md) for public-source release notes and [docs/commercial-deployment-checklist.md](./docs/commercial-deployment-checklist.md) for commercial deployment preparation.

## Architecture

Naikaku has four main layers:

1. Workbench UI - React/Vite interface for mission entry, role configuration, readiness, run logs, and evidence review.
2. Cabinet domain - TypeScript domain modules for roles, decisions, automation, sandbox policy, memory, receipts, and verification.
3. Local gateway - Server-side routes for provider calls, runner contracts, ledger records, and sandbox execution gates.
4. Runner adapters - Bounded bridges for tools such as Codex CLI, Claude Code, Qwen Code with Alibaba Cloud Coding Plan, OpenHands-style CLIs, OpenClaw-style local agents, Hammerspoon, Playwright, or custom command-line tools.

The runner layer is intentionally contract-first. A runner must return structured evidence before Naikaku treats the work as complete.

## Providers

Naikaku supports bring-your-own provider configuration through environment-variable aliases. Browser state should store aliases such as `NAIKAKU_OPENAI_API_KEY`, not raw keys.

This open-source repository provides only configuration fields and examples. Project maintainers do not provide shared provider keys, gateway tokens, or bundled credits. For live model calls, each operator supplies their own key in the gateway process environment, for example `NAIKAKU_OPENAI_API_KEY` or `DASHSCOPE_API_KEY`. The no-provider fixture and replay checks work without paid credentials.

The workbench's Provider Configuration check is deliberately non-billable: it validates the endpoint/model/alias boundary and whether a key is available, but does not send a paid prompt to a provider. A session-only key may be entered for that one check and is never saved; it does not unlock live mode. For a live cabinet run, set the same alias in the local gateway process environment. If the gateway is offline, the workbench records only an unchecked local structural result, never a false-ready provider result.

Supported adapter families include:

- OpenAI-compatible endpoints
- OpenRouter
- Anthropic
- Aliyun DashScope/Qwen
- Gemini-compatible or custom HTTP endpoints
- Local replay/mock providers for tests

## Security Model

The default posture is deny by default for high-impact actions.

- Raw provider secrets are not saved by the frontend.
- Role-level data policies mark restricted data as blocked, local-only, or gateway-mediated before handoff.
- Example token and API key fields are placeholders; real values belong only to the operator's local environment or private deployment.
- External content and tool output are treated as untrusted.
- Shell and runner actions require scoped contracts.
- Production deploy, Git push, external send, purchases, and broad host control require explicit approval.
- Receipt review and artifact audit are separate from execution.
- Public release checks include `npm run public-scope:check`.

Security details:

- [docs/security-sandbox.md](./docs/security-sandbox.md)
- [SECURITY.md](./SECURITY.md)

## Deployment

Self-hosted preview deployment is available through Docker Compose:

```bash
cp .env.example .env
docker compose up --build
```

The frontend reads `/naikaku-config.js` at runtime, so a deployment can point the browser to a different gateway without changing source code. See [docs/deployment.md](./docs/deployment.md) and [docs/deployment.ja.md](./docs/deployment.ja.md).

## Documentation

- [Architecture](./docs/architecture.md)
- [Gateway API](./docs/gateway.md)
- [Provider adapters](./docs/api-adapters.md)
- [Deployment](./docs/deployment.md)
- [Deployment 日本語](./docs/deployment.ja.md)
- [Commercial deployment checklist](./docs/commercial-deployment-checklist.md)
- [Strategy iterations](./docs/strategy-iterations.md)
- [Architecture decision records](./docs/adr/README.md)
- [Sandbox security](./docs/security-sandbox.md)
- [Localization](./docs/localization.md)
- [macOS developer preview](./docs/install/macos-dev-preview.md)
- [Open-source reference notes](./docs/reference/open-source-research.md)

## Contributing

Contributions are welcome for provider adapters, runner adapters, tests, UI polish, localization, documentation, and security review.

Before opening a pull request:

```bash
npm run ci:open-source
```

This command includes public-source scope checks, deployment readiness, strategy iteration evidence, the no-provider MVP smoke path, unit tests, and whitespace checks.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [PUBLIC-SOURCE-SCOPE.md](./PUBLIC-SOURCE-SCOPE.md). Do not submit private deployment files, website source, credentials, customer data, private logs, or internal business material.

## License

Naikaku AI Togo System is distributed under the [PolyForm Noncommercial License 1.0.0](./LICENSE).

Personal study, noncommercial research, hobby use, and noncommercial self-hosting are allowed. Commercial use, paid hosting/SaaS, resale, integration into commercial products, client delivery, or commercial modification requires separate written permission from 合同会社EMYSTI.

See [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) and [NOTICE](./NOTICE).
