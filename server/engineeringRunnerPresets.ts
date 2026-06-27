import {
  externalRunnerAdapterIds,
  type ExternalRunnerAdapterId
} from "../src/domain/externalRunnerAdapters";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ledgerDir } from "./ledgerStore";

export type EngineeringAutoWorkGatewayPreset = string;

export type EngineeringRunnerPresetKind = "prepared" | "fixture" | "external-command";

export interface EngineeringRunnerPreset {
  id: EngineeringAutoWorkGatewayPreset;
  label: string;
  kind: EngineeringRunnerPresetKind;
  source: "built-in" | "env" | "file";
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

export interface EngineeringRunnerPresetTemplate {
  id: string;
  label: string;
  adapterId: ExternalRunnerAdapterId;
  command: string;
  commandCandidates: string[];
  summary: string;
  nextAction: string;
  enabled: boolean;
}

export interface EngineeringRunnerPresetRegistry {
  schema: "naikaku.engineering-runner-presets.v1";
  generatedAt: string;
  configPath: string;
  presets: EngineeringRunnerPreset[];
  templates: EngineeringRunnerPresetTemplate[];
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

export interface EngineeringRunnerPresetEnableResult {
  schema: "naikaku.engineering-runner-preset-enable.v1";
  ok: boolean;
  status: "enabled" | "already-enabled" | "blocked";
  message: string;
  configPath: string;
  templateId: string;
  preset: EngineeringRunnerPreset | null;
  registry: EngineeringRunnerPresetRegistry;
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

const PRESET_TEMPLATES: Array<Omit<EngineeringRunnerPresetTemplate, "enabled"> & { preset: RawConfiguredPreset }> = [
  {
    id: "openclaw-local",
    label: "OpenClaw local agent",
    adapterId: "openclaw-desktop-runner",
    command: "openclaw",
    commandCandidates: ["openclaw"],
    summary: "Run OpenClaw's local embedded agent with one scoped Naikaku task file.",
    nextAction: "Install OpenClaw, configure the naikaku agent id, then approve one scoped local run.",
    preset: {
      id: "openclaw-local",
      label: "OpenClaw local agent",
      adapterId: "openclaw-desktop-runner",
      command: "openclaw",
      args: ["agent", "--agent", "naikaku", "--message-file", "{taskPath}", "--local", "--json"],
      commandCandidates: ["openclaw"],
      nextAction: "Run OpenClaw's local embedded agent against one scoped Naikaku task file."
    }
  }
];

export function buildEngineeringRunnerPresetRegistry({
  generatedAt = new Date().toISOString(),
  envValue = process.env.NAIKAKU_ENGINEERING_RUNNER_PRESETS,
  configPath = engineeringRunnerPresetsConfigPath()
}: {
  generatedAt?: string;
  envValue?: string;
  configPath?: string;
} = {}): EngineeringRunnerPresetRegistry {
  const reservedIds = new Set(BUILT_IN_PRESETS.map((preset) => preset.id));
  const seenIds = new Set<string>();
  const envResult = parseConfiguredPresets(envValue, "env", reservedIds, seenIds, "NAIKAKU_ENGINEERING_RUNNER_PRESETS");
  const fileResult = readConfiguredPresetFile(configPath, reservedIds, seenIds);
  const configuredPresets = [...envResult.presets, ...fileResult.presets];
  const errors = [...envResult.errors, ...fileResult.errors];
  const presets = [...BUILT_IN_PRESETS, ...configuredPresets];

  return {
    schema: "naikaku.engineering-runner-presets.v1",
    generatedAt,
    configPath,
    presets,
    templates: PRESET_TEMPLATES.map((template) => ({
      id: template.id,
      label: template.label,
      adapterId: template.adapterId,
      command: template.command,
      commandCandidates: template.commandCandidates,
      summary: template.summary,
      nextAction: template.nextAction,
      enabled: presets.some((preset) => preset.id === template.id)
    })),
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
        "Configured presets must come from NAIKAKU_ENGINEERING_RUNNER_PRESETS or the local gateway preset config file.",
        "External command presets still require operator installation, license review, scoped worktree approval, receipts, and evidence before completion can be claimed.",
        "Presets do not grant Mac Accessibility, Screen Recording, Automation, Git push, deploy, external-send, or host-secret access."
      ]
    }
  };
}

export function enableEngineeringRunnerPresetTemplate({
  templateId,
  generatedAt = new Date().toISOString(),
  configPath = engineeringRunnerPresetsConfigPath()
}: {
  templateId: string;
  generatedAt?: string;
  configPath?: string;
}): EngineeringRunnerPresetEnableResult {
  const template = PRESET_TEMPLATES.find((candidate) => candidate.id === templateId);
  if (!template) {
    const registry = buildEngineeringRunnerPresetRegistry({ generatedAt, configPath });
    return {
      schema: "naikaku.engineering-runner-preset-enable.v1",
      ok: false,
      status: "blocked",
      message: `Unknown runner preset template: ${templateId}.`,
      configPath,
      templateId,
      preset: null,
      registry
    };
  }

  const loaded = readRawPresetFile(configPath);
  if (loaded.errors.length > 0) {
    const registry = buildEngineeringRunnerPresetRegistry({ generatedAt, configPath });
    return {
      schema: "naikaku.engineering-runner-preset-enable.v1",
      ok: false,
      status: "blocked",
      message: loaded.errors[0],
      configPath,
      templateId,
      preset: null,
      registry
    };
  }

  const existingIndex = loaded.presets.findIndex((preset) => stringField(preset.id) === template.id);
  const nextRawPresets = [...loaded.presets];
  if (existingIndex >= 0) {
    nextRawPresets[existingIndex] = template.preset;
  } else {
    nextRawPresets.push(template.preset);
  }

  writePresetFile(configPath, {
    schema: "naikaku.engineering-runner-presets-config.v1",
    generatedAt,
    presets: nextRawPresets
  });

  const registry = buildEngineeringRunnerPresetRegistry({ generatedAt, configPath });
  return {
    schema: "naikaku.engineering-runner-preset-enable.v1",
    ok: true,
    status: existingIndex >= 0 ? "already-enabled" : "enabled",
    message: existingIndex >= 0
      ? `${template.label} was already enabled and has been refreshed from the built-in safe template.`
      : `${template.label} enabled in the local gateway preset config.`,
    configPath,
    templateId,
    preset: registry.presets.find((preset) => preset.id === template.id) || null,
    registry
  };
}

export function engineeringRunnerPresetsConfigPath(env = process.env) {
  return env.NAIKAKU_ENGINEERING_RUNNER_PRESETS_FILE || join(ledgerDir(env), "engineering-runner-presets.json");
}

export function findEngineeringRunnerPreset(
  presetId: string | undefined,
  registry = buildEngineeringRunnerPresetRegistry()
) {
  const id = typeof presetId === "string" && presetId.trim() ? presetId.trim() : "prepared";
  return registry.presets.find((preset) => preset.id === id) || null;
}

function readConfiguredPresetFile(
  configPath: string,
  reservedIds: Set<string>,
  seenIds: Set<string>
) {
  if (!configPath || !existsSync(configPath)) {
    return { presets: [] as EngineeringRunnerPreset[], errors: [] as string[] };
  }

  try {
    return parseConfiguredPresets(readFileSync(configPath, "utf8"), "file", reservedIds, seenIds, configPath);
  } catch (error) {
    return {
      presets: [] as EngineeringRunnerPreset[],
      errors: [`${configPath} could not be read: ${error instanceof Error ? error.message : "read failed"}.`]
    };
  }
}

function readRawPresetFile(configPath: string) {
  if (!configPath || !existsSync(configPath)) {
    return { presets: [] as RawConfiguredPreset[], errors: [] as string[] };
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
    const rawPresets = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { presets?: unknown }).presets)
        ? (parsed as { presets: unknown[] }).presets
        : null;

    if (!rawPresets) {
      return {
        presets: [] as RawConfiguredPreset[],
        errors: [`${configPath} must be an array or an object with a presets array.`]
      };
    }

    const invalidIndex = rawPresets.findIndex((item) => !item || typeof item !== "object" || Array.isArray(item));
    if (invalidIndex >= 0) {
      return {
        presets: [] as RawConfiguredPreset[],
        errors: [`${configPath} presets[${invalidIndex}] must be an object.`]
      };
    }

    return { presets: rawPresets as RawConfiguredPreset[], errors: [] as string[] };
  } catch (error) {
    return {
      presets: [] as RawConfiguredPreset[],
      errors: [`${configPath} must be valid JSON: ${error instanceof Error ? error.message : "parse failed"}.`]
    };
  }
}

function writePresetFile(configPath: string, content: unknown) {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

function parseConfiguredPresets(
  value: string | undefined,
  source: "env" | "file",
  reservedIds: Set<string>,
  seenIds: Set<string>,
  label: string
) {
  if (!value || !value.trim()) {
    return { presets: [] as EngineeringRunnerPreset[], errors: [] as string[] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    return {
      presets: [] as EngineeringRunnerPreset[],
      errors: [`${label} must be valid JSON: ${error instanceof Error ? error.message : "parse failed"}.`]
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
      errors: [`${label} must be an array or an object with a presets array.`]
    };
  }

  const presets: EngineeringRunnerPreset[] = [];
  const errors: string[] = [];

  rawPresets.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label} preset[${index}] must be an object.`);
      return;
    }

    const result = normalizeConfiguredPreset(item as RawConfiguredPreset, index, reservedIds, seenIds, source);
    if (typeof result === "string") {
      errors.push(`${label} ${result}`);
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
  seenIds: Set<string>,
  source: "env" | "file"
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
    source,
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
