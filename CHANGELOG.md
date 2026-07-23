# Changelog

All notable public-source changes are tracked here. This project uses a source-available noncommercial license with separate commercial licensing controlled by 合同会社EMYSTI.

## Unreleased

### Added

- First-party `naikaku` CLI binary with read-only local readiness checks plus fixed `start`, `gateway`, `task`, and `verify` entrypoints. The CLI does not accept provider keys or arbitrary shell commands.
- Fixed local-runner templates and readiness detection for Codex CLI, Claude Code, and Qwen Code; Qwen Code can use the operator's locally authenticated Alibaba Cloud Coding Plan without exposing that credential to the browser.
- Self-host preview deployment path with `Dockerfile`, `compose.yaml`, and `.dockerignore`.
- Runtime frontend gateway configuration through `/naikaku-config.js`, so hosted builds can change gateway URL without rebuilding source.
- `npm run deployment:check` for deployment, environment, commercial-boundary, and public-source safety checks.
- English and Japanese deployment guides.
- Commercial deployment checklist for customer or hosted evaluations.
- Role-level data access policies for public/internal/confidential/secret/personal/customer data boundaries.
- Five-iteration strategy alignment report and ADR for Japan-led positioning, governance, deployment, contribution, and release-evidence checks.

### Changed

- The first-party CLI now has a Japanese-first terminal presentation for help, task guidance, and local readiness, with support for all five product locales and optional TTY-only color.
- The Japanese-first quick start now exposes a direct local Coding CLI path and opens a local runner readiness check instead of requiring API configuration for coding work.
- `ci:open-source` now includes deployment readiness checks.
- README and Japanese README now expose deployment and commercial-readiness entry points.
- `ci:open-source` now runs the strategy iteration report before MVP and test checks.
- Provider configuration checks now distinguish gateway configuration from a real model call; offline structural checks remain unchecked instead of becoming false-ready.
- Live cabinet runs now withhold deterministic dry-run text when a provider is skipped or fails, revise the cabinet decision, and block downstream automation for those stages.
- The Provider Configuration panel now explains the session-key versus local-gateway-environment boundary in Japanese, English, Simplified Chinese, Traditional Chinese, and Korean.

### Security

- Compose preview keeps provider keys and runner credentials as operator-owned environment variables.
- Docker runtime runs as a non-root `naikaku` user and includes gateway/web health checks.
- Public-source checks continue to reject private deployment paths, `.env` files, key material, and generated output.

## 0.1.0 - 2026-06-29

### Added

- Public-source developer preview of Naikaku AI Togo System.
- React/Vite workbench for cabinet roles, provider aliases, sandbox policy, audits, run logs, team handoff, and local evidence review.
- Local gateway for provider tests, dry-run/live cabinet runs, runner contracts, approval/evidence ledgers, coding-agent packages, and engineering smoke paths.
- macOS developer preview package script.
- Public noncommercial license and separate commercial licensing notice.
