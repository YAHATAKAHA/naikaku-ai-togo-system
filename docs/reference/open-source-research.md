# Open-Source Reference Notes

These projects inform Naikaku's direction. The repository does not copy their code; it uses them as product and architecture references.

Naikaku's position is narrower and stricter than a general autonomous computer-use agent: it treats browser, desktop, shell, and MCP control as executor capabilities that must pass through cabinet roles, sandbox policy, operator-visible evidence, and local artifact fingerprints before work is accepted.

## OpenClaw

Repository: https://github.com/openclaw/openclaw

Useful ideas:

- Local-first gateway as the control plane.
- Multi-channel interfaces.
- Multi-agent routing into isolated workspaces and sessions.
- Skills and tools as extensible units.
- Live canvas style operator workspace.

Naikaku adaptation:

- Keep gateway and routing ideas, but make cabinet roles explicit.
- Add sandbox policy and scoring as first-class product surfaces.
- Avoid direct host control by default.

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
