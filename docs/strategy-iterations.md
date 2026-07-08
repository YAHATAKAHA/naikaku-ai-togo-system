# Strategy Iterations

Naikaku's public-source direction is checked through five repeatable strategy iterations. The goal is to keep the project aligned with the original product thesis while it becomes easier to deploy, evaluate, commercialize, and contribute to.

Run the report:

```bash
npm run strategy:iterate
```

Outputs:

- `output/strategy-iterations/strategy-iterations.json`
- `output/strategy-iterations/strategy-iterations.md`

## Iteration 1: Japan-Led Enterprise Positioning

Naikaku should remain a Japan-built, Japanese-first AI cabinet workbench for cautious enterprise automation, not a generic autonomous-agent wrapper.

Evidence checked:

- English README states Japan-built positioning.
- Japanese README states Japanese-origin positioning.
- Architecture documentation keeps the Japanese-led cabinet direction explicit.
- Localization docs preserve Japanese-first operation.

## Iteration 2: Role-Based Data Governance

Enterprise credibility depends on role-level data boundaries. Planning, execution, supervision, scoring, and memory roles should not all receive the same raw context.

Evidence checked:

- `RoleDataAccessMatrix` exists.
- Product readiness includes a `data-governance` gate.
- Role Inspector exposes data access controls.
- Security docs describe role data classification policy.

## Iteration 3: Deployment and Commercial Readiness

The repository should be safe for self-hosted preview and serious commercial evaluation while keeping commercial use behind written EMYSTI permission.

Evidence checked:

- Dockerfile and Compose preview topology exist.
- `deployment:check` exists.
- English and Japanese deployment docs explain the commercial boundary.
- Commercial license summary names 合同会社EMYSTI.

## Iteration 4: Professional Open-Source Git Surface

The GitHub repository should make contribution and review paths obvious while protecting private deployment material, customer data, and credentials.

Evidence checked:

- Changelog.
- Contribution guide.
- Pull request template.
- Deployment readiness issue template.
- Public source scope policy.
- ADR index and strategy gate ADR.

## Iteration 5: Verification and Release Evidence

Every release should distinguish dry-run, fixture, preview, and production evidence. Passing fixture drills must not be presented as production readiness.

Evidence checked:

- `ci:open-source`.
- `open-source:mvp-check`.
- `release:verify`.
- `release:mac-dev-package`.
- Strategy iteration guide.
- Security docs preserve the dry-run versus production boundary.
- Release notes include verification evidence.

## Current Expected Result

The current public-source state should report:

```text
Decision: aligned
Iterations: 5/5 pass
```

If an iteration fails, fix the missing evidence rather than weakening the check. The report is intended to keep the repository aligned with Naikaku's product thesis as new contributors add providers, runner adapters, deployment paths, and enterprise features.
