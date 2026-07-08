# Deployment Guide

This repository supports self-hosted evaluation and commercial deployment preparation without including private EMYSTI server files, website source, credentials, or cloud configuration.

Commercial use, client delivery, paid hosting, SaaS operation, resale, or integration into a paid product requires separate written commercial license permission from 合同会社EMYSTI. See [COMMERCIAL-LICENSE.md](../COMMERCIAL-LICENSE.md).

## Deployment Modes

### Local Development

```bash
npm ci
npm run dev
npm run gateway
```

Use this mode while editing code, testing adapters, and reviewing runner evidence.

### Self-Hosted Preview

Build the frontend and run the gateway locally:

```bash
npm ci
NAIKAKU_PUBLIC_GATEWAY_URL=http://127.0.0.1:8787 npm run preview:self-host
npm run gateway
```

The frontend reads `/naikaku-config.js` at runtime. For static hosting, replace that file after build to point the browser to your gateway:

```bash
npm run build
NAIKAKU_PUBLIC_GATEWAY_URL=https://your-gateway.example.com npm run runtime-config
```

```js
window.NAIKAKU_CONFIG = {
  gatewayUrl: "https://your-gateway.example.com"
};
```

### Docker Compose Preview

```bash
cp .env.example .env
docker compose up --build
```

Default URLs:

- Workbench: <http://127.0.0.1:4173>
- Gateway health: <http://127.0.0.1:8787/health>

Important variables:

- `NAIKAKU_PUBLIC_GATEWAY_URL`: browser-facing gateway URL written into `dist/naikaku-config.js`.
- `VITE_NAIKAKU_GATEWAY_URL`: build-time fallback gateway URL.
- `NAIKAKU_CORS_ORIGIN`: comma-separated allowed web origins.
- `NAIKAKU_RUNNER_CREDENTIALS`: scoped runner credentials JSON for real runner services.
- `NAIKAKU_LEDGER_DIR`: approval/evidence ledger directory. In Compose this is `/data`.

Do not put real secrets into `.env.example`. Use an ignored `.env`, CI secrets, a vault, or the hosting provider's secret store.

## Production Boundary

The included Compose file is a self-hosted preview baseline. For a production commercial deployment:

- Serve `dist/` through your hardened static host, CDN, or reverse proxy.
- Run the gateway behind TLS and an authenticated network boundary.
- Configure scoped runner credentials with rotation and expiry.
- Store provider keys and runner credentials only in server-side secret storage.
- Move approval/evidence ledgers from local files to durable authenticated storage before customer operation.
- Keep Git push, deploy, purchases, external messages, desktop control, and customer-data access behind explicit approval gates.
- Run production-mode release verification before claiming production readiness.

## Release Package

The public release package is a macOS developer preview archive:

```bash
npm run release:mac-dev-package
```

The package command refuses to run when tracked files are dirty.

## Deployment Readiness Check

```bash
npm run deployment:check
```

This check validates:

- required deployment and commercial files;
- environment template completeness and blank secret placeholders;
- runtime gateway configuration;
- Docker/Compose deployment files;
- commercial license visibility;
- English and Japanese deployment docs;
- public-source scope safety.

For contributor CI, `npm run ci:open-source` includes `deployment:check`.
