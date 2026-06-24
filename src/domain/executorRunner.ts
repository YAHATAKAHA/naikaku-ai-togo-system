import type {
  ExecutorHandoff,
  ExecutorHandoffAction,
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
      held: handoff.heldActions.length
    }
  };
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
    auditTags: [...action.auditTags, "executor-dry-run", action.executorProfileId]
  };
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
