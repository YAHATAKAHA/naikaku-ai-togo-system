# Naikaku AI Togo System

Naikaku AI Togo System is a Japanese-first, multi-model AI cabinet workbench for governed software work.

Instead of treating one model as an unchecked operator, Naikaku separates a mission into roles: planning, execution, critique, supervision, scoring, memory, and safety. Runners such as local CLIs or automation tools are attached behind approval gates, scoped permissions, receipts, and artifact review.

## What It Is

Naikaku is designed for developers who want AI-assisted engineering to be auditable:

- Multiple AI roles can review the same mission before execution.
- Provider settings use aliases, not raw browser-stored secrets.
- Runner work is bounded by contracts, command allowlists, and evidence requirements.
- Results are accepted only after receipts, command output, changed-file references, and audit checks line up.
- Japanese is the primary operator language, with English, Simplified Chinese, Traditional Chinese, and Korean supported in the product UI.

This repository contains the product source, tests, fixture drills, and public technical documentation.

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

For local API and runner gateway features, start the gateway in another terminal:

```bash
npm run gateway
```

To run the public verification checks:

```bash
npm run public-scope:check
npm run build
npm run test
npm run open-source:mvp-check
```

The last command runs the no-provider verification path. It uses local fixtures and replay providers, not paid model credentials.

## Release Package

The first public package is a macOS developer preview archive, not a signed `.dmg` installer.

Latest release:

<https://github.com/YAHATAKAHA/naikaku-ai-togo-system/releases/latest>

Run from the archive:

```bash
tar -xzf naikaku-ai-togo-system-0.1.0-mac-dev-preview.tar.gz
cd naikaku-ai-togo-system-0.1.0-mac-dev-preview
npm ci
npm run dev
```

## Architecture

Naikaku has four main layers:

1. Workbench UI - React/Vite interface for mission entry, role configuration, readiness, run logs, and evidence review.
2. Cabinet domain - TypeScript domain modules for roles, decisions, automation, sandbox policy, memory, receipts, and verification.
3. Local gateway - Server-side routes for provider calls, runner contracts, ledger records, and sandbox execution gates.
4. Runner adapters - Bounded bridges for tools such as Codex CLI, Claude Code, OpenHands-style CLIs, OpenClaw-style local agents, Hammerspoon, Playwright, or custom command-line tools.

The runner layer is intentionally contract-first. A runner must return structured evidence before Naikaku treats the work as complete.

## Providers

Naikaku supports bring-your-own provider configuration through environment-variable aliases. Browser state should store aliases such as `OPENAI_API_KEY`, not raw keys.

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
- External content and tool output are treated as untrusted.
- Shell and runner actions require scoped contracts.
- Production deploy, Git push, external send, purchases, and broad host control require explicit approval.
- Receipt review and artifact audit are separate from execution.
- Public release checks include `npm run public-scope:check`.

Security details:

- [docs/security-sandbox.md](./docs/security-sandbox.md)
- [SECURITY.md](./SECURITY.md)

## Documentation

- [Architecture](./docs/architecture.md)
- [Gateway API](./docs/gateway.md)
- [Provider adapters](./docs/api-adapters.md)
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

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [PUBLIC-SOURCE-SCOPE.md](./PUBLIC-SOURCE-SCOPE.md). Do not submit private deployment files, website source, credentials, customer data, private logs, or internal business material.

## License

Naikaku AI Togo System is distributed under the [PolyForm Noncommercial License 1.0.0](./LICENSE).

Personal study, noncommercial research, hobby use, and noncommercial self-hosting are allowed. Commercial use, paid hosting/SaaS, resale, integration into commercial products, client delivery, or commercial modification requires separate written permission from 合同会社EMYSTI.

See [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) and [NOTICE](./NOTICE).
