import { useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  CircleStop,
  Cpu,
  FileKey2,
  GitBranch,
  Play,
  RefreshCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import { MissionControl } from "./components/MissionControl";
import { RoleInspector } from "./components/RoleInspector";
import { RoleRail } from "./components/RoleRail";
import { RunLog } from "./components/RunLog";
import { SandboxPanel } from "./components/SandboxPanel";
import { createDefaultWorkspace, loadWorkspace, saveWorkspace } from "./domain/storage";
import { runCabinetMission } from "./domain/orchestrator";
import type { CabinetRole, CabinetRun } from "./domain/types";

export function App() {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [selectedRoleId, setSelectedRoleId] = useState(workspace.roles[0]?.id || "");
  const [sessionSecrets, setSessionSecrets] = useState<Record<string, string>>({});
  const [run, setRun] = useState<CabinetRun | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  const selectedRole = useMemo(
    () => workspace.roles.find((role) => role.id === selectedRoleId) || workspace.roles[0],
    [selectedRoleId, workspace.roles]
  );

  const activeRoles = workspace.roles.filter((role) => role.enabled);

  function updateRole(roleId: string, patch: Partial<CabinetRole>) {
    setWorkspace((current) => ({
      ...current,
      roles: current.roles.map((role) =>
        role.id === roleId
          ? {
              ...role,
              ...patch,
              provider: {
                ...role.provider,
                ...(patch.provider || {})
              },
              permissions: {
                ...role.permissions,
                ...(patch.permissions || {})
              }
            }
          : role
      )
    }));
  }

  function updateSecret(roleId: string, value: string) {
    setSessionSecrets((current) => ({
      ...current,
      [roleId]: value
    }));
  }

  function runCabinet() {
    const nextRun = runCabinetMission(workspace);
    setRun(nextRun);
  }

  function persistWorkspace() {
    saveWorkspace(workspace);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1400);
  }

  function resetWorkspace() {
    const next = createDefaultWorkspace();
    setWorkspace(next);
    setSelectedRoleId(next.roles[0].id);
    setRun(null);
    setSessionSecrets({});
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <GitBranch size={19} />
          </div>
          <div>
            <strong>Naikaku AI Togo</strong>
            <span>Cabinet orchestration workbench</span>
          </div>
        </div>
        <nav className="topbar-nav" aria-label="Workspace status">
          <span>
            <Brain size={15} /> {activeRoles.length} roles active
          </span>
          <span>
            <Shield size={15} /> sandbox first
          </span>
          <span>
            <FileKey2 size={15} /> secrets session-only
          </span>
        </nav>
        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={resetWorkspace} aria-label="Reset workspace">
            <RefreshCcw size={17} />
          </button>
          <button className="secondary-button" type="button" onClick={persistWorkspace}>
            {saveState === "saved" ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveState === "saved" ? "Saved" : "Save"}
          </button>
          <button className="primary-button" type="button" onClick={runCabinet}>
            <Play size={16} /> Run cabinet
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <RoleRail
          roles={workspace.roles}
          selectedRoleId={selectedRole?.id || ""}
          onSelect={setSelectedRoleId}
          onToggle={(roleId, enabled) => updateRole(roleId, { enabled })}
        />

        <section className="center-column">
          <section className="mission-header">
            <div>
              <p className="section-kicker">Mission automation</p>
              <h1>Plan, act, audit, score, and iterate inside a governed sandbox.</h1>
            </div>
            <div className="decision-tile" data-decision={run?.score.decision || "idle"}>
              <span>Decision</span>
              <strong>{run?.score.decision || "not run"}</strong>
            </div>
          </section>

          <MissionControl
            mission={workspace.mission}
            onMissionChange={(mission) => setWorkspace((current) => ({ ...current, mission }))}
            run={run}
            roles={workspace.roles}
            sandboxPolicy={workspace.sandboxPolicy}
          />

          <SandboxPanel
            policy={workspace.sandboxPolicy}
            onChange={(sandboxPolicy) => setWorkspace((current) => ({ ...current, sandboxPolicy }))}
          />
        </section>

        <RoleInspector
          role={selectedRole}
          sessionSecret={sessionSecrets[selectedRole?.id || ""] || ""}
          onSecretChange={(value) => selectedRole && updateSecret(selectedRole.id, value)}
          onChange={(patch) => selectedRole && updateRole(selectedRole.id, patch)}
        />
      </section>

      <footer className="operator-footer">
        <RunLog run={run} />
        <section className="footer-panel">
          <div className="panel-heading">
            <span>
              <Activity size={15} /> Automation posture
            </span>
            <strong>{workspace.sandboxPolicy.killSwitchArmed ? "armed" : "open"}</strong>
          </div>
          <div className="metric-strip">
            <Metric icon={<Cpu size={16} />} label="Executors" value="5 profiles" />
            <Metric icon={<SlidersHorizontal size={16} />} label="Allowlist" value={`${workspace.sandboxPolicy.networkAllowlist.length} domains`} />
            <Metric icon={<CircleStop size={16} />} label="Blocked" value={`${workspace.sandboxPolicy.blockedActions.length} actions`} />
            <Metric icon={<Sparkles size={16} />} label="Next loop" value={run ? `${run.nextIteration.length} tasks` : "pending"} />
          </div>
        </section>
      </footer>
    </main>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
