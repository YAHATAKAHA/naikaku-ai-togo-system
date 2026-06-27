import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Terminal
} from "lucide-react";
import type {
  CabinetRun,
  CodingAgentBriefs,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle,
  DevelopmentIssueDrafts
} from "../domain/types";
import type { EngineeringLaunchpadCopy } from "../i18n";

interface EngineeringLaunchpadProps {
  copy: EngineeringLaunchpadCopy;
  activeRoles: number;
  run: CabinetRun | null;
  briefs: CodingAgentBriefs;
  sessionBundle: CodingAgentSessionBundle | null;
  runnerManifest: CodingAgentRunnerManifest | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  issueDrafts: DevelopmentIssueDrafts;
  runStatus: string;
  onFocusMission: () => void;
  onRunCabinet: () => void;
  onPrepareEngineeringPack: () => void;
  onRunPreflight: () => void;
  onRunSandbox: () => void;
  onExportIssueScript: () => void;
}

export function EngineeringLaunchpad({
  copy,
  activeRoles,
  run,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  issueDrafts,
  runStatus,
  onFocusMission,
  onRunCabinet,
  onPrepareEngineeringPack,
  onRunPreflight,
  onRunSandbox,
  onExportIssueScript
}: EngineeringLaunchpadProps) {
  const readySessions = sessionBundle?.summary.ready || 0;
  const heldSessions = sessionBundle?.summary.held || 0;
  const runnerTasks = runnerManifest?.summary.runnerTasks || 0;
  const canRunSandbox = Boolean(
    runnerSelfTest?.decision === "self-test-ready" &&
    (!sandboxRunnerPreflight || sandboxRunnerPreflight.decision === "ready")
  );
  const state = launchState({
    run,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport
  });

  return (
    <section className="engineering-launchpad-panel" data-state={state}>
      <div className="engineering-launchpad-header">
        <div>
          <span>
            <Bot size={15} /> {copy.kicker}
          </span>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="engineering-launchpad-state">
          <small>{copy.stateLabel}</small>
          <strong>{copy.state(state)}</strong>
        </div>
      </div>

      <div className="engineering-launchpad-metrics" aria-label={copy.metricsLabel}>
        <span>{copy.roles(activeRoles)}</span>
        <span>{copy.briefs(briefs.summary.total, briefs.summary.implementable)}</span>
        <span>{copy.sessions(readySessions, heldSessions)}</span>
        <span>{copy.runner(runnerTasks, runnerSelfTest?.decision || "not-ready")}</span>
      </div>

      <div className="engineering-action-row">
        <button type="button" onClick={onFocusMission}>
          <ClipboardCheck size={15} /> {copy.focusMission}
        </button>
        <button type="button" onClick={onRunCabinet} disabled={runStatus === "running"}>
          <PlayCircle size={15} /> {copy.runCabinet}
        </button>
        <button type="button" onClick={onPrepareEngineeringPack} disabled={!briefs.briefs.length}>
          <PackageCheck size={15} /> {copy.preparePack}
        </button>
        <button type="button" onClick={onRunPreflight} disabled={!runnerSelfTest}>
          <ShieldCheck size={15} /> {copy.preflight}
        </button>
        <button type="button" onClick={onRunSandbox} disabled={!canRunSandbox}>
          <Terminal size={15} /> {copy.runSandbox}
        </button>
        <button type="button" onClick={onExportIssueScript} disabled={!issueDrafts.drafts.length}>
          <CheckCircle2 size={15} /> {copy.exportIssues}
        </button>
      </div>

      <div className="engineering-flow-grid">
        {copy.steps.map((step, index) => (
          <article className="engineering-flow-step" data-ready={stepReady(index, state)} key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </div>

      <div className="engineering-permission-grid">
        {copy.permissionGroups.map((group) => (
          <article className="engineering-permission-card" key={group.title}>
            <strong>{group.title}</strong>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function launchState({
  run,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport
}: {
  run: CabinetRun | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
}) {
  if (sandboxRunnerReport?.decision === "sandbox-runner-verified") return "runner-verified";
  if (sandboxRunnerReport) return "runner-needs-review";
  if (sandboxRunnerPreflight?.decision === "ready") return "ready-to-run";
  if (runnerSelfTest?.decision === "self-test-ready") return "runner-ready";
  if (runnerSelfTest) return "runner-needs-review";
  if (run) return "cabinet-ready";
  return "needs-mission";
}

function stepReady(index: number, state: string) {
  const progress: Record<string, number> = {
    "needs-mission": 0,
    "cabinet-ready": 1,
    "runner-needs-review": 2,
    "runner-ready": 3,
    "ready-to-run": 4,
    "runner-verified": 5
  };
  return (progress[state] || 0) > index;
}
