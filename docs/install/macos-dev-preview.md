# macOS Developer Preview

Naikaku does not yet ship as a signed `.dmg` or `.pkg`. The first public download is a macOS developer preview archive for people who are comfortable running a Node/Vite workbench locally.

## Download

Use the latest release from:

<https://github.com/YAHATAKAHA/naikaku-ai-togo-system/releases/latest>

Recommended asset:

- `naikaku-ai-togo-system-0.1.0-mac-dev-preview.tar.gz`

## Requirements

- macOS 14 or newer recommended
- Node.js 22 or newer
- npm
- Optional local runners: Codex CLI, Claude Code, OpenHands, OpenClaw-style tools, Hammerspoon, Playwright, or other command-line adapters

## Run Locally

```bash
tar -xzf naikaku-ai-togo-system-0.1.0-mac-dev-preview.tar.gz
cd naikaku-ai-togo-system-0.1.0-mac-dev-preview
npm ci
npm run dev
```

Open the local Vite URL printed in the terminal.

For the local gateway used by runner/API features, open another terminal:

```bash
npm run gateway
```

## Verify Without Paid Model Keys

```bash
npm run open-source:mvp-check
npm run test
```

The MVP check proves the local cabinet, guided runner loop, fixture coding loop, replay provider, receipt review, and artifact audit paths without using paid AI credentials.

## API Keys

Naikaku is designed for bring-your-own API keys. Users can configure provider/model/API-key aliases for OpenAI-compatible providers, OpenRouter, Anthropic, Aliyun DashScope/Qwen, Gemini, local endpoints, or a custom endpoint through the gateway.

Future EMYSTI API Gateway support can sit beside bring-your-own keys:

- Use my own API keys
- Use EMYSTI API Gateway

The public preview does not require the EMYSTI gateway.

## Native macOS App Roadmap

A signed Mac app should be a separate packaging layer over the same governed workbench:

1. Wrap the web workbench and local gateway with Electron, Tauri, or a native Swift/WebKit shell.
2. Add a menu-bar helper for gateway/runners.
3. Add first-run permission checks for shell runners, Hammerspoon, browser automation, and local folders.
4. Sign with an Apple Developer ID certificate.
5. Notarize and distribute a `.dmg`.
6. Add auto-update after the security model is stable.

Until those pieces exist, the release archive is intentionally labeled as a developer preview rather than a polished installer.
