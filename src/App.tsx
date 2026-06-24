import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Download,
  CircleStop,
  Cloud,
  Cpu,
  FileKey2,
  GitBranch,
  Play,
  RefreshCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Upload
} from "lucide-react";
import { AutomationQueue } from "./components/AutomationQueue";
import { MissionControl } from "./components/MissionControl";
import { RoleInspector } from "./components/RoleInspector";
import { RoleRail } from "./components/RoleRail";
import { RunLog } from "./components/RunLog";
import { SandboxPanel } from "./components/SandboxPanel";
import {
  addRunHistoryItem,
  clearCurrentRun,
  clearRunHistory,
  createDefaultWorkspace,
  loadApprovalRecords,
  loadCurrentRun,
  loadRunHistory,
  loadWorkspace,
  parseWorkspaceExport,
  saveApprovalRecord,
  saveCurrentRun,
  saveWorkspace,
  serializeRunBundle,
  serializeWorkspace
} from "./domain/storage";
import { approvalRecordsByActionId, buildExecutorHandoff, createApprovalRecord } from "./domain/automation";
import { runCabinetMission } from "./domain/orchestrator";
import { gatewayBaseUrl, runCabinetViaGateway } from "./domain/gatewayClient";
import type {
  AutomationAction,
  AutomationApprovalDecision,
  AutomationApprovalRecord,
  CabinetRole,
  CabinetRun,
  RunHistoryItem
} from "./domain/types";
import type { CabinetRunMode } from "./domain/types";

export function App() {
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [selectedRoleId, setSelectedRoleId] = useState(workspace.roles[0]?.id || "");
  const [sessionSecrets, setSessionSecrets] = useState<Record<string, string>>({});
  const [run, setRun] = useState<CabinetRun | null>(() => loadCurrentRun());
  const [runMode, setRunMode] = useState<CabinetRunMode>("dry-run");
  const [approvalRecords, setApprovalRecords] = useState<AutomationApprovalRecord[]>([]);
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>(() => loadRunHistory());
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [runState, setRunState] = useState<{
    status: "idle" | "running" | "gateway" | "fallback" | "local" | "error";
    message: string;
  }>({ status: "idle", message: "Gateway ready when local service is running." });
  const [exportLink, setExportLink] = useState<{ href: string; fileName: string } | null>(null);
  const [handoffLink, setHandoffLink] = useState<{ href: string; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedRole = useMemo(
    () => workspace.roles.find((role) => role.id === selectedRoleId) || workspace.roles[0],
    [selectedRoleId, workspace.roles]
  );

  const activeRoles = workspace.roles.filter((role) => role.enabled);
  const approvalRecordsByAction = useMemo(
    () => Object.fromEntries(approvalRecordsByActionId(approvalRecords)),
    [approvalRecords]
  );
  const readyActionCount = useMemo(
    () =>
      run
        ? buildExecutorHandoff({
            run,
            approvalRecords,
            createdAt: run.completedAt
          }).readyActions.length
        : 0,
    [approvalRecords, run]
  );

  useEffect(() => {
    return () => {
      if (exportLink) {
        URL.revokeObjectURL(exportLink.href);
      }
    };
  }, [exportLink]);

  useEffect(() => {
    return () => {
      if (handoffLink) {
        URL.revokeObjectURL(handoffLink.href);
      }
    };
  }, [handoffLink]);

  useEffect(() => {
    setApprovalRecords(run ? loadApprovalRecords(run.id) : []);
    setHandoffLink(null);
  }, [run?.id]);

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

  async function runCabinet() {
    setRunState({
      status: "running",
      message: `Calling local gateway at ${gatewayBaseUrl()}...`
    });
    try {
      const result = await runCabinetViaGateway(workspace, runMode);
      setRun(result.run);
      saveCurrentRun(result.run);
      setRunHistory((current) => addRunHistoryItem(result.run, result.source, current));
      setRunState({
        status: "gateway",
        message: `Run completed through the local gateway in ${runMode} mode.`
      });
    } catch (error) {
      const fallbackRun = runCabinetMission(workspace);
      setRun(fallbackRun);
      saveCurrentRun(fallbackRun);
      setRunHistory((current) => addRunHistoryItem(fallbackRun, "fallback", current));
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway unavailable; used local fallback. ${error.message}`
          : "Gateway unavailable; used local fallback."
      });
    }
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
    clearCurrentRun();
    setApprovalRecords([]);
    setHandoffLink(null);
    setSessionSecrets({});
  }

  function exportWorkspace() {
    const blob = new Blob([serializeWorkspace(workspace)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-workspace-${new Date().toISOString().slice(0, 10)}.json`;

    if (exportLink) {
      URL.revokeObjectURL(exportLink.href);
    }

    setExportLink({ href: url, fileName });
    setRunState({
      status: "idle",
      message: "Workspace export is ready. Use Download JSON before closing this page."
    });
  }

  async function importWorkspace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const imported = parseWorkspaceExport(await file.text());
      setWorkspace(imported);
      setSelectedRoleId(imported.roles[0]?.id || "");
      setRun(null);
      clearCurrentRun();
      setApprovalRecords([]);
      setHandoffLink(null);
      setRunState({
        status: "idle",
        message: `Imported workspace from ${file.name}.`
      });
    } catch (error) {
      setRunState({
        status: "error",
        message: error instanceof Error ? `Import failed: ${error.message}` : "Import failed."
      });
    }
  }

  function recordAutomationDecision(
    action: AutomationAction,
    decision: AutomationApprovalDecision
  ) {
    const record = createApprovalRecord({
      action,
      decision
    });
    const nextRecords = saveApprovalRecord(record).filter(
      (candidate) => candidate.runId === action.runId
    );
    setApprovalRecords(nextRecords);
    setHandoffLink(null);
  }

  function exportExecutorHandoff() {
    if (!run) return;

    const blob = new Blob([serializeRunBundle(run, approvalRecords)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-handoff-${run.id.replace(/[^a-z0-9-]/gi, "-")}.json`;

    if (handoffLink) {
      URL.revokeObjectURL(handoffLink.href);
    }

    setHandoffLink({ href: url, fileName });
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
          <button className="icon-button" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Import workspace">
            <Upload size={17} />
          </button>
          <button className="icon-button" type="button" onClick={exportWorkspace} aria-label="Export workspace">
            <Download size={17} />
          </button>
          {exportLink ? (
            <a className="secondary-button download-link" href={exportLink.href} download={exportLink.fileName}>
              <Download size={16} /> JSON
            </a>
          ) : null}
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importWorkspace}
          />
          <button className="secondary-button" type="button" onClick={persistWorkspace}>
            {saveState === "saved" ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveState === "saved" ? "Saved" : "Save"}
          </button>
          <button className="primary-button" type="button" onClick={runCabinet} disabled={runState.status === "running"}>
            <Play size={16} /> {runState.status === "running" ? "Running..." : "Run cabinet"}
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
            runStatus={runState}
            runMode={runMode}
            onRunModeChange={setRunMode}
          />

          <AutomationQueue
            actions={run?.automationActions || []}
            approvalRecords={approvalRecordsByAction}
            readyCount={readyActionCount}
            handoffLink={handoffLink}
            onDecision={recordAutomationDecision}
            onExportHandoff={exportExecutorHandoff}
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
        <RunLog
          run={run}
          history={runHistory}
          onClearHistory={() => setRunHistory(clearRunHistory())}
        />
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
            <Metric
              icon={runState.status === "fallback" || runState.status === "error" ? <AlertTriangle size={16} /> : <Cloud size={16} />}
              label="Run path"
              value={runState.status}
            />
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
