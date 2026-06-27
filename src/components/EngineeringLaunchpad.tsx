import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Terminal,
  WandSparkles
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
import type { EngineeringLaunchProfile } from "../domain/engineeringLaunchProfile";
import type { EngineeringLaunchpadCopy } from "../i18n";

interface EngineeringLaunchpadProps {
  copy: EngineeringLaunchpadCopy;
  activeRoles: number;
  run: CabinetRun | null;
  profile: EngineeringLaunchProfile;
  briefs: CodingAgentBriefs;
  sessionBundle: CodingAgentSessionBundle | null;
  runnerManifest: CodingAgentRunnerManifest | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  issueDrafts: DevelopmentIssueDrafts;
  runStatus: string;
  onFocusMission: () => void;
  onApplyMissionTemplate: () => void;
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
  profile,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  issueDrafts,
  runStatus,
  onFocusMission,
  onApplyMissionTemplate,
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

      <div className="engineering-profile-grid">
        <article>
          <small>{copy.permissionModeLabel}</small>
          <strong>{copy.permissionMode(profile.permissionMode)}</strong>
        </article>
        <article>
          <small>{copy.launchStageLabel}</small>
          <strong>{copy.launchStage(profile.stage)}</strong>
        </article>
        <article>
          <small>{copy.nextActionLabel}</small>
          <strong>{copy.nextAction(profile.nextAction)}</strong>
        </article>
      </div>

      <div className="engineering-mission-draft-grid" aria-label={copy.missionDraftLabel}>
        <article className="engineering-mission-draft-score">
          <small>{copy.missionDraftLabel}</small>
          <strong>
            {copy.missionDraftScore(
              profile.missionDraft.score,
              profile.missionDraft.present,
              profile.missionDraft.missing,
              profile.missionDraft.recommended
            )}
          </strong>
        </article>
        <div>
          {profile.missionDraft.items.map((item) => (
            <span data-status={item.status} key={item.id}>
              {copy.missionDraftItem(item.id)}
              <small>{copy.missionDraftStatus(item.status)}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="engineering-capability-strip" aria-label={copy.capabilitiesLabel}>
        {profile.capabilities.map((capability) => (
          <span
            data-status={capability.status}
            key={capability.id}
            title={capability.reason}
          >
            {copy.capability(capability.id)}
            <small>{copy.capabilityStatus(capability.status)}</small>
          </span>
        ))}
      </div>

      <div className="engineering-signal-strip" aria-label={copy.signalsLabel}>
        {profile.signals.map((signal) => (
          <span key={signal}>{copy.signal(signal)}</span>
        ))}
      </div>

      <div className="engineering-unlock-list" aria-label={copy.unlockChecklistLabel}>
        {profile.unlockChecklist.map((item) => (
          <article data-status={item.status} key={item.id}>
            <strong>{copy.unlockItem(item.id, item.count)}</strong>
            <small>{copy.unlockStatus(item.status)}</small>
          </article>
        ))}
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
        <button type="button" onClick={onApplyMissionTemplate}>
          <WandSparkles size={15} /> {copy.applyMissionTemplate}
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
