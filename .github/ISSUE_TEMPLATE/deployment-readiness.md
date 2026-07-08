---
name: Deployment readiness
about: Prepare or review self-hosted, commercial, or customer deployment readiness
title: "[deployment] "
labels: deployment, commercial, operations
---

## Deployment mode

- [ ] Local evaluation
- [ ] Docker Compose preview
- [ ] Static Workbench plus hosted gateway
- [ ] Customer / commercial deployment

## Environment

- Workbench URL:
- Gateway URL:
- Runtime config source: `/naikaku-config.js` / build env / other
- Runner mode: none / fixture / shell / browser / desktop / MCP / custom

## Commercial boundary

- [ ] Noncommercial evaluation only
- [ ] Commercial permission required before use
- [ ] Commercial permission already confirmed outside this issue

## Readiness evidence

- [ ] `npm run deployment:check`
- [ ] `npm run public-scope:check`
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run open-source:mvp-check`

## Secrets and data

- [ ] No raw API keys, runner tokens, cookies, private logs, or customer data are included here
- [ ] Provider keys are stored server-side only
- [ ] Runner credentials are scoped
- [ ] Role data access policies were reviewed

## Notes
