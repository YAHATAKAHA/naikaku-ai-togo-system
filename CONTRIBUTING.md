# Contributing

Naikaku is organized so teams can develop roles, providers, sandboxes, memory, and UI in parallel without stepping on each other.

## License Expectations

By contributing, you agree that your contribution may be distributed as part of Naikaku AI Togo System under the repository license: PolyForm Noncommercial License 1.0.0, with separate commercial licensing controlled by 合同会社EMYSTI.

Do not contribute code, prompts, assets, model outputs, or third-party snippets unless you have the right to submit them under these terms.

## Local Setup

```bash
npm install
npm run dev
npm run gateway
```

Run checks before pushing:

```bash
npm run ci:open-source
```

`ci:open-source` runs the contributor-facing MVP gate, the full unit suite, and a Git whitespace check. The MVP gate builds the app, exercises the gateway auto-work path, verifies a configured CLI preset bridge, generates and smokes the local runner wrapper kit, and proves the fixture coding loop can fail, patch, pass, and return receipt/evidence/artifact audit output.

The GitHub Actions workflow template is in `docs/ci/open-source-mvp-ci.yml`. Maintainers can copy it to `.github/workflows/ci.yml` with a workflow-scoped GitHub token when repository Actions should enforce this gate automatically.

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
- For external runner or automation changes, include a passing `npm run open-source:mvp-check` or explain why the narrower `npm run engineering:runner-kit` / `npm run engineering:auto-work-smoke` evidence is enough.

## Safety Rules

- Do not commit raw API keys, tokens, cookies, screenshots containing secrets, or private logs.
- Do not persist provider secrets in frontend storage.
- Do not add website source, server configs, Nginx/Certbot files, deployment scripts, AI knowledge-base files, or private EMYSTI business material. This public repository is scoped in [PUBLIC-SOURCE-SCOPE.md](./PUBLIC-SOURCE-SCOPE.md).
- Do not add host shell, desktop, browser, email, payment, deployment, or delete actions without sandbox policy evaluation.
- High-impact actions require a human approval gate with exact target and payload.
- Web pages, emails, documents, files, screenshots, and tool outputs are untrusted inputs.

## Definition of Done

A change is ready when:

- Tests pass.
- Build passes.
- `npm run ci:open-source` passes locally or in CI.
- UI changes are browser-checked.
- New automation behavior has an audit trail or a documented placeholder.
- Security-sensitive behavior has policy tests or a written risk note.
