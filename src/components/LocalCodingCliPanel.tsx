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
  mission: string;
  selectedPreset: EngineeringAutoWorkGatewayPreset;
  adapterApproved: boolean;
  runnerReadinessState: {
    status: "idle" | "loading" | "ready" | "error";
    message: string;
    report: EngineeringRunnerReadinessReport | null;
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
  mission,
  selectedPreset,
  adapterApproved,
  runnerReadinessState,
  runnerPresetTemplates,
  runnerPresetEnableState,
  autoWorkState,
  onRefresh,
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
  const canRun =
    Boolean(mission.trim()) &&
    selectedRunnable &&
    adapterApproved &&
    autoWorkState.status !== "running";

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
          disabled={runnerReadinessState.status === "loading"}
        >
          <RefreshCcw size={16} />
          {runnerReadinessState.status === "loading"
            ? copy.checking
            : copy.refresh}
        </button>
      </header>

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
                    disabled={!detected || active}
                  >
                    {active ? <CheckCircle2 size={15} /> : <Terminal size={15} />}
                    {active ? copy.enabled : copy.select}
                  </button>
                ) : detected ? (
                  <button
                    type="button"
                    onClick={() => onEnable(template.id)}
                    disabled={runnerPresetEnableState.status === "loading"}
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
        {!mission.trim() ? <p>{copy.taskRequired}</p> : null}
        <label>
          <input
            type="checkbox"
            checked={adapterApproved}
            disabled={!selectedRunnable || autoWorkState.status === "running"}
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
          {autoWorkState.status === "running" ? copy.running : copy.run}
        </button>
        {autoWorkState.message ? (
          <output data-status={autoWorkState.status}>
            <strong>{copy.result}</strong> {autoWorkState.message}
          </output>
        ) : null}
      </div>

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
