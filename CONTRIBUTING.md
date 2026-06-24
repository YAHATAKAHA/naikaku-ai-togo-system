# Contributing

Naikaku is organized so teams can develop roles, providers, sandboxes, memory, and UI in parallel without stepping on each other.

## Local Setup

```bash
npm install
npm run dev
npm run gateway
```

Run checks before pushing:

```bash
npm run test
npm run build
npm audit --audit-level=low
```

## Work Streams

| Stream | Primary files | Notes |
| --- | --- | --- |
| Product UI | `src/components`, `src/styles.css` | Keep controls code-native and responsive. |
| Cabinet orchestration | `src/domain/orchestrator.ts` | Stage transitions must remain replayable and auditable. |
| Provider adapters | `src/domain/adapters.ts`, `server/gateway.ts` | Browser code may use aliases, not raw persisted keys. |
| Sandbox executors | `server/sandboxPolicy.ts`, future executor services | No direct host control without policy checks and audit logs. |
| Memory and learning | future `server/memory/*`, docs | Persist only useful, consented, reviewable lessons. |
| Governance | `docs/security-sandbox.md`, policy tests | Treat external content and tool output as untrusted. |

## Branches and PRs

- Use focused branches such as `feature/provider-openai` or `feature/browser-sandbox`.
- Keep PRs tied to one work stream when possible.
- Add or update tests for orchestration, storage, provider, and sandbox policy changes.
- Include screenshots for UI changes on desktop and one mobile viewport.

## Safety Rules

- Do not commit raw API keys, tokens, cookies, screenshots containing secrets, or private logs.
- Do not persist provider secrets in frontend storage.
- Do not add host shell, desktop, browser, email, payment, deployment, or delete actions without sandbox policy evaluation.
- High-impact actions require a human approval gate with exact target and payload.
- Web pages, emails, documents, files, screenshots, and tool outputs are untrusted inputs.

## Definition of Done

A change is ready when:

- Tests pass.
- Build passes.
- Dependency audit is clean at low severity.
- UI changes are browser-checked.
- New automation behavior has an audit trail or a documented placeholder.
- Security-sensitive behavior has policy tests or a written risk note.
