# Open-Source Reference Notes

These projects inform Naikaku's direction. Naikaku should use mature open-source control software as optional adapters whenever possible, while keeping governance, approvals, receipts, evidence paths, and release gates in this repository.

Default integration policy:

- Prefer invoking upstream tools as user-installed CLI/API adapter processes.
- Keep the integration surface small: Naikaku writes adapter job JSON, then a thin bridge launches the configured CLI command and captures transcripts.
- Do not vendor third-party code until its license, notices, dependency obligations, and security posture are reviewed.
- Keep GPL/AGPL or unclear-license software outside the core package unless the project intentionally accepts those obligations.
- Every adapter must consume a scoped contract and return a receipt with logs, exit codes, artifacts, and stop reasons.
- Naikaku must not silently inherit host secrets, cookies, keychains, or full desktop permissions from any adapter.
- Track upstream license URLs and security notes in PRs that add adapters; never assume a dependency is safe because it is popular.

Naikaku's position is narrower and stricter than a general autonomous computer-use agent: it treats browser, desktop, shell, and MCP control as executor capabilities that must pass through cabinet roles, sandbox policy, operator-visible evidence, and local artifact fingerprints before work is accepted.

## Adapter-First Roadmap

| Capability | Preferred upstream adapter style | Naikaku-owned layer |
| --- | --- | --- |
| Repository coding | OpenHands/Codex-style coding agent, SWE-agent-style runner, or local CLI agent | Mission split, prompt contract, command allowlist, receipt review, artifact audit |
| Browser work | browser-use or Playwright runner | URL allowlist, isolated profile, screenshot/transcript evidence, external-send approval |
| Mac desktop actions | OpenClaw-style desktop loop, Hammerspoon automation, or E2B-style sandbox | Accessibility/Screen Recording approval, action contract, kill switch, redaction, receipt |
| MCP/tools | MCP server/tool runner | Tool allowlist, argument review, audit events, output evidence |
| External writes | gh/deploy/messaging adapters | Exact target/payload approval, rollback note, post-action receipt |

## License And Safety Notes

| Project | Current intended use | License posture to verify before integration | Safety note |
| --- | --- | --- | --- |
| OpenClaw | Optional desktop/control adapter | Verify upstream license and plugin/dependency notices before integration | Treat skills/plugins as untrusted; require allowlists and no host-secret access. |
| Hermes Agent | Reference for self-improving memory and terminal backends | Verify upstream license and dependency notices before integration | Use ideas or external process integration; do not mix memory persistence without review. |
| OpenHands | Preferred external coding-agent adapter candidate | MIT for open-source core; verify enterprise/dependency notices before vendoring | Run in scoped workspace/container and require receipts before accepting changes. |
| browser-use | Optional browser adapter | MIT license in upstream repository | Use isolated browser profiles and URL scopes; block payments/messages without approval. |
| Playwright | Deterministic browser execution engine | Apache-2.0 license in upstream repository | Safe as a test/evidence engine, but still constrain URLs and downloads. |
| Hammerspoon | Optional macOS automation adapter | MIT-style upstream license | Requires powerful macOS permissions; never enable globally by default. |

## OpenClaw

Repository: https://github.com/openclaw/openclaw

Useful ideas:

- Local-first gateway as the control plane.
- Multi-channel interfaces.
- Multi-agent routing into isolated workspaces and sessions.
- Skills and tools as extensible units.
- Live canvas style operator workspace.

Naikaku adaptation:

- Use OpenClaw-style desktop control as an optional governed adapter instead of rebuilding observe/click/type primitives.
- Keep gateway and routing ideas, but make cabinet roles explicit.
- Add sandbox policy and scoring as first-class product surfaces.
- Avoid direct host control by default; only pass scoped action contracts into the adapter.
- Keep operator language explicit in generated work packets so a Japan-first workbench can still hand tasks to multilingual coding agents without changing the evidence contract.

## Hermes Agent

Repository: https://github.com/nousresearch/hermes-agent

Useful ideas:

- Self-improving loop.
- Skill creation from experience.
- Searchable long-term memory.
- Scheduled automations.
- Isolated subagents and parallel workstreams.
- Multiple terminal backends.

Naikaku adaptation:

- Memory Secretary owns retention and learning.
- Cabinet scoring decides what becomes durable learning.
- Automations are tracked as reviewed cabinet decisions, not silent background actions.
- Terminal backends and subagents should plug in as runners that return receipts rather than getting implicit repository or desktop authority.

## OpenHands / OpenDevin-style Coding Agents

Repository: https://github.com/OpenHands/openhands

Useful ideas:

- Existing open-source coding-agent runtime for repository tasks.
- Container/workspace-oriented execution.
- Human-in-the-loop development workflows.
- Tool use, shell execution, and browser-oriented development loops.

Naikaku adaptation:

- Treat OpenHands-style agents as the default "real implementation" adapter candidate for coding work.
- Send reviewed coding briefs and runner invocation JSON instead of broad natural-language desktop instructions.
- Use CLI invocation as the first integration path, with command overrides when upstream packaging differs.
- Require the returned receipt to include changed files, command transcripts, evidence artifacts, and risk notes before Development Board updates.

## E2B Open Computer Use

Repository: https://github.com/e2b-dev/open-computer-use

Useful ideas:

- Secure desktop sandbox.
- Keyboard, mouse, and shell action space.
- Live display stream.
- User pause and intervention.
- Provider split between grounding, vision, and action models.

Naikaku adaptation:

- Treat computer use as an executor profile.
- Require sandbox identity, allowlist, logs, and approval gates.
- Allow the Sandbox Operator role to use model splits while the Safety Auditor controls policy.

## Browser Use

Repository: https://github.com/browser-use/browser-use

Useful ideas:

- Browser harness as a focused action environment.
- Recovery loops for web workflows.
- Structured browser automation as a reusable capability.

Naikaku adaptation:

- Browser Sandbox executor can integrate browser-use-like runners later.
- Domain allowlists and human approval remain mandatory for sensitive actions.

## Playwright

Repository: https://github.com/microsoft/playwright

Useful ideas:

- Stable browser automation across Chromium, Firefox, and WebKit.
- Screenshots, traces, selectors, and repeatable tests.
- A good low-level engine under browser-use-style AI workflows.

Naikaku adaptation:

- Use Playwright as a deterministic browser adapter for tests and evidence capture.
- Keep AI browsing decisions outside the Playwright layer; Naikaku should approve URLs, actions, and external writes first.

## Hammerspoon

Repository: https://github.com/Hammerspoon/hammerspoon

Useful ideas:

- Mature macOS automation via Lua and system accessibility hooks.
- Hotkeys, windows, app focus, clipboard, and event automation.

Naikaku adaptation:

- Use Hammerspoon as an optional Mac adapter for explicit, local, approved actions.
- Never allow broad host automation by default; require bundle id/action scope, kill switch, and action log.

## LangGraph, CrewAI, AutoGen

Repositories:

- https://github.com/langchain-ai/langgraph
- https://github.com/crewAIInc/crewAI
- https://github.com/microsoft/autogen

Useful ideas:

- Graph-based orchestration.
- Role-playing multi-agent teams.
- Event-driven agent workflows.
- Debuggable multi-agent state.

Naikaku adaptation:

- Cabinet stages are a graph-ready domain model.
- The MVP uses deterministic local orchestration first.
- Production can move stage transitions to a graph engine without changing UI contracts.

## OpenAI Computer Use Guidance

Docs: https://developers.openai.com/api/docs/guides/tools-computer-use

Useful ideas:

- Run browser or desktop automation in isolated environments.
- Avoid inheriting host environment variables.
- Maintain allowlists.
- Keep humans in the loop for high-impact actions.
- Treat page content as untrusted input.

Naikaku adaptation:

- These safety ideas are encoded into the Sandbox Constitution panel and executor profiles.
