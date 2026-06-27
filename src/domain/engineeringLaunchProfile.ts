import type {
  CabinetRun,
  CodingAgentBriefs,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle
} from "./types";

export type EngineeringPermissionMode =
  | "code-only"
  | "browser-assisted"
  | "mac-assisted"
  | "approval-gated";

export type EngineeringLaunchStage =
  | "needs-mission"
  | "mission-ready"
  | "cabinet-ready"
  | "packaging-ready"
  | "preflight-ready"
  | "sandbox-ready"
  | "evidence-review"
  | "needs-review";

export type EngineeringLaunchNextAction =
  | "enter-mission"
  | "run-cabinet"
  | "prepare-pack"
  | "run-preflight"
  | "run-sandbox"
  | "review-evidence"
  | "request-approval";

export type EngineeringLaunchCapabilityId =
  | "repo-files"
  | "output-evidence"
  | "allowlisted-shell"
  | "git-read"
  | "browser-profile"
  | "mac-accessibility"
  | "mac-screen-recording"
  | "mcp-allowlist"
  | "human-approval"
  | "external-write-approval";

export type EngineeringLaunchCapabilityStatus =
  | "ready"
  | "needed"
  | "approval-required"
  | "blocked";

export type EngineeringLaunchUnlockItemId =
  | "write-mission"
  | "run-cabinet"
  | "prepare-agent-pack"
  | "review-held-sessions"
  | "run-preflight"
  | "approve-browser-profile"
  | "approve-mac-desktop"
  | "approve-mcp-tools"
  | "approve-external-writes"
  | "run-local-sandbox"
  | "review-evidence"
  | "keep-secrets-blocked";

export type EngineeringLaunchUnlockStatus =
  | "done"
  | "next"
  | "waiting"
  | "approval"
  | "blocked";

export type EngineeringMissionDraftItemId =
  | "goal"
  | "repo-target"
  | "work-scope"
  | "verification"
  | "permission-boundary"
  | "approval-boundary"
  | "evidence";

export type EngineeringMissionDraftItemStatus =
  | "present"
  | "missing"
  | "recommended";

export type EngineeringMissionTemplateLineId =
  | "mission"
  | "repository"
  | "scope"
  | "supervision"
  | "verification"
  | "permission-boundary"
  | "approval-boundary"
  | "evidence"
  | "non-goals";

export type EngineeringLaunchSignal =
  | "mission-missing"
  | "mission-present"
  | "repo-mentioned"
  | "coding-requested"
  | "browser-requested"
  | "mac-control-requested"
  | "mcp-requested"
  | "external-write-requested"
  | "verification-mentioned"
  | "secrets-risk"
  | "runner-pack-ready"
  | "preflight-ready"
  | "evidence-ready";

export interface EngineeringLaunchCapability {
  id: EngineeringLaunchCapabilityId;
  status: EngineeringLaunchCapabilityStatus;
  reason: string;
}

export interface EngineeringLaunchUnlockItem {
  id: EngineeringLaunchUnlockItemId;
  status: EngineeringLaunchUnlockStatus;
  count?: number;
}

export interface EngineeringMissionDraftItem {
  id: EngineeringMissionDraftItemId;
  status: EngineeringMissionDraftItemStatus;
}

export interface EngineeringMissionDraftGuide {
  score: number;
  present: number;
  missing: number;
  recommended: number;
  items: EngineeringMissionDraftItem[];
}

export interface EngineeringMissionTemplateLine {
  id: EngineeringMissionTemplateLineId;
  text: string;
  generated: boolean;
}

export interface EngineeringMissionTemplate {
  lines: EngineeringMissionTemplateLine[];
  text: string;
  honestyClaim: {
    claim: string;
    limitations: string[];
  };
}

export interface EngineeringLaunchProfile {
  schema: "naikaku.engineering-launch-profile.v1";
  generatedAt: string;
  missionFingerprint: string;
  missionReady: boolean;
  permissionMode: EngineeringPermissionMode;
  stage: EngineeringLaunchStage;
  nextAction: EngineeringLaunchNextAction;
  missionDraft: EngineeringMissionDraftGuide;
  missionTemplate: EngineeringMissionTemplate;
  capabilities: EngineeringLaunchCapability[];
  unlockChecklist: EngineeringLaunchUnlockItem[];
  signals: EngineeringLaunchSignal[];
  supervisorPlan: {
    activeRoles: number;
    briefs: number;
    implementableBriefs: number;
    readySessions: number;
    heldSessions: number;
    runnerTasks: number;
    expectedEvidenceArtifacts: number;
  };
  honestyClaim: {
    claim: string;
    limitations: string[];
  };
}

export interface BuildEngineeringLaunchProfileInput {
  mission: string;
  activeRoles: number;
  run?: CabinetRun | null;
  briefs?: CodingAgentBriefs | null;
  sessionBundle?: CodingAgentSessionBundle | null;
  runnerManifest?: CodingAgentRunnerManifest | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
  generatedAt?: string;
}

interface MissionIntent {
  missionReady: boolean;
  mentionsRepo: boolean;
  wantsCoding: boolean;
  wantsBrowser: boolean;
  wantsMacControl: boolean;
  wantsMcp: boolean;
  wantsExternalWrite: boolean;
  mentionsVerification: boolean;
  mentionsSecrets: boolean;
  mentionsApproval: boolean;
  mentionsEvidence: boolean;
}

export function buildEngineeringLaunchProfile({
  mission,
  activeRoles,
  run,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  generatedAt = new Date().toISOString()
}: BuildEngineeringLaunchProfileInput): EngineeringLaunchProfile {
  const intent = analyzeMissionIntent(mission);
  const permissionMode = permissionModeFor(intent);
  const stage = stageFor({
    intent,
    run,
    briefs,
    sessionBundle,
    runnerManifest,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport
  });
  const nextAction = nextActionFor({
    intent,
    stage,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport
  });
  const capabilities = capabilitiesFor({
    intent,
    stage,
    runnerSelfTest,
    sandboxRunnerPreflight
  });

  return {
    schema: "naikaku.engineering-launch-profile.v1",
    generatedAt,
    missionFingerprint: fingerprintMission(mission),
    missionReady: intent.missionReady,
    permissionMode,
    stage,
    nextAction,
    missionDraft: missionDraftGuideFor(intent),
    missionTemplate: missionTemplateFor(mission, intent),
    capabilities,
    unlockChecklist: unlockChecklistFor({
      intent,
      run,
      briefs,
      sessionBundle,
      runnerManifest,
      runnerSelfTest,
      sandboxRunnerPreflight,
      sandboxRunnerReport,
      stage,
      capabilities
    }),
    signals: signalsFor({
      intent,
      runnerManifest,
      sandboxRunnerPreflight,
      sandboxRunnerReport
    }),
    supervisorPlan: {
      activeRoles,
      briefs: briefs?.summary.total || 0,
      implementableBriefs: briefs?.summary.implementable || 0,
      readySessions: sessionBundle?.summary.ready || 0,
      heldSessions: sessionBundle?.summary.held || 0,
      runnerTasks: runnerManifest?.summary.runnerTasks || 0,
      expectedEvidenceArtifacts: runnerManifest?.summary.expectedEvidenceArtifacts || 0
    },
    honestyClaim: {
      claim: "This launch profile selects a Mac-first permission plan and next operator action; it does not execute code, grant OS permissions, push Git changes, or prove implementation completion.",
      limitations: [
        "Computer control remains disabled unless a governed Mac runner with explicit Accessibility and Screen Recording permission is connected.",
        "External writes such as Git push, deploy, messages, or issue creation stay approval-gated.",
        "Ready means the launch contract is prepared; completed engineering still requires real diffs, command transcripts, and evidence review."
      ]
    }
  };
}

export function analyzeMissionIntent(mission: string): MissionIntent {
  const text = normalizeMission(mission);
  const compact = text.replace(/\s+/g, " ").trim();

  return {
    missionReady: compact.length >= 12,
    mentionsRepo: hasAny(text, [
      "repo",
      "repository",
      "github",
      "gitlab",
      "リポジトリ",
      "レポ",
      "仓库",
      "倉庫",
      "저장소"
    ]),
    wantsCoding: hasAny(text, [
      "code",
      "coding",
      "implement",
      "feature",
      "bug",
      "工程",
      "代码",
      "代碼",
      "开发",
      "開發",
      "実装",
      "修正",
      "코드",
      "개발"
    ]),
    wantsBrowser: hasAny(text, [
      "browser",
      "chrome",
      "safari",
      "playwright",
      "web",
      "url",
      "openclaw",
      "ブラウザ",
      "ウェブ",
      "网页",
      "瀏覽器",
      "浏览器",
      "웹",
      "브라우저"
    ]),
    wantsMacControl: hasAny(text, [
      "mac",
      "desktop",
      "computer control",
      "control computer",
      "screen recording",
      "accessibility",
      "keyboard",
      "mouse",
      "hammerspoon",
      "openclaw",
      "hermes",
      "hamerss",
      "humor",
      "デスクトップ",
      "アクセシビリティ",
      "画面収録",
      "电脑控制",
      "控制电脑",
      "控制電腦",
      "桌面",
      "键盘",
      "鍵盤",
      "鼠标",
      "滑鼠",
      "컴퓨터 제어",
      "데스크톱",
      "화면 기록",
      "키보드",
      "마우스"
    ]),
    wantsMcp: hasAny(text, [
      "mcp",
      "connector",
      "plugin",
      "gmail",
      "calendar",
      "notion",
      "slack",
      "feishu",
      "飞书",
      "飛書",
      "コネクタ",
      "プラグイン",
      "커넥터",
      "플러그인"
    ]),
    wantsExternalWrite: hasAny(text, [
      "push",
      "deploy",
      "release",
      "publish",
      "send",
      "email",
      "github issue",
      "pull request",
      "提交",
      "推送",
      "部署",
      "发布",
      "發布",
      "发送",
      "送信",
      "デプロイ",
      "公開",
      "メール",
      "배포",
      "발송",
      "전송",
      "게시"
    ]),
    mentionsVerification: hasAny(text, [
      "test",
      "verify",
      "vitest",
      "npm run",
      "npm run build",
      "vite build",
      "tsc -b",
      "build passes",
      "pytest",
      "検証",
      "テスト",
      "测试",
      "測試",
      "验证",
      "驗證",
      "테스트",
      "검증"
    ]),
    mentionsSecrets: hasAny(text, [
      "secret",
      "api key",
      "token",
      "password",
      "credential",
      "秘密",
      "密钥",
      "密鑰",
      "密码",
      "密碼",
      "トークン",
      "비밀",
      "토큰",
      "비밀번호"
    ]),
    mentionsApproval: hasAny(text, [
      "approval",
      "approve",
      "human review",
      "human approval",
      "permission",
      "review before",
      "人审",
      "人工审核",
      "人工審核",
      "人間承認",
      "承認",
      "权限",
      "權限",
      "権限",
      "승인",
      "권한"
    ]),
    mentionsEvidence: hasAny(text, [
      "evidence",
      "receipt",
      "transcript",
      "screenshot",
      "log",
      "proof",
      "artifact",
      "证据",
      "證據",
      "截图",
      "截圖",
      "日志",
      "ログ",
      "証拠",
      "スクリーンショット",
      "증거",
      "스크린샷",
      "로그"
    ])
  };
}

function permissionModeFor(intent: MissionIntent): EngineeringPermissionMode {
  if (intent.wantsExternalWrite) return "approval-gated";
  if (intent.wantsMacControl) return "mac-assisted";
  if (intent.wantsBrowser || intent.wantsMcp) return "browser-assisted";
  return "code-only";
}

function missionDraftGuideFor(intent: MissionIntent): EngineeringMissionDraftGuide {
  const highImpact = intent.wantsExternalWrite || intent.wantsMacControl || intent.wantsMcp;
  const items: EngineeringMissionDraftItem[] = [
    {
      id: "goal",
      status: intent.missionReady ? "present" : "missing"
    },
    {
      id: "repo-target",
      status: intent.mentionsRepo ? "present" : "missing"
    },
    {
      id: "work-scope",
      status: intent.wantsCoding || intent.wantsBrowser || intent.wantsMacControl || intent.wantsMcp
        ? "present"
        : "missing"
    },
    {
      id: "verification",
      status: intent.mentionsVerification ? "present" : "recommended"
    },
    {
      id: "permission-boundary",
      status: intent.mentionsApproval || intent.wantsBrowser || intent.wantsMacControl || intent.wantsMcp
        ? "present"
        : highImpact ? "missing" : "recommended"
    },
    {
      id: "approval-boundary",
      status: intent.mentionsApproval
        ? "present"
        : intent.wantsExternalWrite ? "missing" : highImpact ? "recommended" : "recommended"
    },
    {
      id: "evidence",
      status: intent.mentionsEvidence || intent.mentionsVerification
        ? "present"
        : highImpact ? "missing" : "recommended"
    }
  ];
  const present = items.filter((item) => item.status === "present").length;
  const missing = items.filter((item) => item.status === "missing").length;
  const recommended = items.filter((item) => item.status === "recommended").length;

  return {
    score: Math.round((present / items.length) * 100),
    present,
    missing,
    recommended,
    items
  };
}

function missionTemplateFor(mission: string, intent: MissionIntent): EngineeringMissionTemplate {
  const cleanMission = mission.trim().replace(/\s+/g, " ");
  const wantsDesktopApproval = intent.wantsMacControl || intent.wantsBrowser || intent.wantsMcp;
  const lines: EngineeringMissionTemplateLine[] = [
    {
      id: "mission",
      text: `Mission: ${cleanMission || "TODO - describe the feature, fix, research task, or engineering workflow to build."}`,
      generated: !cleanMission
    },
    {
      id: "repository",
      text: intent.mentionsRepo
        ? "Repository: use the GitHub repository or local workspace named in the mission."
        : "Repository: TODO - paste the GitHub URL or local repo path.",
      generated: true
    },
    {
      id: "scope",
      text: scopeTemplateLineFor(intent),
      generated: true
    },
    {
      id: "supervision",
      text: "Supervision: run the cabinet split first, prepare role briefs, run preflight, run the local sandbox, then review evidence before marking done.",
      generated: true
    },
    {
      id: "verification",
      text: intent.mentionsVerification
        ? "Verification: run the commands named in the mission and capture exit codes plus logs."
        : "Verification: TODO - add exact local commands, for example npm run test and npm run build.",
      generated: true
    },
    {
      id: "permission-boundary",
      text: permissionTemplateLineFor(intent),
      generated: true
    },
    {
      id: "approval-boundary",
      text: approvalTemplateLineFor(intent, wantsDesktopApproval),
      generated: true
    },
    {
      id: "evidence",
      text: intent.mentionsEvidence || intent.mentionsVerification
        ? "Evidence: include changed files, command transcripts, screenshots when UI or desktop work is involved, and final review notes."
        : "Evidence: TODO - require changed files, command output, screenshots/transcripts when relevant, and a final review note.",
      generated: true
    },
    {
      id: "non-goals",
      text: "Non-goals: do not claim production readiness, read host-wide private environment values, or push/deploy without reviewed evidence and explicit approval.",
      generated: true
    }
  ];

  return {
    lines,
    text: lines.map((line) => line.text).join("\n"),
    honestyClaim: {
      claim: "This template only reshapes user input into a launchable engineering brief; it does not execute code, grant macOS permissions, push Git changes, or prove completion.",
      limitations: [
        "TODO fields still need the operator or user to fill concrete targets.",
        "Mac desktop control remains disabled until Accessibility, Screen Recording, and any browser profile approvals are granted.",
        "External writes such as Git push, deploy, issue creation, messages, or email remain approval-gated."
      ]
    }
  };
}

function scopeTemplateLineFor(intent: MissionIntent) {
  const scope: string[] = [];
  if (intent.wantsCoding) scope.push("code changes");
  if (intent.wantsBrowser) scope.push("isolated browser-assisted checks");
  if (intent.wantsMacControl) scope.push("Mac desktop runner checks after permission approval");
  if (intent.wantsMcp) scope.push("allowlisted MCP/connector calls");

  if (!scope.length) {
    return "Scope: TODO - define whether this is code editing, review, browser research, Mac control, connector work, or documentation.";
  }

  return `Scope: ${scope.join(", ")}; keep changes inside the selected repo or sandbox workspace.`;
}

function permissionTemplateLineFor(intent: MissionIntent) {
  if (intent.wantsMacControl) {
    return "Permission boundary: request isolated browser profile, macOS Accessibility, and Screen Recording before desktop control; do not use host-wide cookies or raw environment values.";
  }
  if (intent.wantsBrowser) {
    return "Permission boundary: use an isolated browser profile; repo files, output evidence, Git read, and allowlisted shell only.";
  }
  if (intent.wantsMcp) {
    return "Permission boundary: use only approved MCP tools, scoped credentials, repo files, output evidence, Git read, and allowlisted shell.";
  }
  return "Permission boundary: repo read/write, output evidence, Git read, and allowlisted shell only.";
}

function approvalTemplateLineFor(intent: MissionIntent, wantsDesktopApproval: boolean) {
  if (intent.wantsExternalWrite) {
    return intent.mentionsApproval
      ? "Approval boundary: external writes such as Git push, deploy, issues, messages, or email require exact human approval before execution."
      : "Approval boundary: TODO - approve or remove Git push/deploy/issue/message/email actions before execution.";
  }
  if (wantsDesktopApproval) {
    return "Approval boundary: Mac desktop, browser profile, and connector permissions require explicit operator approval; no push/deploy/send without a separate approval.";
  }
  return "Approval boundary: no Git push, deploy, external send, or destructive action without explicit approval.";
}

function stageFor({
  intent,
  run,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport
}: {
  intent: MissionIntent;
  run?: CabinetRun | null;
  briefs?: CodingAgentBriefs | null;
  sessionBundle?: CodingAgentSessionBundle | null;
  runnerManifest?: CodingAgentRunnerManifest | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
}): EngineeringLaunchStage {
  if (!intent.missionReady) return "needs-mission";
  if (!run) return "mission-ready";
  if (!briefs?.summary.total) return "cabinet-ready";
  if (!sessionBundle || !runnerManifest || !runnerSelfTest) return "packaging-ready";
  if (runnerSelfTest.decision !== "self-test-ready") return "needs-review";
  if (!sandboxRunnerPreflight) return "preflight-ready";
  if (sandboxRunnerPreflight.decision !== "ready") return "needs-review";
  if (!sandboxRunnerReport) return "sandbox-ready";
  if (sandboxRunnerReport.decision === "sandbox-runner-verified") return "evidence-review";
  return "needs-review";
}

function nextActionFor({
  intent,
  stage,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport
}: {
  intent: MissionIntent;
  stage: EngineeringLaunchStage;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
}): EngineeringLaunchNextAction {
  if (stage === "needs-mission") return "enter-mission";
  if (stage === "mission-ready" || stage === "cabinet-ready") return "run-cabinet";
  if (stage === "packaging-ready") return "prepare-pack";
  if (stage === "preflight-ready") return "run-preflight";
  if (stage === "sandbox-ready") {
    return intent.wantsExternalWrite ? "request-approval" : "run-sandbox";
  }
  if (runnerSelfTest && runnerSelfTest.decision !== "self-test-ready") return "review-evidence";
  if (sandboxRunnerPreflight && sandboxRunnerPreflight.decision !== "ready") return "review-evidence";
  if (sandboxRunnerReport && sandboxRunnerReport.decision !== "sandbox-runner-verified") return "review-evidence";
  return "review-evidence";
}

function capabilitiesFor({
  intent,
  stage,
  runnerSelfTest,
  sandboxRunnerPreflight
}: {
  intent: MissionIntent;
  stage: EngineeringLaunchStage;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
}): EngineeringLaunchCapability[] {
  const baseStatus: EngineeringLaunchCapabilityStatus = intent.missionReady ? "ready" : "needed";
  const shellStatus: EngineeringLaunchCapabilityStatus =
    sandboxRunnerPreflight?.decision === "ready" || runnerSelfTest?.decision === "self-test-ready"
      ? "ready"
      : intent.missionReady ? "needed" : "needed";
  const capabilities: EngineeringLaunchCapability[] = [
    {
      id: "repo-files",
      status: baseStatus,
      reason: "Read and write only inside the selected repository or sandbox workspace."
    },
    {
      id: "output-evidence",
      status: baseStatus,
      reason: "Write transcripts, screenshots, receipts, and artifacts under output/."
    },
    {
      id: "allowlisted-shell",
      status: shellStatus,
      reason: "Run only allowlisted verification commands such as npm run test and npm run build."
    },
    {
      id: "git-read",
      status: baseStatus,
      reason: "Read Git status and diffs for evidence without pushing changes."
    }
  ];

  if (intent.wantsBrowser) {
    capabilities.push({
      id: "browser-profile",
      status: stage === "needs-mission" ? "needed" : "approval-required",
      reason: "Browser automation must use an isolated profile instead of host cookies."
    });
  }

  if (intent.wantsMacControl) {
    capabilities.push(
      {
        id: "mac-accessibility",
        status: "approval-required",
        reason: "macOS Accessibility is required before keyboard or mouse control."
      },
      {
        id: "mac-screen-recording",
        status: "approval-required",
        reason: "Screen Recording is required before visual desktop verification."
      }
    );
  }

  if (intent.wantsMcp) {
    capabilities.push({
      id: "mcp-allowlist",
      status: "approval-required",
      reason: "MCP calls need per-tool allowlists and scoped credentials."
    });
  }

  if (intent.wantsExternalWrite) {
    capabilities.push(
      {
        id: "human-approval",
        status: "approval-required",
        reason: "A human must approve exact high-impact payloads before execution."
      },
      {
        id: "external-write-approval",
        status: "approval-required",
        reason: "Git push, deploy, issue creation, messages, and emails are external writes."
      }
    );
  }

  if (intent.mentionsSecrets) {
    return capabilities.map((capability) =>
      capability.id === "repo-files" || capability.id === "git-read"
        ? capability
        : {
          ...capability,
          status: capability.status === "ready" ? "needed" : capability.status,
          reason: `${capability.reason} Mission mentions secrets, so raw credential access remains blocked.`
        }
    );
  }

  return capabilities;
}

function unlockChecklistFor({
  intent,
  run,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  stage,
  capabilities
}: {
  intent: MissionIntent;
  run?: CabinetRun | null;
  briefs?: CodingAgentBriefs | null;
  sessionBundle?: CodingAgentSessionBundle | null;
  runnerManifest?: CodingAgentRunnerManifest | null;
  runnerSelfTest?: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
  stage: EngineeringLaunchStage;
  capabilities: EngineeringLaunchCapability[];
}): EngineeringLaunchUnlockItem[] {
  const items: EngineeringLaunchUnlockItem[] = [
    {
      id: "write-mission",
      status: intent.missionReady ? "done" : "next"
    },
    {
      id: "run-cabinet",
      status: run ? "done" : intent.missionReady ? "next" : "waiting"
    },
    {
      id: "prepare-agent-pack",
      status: runnerManifest && runnerSelfTest
        ? runnerSelfTest.decision === "self-test-ready" ? "done" : "waiting"
        : run && briefs?.summary.total ? "next" : "waiting",
      count: briefs?.summary.total || undefined
    }
  ];

  if ((sessionBundle?.summary.held || 0) > 0 || runnerSelfTest?.decision === "needs-review") {
    items.push({
      id: "review-held-sessions",
      status: "waiting",
      count: sessionBundle?.summary.held || runnerSelfTest?.summary.held || undefined
    });
  }

  const approvalCapabilities = capabilities.filter((capability) => capability.status === "approval-required");
  if (approvalCapabilities.some((capability) => capability.id === "browser-profile")) {
    items.push({
      id: "approve-browser-profile",
      status: "approval"
    });
  }
  if (approvalCapabilities.some((capability) =>
    capability.id === "mac-accessibility" || capability.id === "mac-screen-recording"
  )) {
    items.push({
      id: "approve-mac-desktop",
      status: "approval",
      count: approvalCapabilities.filter((capability) =>
        capability.id === "mac-accessibility" || capability.id === "mac-screen-recording"
      ).length
    });
  }
  if (approvalCapabilities.some((capability) => capability.id === "mcp-allowlist")) {
    items.push({
      id: "approve-mcp-tools",
      status: "approval"
    });
  }
  if (approvalCapabilities.some((capability) =>
    capability.id === "human-approval" || capability.id === "external-write-approval"
  )) {
    items.push({
      id: "approve-external-writes",
      status: "approval",
      count: approvalCapabilities.filter((capability) =>
        capability.id === "human-approval" || capability.id === "external-write-approval"
      ).length
    });
  }

  items.push({
    id: "run-preflight",
    status: sandboxRunnerPreflight
      ? sandboxRunnerPreflight.decision === "ready" ? "done" : "waiting"
      : runnerSelfTest?.decision === "self-test-ready" ? "next" : "waiting",
    count: sandboxRunnerPreflight?.summary.readyTasks || undefined
  });

  items.push({
    id: "run-local-sandbox",
    status: sandboxRunnerReport?.decision === "sandbox-runner-verified"
      ? "done"
      : stage === "sandbox-ready" && !intent.wantsExternalWrite ? "next"
        : stage === "sandbox-ready" && intent.wantsExternalWrite ? "approval"
          : "waiting",
    count: sandboxRunnerPreflight?.summary.expectedProcessExecutions || undefined
  });

  if (
    sandboxRunnerReport ||
    stage === "needs-review" ||
    runnerSelfTest?.decision === "needs-review" ||
    sandboxRunnerPreflight?.decision === "needs-review"
  ) {
    items.push({
      id: "review-evidence",
      status: sandboxRunnerReport?.decision === "sandbox-runner-verified" ? "next" : "waiting",
      count: sandboxRunnerReport?.summary.evidenceArtifacts ||
        runnerManifest?.summary.expectedEvidenceArtifacts ||
        undefined
    });
  }

  if (intent.mentionsSecrets) {
    items.push({
      id: "keep-secrets-blocked",
      status: "blocked"
    });
  }

  return items;
}

function signalsFor({
  intent,
  runnerManifest,
  sandboxRunnerPreflight,
  sandboxRunnerReport
}: {
  intent: MissionIntent;
  runnerManifest?: CodingAgentRunnerManifest | null;
  sandboxRunnerPreflight?: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport?: CodingAgentSandboxRunnerReport | null;
}): EngineeringLaunchSignal[] {
  const signals: EngineeringLaunchSignal[] = [
    intent.missionReady ? "mission-present" : "mission-missing"
  ];

  if (intent.mentionsRepo) signals.push("repo-mentioned");
  if (intent.wantsCoding) signals.push("coding-requested");
  if (intent.wantsBrowser) signals.push("browser-requested");
  if (intent.wantsMacControl) signals.push("mac-control-requested");
  if (intent.wantsMcp) signals.push("mcp-requested");
  if (intent.wantsExternalWrite) signals.push("external-write-requested");
  if (intent.mentionsVerification) signals.push("verification-mentioned");
  if (intent.mentionsSecrets) signals.push("secrets-risk");
  if (runnerManifest?.decision === "runner-ready") signals.push("runner-pack-ready");
  if (sandboxRunnerPreflight?.decision === "ready") signals.push("preflight-ready");
  if (sandboxRunnerReport?.decision === "sandbox-runner-verified") signals.push("evidence-ready");

  return signals;
}

function normalizeMission(mission: string) {
  return mission.toLocaleLowerCase();
}

function hasAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function fingerprintMission(mission: string) {
  const normalized = mission.trim().replace(/\s+/g, " ");
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `mission-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
