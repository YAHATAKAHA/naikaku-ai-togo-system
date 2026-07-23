# Localization Strategy

Naikaku AI Togo is Japanese-first. Japanese is the default and primary operator language because the product is positioned for a Japan-led release, while English, Simplified Chinese, Traditional Chinese, and Korean are first-class supported locales.

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

This is the same direction as a coding agent workbench: the system should help users build software, prepare runnable tasks, execute only inside governed sandbox boundaries, and attach evidence before claiming completion. In every locale, the default mental model is "Japanese-led AI cabinet that can program under governance," not a generic chat interface. Localized copy must reinforce that the cabinet can think, program, operate approved sandbox tools, and audit itself as one governed loop. Computer-control capabilities inspired by Codex/OpenClaw-style runners belong behind this same contract: localized operator summaries may change, but command allowlists, security-classifier decisions, sandbox paths, receipts, and verification evidence stay stable.

## Implementation Contract

- New visible UI copy should be routed through `src/i18n.ts`.
- Japanese copy should be written first, then mirrored to English, Simplified Chinese, Traditional Chinese, and Korean.
- Coding-agent briefs and dispatch manifests must pass the selected operator locale through to implementation agents, and those agents should localize summaries, risks, and next actions while preserving commands, prompt paths, receipt-template paths, schema keys, and evidence artifact paths.
- Security and release-gate terms must stay precise across languages: `dry-run`, production evidence, session-only secrets, approval, blocker, warning, and verifier decisions cannot be softened.
- Exported JSON schemas remain language-neutral. Locale affects UI labels and operator-facing summaries, not machine contract keys.
- CLI output may stay English until the UI locale foundation is complete; release evidence files must remain stable for automation.
- `npm run localization:drill` must pass before release verification is treated as complete. It proves every supported locale can generate coding-agent briefs, review reports, session bundles, dispatch manifests, archive audits, dispatch simulations, runner manifests, runner invocation packages, runner intake audits, runner self-tests, sandbox runner preflights, assignment drills, and receipt templates while preserving machine contracts, including session sandbox contracts, pending receipt-draft semantics, runner task paths, runner invocation file paths, runner intake decisions, not-executed runner command semantics, and allowlisted sandbox-runner preflight semantics. The verification manifest records this drill alongside executor, sandbox capability, security red-team, production boundary, dispatch, dispatch simulation, runner manifest, runner invocation, runner intake, runner self-test, runner lease, sandbox runner, receipt, and release gates.

## Current Coverage

The current foundation covers the top operator shell, language selector, mission header, Provider Configuration panel, Release Rehearsal / Release Verification panel, Coding Agent Briefs panel, Coding Agent Brief Review controls/results, Coding Agent Session Bundle controls/results, structured session sandbox contracts, Coding Agent Dispatch Manifest / Archive / Archive Audit / Dispatch Simulation controls/results/downloads, Coding Agent Runner Manifest / Runner Invocation / Runner Intake / Runner Self-Test controls/downloads, Coding Agent Sandbox Runner preflight/controls/results/downloads, Coding Agent Session Drill controls/results, Coding Agent Session Receipt template/import/review results, Coding Agent Implementation Evidence downloads, local artifact audit status, artifact fingerprint audit metadata including unique versus repeated references, evidence-artifact counts, reused evidence-artifact counts, reused changed-file counts, reused transcript counts, and transcript content mismatch counts, and Development Board reconciliation status after evidence import. The Provider Configuration panel keeps the distinction between a session-only configuration check, a gateway environment alias, and a live provider call explicit in every supported UI locale. The localization drill now self-simulates the coding-agent handoff, archive audit, dispatch simulation, runner manifest, runner invocation package, runner intake audit, runner self-test, and sandbox runner preflight path across all five locales, while the dispatch simulation drill writes pending receipt draft files only for ready sessions and the sandbox runner drill keeps executable local command proof outside localized UI contracts. Older panels still contain English strings and should be migrated incrementally without changing their data contracts.

## Completion Gate

Before a production-language release, the workbench should pass:

- All primary operator panels use `src/i18n.ts` or a compatible locale module.
- Japanese is the default on a clean browser profile.
- Locale switching does not reset workspace state, run state, or session-only secrets.
- `npm run localization:drill` passes and writes a reviewed `naikaku.localization-drill.v1` summary with dispatch manifests, dispatch simulations, runner manifests, runner invocation packages, and runner intake audits for every supported locale.
- Desktop and mobile screenshots show no text overlap in all five locales.
- Release verification wording remains explicit about dry-run versus production evidence in every locale.
