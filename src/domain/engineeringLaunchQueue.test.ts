import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { buildCodingAgentRunnerIntakeAudit } from "./codingAgentRunnerIntakeAudit";
import { buildCodingAgentRunnerInvocationPackage } from "./codingAgentRunnerInvocation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import { buildCodingAgentRunnerSelfTest } from "./codingAgentRunnerSelfTest";
import { buildCodingAgentSandboxRunnerPreflight } from "./codingAgentSandboxRunnerPreflight";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import {
  buildEngineeringLaunchQueue,
  serializeEngineeringLaunchQueue,
  serializeEngineeringLaunchQueueMarkdown
} from "./engineeringLaunchQueue";
import { buildTeamHandoff } from "./teamPackages";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("engineering launch queue", () => {
  it("turns prepared runner contracts into a local engineering launch queue", () => {
    const chain = preparedRunnerChain();
    const queue = buildEngineeringLaunchQueue(chain);

    expect(queue.schema).toBe("naikaku.engineering-launch-queue.v1");
    expect(queue.decision).toBe("preflight-ready");
    expect(queue.canHandToCodingAgent).toBe(true);
    expect(queue.canRunLocalVerification).toBe(true);
    expect(queue.canClaimCompletion).toBe(false);
    expect(queue.summary.readyToRun).toBe(chain.runnerManifest.summary.readyTasks);
    expect(queue.summary.allowedCommands).toBe(chain.sandboxRunnerPreflight.summary.allowedCommands);
    expect(queue.summary.invocationFiles).toBe(chain.runnerInvocation.summary.invocationFiles);
    expect(queue.items[0]).toMatchObject({
      status: "ready-to-run",
      invocationPath: expect.stringContaining("invocations/")
    });
    expect(queue.items[0].commands[0]).toMatchObject({
      status: "allowed",
      transcriptRef: expect.stringContaining("transcript-")
    });
    expect(queue.honestyClaim.claim).toContain("does not execute implementation work");
  });

  it("keeps manifest-only work held instead of pretending it is runnable", () => {
    const chain = preparedRunnerChain();
    const queue = buildEngineeringLaunchQueue({
      runnerManifest: chain.runnerManifest,
      generatedAt: chain.runnerManifest.generatedAt
    });

    expect(queue.decision).toBe("needs-review");
    expect(queue.canHandToCodingAgent).toBe(false);
    expect(queue.canRunLocalVerification).toBe(false);
    expect(queue.summary.held).toBe(chain.runnerManifest.items.length);
    expect(queue.summary.readyToRun).toBe(0);
    expect(queue.summary.allowedCommands).toBe(0);
    expect(queue.items[0].status).toBe("held");
    expect(queue.items[0].blockers.join(" ")).toContain("Invocation package has not been prepared");
  });

  it("serializes JSON and Markdown for runner handoff", () => {
    const queue = buildEngineeringLaunchQueue(preparedRunnerChain());
    const parsed = JSON.parse(serializeEngineeringLaunchQueue(queue));
    const markdown = serializeEngineeringLaunchQueueMarkdown(queue);

    expect(parsed.schema).toBe("naikaku.engineering-launch-queue.v1");
    expect(markdown).toContain("Engineering Launch Queue");
    expect(markdown).toContain("Operator Checklist");
    expect(markdown).toContain("Can claim completion: no");
  });
});

function preparedRunnerChain() {
  const briefs = defaultBriefs();
  const sessionBundle = buildCodingAgentSessionBundle({
    briefs,
    generatedAt: briefs.generatedAt
  });
  const drill = buildCodingAgentSessionDrill({
    bundle: sessionBundle,
    generatedAt: sessionBundle.generatedAt
  });
  const manifest = buildCodingAgentDispatchManifest({
    bundle: sessionBundle,
    drill,
    generatedAt: sessionBundle.generatedAt
  });
  const archive = buildCodingAgentDispatchArchive({
    bundle: sessionBundle,
    manifest,
    generatedAt: manifest.generatedAt
  });
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: manifest.generatedAt
  });
  const simulation = buildCodingAgentDispatchSimulation({
    manifest,
    archiveAudit,
    generatedAt: manifest.generatedAt
  });
  const runnerManifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: Object.fromEntries(simulation.items.map((item, index) => [
      item.sessionId,
      `output/coding-agent-dispatch-simulation/valid/receipt-drafts/${String(index + 1).padStart(2, "0")}-${item.sessionId}.json`
    ])),
    generatedAt: simulation.generatedAt
  });
  const runnerInvocation = buildCodingAgentRunnerInvocationPackage({
    manifest: runnerManifest,
    invocationBasePath: "output/coding-agent-runner-invocation/valid/invocations",
    generatedAt: runnerManifest.generatedAt
  });
  const runnerIntake = buildCodingAgentRunnerIntakeAudit({
    invocationPackage: runnerInvocation,
    sandboxPolicy: defaultSandboxPolicy,
    generatedAt: runnerInvocation.generatedAt
  });
  const runnerSelfTest = buildCodingAgentRunnerSelfTest({
    manifest: runnerManifest,
    generatedAt: runnerManifest.generatedAt
  });
  const sandboxRunnerPreflight = buildCodingAgentSandboxRunnerPreflight({
    selfTest: runnerSelfTest,
    bundle: sessionBundle,
    sandboxPolicy: defaultSandboxPolicy,
    generatedAt: runnerSelfTest.generatedAt
  });

  return {
    runnerManifest,
    runnerInvocation,
    runnerIntake,
    runnerSelfTest,
    sandboxRunnerPreflight,
    generatedAt: sandboxRunnerPreflight.generatedAt
  };
}

function defaultBriefs() {
  const handoff = buildTeamHandoff({ workspace });
  const board = buildDevelopmentBoard({ handoff });
  return buildCodingAgentBriefs({ board, generatedAt: board.generatedAt });
}
