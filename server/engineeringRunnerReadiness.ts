import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  buildExternalRunnerAdapterRegistry,
  type ExternalRunnerAdapter,
  type ExternalRunnerAdapterId,
  type ExternalRunnerRisk
} from "../src/domain/externalRunnerAdapters";

export type EngineeringRunnerReadinessStatus =
  | "ready"
  | "detected-needs-approval"
  | "detected-needs-adapter"
  | "missing"
  | "blocked-by-default";

export type EngineeringRunnerWorkbenchPreset = "prepared" | "fixture" | "openhands";

export interface EngineeringRunnerReadinessItem {
  adapterId: ExternalRunnerAdapterId;
  label: string;
  risk: ExternalRunnerRisk;
  installMode: ExternalRunnerAdapter["installMode"];
  status: EngineeringRunnerReadinessStatus;
  workbenchPreset: EngineeringRunnerWorkbenchPreset | null;
  canLaunchFromWorkbench: boolean;
  commandCandidates: string[];
  detectedCommands: string[];
  applicationCandidates: string[];
  detectedApplications: string[];
  capabilities: ExternalRunnerAdapter["capabilities"];
  installHint: string;
  nextAction: string;
  permissionsRequired: string[];
  evidenceRequired: string[];
}

export interface EngineeringRunnerReadinessReport {
  schema: "naikaku.engineering-runner-readiness.v1";
  generatedAt: string;
  cwd: string;
  items: EngineeringRunnerReadinessItem[];
  summary: {
    total: number;
    ready: number;
    detected: number;
    launchableFromWorkbench: number;
    missing: number;
    blockedByDefault: number;
    highOrCriticalRisk: number;
  };
  policy: {
    claim: string;
    limitations: string[];
  };
}

interface ReadinessDependencies {
  cwd?: string;
  generatedAt?: string;
  commandExists?: (command: string) => boolean;
  pathExists?: (path: string) => boolean;
}

const commandCandidates: Record<ExternalRunnerAdapterId, string[]> = {
  "naikaku-local-engineering-runner": [npmBinary()],
  "openhands-coding-agent": ["openhands"],
  "openclaw-desktop-runner": ["openclaw"],
  "browser-use-runner": ["browser-use"],
  "playwright-browser-runner": ["playwright", "playwright-cli", "npx"],
  "hammerspoon-mac-adapter": ["hs"],
  "e2b-open-computer-use": ["e2b"],
  "mcp-tool-runner": ["mcp"],
  "hermes-agent-runtime": ["hermes"]
};

const applicationCandidates: Partial<Record<ExternalRunnerAdapterId, string[]>> = {
  "hammerspoon-mac-adapter": [
    "/Applications/Hammerspoon.app",
    "/System/Applications/Hammerspoon.app"
  ]
};

export function buildEngineeringRunnerReadiness({
  cwd = process.cwd(),
  generatedAt = new Date().toISOString(),
  commandExists = defaultCommandExists,
  pathExists = existsSync
}: ReadinessDependencies = {}): EngineeringRunnerReadinessReport {
  const registry = buildExternalRunnerAdapterRegistry({ generatedAt });
  const items = registry.adapters.map((adapter) => {
    const commands = commandCandidates[adapter.id] || [];
    const applications = applicationCandidates[adapter.id] || [];
    const detectedCommands = commands.filter(commandExists);
    const detectedApplications = applications.filter(pathExists);
    return readinessItem({
      adapter,
      commandCandidates: commands,
      detectedCommands,
      applicationCandidates: applications,
      detectedApplications
    });
  });

  return {
    schema: "naikaku.engineering-runner-readiness.v1",
    generatedAt,
    cwd,
    items,
    summary: summarize(items),
    policy: {
      claim: "This report only detects local command or app presence for known adapter candidates.",
      limitations: [
        "It does not install upstream tools or accept third-party licenses for the operator.",
        "Detected desktop or browser runners still need approval, action logs, redaction review, and receipts before use.",
        "The Workbench can directly launch only prepared, fixture, and OpenHands preset flows today."
      ]
    }
  };
}

function readinessItem({
  adapter,
  commandCandidates,
  detectedCommands,
  applicationCandidates,
  detectedApplications
}: {
  adapter: ExternalRunnerAdapter;
  commandCandidates: string[];
  detectedCommands: string[];
  applicationCandidates: string[];
  detectedApplications: string[];
}): EngineeringRunnerReadinessItem {
  const detected = detectedCommands.length > 0 || detectedApplications.length > 0;
  const builtIn = adapter.id === "naikaku-local-engineering-runner";
  const workbenchPreset = presetFor(adapter.id);
  const canLaunchFromWorkbench = builtIn || (adapter.id === "openhands-coding-agent" && detected);

  return {
    adapterId: adapter.id,
    label: adapter.label,
    risk: adapter.risk,
    installMode: adapter.installMode,
    status: statusFor({ adapter, builtIn, detected, canLaunchFromWorkbench }),
    workbenchPreset,
    canLaunchFromWorkbench,
    commandCandidates,
    detectedCommands,
    applicationCandidates,
    detectedApplications,
    capabilities: adapter.capabilities,
    installHint: adapter.installHint,
    nextAction: nextActionFor({ adapter, builtIn, detected, canLaunchFromWorkbench }),
    permissionsRequired: adapter.permissionsRequired,
    evidenceRequired: adapter.evidenceRequired
  };
}

function statusFor({
  adapter,
  builtIn,
  detected,
  canLaunchFromWorkbench
}: {
  adapter: ExternalRunnerAdapter;
  builtIn: boolean;
  detected: boolean;
  canLaunchFromWorkbench: boolean;
}): EngineeringRunnerReadinessStatus {
  if (builtIn) return "ready";
  if (!detected) return adapter.risk === "critical" ? "blocked-by-default" : "missing";
  if (canLaunchFromWorkbench) return "detected-needs-approval";
  return adapter.risk === "critical" ? "blocked-by-default" : "detected-needs-adapter";
}

function presetFor(adapterId: ExternalRunnerAdapterId): EngineeringRunnerWorkbenchPreset | null {
  if (adapterId === "naikaku-local-engineering-runner") return "fixture";
  if (adapterId === "openhands-coding-agent") return "openhands";
  return null;
}

function nextActionFor({
  adapter,
  builtIn,
  detected,
  canLaunchFromWorkbench
}: {
  adapter: ExternalRunnerAdapter;
  builtIn: boolean;
  detected: boolean;
  canLaunchFromWorkbench: boolean;
}) {
  if (builtIn) {
    return "Use Fixture auto-test from the Workbench or run npm run engineering:auto-work-smoke.";
  }
  if (canLaunchFromWorkbench) {
    return "Review the upstream license, then select the matching Workbench preset and mark the adapter ready for this run.";
  }
  if (detected) {
    return "Keep this as an installed adapter candidate; add a scoped command preset before launching it from the Workbench.";
  }
  return adapter.installHint;
}

function summarize(items: EngineeringRunnerReadinessItem[]): EngineeringRunnerReadinessReport["summary"] {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === "ready").length,
    detected: items.filter((item) => item.detectedCommands.length > 0 || item.detectedApplications.length > 0).length,
    launchableFromWorkbench: items.filter((item) => item.canLaunchFromWorkbench).length,
    missing: items.filter((item) => item.status === "missing").length,
    blockedByDefault: items.filter((item) => item.status === "blocked-by-default").length,
    highOrCriticalRisk: items.filter((item) => item.risk === "high" || item.risk === "critical").length
  };
}

function defaultCommandExists(command: string) {
  const lookup = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(lookup, [command], {
    encoding: "utf8",
    timeout: 1500,
    maxBuffer: 1024 * 64
  });
  return result.status === 0;
}

function npmBinary() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
