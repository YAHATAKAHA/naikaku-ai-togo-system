# API Adapter Guide

Every cabinet role can use a separate provider, endpoint, model, and API key alias. This is deliberate. The system should support a mixed cabinet such as OpenAI for planning, Anthropic for critique, OpenRouter for routing, local models for evaluation, and a custom computer-use gateway for sandbox actions.

## Frontend Contract

```ts
interface ProviderConfig {
  provider: ProviderKind;
  endpoint: string;
  model: string;
  apiKeyAlias: string;
  temperature: number;
  maxTokens: number;
}
```

The frontend accepts a session-only key for configuration checking but does not persist it. It does not enable a live cabinet run. Live code resolves `apiKeyAlias` in the local gateway process or through a local encrypted vault.

## Provider Readiness

The workbench includes an editable Provider Readiness matrix so each cabinet role can be configured and checked before a run:

- Operators can edit provider, endpoint, model, API key alias, and session-only configuration-check key for each role in one table.
- Static checks verify endpoint, model, and API key alias shape.
- A session-only key can be used for one configuration check and is not persisted; it never substitutes for the gateway environment variable used by `live` mode.
- `/v1/provider/test` validates provider configuration through the local gateway without calling the remote model API.
- If the gateway is offline, local fallback validates endpoint/model shape, marks the source as `local-fallback`, and remains `unchecked` rather than `ready`.
- Exports use `naikaku.provider-readiness.v1` and contain status metadata, not raw secrets.

## Adapter Contract

```ts
interface CabinetModelAdapter {
  id: string;
  label: string;
  matches(config: ProviderConfig): boolean;
  testConnection(config: ProviderConfig, sessionSecret?: string): Promise<boolean>;
  invoke(input: AdapterInvokeInput): Promise<AdapterInvokeResult>;
}
```

## Recommended Provider Split

| Role | Provider style | Notes |
| --- | --- | --- |
| Prime Minister | strong general reasoning | Needs reliable synthesis and instruction following. |
| Strategy Minister | long-context planner | Needs structured milestones and risk mapping. |
| Execution Minister | tool-aware model | Needs careful bounded actions. |
| Sandbox Operator | vision/action router | Can use a computer-use model or local grounding/action split. |
| Opposition Critic | adversarial reviewer | Should be different from the planner when possible. |
| Safety Auditor | conservative policy model | Should favor blocking uncertain high-impact actions. |
| Scoring Office | deterministic evaluator | Can start local and cheap, then escalate. |
| Memory Secretary | summarizer/embedding model | Needs retention policy and consent filters. |

## Backend Gateway Shape

```http
POST /v1/cabinet/invoke
{
  "roleId": "strategy-minister",
  "mission": "...",
  "context": [...],
  "provider": {
    "provider": "anthropic",
    "endpoint": "...",
    "model": "...",
    "apiKeyAlias": "NAIKAKU_ANTHROPIC_API_KEY"
  }
}
```

The gateway resolves the secret alias, calls the provider, strips provider-specific noise, and returns a normalized artifact.

## Implemented Gateway Adapters

The local gateway now includes server-side adapters for:

- OpenAI Responses API.
- Anthropic Messages API.
- OpenRouter / OpenAI-compatible chat completions.
- Gemini `generateContent`.
- Custom JSON endpoints.

Run mode matters:

- `dry-run`: deterministic local artifacts, no external provider calls.
- `live`: attempts provider calls through the gateway. Missing secrets or provider failures become `skipped` or `failed` provider statuses. Their artifacts contain an explicit no-output notice, the cabinet decision is revised, and downstream automation remains blocked.

Secret resolution rules:

- `apiKeyAlias` must be an environment variable name such as `NAIKAKU_OPENAI_API_KEY`.
- Raw-looking keys are rejected by the server adapter layer.
- Local/custom providers may run without a secret when their endpoint allows it.

## Do Not

- Do not persist raw keys in browser storage.
- Do not let a role choose arbitrary tools at runtime without policy evaluation.
- Do not expose host environment variables to browser or desktop sandboxes.
- Do not treat provider output as trusted instructions.
