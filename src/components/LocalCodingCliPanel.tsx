import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Play,
  RefreshCcw,
  Terminal,
  Wrench,
} from "lucide-react";
import type {
  EngineeringAutoWorkGatewayPreset,
  EngineeringAutoWorkGatewayResponse,
  EngineeringRunnerPresetTemplate,
  EngineeringRunnerReadinessReport,
} from "../domain/gatewayClient";
import type { LocalCodingCliCopy } from "../i18n";

interface LocalCodingCliPanelProps {
  copy: LocalCodingCliCopy;
  taskLabel: string;
  taskPlaceholder: string;
  mission: string;
  worktree: string;
  selectedPreset: EngineeringAutoWorkGatewayPreset;
  adapterApproved: boolean;
  runnerReadinessState: {
    status: "idle" | "loading" | "ready" | "error";
    message: string;
    report: EngineeringRunnerReadinessReport | null;
    gatewayUnavailable: boolean;
  };
  runnerPresetTemplates: EngineeringRunnerPresetTemplate[];
  runnerPresetEnableState: {
    status: "idle" | "loading" | "ready" | "error";
    message: string;
  };
  autoWorkState: {
    status: "idle" | "running" | "completed" | "error";
    message: string;
    result: EngineeringAutoWorkGatewayResponse | null;
  };
  onRefresh: () => void;
  onMissionChange: (mission: string) => void;
  onWorktreeChange: (worktree: string) => void;
  onEnable: (templateId: string) => void;
  onSelect: (preset: EngineeringAutoWorkGatewayPreset) => void;
  onApprovalChange: (approved: boolean) => void;
  onRun: () => void;
  onOpenDetails: () => void;
}

const localTemplateIds = [
  "codex-cli-local",
  "claude-code-local",
  "qwen-code-local",
];

export function LocalCodingCliPanel({
  copy,
  taskLabel,
  taskPlaceholder,
  mission,
  worktree,
  selectedPreset,
  adapterApproved,
  runnerReadinessState,
  runnerPresetTemplates,
  runnerPresetEnableState,
  autoWorkState,
  onRefresh,
  onMissionChange,
  onWorktreeChange,
  onEnable,
  onSelect,
  onApprovalChange,
  onRun,
  onOpenDetails,
}: LocalCodingCliPanelProps) {
  const templates = localTemplateIds.flatMap((id) => {
    const template = runnerPresetTemplates.find((item) => item.id === id);
    return template ? [template] : [];
  });
  const readinessItems = runnerReadinessState.report?.items || [];
  const selectedTemplate = templates.find((item) => item.id === selectedPreset);
  const selectedReadiness = selectedTemplate
    ? readinessItems.find((item) => item.adapterId === selectedTemplate.adapterId)
    : undefined;
  const selectedDetected = Boolean(selectedReadiness?.detectedCommands.length);
  const selectedRunnable = Boolean(selectedTemplate?.enabled && selectedDetected);
  const running = autoWorkState.status === "running";
  const canRun =
    Boolean(mission.trim()) &&
    Boolean(worktree.trim()) &&
    selectedRunnable &&
    adapterApproved &&
    !running;

  return (
    <section className="local-coding-cli-panel">
      <header className="local-coding-cli-header">
        <div>
          <p className="section-kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={onRefresh}
          disabled={running || runnerReadinessState.status === "loading"}
        >
          <RefreshCcw size={16} />
          {runnerReadinessState.status === "loading"
            ? copy.checking
            : copy.refresh}
        </button>
      </header>

      <div className="local-coding-cli-fields">
        <label htmlFor="local-cli-mission">{taskLabel}</label>
        <textarea
          id="local-cli-mission"
          value={mission}
          placeholder={taskPlaceholder}
          rows={3}
          disabled={running}
          onChange={(event) => onMissionChange(event.target.value)}
        />
        <label htmlFor="local-cli-worktree">{copy.worktreeLabel}</label>
        <input
          id="local-cli-worktree"
          value={worktree}
          aria-describedby="local-cli-worktree-hint"
          disabled={running}
          spellCheck={false}
          onChange={(event) => onWorktreeChange(event.target.value)}
        />
        <small id="local-cli-worktree-hint">{copy.worktreeHint}</small>
      </div>

      <div className="local-coding-cli-boundaries">
        <span>
          <CheckCircle2 size={15} /> {copy.credentialBoundary}
        </span>
        <span>
          <CircleAlert size={15} /> {copy.scopeBoundary}
        </span>
      </div>

      <p className="local-coding-cli-status">
        {runnerReadinessState.message || copy.idle}
      </p>

      {runnerReadinessState.gatewayUnavailable ? (
        <aside className="local-coding-cli-recovery" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>{copy.gatewayUnavailableTitle}</strong>
            <p>{copy.gatewayUnavailableBody}</p>
            <code>{copy.gatewayStartCommand}</code>
          </div>
        </aside>
      ) : (
        <>
          <div className="local-coding-cli-list" aria-live="polite">
            {templates.map((template) => {
              const readiness = readinessItems.find(
                (item) => item.adapterId === template.adapterId,
              );
              const detected = Boolean(readiness?.detectedCommands.length);
              const active = selectedPreset === template.id;
              const status = readiness?.status || "missing";

              return (
                <article
                  className="local-coding-cli-option"
                  data-active={active}
                  data-status={status}
                  key={template.id}
                >
                  <div className="local-coding-cli-option-heading">
                    <span className="local-coding-cli-icon">
                      <Terminal size={17} />
                    </span>
                    <div>
                      <strong>{template.label}</strong>
                      <small>{copy.status(status)}</small>
                    </div>
                  </div>
                  <p>{detected ? copy.detected : copy.missing}</p>
                  {template.id === "qwen-code-local" && !detected ? (
                    <em>{copy.qwenSetup}</em>
                  ) : null}
                  <div className="local-coding-cli-option-actions">
                    {template.enabled ? (
                      <button
                        type="button"
                        onClick={() => onSelect(template.id)}
                        disabled={running || !detected || active}
                      >
                        {active ? <CheckCircle2 size={15} /> : <Terminal size={15} />}
                        {active ? copy.enabled : copy.select}
                      </button>
                    ) : detected ? (
                      <button
                        type="button"
                        onClick={() => onEnable(template.id)}
                        disabled={running || runnerPresetEnableState.status === "loading"}
                      >
                        <Wrench size={15} /> {copy.enable}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="local-coding-cli-start">
            {runnerPresetEnableState.status === "error" ? (
              <p role="alert">{runnerPresetEnableState.message}</p>
            ) : null}
            <label>
              <input
                type="checkbox"
                checked={adapterApproved}
                disabled={!selectedRunnable || !mission.trim() || !worktree.trim() || running}
                onChange={(event) => onApprovalChange(event.target.checked)}
              />
              <span>{copy.approval}</span>
            </label>
            <button
              className="primary-button"
              type="button"
              onClick={onRun}
              disabled={!canRun}
            >
              <Play size={16} />
              {running ? copy.running : copy.run}
            </button>
            {autoWorkState.message ? (
              <output data-status={autoWorkState.status} role="status">
                <strong>{copy.result}</strong> {autoWorkState.message}
                {autoWorkState.result?.ok ? (
                  <code>{autoWorkState.result.summaryPath}</code>
                ) : null}
              </output>
            ) : null}
          </div>
        </>
      )}

      <button
        className="local-coding-cli-details"
        type="button"
        onClick={onOpenDetails}
      >
        {copy.openDetails} <ArrowRight size={15} />
      </button>
    </section>
  );
}
