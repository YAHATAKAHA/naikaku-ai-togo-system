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

The frontend accepts a session secret for testing but does not persist it. Production code should resolve `apiKeyAlias` server-side or through a local encrypted vault.

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

## Do Not

- Do not persist raw keys in browser storage.
- Do not let a role choose arbitrary tools at runtime without policy evaluation.
- Do not expose host environment variables to browser or desktop sandboxes.
- Do not treat provider output as trusted instructions.
