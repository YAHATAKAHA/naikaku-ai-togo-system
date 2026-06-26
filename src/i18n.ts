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
  mode: string;
  executor: string;
  releaseGate: string;
  required: string;
  optional: string;
  crossRole: string;
  promptReady: string;
  empty: string;
  statusGateway: string;
  statusFallback: (errorMessage?: string) => string;
  statusMarkdown: string;
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
      mode: "モード",
      executor: "Executor",
      releaseGate: "リリースゲート",
      required: "必須",
      optional: "任意",
      crossRole: "横断",
      promptReady: "代理用 prompt 準備済み",
      empty: "Development Board から coding agent brief を生成してください。",
      statusGateway: "コーディング代理ブリーフをローカルゲートウェイ経由で出力しました。",
      statusFallback: (errorMessage) => `ゲートウェイ brief を利用できないため、ローカル出力を使用しました。${errorMessage || ""}`,
      statusMarkdown: "コーディング代理 Markdown prompt pack をローカルで準備しました。"
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
      mode: "Mode",
      executor: "Executor",
      releaseGate: "Release gate",
      required: "required",
      optional: "optional",
      crossRole: "cross-role",
      promptReady: "Agent prompt ready",
      empty: "Generate coding agent briefs from the Development Board.",
      statusGateway: "Coding agent briefs exported through the local gateway.",
      statusFallback: (errorMessage) => `Gateway coding agent briefs unavailable; used local export.${errorMessage ? ` ${errorMessage}` : ""}`,
      statusMarkdown: "Coding agent Markdown prompt pack prepared locally."
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
      mode: "模式",
      executor: "Executor",
      releaseGate: "发布门",
      required: "必需",
      optional: "可选",
      crossRole: "跨角色",
      promptReady: "代理 prompt 已准备",
      empty: "请从 Development Board 生成编程代理 brief。",
      statusGateway: "编程代理 brief 已通过本地网关导出。",
      statusFallback: (errorMessage) => `网关 brief 不可用，已使用本地导出。${errorMessage || ""}`,
      statusMarkdown: "编程代理 Markdown prompt pack 已在本地准备。"
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
      mode: "模式",
      executor: "Executor",
      releaseGate: "發布門",
      required: "必需",
      optional: "可選",
      crossRole: "跨角色",
      promptReady: "代理 prompt 已準備",
      empty: "請從 Development Board 生成編程代理 brief。",
      statusGateway: "編程代理 brief 已透過本地閘道匯出。",
      statusFallback: (errorMessage) => `閘道 brief 不可用，已使用本地匯出。${errorMessage || ""}`,
      statusMarkdown: "編程代理 Markdown prompt pack 已在本地準備。"
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
      mode: "모드",
      executor: "Executor",
      releaseGate: "릴리스 게이트",
      required: "필수",
      optional: "선택",
      crossRole: "역할 공통",
      promptReady: "에이전트 prompt 준비됨",
      empty: "Development Board에서 코딩 에이전트 브리프를 생성하세요.",
      statusGateway: "코딩 에이전트 브리프를 로컬 게이트웨이로 내보냈습니다.",
      statusFallback: (errorMessage) => `게이트웨이 브리프를 사용할 수 없어 로컬 내보내기를 사용했습니다.${errorMessage ? ` ${errorMessage}` : ""}`,
      statusMarkdown: "코딩 에이전트 Markdown prompt pack을 로컬에서 준비했습니다."
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
