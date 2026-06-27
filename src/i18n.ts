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
