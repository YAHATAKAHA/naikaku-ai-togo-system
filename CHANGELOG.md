# Changelog

All notable public-source changes are tracked here. This project uses a source-available noncommercial license with separate commercial licensing controlled by 合同会社EMYSTI.

## Unreleased

### Added

- Self-host preview deployment path with `Dockerfile`, `compose.yaml`, and `.dockerignore`.
- Runtime frontend gateway configuration through `/naikaku-config.js`, so hosted builds can change gateway URL without rebuilding source.
- `npm run deployment:check` for deployment, environment, commercial-boundary, and public-source safety checks.
- English and Japanese deployment guides.
- Commercial deployment checklist for customer or hosted evaluations.
- Role-level data access policies for public/internal/confidential/secret/personal/customer data boundaries.

### Changed

- `ci:open-source` now includes deployment readiness checks.
- README and Japanese README now expose deployment and commercial-readiness entry points.

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
