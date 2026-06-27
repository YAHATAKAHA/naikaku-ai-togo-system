import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCopy,
  getInitialLocale,
  htmlLang,
  saveLocale,
  supportedLocales,
  type SupportedLocale
} from "./i18n";

const expectedLocales: SupportedLocale[] = ["ja", "en", "zh-Hans", "zh-Hant", "ko"];

describe("i18n", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps Japanese as the default and first supported locale", () => {
    expect(supportedLocales.map((locale) => locale.code)).toEqual(expectedLocales);
    expect(getInitialLocale()).toBe("ja");
  });

  it("maps supported locales to stable html lang values", () => {
    expect(htmlLang("ja")).toBe("ja");
    expect(htmlLang("en")).toBe("en");
    expect(htmlLang("zh-Hans")).toBe("zh-Hans");
    expect(htmlLang("zh-Hant")).toBe("zh-Hant");
    expect(htmlLang("ko")).toBe("ko");
  });

  it("keeps core operator copy available for every locale", () => {
    for (const locale of expectedLocales) {
      const copy = getCopy(locale);

      expect(copy.brandSubtitle).toBeTruthy();
      expect(copy.language).toBeTruthy();
      expect(copy.missionTitle).toBeTruthy();
      expect(copy.runCabinet).toBeTruthy();
      expect(copy.engineeringLaunchpad.title).toBeTruthy();
      expect(copy.engineeringLaunchpad.state("ready-to-run")).toBeTruthy();
      expect(copy.engineeringLaunchpad.permissionMode("mac-assisted")).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchStage("sandbox-ready")).toBeTruthy();
      expect(copy.engineeringLaunchpad.nextAction("request-approval")).toBeTruthy();
      expect(copy.engineeringLaunchpad.entryLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.entryTitle).toBeTruthy();
      expect(copy.engineeringLaunchpad.entryBody).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionInputLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionInputPlaceholder).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionInputHelp).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityCodeLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityMacLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityExternalLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityCodeStatus(false, false, true, false)).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityMacStatus(false)).toBeTruthy();
      expect(copy.engineeringLaunchpad.realityExternalStatus(true)).toBeTruthy();
      expect(copy.engineeringLaunchpad.macScopeLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macScopeItems.length).toBeGreaterThanOrEqual(3);
      expect(copy.engineeringLaunchpad.macRunnerLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerPermissionsLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerAdaptersLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerNextActionsLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerHonestyLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerHonestyClaim(false)).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerHonestyLimit).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractChecksLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractDeniedLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractInstructionsLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerSummary(2, 3, 1, 1, 2)).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractSummary(10, 1, 8, 1, 40, 6)).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerDecision("runtime-needed")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerCapability("keyboard-mouse")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerCapabilityStatus("needs-runtime")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerPermission("mac-accessibility")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerPermissionStatus("ask-before-use")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerAdapter("hammerspoon-adapter")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerAdapterStatus("needs-runtime")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerNextAction("connect-mac-adapter")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractDecision("runtime-needed")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractAction("observe-screen")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractActionStatus("needs-runtime")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractCheckStatus("warn")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractDeniedAction("host-secrets")).toBeTruthy();
      expect(copy.engineeringLaunchpad.macRunnerContractInstruction("require-approval")).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionDraftLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionDraftScore(57, 4, 2, 1)).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionDraftItem("approval-boundary")).toBeTruthy();
      expect(copy.engineeringLaunchpad.missionDraftStatus("missing")).toBeTruthy();
      expect(copy.engineeringLaunchpad.autoWorkLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.autoWorkRun).toBeTruthy();
      expect(copy.engineeringLaunchpad.autoWorkAdapterNeedsReady("openclaw-local")).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerPresetTemplatesLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerPresetEnable).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerPresetEnabled).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerPresetEnableStarting("OpenClaw local agent")).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerPresetEnableCompleted("OpenClaw local agent")).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerPresetEnableFailed("error")).toBeTruthy();
      expect(copy.engineeringLaunchpad.applyMissionTemplate).toBeTruthy();
      expect(copy.engineeringLaunchpad.runSelfSimulation).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationNextActionsLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationHonestyLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationDecision("approval-required")).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationStage("preflight")).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationStageStatus("waiting")).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationCapability("mac-desktop")).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationCapabilityStatus("approval-required")).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationSummary(2, 1, 2, 8)).toBeTruthy();
      expect(copy.engineeringLaunchpad.selfSimulationStatus("simulated-ready", 2, 2, 8)).toBeTruthy();
      expect(copy.engineeringLaunchpad.permissionRequestLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.permissionRequestDeniedLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.permissionRequestSummary(6, 2, 5)).toBeTruthy();
      expect(copy.engineeringLaunchpad.permissionRequestDecision("approval-required")).toBeTruthy();
      expect(copy.engineeringLaunchpad.permissionRequestMode("ask-before-use")).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityGapLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityGapHonestyLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityGapSummary(50, 25, true, false)).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityGapDecision("runtime-needed")).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityGapItem("mac-desktop-control")).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityGapStatus("missing")).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueEmpty).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueChecklistLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueHonestyLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueSummary(2, 1, 0, 4, 8)).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueDecision("preflight-ready")).toBeTruthy();
      expect(copy.engineeringLaunchpad.launchQueueStatus("ready-to-run")).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptEmpty).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptClaimsLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptHonestyLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptSummary(2, 2, 2, 2, false)).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptDecision("needs-evidence")).toBeTruthy();
      expect(copy.engineeringLaunchpad.executionReceiptStatus("needs-artifacts")).toBeTruthy();
      expect(copy.engineeringLaunchpad.handoffReceiptLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.handoffOperatorScriptLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.handoffReceiptSummary(true, false, 2, 8)).toBeTruthy();
      expect(copy.engineeringLaunchpad.handoffReceiptDecision("agent-pack-ready")).toBeTruthy();
      expect(copy.engineeringLaunchpad.handoffLane("coding-agent")).toBeTruthy();
      expect(copy.engineeringLaunchpad.handoffLaneStatus("approval-required")).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateNextActionLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateBlockedClaimsLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateSummary(false, false, false)).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateDecision("simulation-only")).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateDecision("evidence-ready")).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateCheck("changed-files")).toBeTruthy();
      expect(copy.engineeringLaunchpad.completionGateCheckStatus("block")).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessRefresh).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessChecking).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessIdle).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessStatus(1, 2, 1, 9)).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessUnavailable("offline")).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessAdapterStatus("detected-needs-adapter")).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessDetected(2, 1)).toBeTruthy();
      expect(copy.engineeringLaunchpad.runnerReadinessNextActionLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.downloadSelfSimulationJson).toBeTruthy();
      expect(copy.engineeringLaunchpad.downloadSelfSimulationMarkdown).toBeTruthy();
      expect(copy.engineeringLaunchpad.downloadLaunchQueueJson).toBeTruthy();
      expect(copy.engineeringLaunchpad.downloadLaunchQueueMarkdown).toBeTruthy();
      expect(copy.engineeringLaunchpad.downloadExecutionReceiptJson).toBeTruthy();
      expect(copy.engineeringLaunchpad.downloadExecutionReceiptMarkdown).toBeTruthy();
      expect(copy.engineeringLaunchpad.capability("mac-accessibility")).toBeTruthy();
      expect(copy.engineeringLaunchpad.capabilityStatus("approval-required")).toBeTruthy();
      expect(copy.engineeringLaunchpad.signal("mac-control-requested")).toBeTruthy();
      expect(copy.engineeringLaunchpad.unlockChecklistLabel).toBeTruthy();
      expect(copy.engineeringLaunchpad.unlockItem("review-held-sessions", 12)).toBeTruthy();
      expect(copy.engineeringLaunchpad.unlockStatus("approval")).toBeTruthy();
      expect(copy.engineeringLaunchpad.steps).toHaveLength(5);
      expect(copy.engineeringLaunchpad.permissionGroups.length).toBeGreaterThanOrEqual(3);
      expect(copy.engineeringLaunchpad.preparePack).toBeTruthy();
      expect(copy.engineeringLaunchpad.runSandbox).toBeTruthy();
      expect(copy.releaseRehearsal.title).toBeTruthy();
      expect(copy.codingBriefs.title).toBeTruthy();
      expect(copy.codingBriefs.dispatchManifest).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchJson).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchArchiveJson).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchArchiveAuditJson).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchSimulationJson).toBeTruthy();
      expect(copy.codingBriefs.downloadRunnerManifestJson).toBeTruthy();
      expect(copy.codingBriefs.downloadRunnerSelfTestJson).toBeTruthy();
      expect(copy.codingBriefs.downloadSandboxRunnerPreflightJson).toBeTruthy();
      expect(copy.codingBriefs.downloadSandboxRunnerPreflightMarkdown).toBeTruthy();
      expect(copy.codingBriefs.sandboxRunnerPreflight).toBeTruthy();
      expect(copy.codingBriefs.downloadSandboxRunnerJson).toBeTruthy();
      expect(copy.codingBriefs.downloadSandboxRunnerMarkdown).toBeTruthy();
      expect(copy.codingBriefs.runSandboxRunner).toBeTruthy();
      expect(copy.codingBriefs.dispatchDecisionLabel("dispatchable")).toBeTruthy();
      expect(copy.codingBriefs.dispatchAuditDecisionLabel("verified")).toBeTruthy();
      expect(copy.codingBriefs.dispatchSimulationDecisionLabel("ready-for-real-agent")).toBeTruthy();
      expect(copy.codingBriefs.runnerManifestDecisionLabel("runner-ready")).toBeTruthy();
      expect(copy.codingBriefs.runnerSelfTestDecisionLabel("self-test-ready")).toBeTruthy();
      expect(copy.codingBriefs.sandboxRunnerPreflightDecisionLabel("ready")).toBeTruthy();
      expect(copy.codingBriefs.sandboxRunnerDecisionLabel("sandbox-runner-verified")).toBeTruthy();
      if (locale !== "en") {
        expect(copy.codingBriefs.dispatchDecisionLabel("dispatchable")).not.toBe("dispatchable");
      }
      expect(copy.codingBriefs.dispatchSummary(2, 1, 2)).toBeTruthy();
      expect(copy.codingBriefs.dispatchArchiveSummary(4, 2, 512)).toBeTruthy();
      expect(copy.codingBriefs.dispatchUnassignedHeld(1)).toBeTruthy();
      expect(copy.codingBriefs.dispatchAuditSummary(6, 1, 0)).toBeTruthy();
      expect(copy.codingBriefs.dispatchSimulationSummary(8, 0, 0)).toBeTruthy();
      expect(copy.codingBriefs.runnerManifestSummary(8, 8, 0)).toBeTruthy();
      expect(copy.codingBriefs.runnerSelfTestSummary(8, 16, 0)).toBeTruthy();
      expect(copy.codingBriefs.sandboxRunnerPreflightSummary(8, 0, 0, 2)).toBeTruthy();
      expect(copy.codingBriefs.statusSandboxRunnerPreflightGateway("ready", 8, 0, 0, 2)).toBeTruthy();
      expect(copy.codingBriefs.statusSandboxRunnerPreflightLocal("ready", 8, 0, 0, 2, "offline")).toBeTruthy();
      expect(copy.codingBriefs.statusSandboxRunnerPreflightBlocked("blocked", 0, 8, 1)).toBeTruthy();
      expect(copy.codingBriefs.sandboxRunnerSummary(8, 2, 16)).toBeTruthy();
      expect(copy.codingBriefs.statusSandboxRunnerGateway("sandbox-runner-verified", 8, 2, 16)).toBeTruthy();
      expect(copy.codingBriefs.statusSandboxRunnerUnavailable("offline")).toBeTruthy();
      expect(copy.codingBriefs.receiptTemplate).toBeTruthy();
      expect(copy.codingBriefs.drillReady).toBeTruthy();
    }
  });

  it("falls back to Japanese when stored locale is unsupported", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => "fr"),
        setItem: vi.fn()
      }
    });

    expect(getInitialLocale()).toBe("ja");
  });

  it("persists a supported locale selection", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(),
        setItem
      }
    });

    saveLocale("ko");

    expect(setItem).toHaveBeenCalledWith("naikaku.locale", "ko");
  });
});
