import type {
  ExternalRunnerAdapter,
  ExternalRunnerAdapterId,
  ExternalRunnerAdapterStatus,
  ExternalRunnerCapability,
  ExternalRunnerAdapterRegistry
} from "./externalRunnerAdapters";
import type {
  CodingAgentRunnerInvocationCommand,
  CodingAgentRunnerInvocationItem,
  CodingAgentRunnerInvocationPackage
} from "./types";

export type ExternalRunnerHandoffDecision =
  | "handoff-ready"
  | "needs-license-review"
  | "needs-install"
  | "approval-required"
  | "no-ready-tasks"
  | "blocked";

export type ExternalRunnerHandoffTaskStatus =
  | "ready-for-adapter"
  | "review-only"
  | "held"
  | "blocked";

export interface ExternalRunnerHandoffBlocker {
  id: string;
  severity: "review" | "block";
  summary: string;
  nextAction: string;
}

export interface ExternalRunnerHandoffTask {
  sessionId: string;
  title: string;
  status: ExternalRunnerHandoffTaskStatus;
  sourceInvocationPath: string | null;
  taskPath: string | null;
  jobPath: string | null;
  promptPath: string | null;
  receiptDraftPath: string | null;
  executorProfileId: string;
  runnerId: string;
  plannedSteps: string[];
  commands: CodingAgentRunnerInvocationCommand[];
  expectedEvidenceArtifacts: Array<{
    label: string;
    path: string;
  }>;
  adapterInstructions: string[];
  stopConditions: string[];
  nextAction: string;
}

export interface ExternalRunnerAdapterJob {
  schema: "naikaku.external-runner-adapter-job.v1";
  generatedAt: string;
  adapterId: ExternalRunnerAdapterId;
  sessionId: string;
  title: string;
  status: ExternalRunnerHandoffTaskStatus;
  executable: boolean;
  taskPath: string;
  sourceInvocationPath: string | null;
  promptPath: string | null;
  receiptDraftPath: string | null;
  commandPlan: {
    command: string;
    args: string[];
    workingDirectory: string;
    stdin: null;
    stdoutTranscriptPath: string;
    stderrTranscriptPath: string;
  };
  evidence: {
    expectedArtifacts: ExternalRunnerHandoffTask["expectedEvidenceArtifacts"];
    receiptDraftPath: string | null;
  };
  restrictions: {
    prohibitedByDefault: string[];
    stopConditions: string[];
  };
}

export interface ExternalRunnerHandoff {
  schema: "naikaku.external-runner-handoff.v1";
  generatedAt: string;
  adapter: {
    id: ExternalRunnerAdapterId;
    label: string;
    status: ExternalRunnerAdapterStatus;
    projectUrl: string;
    license: string;
    licenseUrl: string;
    installMode: string;
    risk: string;
    capabilities: ExternalRunnerCapability[];
  } | null;
  source: {
    adapterRegistrySchema: ExternalRunnerAdapterRegistry["schema"];
    runnerInvocationSchema: CodingAgentRunnerInvocationPackage["schema"];
    runnerInvocationDecision: CodingAgentRunnerInvocationPackage["decision"];
    runId?: string;
    operatorLocale: string;
  };
  decision: ExternalRunnerHandoffDecision;
  canStartExternalRunner: boolean;
  outputDir: string;
  taskDirectory: string;
  jobDirectory: string;
  tasks: ExternalRunnerHandoffTask[];
  blockers: ExternalRunnerHandoffBlocker[];
  summary: {
    totalTasks: number;
    invocationReadyTasks: number;
    handoffTaskFiles: number;
    adapterJobFiles: number;
    readyTaskFiles: number;
    reviewOnlyTaskFiles: number;
    heldTasks: number;
    blockedTasks: number;
    blockers: number;
  };
  adapterContract: {
    preferredMode: "user-installed-adapter-process";
    contractInput: string;
    receiptOutput: string;
    permissionsRequired: string[];
    prohibitedByDefault: string[];
    evidenceRequired: string[];
    stopConditions: string[];
  } | null;
  honestyClaim: {
    claim: string;
    limitations: string[];
    productionRequirements: string[];
  };
}

export function buildExternalRunnerHandoff({
  adapterRegistry,
  runnerInvocation,
  adapterId = "openhands-coding-agent",
  outputDir = "output/engineering-handoff",
  generatedAt = new Date().toISOString()
}: {
  adapterRegistry: ExternalRunnerAdapterRegistry;
  runnerInvocation: CodingAgentRunnerInvocationPackage;
  adapterId?: ExternalRunnerAdapterId;
  outputDir?: string;
  generatedAt?: string;
}): ExternalRunnerHandoff {
  const normalizedOutputDir = outputDir.replace(/\/+$/, "") || "output/engineering-handoff";
  const taskDirectory = `${normalizedOutputDir}/tasks`;
  const jobDirectory = `${normalizedOutputDir}/jobs`;
  const adapter = adapterRegistry.adapters.find((item) => item.id === adapterId) ?? null;
  const blockers = blockersFor({ adapter, runnerInvocation });
  const decision = decisionFor({ adapter, runnerInvocation, blockers });
  const canStartExternalRunner = decision === "handoff-ready";
  const tasks = runnerInvocation.items.map((item, index) =>
    taskFor({
      item,
      adapter,
      decision,
      taskDirectory,
      jobDirectory,
      taskIndex: index + 1
    })
  );
  const adapterContract = adapter
    ? {
        preferredMode: "user-installed-adapter-process" as const,
        contractInput: adapter.contractInput,
        receiptOutput: adapter.receiptOutput,
        permissionsRequired: adapter.permissionsRequired,
        prohibitedByDefault: adapter.prohibitedByDefault,
        evidenceRequired: adapter.evidenceRequired,
        stopConditions: adapter.stopConditions
      }
    : null;

  return {
    schema: "naikaku.external-runner-handoff.v1",
    generatedAt,
    adapter: adapter ? {
      id: adapter.id,
      label: adapter.label,
      status: adapter.status,
      projectUrl: adapter.projectUrl,
      license: adapter.license,
      licenseUrl: adapter.licenseUrl,
      installMode: adapter.installMode,
      risk: adapter.risk,
      capabilities: adapter.capabilities
    } : null,
    source: {
      adapterRegistrySchema: adapterRegistry.schema,
      runnerInvocationSchema: runnerInvocation.schema,
      runnerInvocationDecision: runnerInvocation.decision,
      runId: runnerInvocation.runId,
      operatorLocale: runnerInvocation.operatorLocale
    },
    decision,
    canStartExternalRunner,
    outputDir: normalizedOutputDir,
    taskDirectory,
    jobDirectory,
    tasks,
    blockers,
    summary: summarize(tasks, blockers),
    adapterContract,
    honestyClaim: {
      claim: "This package translates Naikaku coding-agent invocation contracts into reviewable external runner tasks without launching the runner.",
      limitations: [
        "It does not install, start, or control OpenHands, OpenClaw, browser-use, Playwright, Hammerspoon, E2B, MCP servers, Hermes, model providers, Git remotes, deploy targets, browsers, or macOS.",
        "A handoff-ready decision means the selected adapter is installed, license-reviewed, approved, compatible with coding work, and has task files to consume; it is not proof that code changed.",
        "Needs-license-review, needs-install, approval-required, no-ready-tasks, and blocked decisions must not be treated as execution permission."
      ],
      productionRequirements: [
        "Run the upstream adapter in a scoped workspace, container, browser profile, desktop sandbox, or Mac permission scope that matches the contract.",
        "Return a filled Naikaku receipt with changed files, command transcripts, artifact paths, risk notes, and stop reasons.",
        "Import receipt review, implementation evidence, artifact audit, and release verification before marking Development Board work done."
      ]
    }
  };
}

export function serializeExternalRunnerHandoff(handoff: ExternalRunnerHandoff) {
  return JSON.stringify(handoff, null, 2);
}

export function serializeExternalRunnerHandoffMarkdown(handoff: ExternalRunnerHandoff) {
  return [
    "# External Runner Handoff",
    "",
    `Generated: ${handoff.generatedAt}`,
    `Adapter: ${handoff.adapter ? `${handoff.adapter.label} (${handoff.adapter.id})` : "missing"}`,
    `Adapter status: ${handoff.adapter?.status ?? "missing"}`,
    `Decision: ${handoff.decision}`,
    `Can start external runner: ${handoff.canStartExternalRunner ? "yes" : "no"}`,
    `Output: ${handoff.outputDir}`,
    `Task directory: ${handoff.taskDirectory}`,
    `Job directory: ${handoff.jobDirectory}`,
    "",
    "## Honesty Boundary",
    "",
    `- ${handoff.honestyClaim.claim}`,
    ...handoff.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...handoff.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    "",
    "## Summary",
    "",
    `- Total tasks: ${handoff.summary.totalTasks}`,
    `- Invocation-ready tasks: ${handoff.summary.invocationReadyTasks}`,
    `- Handoff task files: ${handoff.summary.handoffTaskFiles}`,
    `- Adapter job files: ${handoff.summary.adapterJobFiles}`,
    `- Ready task files: ${handoff.summary.readyTaskFiles}`,
    `- Review-only task files: ${handoff.summary.reviewOnlyTaskFiles}`,
    `- Held tasks: ${handoff.summary.heldTasks}`,
    `- Blocked tasks: ${handoff.summary.blockedTasks}`,
    `- Blockers: ${handoff.summary.blockers}`,
    "",
    "## Blockers",
    "",
    ...(handoff.blockers.length
      ? handoff.blockers.map((blocker) =>
          `- ${blocker.id} (${blocker.severity}): ${blocker.summary} Next: ${blocker.nextAction}`
        )
      : ["- None"]),
    "",
    "## Adapter Contract",
    "",
    ...(handoff.adapterContract
      ? [
          `- Contract input: ${handoff.adapterContract.contractInput}`,
          `- Receipt output: ${handoff.adapterContract.receiptOutput}`,
          ...handoff.adapterContract.permissionsRequired.map((item) => `- Permission: ${item}`),
          ...handoff.adapterContract.prohibitedByDefault.map((item) => `- Prohibited by default: ${item}`),
          ...handoff.adapterContract.evidenceRequired.map((item) => `- Evidence: ${item}`),
          ...handoff.adapterContract.stopConditions.map((item) => `- Stop condition: ${item}`)
        ]
      : ["- Missing adapter"]),
    "",
    "## Tasks",
    "",
    ...handoff.tasks.flatMap((task, index) => [
      `### ${index + 1}. ${task.title}`,
      "",
      `- Session: ${task.sessionId}`,
      `- Status: ${task.status}`,
      `- Task file: ${task.taskPath ?? "not written"}`,
      `- Job file: ${task.jobPath ?? "not written"}`,
      `- Prompt: ${task.promptPath ?? "missing"}`,
      `- Receipt: ${task.receiptDraftPath ?? "missing"}`,
      `- Next action: ${task.nextAction}`,
      ""
    ])
  ].join("\n");
}

export function serializeExternalRunnerHandoffTaskMarkdown({
  handoff,
  task
}: {
  handoff: ExternalRunnerHandoff;
  task: ExternalRunnerHandoffTask;
}) {
  return [
    "# Naikaku External Runner Task",
    "",
    `Adapter: ${handoff.adapter ? `${handoff.adapter.label} (${handoff.adapter.id})` : "missing"}`,
    `Handoff decision: ${handoff.decision}`,
    `Task status: ${task.status}`,
    `Session: ${task.sessionId}`,
    `Title: ${task.title}`,
    `Source invocation: ${task.sourceInvocationPath ?? "missing"}`,
    `Prompt path: ${task.promptPath ?? "missing"}`,
    `Receipt draft path: ${task.receiptDraftPath ?? "missing"}`,
    `Executor profile: ${task.executorProfileId}`,
    `Runner id: ${task.runnerId}`,
    "",
    "## Adapter Instructions",
    "",
    ...task.adapterInstructions.map((instruction) => `- ${instruction}`),
    "",
    "## Planned Steps",
    "",
    ...task.plannedSteps.map((step) => `- ${step}`),
    "",
    "## Pending Commands",
    "",
    ...task.commands.map((command) =>
      `- ${command.command} -> transcript ${command.transcriptRef ?? "missing"}; exit code must be filled by the real runner`
    ),
    "",
    "## Evidence Required",
    "",
    ...task.expectedEvidenceArtifacts.map((artifact) => `- ${artifact.label}: ${artifact.path}`),
    "",
    "## Stop Conditions",
    "",
    ...task.stopConditions.map((condition) => `- ${condition}`),
    "",
    "## Return Contract",
    "",
    "- Fill the Naikaku receipt instead of returning only prose.",
    "- Include changed files, command exit codes, transcript artifact paths, evidence artifact paths, risk notes, and stop reason.",
    "- Do not push Git, deploy, send messages, open payment flows, dump secrets, or broaden filesystem/Desktop permissions unless a separate approval record exists."
  ].join("\n");
}

export function buildExternalRunnerAdapterJob({
  handoff,
  task
}: {
  handoff: ExternalRunnerHandoff;
  task: ExternalRunnerHandoffTask;
}): ExternalRunnerAdapterJob {
  if (!handoff.adapter) {
    throw new Error("Cannot build adapter job without a selected adapter.");
  }
  if (!task.taskPath) {
    throw new Error(`Cannot build adapter job for task without a task file: ${task.sessionId}`);
  }

  return {
    schema: "naikaku.external-runner-adapter-job.v1",
    generatedAt: handoff.generatedAt,
    adapterId: handoff.adapter.id,
    sessionId: task.sessionId,
    title: task.title,
    status: task.status,
    executable: handoff.canStartExternalRunner && task.status === "ready-for-adapter",
    taskPath: task.taskPath,
    sourceInvocationPath: task.sourceInvocationPath,
    promptPath: task.promptPath,
    receiptDraftPath: task.receiptDraftPath,
    commandPlan: commandPlanFor({
      adapterId: handoff.adapter.id,
      task,
      outputDir: handoff.outputDir
    }),
    evidence: {
      expectedArtifacts: task.expectedEvidenceArtifacts,
      receiptDraftPath: task.receiptDraftPath
    },
    restrictions: {
      prohibitedByDefault: handoff.adapterContract?.prohibitedByDefault ?? [],
      stopConditions: task.stopConditions
    }
  };
}

export function serializeExternalRunnerAdapterJob(job: ExternalRunnerAdapterJob) {
  return JSON.stringify(job, null, 2);
}

function blockersFor({
  adapter,
  runnerInvocation
}: {
  adapter: ExternalRunnerAdapter | null;
  runnerInvocation: CodingAgentRunnerInvocationPackage;
}): ExternalRunnerHandoffBlocker[] {
  const blockers: ExternalRunnerHandoffBlocker[] = [];
  if (!adapter) {
    blockers.push({
      id: "adapter-missing",
      severity: "block",
      summary: "The requested external runner adapter is not registered.",
      nextAction: "Choose an adapter id from the external runner adapter registry."
    });
    return blockers;
  }

  if (!isCodingCompatible(adapter)) {
    blockers.push({
      id: "adapter-not-compatible-with-coding-invocation",
      severity: "block",
      summary: `${adapter.label} is not a repository coding adapter for Naikaku runner invocation packages.`,
      nextAction: "Use OpenHands or the built-in local runner for coding tasks; use Mac runner contracts for desktop adapters."
    });
  }

  if (runnerInvocation.decision === "blocked") {
    blockers.push({
      id: "runner-invocation-blocked",
      severity: "block",
      summary: "The source runner invocation package is blocked.",
      nextAction: "Regenerate engineering:simulate and fix blocked invocation package checks before handoff."
    });
  }

  if (runnerInvocation.summary.readyInvocations === 0) {
    blockers.push({
      id: "no-ready-invocations",
      severity: "block",
      summary: "There are no invocation-ready coding tasks for an external runner.",
      nextAction: "Prepare or unblock coding-agent runner invocations first."
    });
  }

  if (adapter.status === "needs-license-review") {
    blockers.push({
      id: "adapter-license-review-required",
      severity: "review",
      summary: `${adapter.label} is listed as open source, but license and dependency notices must be reviewed before integration.`,
      nextAction: `Review ${adapter.licenseUrl}, then rerun with --license-reviewed ${adapter.id}.`
    });
  } else if (adapter.status === "needs-install") {
    blockers.push({
      id: "adapter-install-required",
      severity: "review",
      summary: `${adapter.label} is not marked as user-installed for this machine or workspace.`,
      nextAction: `Install the upstream runner separately, then rerun with --installed ${adapter.id}.`
    });
  } else if (adapter.status === "approval-required") {
    blockers.push({
      id: "adapter-approval-required",
      severity: "review",
      summary: `${adapter.label} needs explicit operator approval before Naikaku can mark handoff files as startable.`,
      nextAction: `Approve the adapter scope, then rerun with --approved ${adapter.id}.`
    });
  } else if (adapter.status === "blocked-by-default") {
    blockers.push({
      id: "adapter-blocked-by-default",
      severity: "block",
      summary: `${adapter.label} is blocked by default.`,
      nextAction: "Use a lower-risk adapter or update the registry only after a security review."
    });
  }

  return blockers;
}

function decisionFor({
  adapter,
  runnerInvocation,
  blockers
}: {
  adapter: ExternalRunnerAdapter | null;
  runnerInvocation: CodingAgentRunnerInvocationPackage;
  blockers: ExternalRunnerHandoffBlocker[];
}): ExternalRunnerHandoffDecision {
  if (!adapter || blockers.some((blocker) => blocker.severity === "block" && blocker.id !== "no-ready-invocations")) {
    return "blocked";
  }
  if (runnerInvocation.summary.readyInvocations === 0) return "no-ready-tasks";
  if (adapter.status === "needs-license-review") return "needs-license-review";
  if (adapter.status === "needs-install") return "needs-install";
  if (adapter.status === "approval-required") return "approval-required";
  if (adapter.status === "blocked-by-default") return "blocked";
  return "handoff-ready";
}

function taskFor({
  item,
  adapter,
  decision,
  taskDirectory,
  jobDirectory,
  taskIndex
}: {
  item: CodingAgentRunnerInvocationItem;
  adapter: ExternalRunnerAdapter | null;
  decision: ExternalRunnerHandoffDecision;
  taskDirectory: string;
  jobDirectory: string;
  taskIndex: number;
}): ExternalRunnerHandoffTask {
  const compatible = adapter ? isCodingCompatible(adapter) : false;
  const canWriteTask = item.invocationStatus === "invocation-ready" && compatible;
  const status: ExternalRunnerHandoffTaskStatus = item.invocationStatus !== "invocation-ready"
    ? item.invocationStatus === "blocked" ? "blocked" : "held"
    : !compatible ? "blocked"
      : decision === "handoff-ready" ? "ready-for-adapter"
        : "review-only";
  const taskPath = canWriteTask
    ? `${taskDirectory}/${String(taskIndex).padStart(2, "0")}-${safeFileStem(item.sessionId)}.md`
    : null;
  const jobPath = canWriteTask
    ? `${jobDirectory}/${String(taskIndex).padStart(2, "0")}-${safeFileStem(item.sessionId)}.json`
    : null;

  return {
    sessionId: item.sessionId,
    title: item.title,
    status,
    sourceInvocationPath: item.invocationPath,
    taskPath,
    jobPath,
    promptPath: item.promptPath,
    receiptDraftPath: item.receiptDraftPath,
    executorProfileId: item.executorProfileId,
    runnerId: item.runnerId,
    plannedSteps: item.plannedSteps,
    commands: item.commands,
    expectedEvidenceArtifacts: item.expectedEvidenceArtifacts,
    adapterInstructions: adapterInstructionsFor({ adapter, item, decision }),
    stopConditions: item.stopConditions,
    nextAction: nextActionFor({ status, adapter, decision })
  };
}

function commandPlanFor({
  adapterId,
  task,
  outputDir
}: {
  adapterId: ExternalRunnerAdapterId;
  task: ExternalRunnerHandoffTask;
  outputDir: string;
}) {
  const transcriptStem = `${outputDir}/adapter-run/transcripts/${safeFileStem(task.sessionId)}`;
  const taskPath = task.taskPath ?? "";
  if (adapterId === "openhands-coding-agent") {
    return {
      command: "openhands",
      args: ["--always-approve", "-f", taskPath],
      workingDirectory: ".",
      stdin: null,
      stdoutTranscriptPath: `${transcriptStem}.stdout.log`,
      stderrTranscriptPath: `${transcriptStem}.stderr.log`
    };
  }
  return {
    command: "naikaku-adapter",
    args: ["--task", taskPath],
    workingDirectory: ".",
    stdin: null,
    stdoutTranscriptPath: `${transcriptStem}.stdout.log`,
    stderrTranscriptPath: `${transcriptStem}.stderr.log`
  };
}

function isCodingCompatible(adapter: ExternalRunnerAdapter) {
  return adapter.capabilities.includes("repo-coding") || adapter.capabilities.includes("allowlisted-shell");
}

function adapterInstructionsFor({
  adapter,
  item,
  decision
}: {
  adapter: ExternalRunnerAdapter | null;
  item: CodingAgentRunnerInvocationItem;
  decision: ExternalRunnerHandoffDecision;
}) {
  if (!adapter) {
    return ["No adapter is registered; do not start an external runner."];
  }

  const base = [
    `Consume the Naikaku runner invocation at ${item.invocationPath ?? "the attached package"} and preserve schema keys, commands, paths, and locale.`,
    `Read the task prompt from ${item.promptPath ?? "the prompt path in the invocation"} and write the completed receipt to ${item.receiptDraftPath ?? "the receipt draft path"}.`,
    "Work only inside the scoped repository or sandbox workspace granted to this adapter.",
    "Run only the pending command contracts listed in this task unless a separate approval expands the allowlist.",
    "Write command transcripts and evidence artifacts under the session evidence prefix before claiming completion.",
    "Stop before Git push, deploy, external sends, payments, credential prompts, host-secret reads, or unapproved network targets."
  ];

  const adapterSpecific = adapter.id === "openhands-coding-agent"
    ? [
        "Run OpenHands as a user-installed upstream coding agent in a container or scoped workspace.",
        "Naikaku's adapter bridge can invoke the OpenHands CLI with this task file; do not give OpenHands broader host authority than the contract."
      ]
    : adapter.id === "naikaku-local-engineering-runner"
      ? [
          "Use the built-in local runner only for explicit patch files and allowlisted verification commands.",
          "Without a patch file, local execution can prove command execution but not implementation completion."
        ]
      : [
          `${adapter.label} must be wrapped as a scoped adapter process before it consumes this task.`
        ];

  return decision === "handoff-ready"
    ? [...base, ...adapterSpecific]
    : [
        "Review-only package: do not start the external runner until the handoff decision is handoff-ready.",
        ...base,
        ...adapterSpecific
      ];
}

function nextActionFor({
  status,
  adapter,
  decision
}: {
  status: ExternalRunnerHandoffTaskStatus;
  adapter: ExternalRunnerAdapter | null;
  decision: ExternalRunnerHandoffDecision;
}) {
  if (!adapter) return "Choose a registered adapter.";
  if (status === "held") return "Fix or review the held invocation before creating an adapter task.";
  if (status === "blocked") return "Use a compatible coding adapter or unblock the source invocation.";
  if (status === "ready-for-adapter") return `Start ${adapter.label} inside the approved scope and return a Naikaku receipt.`;
  if (decision === "needs-license-review") return `Review ${adapter.licenseUrl} and rerun with --license-reviewed ${adapter.id}.`;
  if (decision === "needs-install") return `Install ${adapter.label} and rerun with --installed ${adapter.id}.`;
  if (decision === "approval-required") return `Approve ${adapter.label} scope and rerun with --approved ${adapter.id}.`;
  return "Review blockers before starting the adapter.";
}

function summarize(tasks: ExternalRunnerHandoffTask[], blockers: ExternalRunnerHandoffBlocker[]) {
  return {
    totalTasks: tasks.length,
    invocationReadyTasks: tasks.filter((task) => task.sourceInvocationPath).length,
    handoffTaskFiles: tasks.filter((task) => task.taskPath).length,
    adapterJobFiles: tasks.filter((task) => task.jobPath).length,
    readyTaskFiles: tasks.filter((task) => task.status === "ready-for-adapter" && task.taskPath).length,
    reviewOnlyTaskFiles: tasks.filter((task) => task.status === "review-only" && task.taskPath).length,
    heldTasks: tasks.filter((task) => task.status === "held").length,
    blockedTasks: tasks.filter((task) => task.status === "blocked").length,
    blockers: blockers.length
  };
}

function safeFileStem(value: string) {
  const stem = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return stem || "session";
}
