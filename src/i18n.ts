export type SupportedLocale = "ja" | "en" | "zh-Hans" | "zh-Hant" | "ko";

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
}

export interface ReleaseRehearsalCopy {
  title: string;
  notRun: string;
  idle: string;
  passed: (count: number) => string;
  warnings: (count: number) => string;
  blockers: (count: number) => string;
  localDryRun: string;
  sourceLine: (sourceRun: string, level: string, evidenceItems: number) => string;
  run: string;
  exportReport: string;
  verify: string;
  productionCheck: string;
  exportIssues: string;
  exportGh: string;
  downloadJson: string;
  downloadVerify: string;
  downloadIssues: string;
  downloadGh: string;
  metrics: {
    bundle: string;
    notes: string;
    runner: string;
    held: string;
    ready: (count: number) => string;
  };
  evidenceClaimTitle: (level: string) => string;
  remediationQueue: string;
  remediationSummary: (high: number, medium: number) => string;
  empty: string;
  decision: {
    releaseReady: string;
    needsReview: string;
    blocked: string;
  };
  verification: {
    decision: {
      verified: string;
      notProductionReady: string;
      invalid: string;
    };
    scope: (scope: string, requireProductionEvidence: boolean) => string;
    result: (passed: number, failed: number) => string;
    ready: string;
  };
}

export interface EngineeringLaunchpadCopy {
  kicker: string;
  title: string;
  subtitle: string;
  stateLabel: string;
  metricsLabel: string;
  permissionModeLabel: string;
  launchStageLabel: string;
  nextActionLabel: string;
  entryLabel: string;
  entryTitle: string;
  entryBody: string;
  realityLabel: string;
  realityCodeLabel: string;
  realityMacLabel: string;
  realityExternalLabel: string;
  realityCodeStatus: (hasVerifiedExecution: boolean, canRunCodeSandbox: boolean, missionReady: boolean, hasSelfSimulation: boolean) => string;
  realityMacStatus: (canControlMacDesktop: boolean) => string;
  realityExternalStatus: (externalWriteRequested: boolean) => string;
  missionInputHelp: string;
  autoWorkLabel: string;
  autoWorkTitle: string;
  autoWorkBody: string;
  autoWorkPresetLabel: string;
  autoWorkPrepared: string;
  autoWorkFixture: string;
  autoWorkOpenHands: string;
  autoWorkWorktreeLabel: string;
  autoWorkAdapterReadyLabel: string;
  autoWorkAdapterReadyHelp: string;
  autoWorkRun: string;
  autoWorkRunning: string;
  autoWorkIdle: string;
  autoWorkMissionRequired: string;
  autoWorkOpenHandsNeedsReady: string;
  autoWorkOutputLabel: string;
  autoWorkChecks: (passed: number, failed: number) => string;
  autoWorkResult: (preset: string, mode: string, completedJobs: number, receipts: number, evidence: number, artifacts: number) => string;
  autoWorkStarting: (preset: string) => string;
  autoWorkCompleted: (preset: string, passed: number, completedJobs: number, outputDir: string) => string;
  autoWorkFailed: (exitCode: number | null, outputDir: string) => string;
  autoWorkGatewayUnavailable: (errorMessage: string) => string;
  runnerReadinessLabel: string;
  runnerReadinessRefresh: string;
  runnerReadinessChecking: string;
  runnerReadinessIdle: string;
  runnerReadinessStatus: (ready: number, detected: number, launchable: number, total: number) => string;
  runnerReadinessUnavailable: (errorMessage: string) => string;
  runnerReadinessAdapterStatus: (status: string) => string;
  runnerReadinessDetected: (commands: number, apps: number) => string;
  runnerReadinessNextActionLabel: string;
  macScopeLabel: string;
  macScopeItems: string[];
  macRunnerLabel: string;
  macRunnerPermissionsLabel: string;
  macRunnerAdaptersLabel: string;
  macRunnerNextActionsLabel: string;
  macRunnerHonestyLabel: string;
  macRunnerHonestyClaim: (canControlMacDesktop: boolean) => string;
  macRunnerHonestyLimit: string;
  macRunnerContractLabel: string;
  macRunnerContractChecksLabel: string;
  macRunnerContractDeniedLabel: string;
  macRunnerContractInstructionsLabel: string;
  missionInputLabel: string;
  missionInputPlaceholder: string;
  missionDraftLabel: string;
  missionDraftScore: (score: number, present: number, missing: number, recommended: number) => string;
  capabilitiesLabel: string;
  signalsLabel: string;
  unlockChecklistLabel: string;
  selfSimulationLabel: string;
  selfSimulationEmpty: string;
  selfSimulationEmptyDetail: string;
  selfSimulationNextActionsLabel: string;
  selfSimulationHonestyLabel: string;
  permissionRequestLabel: string;
  permissionRequestDeniedLabel: string;
  capabilityGapLabel: string;
  capabilityGapHonestyLabel: string;
  launchQueueLabel: string;
  launchQueueEmpty: string;
  launchQueueChecklistLabel: string;
  launchQueueHonestyLabel: string;
  executionReceiptLabel: string;
  executionReceiptEmpty: string;
  executionReceiptClaimsLabel: string;
  executionReceiptHonestyLabel: string;
  handoffReceiptLabel: string;
  handoffOperatorScriptLabel: string;
  completionGateLabel: string;
  completionGateNextActionLabel: string;
  completionGateBlockedClaimsLabel: string;
  selfSimulationSummary: (readySessions: number, heldSessions: number, allowedCommands: number, evidenceArtifacts: number) => string;
  selfSimulationStatus: (decision: string, readySessions: number, allowedCommands: number, evidenceArtifacts: number) => string;
  permissionRequestSummary: (requests: number, askBeforeUse: number, deniedDefaults: number) => string;
  capabilityGapSummary: (engineeringReadiness: number, macRuntimeReadiness: number, canPrepareEngineering: boolean, canControlMacDesktop: boolean) => string;
  launchQueueSummary: (readyToRun: number, readyToHandoff: number, held: number, allowedCommands: number, evidenceArtifacts: number) => string;
  executionReceiptSummary: (executedTasks: number, verifiedReceipts: number, acceptedEvidence: number, verifiedArtifacts: number, canClaimCompletion: boolean) => string;
  macRunnerSummary: (readyCapabilities: number, approvalRequired: number, runtimeNeeded: number, deniedByDefault: number, availableAdapters: number) => string;
  macRunnerContractSummary: (totalActions: number, readyForApproval: number, needsRuntime: number, blocked: number, evidenceTargets: number, requiredPermissions: number) => string;
  handoffReceiptSummary: (canHandOff: boolean, canRunSandbox: boolean, approvalItems: number, evidenceArtifacts: number) => string;
  completionGateSummary: (canClaimCompletion: boolean, canClaimCodeChanged: boolean, canClaimExternalWrite: boolean) => string;
  state: (state: string) => string;
  permissionMode: (mode: string) => string;
  launchStage: (stage: string) => string;
  nextAction: (action: string) => string;
  selfSimulationDecision: (decision: string) => string;
  selfSimulationStage: (stage: string) => string;
  selfSimulationStageStatus: (status: string) => string;
  selfSimulationCapability: (capability: string) => string;
  selfSimulationCapabilityStatus: (status: string) => string;
  permissionRequestDecision: (decision: string) => string;
  permissionRequestMode: (mode: string) => string;
  capabilityGapDecision: (decision: string) => string;
  capabilityGapItem: (item: string) => string;
  capabilityGapStatus: (status: string) => string;
  launchQueueDecision: (decision: string) => string;
  launchQueueStatus: (status: string) => string;
  executionReceiptDecision: (decision: string) => string;
  executionReceiptStatus: (status: string) => string;
  macRunnerDecision: (decision: string) => string;
  macRunnerCapability: (capability: string) => string;
  macRunnerCapabilityStatus: (status: string) => string;
  macRunnerPermission: (permission: string) => string;
  macRunnerPermissionStatus: (status: string) => string;
  macRunnerAdapter: (adapter: string) => string;
  macRunnerAdapterStatus: (status: string) => string;
  macRunnerNextAction: (action: string) => string;
  macRunnerContractDecision: (decision: string) => string;
  macRunnerContractAction: (action: string) => string;
  macRunnerContractActionStatus: (status: string) => string;
  macRunnerContractCheckStatus: (status: string) => string;
  macRunnerContractDeniedAction: (action: string) => string;
  macRunnerContractInstruction: (instruction: string) => string;
  handoffReceiptDecision: (decision: string) => string;
  handoffLane: (lane: string) => string;
  handoffLaneStatus: (status: string) => string;
  completionGateDecision: (decision: string) => string;
  completionGateCheck: (check: string) => string;
  completionGateCheckStatus: (status: string) => string;
  capability: (capability: string) => string;
  capabilityStatus: (status: string) => string;
  missionDraftItem: (item: string) => string;
  missionDraftStatus: (status: string) => string;
  signal: (signal: string) => string;
  unlockItem: (item: string, count?: number) => string;
  unlockStatus: (status: string) => string;
  roles: (count: number) => string;
  briefs: (total: number, implementable: number) => string;
  sessions: (ready: number, held: number) => string;
  runner: (tasks: number, decision: string) => string;
  focusMission: string;
  runCabinet: string;
  preparePack: string;
  preflight: string;
  runSandbox: string;
  exportIssues: string;
  applyMissionTemplate: string;
  runSelfSimulation: string;
  downloadSelfSimulationJson: string;
  downloadSelfSimulationMarkdown: string;
  downloadLaunchQueueJson: string;
  downloadLaunchQueueMarkdown: string;
  downloadExecutionReceiptJson: string;
  downloadExecutionReceiptMarkdown: string;
  steps: Array<{
    title: string;
    body: string;
  }>;
  permissionGroups: Array<{
    title: string;
    items: string[];
  }>;
}

export interface CodingAgentBriefsCopy {
  title: string;
  total: (count: number) => string;
  implementable: (count: number) => string;
  blocked: (count: number) => string;
  humanReview: (count: number) => string;
  highPriority: (count: number) => string;
  sourceReady: string;
  exportJson: string;
  exportMarkdown: string;
  downloadJson: string;
  downloadMarkdown: string;
  review: string;
  productionReview: string;
  downloadReview: string;
  sessionPack: string;
  productionSession: string;
  dispatchManifest: string;
  sessionDrill: string;
  downloadSessionJson: string;
  downloadSessionMarkdown: string;
  downloadDispatchJson: string;
  downloadDispatchMarkdown: string;
  downloadDispatchArchiveJson: string;
  downloadDispatchArchiveMarkdown: string;
  downloadDispatchArchiveAuditJson: string;
  downloadDispatchArchiveAuditMarkdown: string;
  downloadDispatchSimulationJson: string;
  downloadDispatchSimulationMarkdown: string;
  downloadRunnerManifestJson: string;
  downloadRunnerManifestMarkdown: string;
  downloadRunnerInvocationJson: string;
  downloadRunnerInvocationMarkdown: string;
  downloadRunnerIntakeJson: string;
  downloadRunnerIntakeMarkdown: string;
  downloadRunnerSelfTestJson: string;
  downloadRunnerSelfTestMarkdown: string;
  sandboxRunnerPreflight: string;
  downloadSandboxRunnerPreflightJson: string;
  downloadSandboxRunnerPreflightMarkdown: string;
  runSandboxRunner: string;
  downloadSandboxRunnerJson: string;
  downloadSandboxRunnerMarkdown: string;
  downloadDrillJson: string;
  downloadDrillMarkdown: string;
  receiptTemplate: string;
  importReceipt: string;
  downloadReceiptJson: string;
  downloadReceiptMarkdown: string;
  downloadImplementationEvidenceJson: string;
  downloadImplementationEvidenceMarkdown: string;
  reviewDecision: string;
  reviewNextAction: string;
  reviewReady: string;
  reviewDecisionLabel: (decision: string) => string;
  reviewSummary: (passed: number, warnings: number, blockers: number) => string;
  sessionDecision: string;
  sessionNextAction: string;
  sessionReady: string;
  sessionHeld: (status: string) => string;
  sessionDecisionLabel: (decision: string) => string;
  sessionSummary: (ready: number, held: number) => string;
  sessionContractSummary: (contracts: number, humanApproval: number) => string;
  dispatchDecision: string;
  dispatchNextAction: string;
  dispatchReady: string;
  dispatchDecisionLabel: (decision: string) => string;
  dispatchSummary: (ready: number, held: number, promptFiles: number) => string;
  dispatchReceiptTemplate: (receiptTemplates: number) => string;
  dispatchArchive: string;
  dispatchArchiveSummary: (files: number, promptFiles: number, totalBytes: number) => string;
  dispatchUnassignedHeld: (count: number) => string;
  dispatchArchiveAudit: string;
  dispatchAuditDecisionLabel: (decision: string) => string;
  dispatchAuditSummary: (passed: number, warnings: number, blockers: number) => string;
  dispatchSimulation: string;
  dispatchSimulationDecisionLabel: (decision: string) => string;
  dispatchSimulationSummary: (ready: number, held: number, blocked: number) => string;
  runnerManifest: string;
  runnerManifestDecisionLabel: (decision: string) => string;
  runnerManifestSummary: (readyTasks: number, runnerTasks: number, blockedTasks: number) => string;
  runnerInvocation: string;
  runnerInvocationDecisionLabel: (decision: string) => string;
  runnerInvocationSummary: (readyInvocations: number, invocationFiles: number, blockedInvocations: number) => string;
  runnerIntake: string;
  runnerIntakeDecisionLabel: (decision: string) => string;
  runnerIntakeSummary: (acceptedIntakes: number, invocationFiles: number, blockedIntakes: number) => string;
  runnerSelfTest: string;
  runnerSelfTestDecisionLabel: (decision: string) => string;
  runnerSelfTestSummary: (wouldRun: number, notExecutedCommands: number, blockedTasks: number) => string;
  sandboxRunnerPreflightDecisionLabel: (decision: string) => string;
  sandboxRunnerPreflightSummary: (readyTasks: number, heldTasks: number, blockedTasks: number, processExecutions: number) => string;
  sandboxRunner: string;
  sandboxRunnerDecisionLabel: (decision: string) => string;
  sandboxRunnerSummary: (executedTasks: number, processExecutions: number, commandResults: number) => string;
  drillDecision: string;
  drillNextAction: string;
  drillReady: string;
  drillAction: (action: string) => string;
  drillDecisionLabel: (decision: string) => string;
  drillSummary: (wouldAssign: number, notAssigned: number) => string;
  receiptDecision: string;
  receiptNextAction: string;
  receiptReady: string;
  receiptStatus: (status: string) => string;
  receiptDecisionLabel: (decision: string) => string;
  receiptSummary: (verified: number, pending: number, failed: number) => string;
  mode: string;
  executor: string;
  sandboxBoundary: string;
  evidencePrefix: string;
  allowedActions: (count: number) => string;
  releaseGate: string;
  required: string;
  optional: string;
  crossRole: string;
  promptReady: string;
  empty: string;
  statusGateway: string;
  statusFallback: (errorMessage?: string) => string;
  statusMarkdown: string;
  statusReviewGateway: (decision: string, blockers: number, warnings: number) => string;
  statusReviewLocal: (decision: string, blockers: number, warnings: number, errorMessage?: string) => string;
  statusSessionGateway: (decision: string, ready: number, held: number) => string;
  statusSessionLocal: (decision: string, ready: number, held: number, errorMessage?: string) => string;
  statusDispatchGateway: (decision: string, ready: number, held: number, promptFiles: number) => string;
  statusDispatchLocal: (decision: string, ready: number, held: number, promptFiles: number, errorMessage?: string) => string;
  statusSandboxRunnerPreflightGateway: (decision: string, readyTasks: number, heldTasks: number, blockedTasks: number, processExecutions: number) => string;
  statusSandboxRunnerPreflightLocal: (decision: string, readyTasks: number, heldTasks: number, blockedTasks: number, processExecutions: number, errorMessage?: string) => string;
  statusSandboxRunnerPreflightBlocked: (decision: string, readyTasks: number, heldTasks: number, blockedTasks: number) => string;
  statusSandboxRunnerGateway: (decision: string, executedTasks: number, processExecutions: number, commandResults: number) => string;
  statusSandboxRunnerUnavailable: (errorMessage?: string) => string;
  statusDrillGateway: (decision: string, wouldAssign: number, notAssigned: number) => string;
  statusDrillLocal: (decision: string, wouldAssign: number, notAssigned: number, errorMessage?: string) => string;
  statusReceiptGateway: (decision: string, verified: number, pending: number, failed: number) => string;
  statusReceiptLocal: (decision: string, verified: number, pending: number, failed: number, errorMessage?: string) => string;
  statusReceiptReviewGateway: (decision: string, verified: number, pending: number, failed: number) => string;
  statusReceiptReviewLocal: (decision: string, verified: number, pending: number, failed: number, errorMessage?: string) => string;
  statusReceiptReviewApplied: (
    message: string,
    artifactDecision: string,
    verifiedPaths: number,
    unresolvedPaths: number,
    applied: number,
    skipped: number,
    reusedTranscriptRefs: number,
    reusedChangedFileRefs: number,
    reusedEvidenceArtifactRefs: number,
    transcriptContentMismatches: number
  ) => string;
  statusReceiptImportError: (errorMessage: string) => string;
}

export interface AppCopy {
  brandSubtitle: string;
  language: string;
  rolesActive: (count: number) => string;
  sandboxFirst: string;
  secretsSessionOnly: string;
  resetWorkspace: string;
  importWorkspace: string;
  exportWorkspace: string;
  save: string;
  saved: string;
  runCabinet: string;
  running: string;
  gatewayReady: string;
  missionKicker: string;
  missionTitle: string;
  decision: string;
  notRun: string;
  releaseRehearsalStatus: (decision: string, blockers: number, warnings: number) => string;
  releaseVerificationFallback: (errorMessage?: string) => string;
  releaseVerificationStatus: (decision: string, failed: number) => string;
  releaseRehearsal: ReleaseRehearsalCopy;
  engineeringLaunchpad: EngineeringLaunchpadCopy;
  codingBriefs: CodingAgentBriefsCopy;
}

const STORAGE_KEY = "naikaku.locale";

export const supportedLocales: LocaleOption[] = [
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "zh-Hans", label: "Simplified Chinese", nativeLabel: "简体中文" },
  { code: "zh-Hant", label: "Traditional Chinese", nativeLabel: "繁體中文" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" }
];

export function getInitialLocale(): SupportedLocale {
  if (!canUseLocalStorage()) return "ja";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isSupportedLocale(stored) ? stored : "ja";
}

export function saveLocale(locale: SupportedLocale) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function htmlLang(locale: SupportedLocale) {
  if (locale === "zh-Hans") return "zh-Hans";
  if (locale === "zh-Hant") return "zh-Hant";
  return locale;
}

export function getCopy(locale: SupportedLocale): AppCopy {
  return copies[locale] || copies.ja;
}

function isSupportedLocale(value: string | null): value is SupportedLocale {
  return supportedLocales.some((locale) => locale.code === value);
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

const copies: Record<SupportedLocale, AppCopy> = {
  ja: {
    brandSubtitle: "AI内閣ワークベンチ",
    language: "言語",
    rolesActive: (count) => `${count}役割稼働`,
    sandboxFirst: "サンドボックス優先",
    secretsSessionOnly: "秘密はセッション限定",
    resetWorkspace: "ワークスペースをリセット",
    importWorkspace: "ワークスペースをインポート",
    exportWorkspace: "ワークスペースをエクスポート",
    save: "保存",
    saved: "保存済み",
    runCabinet: "内閣を実行",
    running: "実行中...",
    gatewayReady: "ローカルゲートウェイ待機中。",
    missionKicker: "ミッション自動化",
    missionTitle: "計画、実行、監査、採点、改善を安全なサンドボックスで。",
    decision: "判定",
    notRun: "未実行",
    releaseRehearsalStatus: (decision, blockers, warnings) => `リリース演習 ${jaRehearsalDecision(decision)}: ブロッカー ${blockers}、警告 ${warnings}。`,
    releaseVerificationFallback: (errorMessage) => `ゲートウェイ検証を利用できないため、ローカル検証を使用しました。${errorMessage || ""}`,
    releaseVerificationStatus: (decision, failed) => `リリース検証 ${jaVerificationDecision(decision)}: 失敗 ${failed}件。`,
    engineeringLaunchpad: {
      kicker: "Mac工程起動台",
      title: "ここから監督役とコーディング代理を開始",
      subtitle: "ミッションを書き、内閣で分解し、監督用ブリーフと runner 起動パッケージを作り、許可された Mac ローカル操作だけを実行します。",
      stateLabel: "状態",
      metricsLabel: "Engineering launch metrics",
      permissionModeLabel: "権限モード",
      launchStageLabel: "起動段階",
      nextActionLabel: "次の操作",
      entryLabel: "開始入口",
      entryTitle: "ここに工程タスクを入力して監督組を動かします",
      entryBody: "まず mission brief を書き、自己模擬で監督役同士の復盤、権限境界、runner キューを確認します。実行や Mac 操作は証拠と承認がそろうまで進みません。",
      realityLabel: "今の実能力",
      realityCodeLabel: "コード工程",
      realityMacLabel: "Mac 操作",
      realityExternalLabel: "外部書込",
      realityCodeStatus: (verified, canRun, missionReady, simulated) =>
        verified ? "実行証拠あり" : canRun ? "未実行・準備済み" : simulated ? "agent 引き渡し準備中" : missionReady ? "自己模擬待ち" : "入力待ち",
      realityMacStatus: (canControl) => canControl ? "承認済み runner のみ" : "未接続",
      realityExternalStatus: (requested) => requested ? "未承認で停止" : "既定で拒否",
      missionInputHelp: "ここがユーザーの入力欄です。リポジトリ、やりたい変更、検証コマンド、Mac 権限の要否を書いてから自己模擬を押します。",
      macScopeLabel: "Mac版の実用範囲",
      macScopeItems: [
        "通常はリポジトリ内のコード作成、テスト、ビルド、証拠回収まで",
        "ブラウザ/Mac操作/MCPは runner ごとの allowlist と人間承認が必要",
        "無制限のコンピュータ操作、秘密情報、push/deploy は既定で拒否"
      ],
      macRunnerLabel: "Mac runner 準備度",
      macRunnerPermissionsLabel: "必要権限",
      macRunnerAdaptersLabel: "接続候補",
      macRunnerNextActionsLabel: "次の実装操作",
      macRunnerHonestyLabel: "Mac操作の正直境界",
      macRunnerHonestyClaim: (canControl) =>
        canControl
          ? "このミッション範囲では、承認済みの Mac runner だけがデスクトップ操作できます。"
          : "Naikaku は監督付きのコーディング工程を準備できますが、Mac デスクトップ操作は権限、adapter runtime、action log、receipt がそろうまで未接続です。",
      macRunnerHonestyLimit: "この readiness は権限を付与しません。Accessibility、画面収録、Automation、MCP、push/deploy は別途承認が必要です。",
      macRunnerContractLabel: "Mac runner 契約",
      macRunnerContractChecksLabel: "契約チェック",
      macRunnerContractDeniedLabel: "拒否される動作",
      macRunnerContractInstructionsLabel: "Runner 指示",
      missionInputLabel: "ここに工程タスクを入力",
      missionInputPlaceholder: "例: Mac 版を中心に、ユーザーがこの欄へタスクを入れると監督役が復盤し、coding agent がリポジトリ内で実装、npm run test / npm run build、証拠回収を行う。Git push と Mac 操作は人間承認。",
      missionDraftLabel: "ミッション体検",
      autoWorkLabel: "自動工程",
      autoWorkTitle: "入力したタスクを gateway から実行",
      autoWorkBody: "fixture は外部ツールなしで全経路を検証します。OpenHands はローカル CLI が導入済みで、利用条件を確認した時だけ起動します。",
      autoWorkPresetLabel: "Runner",
      autoWorkPrepared: "準備のみ",
      autoWorkFixture: "Fixture 自動テスト",
      autoWorkOpenHands: "OpenHands CLI",
      autoWorkWorktreeLabel: "作業ツリー",
      autoWorkAdapterReadyLabel: "ローカル adapter 導入・ライセンス確認済み",
      autoWorkAdapterReadyHelp: "このボタンはローカル gateway だけを呼びます。push、deploy、無制限の Mac 操作、秘密情報アクセスは許可しません。",
      autoWorkRun: "自動工程を開始",
      autoWorkRunning: "実行中",
      autoWorkIdle: "まだ自動工程は起動していません。",
      autoWorkMissionRequired: "工程タスクを入力してから自動工程を開始してください。",
      autoWorkOpenHandsNeedsReady: "OpenHands を使う前に、ローカル CLI の導入とライセンス確認を明示してください。",
      autoWorkOutputLabel: "出力",
      autoWorkChecks: (passed, failed) => `チェック ${passed} pass / ${failed} fail`,
      autoWorkResult: (preset, mode, jobs, receipts, evidence, artifacts) =>
        `${preset}・${mode}・完了 job ${jobs}・receipt ${receipts}・証拠 ${evidence}・artifact ${artifacts}`,
      autoWorkStarting: (preset) => `${preset} runner で自動工程を開始しています。`,
      autoWorkCompleted: (preset, passed, jobs, outputDir) =>
        `${preset} 自動工程が完了しました。${passed} checks pass、完了 job ${jobs}、出力 ${outputDir}。`,
      autoWorkFailed: (exitCode, outputDir) =>
        `自動工程が失敗しました。exit ${exitCode ?? "unknown"}、出力 ${outputDir}。`,
      autoWorkGatewayUnavailable: (errorMessage) => `ローカル gateway の自動工程を利用できません。${errorMessage}`,
      runnerReadinessLabel: "Runner 体検",
      runnerReadinessRefresh: "Runner を確認",
      runnerReadinessChecking: "本機の runner コマンドを確認しています。",
      runnerReadinessIdle: "本機 runner はまだ確認していません。",
      runnerReadinessStatus: (ready, detected, launchable, total) =>
        `${total} runner 中 ${ready} ready、${detected} 件検出、Workbench 起動 ${launchable} 件。`,
      runnerReadinessUnavailable: (errorMessage) => `Runner 体検を利用できません。${errorMessage}`,
      runnerReadinessAdapterStatus: (status) => status,
      runnerReadinessDetected: (commands, apps) => `cmd ${commands} / app ${apps}`,
      runnerReadinessNextActionLabel: "次の操作",
      missionDraftScore: (score, present, missing, recommended) => `${score}% / 入力 ${present}・不足 ${missing}・推奨 ${recommended}`,
      capabilitiesLabel: "必要な Mac 工程能力",
      signalsLabel: "検出したミッション信号",
      unlockChecklistLabel: "工程解放チェックリスト",
      selfSimulationLabel: "自己シミュレーション",
      selfSimulationEmpty: "未実行",
      selfSimulationEmptyDetail: "ローカルだけで監督、agent、runner、preflight の流れを演習できます。",
      selfSimulationNextActionsLabel: "次の操作",
      selfSimulationHonestyLabel: "正直境界",
      permissionRequestLabel: "権限リクエスト",
      permissionRequestDeniedLabel: "デフォルト拒否",
      capabilityGapLabel: "能力差分",
      capabilityGapHonestyLabel: "比較の正直境界",
      launchQueueLabel: "工程起動キュー",
      launchQueueEmpty: "未準備",
      launchQueueChecklistLabel: "Runner 手順",
      launchQueueHonestyLabel: "キューの正直境界",
      executionReceiptLabel: "実行回填レシート",
      executionReceiptEmpty: "未回填",
      executionReceiptClaimsLabel: "宣言可否",
      executionReceiptHonestyLabel: "回填の正直境界",
      handoffReceiptLabel: "Agent 引き渡し受領書",
      handoffOperatorScriptLabel: "運用手順",
      completionGateLabel: "完了宣言ゲート",
      completionGateNextActionLabel: "受入前の次操作",
      completionGateBlockedClaimsLabel: "まだ言えないこと",
      selfSimulationSummary: (ready, held, commands, evidence) => `${ready} ready / ${held} held・許可コマンド ${commands}・証拠 ${evidence}`,
      selfSimulationStatus: (decision, ready, commands, evidence) => `自己シミュレーション ${jaEngineeringSelfSimulationDecision(decision)}: ready ${ready}、許可コマンド ${commands}、証拠 ${evidence}。`,
      permissionRequestSummary: (requests, ask, denied) => `${requests}件要求・実行前確認 ${ask}・既定拒否 ${denied}`,
      capabilityGapSummary: (engineering, mac, prepare, control) =>
        `工程準備 ${engineering}%・Mac runtime ${mac}%・工程準備 ${prepare ? "可" : "未完"}・Mac 操作 ${control ? "可" : "未接続"}`,
      launchQueueSummary: (runReady, handoffReady, held, commands, evidence) =>
        `実行可 ${runReady}・引き渡し可 ${handoffReady}・保留 ${held}・許可コマンド ${commands}・証拠 ${evidence}`,
      executionReceiptSummary: (executed, receipts, evidence, artifacts, claim) =>
        `実行 ${executed}・検証済み receipt ${receipts}・受理証拠 ${evidence}・確認済み artifact ${artifacts}・完了宣言 ${claim ? "可" : "不可"}`,
      macRunnerSummary: (ready, approvals, runtime, denied, adapters) =>
        `ready能力 ${ready}・承認待ち ${approvals}・runtime必要 ${runtime}・既定拒否 ${denied}・adapter ${adapters}`,
      macRunnerContractSummary: (total, approval, runtime, blocked, evidence, permissions) =>
        `動作 ${total}・承認待ち ${approval}・runtime必要 ${runtime}・停止 ${blocked}・証拠 ${evidence}・権限 ${permissions}`,
      handoffReceiptSummary: (handoff, sandbox, approvals, evidence) =>
        `Agent 引き渡し ${handoff ? "可" : "未完"}・Sandbox ${sandbox ? "実行可" : "待機"}・承認 ${approvals}・予定証拠 ${evidence}`,
      completionGateSummary: (complete, codeChanged, externalWrite) =>
        `完了宣言 ${complete ? "可" : "不可"}・コード変更 ${codeChanged ? "証拠あり" : "未証明"}・外部書き込み ${externalWrite ? "検討可" : "未承認"}`,
      state: jaEngineeringLaunchState,
      permissionMode: jaEngineeringPermissionMode,
      launchStage: jaEngineeringLaunchStage,
      nextAction: jaEngineeringNextAction,
      selfSimulationDecision: jaEngineeringSelfSimulationDecision,
      selfSimulationStage: jaEngineeringSelfSimulationStage,
      selfSimulationStageStatus: jaEngineeringSelfSimulationStageStatus,
      selfSimulationCapability: jaEngineeringSelfSimulationCapability,
      selfSimulationCapabilityStatus: jaEngineeringSelfSimulationCapabilityStatus,
      permissionRequestDecision: jaEngineeringPermissionRequestDecision,
      permissionRequestMode: jaEngineeringPermissionRequestMode,
      capabilityGapDecision: jaEngineeringCapabilityGapDecision,
      capabilityGapItem: jaEngineeringCapabilityGapItem,
      capabilityGapStatus: jaEngineeringCapabilityGapStatus,
      launchQueueDecision: jaEngineeringLaunchQueueDecision,
      launchQueueStatus: jaEngineeringLaunchQueueStatus,
      executionReceiptDecision: jaEngineeringExecutionReceiptDecision,
      executionReceiptStatus: jaEngineeringExecutionReceiptStatus,
      macRunnerDecision: jaEngineeringMacRunnerDecision,
      macRunnerCapability: jaEngineeringMacRunnerCapability,
      macRunnerCapabilityStatus: jaEngineeringMacRunnerCapabilityStatus,
      macRunnerPermission: jaEngineeringMacRunnerPermission,
      macRunnerPermissionStatus: jaEngineeringMacRunnerPermissionStatus,
      macRunnerAdapter: jaEngineeringMacRunnerAdapter,
      macRunnerAdapterStatus: jaEngineeringMacRunnerAdapterStatus,
      macRunnerNextAction: jaEngineeringMacRunnerNextAction,
      macRunnerContractDecision: jaEngineeringMacRunnerContractDecision,
      macRunnerContractAction: jaEngineeringMacRunnerContractAction,
      macRunnerContractActionStatus: jaEngineeringMacRunnerContractActionStatus,
      macRunnerContractCheckStatus: jaEngineeringMacRunnerContractCheckStatus,
      macRunnerContractDeniedAction: jaEngineeringMacRunnerContractDeniedAction,
      macRunnerContractInstruction: jaEngineeringMacRunnerContractInstruction,
      handoffReceiptDecision: jaEngineeringHandoffDecision,
      handoffLane: jaEngineeringHandoffLane,
      handoffLaneStatus: jaEngineeringHandoffLaneStatus,
      completionGateDecision: jaEngineeringCompletionGateDecision,
      completionGateCheck: jaEngineeringCompletionGateCheck,
      completionGateCheckStatus: jaEngineeringCompletionGateCheckStatus,
      capability: jaEngineeringCapability,
      capabilityStatus: jaEngineeringCapabilityStatus,
      missionDraftItem: jaEngineeringMissionDraftItem,
      missionDraftStatus: jaEngineeringMissionDraftStatus,
      signal: jaEngineeringSignal,
      unlockItem: jaEngineeringUnlockItem,
      unlockStatus: jaEngineeringUnlockStatus,
      roles: (count) => `${count}役割`,
      briefs: (total, implementable) => `${implementable}/${total}実装候補`,
      sessions: (ready, held) => `${ready} ready / ${held} held`,
      runner: (tasks, decision) => `${tasks} runner / ${jaRunnerSelfTestDecision(decision)}`,
      focusMission: "入力欄へ",
      runCabinet: "内閣で分解",
      preparePack: "工程組を準備",
      preflight: "権限確認",
      runSandbox: "ローカル実行",
      exportIssues: "Issue script",
      applyMissionTemplate: "Brief 整形",
      runSelfSimulation: "自己模擬",
      downloadSelfSimulationJson: "模擬 JSON",
      downloadSelfSimulationMarkdown: "模擬 MD",
      downloadLaunchQueueJson: "起動キュー JSON",
      downloadLaunchQueueMarkdown: "起動キュー MD",
      downloadExecutionReceiptJson: "回填レシート JSON",
      downloadExecutionReceiptMarkdown: "回填レシート MD",
      steps: [
        {
          title: "1. ミッション入力",
          body: "作らせたい機能、対象リポジトリ、制約、検証コマンドを mission brief に入れます。"
        },
        {
          title: "2. 監督役で分解",
          body: "内閣を実行すると複数ロールが計画、批評、実行境界、証拠要求を分けます。"
        },
        {
          title: "3. 工程パック作成",
          body: "各 coding agent 用の prompt、receipt、runner invocation、intake、自検を一括生成します。"
        },
        {
          title: "4. Mac 権限確認",
          body: "preflight が許可コマンド、証拠パス、危険操作、保留 session を実行前に止めます。"
        },
        {
          title: "5. 証拠付き実行",
          body: "local gateway がある時だけ sandbox runner がテストを実行し、transcript と証拠を返します。"
        }
      ],
      permissionGroups: [
        {
          title: "今使う最小権限",
          items: [
            "選択したリポジトリ配下の読み書き",
            "output/ 配下への transcript と証拠保存",
            "許可済み shell: npm run test / npm run build",
            "Git 状態確認: status / diff の読み取り"
          ]
        },
        {
          title: "Mac版で追加する権限",
          items: [
            "Browser runner: ブラウザ自動化プロファイル",
            "Desktop runner: Accessibility と Screen Recording",
            "MCP runner: 明示 allowlist のツールだけ",
            "Git push、deploy、外部送信は人間承認"
          ]
        },
        {
          title: "デフォルトで渡さないもの",
          items: [
            "ホスト全体の秘密情報",
            "無制限のコンピュータ操作",
            "本番 deploy 権限",
            "承認なしの GitHub 書き込み"
          ]
        }
      ]
    },
    codingBriefs: {
      title: "コーディング代理ブリーフ",
      total: (count) => `${count}件`,
      implementable: (count) => `${count}実装可`,
      blocked: (count) => `${count}要確認`,
      humanReview: (count) => `${count}人間確認`,
      highPriority: (count) => `${count}高優先`,
      sourceReady: "Development Board から生成",
      exportJson: "JSON出力",
      exportMarkdown: "Markdown出力",
      downloadJson: "JSON取得",
      downloadMarkdown: "Markdown取得",
      review: "Review",
      productionReview: "本番Review",
      downloadReview: "Review取得",
      sessionPack: "Session pack",
      productionSession: "本番Session",
      dispatchManifest: "Dispatch包",
      sessionDrill: "Session演習",
      downloadSessionJson: "Session JSON",
      downloadSessionMarkdown: "Session MD",
      downloadDispatchJson: "Dispatch JSON",
      downloadDispatchMarkdown: "Dispatch MD",
      downloadDispatchArchiveJson: "Archive JSON",
      downloadDispatchArchiveMarkdown: "Archive MD",
      downloadDispatchArchiveAuditJson: "Audit JSON",
      downloadDispatchArchiveAuditMarkdown: "Audit MD",
      downloadDispatchSimulationJson: "Simulation JSON",
      downloadDispatchSimulationMarkdown: "Simulation MD",
      downloadRunnerManifestJson: "Runner JSON",
      downloadRunnerManifestMarkdown: "Runner MD",
      downloadRunnerInvocationJson: "起動パッケージJSON",
      downloadRunnerInvocationMarkdown: "起動パッケージMD",
      downloadRunnerIntakeJson: "受入監査JSON",
      downloadRunnerIntakeMarkdown: "受入監査MD",
      downloadRunnerSelfTestJson: "Self-test JSON",
      downloadRunnerSelfTestMarkdown: "Self-test MD",
      sandboxRunnerPreflight: "Sandbox確認",
      downloadSandboxRunnerPreflightJson: "Sandbox確認 JSON",
      downloadSandboxRunnerPreflightMarkdown: "Sandbox確認 MD",
      runSandboxRunner: "Sandbox実行",
      downloadSandboxRunnerJson: "Sandbox Runner JSON",
      downloadSandboxRunnerMarkdown: "Sandbox Runner MD",
      downloadDrillJson: "演習JSON",
      downloadDrillMarkdown: "演習MD",
      receiptTemplate: "証拠雛形",
      importReceipt: "証拠取込",
      downloadReceiptJson: "証拠JSON",
      downloadReceiptMarkdown: "証拠MD",
      downloadImplementationEvidenceJson: "実装証拠JSON",
      downloadImplementationEvidenceMarkdown: "実装証拠MD",
      reviewDecision: "Review判定",
      reviewNextAction: "次の対応",
      reviewReady: "全てのブリーフは代理への引き渡し前チェックを通過しました。",
      reviewDecisionLabel: jaBriefReviewDecision,
      reviewSummary: (passed, warnings, blockers) => `${passed}合格 / ${warnings}警告 / ${blockers}ブロッカー`,
      sessionDecision: "Session判定",
      sessionNextAction: "次の対応",
      sessionReady: "全ての session は sandboxed coding agent への引き渡し準備ができています。",
      sessionHeld: (status) => `保留: ${jaCodingSessionStatus(status)}`,
      sessionDecisionLabel: jaBriefReviewDecision,
      sessionSummary: (ready, held) => `${ready} ready / ${held} held`,
      sessionContractSummary: (contracts, humanApproval) => `${contracts}件契約 / ${humanApproval}件人間承認`,
      dispatchDecision: "Dispatch判定",
      dispatchNextAction: "次の対応",
      dispatchReady: "引き渡し可能な session の prompt と証拠雛形を Dispatch 包として準備しました。",
      dispatchDecisionLabel: jaCodingDispatchDecision,
      dispatchSummary: (ready, held, promptFiles) => `引き渡し可 ${ready} / 保留 ${held} / prompt ${promptFiles}件`,
      dispatchReceiptTemplate: (receiptTemplates) => `証拠雛形 ${receiptTemplates}件`,
      dispatchArchive: "Dispatch Archive",
      dispatchArchiveSummary: (files, promptFiles, totalBytes) => `${files}ファイル / prompt ${promptFiles}件 / ${totalBytes} bytes`,
      dispatchUnassignedHeld: (count) => `未割当の保留 ${count}件`,
      dispatchArchiveAudit: "Archive監査",
      dispatchAuditDecisionLabel: jaDispatchArchiveAuditDecision,
      dispatchAuditSummary: (passed, warnings, blockers) => `${passed}合格 / ${warnings}警告 / ${blockers}ブロッカー`,
      dispatchSimulation: "実行Simulation",
      dispatchSimulationDecisionLabel: jaDispatchSimulationDecision,
      dispatchSimulationSummary: (ready, held, blocked) => `${ready} ready / ${held} held / ${blocked} block`,
      runnerManifest: "Runnerマニフェスト",
      runnerManifestDecisionLabel: jaRunnerManifestDecision,
      runnerManifestSummary: (readyTasks, runnerTasks, blockedTasks) => `${readyTasks}件準備 / Runner ${runnerTasks}件 / ブロック ${blockedTasks}件`,
      runnerInvocation: "Runner起動パッケージ",
      runnerInvocationDecisionLabel: jaRunnerInvocationDecision,
      runnerInvocationSummary: (readyInvocations, invocationFiles, blockedInvocations) => `${readyInvocations}件準備済み / 起動ファイル ${invocationFiles}件 / ブロック ${blockedInvocations}件`,
      runnerIntake: "Runner受入監査",
      runnerIntakeDecisionLabel: jaRunnerIntakeDecision,
      runnerIntakeSummary: (acceptedIntakes, invocationFiles, blockedIntakes) => `${acceptedIntakes}件受入 / 起動ファイル ${invocationFiles}件 / ブロック ${blockedIntakes}件`,
      runnerSelfTest: "Runner自己検証",
      runnerSelfTestDecisionLabel: jaRunnerSelfTestDecision,
      runnerSelfTestSummary: (wouldRun, notExecutedCommands, blockedTasks) => `${wouldRun}件模擬 / 未実行コマンド ${notExecutedCommands}件 / ブロック ${blockedTasks}件`,
      sandboxRunnerPreflightDecisionLabel: jaSandboxRunnerPreflightDecision,
      sandboxRunnerPreflightSummary: (readyTasks, heldTasks, blockedTasks, processExecutions) => `${readyTasks}件ready / 保留 ${heldTasks}件 / ブロック ${blockedTasks}件 / 予定プロセス ${processExecutions}件`,
      sandboxRunner: "Sandbox Runner",
      sandboxRunnerDecisionLabel: jaSandboxRunnerDecision,
      sandboxRunnerSummary: (executedTasks, processExecutions, commandResults) => `${executedTasks}件実行 / プロセス ${processExecutions}件 / 結果 ${commandResults}件`,
      drillDecision: "Drill判定",
      drillNextAction: "次の対応",
      drillReady: "全ての ready session は sandboxed coding agent への割当シミュレーションを通過しました。",
      drillAction: jaCodingDrillAction,
      drillDecisionLabel: jaCodingDrillDecision,
      drillSummary: (wouldAssign, notAssigned) => `${wouldAssign}割当 / ${notAssigned}停止`,
      receiptDecision: "証拠判定",
      receiptNextAction: "次の対応",
      receiptReady: "全ての receipt は実装証拠レビューを通過しました。",
      receiptStatus: jaCodingReceiptStatus,
      receiptDecisionLabel: jaCodingReceiptDecision,
      receiptSummary: (verified, pending, failed) => `${verified}確認 / ${pending}不足 / ${failed}失敗`,
      mode: "モード",
      executor: "Executor",
      sandboxBoundary: "サンドボックス境界",
      evidencePrefix: "証拠プレフィックス",
      allowedActions: (count) => `${count}件許可アクション`,
      releaseGate: "リリースゲート",
      required: "必須",
      optional: "任意",
      crossRole: "横断",
      promptReady: "代理用 prompt 準備済み",
      empty: "Development Board から coding agent brief を生成してください。",
      statusGateway: "コーディング代理ブリーフをローカルゲートウェイ経由で出力しました。",
      statusFallback: (errorMessage) => `ゲートウェイ brief を利用できないため、ローカル出力を使用しました。${errorMessage || ""}`,
      statusMarkdown: "コーディング代理 Markdown prompt pack をローカルで準備しました。",
      statusReviewGateway: (decision, blockers, warnings) => `ブリーフ review ${jaBriefReviewDecision(decision)}: ブロッカー ${blockers}、警告 ${warnings}。`,
      statusReviewLocal: (decision, blockers, warnings, errorMessage) => `ローカルでブリーフ review ${jaBriefReviewDecision(decision)}: ブロッカー ${blockers}、警告 ${warnings}。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSessionGateway: (decision, ready, held) => `Session bundle ${jaBriefReviewDecision(decision)}: ready ${ready}、held ${held}。`,
      statusSessionLocal: (decision, ready, held, errorMessage) => `ローカルで session bundle ${jaBriefReviewDecision(decision)}: ready ${ready}、held ${held}。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusDispatchGateway: (decision, ready, held, promptFiles) => `Dispatch 包 ${jaCodingDispatchDecision(decision)}: 引き渡し可 ${ready}、保留 ${held}、prompt ${promptFiles}件。`,
      statusDispatchLocal: (decision, ready, held, promptFiles, errorMessage) => `ローカルで Dispatch 包 ${jaCodingDispatchDecision(decision)}: 引き渡し可 ${ready}、保留 ${held}、prompt ${promptFiles}件。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightGateway: (decision, readyTasks, heldTasks, blockedTasks, processExecutions) => `Sandbox確認 ${jaSandboxRunnerPreflightDecision(decision)}: ready ${readyTasks}件、保留 ${heldTasks}件、ブロック ${blockedTasks}件、予定プロセス ${processExecutions}件。`,
      statusSandboxRunnerPreflightLocal: (decision, readyTasks, heldTasks, blockedTasks, processExecutions, errorMessage) => `ローカルで Sandbox確認 ${jaSandboxRunnerPreflightDecision(decision)}: ready ${readyTasks}件、保留 ${heldTasks}件、ブロック ${blockedTasks}件、予定プロセス ${processExecutions}件。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightBlocked: (decision, readyTasks, heldTasks, blockedTasks) => `Sandbox実行は停止しました。Preflight ${jaSandboxRunnerPreflightDecision(decision)}: ready ${readyTasks}件、保留 ${heldTasks}件、ブロック ${blockedTasks}件。`,
      statusSandboxRunnerGateway: (decision, executedTasks, processExecutions, commandResults) => `Sandbox Runner ${jaSandboxRunnerDecision(decision)}: 実行 ${executedTasks}件、プロセス ${processExecutions}件、結果 ${commandResults}件。`,
      statusSandboxRunnerUnavailable: (errorMessage) => `Sandbox Runner はローカル gateway が必要です。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusDrillGateway: (decision, wouldAssign, notAssigned) => `Session演習 ${jaCodingDrillDecision(decision)}: 割当 ${wouldAssign}、停止 ${notAssigned}。`,
      statusDrillLocal: (decision, wouldAssign, notAssigned, errorMessage) => `ローカルで session 演習 ${jaCodingDrillDecision(decision)}: 割当 ${wouldAssign}、停止 ${notAssigned}。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptGateway: (decision, verified, pending, failed) => `証拠雛形 ${jaCodingReceiptDecision(decision)}: 確認 ${verified}、不足 ${pending}、失敗 ${failed}。`,
      statusReceiptLocal: (decision, verified, pending, failed, errorMessage) => `ローカルで証拠雛形 ${jaCodingReceiptDecision(decision)}: 確認 ${verified}、不足 ${pending}、失敗 ${failed}。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptReviewGateway: (decision, verified, pending, failed) => `取り込んだ証拠の審査 ${jaCodingReceiptDecision(decision)}: 確認 ${verified}、不足 ${pending}、失敗 ${failed}。`,
      statusReceiptReviewLocal: (decision, verified, pending, failed, errorMessage) => `ローカルで取り込んだ証拠を審査 ${jaCodingReceiptDecision(decision)}: 確認 ${verified}、不足 ${pending}、失敗 ${failed}。${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptReviewApplied: (message, artifactDecision, verifiedPaths, unresolvedPaths, applied, skipped, reusedTranscriptRefs, reusedChangedFileRefs, reusedEvidenceArtifactRefs, transcriptContentMismatches) =>
        `${message} アーティファクト監査 ${artifactDecision}: ${verifiedPaths}件確認、${unresolvedPaths}件未解決${reusedTranscriptRefs ? `、transcript再利用 ${reusedTranscriptRefs}件` : ""}${reusedChangedFileRefs ? `、changed file再利用 ${reusedChangedFileRefs}件` : ""}${reusedEvidenceArtifactRefs ? `、evidence artifact再利用 ${reusedEvidenceArtifactRefs}件` : ""}${transcriptContentMismatches ? `、内容不一致 ${transcriptContentMismatches}件` : ""}。Development Board へ ${applied}件反映、${skipped}件保留。`,
      statusReceiptImportError: (errorMessage) => `証拠提出書を取り込めませんでした。${errorMessage}`
    },
    releaseRehearsal: {
      title: "リリース演習",
      notRun: "未実行",
      idle: "待機",
      passed: (count) => `${count}合格`,
      warnings: (count) => `${count}警告`,
      blockers: (count) => `${count}ブロッカー`,
      localDryRun: "ローカル dry-run 演習",
      sourceLine: (sourceRun, level, evidenceItems) => `${sourceRun} / ${level} / 証拠 ${evidenceItems}`,
      run: "演習実行",
      exportReport: "報告出力",
      verify: "検証",
      productionCheck: "本番確認",
      exportIssues: "Issue出力",
      exportGh: "gh出力",
      downloadJson: "JSON取得",
      downloadVerify: "検証取得",
      downloadIssues: "Issue取得",
      downloadGh: "gh取得",
      metrics: {
        bundle: "バンドル",
        notes: "ノート",
        runner: "Runner",
        held: "保留",
        ready: (count) => `${count} ready`
      },
      evidenceClaimTitle: (level) => `${level} 証拠クレーム`,
      remediationQueue: "改善キュー",
      remediationSummary: (high, medium) => `${high} high / ${medium} medium`,
      empty: "引き渡し前にローカル release rehearsal を実行してください。",
      decision: {
        releaseReady: "リリース可能",
        needsReview: "レビュー要",
        blocked: "ブロック"
      },
      verification: {
        decision: {
          verified: "検証済み",
          notProductionReady: "本番未準備",
          invalid: "無効"
        },
        scope: (scope, requireProductionEvidence) => `${scope}${requireProductionEvidence ? " / 本番証拠必須" : ""}`,
        result: (passed, failed) => `${passed}合格 / ${failed}失敗`,
        ready: "検証レポートはレビュー可能です。"
      }
    }
  },
  en: {
    brandSubtitle: "Cabinet orchestration workbench",
    language: "Language",
    rolesActive: (count) => `${count} role${count === 1 ? "" : "s"} active`,
    sandboxFirst: "sandbox first",
    secretsSessionOnly: "secrets session-only",
    resetWorkspace: "Reset workspace",
    importWorkspace: "Import workspace",
    exportWorkspace: "Export workspace",
    save: "Save",
    saved: "Saved",
    runCabinet: "Run cabinet",
    running: "Running...",
    gatewayReady: "Gateway ready when local service is running.",
    missionKicker: "Mission automation",
    missionTitle: "Plan, act, audit, score, and iterate inside a governed sandbox.",
    decision: "Decision",
    notRun: "not run",
    releaseRehearsalStatus: (decision, blockers, warnings) => `Release rehearsal ${decision}: ${blockers} blockers, ${warnings} warnings.`,
    releaseVerificationFallback: (errorMessage) => `Gateway release verification unavailable; used local verifier.${errorMessage ? ` ${errorMessage}` : ""}`,
    releaseVerificationStatus: (decision, failed) => `Release verification ${decision}: ${failed} failed checks.`,
    engineeringLaunchpad: {
      kicker: "Mac engineering launchpad",
      title: "Start supervised coding agents here",
      subtitle: "Write the mission, split it through the cabinet, prepare supervisor briefs and runner packages, then execute only approved local Mac actions.",
      stateLabel: "State",
      metricsLabel: "Engineering launch metrics",
      permissionModeLabel: "Permission mode",
      launchStageLabel: "Launch stage",
      nextActionLabel: "Next action",
      entryLabel: "Start here",
      entryTitle: "Type the engineering task here, then start supervisor review",
      entryBody: "Write the mission brief first. Self-simulation rehearses supervisor review, permission boundaries, and runner queue readiness before any coding or Mac operation is claimed.",
      realityLabel: "Actual capability now",
      realityCodeLabel: "Code work",
      realityMacLabel: "Mac control",
      realityExternalLabel: "External write",
      realityCodeStatus: (verified, canRun, missionReady, simulated) =>
        verified ? "execution evidenced" : canRun ? "not run; ready" : simulated ? "agent handoff preparing" : missionReady ? "waiting for self-simulation" : "waiting for input",
      realityMacStatus: (canControl) => canControl ? "approved runner only" : "not connected",
      realityExternalStatus: (requested) => requested ? "blocked until approved" : "denied by default",
      missionInputHelp: "This is the user input field. Include the repo target, desired change, verification commands, and whether Mac permissions are needed, then run self-simulation.",
      macScopeLabel: "Mac app capability scope",
      macScopeItems: [
        "Default scope: code changes inside the repo, tests, build, and evidence collection",
        "Browser, Mac desktop, and MCP control require runner allowlists plus human approval",
        "Unbounded computer control, secrets, push, and deploy are denied by default"
      ],
      macRunnerLabel: "Mac runner readiness",
      macRunnerPermissionsLabel: "Required permissions",
      macRunnerAdaptersLabel: "Adapter candidates",
      macRunnerNextActionsLabel: "Next implementation actions",
      macRunnerHonestyLabel: "Mac control honesty boundary",
      macRunnerHonestyClaim: (canControl) =>
        canControl
          ? "Only the approved Mac runner may control the desktop for this mission scope."
          : "Naikaku can prepare supervised coding work now; Mac desktop control remains disconnected until permissions, adapter runtime, action logs, and receipts exist.",
      macRunnerHonestyLimit: "This readiness report does not grant Accessibility, Screen Recording, Automation, MCP, push, or deploy permission.",
      macRunnerContractLabel: "Mac runner contract",
      macRunnerContractChecksLabel: "Contract checks",
      macRunnerContractDeniedLabel: "Denied actions",
      macRunnerContractInstructionsLabel: "Runner instructions",
      missionInputLabel: "Type the engineering task here",
      missionInputPlaceholder: "Example: Focus on the Mac app path. When the user enters a task here, supervisors review it and the coding agent edits the repo, runs npm run test / npm run build, and collects evidence. Git push and Mac control require human approval.",
      missionDraftLabel: "Mission check",
      autoWorkLabel: "Auto work",
      autoWorkTitle: "Run the entered task through the local gateway",
      autoWorkBody: "Fixture verifies the full path without external tools. OpenHands starts only after the local CLI is installed and license-reviewed.",
      autoWorkPresetLabel: "Runner",
      autoWorkPrepared: "Prepare only",
      autoWorkFixture: "Fixture auto-test",
      autoWorkOpenHands: "OpenHands CLI",
      autoWorkWorktreeLabel: "Worktree",
      autoWorkAdapterReadyLabel: "Local adapter installed and license-reviewed",
      autoWorkAdapterReadyHelp: "This button calls only the local gateway. It does not grant push, deploy, unbounded Mac control, or secret access.",
      autoWorkRun: "Start auto work",
      autoWorkRunning: "Running",
      autoWorkIdle: "Auto work has not started yet.",
      autoWorkMissionRequired: "Enter an engineering task before starting auto work.",
      autoWorkOpenHandsNeedsReady: "Confirm the local OpenHands CLI install and license review before using OpenHands.",
      autoWorkOutputLabel: "Output",
      autoWorkChecks: (passed, failed) => `${passed} checks passed / ${failed} failed`,
      autoWorkResult: (preset, mode, jobs, receipts, evidence, artifacts) =>
        `${preset}, ${mode}, ${jobs} completed jobs, ${receipts} receipts, ${evidence} evidence, ${artifacts} artifacts`,
      autoWorkStarting: (preset) => `Starting auto work with the ${preset} runner.`,
      autoWorkCompleted: (preset, passed, jobs, outputDir) =>
        `${preset} auto work completed: ${passed} checks passed, ${jobs} jobs completed, output ${outputDir}.`,
      autoWorkFailed: (exitCode, outputDir) =>
        `Auto work failed with exit ${exitCode ?? "unknown"}, output ${outputDir}.`,
      autoWorkGatewayUnavailable: (errorMessage) => `Local gateway auto work is unavailable. ${errorMessage}`,
      runnerReadinessLabel: "Runner check",
      runnerReadinessRefresh: "Check runners",
      runnerReadinessChecking: "Checking local runner commands.",
      runnerReadinessIdle: "Local runners have not been checked yet.",
      runnerReadinessStatus: (ready, detected, launchable, total) =>
        `${ready}/${total} ready, ${detected} detected, ${launchable} launchable from Workbench.`,
      runnerReadinessUnavailable: (errorMessage) => `Runner readiness is unavailable. ${errorMessage}`,
      runnerReadinessAdapterStatus: (status) => status,
      runnerReadinessDetected: (commands, apps) => `${commands} cmd / ${apps} app`,
      runnerReadinessNextActionLabel: "Next action",
      missionDraftScore: (score, present, missing, recommended) => `${score}% / ${present} present, ${missing} missing, ${recommended} suggested`,
      capabilitiesLabel: "Required Mac engineering capabilities",
      signalsLabel: "Detected mission signals",
      unlockChecklistLabel: "Engineering unlock checklist",
      selfSimulationLabel: "Self-simulation",
      selfSimulationEmpty: "Not run",
      selfSimulationEmptyDetail: "Rehearse supervision, agents, runner, and preflight locally without executing work.",
      selfSimulationNextActionsLabel: "Next actions",
      selfSimulationHonestyLabel: "Honesty boundary",
      permissionRequestLabel: "Permission request",
      permissionRequestDeniedLabel: "Denied by default",
      capabilityGapLabel: "Capability gap",
      capabilityGapHonestyLabel: "Comparison boundary",
      launchQueueLabel: "Engineering launch queue",
      launchQueueEmpty: "Not prepared",
      launchQueueChecklistLabel: "Runner checklist",
      launchQueueHonestyLabel: "Queue honesty boundary",
      executionReceiptLabel: "Execution receipt",
      executionReceiptEmpty: "No receipt",
      executionReceiptClaimsLabel: "Claim gate",
      executionReceiptHonestyLabel: "Receipt honesty boundary",
      handoffReceiptLabel: "Agent handoff receipt",
      handoffOperatorScriptLabel: "Operator script",
      completionGateLabel: "Completion claim gate",
      completionGateNextActionLabel: "Next before acceptance",
      completionGateBlockedClaimsLabel: "Blocked claims",
      selfSimulationSummary: (ready, held, commands, evidence) => `${ready} ready / ${held} held, ${commands} allowed commands, ${evidence} evidence`,
      selfSimulationStatus: (decision, ready, commands, evidence) => `Self-simulation ${enEngineeringSelfSimulationDecision(decision)}: ${ready} ready sessions, ${commands} allowed commands, ${evidence} evidence artifacts.`,
      permissionRequestSummary: (requests, ask, denied) => `${requests} requests, ${ask} ask-before-use, ${denied} denied defaults`,
      capabilityGapSummary: (engineering, mac, prepare, control) =>
        `engineering ${engineering}%, Mac runtime ${mac}%, prepare ${prepare ? "yes" : "no"}, Mac control ${control ? "yes" : "not connected"}`,
      launchQueueSummary: (runReady, handoffReady, held, commands, evidence) =>
        `${runReady} ready to run, ${handoffReady} ready to handoff, ${held} held, ${commands} allowed commands, ${evidence} evidence`,
      executionReceiptSummary: (executed, receipts, evidence, artifacts, claim) =>
        `${executed} executed, ${receipts} verified receipts, ${evidence} accepted evidence, ${artifacts} verified artifacts, completion ${claim ? "claimable" : "blocked"}`,
      macRunnerSummary: (ready, approvals, runtime, denied, adapters) =>
        `${ready} ready capabilities, ${approvals} approvals, ${runtime} runtime gaps, ${denied} denied defaults, ${adapters} adapters`,
      macRunnerContractSummary: (total, approval, runtime, blocked, evidence, permissions) =>
        `${total} actions, ${approval} approvals, ${runtime} runtime gaps, ${blocked} blocked, ${evidence} evidence targets, ${permissions} permissions`,
      handoffReceiptSummary: (handoff, sandbox, approvals, evidence) =>
        `agent handoff ${handoff ? "ready" : "not ready"}, sandbox ${sandbox ? "runnable" : "waiting"}, approvals ${approvals}, expected evidence ${evidence}`,
      completionGateSummary: (complete, codeChanged, externalWrite) =>
        `completion ${complete ? "claimable" : "not claimable"}, code changes ${codeChanged ? "evidenced" : "unproven"}, external write ${externalWrite ? "reviewable" : "not approved"}`,
      state: enEngineeringLaunchState,
      permissionMode: enEngineeringPermissionMode,
      launchStage: enEngineeringLaunchStage,
      nextAction: enEngineeringNextAction,
      selfSimulationDecision: enEngineeringSelfSimulationDecision,
      selfSimulationStage: enEngineeringSelfSimulationStage,
      selfSimulationStageStatus: enEngineeringSelfSimulationStageStatus,
      selfSimulationCapability: enEngineeringSelfSimulationCapability,
      selfSimulationCapabilityStatus: enEngineeringSelfSimulationCapabilityStatus,
      permissionRequestDecision: enEngineeringPermissionRequestDecision,
      permissionRequestMode: enEngineeringPermissionRequestMode,
      capabilityGapDecision: enEngineeringCapabilityGapDecision,
      capabilityGapItem: enEngineeringCapabilityGapItem,
      capabilityGapStatus: enEngineeringCapabilityGapStatus,
      launchQueueDecision: enEngineeringLaunchQueueDecision,
      launchQueueStatus: enEngineeringLaunchQueueStatus,
      executionReceiptDecision: enEngineeringExecutionReceiptDecision,
      executionReceiptStatus: enEngineeringExecutionReceiptStatus,
      macRunnerDecision: enEngineeringMacRunnerDecision,
      macRunnerCapability: enEngineeringMacRunnerCapability,
      macRunnerCapabilityStatus: enEngineeringMacRunnerCapabilityStatus,
      macRunnerPermission: enEngineeringMacRunnerPermission,
      macRunnerPermissionStatus: enEngineeringMacRunnerPermissionStatus,
      macRunnerAdapter: enEngineeringMacRunnerAdapter,
      macRunnerAdapterStatus: enEngineeringMacRunnerAdapterStatus,
      macRunnerNextAction: enEngineeringMacRunnerNextAction,
      macRunnerContractDecision: enEngineeringMacRunnerContractDecision,
      macRunnerContractAction: enEngineeringMacRunnerContractAction,
      macRunnerContractActionStatus: enEngineeringMacRunnerContractActionStatus,
      macRunnerContractCheckStatus: enEngineeringMacRunnerContractCheckStatus,
      macRunnerContractDeniedAction: enEngineeringMacRunnerContractDeniedAction,
      macRunnerContractInstruction: enEngineeringMacRunnerContractInstruction,
      handoffReceiptDecision: enEngineeringHandoffDecision,
      handoffLane: enEngineeringHandoffLane,
      handoffLaneStatus: enEngineeringHandoffLaneStatus,
      completionGateDecision: enEngineeringCompletionGateDecision,
      completionGateCheck: enEngineeringCompletionGateCheck,
      completionGateCheckStatus: enEngineeringCompletionGateCheckStatus,
      capability: enEngineeringCapability,
      capabilityStatus: enEngineeringCapabilityStatus,
      missionDraftItem: enEngineeringMissionDraftItem,
      missionDraftStatus: enEngineeringMissionDraftStatus,
      signal: enEngineeringSignal,
      unlockItem: enEngineeringUnlockItem,
      unlockStatus: enEngineeringUnlockStatus,
      roles: (count) => `${count} role${count === 1 ? "" : "s"}`,
      briefs: (total, implementable) => `${implementable}/${total} implementation briefs`,
      sessions: (ready, held) => `${ready} ready / ${held} held`,
      runner: (tasks, decision) => `${tasks} runner / ${enRunnerSelfTestDecision(decision)}`,
      focusMission: "Go to input",
      runCabinet: "Split by cabinet",
      preparePack: "Prepare agents",
      preflight: "Check permission",
      runSandbox: "Run local sandbox",
      exportIssues: "Issue script",
      applyMissionTemplate: "Shape brief",
      runSelfSimulation: "Self-simulate",
      downloadSelfSimulationJson: "Simulation JSON",
      downloadSelfSimulationMarkdown: "Simulation MD",
      downloadLaunchQueueJson: "Launch queue JSON",
      downloadLaunchQueueMarkdown: "Launch queue MD",
      downloadExecutionReceiptJson: "Execution receipt JSON",
      downloadExecutionReceiptMarkdown: "Execution receipt MD",
      steps: [
        {
          title: "1. Enter the mission",
          body: "Put the feature, repository target, constraints, and verification commands in the mission brief."
        },
        {
          title: "2. Split supervision",
          body: "Run the cabinet so roles separate planning, critique, execution boundaries, and evidence requirements."
        },
        {
          title: "3. Prepare the agent pack",
          body: "Generate prompts, receipts, runner invocations, intake audit, and self-test for coding agents."
        },
        {
          title: "4. Check Mac permissions",
          body: "Preflight blocks unsafe commands, bad artifact paths, and held sessions before execution starts."
        },
        {
          title: "5. Execute with evidence",
          body: "When the local gateway is running, the sandbox runner executes tests and returns transcripts and evidence."
        }
      ],
      permissionGroups: [
        {
          title: "Minimum used now",
          items: [
            "Read/write inside the selected repository",
            "Write transcripts and evidence under output/",
            "Allowlisted shell: npm run test / npm run build",
            "Git status/diff read access"
          ]
        },
        {
          title: "Mac app additions",
          items: [
            "Browser runner: browser automation profile",
            "Desktop runner: Accessibility and Screen Recording",
            "MCP runner: explicit tool allowlist only",
            "Git push, deploy, and external send require human approval"
          ]
        },
        {
          title: "Never default-granted",
          items: [
            "Host-wide secrets",
            "Unbounded computer control",
            "Production deploy permission",
            "Unapproved GitHub writes"
          ]
        }
      ]
    },
    codingBriefs: {
      title: "Coding agent briefs",
      total: (count) => `${count} briefs`,
      implementable: (count) => `${count} implementable`,
      blocked: (count) => `${count} blocked`,
      humanReview: (count) => `${count} human review`,
      highPriority: (count) => `${count} high priority`,
      sourceReady: "Generated from Development Board",
      exportJson: "Export JSON",
      exportMarkdown: "Export Markdown",
      downloadJson: "Download JSON",
      downloadMarkdown: "Download Markdown",
      review: "Review",
      productionReview: "Prod review",
      downloadReview: "Download review",
      sessionPack: "Session pack",
      productionSession: "Prod session",
      dispatchManifest: "Dispatch pack",
      sessionDrill: "Session drill",
      downloadSessionJson: "Session JSON",
      downloadSessionMarkdown: "Session MD",
      downloadDispatchJson: "Dispatch JSON",
      downloadDispatchMarkdown: "Dispatch MD",
      downloadDispatchArchiveJson: "Archive JSON",
      downloadDispatchArchiveMarkdown: "Archive MD",
      downloadDispatchArchiveAuditJson: "Audit JSON",
      downloadDispatchArchiveAuditMarkdown: "Audit MD",
      downloadDispatchSimulationJson: "Simulation JSON",
      downloadDispatchSimulationMarkdown: "Simulation MD",
      downloadRunnerManifestJson: "Runner JSON",
      downloadRunnerManifestMarkdown: "Runner MD",
      downloadRunnerInvocationJson: "Invocation JSON",
      downloadRunnerInvocationMarkdown: "Invocation MD",
      downloadRunnerIntakeJson: "Intake JSON",
      downloadRunnerIntakeMarkdown: "Intake MD",
      downloadRunnerSelfTestJson: "Self-test JSON",
      downloadRunnerSelfTestMarkdown: "Self-test MD",
      sandboxRunnerPreflight: "Sandbox check",
      downloadSandboxRunnerPreflightJson: "Sandbox check JSON",
      downloadSandboxRunnerPreflightMarkdown: "Sandbox check MD",
      runSandboxRunner: "Run sandbox",
      downloadSandboxRunnerJson: "Sandbox runner JSON",
      downloadSandboxRunnerMarkdown: "Sandbox runner MD",
      downloadDrillJson: "Drill JSON",
      downloadDrillMarkdown: "Drill MD",
      receiptTemplate: "Receipt template",
      importReceipt: "Import receipt",
      downloadReceiptJson: "Receipt JSON",
      downloadReceiptMarkdown: "Receipt MD",
      downloadImplementationEvidenceJson: "Implementation evidence JSON",
      downloadImplementationEvidenceMarkdown: "Implementation evidence MD",
      reviewDecision: "Review decision",
      reviewNextAction: "Next action",
      reviewReady: "All briefs passed pre-handoff checks for coding agents.",
      reviewDecisionLabel: (decision) => decision,
      reviewSummary: (passed, warnings, blockers) => `${passed} pass / ${warnings} warnings / ${blockers} blockers`,
      sessionDecision: "Session decision",
      sessionNextAction: "Next action",
      sessionReady: "All sessions are ready for sandboxed coding agent handoff.",
      sessionHeld: (status) => `Held: ${status}`,
      sessionDecisionLabel: (decision) => decision,
      sessionSummary: (ready, held) => `${ready} ready / ${held} held`,
      sessionContractSummary: (contracts, humanApproval) => `${contracts} contracts / ${humanApproval} human approvals`,
      dispatchDecision: "Dispatch decision",
      dispatchNextAction: "Next action",
      dispatchReady: "Ready session prompts and the receipt template are prepared as a dispatch package.",
      dispatchDecisionLabel: enCodingDispatchDecision,
      dispatchSummary: (ready, held, promptFiles) => `${ready} ready / ${held} held / ${promptFiles} prompts`,
      dispatchReceiptTemplate: (receiptTemplates) => `${receiptTemplates} receipt template`,
      dispatchArchive: "Dispatch archive",
      dispatchArchiveSummary: (files, promptFiles, totalBytes) => `${files} files / ${promptFiles} prompts / ${totalBytes} bytes`,
      dispatchUnassignedHeld: (count) => `${count} held unassigned`,
      dispatchArchiveAudit: "Archive audit",
      dispatchAuditDecisionLabel: enDispatchArchiveAuditDecision,
      dispatchAuditSummary: (passed, warnings, blockers) => `${passed} passed / ${warnings} warnings / ${blockers} blockers`,
      dispatchSimulation: "Execution simulation",
      dispatchSimulationDecisionLabel: enDispatchSimulationDecision,
      dispatchSimulationSummary: (ready, held, blocked) => `${ready} ready / ${held} held / ${blocked} blocked`,
      runnerManifest: "Runner manifest",
      runnerManifestDecisionLabel: enRunnerManifestDecision,
      runnerManifestSummary: (readyTasks, runnerTasks, blockedTasks) => `${readyTasks} ready / ${runnerTasks} runner tasks / ${blockedTasks} blocked`,
      runnerInvocation: "Runner invocation",
      runnerInvocationDecisionLabel: enRunnerInvocationDecision,
      runnerInvocationSummary: (readyInvocations, invocationFiles, blockedInvocations) => `${readyInvocations} ready / ${invocationFiles} invocation files / ${blockedInvocations} blocked`,
      runnerIntake: "Runner intake",
      runnerIntakeDecisionLabel: enRunnerIntakeDecision,
      runnerIntakeSummary: (acceptedIntakes, invocationFiles, blockedIntakes) => `${acceptedIntakes} accepted / ${invocationFiles} invocation files / ${blockedIntakes} blocked`,
      runnerSelfTest: "Runner self-test",
      runnerSelfTestDecisionLabel: enRunnerSelfTestDecision,
      runnerSelfTestSummary: (wouldRun, notExecutedCommands, blockedTasks) => `${wouldRun} would run / ${notExecutedCommands} not-executed commands / ${blockedTasks} blocked`,
      sandboxRunnerPreflightDecisionLabel: enSandboxRunnerPreflightDecision,
      sandboxRunnerPreflightSummary: (readyTasks, heldTasks, blockedTasks, processExecutions) => `${readyTasks} ready / ${heldTasks} held / ${blockedTasks} blocked / ${processExecutions} expected processes`,
      sandboxRunner: "Sandbox runner",
      sandboxRunnerDecisionLabel: enSandboxRunnerDecision,
      sandboxRunnerSummary: (executedTasks, processExecutions, commandResults) => `${executedTasks} executed / ${processExecutions} processes / ${commandResults} command results`,
      drillDecision: "Drill decision",
      drillNextAction: "Next action",
      drillReady: "All ready sessions passed the sandboxed coding-agent assignment simulation.",
      drillAction: enCodingDrillAction,
      drillDecisionLabel: enCodingDrillDecision,
      drillSummary: (wouldAssign, notAssigned) => `${wouldAssign} assign / ${notAssigned} stopped`,
      receiptDecision: "Receipt decision",
      receiptNextAction: "Next action",
      receiptReady: "All receipts passed implementation evidence review.",
      receiptStatus: enCodingReceiptStatus,
      receiptDecisionLabel: enCodingReceiptDecision,
      receiptSummary: (verified, pending, failed) => `${verified} verified / ${pending} pending / ${failed} failed`,
      mode: "Mode",
      executor: "Executor",
      sandboxBoundary: "Sandbox boundary",
      evidencePrefix: "Evidence prefix",
      allowedActions: (count) => `${count} allowed actions`,
      releaseGate: "Release gate",
      required: "required",
      optional: "optional",
      crossRole: "cross-role",
      promptReady: "Agent prompt ready",
      empty: "Generate coding agent briefs from the Development Board.",
      statusGateway: "Coding agent briefs exported through the local gateway.",
      statusFallback: (errorMessage) => `Gateway coding agent briefs unavailable; used local export.${errorMessage ? ` ${errorMessage}` : ""}`,
      statusMarkdown: "Coding agent Markdown prompt pack prepared locally.",
      statusReviewGateway: (decision, blockers, warnings) => `Coding brief review ${decision}: ${blockers} blockers, ${warnings} warnings.`,
      statusReviewLocal: (decision, blockers, warnings, errorMessage) => `Coding brief review completed locally: ${decision}, ${blockers} blockers, ${warnings} warnings.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSessionGateway: (decision, ready, held) => `Coding session bundle ${decision}: ${ready} ready, ${held} held.`,
      statusSessionLocal: (decision, ready, held, errorMessage) => `Coding session bundle completed locally: ${decision}, ${ready} ready, ${held} held.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusDispatchGateway: (decision, ready, held, promptFiles) => `Coding dispatch package ${enCodingDispatchDecision(decision)}: ${ready} ready, ${held} held, ${promptFiles} prompts.`,
      statusDispatchLocal: (decision, ready, held, promptFiles, errorMessage) => `Coding dispatch package completed locally: ${enCodingDispatchDecision(decision)}, ${ready} ready, ${held} held, ${promptFiles} prompts.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightGateway: (decision, readyTasks, heldTasks, blockedTasks, processExecutions) => `Sandbox check ${enSandboxRunnerPreflightDecision(decision)}: ${readyTasks} ready, ${heldTasks} held, ${blockedTasks} blocked, ${processExecutions} expected processes.`,
      statusSandboxRunnerPreflightLocal: (decision, readyTasks, heldTasks, blockedTasks, processExecutions, errorMessage) => `Sandbox check completed locally: ${enSandboxRunnerPreflightDecision(decision)}, ${readyTasks} ready, ${heldTasks} held, ${blockedTasks} blocked, ${processExecutions} expected processes.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightBlocked: (decision, readyTasks, heldTasks, blockedTasks) => `Sandbox execution stopped. Preflight ${enSandboxRunnerPreflightDecision(decision)}: ${readyTasks} ready, ${heldTasks} held, ${blockedTasks} blocked.`,
      statusSandboxRunnerGateway: (decision, executedTasks, processExecutions, commandResults) => `Sandbox runner ${enSandboxRunnerDecision(decision)}: ${executedTasks} executed, ${processExecutions} processes, ${commandResults} command results.`,
      statusSandboxRunnerUnavailable: (errorMessage) => `Sandbox runner requires the local gateway.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusDrillGateway: (decision, wouldAssign, notAssigned) => `Coding session drill ${enCodingDrillDecision(decision)}: ${wouldAssign} assign, ${notAssigned} stopped.`,
      statusDrillLocal: (decision, wouldAssign, notAssigned, errorMessage) => `Coding session drill completed locally: ${enCodingDrillDecision(decision)}, ${wouldAssign} assign, ${notAssigned} stopped.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptGateway: (decision, verified, pending, failed) => `Coding receipt template ${enCodingReceiptDecision(decision)}: ${verified} verified, ${pending} pending, ${failed} failed.`,
      statusReceiptLocal: (decision, verified, pending, failed, errorMessage) => `Coding receipt template completed locally: ${enCodingReceiptDecision(decision)}, ${verified} verified, ${pending} pending, ${failed} failed.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptReviewGateway: (decision, verified, pending, failed) => `Imported receipt review ${enCodingReceiptDecision(decision)}: ${verified} verified, ${pending} pending, ${failed} failed.`,
      statusReceiptReviewLocal: (decision, verified, pending, failed, errorMessage) => `Imported receipt review completed locally: ${enCodingReceiptDecision(decision)}, ${verified} verified, ${pending} pending, ${failed} failed.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptReviewApplied: (message, artifactDecision, verifiedPaths, unresolvedPaths, applied, skipped, reusedTranscriptRefs, reusedChangedFileRefs, reusedEvidenceArtifactRefs, transcriptContentMismatches) =>
        `${message} Artifact audit ${artifactDecision}: ${verifiedPaths} verified, ${unresolvedPaths} unresolved${reusedTranscriptRefs ? `, ${reusedTranscriptRefs} reused transcript refs` : ""}${reusedChangedFileRefs ? `, ${reusedChangedFileRefs} reused changed-file refs` : ""}${reusedEvidenceArtifactRefs ? `, ${reusedEvidenceArtifactRefs} reused evidence-artifact refs` : ""}${transcriptContentMismatches ? `, ${transcriptContentMismatches} content mismatches` : ""}. Development Board applied ${applied}, held ${skipped}.`,
      statusReceiptImportError: (errorMessage) => `Receipt import failed. ${errorMessage}`
    },
    releaseRehearsal: {
      title: "Release rehearsal",
      notRun: "not run",
      idle: "idle",
      passed: (count) => `${count} passed`,
      warnings: (count) => `${count} warnings`,
      blockers: (count) => `${count} blockers`,
      localDryRun: "Local dry-run rehearsal",
      sourceLine: (sourceRun, level, evidenceItems) => `${sourceRun} / ${level} / ${evidenceItems} evidence`,
      run: "Run rehearsal",
      exportReport: "Export report",
      verify: "Verify",
      productionCheck: "Prod check",
      exportIssues: "Export issues",
      exportGh: "Export gh",
      downloadJson: "Download JSON",
      downloadVerify: "Download verify",
      downloadIssues: "Download issues",
      downloadGh: "Download gh",
      metrics: {
        bundle: "Bundle",
        notes: "Notes",
        runner: "Runner",
        held: "Held",
        ready: (count) => `${count} ready`
      },
      evidenceClaimTitle: (level) => `${level} evidence claim`,
      remediationQueue: "Remediation queue",
      remediationSummary: (high, medium) => `${high} high / ${medium} medium`,
      empty: "Run a local release rehearsal before handoff.",
      decision: {
        releaseReady: "release ready",
        needsReview: "needs review",
        blocked: "blocked"
      },
      verification: {
        decision: {
          verified: "verified",
          notProductionReady: "not-production-ready",
          invalid: "invalid"
        },
        scope: (scope, requireProductionEvidence) => `${scope}${requireProductionEvidence ? " / production required" : ""}`,
        result: (passed, failed) => `${passed} pass / ${failed} fail`,
        ready: "Verification report is ready for handoff review."
      }
    }
  },
  "zh-Hans": {
    brandSubtitle: "内阁编排工作台",
    language: "语言",
    rolesActive: (count) => `${count} 个角色启用`,
    sandboxFirst: "沙箱优先",
    secretsSessionOnly: "密钥仅限会话",
    resetWorkspace: "重置工作区",
    importWorkspace: "导入工作区",
    exportWorkspace: "导出工作区",
    save: "保存",
    saved: "已保存",
    runCabinet: "运行内阁",
    running: "运行中...",
    gatewayReady: "本地网关就绪后可运行。",
    missionKicker: "任务自动化",
    missionTitle: "在受治理的沙箱中计划、执行、审计、评分并迭代。",
    decision: "判定",
    notRun: "未运行",
    releaseRehearsalStatus: (decision, blockers, warnings) => `发布演练 ${zhHansRehearsalDecision(decision)}：${blockers} 个阻塞，${warnings} 个警告。`,
    releaseVerificationFallback: (errorMessage) => `网关验证不可用，已使用本地验证。${errorMessage || ""}`,
    releaseVerificationStatus: (decision, failed) => `发布验证 ${zhHansVerificationDecision(decision)}：${failed} 个失败检查。`,
    engineeringLaunchpad: {
      kicker: "Mac 工程启动台",
      title: "从这里启动监督组和编程代理",
      subtitle: "先写任务，再让内阁拆分监督，生成 agent brief 和 runner 包，最后只执行被允许的本地 Mac 操作。",
      stateLabel: "状态",
      metricsLabel: "工程启动指标",
      permissionModeLabel: "权限模式",
      launchStageLabel: "启动阶段",
      nextActionLabel: "下一步",
      entryLabel: "从这里开始",
      entryTitle: "在这里输入工程任务，然后启动监督组复盘",
      entryBody: "先把任务写进 mission brief。自己模拟会让监督角色复盘边界、权限和 runner 队列；没有真实证据前，不会宣称已经写代码或完成。",
      realityLabel: "现在真实能力",
      realityCodeLabel: "代码工程",
      realityMacLabel: "Mac 控制",
      realityExternalLabel: "外部写入",
      realityCodeStatus: (verified, canRun, missionReady, simulated) =>
        verified ? "已有执行证据" : canRun ? "未执行，仅准备好" : simulated ? "agent 交付准备中" : missionReady ? "等待自己模拟" : "等待输入",
      realityMacStatus: (canControl) => canControl ? "仅批准 runner 可用" : "未接入",
      realityExternalStatus: (requested) => requested ? "未审批，已停止" : "默认拒绝",
      missionInputHelp: "这里就是用户输入入口。写清仓库目标、要改什么、验证命令，以及是否需要 Mac 权限，然后点自己模拟。",
      macScopeLabel: "Mac 版能力范围",
      macScopeItems: [
        "默认范围：仓库内写代码、跑测试/构建、收集证据",
        "浏览器、Mac 桌面、MCP 控制需要 runner allowlist 和人工批准",
        "无限制电脑控制、秘密信息、push、deploy 默认拒绝"
      ],
      macRunnerLabel: "Mac runner 就绪度",
      macRunnerPermissionsLabel: "需要的权限",
      macRunnerAdaptersLabel: "可接入适配器",
      macRunnerNextActionsLabel: "下一步工程动作",
      macRunnerHonestyLabel: "Mac 控制诚实边界",
      macRunnerHonestyClaim: (canControl) =>
        canControl
          ? "只有已批准的 Mac runner 可以在本任务范围内控制桌面。"
          : "Naikaku 现在可以准备受监督的编程工程；Mac 桌面控制要等权限、适配器 runtime、动作日志和收据都齐了才算接入。",
      macRunnerHonestyLimit: "这份 readiness 不会授予辅助功能、屏幕录制、自动化、MCP、push 或 deploy 权限。",
      macRunnerContractLabel: "Mac runner 合约",
      macRunnerContractChecksLabel: "合约检查",
      macRunnerContractDeniedLabel: "拒绝的动作",
      macRunnerContractInstructionsLabel: "Runner 指令",
      missionInputLabel: "在这里输入工程任务",
      missionInputPlaceholder: "例：以 Mac 版为主，用户在这个输入框填写任务后，监督角色先复盘，coding agent 再在仓库内实现、运行 npm run test / npm run build、收集证据；Git push 和 Mac 控制必须人工审核。",
      missionDraftLabel: "任务体检",
      autoWorkLabel: "自动工程",
      autoWorkTitle: "把输入的任务交给本地 gateway 执行",
      autoWorkBody: "Fixture 不需要外部工具，可以验证完整链路；OpenHands 只会在本机 CLI 已安装并确认许可后启动。",
      autoWorkPresetLabel: "Runner",
      autoWorkPrepared: "只准备任务",
      autoWorkFixture: "Fixture 自动测试",
      autoWorkOpenHands: "OpenHands CLI",
      autoWorkWorktreeLabel: "工作区",
      autoWorkAdapterReadyLabel: "本地 adapter 已安装并审过许可",
      autoWorkAdapterReadyHelp: "这个按钮只调用本地 gateway，不授予 push、deploy、无限制 Mac 控制或秘密信息访问。",
      autoWorkRun: "启动自动工程",
      autoWorkRunning: "正在运行",
      autoWorkIdle: "自动工程还没有启动。",
      autoWorkMissionRequired: "先输入工程任务，再启动自动工程。",
      autoWorkOpenHandsNeedsReady: "使用 OpenHands 前，请先确认本机 CLI 已安装并完成许可审查。",
      autoWorkOutputLabel: "输出",
      autoWorkChecks: (passed, failed) => `检查 ${passed} 通过 / ${failed} 失败`,
      autoWorkResult: (preset, mode, jobs, receipts, evidence, artifacts) =>
        `${preset}，${mode}，完成 job ${jobs}，receipt ${receipts}，证据 ${evidence}，artifact ${artifacts}`,
      autoWorkStarting: (preset) => `正在用 ${preset} runner 启动自动工程。`,
      autoWorkCompleted: (preset, passed, jobs, outputDir) =>
        `${preset} 自动工程完成：${passed} 项检查通过，${jobs} 个 job 完成，输出 ${outputDir}。`,
      autoWorkFailed: (exitCode, outputDir) =>
        `自动工程失败：exit ${exitCode ?? "unknown"}，输出 ${outputDir}。`,
      autoWorkGatewayUnavailable: (errorMessage) => `本地 gateway 自动工程不可用。${errorMessage}`,
      runnerReadinessLabel: "Runner 体检",
      runnerReadinessRefresh: "检查 runner",
      runnerReadinessChecking: "正在检查本机 runner 命令。",
      runnerReadinessIdle: "还没有检查本机 runner。",
      runnerReadinessStatus: (ready, detected, launchable, total) =>
        `${total} 个 runner 中 ${ready} 个 ready，检测到 ${detected} 个，Workbench 可启动 ${launchable} 个。`,
      runnerReadinessUnavailable: (errorMessage) => `Runner 体检不可用。${errorMessage}`,
      runnerReadinessAdapterStatus: (status) => status,
      runnerReadinessDetected: (commands, apps) => `命令 ${commands} / app ${apps}`,
      runnerReadinessNextActionLabel: "下一步",
      missionDraftScore: (score, present, missing, recommended) => `${score}% / 已有 ${present}・缺少 ${missing}・建议 ${recommended}`,
      capabilitiesLabel: "所需 Mac 工程能力",
      signalsLabel: "识别到的任务信号",
      unlockChecklistLabel: "工程解锁清单",
      selfSimulationLabel: "自己模拟",
      selfSimulationEmpty: "未运行",
      selfSimulationEmptyDetail: "仅在本地演练监督、agent、runner 和 preflight，不执行真实工程。",
      selfSimulationNextActionsLabel: "下一步",
      selfSimulationHonestyLabel: "诚实边界",
      permissionRequestLabel: "权限请求",
      permissionRequestDeniedLabel: "默认拒绝",
      capabilityGapLabel: "能力差距",
      capabilityGapHonestyLabel: "对比边界",
      launchQueueLabel: "工程启动队列",
      launchQueueEmpty: "未准备",
      launchQueueChecklistLabel: "Runner 步骤",
      launchQueueHonestyLabel: "队列诚实边界",
      executionReceiptLabel: "执行回填收据",
      executionReceiptEmpty: "未回填",
      executionReceiptClaimsLabel: "声明闸门",
      executionReceiptHonestyLabel: "回填诚实边界",
      handoffReceiptLabel: "Agent 交付收据",
      handoffOperatorScriptLabel: "操作步骤",
      completionGateLabel: "完工声明闸门",
      completionGateNextActionLabel: "验收前下一步",
      completionGateBlockedClaimsLabel: "现在不能说",
      selfSimulationSummary: (ready, held, commands, evidence) => `${ready} ready / ${held} held，允许命令 ${commands}，证据 ${evidence}`,
      selfSimulationStatus: (decision, ready, commands, evidence) => `自己模拟 ${zhHansEngineeringSelfSimulationDecision(decision)}：ready ${ready}，允许命令 ${commands}，证据 ${evidence}。`,
      permissionRequestSummary: (requests, ask, denied) => `${requests} 项请求，执行前确认 ${ask}，默认拒绝 ${denied}`,
      capabilityGapSummary: (engineering, mac, prepare, control) =>
        `工程准备 ${engineering}%，Mac runtime ${mac}%，准备工程${prepare ? "可行" : "未完成"}，Mac 控制${control ? "可行" : "未接入"}`,
      launchQueueSummary: (runReady, handoffReady, held, commands, evidence) =>
        `可本地跑 ${runReady}，可交给 agent ${handoffReady}，保留 ${held}，允许命令 ${commands}，证据 ${evidence}`,
      executionReceiptSummary: (executed, receipts, evidence, artifacts, claim) =>
        `已执行 ${executed}，已验证收据 ${receipts}，已接受证据 ${evidence}，已验证工件 ${artifacts}，完工声明${claim ? "可说" : "不可说"}`,
      macRunnerSummary: (ready, approvals, runtime, denied, adapters) =>
        `ready 能力 ${ready}，待审批 ${approvals}，缺 runtime ${runtime}，默认拒绝 ${denied}，adapter ${adapters}`,
      macRunnerContractSummary: (total, approval, runtime, blocked, evidence, permissions) =>
        `动作 ${total}，待审批 ${approval}，缺 runtime ${runtime}，阻止 ${blocked}，证据 ${evidence}，权限 ${permissions}`,
      handoffReceiptSummary: (handoff, sandbox, approvals, evidence) =>
        `交给 agent ${handoff ? "可行" : "未就绪"}，沙箱${sandbox ? "可运行" : "等待"}，审批 ${approvals}，预计证据 ${evidence}`,
      completionGateSummary: (complete, codeChanged, externalWrite) =>
        `完工声明${complete ? "可说" : "不可说"}，代码改动${codeChanged ? "有证据" : "未证明"}，外部写入${externalWrite ? "可进入审查" : "未批准"}`,
      state: zhHansEngineeringLaunchState,
      permissionMode: zhHansEngineeringPermissionMode,
      launchStage: zhHansEngineeringLaunchStage,
      nextAction: zhHansEngineeringNextAction,
      selfSimulationDecision: zhHansEngineeringSelfSimulationDecision,
      selfSimulationStage: zhHansEngineeringSelfSimulationStage,
      selfSimulationStageStatus: zhHansEngineeringSelfSimulationStageStatus,
      selfSimulationCapability: zhHansEngineeringSelfSimulationCapability,
      selfSimulationCapabilityStatus: zhHansEngineeringSelfSimulationCapabilityStatus,
      permissionRequestDecision: zhHansEngineeringPermissionRequestDecision,
      permissionRequestMode: zhHansEngineeringPermissionRequestMode,
      capabilityGapDecision: zhHansEngineeringCapabilityGapDecision,
      capabilityGapItem: zhHansEngineeringCapabilityGapItem,
      capabilityGapStatus: zhHansEngineeringCapabilityGapStatus,
      launchQueueDecision: zhHansEngineeringLaunchQueueDecision,
      launchQueueStatus: zhHansEngineeringLaunchQueueStatus,
      executionReceiptDecision: zhHansEngineeringExecutionReceiptDecision,
      executionReceiptStatus: zhHansEngineeringExecutionReceiptStatus,
      macRunnerDecision: zhHansEngineeringMacRunnerDecision,
      macRunnerCapability: zhHansEngineeringMacRunnerCapability,
      macRunnerCapabilityStatus: zhHansEngineeringMacRunnerCapabilityStatus,
      macRunnerPermission: zhHansEngineeringMacRunnerPermission,
      macRunnerPermissionStatus: zhHansEngineeringMacRunnerPermissionStatus,
      macRunnerAdapter: zhHansEngineeringMacRunnerAdapter,
      macRunnerAdapterStatus: zhHansEngineeringMacRunnerAdapterStatus,
      macRunnerNextAction: zhHansEngineeringMacRunnerNextAction,
      macRunnerContractDecision: zhHansEngineeringMacRunnerContractDecision,
      macRunnerContractAction: zhHansEngineeringMacRunnerContractAction,
      macRunnerContractActionStatus: zhHansEngineeringMacRunnerContractActionStatus,
      macRunnerContractCheckStatus: zhHansEngineeringMacRunnerContractCheckStatus,
      macRunnerContractDeniedAction: zhHansEngineeringMacRunnerContractDeniedAction,
      macRunnerContractInstruction: zhHansEngineeringMacRunnerContractInstruction,
      handoffReceiptDecision: zhHansEngineeringHandoffDecision,
      handoffLane: zhHansEngineeringHandoffLane,
      handoffLaneStatus: zhHansEngineeringHandoffLaneStatus,
      completionGateDecision: zhHansEngineeringCompletionGateDecision,
      completionGateCheck: zhHansEngineeringCompletionGateCheck,
      completionGateCheckStatus: zhHansEngineeringCompletionGateCheckStatus,
      capability: zhHansEngineeringCapability,
      capabilityStatus: zhHansEngineeringCapabilityStatus,
      missionDraftItem: zhHansEngineeringMissionDraftItem,
      missionDraftStatus: zhHansEngineeringMissionDraftStatus,
      signal: zhHansEngineeringSignal,
      unlockItem: zhHansEngineeringUnlockItem,
      unlockStatus: zhHansEngineeringUnlockStatus,
      roles: (count) => `${count} 个角色`,
      briefs: (total, implementable) => `${implementable}/${total} 个实现 brief`,
      sessions: (ready, held) => `${ready} ready / ${held} held`,
      runner: (tasks, decision) => `${tasks} runner / ${zhHansRunnerSelfTestDecision(decision)}`,
      focusMission: "去输入",
      runCabinet: "内阁拆分",
      preparePack: "准备工程组",
      preflight: "权限检查",
      runSandbox: "本地沙箱运行",
      exportIssues: "Issue 脚本",
      applyMissionTemplate: "整理任务",
      runSelfSimulation: "自己模拟",
      downloadSelfSimulationJson: "模拟 JSON",
      downloadSelfSimulationMarkdown: "模拟 MD",
      downloadLaunchQueueJson: "启动队列 JSON",
      downloadLaunchQueueMarkdown: "启动队列 MD",
      downloadExecutionReceiptJson: "回填收据 JSON",
      downloadExecutionReceiptMarkdown: "回填收据 MD",
      steps: [
        {
          title: "1. 输入任务",
          body: "把要做的功能、仓库目标、限制条件、验证命令写进 mission brief。"
        },
        {
          title: "2. 监督拆分",
          body: "运行内阁，让多个角色分开做计划、批评、执行边界和证据要求。"
        },
        {
          title: "3. 生成工程包",
          body: "一次生成 prompt、receipt、runner invocation、接收审查和自测。"
        },
        {
          title: "4. Mac 权限检查",
          body: "preflight 在执行前拦截危险命令、错误证据路径和被保留的 session。"
        },
        {
          title: "5. 带证据执行",
          body: "本地 gateway 运行时，sandbox runner 才会执行测试并返回 transcript 和证据。"
        }
      ],
      permissionGroups: [
        {
          title: "现在使用的最小权限",
          items: [
            "所选仓库内的读写权限",
            "在 output/ 下写入 transcript 和证据",
            "允许的 shell: npm run test / npm run build",
            "Git status/diff 读取权限"
          ]
        },
        {
          title: "Mac 版可追加能力",
          items: [
            "Browser runner: 浏览器自动化配置",
            "Desktop runner: 辅助功能和屏幕录制权限",
            "MCP runner: 仅显式 allowlist 工具",
            "Git push、deploy、外部发送都需要人工批准"
          ]
        },
        {
          title: "默认不给的权限",
          items: [
            "整台主机的秘密信息",
            "无限制电脑控制",
            "生产部署权限",
            "未批准的 GitHub 写入"
          ]
        }
      ]
    },
    codingBriefs: {
      title: "编程代理 brief",
      total: (count) => `${count} 个 brief`,
      implementable: (count) => `${count} 可实现`,
      blocked: (count) => `${count} 需确认`,
      humanReview: (count) => `${count} 人工确认`,
      highPriority: (count) => `${count} 高优先`,
      sourceReady: "由 Development Board 生成",
      exportJson: "导出 JSON",
      exportMarkdown: "导出 Markdown",
      downloadJson: "下载 JSON",
      downloadMarkdown: "下载 Markdown",
      review: "审查",
      productionReview: "生产审查",
      downloadReview: "下载审查",
      sessionPack: "Session 包",
      productionSession: "生产 Session",
      dispatchManifest: "Dispatch 包",
      sessionDrill: "Session 演练",
      downloadSessionJson: "Session JSON",
      downloadSessionMarkdown: "Session MD",
      downloadDispatchJson: "Dispatch JSON",
      downloadDispatchMarkdown: "Dispatch MD",
      downloadDispatchArchiveJson: "归档 JSON",
      downloadDispatchArchiveMarkdown: "归档 MD",
      downloadDispatchArchiveAuditJson: "审计 JSON",
      downloadDispatchArchiveAuditMarkdown: "审计 MD",
      downloadDispatchSimulationJson: "模拟 JSON",
      downloadDispatchSimulationMarkdown: "模拟 MD",
      downloadRunnerManifestJson: "Runner JSON",
      downloadRunnerManifestMarkdown: "Runner MD",
      downloadRunnerInvocationJson: "调用包 JSON",
      downloadRunnerInvocationMarkdown: "调用包 MD",
      downloadRunnerIntakeJson: "接收审查 JSON",
      downloadRunnerIntakeMarkdown: "接收审查 MD",
      downloadRunnerSelfTestJson: "自测 JSON",
      downloadRunnerSelfTestMarkdown: "自测 MD",
      sandboxRunnerPreflight: "沙箱检查",
      downloadSandboxRunnerPreflightJson: "沙箱检查 JSON",
      downloadSandboxRunnerPreflightMarkdown: "沙箱检查 MD",
      runSandboxRunner: "运行沙箱",
      downloadSandboxRunnerJson: "沙箱 Runner JSON",
      downloadSandboxRunnerMarkdown: "沙箱 Runner MD",
      downloadDrillJson: "演练 JSON",
      downloadDrillMarkdown: "演练 MD",
      receiptTemplate: "证据模板",
      importReceipt: "导入证据",
      downloadReceiptJson: "证据 JSON",
      downloadReceiptMarkdown: "证据 MD",
      downloadImplementationEvidenceJson: "实现证据 JSON",
      downloadImplementationEvidenceMarkdown: "实现证据 MD",
      reviewDecision: "审查判定",
      reviewNextAction: "下一步",
      reviewReady: "所有 brief 已通过交付给编程代理前的检查。",
      reviewDecisionLabel: zhHansBriefReviewDecision,
      reviewSummary: (passed, warnings, blockers) => `${passed} 通过 / ${warnings} 警告 / ${blockers} 阻塞`,
      sessionDecision: "Session 判定",
      sessionNextAction: "下一步",
      sessionReady: "所有 session 都已准备好交付给沙箱编程代理。",
      sessionHeld: (status) => `保留：${zhHansCodingSessionStatus(status)}`,
      sessionDecisionLabel: zhHansBriefReviewDecision,
      sessionSummary: (ready, held) => `${ready} ready / ${held} held`,
      sessionContractSummary: (contracts, humanApproval) => `${contracts} 个合约 / ${humanApproval} 个需人工批准`,
      dispatchDecision: "Dispatch 判定",
      dispatchNextAction: "下一步",
      dispatchReady: "Ready session 的 prompt 和 receipt template 已作为 dispatch 包准备好。",
      dispatchDecisionLabel: zhHansCodingDispatchDecision,
      dispatchSummary: (ready, held, promptFiles) => `${ready} ready / ${held} held / ${promptFiles} prompt`,
      dispatchReceiptTemplate: (receiptTemplates) => `${receiptTemplates} 个 receipt template`,
      dispatchArchive: "Dispatch 归档",
      dispatchArchiveSummary: (files, promptFiles, totalBytes) => `${files} 个文件 / ${promptFiles} 个 prompt / ${totalBytes} bytes`,
      dispatchUnassignedHeld: (count) => `${count} 个 held 未分配`,
      dispatchArchiveAudit: "归档审计",
      dispatchAuditDecisionLabel: zhHansDispatchArchiveAuditDecision,
      dispatchAuditSummary: (passed, warnings, blockers) => `${passed} 通过 / ${warnings} 警告 / ${blockers} 阻塞`,
      dispatchSimulation: "执行模拟",
      dispatchSimulationDecisionLabel: zhHansDispatchSimulationDecision,
      dispatchSimulationSummary: (ready, held, blocked) => `${ready} 可交付 / ${held} 保留 / ${blocked} 阻塞`,
      runnerManifest: "Runner 清单",
      runnerManifestDecisionLabel: zhHansRunnerManifestDecision,
      runnerManifestSummary: (readyTasks, runnerTasks, blockedTasks) => `${readyTasks} 可交付 / ${runnerTasks} runner 任务 / ${blockedTasks} 阻塞`,
      runnerInvocation: "Runner 调用包",
      runnerInvocationDecisionLabel: zhHansRunnerInvocationDecision,
      runnerInvocationSummary: (readyInvocations, invocationFiles, blockedInvocations) => `${readyInvocations} 个已准备 / ${invocationFiles} 个调用文件 / ${blockedInvocations} 个阻塞`,
      runnerIntake: "Runner 接收审查",
      runnerIntakeDecisionLabel: zhHansRunnerIntakeDecision,
      runnerIntakeSummary: (acceptedIntakes, invocationFiles, blockedIntakes) => `${acceptedIntakes} 个已接收 / ${invocationFiles} 个调用文件 / ${blockedIntakes} 个阻塞`,
      runnerSelfTest: "Runner 自测",
      runnerSelfTestDecisionLabel: zhHansRunnerSelfTestDecision,
      runnerSelfTestSummary: (wouldRun, notExecutedCommands, blockedTasks) => `${wouldRun} 可模拟 / ${notExecutedCommands} 条未执行命令 / ${blockedTasks} 阻塞`,
      sandboxRunnerPreflightDecisionLabel: zhHansSandboxRunnerPreflightDecision,
      sandboxRunnerPreflightSummary: (readyTasks, heldTasks, blockedTasks, processExecutions) => `${readyTasks} ready / ${heldTasks} 保留 / ${blockedTasks} 阻塞 / ${processExecutions} 个预计进程`,
      sandboxRunner: "沙箱 Runner",
      sandboxRunnerDecisionLabel: zhHansSandboxRunnerDecision,
      sandboxRunnerSummary: (executedTasks, processExecutions, commandResults) => `${executedTasks} 已执行 / ${processExecutions} 个进程 / ${commandResults} 条命令结果`,
      drillDecision: "Drill 判定",
      drillNextAction: "下一步",
      drillReady: "所有 ready session 已通过沙箱编程代理分配模拟。",
      drillAction: zhHansCodingDrillAction,
      drillDecisionLabel: zhHansCodingDrillDecision,
      drillSummary: (wouldAssign, notAssigned) => `${wouldAssign} 分配 / ${notAssigned} 停止`,
      receiptDecision: "证据判定",
      receiptNextAction: "下一步",
      receiptReady: "所有 receipt 已通过实现证据审查。",
      receiptStatus: zhHansCodingReceiptStatus,
      receiptDecisionLabel: zhHansCodingReceiptDecision,
      receiptSummary: (verified, pending, failed) => `${verified} 已确认 / ${pending} 缺证据 / ${failed} 失败`,
      mode: "模式",
      executor: "Executor",
      sandboxBoundary: "沙箱边界",
      evidencePrefix: "证据前缀",
      allowedActions: (count) => `${count} 个允许动作`,
      releaseGate: "发布门",
      required: "必需",
      optional: "可选",
      crossRole: "跨角色",
      promptReady: "代理 prompt 已准备",
      empty: "请从 Development Board 生成编程代理 brief。",
      statusGateway: "编程代理 brief 已通过本地网关导出。",
      statusFallback: (errorMessage) => `网关 brief 不可用，已使用本地导出。${errorMessage || ""}`,
      statusMarkdown: "编程代理 Markdown prompt pack 已在本地准备。",
      statusReviewGateway: (decision, blockers, warnings) => `编程代理 brief 审查 ${zhHansBriefReviewDecision(decision)}：${blockers} 个阻塞，${warnings} 个警告。`,
      statusReviewLocal: (decision, blockers, warnings, errorMessage) => `已在本地完成 brief 审查 ${zhHansBriefReviewDecision(decision)}：${blockers} 个阻塞，${warnings} 个警告。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusSessionGateway: (decision, ready, held) => `编程代理 session 包 ${zhHansBriefReviewDecision(decision)}：${ready} ready，${held} held。`,
      statusSessionLocal: (decision, ready, held, errorMessage) => `已在本地完成 session 包 ${zhHansBriefReviewDecision(decision)}：${ready} ready，${held} held。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusDispatchGateway: (decision, ready, held, promptFiles) => `编程代理 dispatch 包 ${zhHansCodingDispatchDecision(decision)}：${ready} ready，${held} held，${promptFiles} prompt。`,
      statusDispatchLocal: (decision, ready, held, promptFiles, errorMessage) => `已在本地完成 dispatch 包 ${zhHansCodingDispatchDecision(decision)}：${ready} ready，${held} held，${promptFiles} prompt。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightGateway: (decision, readyTasks, heldTasks, blockedTasks, processExecutions) => `沙箱检查 ${zhHansSandboxRunnerPreflightDecision(decision)}：${readyTasks} ready，${heldTasks} 保留，${blockedTasks} 阻塞，预计进程 ${processExecutions} 个。`,
      statusSandboxRunnerPreflightLocal: (decision, readyTasks, heldTasks, blockedTasks, processExecutions, errorMessage) => `已在本地完成沙箱检查 ${zhHansSandboxRunnerPreflightDecision(decision)}：${readyTasks} ready，${heldTasks} 保留，${blockedTasks} 阻塞，预计进程 ${processExecutions} 个。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightBlocked: (decision, readyTasks, heldTasks, blockedTasks) => `沙箱执行已停止。预检 ${zhHansSandboxRunnerPreflightDecision(decision)}：${readyTasks} ready，${heldTasks} 保留，${blockedTasks} 阻塞。`,
      statusSandboxRunnerGateway: (decision, executedTasks, processExecutions, commandResults) => `沙箱 Runner ${zhHansSandboxRunnerDecision(decision)}：执行 ${executedTasks} 项，进程 ${processExecutions} 个，命令结果 ${commandResults} 条。`,
      statusSandboxRunnerUnavailable: (errorMessage) => `沙箱 Runner 需要本地 gateway。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusDrillGateway: (decision, wouldAssign, notAssigned) => `编程代理 session 演练 ${zhHansCodingDrillDecision(decision)}：${wouldAssign} 分配，${notAssigned} 停止。`,
      statusDrillLocal: (decision, wouldAssign, notAssigned, errorMessage) => `已在本地完成 session 演练 ${zhHansCodingDrillDecision(decision)}：${wouldAssign} 分配，${notAssigned} 停止。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusReceiptGateway: (decision, verified, pending, failed) => `编程代理证据模板 ${zhHansCodingReceiptDecision(decision)}：${verified} 已确认，${pending} 缺证据，${failed} 失败。`,
      statusReceiptLocal: (decision, verified, pending, failed, errorMessage) => `已在本地完成证据模板 ${zhHansCodingReceiptDecision(decision)}：${verified} 已确认，${pending} 缺证据，${failed} 失败。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusReceiptReviewGateway: (decision, verified, pending, failed) => `导入证据审查 ${zhHansCodingReceiptDecision(decision)}：${verified} 已确认，${pending} 缺证据，${failed} 失败。`,
      statusReceiptReviewLocal: (decision, verified, pending, failed, errorMessage) => `已在本地完成导入证据审查 ${zhHansCodingReceiptDecision(decision)}：${verified} 已确认，${pending} 缺证据，${failed} 失败。${errorMessage ? ` 网关：${errorMessage}` : ""}`,
      statusReceiptReviewApplied: (message, artifactDecision, verifiedPaths, unresolvedPaths, applied, skipped, reusedTranscriptRefs, reusedChangedFileRefs, reusedEvidenceArtifactRefs, transcriptContentMismatches) =>
        `${message} 工件审计 ${artifactDecision}：${verifiedPaths} 项已确认，${unresolvedPaths} 项未解决${reusedTranscriptRefs ? `，${reusedTranscriptRefs} 项 transcript 复用` : ""}${reusedChangedFileRefs ? `，${reusedChangedFileRefs} 项 changed file 复用` : ""}${reusedEvidenceArtifactRefs ? `，${reusedEvidenceArtifactRefs} 项 evidence artifact 复用` : ""}${transcriptContentMismatches ? `，${transcriptContentMismatches} 项内容不匹配` : ""}。Development Board 已应用 ${applied} 项，保留 ${skipped} 项。`,
      statusReceiptImportError: (errorMessage) => `证据回执导入失败。${errorMessage}`
    },
    releaseRehearsal: {
      title: "发布演练",
      notRun: "未运行",
      idle: "待机",
      passed: (count) => `${count} 通过`,
      warnings: (count) => `${count} 警告`,
      blockers: (count) => `${count} 阻塞`,
      localDryRun: "本地 dry-run 演练",
      sourceLine: (sourceRun, level, evidenceItems) => `${sourceRun} / ${level} / ${evidenceItems} 条证据`,
      run: "运行演练",
      exportReport: "导出报告",
      verify: "验证",
      productionCheck: "生产检查",
      exportIssues: "导出 issues",
      exportGh: "导出 gh",
      downloadJson: "下载 JSON",
      downloadVerify: "下载验证",
      downloadIssues: "下载 issues",
      downloadGh: "下载 gh",
      metrics: {
        bundle: "Bundle",
        notes: "Notes",
        runner: "Runner",
        held: "保留",
        ready: (count) => `${count} ready`
      },
      evidenceClaimTitle: (level) => `${level} 证据声明`,
      remediationQueue: "整改队列",
      remediationSummary: (high, medium) => `${high} 高 / ${medium} 中`,
      empty: "交付前请先运行本地发布演练。",
      decision: {
        releaseReady: "可发布",
        needsReview: "需审查",
        blocked: "已阻塞"
      },
      verification: {
        decision: {
          verified: "已验证",
          notProductionReady: "生产未就绪",
          invalid: "无效"
        },
        scope: (scope, requireProductionEvidence) => `${scope}${requireProductionEvidence ? " / 需要生产证据" : ""}`,
        result: (passed, failed) => `${passed} 通过 / ${failed} 失败`,
        ready: "验证报告已可用于交付审查。"
      }
    }
  },
  "zh-Hant": {
    brandSubtitle: "內閣編排工作台",
    language: "語言",
    rolesActive: (count) => `${count} 個角色啟用`,
    sandboxFirst: "沙箱優先",
    secretsSessionOnly: "密鑰僅限會話",
    resetWorkspace: "重置工作區",
    importWorkspace: "匯入工作區",
    exportWorkspace: "匯出工作區",
    save: "儲存",
    saved: "已儲存",
    runCabinet: "執行內閣",
    running: "執行中...",
    gatewayReady: "本地閘道就緒後可執行。",
    missionKicker: "任務自動化",
    missionTitle: "在受治理的沙箱中規劃、執行、稽核、評分並迭代。",
    decision: "判定",
    notRun: "未執行",
    releaseRehearsalStatus: (decision, blockers, warnings) => `發布演練 ${zhHantRehearsalDecision(decision)}：${blockers} 個阻塞，${warnings} 個警告。`,
    releaseVerificationFallback: (errorMessage) => `閘道驗證不可用，已使用本地驗證。${errorMessage || ""}`,
    releaseVerificationStatus: (decision, failed) => `發布驗證 ${zhHantVerificationDecision(decision)}：${failed} 個失敗檢查。`,
    engineeringLaunchpad: {
      kicker: "Mac 工程啟動台",
      title: "從這裡啟動監督組和編程代理",
      subtitle: "先寫任務，再讓內閣拆分監督，生成 agent brief 和 runner 包，最後只執行被允許的本地 Mac 操作。",
      stateLabel: "狀態",
      metricsLabel: "工程啟動指標",
      permissionModeLabel: "權限模式",
      launchStageLabel: "啟動階段",
      nextActionLabel: "下一步",
      entryLabel: "從這裡開始",
      entryTitle: "在這裡輸入工程任務，然後啟動監督組復盤",
      entryBody: "先把任務寫進 mission brief。自己模擬會讓監督角色復盤邊界、權限和 runner 佇列；沒有真實證據前，不會宣稱已經寫程式或完成。",
      realityLabel: "現在真實能力",
      realityCodeLabel: "程式工程",
      realityMacLabel: "Mac 控制",
      realityExternalLabel: "外部寫入",
      realityCodeStatus: (verified, canRun, missionReady, simulated) =>
        verified ? "已有執行證據" : canRun ? "未執行，僅準備好" : simulated ? "agent 交付準備中" : missionReady ? "等待自己模擬" : "等待輸入",
      realityMacStatus: (canControl) => canControl ? "僅批准 runner 可用" : "未接入",
      realityExternalStatus: (requested) => requested ? "未審批，已停止" : "預設拒絕",
      missionInputHelp: "這裡就是使用者輸入入口。寫清倉庫目標、要改什麼、驗證命令，以及是否需要 Mac 權限，然後點自己模擬。",
      macScopeLabel: "Mac 版能力範圍",
      macScopeItems: [
        "預設範圍：倉庫內寫程式、跑測試/建置、收集證據",
        "瀏覽器、Mac 桌面、MCP 控制需要 runner allowlist 和人工批准",
        "無限制電腦控制、秘密資訊、push、deploy 預設拒絕"
      ],
      macRunnerLabel: "Mac runner 就緒度",
      macRunnerPermissionsLabel: "需要的權限",
      macRunnerAdaptersLabel: "可接入適配器",
      macRunnerNextActionsLabel: "下一步工程動作",
      macRunnerHonestyLabel: "Mac 控制誠實邊界",
      macRunnerHonestyClaim: (canControl) =>
        canControl
          ? "只有已批准的 Mac runner 可以在本任務範圍內控制桌面。"
          : "Naikaku 現在可以準備受監督的編程工程；Mac 桌面控制要等權限、適配器 runtime、動作日誌和收據都齊了才算接入。",
      macRunnerHonestyLimit: "這份 readiness 不會授予輔助使用、螢幕錄製、自動化、MCP、push 或 deploy 權限。",
      macRunnerContractLabel: "Mac runner 合約",
      macRunnerContractChecksLabel: "合約檢查",
      macRunnerContractDeniedLabel: "拒絕的動作",
      macRunnerContractInstructionsLabel: "Runner 指令",
      missionInputLabel: "在這裡輸入工程任務",
      missionInputPlaceholder: "例：以 Mac 版為主，使用者在這個輸入框填寫任務後，監督角色先復盤，coding agent 再在倉庫內實作、執行 npm run test / npm run build、收集證據；Git push 和 Mac 控制必須人工審核。",
      missionDraftLabel: "任務體檢",
      autoWorkLabel: "自動工程",
      autoWorkTitle: "把輸入的任務交給本地 gateway 執行",
      autoWorkBody: "Fixture 不需要外部工具，可以驗證完整鏈路；OpenHands 只會在本機 CLI 已安裝並確認授權後啟動。",
      autoWorkPresetLabel: "Runner",
      autoWorkPrepared: "只準備任務",
      autoWorkFixture: "Fixture 自動測試",
      autoWorkOpenHands: "OpenHands CLI",
      autoWorkWorktreeLabel: "工作區",
      autoWorkAdapterReadyLabel: "本地 adapter 已安裝並審過授權",
      autoWorkAdapterReadyHelp: "這個按鈕只呼叫本地 gateway，不授予 push、deploy、無限制 Mac 控制或秘密資訊存取。",
      autoWorkRun: "啟動自動工程",
      autoWorkRunning: "正在執行",
      autoWorkIdle: "自動工程還沒有啟動。",
      autoWorkMissionRequired: "先輸入工程任務，再啟動自動工程。",
      autoWorkOpenHandsNeedsReady: "使用 OpenHands 前，請先確認本機 CLI 已安裝並完成授權審查。",
      autoWorkOutputLabel: "輸出",
      autoWorkChecks: (passed, failed) => `檢查 ${passed} 通過 / ${failed} 失敗`,
      autoWorkResult: (preset, mode, jobs, receipts, evidence, artifacts) =>
        `${preset}，${mode}，完成 job ${jobs}，receipt ${receipts}，證據 ${evidence}，artifact ${artifacts}`,
      autoWorkStarting: (preset) => `正在用 ${preset} runner 啟動自動工程。`,
      autoWorkCompleted: (preset, passed, jobs, outputDir) =>
        `${preset} 自動工程完成：${passed} 項檢查通過，${jobs} 個 job 完成，輸出 ${outputDir}。`,
      autoWorkFailed: (exitCode, outputDir) =>
        `自動工程失敗：exit ${exitCode ?? "unknown"}，輸出 ${outputDir}。`,
      autoWorkGatewayUnavailable: (errorMessage) => `本地 gateway 自動工程不可用。${errorMessage}`,
      runnerReadinessLabel: "Runner 體檢",
      runnerReadinessRefresh: "檢查 runner",
      runnerReadinessChecking: "正在檢查本機 runner 命令。",
      runnerReadinessIdle: "還沒有檢查本機 runner。",
      runnerReadinessStatus: (ready, detected, launchable, total) =>
        `${total} 個 runner 中 ${ready} 個 ready，偵測到 ${detected} 個，Workbench 可啟動 ${launchable} 個。`,
      runnerReadinessUnavailable: (errorMessage) => `Runner 體檢不可用。${errorMessage}`,
      runnerReadinessAdapterStatus: (status) => status,
      runnerReadinessDetected: (commands, apps) => `命令 ${commands} / app ${apps}`,
      runnerReadinessNextActionLabel: "下一步",
      missionDraftScore: (score, present, missing, recommended) => `${score}% / 已有 ${present}・缺少 ${missing}・建議 ${recommended}`,
      capabilitiesLabel: "所需 Mac 工程能力",
      signalsLabel: "識別到的任務信號",
      unlockChecklistLabel: "工程解鎖清單",
      selfSimulationLabel: "自己模擬",
      selfSimulationEmpty: "未執行",
      selfSimulationEmptyDetail: "僅在本地演練監督、agent、runner 和 preflight，不執行真實工程。",
      selfSimulationNextActionsLabel: "下一步",
      selfSimulationHonestyLabel: "誠實邊界",
      permissionRequestLabel: "權限請求",
      permissionRequestDeniedLabel: "預設拒絕",
      capabilityGapLabel: "能力差距",
      capabilityGapHonestyLabel: "對比邊界",
      launchQueueLabel: "工程啟動佇列",
      launchQueueEmpty: "未準備",
      launchQueueChecklistLabel: "Runner 步驟",
      launchQueueHonestyLabel: "佇列誠實邊界",
      executionReceiptLabel: "執行回填收據",
      executionReceiptEmpty: "未回填",
      executionReceiptClaimsLabel: "聲明閘門",
      executionReceiptHonestyLabel: "回填誠實邊界",
      handoffReceiptLabel: "Agent 交付收據",
      handoffOperatorScriptLabel: "操作步驟",
      completionGateLabel: "完工聲明閘門",
      completionGateNextActionLabel: "驗收前下一步",
      completionGateBlockedClaimsLabel: "現在不能說",
      selfSimulationSummary: (ready, held, commands, evidence) => `${ready} ready / ${held} held，允許命令 ${commands}，證據 ${evidence}`,
      selfSimulationStatus: (decision, ready, commands, evidence) => `自己模擬 ${zhHantEngineeringSelfSimulationDecision(decision)}：ready ${ready}，允許命令 ${commands}，證據 ${evidence}。`,
      permissionRequestSummary: (requests, ask, denied) => `${requests} 項請求，執行前確認 ${ask}，預設拒絕 ${denied}`,
      capabilityGapSummary: (engineering, mac, prepare, control) =>
        `工程準備 ${engineering}%，Mac runtime ${mac}%，準備工程${prepare ? "可行" : "未完成"}，Mac 控制${control ? "可行" : "未接入"}`,
      launchQueueSummary: (runReady, handoffReady, held, commands, evidence) =>
        `可本地跑 ${runReady}，可交給 agent ${handoffReady}，保留 ${held}，允許命令 ${commands}，證據 ${evidence}`,
      executionReceiptSummary: (executed, receipts, evidence, artifacts, claim) =>
        `已執行 ${executed}，已驗證收據 ${receipts}，已接受證據 ${evidence}，已驗證工件 ${artifacts}，完工聲明${claim ? "可說" : "不可說"}`,
      macRunnerSummary: (ready, approvals, runtime, denied, adapters) =>
        `ready 能力 ${ready}，待審批 ${approvals}，缺 runtime ${runtime}，預設拒絕 ${denied}，adapter ${adapters}`,
      macRunnerContractSummary: (total, approval, runtime, blocked, evidence, permissions) =>
        `動作 ${total}，待審批 ${approval}，缺 runtime ${runtime}，阻止 ${blocked}，證據 ${evidence}，權限 ${permissions}`,
      handoffReceiptSummary: (handoff, sandbox, approvals, evidence) =>
        `交給 agent ${handoff ? "可行" : "未就緒"}，沙箱${sandbox ? "可執行" : "等待"}，審批 ${approvals}，預計證據 ${evidence}`,
      completionGateSummary: (complete, codeChanged, externalWrite) =>
        `完工聲明${complete ? "可說" : "不可說"}，程式碼改動${codeChanged ? "有證據" : "未證明"}，外部寫入${externalWrite ? "可進入審查" : "未批准"}`,
      state: zhHantEngineeringLaunchState,
      permissionMode: zhHantEngineeringPermissionMode,
      launchStage: zhHantEngineeringLaunchStage,
      nextAction: zhHantEngineeringNextAction,
      selfSimulationDecision: zhHantEngineeringSelfSimulationDecision,
      selfSimulationStage: zhHantEngineeringSelfSimulationStage,
      selfSimulationStageStatus: zhHantEngineeringSelfSimulationStageStatus,
      selfSimulationCapability: zhHantEngineeringSelfSimulationCapability,
      selfSimulationCapabilityStatus: zhHantEngineeringSelfSimulationCapabilityStatus,
      permissionRequestDecision: zhHantEngineeringPermissionRequestDecision,
      permissionRequestMode: zhHantEngineeringPermissionRequestMode,
      capabilityGapDecision: zhHantEngineeringCapabilityGapDecision,
      capabilityGapItem: zhHantEngineeringCapabilityGapItem,
      capabilityGapStatus: zhHantEngineeringCapabilityGapStatus,
      launchQueueDecision: zhHantEngineeringLaunchQueueDecision,
      launchQueueStatus: zhHantEngineeringLaunchQueueStatus,
      executionReceiptDecision: zhHantEngineeringExecutionReceiptDecision,
      executionReceiptStatus: zhHantEngineeringExecutionReceiptStatus,
      macRunnerDecision: zhHantEngineeringMacRunnerDecision,
      macRunnerCapability: zhHantEngineeringMacRunnerCapability,
      macRunnerCapabilityStatus: zhHantEngineeringMacRunnerCapabilityStatus,
      macRunnerPermission: zhHantEngineeringMacRunnerPermission,
      macRunnerPermissionStatus: zhHantEngineeringMacRunnerPermissionStatus,
      macRunnerAdapter: zhHantEngineeringMacRunnerAdapter,
      macRunnerAdapterStatus: zhHantEngineeringMacRunnerAdapterStatus,
      macRunnerNextAction: zhHantEngineeringMacRunnerNextAction,
      macRunnerContractDecision: zhHantEngineeringMacRunnerContractDecision,
      macRunnerContractAction: zhHantEngineeringMacRunnerContractAction,
      macRunnerContractActionStatus: zhHantEngineeringMacRunnerContractActionStatus,
      macRunnerContractCheckStatus: zhHantEngineeringMacRunnerContractCheckStatus,
      macRunnerContractDeniedAction: zhHantEngineeringMacRunnerContractDeniedAction,
      macRunnerContractInstruction: zhHantEngineeringMacRunnerContractInstruction,
      handoffReceiptDecision: zhHantEngineeringHandoffDecision,
      handoffLane: zhHantEngineeringHandoffLane,
      handoffLaneStatus: zhHantEngineeringHandoffLaneStatus,
      completionGateDecision: zhHantEngineeringCompletionGateDecision,
      completionGateCheck: zhHantEngineeringCompletionGateCheck,
      completionGateCheckStatus: zhHantEngineeringCompletionGateCheckStatus,
      capability: zhHantEngineeringCapability,
      capabilityStatus: zhHantEngineeringCapabilityStatus,
      missionDraftItem: zhHantEngineeringMissionDraftItem,
      missionDraftStatus: zhHantEngineeringMissionDraftStatus,
      signal: zhHantEngineeringSignal,
      unlockItem: zhHantEngineeringUnlockItem,
      unlockStatus: zhHantEngineeringUnlockStatus,
      roles: (count) => `${count} 個角色`,
      briefs: (total, implementable) => `${implementable}/${total} 個實作 brief`,
      sessions: (ready, held) => `${ready} ready / ${held} held`,
      runner: (tasks, decision) => `${tasks} runner / ${zhHantRunnerSelfTestDecision(decision)}`,
      focusMission: "去輸入",
      runCabinet: "內閣拆分",
      preparePack: "準備工程組",
      preflight: "權限檢查",
      runSandbox: "本地沙箱執行",
      exportIssues: "Issue 腳本",
      applyMissionTemplate: "整理任務",
      runSelfSimulation: "自己模擬",
      downloadSelfSimulationJson: "模擬 JSON",
      downloadSelfSimulationMarkdown: "模擬 MD",
      downloadLaunchQueueJson: "啟動佇列 JSON",
      downloadLaunchQueueMarkdown: "啟動佇列 MD",
      downloadExecutionReceiptJson: "回填收據 JSON",
      downloadExecutionReceiptMarkdown: "回填收據 MD",
      steps: [
        {
          title: "1. 輸入任務",
          body: "把要做的功能、倉庫目標、限制條件、驗證命令寫進 mission brief。"
        },
        {
          title: "2. 監督拆分",
          body: "執行內閣，讓多個角色分開做計畫、批評、執行邊界和證據要求。"
        },
        {
          title: "3. 生成工程包",
          body: "一次生成 prompt、receipt、runner invocation、接收審查和自測。"
        },
        {
          title: "4. Mac 權限檢查",
          body: "preflight 在執行前攔截危險命令、錯誤證據路徑和被保留的 session。"
        },
        {
          title: "5. 帶證據執行",
          body: "本地 gateway 執行時，sandbox runner 才會執行測試並返回 transcript 和證據。"
        }
      ],
      permissionGroups: [
        {
          title: "現在使用的最小權限",
          items: [
            "所選倉庫內的讀寫權限",
            "在 output/ 下寫入 transcript 和證據",
            "允許的 shell: npm run test / npm run build",
            "Git status/diff 讀取權限"
          ]
        },
        {
          title: "Mac 版可追加能力",
          items: [
            "Browser runner: 瀏覽器自動化設定",
            "Desktop runner: 輔助功能和螢幕錄製權限",
            "MCP runner: 僅明確 allowlist 工具",
            "Git push、deploy、外部傳送都需要人工批准"
          ]
        },
        {
          title: "預設不給的權限",
          items: [
            "整台主機的秘密資訊",
            "無限制電腦控制",
            "生產部署權限",
            "未批准的 GitHub 寫入"
          ]
        }
      ]
    },
    codingBriefs: {
      title: "編程代理 brief",
      total: (count) => `${count} 個 brief`,
      implementable: (count) => `${count} 可實現`,
      blocked: (count) => `${count} 需確認`,
      humanReview: (count) => `${count} 人工確認`,
      highPriority: (count) => `${count} 高優先`,
      sourceReady: "由 Development Board 生成",
      exportJson: "匯出 JSON",
      exportMarkdown: "匯出 Markdown",
      downloadJson: "下載 JSON",
      downloadMarkdown: "下載 Markdown",
      review: "審查",
      productionReview: "生產審查",
      downloadReview: "下載審查",
      sessionPack: "Session 包",
      productionSession: "生產 Session",
      dispatchManifest: "Dispatch 包",
      sessionDrill: "Session 演練",
      downloadSessionJson: "Session JSON",
      downloadSessionMarkdown: "Session MD",
      downloadDispatchJson: "Dispatch JSON",
      downloadDispatchMarkdown: "Dispatch MD",
      downloadDispatchArchiveJson: "歸檔 JSON",
      downloadDispatchArchiveMarkdown: "歸檔 MD",
      downloadDispatchArchiveAuditJson: "稽核 JSON",
      downloadDispatchArchiveAuditMarkdown: "稽核 MD",
      downloadDispatchSimulationJson: "模擬 JSON",
      downloadDispatchSimulationMarkdown: "模擬 MD",
      downloadRunnerManifestJson: "Runner JSON",
      downloadRunnerManifestMarkdown: "Runner MD",
      downloadRunnerInvocationJson: "呼叫包 JSON",
      downloadRunnerInvocationMarkdown: "呼叫包 MD",
      downloadRunnerIntakeJson: "接收審查 JSON",
      downloadRunnerIntakeMarkdown: "接收審查 MD",
      downloadRunnerSelfTestJson: "自測 JSON",
      downloadRunnerSelfTestMarkdown: "自測 MD",
      sandboxRunnerPreflight: "沙箱檢查",
      downloadSandboxRunnerPreflightJson: "沙箱檢查 JSON",
      downloadSandboxRunnerPreflightMarkdown: "沙箱檢查 MD",
      runSandboxRunner: "執行沙箱",
      downloadSandboxRunnerJson: "沙箱 Runner JSON",
      downloadSandboxRunnerMarkdown: "沙箱 Runner MD",
      downloadDrillJson: "演練 JSON",
      downloadDrillMarkdown: "演練 MD",
      receiptTemplate: "證據範本",
      importReceipt: "匯入證據",
      downloadReceiptJson: "證據 JSON",
      downloadReceiptMarkdown: "證據 MD",
      downloadImplementationEvidenceJson: "實作證據 JSON",
      downloadImplementationEvidenceMarkdown: "實作證據 MD",
      reviewDecision: "審查判定",
      reviewNextAction: "下一步",
      reviewReady: "所有 brief 已通過交付給編程代理前的檢查。",
      reviewDecisionLabel: zhHantBriefReviewDecision,
      reviewSummary: (passed, warnings, blockers) => `${passed} 通過 / ${warnings} 警告 / ${blockers} 阻塞`,
      sessionDecision: "Session 判定",
      sessionNextAction: "下一步",
      sessionReady: "所有 session 都已準備好交付給沙箱編程代理。",
      sessionHeld: (status) => `保留：${zhHantCodingSessionStatus(status)}`,
      sessionDecisionLabel: zhHantBriefReviewDecision,
      sessionSummary: (ready, held) => `${ready} ready / ${held} held`,
      sessionContractSummary: (contracts, humanApproval) => `${contracts} 個合約 / ${humanApproval} 個需人工批准`,
      dispatchDecision: "Dispatch 判定",
      dispatchNextAction: "下一步",
      dispatchReady: "Ready session 的 prompt 和 receipt template 已作為 dispatch 包準備好。",
      dispatchDecisionLabel: zhHantCodingDispatchDecision,
      dispatchSummary: (ready, held, promptFiles) => `${ready} ready / ${held} held / ${promptFiles} prompt`,
      dispatchReceiptTemplate: (receiptTemplates) => `${receiptTemplates} 個 receipt template`,
      dispatchArchive: "Dispatch 歸檔",
      dispatchArchiveSummary: (files, promptFiles, totalBytes) => `${files} 個檔案 / ${promptFiles} 個 prompt / ${totalBytes} bytes`,
      dispatchUnassignedHeld: (count) => `${count} 個 held 未分配`,
      dispatchArchiveAudit: "歸檔稽核",
      dispatchAuditDecisionLabel: zhHantDispatchArchiveAuditDecision,
      dispatchAuditSummary: (passed, warnings, blockers) => `${passed} 通過 / ${warnings} 警告 / ${blockers} 阻塞`,
      dispatchSimulation: "執行模擬",
      dispatchSimulationDecisionLabel: zhHantDispatchSimulationDecision,
      dispatchSimulationSummary: (ready, held, blocked) => `${ready} 可交付 / ${held} 保留 / ${blocked} 阻塞`,
      runnerManifest: "Runner 清單",
      runnerManifestDecisionLabel: zhHantRunnerManifestDecision,
      runnerManifestSummary: (readyTasks, runnerTasks, blockedTasks) => `${readyTasks} 可交付 / ${runnerTasks} runner 任務 / ${blockedTasks} 阻塞`,
      runnerInvocation: "Runner 呼叫包",
      runnerInvocationDecisionLabel: zhHantRunnerInvocationDecision,
      runnerInvocationSummary: (readyInvocations, invocationFiles, blockedInvocations) => `${readyInvocations} 個已準備 / ${invocationFiles} 個呼叫檔 / ${blockedInvocations} 個阻塞`,
      runnerIntake: "Runner 接收審查",
      runnerIntakeDecisionLabel: zhHantRunnerIntakeDecision,
      runnerIntakeSummary: (acceptedIntakes, invocationFiles, blockedIntakes) => `${acceptedIntakes} 個已接收 / ${invocationFiles} 個呼叫檔 / ${blockedIntakes} 個阻塞`,
      runnerSelfTest: "Runner 自測",
      runnerSelfTestDecisionLabel: zhHantRunnerSelfTestDecision,
      runnerSelfTestSummary: (wouldRun, notExecutedCommands, blockedTasks) => `${wouldRun} 可模擬 / ${notExecutedCommands} 條未執行命令 / ${blockedTasks} 阻塞`,
      sandboxRunnerPreflightDecisionLabel: zhHantSandboxRunnerPreflightDecision,
      sandboxRunnerPreflightSummary: (readyTasks, heldTasks, blockedTasks, processExecutions) => `${readyTasks} ready / ${heldTasks} 保留 / ${blockedTasks} 阻塞 / ${processExecutions} 個預計程序`,
      sandboxRunner: "沙箱 Runner",
      sandboxRunnerDecisionLabel: zhHantSandboxRunnerDecision,
      sandboxRunnerSummary: (executedTasks, processExecutions, commandResults) => `${executedTasks} 已執行 / ${processExecutions} 個程序 / ${commandResults} 條命令結果`,
      drillDecision: "Drill 判定",
      drillNextAction: "下一步",
      drillReady: "所有 ready session 已通過沙箱編程代理分配模擬。",
      drillAction: zhHantCodingDrillAction,
      drillDecisionLabel: zhHantCodingDrillDecision,
      drillSummary: (wouldAssign, notAssigned) => `${wouldAssign} 分配 / ${notAssigned} 停止`,
      receiptDecision: "證據判定",
      receiptNextAction: "下一步",
      receiptReady: "所有 receipt 已通過實作證據審查。",
      receiptStatus: zhHantCodingReceiptStatus,
      receiptDecisionLabel: zhHantCodingReceiptDecision,
      receiptSummary: (verified, pending, failed) => `${verified} 已確認 / ${pending} 缺證據 / ${failed} 失敗`,
      mode: "模式",
      executor: "Executor",
      sandboxBoundary: "沙箱邊界",
      evidencePrefix: "證據前綴",
      allowedActions: (count) => `${count} 個允許動作`,
      releaseGate: "發布門",
      required: "必需",
      optional: "可選",
      crossRole: "跨角色",
      promptReady: "代理 prompt 已準備",
      empty: "請從 Development Board 生成編程代理 brief。",
      statusGateway: "編程代理 brief 已透過本地閘道匯出。",
      statusFallback: (errorMessage) => `閘道 brief 不可用，已使用本地匯出。${errorMessage || ""}`,
      statusMarkdown: "編程代理 Markdown prompt pack 已在本地準備。",
      statusReviewGateway: (decision, blockers, warnings) => `編程代理 brief 審查 ${zhHantBriefReviewDecision(decision)}：${blockers} 個阻塞，${warnings} 個警告。`,
      statusReviewLocal: (decision, blockers, warnings, errorMessage) => `已在本地完成 brief 審查 ${zhHantBriefReviewDecision(decision)}：${blockers} 個阻塞，${warnings} 個警告。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusSessionGateway: (decision, ready, held) => `編程代理 session 包 ${zhHantBriefReviewDecision(decision)}：${ready} ready，${held} held。`,
      statusSessionLocal: (decision, ready, held, errorMessage) => `已在本地完成 session 包 ${zhHantBriefReviewDecision(decision)}：${ready} ready，${held} held。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusDispatchGateway: (decision, ready, held, promptFiles) => `編程代理 dispatch 包 ${zhHantCodingDispatchDecision(decision)}：${ready} ready，${held} held，${promptFiles} prompt。`,
      statusDispatchLocal: (decision, ready, held, promptFiles, errorMessage) => `已在本地完成 dispatch 包 ${zhHantCodingDispatchDecision(decision)}：${ready} ready，${held} held，${promptFiles} prompt。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightGateway: (decision, readyTasks, heldTasks, blockedTasks, processExecutions) => `沙箱檢查 ${zhHantSandboxRunnerPreflightDecision(decision)}：${readyTasks} ready，${heldTasks} 保留，${blockedTasks} 阻塞，預計程序 ${processExecutions} 個。`,
      statusSandboxRunnerPreflightLocal: (decision, readyTasks, heldTasks, blockedTasks, processExecutions, errorMessage) => `已在本地完成沙箱檢查 ${zhHantSandboxRunnerPreflightDecision(decision)}：${readyTasks} ready，${heldTasks} 保留，${blockedTasks} 阻塞，預計程序 ${processExecutions} 個。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightBlocked: (decision, readyTasks, heldTasks, blockedTasks) => `沙箱執行已停止。預檢 ${zhHantSandboxRunnerPreflightDecision(decision)}：${readyTasks} ready，${heldTasks} 保留，${blockedTasks} 阻塞。`,
      statusSandboxRunnerGateway: (decision, executedTasks, processExecutions, commandResults) => `沙箱 Runner ${zhHantSandboxRunnerDecision(decision)}：執行 ${executedTasks} 項，程序 ${processExecutions} 個，命令結果 ${commandResults} 條。`,
      statusSandboxRunnerUnavailable: (errorMessage) => `沙箱 Runner 需要本地 gateway。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusDrillGateway: (decision, wouldAssign, notAssigned) => `編程代理 session 演練 ${zhHantCodingDrillDecision(decision)}：${wouldAssign} 分配，${notAssigned} 停止。`,
      statusDrillLocal: (decision, wouldAssign, notAssigned, errorMessage) => `已在本地完成 session 演練 ${zhHantCodingDrillDecision(decision)}：${wouldAssign} 分配，${notAssigned} 停止。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusReceiptGateway: (decision, verified, pending, failed) => `編程代理證據範本 ${zhHantCodingReceiptDecision(decision)}：${verified} 已確認，${pending} 缺證據，${failed} 失敗。`,
      statusReceiptLocal: (decision, verified, pending, failed, errorMessage) => `已在本地完成證據範本 ${zhHantCodingReceiptDecision(decision)}：${verified} 已確認，${pending} 缺證據，${failed} 失敗。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusReceiptReviewGateway: (decision, verified, pending, failed) => `匯入證據審查 ${zhHantCodingReceiptDecision(decision)}：${verified} 已確認，${pending} 缺證據，${failed} 失敗。`,
      statusReceiptReviewLocal: (decision, verified, pending, failed, errorMessage) => `已在本地完成匯入證據審查 ${zhHantCodingReceiptDecision(decision)}：${verified} 已確認，${pending} 缺證據，${failed} 失敗。${errorMessage ? ` 閘道：${errorMessage}` : ""}`,
      statusReceiptReviewApplied: (message, artifactDecision, verifiedPaths, unresolvedPaths, applied, skipped, reusedTranscriptRefs, reusedChangedFileRefs, reusedEvidenceArtifactRefs, transcriptContentMismatches) =>
        `${message} 工件稽核 ${artifactDecision}：${verifiedPaths} 項已確認，${unresolvedPaths} 項未解決${reusedTranscriptRefs ? `，${reusedTranscriptRefs} 項 transcript 重複使用` : ""}${reusedChangedFileRefs ? `，${reusedChangedFileRefs} 項 changed file 重複使用` : ""}${reusedEvidenceArtifactRefs ? `，${reusedEvidenceArtifactRefs} 項 evidence artifact 重複使用` : ""}${transcriptContentMismatches ? `，${transcriptContentMismatches} 項內容不符` : ""}。Development Board 已套用 ${applied} 項，保留 ${skipped} 項。`,
      statusReceiptImportError: (errorMessage) => `證據回執匯入失敗。${errorMessage}`
    },
    releaseRehearsal: {
      title: "發布演練",
      notRun: "未執行",
      idle: "待機",
      passed: (count) => `${count} 通過`,
      warnings: (count) => `${count} 警告`,
      blockers: (count) => `${count} 阻塞`,
      localDryRun: "本地 dry-run 演練",
      sourceLine: (sourceRun, level, evidenceItems) => `${sourceRun} / ${level} / ${evidenceItems} 條證據`,
      run: "執行演練",
      exportReport: "匯出報告",
      verify: "驗證",
      productionCheck: "生產檢查",
      exportIssues: "匯出 issues",
      exportGh: "匯出 gh",
      downloadJson: "下載 JSON",
      downloadVerify: "下載驗證",
      downloadIssues: "下載 issues",
      downloadGh: "下載 gh",
      metrics: {
        bundle: "Bundle",
        notes: "Notes",
        runner: "Runner",
        held: "保留",
        ready: (count) => `${count} ready`
      },
      evidenceClaimTitle: (level) => `${level} 證據聲明`,
      remediationQueue: "整改佇列",
      remediationSummary: (high, medium) => `${high} 高 / ${medium} 中`,
      empty: "交付前請先執行本地發布演練。",
      decision: {
        releaseReady: "可發布",
        needsReview: "需審查",
        blocked: "已阻塞"
      },
      verification: {
        decision: {
          verified: "已驗證",
          notProductionReady: "生產未就緒",
          invalid: "無效"
        },
        scope: (scope, requireProductionEvidence) => `${scope}${requireProductionEvidence ? " / 需要生產證據" : ""}`,
        result: (passed, failed) => `${passed} 通過 / ${failed} 失敗`,
        ready: "驗證報告已可用於交付審查。"
      }
    }
  },
  ko: {
    brandSubtitle: "AI 내각 오케스트레이션 워크벤치",
    language: "언어",
    rolesActive: (count) => `${count}개 역할 활성`,
    sandboxFirst: "샌드박스 우선",
    secretsSessionOnly: "비밀값은 세션 한정",
    resetWorkspace: "워크스페이스 재설정",
    importWorkspace: "워크스페이스 가져오기",
    exportWorkspace: "워크스페이스 내보내기",
    save: "저장",
    saved: "저장됨",
    runCabinet: "내각 실행",
    running: "실행 중...",
    gatewayReady: "로컬 게이트웨이가 실행되면 준비됩니다.",
    missionKicker: "미션 자동화",
    missionTitle: "통제된 샌드박스 안에서 계획, 실행, 감사, 평가, 반복합니다.",
    decision: "판정",
    notRun: "미실행",
    releaseRehearsalStatus: (decision, blockers, warnings) => `릴리스 리허설 ${koRehearsalDecision(decision)}: 차단 ${blockers}개, 경고 ${warnings}개.`,
    releaseVerificationFallback: (errorMessage) => `게이트웨이 검증을 사용할 수 없어 로컬 검증을 사용했습니다.${errorMessage ? ` ${errorMessage}` : ""}`,
    releaseVerificationStatus: (decision, failed) => `릴리스 검증 ${koVerificationDecision(decision)}: 실패 ${failed}개.`,
    engineeringLaunchpad: {
      kicker: "Mac 엔지니어링 런치패드",
      title: "여기서 감독 역할과 코딩 에이전트를 시작",
      subtitle: "미션을 작성하고 내각으로 분해한 뒤 agent brief와 runner 패키지를 만들고, 허용된 로컬 Mac 동작만 실행합니다.",
      stateLabel: "상태",
      metricsLabel: "엔지니어링 시작 지표",
      permissionModeLabel: "권한 모드",
      launchStageLabel: "시작 단계",
      nextActionLabel: "다음 작업",
      entryLabel: "여기서 시작",
      entryTitle: "여기에 엔지니어링 작업을 입력하고 감독 리뷰를 시작",
      entryBody: "먼저 mission brief를 작성합니다. 자체 시뮬레이션은 실제 코딩이나 Mac 조작을 주장하기 전에 감독 리뷰, 권한 경계, runner 큐를 점검합니다.",
      realityLabel: "현재 실제 능력",
      realityCodeLabel: "코드 작업",
      realityMacLabel: "Mac 제어",
      realityExternalLabel: "외부 쓰기",
      realityCodeStatus: (verified, canRun, missionReady, simulated) =>
        verified ? "실행 증거 있음" : canRun ? "미실행・준비됨" : simulated ? "agent 인계 준비 중" : missionReady ? "자체 시뮬레이션 대기" : "입력 대기",
      realityMacStatus: (canControl) => canControl ? "승인된 runner만 가능" : "미연결",
      realityExternalStatus: (requested) => requested ? "미승인으로 중지" : "기본 거부",
      missionInputHelp: "이곳이 사용자 입력 칸입니다. 저장소 대상, 변경 내용, 검증 명령, Mac 권한 필요 여부를 적고 자체 시뮬레이션을 실행합니다.",
      macScopeLabel: "Mac 앱 기능 범위",
      macScopeItems: [
        "기본 범위: 저장소 안 코드 변경, 테스트, 빌드, 증거 수집",
        "브라우저, Mac 데스크톱, MCP 제어는 runner allowlist와 사람 승인 필요",
        "무제한 컴퓨터 제어, 비밀값, push, deploy는 기본 거부"
      ],
      macRunnerLabel: "Mac runner 준비도",
      macRunnerPermissionsLabel: "필요 권한",
      macRunnerAdaptersLabel: "연결 후보 adapter",
      macRunnerNextActionsLabel: "다음 구현 작업",
      macRunnerHonestyLabel: "Mac 제어 정직 경계",
      macRunnerHonestyClaim: (canControl) =>
        canControl
          ? "승인된 Mac runner만 이 미션 범위에서 데스크톱을 제어할 수 있습니다."
          : "Naikaku는 감독된 코딩 작업을 준비할 수 있지만, Mac 데스크톱 제어는 권한, adapter runtime, action log, receipt가 있어야 연결됩니다.",
      macRunnerHonestyLimit: "이 readiness는 손쉬운 사용, 화면 기록, 자동화, MCP, push, deploy 권한을 부여하지 않습니다.",
      macRunnerContractLabel: "Mac runner contract",
      macRunnerContractChecksLabel: "Contract checks",
      macRunnerContractDeniedLabel: "거부 동작",
      macRunnerContractInstructionsLabel: "Runner 지시",
      missionInputLabel: "여기에 엔지니어링 작업 입력",
      missionInputPlaceholder: "예: Mac 앱을 중심으로, 사용자가 이 입력 칸에 작업을 넣으면 감독 역할이 먼저 리뷰하고 coding agent가 저장소를 수정, npm run test / npm run build 실행, 증거 수집을 합니다. Git push와 Mac 제어는 사람 승인.",
      missionDraftLabel: "미션 점검",
      autoWorkLabel: "자동 엔지니어링",
      autoWorkTitle: "입력한 작업을 로컬 gateway로 실행",
      autoWorkBody: "Fixture는 외부 도구 없이 전체 경로를 검증합니다. OpenHands는 로컬 CLI가 설치되고 라이선스 검토가 끝났을 때만 시작합니다.",
      autoWorkPresetLabel: "Runner",
      autoWorkPrepared: "준비만",
      autoWorkFixture: "Fixture 자동 테스트",
      autoWorkOpenHands: "OpenHands CLI",
      autoWorkWorktreeLabel: "Worktree",
      autoWorkAdapterReadyLabel: "로컬 adapter 설치 및 라이선스 확인 완료",
      autoWorkAdapterReadyHelp: "이 버튼은 로컬 gateway만 호출합니다. push, deploy, 무제한 Mac 제어, 비밀값 접근 권한을 주지 않습니다.",
      autoWorkRun: "자동 엔지니어링 시작",
      autoWorkRunning: "실행 중",
      autoWorkIdle: "자동 엔지니어링이 아직 시작되지 않았습니다.",
      autoWorkMissionRequired: "엔지니어링 작업을 입력한 뒤 자동 엔지니어링을 시작하세요.",
      autoWorkOpenHandsNeedsReady: "OpenHands 사용 전 로컬 CLI 설치와 라이선스 검토를 확인하세요.",
      autoWorkOutputLabel: "출력",
      autoWorkChecks: (passed, failed) => `검사 ${passed} pass / ${failed} fail`,
      autoWorkResult: (preset, mode, jobs, receipts, evidence, artifacts) =>
        `${preset}・${mode}・완료 job ${jobs}・receipt ${receipts}・증거 ${evidence}・artifact ${artifacts}`,
      autoWorkStarting: (preset) => `${preset} runner로 자동 엔지니어링을 시작합니다.`,
      autoWorkCompleted: (preset, passed, jobs, outputDir) =>
        `${preset} 자동 엔지니어링 완료: ${passed}개 검사 통과, ${jobs}개 job 완료, 출력 ${outputDir}.`,
      autoWorkFailed: (exitCode, outputDir) =>
        `자동 엔지니어링 실패: exit ${exitCode ?? "unknown"}, 출력 ${outputDir}.`,
      autoWorkGatewayUnavailable: (errorMessage) => `로컬 gateway 자동 엔지니어링을 사용할 수 없습니다. ${errorMessage}`,
      runnerReadinessLabel: "Runner 점검",
      runnerReadinessRefresh: "Runner 확인",
      runnerReadinessChecking: "로컬 runner 명령을 확인하는 중입니다.",
      runnerReadinessIdle: "로컬 runner를 아직 확인하지 않았습니다.",
      runnerReadinessStatus: (ready, detected, launchable, total) =>
        `${total}개 runner 중 ${ready}개 ready, ${detected}개 감지, Workbench 실행 가능 ${launchable}개.`,
      runnerReadinessUnavailable: (errorMessage) => `Runner readiness를 사용할 수 없습니다. ${errorMessage}`,
      runnerReadinessAdapterStatus: (status) => status,
      runnerReadinessDetected: (commands, apps) => `cmd ${commands} / app ${apps}`,
      runnerReadinessNextActionLabel: "다음 작업",
      missionDraftScore: (score, present, missing, recommended) => `${score}% / 입력 ${present}・부족 ${missing}・권장 ${recommended}`,
      capabilitiesLabel: "필요한 Mac 엔지니어링 기능",
      signalsLabel: "감지된 미션 신호",
      unlockChecklistLabel: "엔지니어링 잠금 해제 체크리스트",
      selfSimulationLabel: "자체 시뮬레이션",
      selfSimulationEmpty: "미실행",
      selfSimulationEmptyDetail: "감독, agent, runner, preflight 흐름을 로컬에서만 리허설합니다.",
      selfSimulationNextActionsLabel: "다음 작업",
      selfSimulationHonestyLabel: "정직 경계",
      permissionRequestLabel: "권한 요청",
      permissionRequestDeniedLabel: "기본 거부",
      capabilityGapLabel: "기능 격차",
      capabilityGapHonestyLabel: "비교 경계",
      launchQueueLabel: "엔지니어링 시작 큐",
      launchQueueEmpty: "미준비",
      launchQueueChecklistLabel: "Runner 절차",
      launchQueueHonestyLabel: "큐 정직 경계",
      executionReceiptLabel: "실행 회신 영수증",
      executionReceiptEmpty: "회신 없음",
      executionReceiptClaimsLabel: "선언 게이트",
      executionReceiptHonestyLabel: "회신 정직 경계",
      handoffReceiptLabel: "Agent 인계 영수증",
      handoffOperatorScriptLabel: "운영 절차",
      completionGateLabel: "완료 선언 게이트",
      completionGateNextActionLabel: "수락 전 다음 작업",
      completionGateBlockedClaimsLabel: "아직 말할 수 없는 것",
      selfSimulationSummary: (ready, held, commands, evidence) => `${ready} ready / ${held} held・허용 명령 ${commands}・증거 ${evidence}`,
      selfSimulationStatus: (decision, ready, commands, evidence) => `자체 시뮬레이션 ${koEngineeringSelfSimulationDecision(decision)}: ready ${ready}, 허용 명령 ${commands}, 증거 ${evidence}.`,
      permissionRequestSummary: (requests, ask, denied) => `${requests}개 요청・사용 전 확인 ${ask}개・기본 거부 ${denied}개`,
      capabilityGapSummary: (engineering, mac, prepare, control) =>
        `엔지니어링 ${engineering}%・Mac runtime ${mac}%・준비 ${prepare ? "가능" : "미완"}・Mac 제어 ${control ? "가능" : "미연결"}`,
      launchQueueSummary: (runReady, handoffReady, held, commands, evidence) =>
        `실행 가능 ${runReady}・인계 가능 ${handoffReady}・보류 ${held}・허용 명령 ${commands}・증거 ${evidence}`,
      executionReceiptSummary: (executed, receipts, evidence, artifacts, claim) =>
        `실행 ${executed}・검증 receipt ${receipts}・수락 증거 ${evidence}・검증 artifact ${artifacts}・완료 선언 ${claim ? "가능" : "불가"}`,
      macRunnerSummary: (ready, approvals, runtime, denied, adapters) =>
        `ready 기능 ${ready}・승인 대기 ${approvals}・runtime 필요 ${runtime}・기본 거부 ${denied}・adapter ${adapters}`,
      macRunnerContractSummary: (total, approval, runtime, blocked, evidence, permissions) =>
        `동작 ${total}・승인 대기 ${approval}・runtime 필요 ${runtime}・차단 ${blocked}・증거 ${evidence}・권한 ${permissions}`,
      handoffReceiptSummary: (handoff, sandbox, approvals, evidence) =>
        `agent 인계 ${handoff ? "가능" : "미준비"}・sandbox ${sandbox ? "실행 가능" : "대기"}・승인 ${approvals}・예상 증거 ${evidence}`,
      completionGateSummary: (complete, codeChanged, externalWrite) =>
        `완료 선언 ${complete ? "가능" : "불가"}・코드 변경 ${codeChanged ? "증거 있음" : "미증명"}・외부 쓰기 ${externalWrite ? "검토 가능" : "미승인"}`,
      state: koEngineeringLaunchState,
      permissionMode: koEngineeringPermissionMode,
      launchStage: koEngineeringLaunchStage,
      nextAction: koEngineeringNextAction,
      selfSimulationDecision: koEngineeringSelfSimulationDecision,
      selfSimulationStage: koEngineeringSelfSimulationStage,
      selfSimulationStageStatus: koEngineeringSelfSimulationStageStatus,
      selfSimulationCapability: koEngineeringSelfSimulationCapability,
      selfSimulationCapabilityStatus: koEngineeringSelfSimulationCapabilityStatus,
      permissionRequestDecision: koEngineeringPermissionRequestDecision,
      permissionRequestMode: koEngineeringPermissionRequestMode,
      capabilityGapDecision: koEngineeringCapabilityGapDecision,
      capabilityGapItem: koEngineeringCapabilityGapItem,
      capabilityGapStatus: koEngineeringCapabilityGapStatus,
      launchQueueDecision: koEngineeringLaunchQueueDecision,
      launchQueueStatus: koEngineeringLaunchQueueStatus,
      executionReceiptDecision: koEngineeringExecutionReceiptDecision,
      executionReceiptStatus: koEngineeringExecutionReceiptStatus,
      macRunnerDecision: koEngineeringMacRunnerDecision,
      macRunnerCapability: koEngineeringMacRunnerCapability,
      macRunnerCapabilityStatus: koEngineeringMacRunnerCapabilityStatus,
      macRunnerPermission: koEngineeringMacRunnerPermission,
      macRunnerPermissionStatus: koEngineeringMacRunnerPermissionStatus,
      macRunnerAdapter: koEngineeringMacRunnerAdapter,
      macRunnerAdapterStatus: koEngineeringMacRunnerAdapterStatus,
      macRunnerNextAction: koEngineeringMacRunnerNextAction,
      macRunnerContractDecision: koEngineeringMacRunnerContractDecision,
      macRunnerContractAction: koEngineeringMacRunnerContractAction,
      macRunnerContractActionStatus: koEngineeringMacRunnerContractActionStatus,
      macRunnerContractCheckStatus: koEngineeringMacRunnerContractCheckStatus,
      macRunnerContractDeniedAction: koEngineeringMacRunnerContractDeniedAction,
      macRunnerContractInstruction: koEngineeringMacRunnerContractInstruction,
      handoffReceiptDecision: koEngineeringHandoffDecision,
      handoffLane: koEngineeringHandoffLane,
      handoffLaneStatus: koEngineeringHandoffLaneStatus,
      completionGateDecision: koEngineeringCompletionGateDecision,
      completionGateCheck: koEngineeringCompletionGateCheck,
      completionGateCheckStatus: koEngineeringCompletionGateCheckStatus,
      capability: koEngineeringCapability,
      capabilityStatus: koEngineeringCapabilityStatus,
      missionDraftItem: koEngineeringMissionDraftItem,
      missionDraftStatus: koEngineeringMissionDraftStatus,
      signal: koEngineeringSignal,
      unlockItem: koEngineeringUnlockItem,
      unlockStatus: koEngineeringUnlockStatus,
      roles: (count) => `${count}개 역할`,
      briefs: (total, implementable) => `${implementable}/${total}개 구현 brief`,
      sessions: (ready, held) => `${ready} ready / ${held} held`,
      runner: (tasks, decision) => `${tasks} runner / ${koRunnerSelfTestDecision(decision)}`,
      focusMission: "입력으로 이동",
      runCabinet: "내각으로 분해",
      preparePack: "엔지니어링 준비",
      preflight: "권한 확인",
      runSandbox: "로컬 샌드박스 실행",
      exportIssues: "Issue script",
      applyMissionTemplate: "미션 정리",
      runSelfSimulation: "자체 시뮬레이션",
      downloadSelfSimulationJson: "시뮬레이션 JSON",
      downloadSelfSimulationMarkdown: "시뮬레이션 MD",
      downloadLaunchQueueJson: "시작 큐 JSON",
      downloadLaunchQueueMarkdown: "시작 큐 MD",
      downloadExecutionReceiptJson: "회신 영수증 JSON",
      downloadExecutionReceiptMarkdown: "회신 영수증 MD",
      steps: [
        {
          title: "1. 미션 입력",
          body: "만들 기능, 대상 저장소, 제한 조건, 검증 명령을 mission brief에 넣습니다."
        },
        {
          title: "2. 감독 분해",
          body: "내각을 실행해 여러 역할이 계획, 비평, 실행 경계, 증거 요구를 나눕니다."
        },
        {
          title: "3. 엔지니어링 패키지 생성",
          body: "prompt, receipt, runner invocation, intake 감사, self-test를 한 번에 만듭니다."
        },
        {
          title: "4. Mac 권한 확인",
          body: "preflight가 위험 명령, 잘못된 증거 경로, 보류 session을 실행 전에 막습니다."
        },
        {
          title: "5. 증거와 함께 실행",
          body: "로컬 gateway가 실행 중일 때만 sandbox runner가 테스트를 실행하고 transcript와 증거를 반환합니다."
        }
      ],
      permissionGroups: [
        {
          title: "현재 쓰는 최소 권한",
          items: [
            "선택한 저장소 내부 읽기/쓰기",
            "output/ 아래 transcript와 증거 쓰기",
            "허용된 shell: npm run test / npm run build",
            "Git status/diff 읽기 권한"
          ]
        },
        {
          title: "Mac 앱 추가 권한",
          items: [
            "Browser runner: 브라우저 자동화 프로필",
            "Desktop runner: 손쉬운 사용과 화면 기록",
            "MCP runner: 명시 allowlist 도구만",
            "Git push, deploy, 외부 전송은 사람 승인 필요"
          ]
        },
        {
          title: "기본 제공하지 않는 권한",
          items: [
            "호스트 전체 비밀값",
            "무제한 컴퓨터 제어",
            "운영 deploy 권한",
            "승인 없는 GitHub 쓰기"
          ]
        }
      ]
    },
    codingBriefs: {
      title: "코딩 에이전트 브리프",
      total: (count) => `${count}개`,
      implementable: (count) => `${count}개 구현 가능`,
      blocked: (count) => `${count}개 확인 필요`,
      humanReview: (count) => `${count}개 사람 검토`,
      highPriority: (count) => `${count}개 높은 우선순위`,
      sourceReady: "Development Board에서 생성",
      exportJson: "JSON 내보내기",
      exportMarkdown: "Markdown 내보내기",
      downloadJson: "JSON 다운로드",
      downloadMarkdown: "Markdown 다운로드",
      review: "검토",
      productionReview: "운영 검토",
      downloadReview: "검토 다운로드",
      sessionPack: "Session pack",
      productionSession: "운영 Session",
      dispatchManifest: "Dispatch pack",
      sessionDrill: "Session 모의실행",
      downloadSessionJson: "Session JSON",
      downloadSessionMarkdown: "Session MD",
      downloadDispatchJson: "Dispatch JSON",
      downloadDispatchMarkdown: "Dispatch MD",
      downloadDispatchArchiveJson: "Archive JSON",
      downloadDispatchArchiveMarkdown: "Archive MD",
      downloadDispatchArchiveAuditJson: "Audit JSON",
      downloadDispatchArchiveAuditMarkdown: "Audit MD",
      downloadDispatchSimulationJson: "Simulation JSON",
      downloadDispatchSimulationMarkdown: "Simulation MD",
      downloadRunnerManifestJson: "Runner JSON",
      downloadRunnerManifestMarkdown: "Runner MD",
      downloadRunnerInvocationJson: "호출 JSON",
      downloadRunnerInvocationMarkdown: "호출 MD",
      downloadRunnerIntakeJson: "수락 감사 JSON",
      downloadRunnerIntakeMarkdown: "수락 감사 MD",
      downloadRunnerSelfTestJson: "자체 검증 JSON",
      downloadRunnerSelfTestMarkdown: "자체 검증 MD",
      sandboxRunnerPreflight: "Sandbox 확인",
      downloadSandboxRunnerPreflightJson: "Sandbox 확인 JSON",
      downloadSandboxRunnerPreflightMarkdown: "Sandbox 확인 MD",
      runSandboxRunner: "Sandbox 실행",
      downloadSandboxRunnerJson: "Sandbox Runner JSON",
      downloadSandboxRunnerMarkdown: "Sandbox Runner MD",
      downloadDrillJson: "모의실행 JSON",
      downloadDrillMarkdown: "모의실행 MD",
      receiptTemplate: "증거 템플릿",
      importReceipt: "증거 가져오기",
      downloadReceiptJson: "증거 JSON",
      downloadReceiptMarkdown: "증거 MD",
      downloadImplementationEvidenceJson: "구현 증거 JSON",
      downloadImplementationEvidenceMarkdown: "구현 증거 MD",
      reviewDecision: "검토 판정",
      reviewNextAction: "다음 조치",
      reviewReady: "모든 브리프가 코딩 에이전트 인계 전 검사를 통과했습니다.",
      reviewDecisionLabel: koBriefReviewDecision,
      reviewSummary: (passed, warnings, blockers) => `${passed} 통과 / ${warnings} 경고 / ${blockers} 차단`,
      sessionDecision: "Session 판정",
      sessionNextAction: "다음 조치",
      sessionReady: "모든 session이 샌드박스 코딩 에이전트 인계 준비를 마쳤습니다.",
      sessionHeld: (status) => `보류: ${koCodingSessionStatus(status)}`,
      sessionDecisionLabel: koBriefReviewDecision,
      sessionSummary: (ready, held) => `${ready} ready / ${held} held`,
      sessionContractSummary: (contracts, humanApproval) => `${contracts}개 계약 / 사람 승인 ${humanApproval}개`,
      dispatchDecision: "Dispatch 판정",
      dispatchNextAction: "다음 조치",
      dispatchReady: "Ready session prompt와 receipt template이 dispatch package로 준비되었습니다.",
      dispatchDecisionLabel: koCodingDispatchDecision,
      dispatchSummary: (ready, held, promptFiles) => `${ready} ready / ${held} held / prompt ${promptFiles}개`,
      dispatchReceiptTemplate: (receiptTemplates) => `receipt template ${receiptTemplates}개`,
      dispatchArchive: "Dispatch archive",
      dispatchArchiveSummary: (files, promptFiles, totalBytes) => `파일 ${files}개 / prompt ${promptFiles}개 / ${totalBytes} bytes`,
      dispatchUnassignedHeld: (count) => `미할당 보류 ${count}개`,
      dispatchArchiveAudit: "Archive 감사",
      dispatchAuditDecisionLabel: koDispatchArchiveAuditDecision,
      dispatchAuditSummary: (passed, warnings, blockers) => `${passed} 통과 / 경고 ${warnings}개 / 차단 ${blockers}개`,
      dispatchSimulation: "실행 Simulation",
      dispatchSimulationDecisionLabel: koDispatchSimulationDecision,
      dispatchSimulationSummary: (ready, held, blocked) => `${ready} 준비 / 보류 ${held}개 / 차단 ${blocked}개`,
      runnerManifest: "Runner 매니페스트",
      runnerManifestDecisionLabel: koRunnerManifestDecision,
      runnerManifestSummary: (readyTasks, runnerTasks, blockedTasks) => `${readyTasks}개 준비 / Runner 작업 ${runnerTasks}개 / 차단 ${blockedTasks}개`,
      runnerInvocation: "Runner 호출 패키지",
      runnerInvocationDecisionLabel: koRunnerInvocationDecision,
      runnerInvocationSummary: (readyInvocations, invocationFiles, blockedInvocations) => `${readyInvocations}개 준비 / 호출 파일 ${invocationFiles}개 / 차단 ${blockedInvocations}개`,
      runnerIntake: "Runner 수락 감사",
      runnerIntakeDecisionLabel: koRunnerIntakeDecision,
      runnerIntakeSummary: (acceptedIntakes, invocationFiles, blockedIntakes) => `${acceptedIntakes}개 수락 / 호출 파일 ${invocationFiles}개 / 차단 ${blockedIntakes}개`,
      runnerSelfTest: "Runner 자체 검증",
      runnerSelfTestDecisionLabel: koRunnerSelfTestDecision,
      runnerSelfTestSummary: (wouldRun, notExecutedCommands, blockedTasks) => `${wouldRun}개 모의 실행 / 미실행 명령 ${notExecutedCommands}개 / 차단 ${blockedTasks}개`,
      sandboxRunnerPreflightDecisionLabel: koSandboxRunnerPreflightDecision,
      sandboxRunnerPreflightSummary: (readyTasks, heldTasks, blockedTasks, processExecutions) => `${readyTasks}개 ready / 보류 ${heldTasks}개 / 차단 ${blockedTasks}개 / 예상 프로세스 ${processExecutions}개`,
      sandboxRunner: "Sandbox Runner",
      sandboxRunnerDecisionLabel: koSandboxRunnerDecision,
      sandboxRunnerSummary: (executedTasks, processExecutions, commandResults) => `${executedTasks}개 실행 / 프로세스 ${processExecutions}개 / 명령 결과 ${commandResults}개`,
      drillDecision: "Drill 판정",
      drillNextAction: "다음 조치",
      drillReady: "모든 ready session이 샌드박스 코딩 에이전트 할당 시뮬레이션을 통과했습니다.",
      drillAction: koCodingDrillAction,
      drillDecisionLabel: koCodingDrillDecision,
      drillSummary: (wouldAssign, notAssigned) => `${wouldAssign} 할당 / ${notAssigned} 중지`,
      receiptDecision: "증거 판정",
      receiptNextAction: "다음 조치",
      receiptReady: "모든 receipt가 구현 증거 검토를 통과했습니다.",
      receiptStatus: koCodingReceiptStatus,
      receiptDecisionLabel: koCodingReceiptDecision,
      receiptSummary: (verified, pending, failed) => `${verified} 확인 / ${pending} 증거 부족 / ${failed} 실패`,
      mode: "모드",
      executor: "Executor",
      sandboxBoundary: "Sandbox 경계",
      evidencePrefix: "증거 prefix",
      allowedActions: (count) => `${count}개 허용 동작`,
      releaseGate: "릴리스 게이트",
      required: "필수",
      optional: "선택",
      crossRole: "역할 공통",
      promptReady: "에이전트 prompt 준비됨",
      empty: "Development Board에서 코딩 에이전트 브리프를 생성하세요.",
      statusGateway: "코딩 에이전트 브리프를 로컬 게이트웨이로 내보냈습니다.",
      statusFallback: (errorMessage) => `게이트웨이 브리프를 사용할 수 없어 로컬 내보내기를 사용했습니다.${errorMessage ? ` ${errorMessage}` : ""}`,
      statusMarkdown: "코딩 에이전트 Markdown prompt pack을 로컬에서 준비했습니다.",
      statusReviewGateway: (decision, blockers, warnings) => `코딩 에이전트 브리프 검토 ${koBriefReviewDecision(decision)}: 차단 ${blockers}개, 경고 ${warnings}개.`,
      statusReviewLocal: (decision, blockers, warnings, errorMessage) => `로컬에서 브리프 검토 완료 ${koBriefReviewDecision(decision)}: 차단 ${blockers}개, 경고 ${warnings}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSessionGateway: (decision, ready, held) => `코딩 에이전트 session bundle ${koBriefReviewDecision(decision)}: ready ${ready}개, held ${held}개.`,
      statusSessionLocal: (decision, ready, held, errorMessage) => `로컬에서 session bundle 완료 ${koBriefReviewDecision(decision)}: ready ${ready}개, held ${held}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusDispatchGateway: (decision, ready, held, promptFiles) => `코딩 에이전트 dispatch package ${koCodingDispatchDecision(decision)}: ready ${ready}개, held ${held}개, prompt ${promptFiles}개.`,
      statusDispatchLocal: (decision, ready, held, promptFiles, errorMessage) => `로컬에서 dispatch package 완료 ${koCodingDispatchDecision(decision)}: ready ${ready}개, held ${held}개, prompt ${promptFiles}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightGateway: (decision, readyTasks, heldTasks, blockedTasks, processExecutions) => `Sandbox 확인 ${koSandboxRunnerPreflightDecision(decision)}: ready ${readyTasks}개, 보류 ${heldTasks}개, 차단 ${blockedTasks}개, 예상 프로세스 ${processExecutions}개.`,
      statusSandboxRunnerPreflightLocal: (decision, readyTasks, heldTasks, blockedTasks, processExecutions, errorMessage) => `로컬에서 Sandbox 확인 완료 ${koSandboxRunnerPreflightDecision(decision)}: ready ${readyTasks}개, 보류 ${heldTasks}개, 차단 ${blockedTasks}개, 예상 프로세스 ${processExecutions}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusSandboxRunnerPreflightBlocked: (decision, readyTasks, heldTasks, blockedTasks) => `Sandbox 실행을 중지했습니다. Preflight ${koSandboxRunnerPreflightDecision(decision)}: ready ${readyTasks}개, 보류 ${heldTasks}개, 차단 ${blockedTasks}개.`,
      statusSandboxRunnerGateway: (decision, executedTasks, processExecutions, commandResults) => `Sandbox Runner ${koSandboxRunnerDecision(decision)}: 실행 ${executedTasks}개, 프로세스 ${processExecutions}개, 명령 결과 ${commandResults}개.`,
      statusSandboxRunnerUnavailable: (errorMessage) => `Sandbox Runner에는 로컬 gateway가 필요합니다.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusDrillGateway: (decision, wouldAssign, notAssigned) => `코딩 에이전트 session 모의실행 ${koCodingDrillDecision(decision)}: 할당 ${wouldAssign}개, 중지 ${notAssigned}개.`,
      statusDrillLocal: (decision, wouldAssign, notAssigned, errorMessage) => `로컬에서 session 모의실행 완료 ${koCodingDrillDecision(decision)}: 할당 ${wouldAssign}개, 중지 ${notAssigned}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptGateway: (decision, verified, pending, failed) => `코딩 에이전트 증거 템플릿 ${koCodingReceiptDecision(decision)}: 확인 ${verified}개, 증거 부족 ${pending}개, 실패 ${failed}개.`,
      statusReceiptLocal: (decision, verified, pending, failed, errorMessage) => `로컬에서 증거 템플릿 완료 ${koCodingReceiptDecision(decision)}: 확인 ${verified}개, 증거 부족 ${pending}개, 실패 ${failed}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptReviewGateway: (decision, verified, pending, failed) => `가져온 증거 검토 ${koCodingReceiptDecision(decision)}: 확인 ${verified}개, 증거 부족 ${pending}개, 실패 ${failed}개.`,
      statusReceiptReviewLocal: (decision, verified, pending, failed, errorMessage) => `로컬에서 가져온 증거 검토 완료 ${koCodingReceiptDecision(decision)}: 확인 ${verified}개, 증거 부족 ${pending}개, 실패 ${failed}개.${errorMessage ? ` Gateway: ${errorMessage}` : ""}`,
      statusReceiptReviewApplied: (message, artifactDecision, verifiedPaths, unresolvedPaths, applied, skipped, reusedTranscriptRefs, reusedChangedFileRefs, reusedEvidenceArtifactRefs, transcriptContentMismatches) =>
        `${message} 아티팩트 감사 ${artifactDecision}: ${verifiedPaths}개 확인, ${unresolvedPaths}개 미해결${reusedTranscriptRefs ? `, transcript 재사용 ${reusedTranscriptRefs}개` : ""}${reusedChangedFileRefs ? `, changed file 재사용 ${reusedChangedFileRefs}개` : ""}${reusedEvidenceArtifactRefs ? `, evidence artifact 재사용 ${reusedEvidenceArtifactRefs}개` : ""}${transcriptContentMismatches ? `, 내용 불일치 ${transcriptContentMismatches}개` : ""}. Development Board에 ${applied}개 적용, ${skipped}개 보류.`,
      statusReceiptImportError: (errorMessage) => `증거 제출서 가져오기에 실패했습니다. ${errorMessage}`
    },
    releaseRehearsal: {
      title: "릴리스 리허설",
      notRun: "미실행",
      idle: "대기",
      passed: (count) => `${count} 통과`,
      warnings: (count) => `${count} 경고`,
      blockers: (count) => `${count} 차단`,
      localDryRun: "로컬 dry-run 리허설",
      sourceLine: (sourceRun, level, evidenceItems) => `${sourceRun} / ${level} / 증거 ${evidenceItems}개`,
      run: "리허설 실행",
      exportReport: "보고서 내보내기",
      verify: "검증",
      productionCheck: "운영 확인",
      exportIssues: "issues 내보내기",
      exportGh: "gh 내보내기",
      downloadJson: "JSON 다운로드",
      downloadVerify: "검증 다운로드",
      downloadIssues: "issues 다운로드",
      downloadGh: "gh 다운로드",
      metrics: {
        bundle: "Bundle",
        notes: "Notes",
        runner: "Runner",
        held: "보류",
        ready: (count) => `${count} ready`
      },
      evidenceClaimTitle: (level) => `${level} 증거 선언`,
      remediationQueue: "개선 대기열",
      remediationSummary: (high, medium) => `${high} high / ${medium} medium`,
      empty: "인계 전에 로컬 릴리스 리허설을 실행하세요.",
      decision: {
        releaseReady: "릴리스 가능",
        needsReview: "검토 필요",
        blocked: "차단됨"
      },
      verification: {
        decision: {
          verified: "검증됨",
          notProductionReady: "운영 준비 전",
          invalid: "무효"
        },
        scope: (scope, requireProductionEvidence) => `${scope}${requireProductionEvidence ? " / 운영 증거 필요" : ""}`,
        result: (passed, failed) => `${passed} 통과 / ${failed} 실패`,
        ready: "검증 보고서를 인계 검토에 사용할 수 있습니다."
      }
    }
  }
};

function jaRehearsalDecision(decision: string) {
  if (decision === "release-ready") return "リリース可能";
  if (decision === "needs-review") return "レビュー要";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaVerificationDecision(decision: string) {
  if (decision === "verified") return "検証済み";
  if (decision === "not-production-ready") return "本番未準備";
  if (decision === "invalid") return "無効";
  return decision;
}

function jaBriefReviewDecision(decision: string) {
  if (decision === "ready") return "引き渡し可";
  if (decision === "needs-review") return "レビュー要";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaCodingSessionStatus(status: string) {
  if (status === "ready-for-agent") return "代理に引き渡し可";
  if (status === "held-for-review") return "レビュー待ち";
  if (status === "held-for-production-evidence") return "本番証拠待ち";
  return status;
}

function jaCodingDispatchDecision(decision: string) {
  if (decision === "dispatchable") return "dispatch可";
  if (decision === "held") return "保留";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaDispatchArchiveAuditDecision(decision: string) {
  if (decision === "verified") return "確認済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaDispatchSimulationDecision(decision: string) {
  if (decision === "ready-for-real-agent") return "実行準備済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaRunnerManifestDecision(decision: string) {
  if (decision === "runner-ready") return "Runner準備済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaRunnerInvocationDecision(decision: string) {
  if (decision === "package-ready") return "起動準備済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaRunnerIntakeDecision(decision: string) {
  if (decision === "accepted-for-runner") return "Runner受入済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaRunnerSelfTestDecision(decision: string) {
  if (decision === "self-test-ready") return "自己検証済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaSandboxRunnerDecision(decision: string) {
  if (decision === "sandbox-runner-verified") return "Sandbox検証済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaSandboxRunnerPreflightDecision(decision: string) {
  if (decision === "ready") return "実行準備済み";
  if (decision === "needs-review") return "要確認";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaCodingDrillDecision(decision: string) {
  if (decision === "assignable") return "割当可";
  if (decision === "held") return "保留";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaCodingDrillAction(action: string) {
  if (action === "would-assign") return "割当予定";
  if (action === "not-assigned") return "割当停止";
  if (action === "needs-operator-review") return "オペレーター確認";
  return action;
}

function jaCodingReceiptDecision(decision: string) {
  if (decision === "verified") return "確認済み";
  if (decision === "needs-evidence") return "証拠不足";
  if (decision === "blocked") return "ブロック";
  return decision;
}

function jaCodingReceiptStatus(status: string) {
  if (status === "verified") return "確認済み";
  if (status === "pending-evidence") return "証拠不足";
  if (status === "failed") return "失敗";
  if (status === "held") return "保留";
  return status;
}

function enCodingDrillDecision(decision: string) {
  if (decision === "assignable") return "assignable";
  if (decision === "held") return "held";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enCodingDispatchDecision(decision: string) {
  if (decision === "dispatchable") return "dispatchable";
  if (decision === "held") return "held";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enDispatchArchiveAuditDecision(decision: string) {
  if (decision === "verified") return "verified";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enDispatchSimulationDecision(decision: string) {
  if (decision === "ready-for-real-agent") return "ready for real agent";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enRunnerManifestDecision(decision: string) {
  if (decision === "runner-ready") return "runner ready";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enRunnerInvocationDecision(decision: string) {
  if (decision === "package-ready") return "package ready";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enRunnerIntakeDecision(decision: string) {
  if (decision === "accepted-for-runner") return "accepted for runner";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enRunnerSelfTestDecision(decision: string) {
  if (decision === "self-test-ready") return "self-test ready";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enSandboxRunnerDecision(decision: string) {
  if (decision === "sandbox-runner-verified") return "sandbox verified";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enSandboxRunnerPreflightDecision(decision: string) {
  if (decision === "ready") return "ready";
  if (decision === "needs-review") return "needs review";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enCodingDrillAction(action: string) {
  if (action === "would-assign") return "would assign";
  if (action === "not-assigned") return "not assigned";
  if (action === "needs-operator-review") return "operator review";
  return action;
}

function enCodingReceiptDecision(decision: string) {
  if (decision === "verified") return "verified";
  if (decision === "needs-evidence") return "needs evidence";
  if (decision === "blocked") return "blocked";
  return decision;
}

function enCodingReceiptStatus(status: string) {
  if (status === "verified") return "verified";
  if (status === "pending-evidence") return "pending evidence";
  if (status === "failed") return "failed";
  if (status === "held") return "held";
  return status;
}

function zhHansRehearsalDecision(decision: string) {
  if (decision === "release-ready") return "可发布";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansVerificationDecision(decision: string) {
  if (decision === "verified") return "已验证";
  if (decision === "not-production-ready") return "生产未就绪";
  if (decision === "invalid") return "无效";
  return decision;
}

function zhHansBriefReviewDecision(decision: string) {
  if (decision === "ready") return "可交付";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansCodingSessionStatus(status: string) {
  if (status === "ready-for-agent") return "可交付给代理";
  if (status === "held-for-review") return "等待审查";
  if (status === "held-for-production-evidence") return "等待生产证据";
  return status;
}

function zhHansCodingDispatchDecision(decision: string) {
  if (decision === "dispatchable") return "可分发";
  if (decision === "held") return "保留";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansDispatchArchiveAuditDecision(decision: string) {
  if (decision === "verified") return "已确认";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansDispatchSimulationDecision(decision: string) {
  if (decision === "ready-for-real-agent") return "可交付真实代理";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansRunnerManifestDecision(decision: string) {
  if (decision === "runner-ready") return "Runner 就绪";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansRunnerInvocationDecision(decision: string) {
  if (decision === "package-ready") return "调用包就绪";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansRunnerIntakeDecision(decision: string) {
  if (decision === "accepted-for-runner") return "已接收给 Runner";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansRunnerSelfTestDecision(decision: string) {
  if (decision === "self-test-ready") return "自测通过";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansSandboxRunnerDecision(decision: string) {
  if (decision === "sandbox-runner-verified") return "沙箱已验证";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansSandboxRunnerPreflightDecision(decision: string) {
  if (decision === "ready") return "已就绪";
  if (decision === "needs-review") return "需审查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansCodingDrillDecision(decision: string) {
  if (decision === "assignable") return "可分配";
  if (decision === "held") return "保留";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansCodingDrillAction(action: string) {
  if (action === "would-assign") return "模拟分配";
  if (action === "not-assigned") return "停止分配";
  if (action === "needs-operator-review") return "需要操作者审查";
  return action;
}

function zhHansCodingReceiptDecision(decision: string) {
  if (decision === "verified") return "已确认";
  if (decision === "needs-evidence") return "缺少证据";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHansCodingReceiptStatus(status: string) {
  if (status === "verified") return "已确认";
  if (status === "pending-evidence") return "缺少证据";
  if (status === "failed") return "失败";
  if (status === "held") return "保留";
  return status;
}

function zhHantRehearsalDecision(decision: string) {
  if (decision === "release-ready") return "可發布";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantVerificationDecision(decision: string) {
  if (decision === "verified") return "已驗證";
  if (decision === "not-production-ready") return "生產未就緒";
  if (decision === "invalid") return "無效";
  return decision;
}

function zhHantBriefReviewDecision(decision: string) {
  if (decision === "ready") return "可交付";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantCodingSessionStatus(status: string) {
  if (status === "ready-for-agent") return "可交付給代理";
  if (status === "held-for-review") return "等待審查";
  if (status === "held-for-production-evidence") return "等待生產證據";
  return status;
}

function zhHantCodingDispatchDecision(decision: string) {
  if (decision === "dispatchable") return "可分發";
  if (decision === "held") return "保留";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantDispatchArchiveAuditDecision(decision: string) {
  if (decision === "verified") return "已確認";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantDispatchSimulationDecision(decision: string) {
  if (decision === "ready-for-real-agent") return "可交付真實代理";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantRunnerManifestDecision(decision: string) {
  if (decision === "runner-ready") return "Runner 就緒";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantRunnerInvocationDecision(decision: string) {
  if (decision === "package-ready") return "呼叫包就緒";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantRunnerIntakeDecision(decision: string) {
  if (decision === "accepted-for-runner") return "已接收給 Runner";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantRunnerSelfTestDecision(decision: string) {
  if (decision === "self-test-ready") return "自測通過";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantSandboxRunnerDecision(decision: string) {
  if (decision === "sandbox-runner-verified") return "沙箱已驗證";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantSandboxRunnerPreflightDecision(decision: string) {
  if (decision === "ready") return "已就緒";
  if (decision === "needs-review") return "需審查";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantCodingDrillDecision(decision: string) {
  if (decision === "assignable") return "可分配";
  if (decision === "held") return "保留";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantCodingDrillAction(action: string) {
  if (action === "would-assign") return "模擬分配";
  if (action === "not-assigned") return "停止分配";
  if (action === "needs-operator-review") return "需要操作者審查";
  return action;
}

function zhHantCodingReceiptDecision(decision: string) {
  if (decision === "verified") return "已確認";
  if (decision === "needs-evidence") return "缺少證據";
  if (decision === "blocked") return "已阻塞";
  return decision;
}

function zhHantCodingReceiptStatus(status: string) {
  if (status === "verified") return "已確認";
  if (status === "pending-evidence") return "缺少證據";
  if (status === "failed") return "失敗";
  if (status === "held") return "保留";
  return status;
}

function koRehearsalDecision(decision: string) {
  if (decision === "release-ready") return "릴리스 가능";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koVerificationDecision(decision: string) {
  if (decision === "verified") return "검증됨";
  if (decision === "not-production-ready") return "운영 준비 전";
  if (decision === "invalid") return "무효";
  return decision;
}

function koBriefReviewDecision(decision: string) {
  if (decision === "ready") return "인계 가능";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koCodingSessionStatus(status: string) {
  if (status === "ready-for-agent") return "에이전트 인계 가능";
  if (status === "held-for-review") return "검토 대기";
  if (status === "held-for-production-evidence") return "운영 증거 대기";
  return status;
}

function koCodingDispatchDecision(decision: string) {
  if (decision === "dispatchable") return "배포 가능";
  if (decision === "held") return "보류";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koDispatchArchiveAuditDecision(decision: string) {
  if (decision === "verified") return "확인됨";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koDispatchSimulationDecision(decision: string) {
  if (decision === "ready-for-real-agent") return "실제 에이전트 준비";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koRunnerManifestDecision(decision: string) {
  if (decision === "runner-ready") return "Runner 준비";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koRunnerInvocationDecision(decision: string) {
  if (decision === "package-ready") return "호출 패키지 준비";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koRunnerIntakeDecision(decision: string) {
  if (decision === "accepted-for-runner") return "Runner 수락 완료";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koRunnerSelfTestDecision(decision: string) {
  if (decision === "self-test-ready") return "자체 검증 완료";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koSandboxRunnerDecision(decision: string) {
  if (decision === "sandbox-runner-verified") return "Sandbox 검증 완료";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koSandboxRunnerPreflightDecision(decision: string) {
  if (decision === "ready") return "준비됨";
  if (decision === "needs-review") return "검토 필요";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koCodingDrillDecision(decision: string) {
  if (decision === "assignable") return "할당 가능";
  if (decision === "held") return "보류";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koCodingDrillAction(action: string) {
  if (action === "would-assign") return "할당 예정";
  if (action === "not-assigned") return "할당 중지";
  if (action === "needs-operator-review") return "운영자 검토 필요";
  return action;
}

function koCodingReceiptDecision(decision: string) {
  if (decision === "verified") return "확인됨";
  if (decision === "needs-evidence") return "증거 부족";
  if (decision === "blocked") return "차단됨";
  return decision;
}

function koCodingReceiptStatus(status: string) {
  if (status === "verified") return "확인됨";
  if (status === "pending-evidence") return "증거 부족";
  if (status === "failed") return "실패";
  if (status === "held") return "보류";
  return status;
}

function jaEngineeringLaunchState(state: string) {
  if (state === "needs-mission") return "入力待ち";
  if (state === "cabinet-ready") return "内閣結果あり";
  if (state === "runner-ready") return "工程組準備済み";
  if (state === "ready-to-run") return "ローカル実行可";
  if (state === "runner-verified") return "証拠付き検証済み";
  if (state === "runner-needs-review") return "レビュー要";
  return state;
}

function enEngineeringLaunchState(state: string) {
  if (state === "needs-mission") return "waiting for input";
  if (state === "cabinet-ready") return "cabinet ready";
  if (state === "runner-ready") return "agent pack ready";
  if (state === "ready-to-run") return "ready to run";
  if (state === "runner-verified") return "evidence verified";
  if (state === "runner-needs-review") return "needs review";
  return state;
}

function zhHansEngineeringLaunchState(state: string) {
  if (state === "needs-mission") return "等待输入";
  if (state === "cabinet-ready") return "内阁已拆分";
  if (state === "runner-ready") return "工程组已准备";
  if (state === "ready-to-run") return "可本地运行";
  if (state === "runner-verified") return "证据已验证";
  if (state === "runner-needs-review") return "需要审查";
  return state;
}

function zhHantEngineeringLaunchState(state: string) {
  if (state === "needs-mission") return "等待輸入";
  if (state === "cabinet-ready") return "內閣已拆分";
  if (state === "runner-ready") return "工程組已準備";
  if (state === "ready-to-run") return "可本地執行";
  if (state === "runner-verified") return "證據已驗證";
  if (state === "runner-needs-review") return "需要審查";
  return state;
}

function koEngineeringLaunchState(state: string) {
  if (state === "needs-mission") return "입력 대기";
  if (state === "cabinet-ready") return "내각 준비됨";
  if (state === "runner-ready") return "엔지니어링 준비됨";
  if (state === "ready-to-run") return "로컬 실행 가능";
  if (state === "runner-verified") return "증거 검증됨";
  if (state === "runner-needs-review") return "검토 필요";
  return state;
}

function jaEngineeringPermissionMode(mode: string) {
  return engineeringLabel(mode, {
    "code-only": "コード作業のみ",
    "browser-assisted": "ブラウザ補助",
    "mac-assisted": "Mac 操作あり",
    "approval-gated": "人間承認ゲート"
  });
}

function enEngineeringPermissionMode(mode: string) {
  return engineeringLabel(mode, {
    "code-only": "code only",
    "browser-assisted": "browser assisted",
    "mac-assisted": "Mac assisted",
    "approval-gated": "approval gated"
  });
}

function zhHansEngineeringPermissionMode(mode: string) {
  return engineeringLabel(mode, {
    "code-only": "仅代码工程",
    "browser-assisted": "浏览器辅助",
    "mac-assisted": "需要 Mac 操作",
    "approval-gated": "人审闸门"
  });
}

function zhHantEngineeringPermissionMode(mode: string) {
  return engineeringLabel(mode, {
    "code-only": "僅程式碼工程",
    "browser-assisted": "瀏覽器輔助",
    "mac-assisted": "需要 Mac 操作",
    "approval-gated": "人審閘門"
  });
}

function koEngineeringPermissionMode(mode: string) {
  return engineeringLabel(mode, {
    "code-only": "코드 작업만",
    "browser-assisted": "브라우저 보조",
    "mac-assisted": "Mac 조작 포함",
    "approval-gated": "승인 게이트"
  });
}

function jaEngineeringLaunchStage(stage: string) {
  return engineeringLabel(stage, {
    "needs-mission": "入力待ち",
    "mission-ready": "ミッション準備済み",
    "cabinet-ready": "内閣結果確認",
    "packaging-ready": "工程パック準備",
    "preflight-ready": "権限確認待ち",
    "sandbox-ready": "ローカル実行待ち",
    "evidence-review": "証拠レビュー",
    "needs-review": "レビュー要"
  });
}

function enEngineeringLaunchStage(stage: string) {
  return engineeringLabel(stage, {
    "needs-mission": "needs mission",
    "mission-ready": "mission ready",
    "cabinet-ready": "cabinet output",
    "packaging-ready": "prepare pack",
    "preflight-ready": "permission check",
    "sandbox-ready": "local run ready",
    "evidence-review": "evidence review",
    "needs-review": "needs review"
  });
}

function zhHansEngineeringLaunchStage(stage: string) {
  return engineeringLabel(stage, {
    "needs-mission": "等待输入任务",
    "mission-ready": "任务已准备",
    "cabinet-ready": "内阁结果检查",
    "packaging-ready": "准备工程包",
    "preflight-ready": "等待权限检查",
    "sandbox-ready": "等待本地运行",
    "evidence-review": "证据审查",
    "needs-review": "需要审查"
  });
}

function zhHantEngineeringLaunchStage(stage: string) {
  return engineeringLabel(stage, {
    "needs-mission": "等待輸入任務",
    "mission-ready": "任務已準備",
    "cabinet-ready": "內閣結果檢查",
    "packaging-ready": "準備工程包",
    "preflight-ready": "等待權限檢查",
    "sandbox-ready": "等待本地執行",
    "evidence-review": "證據審查",
    "needs-review": "需要審查"
  });
}

function koEngineeringLaunchStage(stage: string) {
  return engineeringLabel(stage, {
    "needs-mission": "미션 입력 필요",
    "mission-ready": "미션 준비됨",
    "cabinet-ready": "내각 결과 확인",
    "packaging-ready": "패키지 준비",
    "preflight-ready": "권한 확인 대기",
    "sandbox-ready": "로컬 실행 대기",
    "evidence-review": "증거 검토",
    "needs-review": "검토 필요"
  });
}

function jaEngineeringNextAction(action: string) {
  return engineeringLabel(action, {
    "enter-mission": "まず入力する",
    "run-cabinet": "内閣で分解",
    "prepare-pack": "工程組を準備",
    "run-preflight": "権限を確認",
    "run-sandbox": "ローカル実行",
    "review-evidence": "証拠を確認",
    "request-approval": "承認を取る"
  });
}

function enEngineeringNextAction(action: string) {
  return engineeringLabel(action, {
    "enter-mission": "enter mission",
    "run-cabinet": "run cabinet",
    "prepare-pack": "prepare agents",
    "run-preflight": "check permission",
    "run-sandbox": "run local sandbox",
    "review-evidence": "review evidence",
    "request-approval": "request approval"
  });
}

function zhHansEngineeringNextAction(action: string) {
  return engineeringLabel(action, {
    "enter-mission": "先输入任务",
    "run-cabinet": "运行内阁拆分",
    "prepare-pack": "准备工程组",
    "run-preflight": "检查权限",
    "run-sandbox": "运行本地沙箱",
    "review-evidence": "审查证据",
    "request-approval": "请求人审"
  });
}

function zhHantEngineeringNextAction(action: string) {
  return engineeringLabel(action, {
    "enter-mission": "先輸入任務",
    "run-cabinet": "執行內閣拆分",
    "prepare-pack": "準備工程組",
    "run-preflight": "檢查權限",
    "run-sandbox": "執行本地沙箱",
    "review-evidence": "審查證據",
    "request-approval": "請求人審"
  });
}

function koEngineeringNextAction(action: string) {
  return engineeringLabel(action, {
    "enter-mission": "미션 입력",
    "run-cabinet": "내각 실행",
    "prepare-pack": "에이전트 준비",
    "run-preflight": "권한 확인",
    "run-sandbox": "로컬 샌드박스 실행",
    "review-evidence": "증거 검토",
    "request-approval": "승인 요청"
  });
}

function jaEngineeringSelfSimulationDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "入力が必要",
    "simulated-ready": "模擬準備済み",
    "approval-required": "承認が必要",
    "needs-review": "レビュー要",
    blocked: "停止"
  });
}

function enEngineeringSelfSimulationDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "needs mission",
    "simulated-ready": "simulated ready",
    "approval-required": "approval required",
    "needs-review": "needs review",
    blocked: "blocked"
  });
}

function zhHansEngineeringSelfSimulationDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "需要任务",
    "simulated-ready": "模拟就绪",
    "approval-required": "需要审批",
    "needs-review": "需要审查",
    blocked: "已阻止"
  });
}

function zhHantEngineeringSelfSimulationDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "需要任務",
    "simulated-ready": "模擬就緒",
    "approval-required": "需要審批",
    "needs-review": "需要審查",
    blocked: "已阻止"
  });
}

function koEngineeringSelfSimulationDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "미션 필요",
    "simulated-ready": "시뮬레이션 준비됨",
    "approval-required": "승인 필요",
    "needs-review": "검토 필요",
    blocked: "차단"
  });
}

function jaEngineeringSelfSimulationStage(stage: string) {
  return engineeringLabel(stage, {
    mission: "ミッション",
    cabinet: "内閣",
    briefs: "Brief",
    sessions: "Session",
    dispatch: "Dispatch",
    runner: "Runner",
    preflight: "Preflight",
    evidence: "証拠"
  });
}

function enEngineeringSelfSimulationStage(stage: string) {
  return engineeringLabel(stage, {
    mission: "mission",
    cabinet: "cabinet",
    briefs: "briefs",
    sessions: "sessions",
    dispatch: "dispatch",
    runner: "runner",
    preflight: "preflight",
    evidence: "evidence"
  });
}

function zhHansEngineeringSelfSimulationStage(stage: string) {
  return engineeringLabel(stage, {
    mission: "任务",
    cabinet: "内阁",
    briefs: "Brief",
    sessions: "会话",
    dispatch: "分发",
    runner: "Runner",
    preflight: "预检",
    evidence: "证据"
  });
}

function zhHantEngineeringSelfSimulationStage(stage: string) {
  return engineeringLabel(stage, {
    mission: "任務",
    cabinet: "內閣",
    briefs: "Brief",
    sessions: "會話",
    dispatch: "分發",
    runner: "Runner",
    preflight: "預檢",
    evidence: "證據"
  });
}

function koEngineeringSelfSimulationStage(stage: string) {
  return engineeringLabel(stage, {
    mission: "미션",
    cabinet: "내각",
    briefs: "Brief",
    sessions: "세션",
    dispatch: "Dispatch",
    runner: "Runner",
    preflight: "Preflight",
    evidence: "증거"
  });
}

function jaEngineeringSelfSimulationStageStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通過",
    warn: "注意",
    block: "停止",
    waiting: "待機"
  });
}

function enEngineeringSelfSimulationStageStatus(status: string) {
  return engineeringLabel(status, {
    pass: "pass",
    warn: "warn",
    block: "block",
    waiting: "waiting"
  });
}

function zhHansEngineeringSelfSimulationStageStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通过",
    warn: "注意",
    block: "阻止",
    waiting: "等待"
  });
}

function zhHantEngineeringSelfSimulationStageStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通過",
    warn: "注意",
    block: "阻止",
    waiting: "等待"
  });
}

function koEngineeringSelfSimulationStageStatus(status: string) {
  return engineeringLabel(status, {
    pass: "통과",
    warn: "주의",
    block: "차단",
    waiting: "대기"
  });
}

function jaEngineeringSelfSimulationCapability(capability: string) {
  return engineeringLabel(capability, {
    "code-writing": "コード作成",
    "allowlisted-shell": "許可 shell",
    "browser-assist": "ブラウザ補助",
    "mac-desktop": "Mac 操作",
    "mcp-tools": "MCP",
    "external-writes": "外部書き込み"
  });
}

function enEngineeringSelfSimulationCapability(capability: string) {
  return engineeringLabel(capability, {
    "code-writing": "code writing",
    "allowlisted-shell": "allowlisted shell",
    "browser-assist": "browser assist",
    "mac-desktop": "Mac desktop",
    "mcp-tools": "MCP tools",
    "external-writes": "external writes"
  });
}

function zhHansEngineeringSelfSimulationCapability(capability: string) {
  return engineeringLabel(capability, {
    "code-writing": "写代码",
    "allowlisted-shell": "允许 shell",
    "browser-assist": "浏览器辅助",
    "mac-desktop": "Mac 桌面",
    "mcp-tools": "MCP 工具",
    "external-writes": "外部写入"
  });
}

function zhHantEngineeringSelfSimulationCapability(capability: string) {
  return engineeringLabel(capability, {
    "code-writing": "寫程式",
    "allowlisted-shell": "允許 shell",
    "browser-assist": "瀏覽器輔助",
    "mac-desktop": "Mac 桌面",
    "mcp-tools": "MCP 工具",
    "external-writes": "外部寫入"
  });
}

function koEngineeringSelfSimulationCapability(capability: string) {
  return engineeringLabel(capability, {
    "code-writing": "코드 작성",
    "allowlisted-shell": "허용 shell",
    "browser-assist": "브라우저 보조",
    "mac-desktop": "Mac 데스크톱",
    "mcp-tools": "MCP 도구",
    "external-writes": "외부 쓰기"
  });
}

function jaEngineeringSelfSimulationCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "準備済み",
    simulated: "模擬",
    "approval-required": "承認必要",
    "not-requested": "未要求",
    blocked: "停止"
  });
}

function enEngineeringSelfSimulationCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "ready",
    simulated: "simulated",
    "approval-required": "approval",
    "not-requested": "not requested",
    blocked: "blocked"
  });
}

function zhHansEngineeringSelfSimulationCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已准备",
    simulated: "已模拟",
    "approval-required": "需审批",
    "not-requested": "未请求",
    blocked: "已阻止"
  });
}

function zhHantEngineeringSelfSimulationCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已準備",
    simulated: "已模擬",
    "approval-required": "需審批",
    "not-requested": "未請求",
    blocked: "已阻止"
  });
}

function koEngineeringSelfSimulationCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "준비됨",
    simulated: "시뮬레이션",
    "approval-required": "승인 필요",
    "not-requested": "요청 없음",
    blocked: "차단"
  });
}

function jaEngineeringPermissionRequestDecision(decision: string) {
  return engineeringLabel(decision, {
    ready: "ローカル準備済み",
    "approval-required": "承認が必要",
    blocked: "停止"
  });
}

function enEngineeringPermissionRequestDecision(decision: string) {
  return engineeringLabel(decision, {
    ready: "local ready",
    "approval-required": "approval required",
    blocked: "blocked"
  });
}

function zhHansEngineeringPermissionRequestDecision(decision: string) {
  return engineeringLabel(decision, {
    ready: "本地就绪",
    "approval-required": "需要审批",
    blocked: "已阻止"
  });
}

function zhHantEngineeringPermissionRequestDecision(decision: string) {
  return engineeringLabel(decision, {
    ready: "本地就緒",
    "approval-required": "需要審批",
    blocked: "已阻止"
  });
}

function koEngineeringPermissionRequestDecision(decision: string) {
  return engineeringLabel(decision, {
    ready: "로컬 준비됨",
    "approval-required": "승인 필요",
    blocked: "차단"
  });
}

function jaEngineeringPermissionRequestMode(mode: string) {
  return engineeringLabel(mode, {
    "default-local": "ローカル既定",
    "ask-before-use": "使用前確認",
    "not-requested": "未要求",
    blocked: "拒否"
  });
}

function enEngineeringPermissionRequestMode(mode: string) {
  return engineeringLabel(mode, {
    "default-local": "local default",
    "ask-before-use": "ask before use",
    "not-requested": "not requested",
    blocked: "denied"
  });
}

function zhHansEngineeringPermissionRequestMode(mode: string) {
  return engineeringLabel(mode, {
    "default-local": "本地默认",
    "ask-before-use": "使用前确认",
    "not-requested": "未请求",
    blocked: "拒绝"
  });
}

function zhHantEngineeringPermissionRequestMode(mode: string) {
  return engineeringLabel(mode, {
    "default-local": "本地預設",
    "ask-before-use": "使用前確認",
    "not-requested": "未請求",
    blocked: "拒絕"
  });
}

function koEngineeringPermissionRequestMode(mode: string) {
  return engineeringLabel(mode, {
    "default-local": "로컬 기본",
    "ask-before-use": "사용 전 확인",
    "not-requested": "요청 없음",
    blocked: "거부"
  });
}

function jaEngineeringCapabilityGapDecision(decision: string) {
  return engineeringLabel(decision, {
    "engineering-ready": "工程準備中",
    "agent-ready": "Agent 準備済み",
    "runtime-needed": "Runtime 要接続",
    blocked: "停止"
  });
}

function enEngineeringCapabilityGapDecision(decision: string) {
  return engineeringLabel(decision, {
    "engineering-ready": "engineering ready",
    "agent-ready": "agent ready",
    "runtime-needed": "runtime needed",
    blocked: "blocked"
  });
}

function zhHansEngineeringCapabilityGapDecision(decision: string) {
  return engineeringLabel(decision, {
    "engineering-ready": "工程准备中",
    "agent-ready": "Agent 就绪",
    "runtime-needed": "需要运行时",
    blocked: "已阻止"
  });
}

function zhHantEngineeringCapabilityGapDecision(decision: string) {
  return engineeringLabel(decision, {
    "engineering-ready": "工程準備中",
    "agent-ready": "Agent 就緒",
    "runtime-needed": "需要執行時",
    blocked: "已阻止"
  });
}

function koEngineeringCapabilityGapDecision(decision: string) {
  return engineeringLabel(decision, {
    "engineering-ready": "엔지니어링 준비",
    "agent-ready": "agent 준비됨",
    "runtime-needed": "runtime 필요",
    blocked: "차단"
  });
}

function jaEngineeringCapabilityGapItem(item: string) {
  return engineeringLabel(item, {
    "supervised-coding": "監督付きコード作成",
    "local-shell": "ローカル shell",
    "browser-automation": "ブラウザ自動化",
    "mac-desktop-control": "Mac デスクトップ操作",
    "mcp-connectors": "MCP connector",
    "external-writes": "外部書き込み"
  });
}

function enEngineeringCapabilityGapItem(item: string) {
  return engineeringLabel(item, {
    "supervised-coding": "supervised coding",
    "local-shell": "local shell",
    "browser-automation": "browser automation",
    "mac-desktop-control": "Mac desktop control",
    "mcp-connectors": "MCP connectors",
    "external-writes": "external writes"
  });
}

function zhHansEngineeringCapabilityGapItem(item: string) {
  return engineeringLabel(item, {
    "supervised-coding": "监督式写代码",
    "local-shell": "本地 shell",
    "browser-automation": "浏览器自动化",
    "mac-desktop-control": "Mac 桌面控制",
    "mcp-connectors": "MCP 连接器",
    "external-writes": "外部写入"
  });
}

function zhHantEngineeringCapabilityGapItem(item: string) {
  return engineeringLabel(item, {
    "supervised-coding": "監督式寫程式",
    "local-shell": "本地 shell",
    "browser-automation": "瀏覽器自動化",
    "mac-desktop-control": "Mac 桌面控制",
    "mcp-connectors": "MCP 連接器",
    "external-writes": "外部寫入"
  });
}

function koEngineeringCapabilityGapItem(item: string) {
  return engineeringLabel(item, {
    "supervised-coding": "감독형 코드 작성",
    "local-shell": "로컬 shell",
    "browser-automation": "브라우저 자동화",
    "mac-desktop-control": "Mac 데스크톱 제어",
    "mcp-connectors": "MCP 커넥터",
    "external-writes": "외부 쓰기"
  });
}

function jaEngineeringCapabilityGapStatus(status: string) {
  return engineeringLabel(status, {
    ready: "準備済み",
    simulated: "模擬",
    "approval-required": "承認必要",
    missing: "未接続",
    blocked: "停止"
  });
}

function enEngineeringCapabilityGapStatus(status: string) {
  return engineeringLabel(status, {
    ready: "ready",
    simulated: "simulated",
    "approval-required": "approval",
    missing: "missing",
    blocked: "blocked"
  });
}

function zhHansEngineeringCapabilityGapStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已准备",
    simulated: "已模拟",
    "approval-required": "需审批",
    missing: "未接入",
    blocked: "已阻止"
  });
}

function zhHantEngineeringCapabilityGapStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已準備",
    simulated: "已模擬",
    "approval-required": "需審批",
    missing: "未接入",
    blocked: "已阻止"
  });
}

function koEngineeringCapabilityGapStatus(status: string) {
  return engineeringLabel(status, {
    ready: "준비됨",
    simulated: "시뮬레이션",
    "approval-required": "승인 필요",
    missing: "미연결",
    blocked: "차단"
  });
}

function jaEngineeringLaunchQueueDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-prepared": "未準備",
    "queue-ready": "引き渡し準備済み",
    "preflight-ready": "ローカル実行準備済み",
    "needs-review": "確認待ち",
    blocked: "停止"
  });
}

function enEngineeringLaunchQueueDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-prepared": "not prepared",
    "queue-ready": "queue ready",
    "preflight-ready": "preflight ready",
    "needs-review": "needs review",
    blocked: "blocked"
  });
}

function zhHansEngineeringLaunchQueueDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-prepared": "未准备",
    "queue-ready": "可交给 agent",
    "preflight-ready": "可本地执行",
    "needs-review": "需要复核",
    blocked: "已阻止"
  });
}

function zhHantEngineeringLaunchQueueDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-prepared": "未準備",
    "queue-ready": "可交給 agent",
    "preflight-ready": "可本地執行",
    "needs-review": "需要複核",
    blocked: "已阻止"
  });
}

function koEngineeringLaunchQueueDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-prepared": "미준비",
    "queue-ready": "인계 준비됨",
    "preflight-ready": "로컬 실행 준비됨",
    "needs-review": "검토 필요",
    blocked: "차단"
  });
}

function jaEngineeringLaunchQueueStatus(status: string) {
  return engineeringLabel(status, {
    "ready-to-run": "実行可",
    "ready-to-handoff": "引き渡し可",
    held: "保留",
    blocked: "停止"
  });
}

function enEngineeringLaunchQueueStatus(status: string) {
  return engineeringLabel(status, {
    "ready-to-run": "ready to run",
    "ready-to-handoff": "ready to handoff",
    held: "held",
    blocked: "blocked"
  });
}

function zhHansEngineeringLaunchQueueStatus(status: string) {
  return engineeringLabel(status, {
    "ready-to-run": "可本地跑",
    "ready-to-handoff": "可交给 agent",
    held: "保留",
    blocked: "已阻止"
  });
}

function zhHantEngineeringLaunchQueueStatus(status: string) {
  return engineeringLabel(status, {
    "ready-to-run": "可本地跑",
    "ready-to-handoff": "可交給 agent",
    held: "保留",
    blocked: "已阻止"
  });
}

function koEngineeringLaunchQueueStatus(status: string) {
  return engineeringLabel(status, {
    "ready-to-run": "실행 가능",
    "ready-to-handoff": "인계 가능",
    held: "보류",
    blocked: "차단"
  });
}

function jaEngineeringExecutionReceiptDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-started": "未回填",
    "runner-reported": "Runner 報告あり",
    "needs-evidence": "証拠不足",
    "needs-artifacts": "Artifact 要確認",
    accepted: "受理",
    blocked: "停止"
  });
}

function enEngineeringExecutionReceiptDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-started": "not started",
    "runner-reported": "runner reported",
    "needs-evidence": "needs evidence",
    "needs-artifacts": "needs artifacts",
    accepted: "accepted",
    blocked: "blocked"
  });
}

function zhHansEngineeringExecutionReceiptDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-started": "未回填",
    "runner-reported": "Runner 已报告",
    "needs-evidence": "缺少证据",
    "needs-artifacts": "需验证工件",
    accepted: "已接受",
    blocked: "已阻止"
  });
}

function zhHantEngineeringExecutionReceiptDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-started": "未回填",
    "runner-reported": "Runner 已報告",
    "needs-evidence": "缺少證據",
    "needs-artifacts": "需驗證工件",
    accepted: "已接受",
    blocked: "已阻止"
  });
}

function koEngineeringExecutionReceiptDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-started": "회신 없음",
    "runner-reported": "runner 보고됨",
    "needs-evidence": "증거 필요",
    "needs-artifacts": "artifact 확인 필요",
    accepted: "수락",
    blocked: "차단"
  });
}

function jaEngineeringExecutionReceiptStatus(status: string) {
  return engineeringLabel(status, {
    "not-run": "未実行",
    reported: "報告あり",
    "needs-evidence": "証拠不足",
    "needs-artifacts": "Artifact不足",
    accepted: "受理",
    blocked: "停止"
  });
}

function enEngineeringExecutionReceiptStatus(status: string) {
  return engineeringLabel(status, {
    "not-run": "not run",
    reported: "reported",
    "needs-evidence": "needs evidence",
    "needs-artifacts": "needs artifacts",
    accepted: "accepted",
    blocked: "blocked"
  });
}

function zhHansEngineeringExecutionReceiptStatus(status: string) {
  return engineeringLabel(status, {
    "not-run": "未运行",
    reported: "已报告",
    "needs-evidence": "缺证据",
    "needs-artifacts": "缺工件",
    accepted: "已接受",
    blocked: "已阻止"
  });
}

function zhHantEngineeringExecutionReceiptStatus(status: string) {
  return engineeringLabel(status, {
    "not-run": "未執行",
    reported: "已報告",
    "needs-evidence": "缺證據",
    "needs-artifacts": "缺工件",
    accepted: "已接受",
    blocked: "已阻止"
  });
}

function koEngineeringExecutionReceiptStatus(status: string) {
  return engineeringLabel(status, {
    "not-run": "미실행",
    reported: "보고됨",
    "needs-evidence": "증거 필요",
    "needs-artifacts": "artifact 필요",
    accepted: "수락",
    blocked: "차단"
  });
}

function jaEngineeringMacRunnerDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "入力待ち",
    "code-ready": "コード工程準備",
    "approval-required": "承認待ち",
    "runtime-needed": "Mac runtime 必要",
    "evidence-ready": "証拠受理済み"
  });
}

function enEngineeringMacRunnerDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "needs mission",
    "code-ready": "code ready",
    "approval-required": "approval required",
    "runtime-needed": "runtime needed",
    "evidence-ready": "evidence ready"
  });
}

function zhHansEngineeringMacRunnerDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "等待输入",
    "code-ready": "代码工程就绪",
    "approval-required": "需要审批",
    "runtime-needed": "需要 Mac runtime",
    "evidence-ready": "证据已接受"
  });
}

function zhHantEngineeringMacRunnerDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "等待輸入",
    "code-ready": "程式工程就緒",
    "approval-required": "需要審批",
    "runtime-needed": "需要 Mac runtime",
    "evidence-ready": "證據已接受"
  });
}

function koEngineeringMacRunnerDecision(decision: string) {
  return engineeringLabel(decision, {
    "needs-mission": "미션 필요",
    "code-ready": "코드 준비",
    "approval-required": "승인 필요",
    "runtime-needed": "Mac runtime 필요",
    "evidence-ready": "증거 수락됨"
  });
}

function jaEngineeringMacRunnerCapability(capability: string) {
  return engineeringLabel(capability, macRunnerCapabilityLabels("ja"));
}

function enEngineeringMacRunnerCapability(capability: string) {
  return engineeringLabel(capability, macRunnerCapabilityLabels("en"));
}

function zhHansEngineeringMacRunnerCapability(capability: string) {
  return engineeringLabel(capability, macRunnerCapabilityLabels("zh-Hans"));
}

function zhHantEngineeringMacRunnerCapability(capability: string) {
  return engineeringLabel(capability, macRunnerCapabilityLabels("zh-Hant"));
}

function koEngineeringMacRunnerCapability(capability: string) {
  return engineeringLabel(capability, macRunnerCapabilityLabels("ko"));
}

function jaEngineeringMacRunnerCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "ready",
    planned: "準備可",
    "approval-required": "承認必要",
    "needs-runtime": "runtime必要",
    blocked: "停止",
    "not-requested": "未要求"
  });
}

function enEngineeringMacRunnerCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "ready",
    planned: "planned",
    "approval-required": "approval",
    "needs-runtime": "needs runtime",
    blocked: "blocked",
    "not-requested": "not requested"
  });
}

function zhHansEngineeringMacRunnerCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "就绪",
    planned: "可准备",
    "approval-required": "需审批",
    "needs-runtime": "缺 runtime",
    blocked: "阻止",
    "not-requested": "未请求"
  });
}

function zhHantEngineeringMacRunnerCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "就緒",
    planned: "可準備",
    "approval-required": "需審批",
    "needs-runtime": "缺 runtime",
    blocked: "阻止",
    "not-requested": "未請求"
  });
}

function koEngineeringMacRunnerCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "준비됨",
    planned: "준비 가능",
    "approval-required": "승인 필요",
    "needs-runtime": "runtime 필요",
    blocked: "차단",
    "not-requested": "요청 없음"
  });
}

function jaEngineeringMacRunnerPermission(permission: string) {
  return engineeringLabel(permission, macRunnerPermissionLabels("ja"));
}

function enEngineeringMacRunnerPermission(permission: string) {
  return engineeringLabel(permission, macRunnerPermissionLabels("en"));
}

function zhHansEngineeringMacRunnerPermission(permission: string) {
  return engineeringLabel(permission, macRunnerPermissionLabels("zh-Hans"));
}

function zhHantEngineeringMacRunnerPermission(permission: string) {
  return engineeringLabel(permission, macRunnerPermissionLabels("zh-Hant"));
}

function koEngineeringMacRunnerPermission(permission: string) {
  return engineeringLabel(permission, macRunnerPermissionLabels("ko"));
}

function jaEngineeringMacRunnerPermissionStatus(status: string) {
  return engineeringLabel(status, {
    "granted-by-policy": "方針内",
    "ask-before-use": "使用前確認",
    "not-requested": "未要求",
    "denied-by-default": "既定拒否",
    missing: "不足"
  });
}

function enEngineeringMacRunnerPermissionStatus(status: string) {
  return engineeringLabel(status, {
    "granted-by-policy": "policy granted",
    "ask-before-use": "ask first",
    "not-requested": "not requested",
    "denied-by-default": "denied by default",
    missing: "missing"
  });
}

function zhHansEngineeringMacRunnerPermissionStatus(status: string) {
  return engineeringLabel(status, {
    "granted-by-policy": "策略内允许",
    "ask-before-use": "使用前确认",
    "not-requested": "未请求",
    "denied-by-default": "默认拒绝",
    missing: "缺失"
  });
}

function zhHantEngineeringMacRunnerPermissionStatus(status: string) {
  return engineeringLabel(status, {
    "granted-by-policy": "策略內允許",
    "ask-before-use": "使用前確認",
    "not-requested": "未請求",
    "denied-by-default": "預設拒絕",
    missing: "缺失"
  });
}

function koEngineeringMacRunnerPermissionStatus(status: string) {
  return engineeringLabel(status, {
    "granted-by-policy": "정책 허용",
    "ask-before-use": "사용 전 확인",
    "not-requested": "요청 없음",
    "denied-by-default": "기본 거부",
    missing: "부족"
  });
}

function jaEngineeringMacRunnerAdapter(adapter: string) {
  return engineeringLabel(adapter, macRunnerAdapterLabels("ja"));
}

function enEngineeringMacRunnerAdapter(adapter: string) {
  return engineeringLabel(adapter, macRunnerAdapterLabels("en"));
}

function zhHansEngineeringMacRunnerAdapter(adapter: string) {
  return engineeringLabel(adapter, macRunnerAdapterLabels("zh-Hans"));
}

function zhHantEngineeringMacRunnerAdapter(adapter: string) {
  return engineeringLabel(adapter, macRunnerAdapterLabels("zh-Hant"));
}

function koEngineeringMacRunnerAdapter(adapter: string) {
  return engineeringLabel(adapter, macRunnerAdapterLabels("ko"));
}

function jaEngineeringMacRunnerAdapterStatus(status: string) {
  return engineeringLabel(status, {
    "available-now": "利用可",
    "paperwork-ready": "文書準備",
    "approval-required": "承認必要",
    "needs-runtime": "runtime必要",
    "denied-by-default": "既定拒否",
    "not-requested": "未要求"
  });
}

function enEngineeringMacRunnerAdapterStatus(status: string) {
  return engineeringLabel(status, {
    "available-now": "available",
    "paperwork-ready": "paperwork ready",
    "approval-required": "approval",
    "needs-runtime": "needs runtime",
    "denied-by-default": "denied",
    "not-requested": "not requested"
  });
}

function zhHansEngineeringMacRunnerAdapterStatus(status: string) {
  return engineeringLabel(status, {
    "available-now": "可用",
    "paperwork-ready": "文书就绪",
    "approval-required": "需审批",
    "needs-runtime": "缺 runtime",
    "denied-by-default": "默认拒绝",
    "not-requested": "未请求"
  });
}

function zhHantEngineeringMacRunnerAdapterStatus(status: string) {
  return engineeringLabel(status, {
    "available-now": "可用",
    "paperwork-ready": "文書就緒",
    "approval-required": "需審批",
    "needs-runtime": "缺 runtime",
    "denied-by-default": "預設拒絕",
    "not-requested": "未請求"
  });
}

function koEngineeringMacRunnerAdapterStatus(status: string) {
  return engineeringLabel(status, {
    "available-now": "사용 가능",
    "paperwork-ready": "문서 준비",
    "approval-required": "승인 필요",
    "needs-runtime": "runtime 필요",
    "denied-by-default": "기본 거부",
    "not-requested": "요청 없음"
  });
}

function jaEngineeringMacRunnerNextAction(action: string) {
  return engineeringLabel(action, {
    "write-mission": "工程タスク、対象リポジトリ、検証コマンド、承認境界を入力する。",
    "prepare-dispatch-package": "自己模擬を実行し、coding-agent dispatch package を準備する。",
    "approve-browser-profile": "ブラウザ自動化前に隔離プロファイルと URL 範囲を承認する。",
    "connect-mac-adapter": "Mac adapter を接続し、Accessibility、画面収録、Automation 範囲、action log、kill switch を承認する。",
    "allowlist-mcp-tools": "使用する MCP tool と引数を allowlist に入れる。",
    "approve-external-writes": "Git push、deploy、issue 作成、message send などを承認または削除する。",
    "run-or-import-receipts": "governed local runner を実行するか、receipt、transcript、diff、artifact を取り込む。",
    "review-accepted-evidence": "受理済み証拠を確認し、board 更新可否を判断する。"
  });
}

function enEngineeringMacRunnerNextAction(action: string) {
  return engineeringLabel(action, {
    "write-mission": "Write the engineering task, target repository, verification commands, and approval boundary.",
    "prepare-dispatch-package": "Run self-simulation and prepare the coding-agent dispatch package before execution.",
    "approve-browser-profile": "Approve an isolated browser profile and URL scope before browser automation.",
    "connect-mac-adapter": "Connect a governed Mac adapter, then approve Accessibility, Screen Recording, Automation scope, action logs, and kill switch.",
    "allowlist-mcp-tools": "Name each MCP tool and arguments in an allowlist before use.",
    "approve-external-writes": "Approve or remove Git push, deploy, issue creation, message sends, and other external writes.",
    "run-or-import-receipts": "Run the governed local runner or import completed receipts, transcripts, diffs, and artifacts.",
    "review-accepted-evidence": "Review the accepted evidence, then decide whether the board can be updated."
  });
}

function zhHansEngineeringMacRunnerNextAction(action: string) {
  return engineeringLabel(action, {
    "write-mission": "填写工程任务、目标仓库、验证命令和审批边界。",
    "prepare-dispatch-package": "先运行自己模拟，再准备 coding-agent dispatch package。",
    "approve-browser-profile": "浏览器自动化前先批准隔离 profile 和 URL 范围。",
    "connect-mac-adapter": "接入受治理的 Mac adapter，并批准辅助功能、屏幕录制、自动化范围、动作日志和 kill switch。",
    "allowlist-mcp-tools": "把每个 MCP tool 和参数写进 allowlist。",
    "approve-external-writes": "批准或移除 Git push、deploy、issue 创建、消息发送等外部写入。",
    "run-or-import-receipts": "运行受治理的本地 runner，或导入 receipt、transcript、diff 和 artifact。",
    "review-accepted-evidence": "审查已接受证据，再决定是否更新 board。"
  });
}

function zhHantEngineeringMacRunnerNextAction(action: string) {
  return engineeringLabel(action, {
    "write-mission": "填寫工程任務、目標倉庫、驗證命令和審批邊界。",
    "prepare-dispatch-package": "先執行自己模擬，再準備 coding-agent dispatch package。",
    "approve-browser-profile": "瀏覽器自動化前先批准隔離 profile 和 URL 範圍。",
    "connect-mac-adapter": "接入受治理的 Mac adapter，並批准輔助使用、螢幕錄製、自動化範圍、動作日誌和 kill switch。",
    "allowlist-mcp-tools": "把每個 MCP tool 和參數寫進 allowlist。",
    "approve-external-writes": "批准或移除 Git push、deploy、issue 建立、訊息傳送等外部寫入。",
    "run-or-import-receipts": "執行受治理的本地 runner，或匯入 receipt、transcript、diff 和 artifact。",
    "review-accepted-evidence": "審查已接受證據，再決定是否更新 board。"
  });
}

function koEngineeringMacRunnerNextAction(action: string) {
  return engineeringLabel(action, {
    "write-mission": "엔지니어링 작업, 대상 저장소, 검증 명령, 승인 경계를 작성합니다.",
    "prepare-dispatch-package": "실행 전에 자체 시뮬레이션을 실행하고 coding-agent dispatch package를 준비합니다.",
    "approve-browser-profile": "브라우저 자동화 전에 격리 profile과 URL 범위를 승인합니다.",
    "connect-mac-adapter": "통제된 Mac adapter를 연결하고 손쉬운 사용, 화면 기록, 자동화 범위, action log, kill switch를 승인합니다.",
    "allowlist-mcp-tools": "각 MCP tool과 인자를 allowlist에 명시합니다.",
    "approve-external-writes": "Git push, deploy, issue 생성, 메시지 전송 등 외부 쓰기를 승인하거나 제거합니다.",
    "run-or-import-receipts": "통제된 로컬 runner를 실행하거나 receipt, transcript, diff, artifact를 가져옵니다.",
    "review-accepted-evidence": "수락된 증거를 검토한 뒤 board 업데이트 여부를 결정합니다."
  });
}

function jaEngineeringMacRunnerContractDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-requested": "未要求",
    "draft-ready": "contract 草案",
    "approval-required": "承認必要",
    "runtime-needed": "runtime必要",
    blocked: "停止"
  });
}

function enEngineeringMacRunnerContractDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-requested": "not requested",
    "draft-ready": "draft ready",
    "approval-required": "approval required",
    "runtime-needed": "runtime needed",
    blocked: "blocked"
  });
}

function zhHansEngineeringMacRunnerContractDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-requested": "未请求",
    "draft-ready": "合约草案就绪",
    "approval-required": "需要审批",
    "runtime-needed": "需要 runtime",
    blocked: "已阻止"
  });
}

function zhHantEngineeringMacRunnerContractDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-requested": "未請求",
    "draft-ready": "合約草案就緒",
    "approval-required": "需要審批",
    "runtime-needed": "需要 runtime",
    blocked: "已阻止"
  });
}

function koEngineeringMacRunnerContractDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-requested": "요청 없음",
    "draft-ready": "contract 초안",
    "approval-required": "승인 필요",
    "runtime-needed": "runtime 필요",
    blocked: "차단"
  });
}

function jaEngineeringMacRunnerContractAction(action: string) {
  return engineeringLabel(action, macRunnerContractActionLabels("ja"));
}

function enEngineeringMacRunnerContractAction(action: string) {
  return engineeringLabel(action, macRunnerContractActionLabels("en"));
}

function zhHansEngineeringMacRunnerContractAction(action: string) {
  return engineeringLabel(action, macRunnerContractActionLabels("zh-Hans"));
}

function zhHantEngineeringMacRunnerContractAction(action: string) {
  return engineeringLabel(action, macRunnerContractActionLabels("zh-Hant"));
}

function koEngineeringMacRunnerContractAction(action: string) {
  return engineeringLabel(action, macRunnerContractActionLabels("ko"));
}

function jaEngineeringMacRunnerContractActionStatus(status: string) {
  return engineeringLabel(status, {
    "ready-for-approval": "承認待ち",
    "needs-runtime": "runtime必要",
    blocked: "停止",
    "not-requested": "未要求"
  });
}

function enEngineeringMacRunnerContractActionStatus(status: string) {
  return engineeringLabel(status, {
    "ready-for-approval": "ready for approval",
    "needs-runtime": "needs runtime",
    blocked: "blocked",
    "not-requested": "not requested"
  });
}

function zhHansEngineeringMacRunnerContractActionStatus(status: string) {
  return engineeringLabel(status, {
    "ready-for-approval": "等待审批",
    "needs-runtime": "缺 runtime",
    blocked: "阻止",
    "not-requested": "未请求"
  });
}

function zhHantEngineeringMacRunnerContractActionStatus(status: string) {
  return engineeringLabel(status, {
    "ready-for-approval": "等待審批",
    "needs-runtime": "缺 runtime",
    blocked: "阻止",
    "not-requested": "未請求"
  });
}

function koEngineeringMacRunnerContractActionStatus(status: string) {
  return engineeringLabel(status, {
    "ready-for-approval": "승인 대기",
    "needs-runtime": "runtime 필요",
    blocked: "차단",
    "not-requested": "요청 없음"
  });
}

function jaEngineeringMacRunnerContractCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通過",
    warn: "注意",
    block: "停止"
  });
}

function enEngineeringMacRunnerContractCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "pass",
    warn: "warn",
    block: "block"
  });
}

function zhHansEngineeringMacRunnerContractCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通过",
    warn: "注意",
    block: "阻止"
  });
}

function zhHantEngineeringMacRunnerContractCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通過",
    warn: "注意",
    block: "阻止"
  });
}

function koEngineeringMacRunnerContractCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "통과",
    warn: "주의",
    block: "차단"
  });
}

function jaEngineeringMacRunnerContractDeniedAction(action: string) {
  return engineeringLabel(action, macRunnerContractDeniedLabels("ja"));
}

function enEngineeringMacRunnerContractDeniedAction(action: string) {
  return engineeringLabel(action, macRunnerContractDeniedLabels("en"));
}

function zhHansEngineeringMacRunnerContractDeniedAction(action: string) {
  return engineeringLabel(action, macRunnerContractDeniedLabels("zh-Hans"));
}

function zhHantEngineeringMacRunnerContractDeniedAction(action: string) {
  return engineeringLabel(action, macRunnerContractDeniedLabels("zh-Hant"));
}

function koEngineeringMacRunnerContractDeniedAction(action: string) {
  return engineeringLabel(action, macRunnerContractDeniedLabels("ko"));
}

function jaEngineeringMacRunnerContractInstruction(instruction: string) {
  return engineeringLabel(instruction, macRunnerContractInstructionLabels("ja"));
}

function enEngineeringMacRunnerContractInstruction(instruction: string) {
  return engineeringLabel(instruction, macRunnerContractInstructionLabels("en"));
}

function zhHansEngineeringMacRunnerContractInstruction(instruction: string) {
  return engineeringLabel(instruction, macRunnerContractInstructionLabels("zh-Hans"));
}

function zhHantEngineeringMacRunnerContractInstruction(instruction: string) {
  return engineeringLabel(instruction, macRunnerContractInstructionLabels("zh-Hant"));
}

function koEngineeringMacRunnerContractInstruction(instruction: string) {
  return engineeringLabel(instruction, macRunnerContractInstructionLabels("ko"));
}

function macRunnerContractDeniedLabels(locale: SupportedLocale) {
  const labels = {
    ja: {
      "host-secrets": "ホスト秘密情報、keychain、cookie、raw env を読まない",
      "out-of-scope-control": "承認範囲外の app、URL、window、screen を操作しない",
      "bypass-evidence": "action log、receipt、redaction、artifact audit を省略しない",
      "kill-switch-bypass": "kill switch 後、または証拠保存失敗後に続行しない",
      "unapproved-external-write": "未承認の Git push、deploy、issue、message、purchase を行わない"
    },
    en: {
      "host-secrets": "Do not read host secrets, keychain items, cookies, or raw env.",
      "out-of-scope-control": "Do not control apps, URLs, windows, or screens outside approval scope.",
      "bypass-evidence": "Do not bypass action logs, receipts, redaction, or artifact audit.",
      "kill-switch-bypass": "Do not continue after kill switch or evidence write failure.",
      "unapproved-external-write": "Do not perform unapproved Git push, deploy, issue, message, or purchase."
    },
    "zh-Hans": {
      "host-secrets": "不得读取主机秘密、keychain、cookie 或原始环境变量",
      "out-of-scope-control": "不得控制审批范围外的 app、URL、窗口或屏幕",
      "bypass-evidence": "不得跳过动作日志、收据、脱敏报告或工件审计",
      "kill-switch-bypass": "kill switch 触发或证据写入失败后不得继续",
      "unapproved-external-write": "不得执行未审批的 Git push、deploy、issue、消息或购买"
    },
    "zh-Hant": {
      "host-secrets": "不得讀取主機秘密、keychain、cookie 或原始環境變數",
      "out-of-scope-control": "不得控制審批範圍外的 app、URL、視窗或螢幕",
      "bypass-evidence": "不得跳過動作日誌、收據、脫敏報告或工件稽核",
      "kill-switch-bypass": "kill switch 觸發或證據寫入失敗後不得繼續",
      "unapproved-external-write": "不得執行未審批的 Git push、deploy、issue、訊息或購買"
    },
    ko: {
      "host-secrets": "호스트 비밀값, keychain, cookie, raw env를 읽지 않습니다",
      "out-of-scope-control": "승인 범위 밖의 app, URL, window, screen을 제어하지 않습니다",
      "bypass-evidence": "action log, receipt, redaction, artifact audit를 건너뛰지 않습니다",
      "kill-switch-bypass": "kill switch 또는 증거 쓰기 실패 뒤 계속하지 않습니다",
      "unapproved-external-write": "승인 없는 Git push, deploy, issue, message, purchase를 실행하지 않습니다"
    }
  };
  return labels[locale];
}

function macRunnerContractInstructionLabels(locale: SupportedLocale) {
  const labels = {
    ja: {
      "do-not-start": "この mission は Mac 操作を要求していないため adapter を開始しない。",
      "audit-only": "contract は監査文脈として保持するだけにする。",
      "require-approval": "ask-before-use 権限の exact approval record がそろうまで実行しない。",
      "load-scoped-runtime": "承認済み adapter runtime と target app/URL scope だけを読み込む。",
      "write-evidence": "action log、screenshot、receipt、redaction report を action prefix 配下へ保存する。",
      "return-receipt": "完了 receipt または refusal を返し、この草案だけで成功主張しない。",
      "stop-on-risk": "kill switch、credential prompt、host secret、未承認外部書き込み、証拠保存失敗で即停止する。"
    },
    en: {
      "do-not-start": "Do not start a Mac adapter; this mission did not request Mac control.",
      "audit-only": "Keep this contract for audit context only.",
      "require-approval": "Do not execute until all ask-before-use permissions have exact approval records.",
      "load-scoped-runtime": "Load only the approved adapter runtime and target app or URL scope.",
      "write-evidence": "Write action logs, screenshots, receipts, and redaction reports under the action prefix.",
      "return-receipt": "Return a completed receipt or refusal; never claim success from this draft alone.",
      "stop-on-risk": "Stop on kill switch, credential prompt, host secret, unapproved external write, or evidence failure."
    },
    "zh-Hans": {
      "do-not-start": "本任务未请求 Mac 控制，不启动 Mac adapter。",
      "audit-only": "该合约只作为审计上下文保留。",
      "require-approval": "所有使用前确认权限都有精确审批记录前不得执行。",
      "load-scoped-runtime": "只加载已批准的 adapter runtime 和目标 app/URL 范围。",
      "write-evidence": "把动作日志、截图、收据和脱敏报告写到 action prefix 下。",
      "return-receipt": "返回完成收据或拒绝收据，不能只靠草案声称成功。",
      "stop-on-risk": "遇到 kill switch、凭证提示、主机秘密、未审批外部写入或证据失败立即停止。"
    },
    "zh-Hant": {
      "do-not-start": "本任務未請求 Mac 控制，不啟動 Mac adapter。",
      "audit-only": "該合約只作為稽核上下文保留。",
      "require-approval": "所有使用前確認權限都有精確審批記錄前不得執行。",
      "load-scoped-runtime": "只載入已批准的 adapter runtime 和目標 app/URL 範圍。",
      "write-evidence": "把動作日誌、截圖、收據和脫敏報告寫到 action prefix 下。",
      "return-receipt": "返回完成收據或拒絕收據，不能只靠草案聲稱成功。",
      "stop-on-risk": "遇到 kill switch、憑證提示、主機秘密、未審批外部寫入或證據失敗立即停止。"
    },
    ko: {
      "do-not-start": "이 미션은 Mac 제어를 요청하지 않았으므로 Mac adapter를 시작하지 않습니다.",
      "audit-only": "이 contract는 감사 맥락으로만 보관합니다.",
      "require-approval": "ask-before-use 권한의 정확한 승인 기록이 있기 전에는 실행하지 않습니다.",
      "load-scoped-runtime": "승인된 adapter runtime과 대상 app/URL scope만 로드합니다.",
      "write-evidence": "action log, screenshot, receipt, redaction report를 action prefix 아래에 씁니다.",
      "return-receipt": "완료 receipt 또는 refusal을 반환하고 초안만으로 성공을 주장하지 않습니다.",
      "stop-on-risk": "kill switch, credential prompt, host secret, 미승인 외부 쓰기, 증거 실패 시 즉시 중지합니다."
    }
  };
  return labels[locale];
}

function macRunnerContractActionLabels(locale: SupportedLocale) {
  const labels = {
    ja: {
      "observe-screen": "画面観察",
      click: "クリック",
      "type-text": "テキスト入力",
      "press-hotkey": "ホットキー",
      "focus-app": "App フォーカス",
      "move-window": "ウィンドウ移動",
      "clipboard-read": "クリップボード読取",
      "clipboard-write": "クリップボード書込",
      "browser-open-url": "URL を開く",
      "external-write": "外部書き込み"
    },
    en: {
      "observe-screen": "observe screen",
      click: "click",
      "type-text": "type text",
      "press-hotkey": "press hotkey",
      "focus-app": "focus app",
      "move-window": "move window",
      "clipboard-read": "clipboard read",
      "clipboard-write": "clipboard write",
      "browser-open-url": "open URL",
      "external-write": "external write"
    },
    "zh-Hans": {
      "observe-screen": "观察屏幕",
      click: "点击",
      "type-text": "输入文本",
      "press-hotkey": "快捷键",
      "focus-app": "聚焦 App",
      "move-window": "移动窗口",
      "clipboard-read": "读取剪贴板",
      "clipboard-write": "写入剪贴板",
      "browser-open-url": "打开 URL",
      "external-write": "外部写入"
    },
    "zh-Hant": {
      "observe-screen": "觀察螢幕",
      click: "點擊",
      "type-text": "輸入文字",
      "press-hotkey": "快捷鍵",
      "focus-app": "聚焦 App",
      "move-window": "移動視窗",
      "clipboard-read": "讀取剪貼簿",
      "clipboard-write": "寫入剪貼簿",
      "browser-open-url": "打開 URL",
      "external-write": "外部寫入"
    },
    ko: {
      "observe-screen": "화면 관찰",
      click: "클릭",
      "type-text": "텍스트 입력",
      "press-hotkey": "단축키",
      "focus-app": "앱 focus",
      "move-window": "window 이동",
      "clipboard-read": "클립보드 읽기",
      "clipboard-write": "클립보드 쓰기",
      "browser-open-url": "URL 열기",
      "external-write": "외부 쓰기"
    }
  };
  return labels[locale];
}

function macRunnerCapabilityLabels(locale: SupportedLocale) {
  const labels = {
    ja: {
      "repo-coding": "リポジトリ実装",
      "allowlisted-shell": "許可済み shell",
      "browser-automation": "ブラウザ操作",
      "screen-observation": "画面観察",
      "keyboard-mouse": "キーボード/マウス",
      "app-window-control": "App/window 操作",
      clipboard: "クリップボード",
      "mcp-tools": "MCP ツール",
      "external-writes": "外部書き込み"
    },
    en: {
      "repo-coding": "repo coding",
      "allowlisted-shell": "allowlisted shell",
      "browser-automation": "browser automation",
      "screen-observation": "screen observation",
      "keyboard-mouse": "keyboard/mouse",
      "app-window-control": "app/window control",
      clipboard: "clipboard",
      "mcp-tools": "MCP tools",
      "external-writes": "external writes"
    },
    "zh-Hans": {
      "repo-coding": "仓库编程",
      "allowlisted-shell": "允许 shell",
      "browser-automation": "浏览器自动化",
      "screen-observation": "屏幕观察",
      "keyboard-mouse": "键盘/鼠标",
      "app-window-control": "App/window 控制",
      clipboard: "剪贴板",
      "mcp-tools": "MCP 工具",
      "external-writes": "外部写入"
    },
    "zh-Hant": {
      "repo-coding": "倉庫編程",
      "allowlisted-shell": "允許 shell",
      "browser-automation": "瀏覽器自動化",
      "screen-observation": "螢幕觀察",
      "keyboard-mouse": "鍵盤/滑鼠",
      "app-window-control": "App/window 控制",
      clipboard: "剪貼簿",
      "mcp-tools": "MCP 工具",
      "external-writes": "外部寫入"
    },
    ko: {
      "repo-coding": "저장소 코딩",
      "allowlisted-shell": "허용 shell",
      "browser-automation": "브라우저 자동화",
      "screen-observation": "화면 관찰",
      "keyboard-mouse": "키보드/마우스",
      "app-window-control": "앱/window 제어",
      clipboard: "클립보드",
      "mcp-tools": "MCP 도구",
      "external-writes": "외부 쓰기"
    }
  };
  return labels[locale];
}

function macRunnerPermissionLabels(locale: SupportedLocale) {
  const labels = {
    ja: {
      "repo-worktree": "Repo worktree",
      "output-directory": "output/ 証拠",
      "shell-allowlist": "Shell allowlist",
      "browser-profile": "隔離ブラウザ",
      "mac-accessibility": "Accessibility",
      "mac-screen-recording": "画面収録",
      "mac-automation": "Automation",
      "mcp-allowlist": "MCP allowlist",
      "external-write-approval": "外部書き込み承認",
      "host-secrets": "ホスト秘密情報"
    },
    en: {
      "repo-worktree": "repo worktree",
      "output-directory": "output/ evidence",
      "shell-allowlist": "shell allowlist",
      "browser-profile": "isolated browser",
      "mac-accessibility": "Accessibility",
      "mac-screen-recording": "Screen Recording",
      "mac-automation": "Automation",
      "mcp-allowlist": "MCP allowlist",
      "external-write-approval": "external write approval",
      "host-secrets": "host secrets"
    },
    "zh-Hans": {
      "repo-worktree": "仓库 worktree",
      "output-directory": "output/ 证据",
      "shell-allowlist": "Shell 白名单",
      "browser-profile": "隔离浏览器",
      "mac-accessibility": "辅助功能",
      "mac-screen-recording": "屏幕录制",
      "mac-automation": "自动化",
      "mcp-allowlist": "MCP 白名单",
      "external-write-approval": "外部写入审批",
      "host-secrets": "主机秘密"
    },
    "zh-Hant": {
      "repo-worktree": "倉庫 worktree",
      "output-directory": "output/ 證據",
      "shell-allowlist": "Shell 白名單",
      "browser-profile": "隔離瀏覽器",
      "mac-accessibility": "輔助使用",
      "mac-screen-recording": "螢幕錄製",
      "mac-automation": "自動化",
      "mcp-allowlist": "MCP 白名單",
      "external-write-approval": "外部寫入審批",
      "host-secrets": "主機秘密"
    },
    ko: {
      "repo-worktree": "저장소 worktree",
      "output-directory": "output/ 증거",
      "shell-allowlist": "Shell allowlist",
      "browser-profile": "격리 브라우저",
      "mac-accessibility": "손쉬운 사용",
      "mac-screen-recording": "화면 기록",
      "mac-automation": "자동화",
      "mcp-allowlist": "MCP allowlist",
      "external-write-approval": "외부 쓰기 승인",
      "host-secrets": "호스트 비밀값"
    }
  };
  return labels[locale];
}

function macRunnerAdapterLabels(locale: SupportedLocale) {
  const labels = {
    ja: {
      "codex-style-coding-agent": "Codex/OpenHands型 coding agent",
      "browser-profile-runner": "browser-use/Playwright runner",
      "hammerspoon-adapter": "Hammerspoon adapter",
      "openclaw-style-desktop": "OpenClaw型 desktop",
      "mcp-tool-runner": "MCP runner",
      "external-write-gateway": "外部書き込み gateway"
    },
    en: {
      "codex-style-coding-agent": "Codex/OpenHands-style coding agent",
      "browser-profile-runner": "browser-use/Playwright runner",
      "hammerspoon-adapter": "Hammerspoon adapter",
      "openclaw-style-desktop": "OpenClaw-style desktop",
      "mcp-tool-runner": "MCP runner",
      "external-write-gateway": "external write gateway"
    },
    "zh-Hans": {
      "codex-style-coding-agent": "Codex/OpenHands 式编程代理",
      "browser-profile-runner": "browser-use/Playwright runner",
      "hammerspoon-adapter": "Hammerspoon 适配器",
      "openclaw-style-desktop": "OpenClaw 式桌面",
      "mcp-tool-runner": "MCP runner",
      "external-write-gateway": "外部写入网关"
    },
    "zh-Hant": {
      "codex-style-coding-agent": "Codex/OpenHands 式編程代理",
      "browser-profile-runner": "browser-use/Playwright runner",
      "hammerspoon-adapter": "Hammerspoon 適配器",
      "openclaw-style-desktop": "OpenClaw 式桌面",
      "mcp-tool-runner": "MCP runner",
      "external-write-gateway": "外部寫入閘道"
    },
    ko: {
      "codex-style-coding-agent": "Codex/OpenHands식 코딩 agent",
      "browser-profile-runner": "browser-use/Playwright runner",
      "hammerspoon-adapter": "Hammerspoon adapter",
      "openclaw-style-desktop": "OpenClaw식 desktop",
      "mcp-tool-runner": "MCP runner",
      "external-write-gateway": "외부 쓰기 gateway"
    }
  };
  return labels[locale];
}

function jaEngineeringHandoffDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-ready": "未準備",
    "agent-pack-ready": "Agent 引き渡し可",
    "approval-gated": "承認ゲートあり",
    "evidence-review": "証拠レビュー"
  });
}

function enEngineeringHandoffDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-ready": "not ready",
    "agent-pack-ready": "agent pack ready",
    "approval-gated": "approval gated",
    "evidence-review": "evidence review"
  });
}

function zhHansEngineeringHandoffDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-ready": "未就绪",
    "agent-pack-ready": "Agent 包就绪",
    "approval-gated": "审批闸门",
    "evidence-review": "证据审查"
  });
}

function zhHantEngineeringHandoffDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-ready": "未就緒",
    "agent-pack-ready": "Agent 包就緒",
    "approval-gated": "審批閘門",
    "evidence-review": "證據審查"
  });
}

function koEngineeringHandoffDecision(decision: string) {
  return engineeringLabel(decision, {
    "not-ready": "미준비",
    "agent-pack-ready": "agent pack 준비됨",
    "approval-gated": "승인 게이트",
    "evidence-review": "증거 검토"
  });
}

function jaEngineeringHandoffLane(lane: string) {
  return engineeringLabel(lane, {
    supervision: "監督",
    "coding-agent": "Coding agent",
    runner: "Runner",
    approval: "承認",
    evidence: "証拠"
  });
}

function enEngineeringHandoffLane(lane: string) {
  return engineeringLabel(lane, {
    supervision: "supervision",
    "coding-agent": "coding agent",
    runner: "runner",
    approval: "approval",
    evidence: "evidence"
  });
}

function zhHansEngineeringHandoffLane(lane: string) {
  return engineeringLabel(lane, {
    supervision: "监督",
    "coding-agent": "编程代理",
    runner: "Runner",
    approval: "审批",
    evidence: "证据"
  });
}

function zhHantEngineeringHandoffLane(lane: string) {
  return engineeringLabel(lane, {
    supervision: "監督",
    "coding-agent": "編程代理",
    runner: "Runner",
    approval: "審批",
    evidence: "證據"
  });
}

function koEngineeringHandoffLane(lane: string) {
  return engineeringLabel(lane, {
    supervision: "감독",
    "coding-agent": "코딩 에이전트",
    runner: "Runner",
    approval: "승인",
    evidence: "증거"
  });
}

function jaEngineeringHandoffLaneStatus(status: string) {
  return engineeringLabel(status, {
    ready: "準備済み",
    waiting: "待機",
    "approval-required": "承認必要",
    blocked: "停止"
  });
}

function enEngineeringHandoffLaneStatus(status: string) {
  return engineeringLabel(status, {
    ready: "ready",
    waiting: "waiting",
    "approval-required": "approval",
    blocked: "blocked"
  });
}

function zhHansEngineeringHandoffLaneStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已准备",
    waiting: "等待",
    "approval-required": "需审批",
    blocked: "已阻止"
  });
}

function zhHantEngineeringHandoffLaneStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已準備",
    waiting: "等待",
    "approval-required": "需審批",
    blocked: "已阻止"
  });
}

function koEngineeringHandoffLaneStatus(status: string) {
  return engineeringLabel(status, {
    ready: "준비됨",
    waiting: "대기",
    "approval-required": "승인 필요",
    blocked: "차단"
  });
}

function jaEngineeringCompletionGateDecision(decision: string) {
  return engineeringLabel(decision, {
    "simulation-only": "模擬のみ",
    "evidence-ready": "証拠あり",
    "needs-evidence": "証拠不足",
    blocked: "停止"
  });
}

function enEngineeringCompletionGateDecision(decision: string) {
  return engineeringLabel(decision, {
    "simulation-only": "simulation only",
    "evidence-ready": "evidence ready",
    "needs-evidence": "needs evidence",
    blocked: "blocked"
  });
}

function zhHansEngineeringCompletionGateDecision(decision: string) {
  return engineeringLabel(decision, {
    "simulation-only": "仅模拟",
    "evidence-ready": "证据就绪",
    "needs-evidence": "缺少证据",
    blocked: "已阻止"
  });
}

function zhHantEngineeringCompletionGateDecision(decision: string) {
  return engineeringLabel(decision, {
    "simulation-only": "僅模擬",
    "evidence-ready": "證據就緒",
    "needs-evidence": "缺少證據",
    blocked: "已阻止"
  });
}

function koEngineeringCompletionGateDecision(decision: string) {
  return engineeringLabel(decision, {
    "simulation-only": "시뮬레이션만",
    "evidence-ready": "증거 준비됨",
    "needs-evidence": "증거 부족",
    blocked: "차단"
  });
}

function jaEngineeringCompletionGateCheck(check: string) {
  return engineeringLabel(check, {
    "real-run-report": "実行報告",
    "changed-files": "変更要約",
    "command-transcripts": "Transcript",
    "evidence-artifacts": "証拠",
    "command-results": "コマンド結果",
    "approval-boundary": "承認境界"
  });
}

function enEngineeringCompletionGateCheck(check: string) {
  return engineeringLabel(check, {
    "real-run-report": "run report",
    "changed-files": "changed files",
    "command-transcripts": "transcripts",
    "evidence-artifacts": "evidence",
    "command-results": "command results",
    "approval-boundary": "approval boundary"
  });
}

function zhHansEngineeringCompletionGateCheck(check: string) {
  return engineeringLabel(check, {
    "real-run-report": "运行报告",
    "changed-files": "改动摘要",
    "command-transcripts": "命令记录",
    "evidence-artifacts": "证据工件",
    "command-results": "命令结果",
    "approval-boundary": "审批边界"
  });
}

function zhHantEngineeringCompletionGateCheck(check: string) {
  return engineeringLabel(check, {
    "real-run-report": "執行報告",
    "changed-files": "改動摘要",
    "command-transcripts": "命令紀錄",
    "evidence-artifacts": "證據工件",
    "command-results": "命令結果",
    "approval-boundary": "審批邊界"
  });
}

function koEngineeringCompletionGateCheck(check: string) {
  return engineeringLabel(check, {
    "real-run-report": "실행 보고",
    "changed-files": "변경 요약",
    "command-transcripts": "명령 기록",
    "evidence-artifacts": "증거",
    "command-results": "명령 결과",
    "approval-boundary": "승인 경계"
  });
}

function jaEngineeringCompletionGateCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通過",
    warn: "注意",
    block: "不足"
  });
}

function enEngineeringCompletionGateCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "pass",
    warn: "warn",
    block: "missing"
  });
}

function zhHansEngineeringCompletionGateCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通过",
    warn: "注意",
    block: "缺失"
  });
}

function zhHantEngineeringCompletionGateCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "通過",
    warn: "注意",
    block: "缺失"
  });
}

function koEngineeringCompletionGateCheckStatus(status: string) {
  return engineeringLabel(status, {
    pass: "통과",
    warn: "주의",
    block: "부족"
  });
}

function jaEngineeringCapability(capability: string) {
  return engineeringLabel(capability, {
    "repo-files": "リポジトリ内ファイル",
    "output-evidence": "証拠保存",
    "allowlisted-shell": "許可済み shell",
    "git-read": "Git 読み取り",
    "browser-profile": "隔離ブラウザ",
    "mac-accessibility": "Accessibility",
    "mac-screen-recording": "画面収録",
    "mcp-allowlist": "MCP allowlist",
    "human-approval": "人間承認",
    "external-write-approval": "外部書き込み承認"
  });
}

function enEngineeringCapability(capability: string) {
  return engineeringLabel(capability, {
    "repo-files": "repo files",
    "output-evidence": "evidence output",
    "allowlisted-shell": "allowlisted shell",
    "git-read": "Git read",
    "browser-profile": "isolated browser",
    "mac-accessibility": "Accessibility",
    "mac-screen-recording": "Screen Recording",
    "mcp-allowlist": "MCP allowlist",
    "human-approval": "human approval",
    "external-write-approval": "external write approval"
  });
}

function zhHansEngineeringCapability(capability: string) {
  return engineeringLabel(capability, {
    "repo-files": "仓库文件",
    "output-evidence": "证据输出",
    "allowlisted-shell": "允许的 shell",
    "git-read": "Git 只读",
    "browser-profile": "隔离浏览器",
    "mac-accessibility": "辅助功能权限",
    "mac-screen-recording": "屏幕录制权限",
    "mcp-allowlist": "MCP 白名单",
    "human-approval": "人类审批",
    "external-write-approval": "外部写入审批"
  });
}

function zhHantEngineeringCapability(capability: string) {
  return engineeringLabel(capability, {
    "repo-files": "倉庫檔案",
    "output-evidence": "證據輸出",
    "allowlisted-shell": "允許的 shell",
    "git-read": "Git 唯讀",
    "browser-profile": "隔離瀏覽器",
    "mac-accessibility": "輔助使用權限",
    "mac-screen-recording": "螢幕錄製權限",
    "mcp-allowlist": "MCP 白名單",
    "human-approval": "人類審批",
    "external-write-approval": "外部寫入審批"
  });
}

function koEngineeringCapability(capability: string) {
  return engineeringLabel(capability, {
    "repo-files": "저장소 파일",
    "output-evidence": "증거 출력",
    "allowlisted-shell": "허용된 shell",
    "git-read": "Git 읽기",
    "browser-profile": "격리 브라우저",
    "mac-accessibility": "손쉬운 사용",
    "mac-screen-recording": "화면 기록",
    "mcp-allowlist": "MCP 허용 목록",
    "human-approval": "인간 승인",
    "external-write-approval": "외부 쓰기 승인"
  });
}

function jaEngineeringCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "準備済み",
    needed: "必要",
    "approval-required": "承認必要",
    blocked: "停止"
  });
}

function enEngineeringCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "ready",
    needed: "needed",
    "approval-required": "approval",
    blocked: "blocked"
  });
}

function zhHansEngineeringCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已准备",
    needed: "需要",
    "approval-required": "需审批",
    blocked: "已阻止"
  });
}

function zhHantEngineeringCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "已準備",
    needed: "需要",
    "approval-required": "需審批",
    blocked: "已阻止"
  });
}

function koEngineeringCapabilityStatus(status: string) {
  return engineeringLabel(status, {
    ready: "준비됨",
    needed: "필요",
    "approval-required": "승인 필요",
    blocked: "차단"
  });
}

function jaEngineeringMissionDraftItem(item: string) {
  return engineeringLabel(item, {
    goal: "目的",
    "repo-target": "リポジトリ",
    "work-scope": "作業範囲",
    verification: "検証",
    "permission-boundary": "権限境界",
    "approval-boundary": "承認境界",
    evidence: "証拠"
  });
}

function enEngineeringMissionDraftItem(item: string) {
  return engineeringLabel(item, {
    goal: "goal",
    "repo-target": "repo target",
    "work-scope": "work scope",
    verification: "verification",
    "permission-boundary": "permission boundary",
    "approval-boundary": "approval boundary",
    evidence: "evidence"
  });
}

function zhHansEngineeringMissionDraftItem(item: string) {
  return engineeringLabel(item, {
    goal: "目标",
    "repo-target": "仓库目标",
    "work-scope": "工作范围",
    verification: "验证",
    "permission-boundary": "权限边界",
    "approval-boundary": "人审边界",
    evidence: "证据"
  });
}

function zhHantEngineeringMissionDraftItem(item: string) {
  return engineeringLabel(item, {
    goal: "目標",
    "repo-target": "倉庫目標",
    "work-scope": "工作範圍",
    verification: "驗證",
    "permission-boundary": "權限邊界",
    "approval-boundary": "人審邊界",
    evidence: "證據"
  });
}

function koEngineeringMissionDraftItem(item: string) {
  return engineeringLabel(item, {
    goal: "목표",
    "repo-target": "저장소 대상",
    "work-scope": "작업 범위",
    verification: "검증",
    "permission-boundary": "권한 경계",
    "approval-boundary": "승인 경계",
    evidence: "증거"
  });
}

function jaEngineeringMissionDraftStatus(status: string) {
  return engineeringLabel(status, {
    present: "入力済み",
    missing: "不足",
    recommended: "推奨"
  });
}

function enEngineeringMissionDraftStatus(status: string) {
  return engineeringLabel(status, {
    present: "present",
    missing: "missing",
    recommended: "suggested"
  });
}

function zhHansEngineeringMissionDraftStatus(status: string) {
  return engineeringLabel(status, {
    present: "已有",
    missing: "缺少",
    recommended: "建议"
  });
}

function zhHantEngineeringMissionDraftStatus(status: string) {
  return engineeringLabel(status, {
    present: "已有",
    missing: "缺少",
    recommended: "建議"
  });
}

function koEngineeringMissionDraftStatus(status: string) {
  return engineeringLabel(status, {
    present: "입력됨",
    missing: "부족",
    recommended: "권장"
  });
}

function jaEngineeringSignal(signal: string) {
  return engineeringLabel(signal, {
    "mission-missing": "ミッション未入力",
    "mission-present": "ミッションあり",
    "repo-mentioned": "リポジトリあり",
    "coding-requested": "コード作業",
    "browser-requested": "ブラウザ操作",
    "mac-control-requested": "Mac 操作",
    "mcp-requested": "MCP 連携",
    "external-write-requested": "外部書き込み",
    "verification-mentioned": "検証あり",
    "secrets-risk": "秘密リスク",
    "runner-pack-ready": "runner pack",
    "preflight-ready": "preflight OK",
    "evidence-ready": "証拠あり"
  });
}

function enEngineeringSignal(signal: string) {
  return engineeringLabel(signal, {
    "mission-missing": "mission missing",
    "mission-present": "mission present",
    "repo-mentioned": "repo mentioned",
    "coding-requested": "coding requested",
    "browser-requested": "browser requested",
    "mac-control-requested": "Mac control",
    "mcp-requested": "MCP requested",
    "external-write-requested": "external write",
    "verification-mentioned": "verification",
    "secrets-risk": "secret risk",
    "runner-pack-ready": "runner pack",
    "preflight-ready": "preflight ready",
    "evidence-ready": "evidence ready"
  });
}

function zhHansEngineeringSignal(signal: string) {
  return engineeringLabel(signal, {
    "mission-missing": "未输入任务",
    "mission-present": "已有任务",
    "repo-mentioned": "提到仓库",
    "coding-requested": "代码工程",
    "browser-requested": "浏览器操作",
    "mac-control-requested": "Mac 控制",
    "mcp-requested": "MCP 调用",
    "external-write-requested": "外部写入",
    "verification-mentioned": "提到验证",
    "secrets-risk": "密钥风险",
    "runner-pack-ready": "runner 包已就绪",
    "preflight-ready": "预检已通过",
    "evidence-ready": "证据已生成"
  });
}

function zhHantEngineeringSignal(signal: string) {
  return engineeringLabel(signal, {
    "mission-missing": "未輸入任務",
    "mission-present": "已有任務",
    "repo-mentioned": "提到倉庫",
    "coding-requested": "程式碼工程",
    "browser-requested": "瀏覽器操作",
    "mac-control-requested": "Mac 控制",
    "mcp-requested": "MCP 呼叫",
    "external-write-requested": "外部寫入",
    "verification-mentioned": "提到驗證",
    "secrets-risk": "密鑰風險",
    "runner-pack-ready": "runner 包已就緒",
    "preflight-ready": "預檢已通過",
    "evidence-ready": "證據已生成"
  });
}

function koEngineeringSignal(signal: string) {
  return engineeringLabel(signal, {
    "mission-missing": "미션 없음",
    "mission-present": "미션 있음",
    "repo-mentioned": "저장소 언급",
    "coding-requested": "코드 작업",
    "browser-requested": "브라우저 조작",
    "mac-control-requested": "Mac 제어",
    "mcp-requested": "MCP 요청",
    "external-write-requested": "외부 쓰기",
    "verification-mentioned": "검증 언급",
    "secrets-risk": "비밀값 위험",
    "runner-pack-ready": "runner pack 준비",
    "preflight-ready": "preflight 통과",
    "evidence-ready": "증거 생성"
  });
}

function jaEngineeringUnlockItem(item: string, count?: number) {
  return engineeringUnlockLabel(item, count, {
    "write-mission": "ミッションを書く",
    "run-cabinet": "内閣で分解する",
    "prepare-agent-pack": "工程パックを作る",
    "review-held-sessions": count ? `${count}件の held session を確認` : "held session を確認",
    "run-preflight": "権限 preflight を実行",
    "approve-browser-profile": "隔離ブラウザを承認",
    "approve-mac-desktop": count ? `${count}件の Mac 権限を承認` : "Mac デスクトップ権限を承認",
    "approve-mcp-tools": "MCP ツール allowlist を承認",
    "approve-external-writes": "外部書き込みを人間承認",
    "run-local-sandbox": "ローカル sandbox を実行",
    "review-evidence": count ? `${count}件の証拠を確認` : "証拠を確認",
    "keep-secrets-blocked": "秘密情報は渡さない"
  });
}

function enEngineeringUnlockItem(item: string, count?: number) {
  return engineeringUnlockLabel(item, count, {
    "write-mission": "Write the mission",
    "run-cabinet": "Split with cabinet",
    "prepare-agent-pack": "Prepare the agent pack",
    "review-held-sessions": count ? `Review ${count} held sessions` : "Review held sessions",
    "run-preflight": "Run permission preflight",
    "approve-browser-profile": "Approve isolated browser",
    "approve-mac-desktop": count ? `Approve ${count} Mac permissions` : "Approve Mac desktop permissions",
    "approve-mcp-tools": "Approve MCP tool allowlist",
    "approve-external-writes": "Approve external writes",
    "run-local-sandbox": "Run local sandbox",
    "review-evidence": count ? `Review ${count} evidence items` : "Review evidence",
    "keep-secrets-blocked": "Keep secrets blocked"
  });
}

function zhHansEngineeringUnlockItem(item: string, count?: number) {
  return engineeringUnlockLabel(item, count, {
    "write-mission": "写清任务",
    "run-cabinet": "让内阁拆分",
    "prepare-agent-pack": "准备工程组包",
    "review-held-sessions": count ? `审查 ${count} 个 held session` : "审查 held session",
    "run-preflight": "运行权限预检",
    "approve-browser-profile": "批准隔离浏览器",
    "approve-mac-desktop": count ? `批准 ${count} 项 Mac 权限` : "批准 Mac 桌面权限",
    "approve-mcp-tools": "批准 MCP 工具白名单",
    "approve-external-writes": "审批外部写入",
    "run-local-sandbox": "运行本地沙箱",
    "review-evidence": count ? `审查 ${count} 条证据` : "审查证据",
    "keep-secrets-blocked": "密钥保持阻断"
  });
}

function zhHantEngineeringUnlockItem(item: string, count?: number) {
  return engineeringUnlockLabel(item, count, {
    "write-mission": "寫清任務",
    "run-cabinet": "讓內閣拆分",
    "prepare-agent-pack": "準備工程組包",
    "review-held-sessions": count ? `審查 ${count} 個 held session` : "審查 held session",
    "run-preflight": "執行權限預檢",
    "approve-browser-profile": "批准隔離瀏覽器",
    "approve-mac-desktop": count ? `批准 ${count} 項 Mac 權限` : "批准 Mac 桌面權限",
    "approve-mcp-tools": "批准 MCP 工具白名單",
    "approve-external-writes": "審批外部寫入",
    "run-local-sandbox": "執行本地沙箱",
    "review-evidence": count ? `審查 ${count} 條證據` : "審查證據",
    "keep-secrets-blocked": "密鑰保持阻斷"
  });
}

function koEngineeringUnlockItem(item: string, count?: number) {
  return engineeringUnlockLabel(item, count, {
    "write-mission": "미션 작성",
    "run-cabinet": "내각으로 분해",
    "prepare-agent-pack": "에이전트 패키지 준비",
    "review-held-sessions": count ? `${count}개 held session 검토` : "held session 검토",
    "run-preflight": "권한 preflight 실행",
    "approve-browser-profile": "격리 브라우저 승인",
    "approve-mac-desktop": count ? `${count}개 Mac 권한 승인` : "Mac 데스크톱 권한 승인",
    "approve-mcp-tools": "MCP 도구 허용 목록 승인",
    "approve-external-writes": "외부 쓰기 승인",
    "run-local-sandbox": "로컬 샌드박스 실행",
    "review-evidence": count ? `${count}개 증거 검토` : "증거 검토",
    "keep-secrets-blocked": "비밀값 차단 유지"
  });
}

function jaEngineeringUnlockStatus(status: string) {
  return engineeringLabel(status, {
    done: "完了",
    next: "次",
    waiting: "待機",
    approval: "承認",
    blocked: "停止"
  });
}

function enEngineeringUnlockStatus(status: string) {
  return engineeringLabel(status, {
    done: "done",
    next: "next",
    waiting: "waiting",
    approval: "approval",
    blocked: "blocked"
  });
}

function zhHansEngineeringUnlockStatus(status: string) {
  return engineeringLabel(status, {
    done: "完成",
    next: "下一步",
    waiting: "等待",
    approval: "审批",
    blocked: "阻止"
  });
}

function zhHantEngineeringUnlockStatus(status: string) {
  return engineeringLabel(status, {
    done: "完成",
    next: "下一步",
    waiting: "等待",
    approval: "審批",
    blocked: "阻止"
  });
}

function koEngineeringUnlockStatus(status: string) {
  return engineeringLabel(status, {
    done: "완료",
    next: "다음",
    waiting: "대기",
    approval: "승인",
    blocked: "차단"
  });
}

function engineeringUnlockLabel(
  value: string,
  _count: number | undefined,
  labels: Record<string, string>
) {
  return labels[value] || value;
}

function engineeringLabel(value: string, labels: Record<string, string>) {
  return labels[value] || value;
}
