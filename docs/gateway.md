# Local Gateway

The local gateway is a small JSON service for development. It gives backend and sandbox contributors a real target without giving the browser direct host control.

Start it with:

```bash
npm run gateway
```

Default URL:

```text
http://127.0.0.1:8787
```

Environment:

```bash
VITE_NAIKAKU_GATEWAY_URL=http://127.0.0.1:8787
NAIKAKU_GATEWAY_HOST=127.0.0.1
NAIKAKU_GATEWAY_PORT=8787
NAIKAKU_CORS_ORIGIN=http://127.0.0.1:5173
```

`VITE_NAIKAKU_GATEWAY_URL` is read by the browser app. The other values are read by the Node gateway.

## Endpoints

### `GET /health`

Returns service status and supported capabilities.

### `POST /v1/provider/test`

Validates a provider configuration structurally. It does not persist secrets.

```json
{
  "provider": {
    "provider": "openai",
    "endpoint": "https://api.openai.com/v1/responses",
    "model": "gpt-5.4",
    "apiKeyAlias": "NAIKAKU_OPENAI_API_KEY",
    "temperature": 0.3,
    "maxTokens": 1800
  },
  "sessionSecret": "optional-session-only-secret"
}
```

### `POST /v1/cabinet/run`

Runs the current deterministic cabinet orchestrator and returns artifacts, logs, scores, and next-iteration tasks.

```json
{
  "mission": "Build a sandbox-first cabinet automation system"
}
```

### `POST /v1/sandbox/check`

Checks whether a proposed action is allowed inside the current sandbox policy.

```json
{
  "request": {
    "executorProfileId": "browser-sandbox",
    "action": "open_url",
    "target": "https://github.com/YAHATAKAHA/naikaku-ai-togo-system",
    "risk": "low"
  }
}
```

## Production Notes

The gateway is intentionally conservative:

- It does not run shell commands.
- It does not operate the host desktop.
- It does not persist raw secrets.
- It checks blocked actions and network allowlists before sandbox work.

Production work should add authentication, durable audit storage, real provider adapters, and executor backends.
