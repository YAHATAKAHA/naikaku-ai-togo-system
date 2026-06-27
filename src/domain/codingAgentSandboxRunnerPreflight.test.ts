import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "./codingAgentRunnerSelfTest";
import {
  buildCodingAgentSandboxRunnerPreflight,
  serializeCodingAgentSandboxRunnerPreflight,
  serializeCodingAgentSandboxRunnerPreflightMarkdown
} from "./codingAgentSandboxRunnerPreflight";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent sandbox runner preflight", () => {
  it("marks ready self-tests as executable only for allowlisted local commands", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({
      selfTest,
      bundle,
      generatedAt: selfTest.generatedAt
    });

    expect(preflight.schema).toBe("naikaku.coding-agent-sandbox-runner-preflight.v1");
    expect(preflight.decision).toBe("ready");
    expect(preflight.summary.readyTasks).toBe(selfTest.summary.wouldRun);
    expect(preflight.summary.blockedCommands).toBe(0);
    expect(preflight.summary.allowedCommands).toBe(selfTest.summary.pendingCommands);
    expect(preflight.summary.expectedProcessExecutions).toBe(2);
    expect(preflight.honestyClaim.claim).toContain("does not execute commands");
  });

  it("blocks runnable commands outside the allowlist before execution", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({
      selfTest,
      bundle,
      commandAllowlist: []
    });

    expect(preflight.decision).toBe("blocked");
    expect(preflight.summary.readyTasks).toBe(0);
    expect(preflight.summary.blockedCommands).toBe(selfTest.summary.pendingCommands);
    expect(preflight.summary.expectedProcessExecutions).toBe(0);
    expect(preflight.items.every((item) =>
      item.commands.every((command) => command.status === "blocked")
    )).toBe(true);
  });

  it("blocks mismatched self-test and bundle inputs", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const mismatchedBundle = {
      ...bundle,
      sessions: bundle.sessions.slice(1)
    };
    const preflight = buildCodingAgentSandboxRunnerPreflight({
      selfTest,
      bundle: mismatchedBundle
    });

    expect(preflight.decision).toBe("blocked");
    expect(preflight.summary.missingBundleSessions).toBe(1);
    expect(preflight.summary.blockedTasks).toBe(1);
  });

  it("serializes preflight JSON and Markdown", () => {
    const bundle = defaultBundle();
    const selfTest = defaultSelfTest(bundle);
    const preflight = buildCodingAgentSandboxRunnerPreflight({ selfTest, bundle });
    const parsed = JSON.parse(serializeCodingAgentSandboxRunnerPreflight(preflight));
    const markdown = serializeCodingAgentSandboxRunnerPreflightMarkdown(preflight);

    expect(parsed.schema).toBe("naikaku.coding-agent-sandbox-runner-preflight.v1");
    expect(markdown).toContain("Coding Agent Sandbox Runner Preflight");
    expect(markdown).toContain("Honesty Boundary");
  });
});

function defaultSelfTest(bundle: ReturnType<typeof defaultBundle>) {
  const dispatch = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle }),
    generatedAt: bundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest: dispatch,
    generatedAt: dispatch.generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: dispatch.generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest: dispatch,
    archiveAudit,
    generatedAt: dispatch.generatedAt
  });
  const manifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: draftPathsFor(simulation),
    generatedAt: simulation.generatedAt
  });
  return buildCodingAgentRunnerSelfTest({
    manifest,
    generatedAt: manifest.generatedAt
  });
}

function draftPathsFor(simulation: ReturnType<typeof buildCodingAgentDispatchSimulation>) {
  return Object.fromEntries(simulation.items.map((item, index) => [
    item.sessionId,
    `output/coding-agent-dispatch-simulation/valid/receipt-drafts/${String(index + 1).padStart(2, "0")}-${item.sessionId}.json`
  ]));
}

function defaultBundle() {
  const briefs = defaultBriefs();
  return buildCodingAgentSessionBundle({
    briefs,
    generatedAt: briefs.generatedAt
  });
}

function defaultBriefs() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  return buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
}
