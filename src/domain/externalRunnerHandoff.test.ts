import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { buildCodingAgentRunnerInvocationPackage } from "./codingAgentRunnerInvocation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildExternalRunnerAdapterRegistry } from "./externalRunnerAdapters";
import {
  buildExternalRunnerAdapterJob,
  buildExternalRunnerHandoff,
  serializeExternalRunnerAdapterJob,
  serializeExternalRunnerHandoff,
  serializeExternalRunnerHandoffMarkdown,
  serializeExternalRunnerHandoffTaskMarkdown
} from "./externalRunnerHandoff";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("external runner handoff", () => {
  it("creates review-only OpenHands tasks until license, install, and approval gates are satisfied", () => {
    const handoff = buildExternalRunnerHandoff({
      adapterRegistry: buildExternalRunnerAdapterRegistry({
        generatedAt: "2026-06-27T00:00:00.000Z"
      }),
      runnerInvocation: defaultRunnerInvocation(),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(handoff.schema).toBe("naikaku.external-runner-handoff.v1");
    expect(handoff.adapter?.id).toBe("openhands-coding-agent");
    expect(handoff.decision).toBe("needs-license-review");
    expect(handoff.canStartExternalRunner).toBe(false);
    expect(handoff.summary.handoffTaskFiles).toBeGreaterThan(0);
    expect(handoff.summary.adapterJobFiles).toBe(handoff.summary.handoffTaskFiles);
    expect(handoff.summary.reviewOnlyTaskFiles).toBe(handoff.summary.handoffTaskFiles);
    expect(handoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "adapter-license-review-required" })
    ]));
    expect(handoff.tasks.every((task) => task.status === "review-only")).toBe(true);
  });

  it("marks OpenHands handoff startable only after upstream review, install, and approval are recorded", () => {
    const handoff = buildExternalRunnerHandoff({
      adapterRegistry: buildExternalRunnerAdapterRegistry({
        installedAdapterIds: ["openhands-coding-agent"],
        licenseReviewedAdapterIds: ["openhands-coding-agent"],
        approvedAdapterIds: ["openhands-coding-agent"],
        generatedAt: "2026-06-27T00:00:00.000Z"
      }),
      runnerInvocation: defaultRunnerInvocation(),
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(handoff.adapter?.status).toBe("contract-ready");
    expect(handoff.decision).toBe("handoff-ready");
    expect(handoff.canStartExternalRunner).toBe(true);
    expect(handoff.summary.readyTaskFiles).toBe(handoff.summary.handoffTaskFiles);
    expect(handoff.tasks[0].adapterInstructions.join(" ")).toContain("Run OpenHands");

    const job = buildExternalRunnerAdapterJob({
      handoff,
      task: handoff.tasks[0]
    });
    expect(job.schema).toBe("naikaku.external-runner-adapter-job.v1");
    expect(job.executable).toBe(true);
    expect(job.commandPlan).toMatchObject({
      command: "openhands",
      args: ["--always-approve", "-f", handoff.tasks[0].taskPath]
    });
  });

  it("blocks desktop adapters from consuming repository coding invocation packages", () => {
    const handoff = buildExternalRunnerHandoff({
      adapterRegistry: buildExternalRunnerAdapterRegistry({
        installedAdapterIds: ["openclaw-desktop-runner"],
        licenseReviewedAdapterIds: ["openclaw-desktop-runner"],
        approvedAdapterIds: ["openclaw-desktop-runner"],
        generatedAt: "2026-06-27T00:00:00.000Z"
      }),
      runnerInvocation: defaultRunnerInvocation(),
      adapterId: "openclaw-desktop-runner",
      generatedAt: "2026-06-27T00:00:00.000Z"
    });

    expect(handoff.decision).toBe("blocked");
    expect(handoff.canStartExternalRunner).toBe(false);
    expect(handoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "adapter-not-compatible-with-coding-invocation" })
    ]));
    expect(handoff.summary.handoffTaskFiles).toBe(0);
  });

  it("serializes handoff JSON, package Markdown, and task Markdown", () => {
    const handoff = buildExternalRunnerHandoff({
      adapterRegistry: buildExternalRunnerAdapterRegistry(),
      runnerInvocation: defaultRunnerInvocation()
    });
    const parsed = JSON.parse(serializeExternalRunnerHandoff(handoff));
    const markdown = serializeExternalRunnerHandoffMarkdown(handoff);
    const jobJson = JSON.parse(serializeExternalRunnerAdapterJob(buildExternalRunnerAdapterJob({
      handoff,
      task: handoff.tasks[0]
    })));
    const taskMarkdown = serializeExternalRunnerHandoffTaskMarkdown({
      handoff,
      task: handoff.tasks[0]
    });

    expect(parsed.schema).toBe("naikaku.external-runner-handoff.v1");
    expect(jobJson.schema).toBe("naikaku.external-runner-adapter-job.v1");
    expect(markdown).toContain("External Runner Handoff");
    expect(markdown).toContain("Adapter job files");
    expect(markdown).toContain("Can start external runner: no");
    expect(taskMarkdown).toContain("Naikaku External Runner Task");
    expect(taskMarkdown).toContain("Return Contract");
  });
});

function defaultRunnerInvocation() {
  const simulation = defaultSimulation();
  const manifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: draftPathsFor(simulation),
    generatedAt: simulation.generatedAt
  });
  return buildCodingAgentRunnerInvocationPackage({
    manifest,
    invocationBasePath: "output/test-external-runner-handoff/invocations",
    generatedAt: manifest.generatedAt
  });
}

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
    `output/test-external-runner-handoff/receipt-drafts/${String(index + 1).padStart(2, "0")}-${item.sessionId}.json`
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
