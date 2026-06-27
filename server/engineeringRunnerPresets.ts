import {
  externalRunnerAdapterIds,
  type ExternalRunnerAdapterId
} from "../src/domain/externalRunnerAdapters";

export type EngineeringAutoWorkGatewayPreset = string;

export type EngineeringRunnerPresetKind = "prepared" | "fixture" | "external-command";

export interface EngineeringRunnerPreset {
  id: EngineeringAutoWorkGatewayPreset;
  label: string;
  kind: EngineeringRunnerPresetKind;
  source: "built-in" | "env";
  adapterId: ExternalRunnerAdapterId | null;
  command: string | null;
  args: string[];
  requiresAdapterReady: boolean;
  receiptRequired: boolean;
  maxJobs: number;
  commandCandidates: string[];
  availableInWorkbench: boolean;
  nextAction: string;
}

export interface EngineeringRunnerPresetRegistry {
  schema: "naikaku.engineering-runner-presets.v1";
  generatedAt: string;
  presets: EngineeringRunnerPreset[];
  errors: string[];
  summary: {
    total: number;
    builtIn: number;
    configured: number;
    externalCommand: number;
    availableInWorkbench: number;
    errors: number;
  };
  policy: {
    claim: string;
    limitations: string[];
  };
}

interface RawConfiguredPreset {
  id?: unknown;
  label?: unknown;
  adapterId?: unknown;
  command?: unknown;
  args?: unknown;
  requiresAdapterReady?: unknown;
  receiptRequired?: unknown;
  maxJobs?: unknown;
  commandCandidates?: unknown;
  nextAction?: unknown;
}

const BUILT_IN_PRESETS: EngineeringRunnerPreset[] = [
  {
    id: "prepared",
    label: "Prepare handoff only",
    kind: "prepared",
    source: "built-in",
    adapterId: null,
    command: null,
    args: [],
    requiresAdapterReady: false,
    receiptRequired: true,
    maxJobs: 1,
    commandCandidates: [],
    availableInWorkbench: true,
    nextAction: "Prepare supervised runner tasks without starting an external command."
  },
  {
    id: "fixture",
    label: "Fixture auto-test",
    kind: "fixture",
    source: "built-in",
    adapterId: "openhands-coding-agent",
    command: null,
    args: [],
    requiresAdapterReady: false,
    receiptRequired: true,
    maxJobs: 1,
    commandCandidates: [],
    availableInWorkbench: true,
    nextAction: "Run the deterministic local fixture adapter and import its receipt."
  },
  {
    id: "openhands",
    label: "OpenHands CLI",
    kind: "external-command",
    source: "built-in",
    adapterId: "openhands-coding-agent",
    command: "openhands",
    args: ["--always-approve", "-f", "{taskPath}"],
    requiresAdapterReady: true,
    receiptRequired: true,
    maxJobs: 1,
    commandCandidates: ["openhands"],
    availableInWorkbench: true,
    nextAction: "Install and license-review OpenHands, then run one scoped task file."
  }
];

export function buildEngineeringRunnerPresetRegistry({
  generatedAt = new Date().toISOString(),
  envValue = process.env.NAIKAKU_ENGINEERING_RUNNER_PRESETS
}: {
  generatedAt?: string;
  envValue?: string;
} = {}): EngineeringRunnerPresetRegistry {
  const { presets: configuredPresets, errors } = parseConfiguredPresets(envValue);
  const presets = [...BUILT_IN_PRESETS, ...configuredPresets];

  return {
    schema: "naikaku.engineering-runner-presets.v1",
    generatedAt,
    presets,
    errors,
    summary: {
      total: presets.length,
      builtIn: BUILT_IN_PRESETS.length,
      configured: configuredPresets.length,
      externalCommand: presets.filter((preset) => preset.kind === "external-command").length,
      availableInWorkbench: presets.filter((preset) => preset.availableInWorkbench).length,
      errors: errors.length
    },
    policy: {
      claim: "Workbench runner presets are fixed server-side command templates.",
      limitations: [
        "The browser can select a preset id, but it cannot submit arbitrary shell commands.",
        "Configured presets must come from NAIKAKU_ENGINEERING_RUNNER_PRESETS on the local gateway host.",
        "External command presets still require operator installation, license review, scoped worktree approval, receipts, and evidence before completion can be claimed.",
        "Presets do not grant Mac Accessibility, Screen Recording, Automation, Git push, deploy, external-send, or host-secret access."
      ]
    }
  };
}

export function findEngineeringRunnerPreset(
  presetId: string | undefined,
  registry = buildEngineeringRunnerPresetRegistry()
) {
  const id = typeof presetId === "string" && presetId.trim() ? presetId.trim() : "prepared";
  return registry.presets.find((preset) => preset.id === id) || null;
}

function parseConfiguredPresets(envValue: string | undefined) {
  if (!envValue || !envValue.trim()) {
    return { presets: [] as EngineeringRunnerPreset[], errors: [] as string[] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(envValue);
  } catch (error) {
    return {
      presets: [] as EngineeringRunnerPreset[],
      errors: [`NAIKAKU_ENGINEERING_RUNNER_PRESETS must be valid JSON: ${error instanceof Error ? error.message : "parse failed"}.`]
    };
  }

  const rawPresets = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { presets?: unknown }).presets)
      ? (parsed as { presets: unknown[] }).presets
      : null;
  if (!rawPresets) {
    return {
      presets: [] as EngineeringRunnerPreset[],
      errors: ["NAIKAKU_ENGINEERING_RUNNER_PRESETS must be an array or an object with a presets array."]
    };
  }

  const presets: EngineeringRunnerPreset[] = [];
  const errors: string[] = [];
  const reservedIds = new Set(BUILT_IN_PRESETS.map((preset) => preset.id));
  const seenIds = new Set<string>();

  rawPresets.forEach((item, index) => {
    const result = normalizeConfiguredPreset(item as RawConfiguredPreset, index, reservedIds, seenIds);
    if (typeof result === "string") {
      errors.push(result);
      return;
    }
    seenIds.add(result.id);
    presets.push(result);
  });

  return { presets, errors };
}

function normalizeConfiguredPreset(
  item: RawConfiguredPreset,
  index: number,
  reservedIds: Set<string>,
  seenIds: Set<string>
): EngineeringRunnerPreset | string {
  const prefix = `preset[${index}]`;
  const id = stringField(item.id);
  if (!id || !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(id)) {
    return `${prefix}.id must use 2-64 lowercase letters, numbers, dot, underscore, or hyphen.`;
  }
  if (reservedIds.has(id)) {
    return `${prefix}.id cannot replace a built-in preset: ${id}.`;
  }
  if (seenIds.has(id)) {
    return `${prefix}.id is duplicated: ${id}.`;
  }

  const adapterId = stringField(item.adapterId);
  if (!adapterId || !externalRunnerAdapterIds.includes(adapterId as ExternalRunnerAdapterId)) {
    return `${prefix}.adapterId must be one of ${externalRunnerAdapterIds.join(", ")}.`;
  }

  const command = stringField(item.command);
  if (!command || !/^[A-Za-z0-9._-]+$/.test(command)) {
    return `${prefix}.command must be a bare command name without spaces or path separators.`;
  }

  const args = arrayOfStrings(item.args, `${prefix}.args`);
  if (typeof args === "string") return args;
  const commandCandidates = arrayOfStrings(item.commandCandidates, `${prefix}.commandCandidates`, [command]);
  if (typeof commandCandidates === "string") return commandCandidates;
  const label = stringField(item.label) || id;
  const nextAction = stringField(item.nextAction) || "Run the configured local CLI against one scoped Naikaku task file.";

  return {
    id,
    label,
    kind: "external-command",
    source: "env",
    adapterId: adapterId as ExternalRunnerAdapterId,
    command,
    args,
    requiresAdapterReady: item.requiresAdapterReady === false ? false : true,
    receiptRequired: item.receiptRequired === false ? false : true,
    maxJobs: boundedPositiveInt(item.maxJobs, 1, 8),
    commandCandidates,
    availableInWorkbench: true,
    nextAction
  };
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function arrayOfStrings(value: unknown, field: string, fallback: string[] = []) {
  if (typeof value === "undefined") return fallback;
  if (!Array.isArray(value)) return `${field} must be an array of strings.`;

  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return `${field} must contain only strings.`;
    if (item.includes("\0") || item.includes("\n") || item.includes("\r")) {
      return `${field} cannot contain NUL or newline characters.`;
    }
    if (item.length > 1000) return `${field} items must stay under 1000 characters.`;
    result.push(item);
  }
  return result;
}

function boundedPositiveInt(value: unknown, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}
