# Commercial Deployment Checklist

This checklist is for commercial evaluation, client delivery planning, or hosted deployment preparation. It is not a commercial license. Commercial use requires separate written permission from 合同会社EMYSTI.

## Licensing

- [ ] Written commercial permission is in place before paid use, hosted access, resale, client delivery, or commercial integration.
- [ ] Product attribution and notices are preserved.
- [ ] Third-party runner adapters are reviewed for license compatibility before they are enabled for customers.
- [ ] GPL/AGPL or unclear-license tools stay outside the core deployment unless their obligations are explicitly accepted.

## Hosting Boundary

- [ ] Workbench static assets are served by a hardened static host, CDN, or reverse proxy.
- [ ] `/naikaku-config.js` points to the intended gateway URL for the environment.
- [ ] Gateway is behind TLS.
- [ ] Gateway is not exposed as an unauthenticated public control plane.
- [ ] `NAIKAKU_CORS_ORIGIN` allows only intended Workbench origins.
- [ ] Health checks are monitored.

## Secrets

- [ ] Provider keys are stored only in server-side secret storage.
- [ ] Runner credentials are scoped, rotated, and expire.
- [ ] `.env`, vault exports, API keys, private keys, cookies, and raw environment dumps are not committed.
- [ ] Browser state stores aliases only, not raw provider keys.
- [ ] Customer secrets are never included in issue templates, release artifacts, screenshots, or public logs.

## Data Governance

- [ ] Role data access policies are reviewed for every role.
- [ ] Secret, personal, and customer data stay blocked, local-only, or gateway-mediated as appropriate.
- [ ] External provider roles do not receive raw restricted data directly.
- [ ] Retained memory entries have consent and retention labels.
- [ ] Customer-data deletion and retention processes are documented before production use.

## Runner Operations

- [ ] Runner presets are fixed templates, not arbitrary shell commands from the browser.
- [ ] Real runner services authenticate to the gateway with scoped credentials.
- [ ] Shell, browser, desktop, MCP, Git push, deployment, external-send, purchase, and delete actions require policy checks.
- [ ] High-impact actions require exact target/payload approval.
- [ ] Runner evidence includes transcripts, screenshots, artifact manifests, approval records, or tool logs as appropriate.
- [ ] Completion claims require receipt review and artifact audit.

## Persistence and Audit

- [ ] Approval and evidence ledgers are durable and authenticated.
- [ ] Operator identity is attached to approvals and administrative actions.
- [ ] Audit logs are append-only or tamper-evident.
- [ ] Backups and restore procedure are tested.
- [ ] Logs avoid raw secrets and customer data.

## Verification

- [ ] `npm run deployment:check`
- [ ] `npm run public-scope:check`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run open-source:mvp-check`
- [ ] Production-mode release verification passes before production claims.

## Release

- [ ] `git status --short` is clean before packaging.
- [ ] Release notes distinguish dry-run, fixture, preview, and production evidence.
- [ ] Public release archives exclude `output/`, `.env`, private deployment files, website source, credentials, and customer data.
- [ ] Commercial customers receive deployment, operations, and security boundary documentation.
