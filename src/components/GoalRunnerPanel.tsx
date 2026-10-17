import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  FileCode,
  Flame,
  GitBranch,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal
} from "lucide-react";
import type { GoalEngineSummary, ProviderKind } from "../domain/types";

interface GoalRunnerPanelProps {
  initialMission?: string;
  gatewayUrl?: string;
  locale?: string;
}

const sampleMissions = [
  "Create an input validator module for email and numeric range with vitest tests",
  "Implement a string utility library with slugify, camelCase, and capitalize with unit tests",
  "Build an autonomous metrics calculation feature with unit tests"
];

export function GoalRunnerPanel({
  initialMission = "",
  gatewayUrl = "http://127.0.0.1:8787",
  locale = "ja"
}: GoalRunnerPanelProps) {
  const [mission, setMission] = useState(
    initialMission || "Create an input validator module for email and numeric range with vitest tests"
  );
  const [maxCycles, setMaxCycles] = useState(2);
  const [provider, setProvider] = useState<ProviderKind>("local");
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<GoalEngineSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isJa = locale === "ja";

  async function handleRunGoal() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch(`${gatewayUrl}/v1/goal/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission,
          maxCycles,
          provider: provider !== "local" ? {
            provider,
            endpoint: provider === "ollama" ? "http://127.0.0.1:11434/v1" : "",
            model: provider === "ollama" ? "qwen2.5-coder:latest" : (provider === "aliyun" ? "qwen-turbo" : ""),
            apiKeyAlias: provider === "ollama" ? "" : (provider === "aliyun" ? "DASHSCOPE_API_KEY" : "NAIKAKU_OPENAI_API_KEY"),
            temperature: 0.2,
            maxTokens: 2000
          } : undefined,
          locale
        })
      });

      if (!response.ok && response.status !== 422) {
        throw new Error(`Gateway returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GoalEngineSummary;
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }

  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="goal-runner-panel" style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Sparkles size={24} style={{ color: "var(--brand-color, #4f46e5)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            {isJa ? "自律目標達成エンジン (/goal)" : "Autonomous Goal Engine (/goal)"}
          </h2>
        </div>
        <p style={{ color: "var(--text-muted, #64748b)", margin: 0 }}>
          {isJa
            ? "内閣多智能体（総理・政策・執行・査問・公安）が合議し、対象作業ツリーで自律的にコード生成・実機テスト・査問検証を行い、受領書と差分を確定します。"
            : "Multi-agent cabinet deliberation (Prime Minister, Strategy, Execution, Critic, Safety) autonomously generates code, runs real test suites, and ratifies verifiable receipts."}
        </p>
      </header>

      {/* Goal Mission Input Card */}
      <div
        className="cabinet-card"
        style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}
      >
        <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
          {isJa ? "達成目標 (Mission Goal)" : "Mission Goal"}
        </label>
        <textarea
          rows={3}
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder={isJa ? "達成したいエンジニアリング目標を入力してください..." : "Enter your engineering goal..."}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color, #cbd5e1)",
            fontFamily: "inherit",
            fontSize: "0.95rem",
            boxSizing: "border-box",
            marginBottom: "0.75rem"
          }}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted, #64748b)", alignSelf: "center" }}>
            {isJa ? "サンプル目標:" : "Presets:"}
          </span>
          {sampleMissions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-button"
              onClick={() => setMission(s)}
              style={{
                fontSize: "0.8rem",
                padding: "0.3rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "var(--chip-bg, #f8fafc)",
                cursor: "pointer"
              }}
            >
              {s.slice(0, 42)}...
            </button>
          ))}
        </div>

        {/* Options Row */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
              {isJa ? "実行エンジン" : "Execution Engine"}
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderKind)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid var(--border-color, #cbd5e1)"
              }}
            >
              <option value="local">{isJa ? "組み込み自律エンジン (Zero-Credential Safe)" : "Built-in Autonomous Engine"}</option>
              <option value="ollama">Ollama (Local LLM / qwen2.5-coder)</option>
              <option value="openai">OpenAI (gpt-5.4)</option>
              <option value="anthropic">Anthropic (claude-sonnet-4.5)</option>
              <option value="aliyun">Aliyun DashScope (qwen-turbo)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
              {isJa ? "最大閣議サイクル" : "Max Cabinet Cycles"}
            </label>
            <select
              value={maxCycles}
              onChange={(e) => setMaxCycles(Number(e.target.value))}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid var(--border-color, #cbd5e1)"
              }}
            >
              <option value={1}>1 Cycle (Single Turn)</option>
              <option value={2}>2 Cycles (Auto Self-Correction)</option>
              <option value={3}>3 Cycles (Comprehensive)</option>
              <option value={5}>5 Cycles (Deep Multi-Stage)</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
            <button
              type="button"
              className="primary-button"
              disabled={isRunning || !mission.trim()}
              onClick={handleRunGoal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.4rem",
                fontSize: "1rem",
                fontWeight: 600,
                borderRadius: "0.5rem",
                background: "var(--brand-color, #4f46e5)",
                color: "#ffffff",
                border: "none",
                cursor: isRunning ? "not-allowed" : "pointer"
              }}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  {isJa ? "閣議審議中..." : "Deliberating..."}
                </>
              ) : (
                <>
                  <Play size={18} />
                  {isJa ? "内閣に諮問して実行 (/goal)" : "Execute Goal (/goal)"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem"
          }}
        >
          <strong>{isJa ? "エラー:" : "Error:"}</strong> {error}
        </div>
      )}

      {/* Execution Results Summary */}
      {summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            className="cabinet-card"
            style={{
              background: "var(--card-bg, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    background: summary.finalDecision === "ship" ? "#ecfdf5" : "#fef2f2",
                    color: summary.finalDecision === "ship" ? "#047857" : "#b91c1c"
                  }}
                >
                  {summary.finalDecision === "ship" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {summary.finalDecision === "ship"
                    ? (isJa ? "達成承認 (SHIP)" : "APPROVED (SHIP)")
                    : summary.finalDecision.toUpperCase()}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  {isJa ? `総合評点: ${summary.finalScore} / 100` : `Overall Score: ${summary.finalScore} / 100`}
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => downloadJson(summary, "goal-summary.json")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.85rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--border-color, #cbd5e1)",
                    cursor: "pointer",
                    background: "#ffffff"
                  }}
                >
                  <Download size={14} /> summary.json
                </button>
                {summary.diff && (
                  <button
                    type="button"
                    onClick={() => downloadText(summary.diff, "git.diff")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.85rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--border-color, #cbd5e1)",
                      cursor: "pointer",
                      background: "#ffffff"
                    }}
                  >
                    <Download size={14} /> git.diff
                  </button>
                )}
              </div>
            </div>

            {/* Deliberation Cycles Timeline */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "1.25rem 0 0.75rem 0" }}>
              {isJa ? "閣議審議サイクル一覧" : "Cabinet Cycles Timeline"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {summary.cycles.map((cycle) => (
                <div
                  key={cycle.cycle}
                  style={{
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    background: "var(--subcard-bg, #f8fafc)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <strong>
                      {isJa ? `第 ${cycle.cycle} 次閣議` : `Cabinet Cycle ${cycle.cycle}`}
                    </strong>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted, #64748b)" }}>
                      Score: {cycle.cabinetVote.overallScore}/100 ({cycle.cabinetVote.decision.toUpperCase()})
                    </span>
                  </div>

                  <ul style={{ margin: "0.5rem 0", paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
                    <li>
                      <strong>{isJa ? "総理審議: " : "Prime Minister: "}</strong>
                      {cycle.intake.criteria.slice(0, 2).join(", ")}
                    </li>
                    <li>
                      <strong>{isJa ? "執行成果: " : "Execution: "}</strong>
                      {cycle.execution.modifiedFiles.length + cycle.execution.createdFiles.length} {isJa ? "ファイル変更" : "files changed"},{" "}
                      {cycle.execution.commandResults.length} {isJa ? "テストコマンド実行" : "test commands run"}
                    </li>
                    <li>
                      <strong>{isJa ? "野党査問: " : "Opposition Critic: "}</strong>
                      {cycle.critique.passed
                        ? (isJa ? "✓ 合格 (欠陥なし)" : "✓ Passed (Zero defects)")
                        : `✗ ${cycle.critique.flaws.join("; ")}`}
                    </li>
                    <li>
                      <strong>{isJa ? "公安監査: " : "Public Safety Audit: "}</strong>
                      {cycle.safety.passed ? "✓ 安全基準適合" : "✗ 違反検出"}
                    </li>
                  </ul>
                  <div style={{ fontSize: "0.85rem", color: "#334155", fontStyle: "italic", marginTop: "0.4rem" }}>
                    &ldquo;{cycle.cabinetVote.rationale}&rdquo;
                  </div>
                </div>
              ))}
            </div>

            {/* Changed Files */}
            {summary.changedFiles.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  <FileCode size={16} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "0.35rem" }} />
                  {isJa ? "変更ファイル一覧" : "Modified Files"}
                </h4>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {summary.changedFiles.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "0.25rem 0.6rem",
                        background: "#e2e8f0",
                        borderRadius: "0.375rem",
                        fontFamily: "monospace",
                        fontSize: "0.85rem"
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
