import {
  ArrowRight,
  KeyRound,
  Play,
  Settings2,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { QuickStartCopy } from "../i18n";
import type { CabinetRun } from "../domain/types";

interface QuickStartPanelProps {
  copy: QuickStartCopy;
  mission: string;
  activeRoles: number;
  run: CabinetRun | null;
  runState: {
    status: string;
    message: string;
  };
  onMissionChange: (mission: string) => void;
  onRunDry: () => void;
  onOpenProviders: () => void;
  onOpenEngineering: () => void;
  onOpenCabinet: () => void;
  onOpenAdvanced: () => void;
}

export function QuickStartPanel({
  copy,
  mission,
  activeRoles,
  run,
  runState,
  onMissionChange,
  onRunDry,
  onOpenProviders,
  onOpenEngineering,
  onOpenCabinet,
  onOpenAdvanced,
}: QuickStartPanelProps) {
  const isRunning = runState.status === "running";

  return (
    <section className="quick-start-panel">
      <header className="quick-start-header">
        <div>
          <p className="section-kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <span className="quick-start-role-count">
          {copy.cabinetRoles(activeRoles)}
        </span>
      </header>

      <div className="quick-start-composer">
        <label htmlFor="quick-start-mission">{copy.missionLabel}</label>
        <textarea
          id="quick-start-mission"
          value={mission}
          rows={7}
          placeholder={copy.missionPlaceholder}
          onChange={(event) => onMissionChange(event.target.value)}
        />
        <p>{copy.missionHelp}</p>
        <div className="quick-start-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!mission.trim() || isRunning}
            onClick={onRunDry}
          >
            <Play size={16} /> {isRunning ? copy.running : copy.runDry}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenProviders}
          >
            <KeyRound size={16} /> {copy.connectApi}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenEngineering}
          >
            <Terminal size={16} /> {copy.localCli}
          </button>
        </div>
      </div>

      <div className="quick-start-boundary">
        <ShieldCheck size={18} />
        <p>{copy.safetyBoundary}</p>
        <button type="button" onClick={onOpenAdvanced}>
          <Settings2 size={15} /> {copy.advanced}
        </button>
      </div>

      {run ? (
        <section
          className="quick-start-result"
          data-decision={run.score.decision}
        >
          <div>
            <span>{copy.resultTitle}</span>
            <strong>{copy.resultDecision(run.score.decision)}</strong>
            <p>{copy.resultSummary(run.artifacts.length)}</p>
          </div>
          <div>
            <small data-status={runState.status}>{runState.message}</small>
            <button type="button" onClick={onOpenCabinet}>
              {copy.inspectResult} <ArrowRight size={15} />
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
