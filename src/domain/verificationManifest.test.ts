import { describe, expect, it } from "vitest";
import {
  buildVerificationManifest,
  serializeVerificationManifest
} from "./verificationManifest";
import type {
  CodingAgentDispatchDrillSummary,
  CodingAgentDispatchSimulationSummary,
  CodingAgentReceiptDrillSummary,
  CodingAgentRunnerManifestDrillSummary,
  CodingAgentRunnerSelfTestDrillSummary,
  ExecutorContractDrillSummary,
  LocalizationDrillSummary,
  ProductionBoundaryDrillSummary,
  ReleaseVerificationReport
} from "./types";

const inputs = {
  codingAgentDispatchDrill: "output/coding-agent-dispatch-drill/summary.json",
  codingAgentDispatchSimulation: "output/coding-agent-dispatch-simulation/summary.json",
  codingAgentRunnerManifest: "output/coding-agent-runner-manifest/summary.json",
  codingAgentRunnerSelfTest: "output/coding-agent-runner-self-test/summary.json",
  codingAgentReceiptDrill: "output/coding-agent-receipt-drill/summary.json",
  localizationDrill: "output/localization-drill/summary.json",
  executorContractDrill: "output/executor-contract-drill/summary.json",
  productionBoundaryDrill: "output/verification/production-boundary-latest.json",
  releaseVerification: "output/rehearsal-drill/release-verification-latest.json"
};

describe("verification manifest", () => {
  it("aggregates passing local drill and release verification gates", () => {
    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });

    expect(manifest.schema).toBe("naikaku.verification-manifest.v1");
    expect(manifest.decision).toBe("verified");
    expect(manifest.summary).toEqual({
      total: 12,
      passed: 12,
      failed: 0
    });
    expect(manifest.checks.map((check) => check.id)).toEqual([
      "coding-agent-dispatch-drill",
      "coding-agent-dispatch-simulation",
      "coding-agent-runner-manifest",
      "coding-agent-runner-self-test",
      "coding-agent-valid-receipt",
      "coding-agent-mismatched-receipt",
      "coding-agent-out-of-scope-receipt",
      "localization-drill",
      "executor-contract-drill",
      "release-verification",
      "dry-run-boundary",
      "production-boundary-drill"
    ]);
    expect(manifest.source.localizationLocales).toEqual(["ja", "en", "zh-Hans", "zh-Hant", "ko"]);
    expect(manifest.source.codingAgentDispatchGeneratedAt).toBe("2026-06-27T00:01:00.000Z");
    expect(manifest.source.codingAgentDispatchSimulationGeneratedAt).toBe("2026-06-27T00:02:00.000Z");
    expect(manifest.source.codingAgentRunnerManifestGeneratedAt).toBe("2026-06-27T00:03:00.000Z");
    expect(manifest.source.codingAgentRunnerSelfTestGeneratedAt).toBe("2026-06-27T00:04:00.000Z");
    expect(manifest.source.executorProfiles).toContain("desktop-vm");
    expect(manifest.source.productionBoundaryExitCode).toBe(4);
    expect(serializeVerificationManifest(manifest)).toContain("naikaku.verification-manifest.v1");
  });

  it("invalidates the manifest when mismatched coding-agent evidence updates the board", () => {
    const codingAgentReport = codingAgentReportFixture();
    codingAgentReport.mismatched.boardItemsApplied = 1;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport,
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const mismatchCheck = manifest.checks.find((check) => check.id === "coding-agent-mismatched-receipt");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(mismatchCheck?.status).toBe("fail");
    expect(mismatchCheck?.summary).toContain("not blocked correctly");
  });

  it("invalidates the manifest when production-held coding-agent dispatch writes prompts", () => {
    const codingAgentDispatchDrill = codingAgentDispatchFixture();
    codingAgentDispatchDrill.productionHeld.promptFilesWritten = 1;
    codingAgentDispatchDrill.checks.productionHeldNotWritten = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill,
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const dispatchCheck = manifest.checks.find((check) => check.id === "coding-agent-dispatch-drill");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(dispatchCheck?.status).toBe("fail");
    expect(dispatchCheck?.summary).toContain("did not preserve");
  });

  it("invalidates the manifest when production-held dispatch simulation creates receipt drafts", () => {
    const codingAgentDispatchSimulation = codingAgentDispatchSimulationFixture();
    codingAgentDispatchSimulation.productionHeld.receiptDraftItems = 1;
    codingAgentDispatchSimulation.checks.productionHeldNoReceiptDrafts = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation,
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const simulationCheck = manifest.checks.find((check) => check.id === "coding-agent-dispatch-simulation");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(simulationCheck?.status).toBe("fail");
    expect(simulationCheck?.summary).toContain("did not preserve");
  });

  it("invalidates the manifest when dispatch simulation receipt draft files are missing", () => {
    const codingAgentDispatchSimulation = codingAgentDispatchSimulationFixture();
    codingAgentDispatchSimulation.simulation.receiptDraftFilesWritten = 7;
    codingAgentDispatchSimulation.checks.receiptDraftFilesWritten = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation,
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const simulationCheck = manifest.checks.find((check) => check.id === "coding-agent-dispatch-simulation");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(simulationCheck?.status).toBe("fail");
    expect(simulationCheck?.evidence).toContain("Receipt draft files written: 7");
  });

  it("invalidates the manifest when production-held dispatch simulation writes receipt draft files", () => {
    const codingAgentDispatchSimulation = codingAgentDispatchSimulationFixture();
    codingAgentDispatchSimulation.productionHeld.receiptDraftFilesWritten = 1;
    codingAgentDispatchSimulation.checks.productionHeldNoReceiptDraftFiles = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation,
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const simulationCheck = manifest.checks.find((check) => check.id === "coding-agent-dispatch-simulation");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(simulationCheck?.status).toBe("fail");
    expect(simulationCheck?.evidence).toContain("Production-held receipt draft files: 1");
  });

  it("invalidates the manifest when runner manifest loses receipt draft paths", () => {
    const codingAgentRunnerManifest = codingAgentRunnerManifestFixture();
    codingAgentRunnerManifest.valid.receiptDraftPaths = 7;
    codingAgentRunnerManifest.checks.receiptDraftPathsAttached = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest,
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const runnerCheck = manifest.checks.find((check) => check.id === "coding-agent-runner-manifest");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(runnerCheck?.status).toBe("fail");
    expect(runnerCheck?.evidence).toContain("Receipt draft paths: 7");
  });

  it("invalidates the manifest when runner self-test claims executed commands", () => {
    const codingAgentRunnerSelfTest = codingAgentRunnerSelfTestFixture();
    codingAgentRunnerSelfTest.valid.notExecutedCommands = 15;
    codingAgentRunnerSelfTest.checks.commandsNotExecuted = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest,
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const selfTestCheck = manifest.checks.find((check) => check.id === "coding-agent-runner-self-test");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(selfTestCheck?.status).toBe("fail");
    expect(selfTestCheck?.evidence).toContain("Not-executed commands: 15");
  });

  it("invalidates the manifest when out-of-scope coding-agent evidence updates the board", () => {
    const codingAgentReport = codingAgentReportFixture();
    codingAgentReport.outOfScope.boardItemsApplied = 1;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport,
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const outOfScopeCheck = manifest.checks.find((check) => check.id === "coding-agent-out-of-scope-receipt");

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(1);
    expect(outOfScopeCheck?.status).toBe("fail");
    expect(outOfScopeCheck?.summary).toContain("not blocked correctly");
  });

  it("invalidates the manifest when localization drill breaks locale contract", () => {
    const localizationDrill = localizationDrillFixture();
    localizationDrill.locales = localizationDrill.locales.filter((locale) => locale.locale !== "ko");
    localizationDrill.summary.total = 4;
    localizationDrill.summary.passed = 4;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill,
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const localizationCheck = manifest.checks.find((check) => check.id === "localization-drill");

    expect(manifest.decision).toBe("invalid");
    expect(localizationCheck?.status).toBe("fail");
    expect(localizationCheck?.summary).toContain("did not prove");
  });

  it("invalidates the manifest when localization drill does not preserve dispatch simulation contracts", () => {
    const localizationDrill = localizationDrillFixture();
    localizationDrill.locales[0].simulationReceiptDrafts = 0;
    localizationDrill.locales[0].checks.simulationContractStable = false;
    localizationDrill.locales[0].failures = ["simulationContractStable"];
    localizationDrill.summary.failed = 1;
    localizationDrill.summary.passed = 4;
    localizationDrill.summary.simulationReceiptDrafts -= 8;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill,
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const localizationCheck = manifest.checks.find((check) => check.id === "localization-drill");

    expect(manifest.decision).toBe("invalid");
    expect(localizationCheck?.status).toBe("fail");
    expect(localizationCheck?.evidence.join(" ")).toContain("Simulation and runner contract stable: no");
  });

  it("invalidates the manifest when executor drill executes a blocked action", () => {
    const executorDrill = executorContractDrillFixture();
    executorDrill.blockedAction.executed = true;
    executorDrill.checks.blockedActionHeld = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorDrill,
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const executorCheck = manifest.checks.find((check) => check.id === "executor-contract-drill");

    expect(manifest.decision).toBe("invalid");
    expect(executorCheck?.status).toBe("fail");
    expect(executorCheck?.evidence.join(" ")).toContain("executed=true");
  });

  it("invalidates the manifest when production boundary exit code is not observed", () => {
    const productionBoundaryDrill = productionBoundaryDrillFixture();
    productionBoundaryDrill.observedExitCode = 0;
    productionBoundaryDrill.checks.expectedExitCodeObserved = false;

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill,
      releaseVerification: releaseVerificationFixture(),
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });
    const productionBoundaryCheck = manifest.checks.find((check) => check.id === "production-boundary-drill");

    expect(manifest.decision).toBe("invalid");
    expect(productionBoundaryCheck?.status).toBe("fail");
    expect(productionBoundaryCheck?.evidence.join(" ")).toContain("Observed exit: 0");
  });

  it("invalidates the manifest when release verification is not dry-run verified", () => {
    const releaseVerification = releaseVerificationFixture();
    releaseVerification.decision = "not-production-ready";
    releaseVerification.scope = "production";
    releaseVerification.requireProductionEvidence = true;
    releaseVerification.summary = {
      total: 5,
      passed: 4,
      failed: 1
    };
    releaseVerification.checks = releaseVerification.checks.map((check) =>
      check.id === "production-evidence-required"
        ? {
          ...check,
          status: "fail",
          evidence: [
            "Required production evidence: yes",
            "Evidence level: dry-run"
          ]
        }
        : check
    );

    const manifest = buildVerificationManifest({
      codingAgentDispatchDrill: codingAgentDispatchFixture(),
      codingAgentDispatchSimulation: codingAgentDispatchSimulationFixture(),
      codingAgentRunnerManifest: codingAgentRunnerManifestFixture(),
      codingAgentRunnerSelfTest: codingAgentRunnerSelfTestFixture(),
      codingAgentReport: codingAgentReportFixture(),
      localizationDrill: localizationDrillFixture(),
      executorContractDrill: executorContractDrillFixture(),
      productionBoundaryDrill: productionBoundaryDrillFixture(),
      releaseVerification,
      generatedAt: "2026-06-27T00:10:00.000Z",
      inputs
    });

    expect(manifest.decision).toBe("invalid");
    expect(manifest.summary.failed).toBe(2);
    expect(manifest.checks.find((check) => check.id === "release-verification")?.status).toBe("fail");
    expect(manifest.checks.find((check) => check.id === "dry-run-boundary")?.status).toBe("fail");
  });
});

function codingAgentDispatchFixture(): CodingAgentDispatchDrillSummary {
  return {
    schema: "naikaku.coding-agent-dispatch-drill.v1",
    generatedAt: "2026-06-27T00:01:00.000Z",
    outputDir: "output/coding-agent-dispatch-drill",
    operatorLocale: "ja",
    source: {
      boardItems: 8,
      briefs: 8,
      reviewDecision: "ready",
      bundleDecision: "ready",
      drillDecision: "assignable",
      readySessions: 8,
      heldSessions: 0
    },
    valid: {
      dispatchDecision: "dispatchable",
      totalItems: 8,
      readyItems: 8,
      heldItems: 0,
      promptFiles: 8,
      promptFilesWritten: 8,
      receiptTemplateWritten: true,
      archiveFilesWritten: 12,
      archiveBytes: 10000,
      archiveUnsafePaths: 0,
      archiveAuditDecision: "verified",
      archiveAuditBlockers: 0,
      archiveAuditWarnings: 0,
      archiveMissingPromptFiles: 0,
      archiveUnexpectedPromptFiles: 0,
      archiveUnassignedHeldItems: 0,
      uniqueEvidencePrefixes: 8,
      unsafePaths: 0
    },
    productionHeld: {
      dispatchDecision: "blocked",
      totalItems: 8,
      readyItems: 0,
      heldItems: 8,
      productionHeldItems: 8,
      promptFiles: 0,
      promptFilesWritten: 0,
      receiptTemplateWritten: false,
      archiveFilesWritten: 3,
      archiveBytes: 2500,
      archiveUnsafePaths: 0,
      archiveAuditDecision: "verified",
      archiveAuditBlockers: 0,
      archiveAuditWarnings: 0,
      archiveMissingPromptFiles: 0,
      archiveUnexpectedPromptFiles: 0,
      archiveUnassignedHeldItems: 8,
      unsafePaths: 0
    },
    checks: {
      validDispatchable: true,
      validPromptFilesWritten: true,
      validReceiptTemplateWritten: true,
      validArchiveFilesWritten: true,
      validArchivePathsSafe: true,
      validArchiveAuditVerified: true,
      evidencePrefixesUnique: true,
      pathsSafe: true,
      productionHeldBlocked: true,
      productionHeldNotWritten: true,
      productionHeldArchiveAuditVerified: true
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local dispatch drill.",
      limitations: ["No production runner evidence."],
      productionRequirements: ["Attach production runner evidence."]
    }
  };
}

function codingAgentDispatchSimulationFixture(): CodingAgentDispatchSimulationSummary {
  return {
    schema: "naikaku.coding-agent-dispatch-simulation.v1",
    generatedAt: "2026-06-27T00:02:00.000Z",
    outputDir: "output/coding-agent-dispatch-simulation",
    operatorLocale: "ja",
    source: {
      dispatchDecision: "dispatchable",
      archiveAuditDecision: "verified",
      readyItems: 8,
      heldItems: 0,
      promptFiles: 8,
      receiptTemplates: 1
    },
    simulation: {
      decision: "ready-for-real-agent",
      readyForAgent: 8,
      held: 0,
      blocked: 0,
      plannedCommands: 16,
      expectedEvidenceArtifacts: 24,
      receiptDraftItems: 8,
      receiptDraftFilesWritten: 8,
      unsafePaths: 0
    },
    productionHeld: {
      decision: "needs-review",
      readyForAgent: 0,
      held: 8,
      blocked: 0,
      promptFiles: 0,
      receiptDraftItems: 0,
      receiptDraftFilesWritten: 0
    },
    checks: {
      validDispatchable: true,
      validSimulationReady: true,
      receiptDraftsCreated: true,
      receiptDraftFilesWritten: true,
      receiptDraftsPending: true,
      plannedCommandsCovered: true,
      evidenceArtifactsCovered: true,
      pathsSafe: true,
      noExecutionClaim: true,
      productionHeldNotReady: true,
      productionHeldNoReceiptDrafts: true,
      productionHeldNoReceiptDraftFiles: true
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local dispatch simulation.",
      limitations: ["No implementation work was executed."],
      productionRequirements: ["Attach real coding-agent receipts."]
    }
  };
}

function codingAgentRunnerManifestFixture(): CodingAgentRunnerManifestDrillSummary {
  return {
    schema: "naikaku.coding-agent-runner-manifest-drill.v1",
    generatedAt: "2026-06-27T00:03:00.000Z",
    outputDir: "output/coding-agent-runner-manifest",
    operatorLocale: "ja",
    source: {
      simulationDecision: "ready-for-real-agent",
      readyForAgent: 8,
      held: 0,
      blocked: 0,
      receiptDraftFilesWritten: 8
    },
    valid: {
      decision: "runner-ready",
      readyTasks: 8,
      heldTasks: 0,
      blockedTasks: 0,
      runnerTasks: 8,
      plannedCommands: 16,
      expectedEvidenceArtifacts: 24,
      receiptDraftPaths: 8,
      unsafePaths: 0,
      stopConditions: 88
    },
    productionHeld: {
      decision: "needs-review",
      readyTasks: 0,
      heldTasks: 8,
      blockedTasks: 0,
      runnerTasks: 0,
      receiptDraftPaths: 0,
      unsafePaths: 0
    },
    checks: {
      validRunnerReady: true,
      receiptDraftPathsAttached: true,
      pendingCommandsOnly: true,
      stopConditionsAttached: true,
      safePaths: true,
      noExecutionClaim: true,
      productionHeldNotQueued: true,
      productionHeldNoReceiptDraftPaths: true
    },
    honestyClaim: {
      level: "runner-handoff-planning",
      claim: "Local runner manifest drill.",
      limitations: ["No implementation work was executed."],
      productionRequirements: ["Attach real coding-agent receipts."]
    }
  };
}

function codingAgentRunnerSelfTestFixture(): CodingAgentRunnerSelfTestDrillSummary {
  return {
    schema: "naikaku.coding-agent-runner-self-test-drill.v1",
    generatedAt: "2026-06-27T00:04:00.000Z",
    outputDir: "output/coding-agent-runner-self-test",
    operatorLocale: "ja",
    source: {
      runnerManifestDecision: "runner-ready",
      readyTasks: 8,
      runnerTasks: 8,
      receiptDraftPaths: 8
    },
    valid: {
      decision: "self-test-ready",
      wouldRun: 8,
      held: 0,
      blocked: 0,
      simulatedActions: 32,
      pendingCommands: 16,
      notExecutedCommands: 16,
      expectedEvidenceArtifacts: 24,
      receiptDraftPaths: 8,
      unsafePaths: 0,
      stopConditions: 88
    },
    productionHeld: {
      decision: "needs-review",
      wouldRun: 0,
      held: 8,
      blocked: 0,
      notExecutedCommands: 16,
      receiptDraftPaths: 0,
      unsafePaths: 0
    },
    checks: {
      validSelfTestReady: true,
      wouldRunMatchesReceiptDrafts: true,
      commandsNotExecuted: true,
      simulatedActionsAttached: true,
      safePaths: true,
      stopConditionsPreserved: true,
      noExecutionClaim: true,
      productionHeldNotRun: true,
      productionHeldNoReceiptDraftPaths: true
    },
    honestyClaim: {
      level: "local-runner-self-test",
      claim: "Local runner self-test drill.",
      limitations: ["No implementation work was executed."],
      productionRequirements: ["Attach real coding-agent receipts."]
    }
  };
}

function codingAgentReportFixture(): CodingAgentReceiptDrillSummary {
  return {
    schema: "naikaku.coding-agent-receipt-drill.v1",
    generatedAt: "2026-06-27T00:00:00.000Z",
    operatorLocale: "ja",
    outputDir: "output/coding-agent-receipt-drill",
    source: {
      boardItems: 8,
      briefs: 8,
      reviewDecision: "ready",
      bundleDecision: "ready",
      readySessions: 8,
      heldSessions: 0
    },
    valid: {
      receiptDecision: "verified",
      evidenceDecision: "accepted-for-handoff",
      artifactAuditDecision: "verified",
      transcriptContentMismatches: 0,
      boardItemsApplied: 8,
      boardItemsSkipped: 0
    },
    mismatched: {
      receiptDecision: "needs-evidence",
      pendingEvidence: 1,
      evidenceDecision: "needs-evidence",
      artifactAuditDecision: "needs-artifacts",
      boardItemsApplied: 0,
      boardItemsSkipped: 8,
      firstMissingEvidence: "Evidence artifact is required for: Changed files summary."
    },
    outOfScope: {
      receiptDecision: "needs-evidence",
      pendingEvidence: 1,
      evidenceDecision: "needs-evidence",
      artifactAuditDecision: "needs-artifacts",
      boardItemsApplied: 0,
      boardItemsSkipped: 8,
      firstMissingEvidence: "Evidence artifact must stay under session evidence prefix output/coding-agent/coding-brief-team-execution-minister-work-package/: output/coding-agent/out-of-scope/evidence-1.txt"
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local drill.",
      limitations: ["No production runner evidence."],
      productionRequirements: ["Attach production runner evidence."]
    }
  };
}

function localizationDrillFixture(): LocalizationDrillSummary {
  const locales = [
    ["ja", "日本語", "Japanese"],
    ["en", "English", "English"],
    ["zh-Hans", "简体中文", "Simplified Chinese"],
    ["zh-Hant", "繁體中文", "Traditional Chinese"],
    ["ko", "한국어", "Korean"]
  ].map(([locale, nativeLabel, expectedLanguage]) => ({
    locale,
    nativeLabel,
    htmlLang: locale,
    expectedLanguage,
    briefs: 8,
    reviewDecision: "ready",
    bundleDecision: "ready",
    drillDecision: "assignable",
    dispatchDecision: "dispatchable",
    archiveAuditDecision: "verified",
    simulationDecision: "ready-for-real-agent",
    runnerManifestDecision: "runner-ready",
    runnerSelfTestDecision: "self-test-ready",
    receiptDecision: "needs-evidence",
    readySessions: 8,
    heldSessions: 0,
    wouldAssign: 8,
    dispatchReady: 8,
    dispatchPromptFiles: 8,
    simulationReadyForAgent: 8,
    simulationReceiptDrafts: 8,
    runnerReadyTasks: 8,
    runnerTasks: 8,
    runnerSelfTestWouldRun: 8,
    runnerSelfTestNotExecutedCommands: 16,
    pendingReceiptItems: 8,
    checks: {
      localeIsCarried: true,
      promptLanguageInstruction: true,
      machineContractStable: true,
      dispatchContractStable: true,
      archiveAuditVerified: true,
      simulationContractStable: true,
      runnerManifestContractStable: true,
      runnerSelfTestContractStable: true,
      copyReady: true,
      reviewReady: true,
      bundleReady: true,
      drillAssignable: true,
      receiptNeedsEvidence: true,
      sessionContractStable: true
    },
    failures: []
  }));

  return {
    schema: "naikaku.localization-drill.v1",
    generatedAt: "2026-06-27T00:02:00.000Z",
    outputDir: "output/localization-drill",
    defaultLocale: "ja",
    locales,
    summary: {
      total: 5,
      passed: 5,
      failed: 0,
      readySessions: 40,
      wouldAssign: 40,
      dispatchReady: 40,
      simulationReadyForAgent: 40,
      simulationReceiptDrafts: 40,
      runnerReadyTasks: 40,
      runnerTasks: 40,
      runnerSelfTestWouldRun: 40,
      runnerSelfTestNotExecutedCommands: 80,
      pendingReceiptItems: 40
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local localization drill.",
      limitations: ["No browser screenshot pass."],
      productionRequirements: ["Review production copy."]
    }
  };
}

function executorContractDrillFixture(): ExecutorContractDrillSummary {
  const profiles = [
    "browser-sandbox",
    "desktop-vm",
    "shell-container",
    "mcp-proxy",
    "human-approval"
  ] as const;

  return {
    schema: "naikaku.executor-contract-drill.v1",
    generatedAt: "2026-06-27T00:03:00.000Z",
    outputDir: "output/executor-contract-drill",
    runId: "run-executor-contract-test",
    mode: "dry-run",
    profiles: profiles.map((profileId) => ({
      profileId,
      readyActionId: `action-${profileId}`,
      runbookCommand: profileId === "human-approval"
        ? "approval.await --action test"
        : `sandbox.${profileId}.dry-run`,
      runnerId: `naikaku.${profileId}.dry-run`,
      evidenceKinds: profileId === "human-approval" ? ["policy", "approval"] : ["policy", "artifact", "transcript"],
      evidenceItems: profileId === "human-approval" ? 2 : 3,
      replayable: true,
      output: "Dry-run output.",
      failures: []
    })),
    blockedAction: {
      actionId: "blocked-deploy",
      action: "deploy_production",
      status: "blocked",
      held: true,
      executed: false,
      reason: "Action is blocked by sandbox policy."
    },
    summary: {
      profiles: 5,
      passed: 5,
      failed: 0,
      readyActions: 5,
      heldActions: 1,
      runbookSteps: 5,
      executorSteps: 5,
      evidenceItems: 14,
      replayableSteps: 5,
      approvalRecords: 3,
      capabilityCards: 5
    },
    checks: {
      allProfilesCovered: true,
      allReadyProfilesExecuted: true,
      blockedActionHeld: true,
      noProductionExecution: true,
      dryRunOnly: true,
      evidenceReplayable: true,
      noSecretLeakage: true
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local executor drill.",
      limitations: ["No real executor controlled."],
      productionRequirements: ["Attach production runner evidence."]
    }
  };
}

function productionBoundaryDrillFixture(): ProductionBoundaryDrillSummary {
  return {
    schema: "naikaku.production-boundary-drill.v1",
    generatedAt: "2026-06-27T00:04:00.000Z",
    command: "npm.cmd run release:verify:production",
    expectedExitCode: 4,
    observedExitCode: 4,
    verificationPath: "output/rehearsal-drill/release-verification-production-latest.json",
    sourceRunId: "run-test",
    decision: "not-production-ready",
    scope: "production",
    requireProductionEvidence: true,
    failedChecks: ["production-evidence-required"],
    checks: {
      expectedExitCodeObserved: true,
      productionNotReady: true,
      dryRunEvidenceRejected: true
    },
    honestyClaim: {
      level: "local-drill",
      claim: "Local production boundary drill.",
      limitations: ["No production runner evidence."],
      productionRequirements: ["Attach production runner evidence."]
    }
  };
}

function releaseVerificationFixture(): ReleaseVerificationReport {
  return {
    schema: "naikaku.release-verification.v1",
    generatedAt: "2026-06-27T00:05:00.000Z",
    sourceRunId: "run-test",
    scope: "dry-run",
    requireProductionEvidence: false,
    decision: "verified",
    checks: [
      {
        id: "rehearsal-schema",
        status: "pass",
        summary: "Release rehearsal report uses the expected schema.",
        evidence: ["Schema: naikaku.release-rehearsal.v1"],
        nextAction: "Use this report as the verification source."
      },
      {
        id: "production-evidence-required",
        status: "pass",
        summary: "Dry-run evidence is accepted for sandbox drill verification only.",
        evidence: [
          "Required production evidence: no",
          "Evidence level: dry-run"
        ],
        nextAction: "Use --require-production before any real release or external handoff."
      }
    ],
    summary: {
      total: 2,
      passed: 2,
      failed: 0
    }
  };
}
