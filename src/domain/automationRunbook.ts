import { buildExecutorHandoff } from "./automation";
import type {
  AutomationApprovalRecord,
  AutomationRunbook,
  AutomationRunbookStep,
  CabinetRun,
  ExecutorHandoffAction,
  ExecutorProfileId
} from "./types";

export function buildAutomationRunbook({
  run,
  approvalRecords,
  generatedAt = new Date().toISOString()
}: {
  run: CabinetRun;
  approvalRecords: AutomationApprovalRecord[];
  generatedAt?: string;
}): AutomationRunbook {
  const handoff = buildExecutorHandoff({
    run,
    approvalRecords,
    createdAt: generatedAt
  });
  const steps = handoff.readyActions.map((action, index) =>
    actionToRunbookStep({
      action,
      index
    })
  );

  return {
    schema: "naikaku.automation-runbook.v1",
    generatedAt,
    runId: run.id,
    handoffId: handoff.id,
    steps,
    heldActions: handoff.heldActions,
    summary: {
      ready: steps.length,
      held: handoff.heldActions.length,
      approvalGated: steps.filter((step) => Boolean(step.approvalRecordId)).length,
      shell: countProfile(steps, "shell-container"),
      browser: countProfile(steps, "browser-sandbox"),
      desktop: countProfile(steps, "desktop-vm"),
      mcp: countProfile(steps, "mcp-proxy"),
      human: countProfile(steps, "human-approval")
    }
  };
}

export function serializeAutomationRunbook(runbook: AutomationRunbook) {
  return JSON.stringify(runbook, null, 2);
}

function actionToRunbookStep({
  action,
  index
}: {
  action: ExecutorHandoffAction;
  index: number;
}): AutomationRunbookStep {
  const runnerId = runnerIdFor(action.executorProfileId);

  return {
    id: `${action.runId}-runbook-step-${String(index + 1).padStart(2, "0")}`,
    runId: action.runId,
    actionId: action.id,
    stageId: action.stageId,
    roleId: action.roleId,
    title: action.title,
    executorProfileId: action.executorProfileId,
    runnerId,
    command: commandFor(action),
    target: action.target,
    riskLevel: action.riskLevel,
    approvalRecordId: action.approvalRecordId,
    preflight: preflightFor(action),
    execution: executionFor(action),
    evidenceRequired: evidenceFor(action.executorProfileId),
    verification: verificationFor(action),
    rollback: rollbackFor(action),
    auditTags: [...action.auditTags, "automation-runbook", runnerId]
  };
}

function countProfile(steps: AutomationRunbookStep[], profileId: ExecutorProfileId) {
  return steps.filter((step) => step.executorProfileId === profileId).length;
}

function runnerIdFor(profileId: ExecutorProfileId) {
  return `naikaku.${profileId}.runner`;
}

function commandFor(action: ExecutorHandoffAction) {
  if (action.executorProfileId === "shell-container") {
    const [cwd, command] = action.target.includes(":")
      ? action.target.split(/:(.*)/s).filter(Boolean)
      : ["/workspace", action.target];
    return `sandbox.shell.run --cwd ${quote(cwd)} --command ${quote(command)}`;
  }

  if (action.executorProfileId === "browser-sandbox") {
    return `sandbox.browser.open --url ${quote(action.target)} --record-screenshot --record-network`;
  }

  if (action.executorProfileId === "desktop-vm") {
    return `sandbox.desktop.queue --target ${quote(action.target)} --disposable --record-stream`;
  }

  if (action.executorProfileId === "mcp-proxy") {
    return `sandbox.mcp.call --action ${quote(action.action)} --target ${quote(action.target)} --schema-check`;
  }

  return `approval.await --action ${quote(action.id)} --target ${quote(action.target)} --timeout 15m`;
}

function preflightFor(action: ExecutorHandoffAction) {
  const common = [
    "Verify global kill switch is armed.",
    `Confirm action risk is ${action.riskLevel} and target is ${action.target}.`,
    "Load scoped runner identity; do not inherit host secrets."
  ];

  if (action.approvalRecordId) {
    common.push(`Attach approval record ${action.approvalRecordId}.`);
  }

  if (action.executorProfileId === "shell-container") {
    return [
      ...common,
      "Mount only the approved workspace path as read/write.",
      "Apply CPU, memory, time, and network limits before execution."
    ];
  }

  if (action.executorProfileId === "browser-sandbox") {
    return [
      ...common,
      "Start an isolated browser profile with no host cookies.",
      "Check the URL against the sandbox network allowlist."
    ];
  }

  if (action.executorProfileId === "desktop-vm") {
    return [
      ...common,
      "Boot disposable VM identity and start screen recording.",
      "Confirm host clipboard and local filesystem are not mounted."
    ];
  }

  if (action.executorProfileId === "mcp-proxy") {
    return [
      ...common,
      "Resolve scoped MCP credentials server-side.",
      "Validate request against the tool schema before dispatch."
    ];
  }

  return [
    ...common,
    "Present exact payload preview to the operator.",
    "Require an explicit approve or reject decision before release."
  ];
}

function executionFor(action: ExecutorHandoffAction) {
  if (action.executorProfileId === "shell-container") {
    return [
      "Run the command inside the shell container only.",
      "Stream stdout, stderr, exit code, and duration into the evidence bundle.",
      "Stop immediately if runtime exceeds the sandbox policy limit."
    ];
  }

  if (action.executorProfileId === "browser-sandbox") {
    return [
      "Navigate inside the isolated browser context.",
      "Capture DOM/action replay, screenshots, and network log.",
      "Refuse downloads or form submissions unless the action target explicitly permits them."
    ];
  }

  if (action.executorProfileId === "desktop-vm") {
    return [
      "Queue keyboard and mouse events only inside the disposable VM.",
      "Record screen frames and input event log.",
      "Destroy VM state after evidence is exported."
    ];
  }

  if (action.executorProfileId === "mcp-proxy") {
    return [
      "Call the scoped MCP tool through the proxy.",
      "Persist the request schema, response checksum, and credential scope.",
      "Reject tool output that attempts to widen permissions."
    ];
  }

  return [
    "Wait for operator decision.",
    "Persist decision actor, timestamp, payload hash, and timeout state.",
    "Release only the approved action id into the executor handoff."
  ];
}

function evidenceFor(profileId: ExecutorProfileId) {
  if (profileId === "shell-container") {
    return [
      "Command transcript",
      "Exit code and runtime",
      "Artifact manifest",
      "Resource limit snapshot"
    ];
  }

  if (profileId === "browser-sandbox") {
    return [
      "Screenshot stream",
      "URL and network log",
      "DOM/action replay",
      "Downloaded artifact manifest when applicable"
    ];
  }

  if (profileId === "desktop-vm") {
    return [
      "Screen recording or frame snapshots",
      "Keyboard/mouse input log",
      "VM identity snapshot",
      "Destroyed-state receipt"
    ];
  }

  if (profileId === "mcp-proxy") {
    return [
      "Tool schema snapshot",
      "Scoped credential receipt",
      "Request and response checksum",
      "Tool output redaction report"
    ];
  }

  return [
    "Payload preview",
    "Operator identity",
    "Decision timestamp",
    "Approval or rejection record"
  ];
}

function verificationFor(action: ExecutorHandoffAction) {
  return [
    "Evidence bundle contains every required evidence item.",
    `Evidence step references action ${action.id}.`,
    "All replayable evidence items include checksums.",
    "No raw provider or runner secrets appear in artifacts."
  ];
}

function rollbackFor(action: ExecutorHandoffAction) {
  if (action.executorProfileId === "shell-container") {
    return [
      "Delete unapproved artifacts from the scoped mount.",
      "Restore workspace snapshot when the command exits non-zero."
    ];
  }

  if (action.executorProfileId === "browser-sandbox") {
    return [
      "Close isolated browser profile.",
      "Discard cookies, cache, storage, and downloads not listed in evidence."
    ];
  }

  if (action.executorProfileId === "desktop-vm") {
    return [
      "Terminate disposable VM.",
      "Revoke VM identity and discard writable disk layer."
    ];
  }

  if (action.executorProfileId === "mcp-proxy") {
    return [
      "Revoke scoped tool credential.",
      "Delete staged tool output when verification fails."
    ];
  }

  return [
    "Expire approval payload after timeout.",
    "Keep rejected payloads in audit history but never release them to runners."
  ];
}

function quote(value: string) {
  return JSON.stringify(value);
}
