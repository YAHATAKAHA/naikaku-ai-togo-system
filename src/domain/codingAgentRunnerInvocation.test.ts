import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import {
  buildCodingAgentRunnerInvocationFile,
  buildCodingAgentRunnerInvocationPackage,
  serializeCodingAgentRunnerInvocationFileMarkdown,
  serializeCodingAgentRunnerInvocationPackage,
  serializeCodingAgentRunnerInvocationPackageMarkdown
} from "./codingAgentRunnerInvocation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent runner invocation package", () => {
  it("turns runner-ready tasks into per-session invocation files without execution claims", () => {
    const simulation = defaultSimulation();
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths: draftPathsFor(simulation),
      generatedAt: simulation.generatedAt
    });
    const invocationPackage = buildCodingAgentRunnerInvocationPackage({
      manifest,
      invocationBasePath: "output/test-runner-invocation/valid/invocations",
      generatedAt: manifest.generatedAt
    });

    expect(invocationPackage.schema).toBe("naikaku.coding-agent-runner-invocation-package.v1");
    expect(invocationPackage.decision).toBe("package-ready");
    expect(invocationPackage.summary.readyInvocations).toBe(manifest.summary.readyTasks);
    expect(invocationPackage.summary.invocationFiles).toBe(manifest.summary.readyTasks);
    expect(invocationPackage.summary.commandContracts).toBe(manifest.summary.plannedCommands);
    expect(invocationPackage.summary.unsafePaths).toBe(0);
    expect(invocationPackage.items.every((item) => item.invocationStatus === "invocation-ready")).toBe(true);
    expect(invocationPackage.items[0].invocationPath).toContain("output/test-runner-invocation/valid/invocations/");
    expect(invocationPackage.items[0].commands[0]).toMatchObject({
      status: "pending-real-execution",
      exitCode: null
    });
    expect(invocationPackage.items[0].runnerInstructions.join(" ")).toContain("Return the completed receipt");

    const invocationFile = buildCodingAgentRunnerInvocationFile({
      invocationPackage,
      item: invocationPackage.items[0]
    });
    expect(invocationFile.schema).toBe("naikaku.coding-agent-runner-invocation.v1");
    expect(invocationFile.packageDecision).toBe("package-ready");
  });

  it("blocks invocation packaging when ready tasks are missing receipt draft paths", () => {
    const simulation = defaultSimulation();
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths: {}
    });
    const invocationPackage = buildCodingAgentRunnerInvocationPackage({ manifest });

    expect(manifest.decision).toBe("blocked");
    expect(invocationPackage.decision).toBe("blocked");
    expect(invocationPackage.summary.readyInvocations).toBe(0);
    expect(invocationPackage.summary.blockedInvocations).toBe(simulation.summary.readyForAgent);
    expect(invocationPackage.summary.invocationFiles).toBe(0);
  });

  it("keeps production-held tasks visible but without invocation files", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle })
    });
    const archive = buildCodingAgentDispatchArchive({ bundle, manifest });
    const audit = auditCodingAgentDispatchArchive({ archive });
    const simulation = buildCodingAgentDispatchSimulation({ manifest, archiveAudit: audit });
    const runnerManifest = buildCodingAgentRunnerManifest({ simulation });
    const invocationPackage = buildCodingAgentRunnerInvocationPackage({ manifest: runnerManifest });

    expect(invocationPackage.decision).toBe("needs-review");
    expect(invocationPackage.summary.readyInvocations).toBe(0);
    expect(invocationPackage.summary.heldInvocations).toBe(bundle.sessions.length);
    expect(invocationPackage.summary.invocationFiles).toBe(0);
    expect(invocationPackage.items.every((item) => item.invocationPath === null)).toBe(true);
  });

  it("serializes invocation package JSON and Markdown", () => {
    const simulation = defaultSimulation();
    const manifest = buildCodingAgentRunnerManifest({
      simulation,
      receiptDraftPaths: draftPathsFor(simulation)
    });
    const invocationPackage = buildCodingAgentRunnerInvocationPackage({ manifest });
    const invocationFile = buildCodingAgentRunnerInvocationFile({
      invocationPackage,
      item: invocationPackage.items[0]
    });
    const parsed = JSON.parse(serializeCodingAgentRunnerInvocationPackage(invocationPackage));
    const packageMarkdown = serializeCodingAgentRunnerInvocationPackageMarkdown(invocationPackage);
    const fileMarkdown = serializeCodingAgentRunnerInvocationFileMarkdown(invocationFile);

    expect(parsed.schema).toBe("naikaku.coding-agent-runner-invocation-package.v1");
    expect(packageMarkdown).toContain("Coding Agent Runner Invocation Package");
    expect(packageMarkdown).toContain("Pending Commands");
    expect(fileMarkdown).toContain("Coding Agent Runner Invocation");
    expect(fileMarkdown).toContain("Runner Instructions");
  });
});

function defaultSimulation() {
  const bundle = defaultBundle();
  const manifest = buildCodingAgentDispatchManifest({
    bundle,
    drill: buildCodingAgentSessionDrill({ bundle }),
    generatedAt: bundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle,
    manifest,
    generatedAt: manifest.generatedAt
  });
  const audit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: manifest.generatedAt
  });
  return buildCodingAgentDispatchSimulation({
    manifest,
    archiveAudit: audit,
    generatedAt: manifest.generatedAt
  });
}

function draftPathsFor(simulation: ReturnType<typeof defaultSimulation>) {
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
