import type {
  ExecutorEvidenceBundle,
  ExecutorEvidenceItem,
  ExecutorHandoff,
  ExecutorHandoffAction,
  ExecutorProfileId,
  ExecutorRun,
  ExecutorRunMode,
  ExecutorRunStep
} from "./types";

export function runExecutorHandoff({
  handoff,
  mode = "dry-run",
  startedAt = new Date().toISOString()
}: {
  handoff: ExecutorHandoff;
  mode?: ExecutorRunMode;
  startedAt?: string;
}): ExecutorRun {
  const steps = handoff.readyActions.map((action, index) =>
    simulateExecutorStep({
      action,
      handoffId: handoff.id,
      index,
      startedAt
    })
  );
  const completedAt = new Date(Date.parse(startedAt) + Math.max(1, steps.length) * 1000).toISOString();

  return {
    id: `${handoff.id}-executor-run-${startedAt}`,
    handoffId: handoff.id,
    runId: handoff.runId,
    mode,
    startedAt,
    completedAt,
    steps,
    summary: {
      ready: handoff.readyActions.length,
      simulated: steps.filter((step) => step.status === "simulated").length,
      held: handoff.heldActions.length,
      evidenceItems: steps.reduce((sum, step) => sum + step.evidence.length, 0),
      replayableSteps: steps.filter((step) => step.replayable).length
    }
  };
}

export function buildExecutorEvidenceBundle({
  executorRun,
  exportedAt = new Date().toISOString()
}: {
  executorRun: ExecutorRun;
  exportedAt?: string;
}): ExecutorEvidenceBundle {
  return {
    schema: "naikaku.executor-evidence.v1",
    exportedAt,
    executorRunId: executorRun.id,
    handoffId: executorRun.handoffId,
    runId: executorRun.runId,
    mode: executorRun.mode,
    steps: executorRun.steps.map((step) => ({
      stepId: step.id,
      actionId: step.actionId,
      executorProfileId: step.executorProfileId,
      runnerId: step.runnerId,
      status: step.status,
      evidenceHash: step.evidenceHash,
      replayable: step.replayable,
      evidence: step.evidence
    })),
    summary: {
      steps: executorRun.steps.length,
      evidenceItems: executorRun.summary.evidenceItems,
      replayableSteps: executorRun.summary.replayableSteps
    }
  };
}

export function serializeExecutorEvidenceBundle(bundle: ExecutorEvidenceBundle) {
  return JSON.stringify(bundle, null, 2);
}

function simulateExecutorStep({
  action,
  handoffId,
  index,
  startedAt
}: {
  action: ExecutorHandoffAction;
  handoffId: string;
  index: number;
  startedAt: string;
}): ExecutorRunStep {
  const started = new Date(Date.parse(startedAt) + index * 1000).toISOString();
  const completed = new Date(Date.parse(startedAt) + (index + 1) * 1000).toISOString();
  const runnerId = runnerIdFor(action.executorProfileId);
  const evidence = simulatedEvidence({
    action,
    stepId: `${handoffId}-${action.id}-step`,
    createdAt: completed
  });

  return {
    id: `${handoffId}-${action.id}-step`,
    handoffId,
    actionId: action.id,
    executorProfileId: action.executorProfileId,
    action: action.action,
    target: action.target,
    status: "simulated",
    startedAt: started,
    completedAt: completed,
    output: simulatedOutput(action),
    runnerId,
    evidence,
    evidenceHash: hashEvidence(evidence),
    replayable: evidence.every((item) => item.replayable),
    auditTags: [...action.auditTags, "executor-dry-run", action.executorProfileId]
  };
}

function simulatedEvidence({
  action,
  stepId,
  createdAt
}: {
  action: ExecutorHandoffAction;
  stepId: string;
  createdAt: string;
}): ExecutorEvidenceItem[] {
  const base = evidenceItem({
    stepId,
    kind: "policy",
    label: "Policy decision",
    summary: `${action.status} handoff accepted for ${action.executorProfileId}.`,
    createdAt,
    replayable: true
  });

  if (action.executorProfileId === "shell-container") {
    return [
      base,
      evidenceItem({
        stepId,
        kind: "transcript",
        label: "Command transcript",
        summary: `Dry-run transcript for ${action.target}; command was not executed.`,
        uri: `artifact://executor/${stepId}/terminal.txt`,
        createdAt,
        replayable: true
      }),
      evidenceItem({
        stepId,
        kind: "artifact",
        label: "Artifact manifest",
        summary: "No files were written; manifest records intended output boundary.",
        uri: `artifact://executor/${stepId}/manifest.json`,
        createdAt,
        replayable: true
      })
    ];
  }

  if (action.executorProfileId === "browser-sandbox") {
    return [
      base,
      evidenceItem({
        stepId,
        kind: "screenshot",
        label: "Browser screenshot placeholder",
        summary: `Dry-run screenshot placeholder for ${action.target}.`,
        uri: `artifact://executor/${stepId}/browser.png`,
        createdAt,
        replayable: true
      }),
      evidenceItem({
        stepId,
        kind: "network",
        label: "URL log",
        summary: `Would navigate only inside the approved browser sandbox target ${action.target}.`,
        uri: `artifact://executor/${stepId}/urls.json`,
        createdAt,
        replayable: true
      })
    ];
  }

  if (action.executorProfileId === "desktop-vm") {
    return [
      base,
      evidenceItem({
        stepId,
        kind: "screenshot",
        label: "Desktop stream placeholder",
        summary: "Dry-run desktop VM frame placeholder; no host desktop was controlled.",
        uri: `artifact://executor/${stepId}/desktop-frame.png`,
        createdAt,
        replayable: true
      }),
      evidenceItem({
        stepId,
        kind: "transcript",
        label: "Input event log",
        summary: `Would queue keyboard/mouse events for ${action.target} inside disposable VM identity.`,
        uri: `artifact://executor/${stepId}/input-events.json`,
        createdAt,
        replayable: true
      })
    ];
  }

  if (action.executorProfileId === "mcp-proxy") {
    return [
      base,
      evidenceItem({
        stepId,
        kind: "artifact",
        label: "Tool schema snapshot",
        summary: `Dry-run MCP schema snapshot for ${action.action}.`,
        uri: `artifact://executor/${stepId}/tool-schema.json`,
        createdAt,
        replayable: true
      }),
      evidenceItem({
        stepId,
        kind: "transcript",
        label: "Scoped tool call log",
        summary: "No MCP tool was called; log records intended request boundary.",
        uri: `artifact://executor/${stepId}/mcp-request.json`,
        createdAt,
        replayable: true
      })
    ];
  }

  return [
    base,
    evidenceItem({
      stepId,
      kind: "approval",
      label: "Approval record",
      summary: `Dry-run approval gate recorded ${action.approvalRecordId || "policy-ready action"}.`,
      uri: `audit://approval/${action.approvalRecordId || action.id}`,
      createdAt,
      replayable: true
    })
  ];
}

function evidenceItem({
  stepId,
  kind,
  label,
  summary,
  uri,
  createdAt,
  replayable
}: Omit<ExecutorEvidenceItem, "id" | "checksum" | "redacted"> & { stepId: string }): ExecutorEvidenceItem {
  const checksum = stableHash([stepId, kind, label, summary, uri || "", createdAt].join("|"));

  return {
    id: `${stepId}-${kind}-${checksum.slice(-6)}`,
    kind,
    label,
    summary,
    uri,
    checksum,
    createdAt,
    redacted: false,
    replayable
  };
}

function runnerIdFor(profileId: ExecutorProfileId) {
  return `naikaku.${profileId}.dry-run`;
}

function hashEvidence(evidence: ExecutorEvidenceItem[]) {
  return stableHash(
    evidence
      .map((item) => `${item.id}:${item.kind}:${item.checksum}:${item.replayable}`)
      .join("|")
  );
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function simulatedOutput(action: ExecutorHandoffAction) {
  if (action.executorProfileId === "shell-container") {
    return `Dry-run shell container accepted "${action.target}" without executing it.`;
  }

  if (action.executorProfileId === "browser-sandbox") {
    return `Dry-run browser sandbox would navigate or inspect "${action.target}" inside an isolated browser.`;
  }

  if (action.executorProfileId === "desktop-vm") {
    return `Dry-run desktop VM would queue GUI automation for "${action.target}" in a disposable environment.`;
  }

  if (action.executorProfileId === "mcp-proxy") {
    return `Dry-run MCP proxy would call "${action.action}" with scoped credentials and schema validation.`;
  }

  return `Dry-run human approval gate recorded "${action.action}" for "${action.target}".`;
}
