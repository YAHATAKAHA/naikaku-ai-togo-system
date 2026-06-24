import { ArrowRight, CheckCircle2, Gauge, Layers3 } from "lucide-react";
import { cabinetStages } from "../data/defaultCabinet";
import type { CabinetRole, CabinetRun, SandboxPolicy } from "../domain/types";

interface MissionControlProps {
  mission: string;
  onMissionChange: (mission: string) => void;
  run: CabinetRun | null;
  roles: CabinetRole[];
  sandboxPolicy: SandboxPolicy;
}

export function MissionControl({
  mission,
  onMissionChange,
  run,
  roles,
  sandboxPolicy
}: MissionControlProps) {
  return (
    <section className="mission-panel">
      <div className="mission-input-row">
        <label htmlFor="mission">Mission brief</label>
        <textarea
          id="mission"
          value={mission}
          onChange={(event) => onMissionChange(event.target.value)}
          rows={4}
        />
      </div>

      <div className="stage-track" aria-label="Cabinet stage track">
        {cabinetStages.map((stage, index) => {
          const owner = roles.find((role) => role.id === stage.ownerRoleId);
          const artifact = run?.artifacts.find((candidate) => candidate.stageId === stage.id);
          return (
            <article className="stage-node" data-complete={Boolean(artifact)} key={stage.id}>
              <div className="stage-index">{artifact ? <CheckCircle2 size={16} /> : index + 1}</div>
              <div>
                <strong>{stage.label}</strong>
                <span>{owner?.name || "Unassigned"}</span>
              </div>
              {index < cabinetStages.length - 1 ? <ArrowRight className="stage-arrow" size={15} /> : null}
            </article>
          );
        })}
      </div>

      <div className="artifact-grid">
        {(run?.artifacts || previewArtifacts()).map((artifact) => (
          <article className="artifact" key={artifact.id}>
            <div className="artifact-title">
              <Layers3 size={16} />
              <strong>{artifact.title}</strong>
            </div>
            <p>{artifact.body}</p>
            <span className="risk-chip" data-risk={artifact.riskLevel}>{artifact.riskLevel}</span>
          </article>
        ))}
      </div>

      <div className="score-grid">
        <ScoreCard label="Readiness" value={run?.score.readiness || 0} />
        <ScoreCard label="Safety" value={run?.score.safety || (sandboxPolicy.killSwitchArmed ? 86 : 42)} />
        <ScoreCard label="Execution" value={run?.score.execution || 0} />
        <ScoreCard label="Critique" value={run?.score.critique || 0} />
      </div>
    </section>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="score-card">
      <div>
        <Gauge size={15} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <meter min="0" max="100" value={value} />
    </article>
  );
}

function previewArtifacts() {
  return cabinetStages.slice(0, 3).map((stage, index) => ({
    id: `preview-${stage.id}`,
    stageId: stage.id,
    roleId: stage.ownerRoleId,
    title: `${stage.label}: waiting for run`,
    body: "Run the cabinet to generate an auditable artifact for this stage.",
    riskLevel: index === 2 ? "high" : "medium",
    scoreImpact: 0
  }));
}
