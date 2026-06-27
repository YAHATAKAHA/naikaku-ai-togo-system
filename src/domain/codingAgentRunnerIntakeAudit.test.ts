import { describe, expect, it } from "vitest";
import { defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildCodingAgentBriefs } from "./codingAgentBriefs";
import { buildCodingAgentDispatchArchive } from "./codingAgentDispatchArchive";
import { auditCodingAgentDispatchArchive } from "./codingAgentDispatchArchiveAudit";
import { buildCodingAgentDispatchManifest } from "./codingAgentDispatchManifest";
import { buildCodingAgentDispatchSimulation } from "./codingAgentDispatchSimulation";
import { buildCodingAgentRunnerIntakeAudit, serializeCodingAgentRunnerIntakeAuditMarkdown } from "./codingAgentRunnerIntakeAudit";
import { buildCodingAgentRunnerInvocationPackage } from "./codingAgentRunnerInvocation";
import { buildCodingAgentRunnerManifest } from "./codingAgentRunnerManifest";
import { buildCodingAgentSessionBundle } from "./codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./codingAgentSessionDrill";
import { buildDevelopmentBoard } from "./developmentBoard";
import { buildTeamHandoff } from "./teamPackages";
import type { CodingAgentRunnerInvocationPackage } from "./types";

const workspace = {
  mission: "Build a sandbox-first multi-model AI cabinet",
  roles: defaultRoles,
  sandboxPolicy: defaultSandboxPolicy
};

describe("coding agent runner intake audit", () => {
  it("accepts package-ready invocations for governed runner handoff without execution claims", () => {
    const invocationPackage = defaultInvocationPackage();
    const audit = buildCodingAgentRunnerIntakeAudit({
      invocationPackage,
      generatedAt: invocationPackage.generatedAt
    });

    expect(audit.schema).toBe("naikaku.coding-agent-runner-intake-audit.v1");
    expect(audit.decision).toBe("accepted-for-runner");
    expect(audit.sourceDecision).toBe("package-ready");
    expect(audit.summary.acceptedIntakes).toBe(invocationPackage.summary.readyInvocations);
    expect(audit.summary.invocationFiles).toBe(invocationPackage.summary.invocationFiles);
    expect(audit.summary.commandContracts).toBe(invocationPackage.summary.commandContracts);
    expect(audit.summary.completedCommandResults).toBe(0);
    expect(audit.summary.sourceBlockedChecks).toBe(0);
    expect(audit.summary.unsafePaths).toBe(0);
    expect(audit.summary.blockedSecurityClassifications).toBe(0);
    expect(audit.items.every((item) => item.intakeStatus === "accepted-for-runner")).toBe(true);
    expect(serializeCodingAgentRunnerIntakeAuditMarkdown(audit)).toContain("Coding Agent Runner Intake Audit");
    expect(audit.honestyClaim.limitations.join(" ")).toContain("does not read prompt file contents");
  });

  it("keeps production-held invocation packages visible but not accepted", () => {
    const bundle = buildCodingAgentSessionBundle({
      briefs: defaultBriefs(),
      requireProductionEvidence: true
    });
    const manifest = buildCodingAgentDispatchManifest({
      bundle,
      drill: buildCodingAgentSessionDrill({ bundle })
    });
    const archive = buildCodingAgentDispatchArchive({ bundle, manifest });
    const archiveAudit = auditCodingAgentDispatchArchive({ archive });
    const simulation = buildCodingAgentDispatchSimulation({ manifest, archiveAudit });
    const runnerManifest = buildCodingAgentRunnerManifest({ simulation });
    const invocationPackage = buildCodingAgentRunnerInvocationPackage({ manifest: runnerManifest });
    const audit = buildCodingAgentRunnerIntakeAudit({ invocationPackage });

    expect(invocationPackage.decision).toBe("needs-review");
    expect(audit.decision).toBe("needs-review");
    expect(audit.summary.acceptedIntakes).toBe(0);
    expect(audit.summary.heldIntakes).toBe(bundle.sessions.length);
    expect(audit.summary.invocationFiles).toBe(0);
    expect(audit.items.every((item) => item.invocationPath === null)).toBe(true);
  });

  it("blocks unsafe or overclaimed invocation packages before runner intake", () => {
    const invocationPackage = defaultInvocationPackage();
    const tampered = structuredClone(invocationPackage) as CodingAgentRunnerInvocationPackage;
    tampered.items[0].invocationPath = "../escape.json";
    (tampered.items[0].commands[0] as unknown as { exitCode: number | null }).exitCode = 0;

    const audit = buildCodingAgentRunnerIntakeAudit({ invocationPackage: tampered });
    const firstItem = audit.items[0];

    expect(audit.decision).toBe("blocked");
    expect(audit.summary.blockedIntakes).toBe(1);
    expect(audit.summary.completedCommandResults).toBe(1);
    expect(firstItem.intakeStatus).toBe("blocked");
    expect(firstItem.checks.find((check) => check.id === "invocation-file-path")?.status).toBe("block");
    expect(firstItem.checks.find((check) => check.id === "pending-command-contract")?.status).toBe("block");
    expect(firstItem.checks.find((check) => check.id === "no-real-execution")?.status).toBe("block");
  });

  it("blocks dangerous pending command contracts with the security classifier", () => {
    const invocationPackage = defaultInvocationPackage();
    const tampered = structuredClone(invocationPackage) as CodingAgentRunnerInvocationPackage;
    tampered.items[0].commands[0].command = "git push origin main";

    const audit = buildCodingAgentRunnerIntakeAudit({ invocationPackage: tampered });
    const firstItem = audit.items[0];

    expect(audit.decision).toBe("blocked");
    expect(audit.summary.blockedSecurityClassifications).toBe(1);
    expect(firstItem.intakeStatus).toBe("blocked");
    expect(firstItem.checks.find((check) => check.id === "security-classifier")?.status).toBe("block");
    expect(firstItem.checks.find((check) => check.id === "security-classifier")?.summary).toContain("blocked security");
  });
});

function defaultInvocationPackage() {
  const simulation = defaultSimulation();
  const manifest = buildCodingAgentRunnerManifest({
    simulation,
    receiptDraftPaths: draftPathsFor(simulation),
    generatedAt: simulation.generatedAt
  });
  return buildCodingAgentRunnerInvocationPackage({
    manifest,
    invocationBasePath: "output/test-runner-intake/valid/invocations",
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
  const archiveAudit = auditCodingAgentDispatchArchive({
    archive,
    generatedAt: manifest.generatedAt
  });
  return buildCodingAgentDispatchSimulation({
    manifest,
    archiveAudit,
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
