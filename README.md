# Naikaku AI Togo System

Japan-born multi-model AI cabinet system for planning, execution, critique, supervision, scoring, sandboxed computer use, and iterative refinement.

Naikaku is an operator workbench for teams that want multiple AI roles to cooperate like a cabinet: one mission enters, specialized ministers reason over it, controlled tools execute it, auditors challenge it, and a scoring office decides whether the result is ready or needs another cycle.

## What Exists Now

- A React/Vite TypeScript workbench.
- Cabinet roles with independent provider, endpoint, model, API key alias, system prompt, and permission settings.
- A local automation pipeline for planning, execution, critique, supervision, scoring, and iteration.
- A sandbox-first computer-use model with Browser Sandbox, Desktop VM, Shell Container, MCP Proxy, and Human Approval Gate executor profiles.
- Local-only configuration persistence that deliberately strips raw API secrets before saving.
- Browser-to-gateway run path with local fallback when the gateway is offline.
- Automation queue proposals, persisted approval records, executor handoff export, and a safe executor dry-run before any real runner consumes work.
- Workspace JSON import/export and recent run history for team handoff.
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

It starts on `http://127.0.0.1:8787` by default and exposes health, provider test, cabinet run, automation plan, executor handoff, executor dry-run, and sandbox policy-check endpoints.

The workbench defaults to `dry-run`. Switch to `live providers` only when the gateway has the needed environment variables. Browser storage keeps aliases such as `NAIKAKU_OPENAI_API_KEY`; raw secrets stay server-side.

## Scripts

```bash
npm run dev       # start the app
npm run gateway   # start the local cabinet/sandbox gateway
npm run build     # type-check and build
npm run test      # run unit tests
npm run preview   # preview the production build
```

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
