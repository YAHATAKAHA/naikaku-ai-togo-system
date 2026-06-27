# Public Source Scope

This repository is for the Naikaku product source and public technical documentation only.

It must stay safe to clone, inspect, fork, package, and publish. Do not add private company material, deployment material, credentials, server state, customer data, or marketing-site source to this repository.

## Included

- Product application source code.
- Deterministic tests, local smoke drills, and fixture data.
- Public technical documentation, install notes, architecture notes, security boundaries, and contribution guides.
- Public examples that use placeholder values only.
- `.env.example` files that contain variable names, never real values.

## Excluded

- Website source for `emysti.net`, `naikaku.emysti.net`, or other marketing/product pages.
- Nginx, Certbot, cloud, DNS, SSH, deployment, server backup, or production configuration.
- AI knowledge-base files used by EMYSTI public chat services.
- API keys, tokens, cookies, private keys, `.pem`, `.key`, raw environment dumps, or local vault exports.
- Customer data, private logs, screenshots containing private information, or internal business notes.
- Paid-provider usage records, billing data, or private model prompts that are not meant for public release.
- Internal roadmaps, private backlog notes, unpublished strategy notes, or private deployment checklists.

## Release Rule

GitHub releases should be created from this repository after the excluded material above is absent. Release archives must not contain `site/`, `deploy/`, `infra/private/`, `.env`, keys, server configs, or generated `output/` artifacts.

## Leak Response

If private material is ever committed:

1. Stop release and deployment work.
2. Remove the file from the current tree.
3. Rotate any exposed credentials immediately.
4. Decide whether Git history and release assets must be rewritten.
5. Document the incident in a private maintainer channel, not in a public issue containing the secret.

## Maintainer Checklist

Before publishing:

- `git status --short` is clean.
- `git ls-files site deploy infra/private docs/internal docs/tasks` returns nothing.
- `git ls-files '*.pem' '*.key' '.env*'` shows only approved public examples.
- `npm run public-scope:check` passes.
- Secret scans report no raw keys, tokens, cookies, or production endpoints beyond public documentation links.
- `npm run build` and the public verification commands pass.
