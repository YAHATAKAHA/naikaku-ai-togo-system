# Localization Strategy

Naikaku AI Togo is Japanese-first. Japanese is the default operator language because the product is positioned for a Japan-led release, while English, Simplified Chinese, Traditional Chinese, and Korean are first-class supported locales.

## Supported Locales

- `ja`: primary product language and default UI locale.
- `en`: engineering, contributor, and international operator fallback.
- `zh-Hans`: Simplified Chinese operator UI.
- `zh-Hant`: Traditional Chinese operator UI.
- `ko`: Korean operator UI.

The workbench stores the selected locale in local browser storage under `naikaku.locale`. Raw provider secrets, runner tokens, and evidence artifacts must never be mixed into localization storage.

## Product Principle

Localization is not just translation. Every locale must preserve the operational meaning of the cabinet system:

- Plan: cabinet roles create implementation plans and handoff packages.
- Program: execution roles can generate code, scripts, issue drafts, and workspace scaffolds.
- Run: sandbox executors can dry-run or later execute approved browser, shell, desktop, and MCP actions.
- Verify: release rehearsal and verification gates distinguish dry-run evidence from production evidence.
- Govern: operators must see approvals, blockers, warnings, secret boundaries, and next actions clearly.

This is the same direction as a coding agent workbench: the system should help users build software, prepare runnable tasks, execute only inside governed sandbox boundaries, and attach evidence before claiming completion. In every locale, the default mental model is "Japanese-led AI cabinet that can program under governance," not a generic chat interface.

## Implementation Contract

- New visible UI copy should be routed through `src/i18n.ts`.
- Japanese copy should be written first, then mirrored to English, Simplified Chinese, Traditional Chinese, and Korean.
- Security and release-gate terms must stay precise across languages: `dry-run`, production evidence, session-only secrets, approval, blocker, warning, and verifier decisions cannot be softened.
- Exported JSON schemas remain language-neutral. Locale affects UI labels and operator-facing summaries, not machine contract keys.
- CLI output may stay English until the UI locale foundation is complete; release evidence files must remain stable for automation.

## Current Coverage

The current foundation covers the top operator shell, language selector, mission header, Release Rehearsal / Release Verification panel, Coding Agent Briefs panel, Coding Agent Brief Review controls/results, Coding Agent Session Bundle controls/results, Coding Agent Session Drill controls/results, Coding Agent Session Receipt template/import/review results, Coding Agent Implementation Evidence downloads, local artifact audit status, artifact fingerprint audit metadata including unique versus repeated references and reused transcript counts, and Development Board reconciliation status after evidence import. Older panels still contain English strings and should be migrated incrementally without changing their data contracts.

## Completion Gate

Before a production-language release, the workbench should pass:

- All primary operator panels use `src/i18n.ts` or a compatible locale module.
- Japanese is the default on a clean browser profile.
- Locale switching does not reset workspace state, run state, or session-only secrets.
- Desktop and mobile screenshots show no text overlap in all five locales.
- Release verification wording remains explicit about dry-run versus production evidence in every locale.
