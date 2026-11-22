import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  GitBranch,
  Languages,
  Play,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { createBrowserDemoRun, serializeBrowserDemoRun } from "./demoRun";
import type { CabinetRun, CabinetStageId } from "../domain/types";
import { supportedLocales, type SupportedLocale } from "../i18n";
import "./demo.css";

type StageCopy = {
  label: string;
  summary: string;
  evidence: string;
};

type DemoCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  demoNotice: string;
  missionLabel: string;
  missionHint: string;
  missionPlaceholder: string;
  run: string;
  running: string;
  pipeline: string;
  pipelineHint: string;
  emptyTitle: string;
  emptyBody: string;
  result: string;
  decision: string;
  scores: {
    readiness: string;
    safety: string;
    execution: string;
    critique: string;
  };
  scoreSuffix: string;
  download: string;
  gates: string;
  gatesBody: string;
  browserOnly: string;
  noRemote: string;
  noRunner: string;
  localOnly: string;
  next: string;
  nextItems: string[];
  github: string;
  localWorkbench: string;
  productSite: string;
  decisionLabel: Record<CabinetRun["score"]["decision"], string>;
  stages: Record<CabinetStageId, StageCopy>;
  roles: Record<string, string>;
};

const copy: Record<SupportedLocale, DemoCopy> = {
  ja: {
    eyebrow: "Naikaku AI Togo System",
    title: "内閣制 AI ワークフローを、ブラウザで試す",
    subtitle: "任務を入力すると、計画・実行境界・批判・監督・採点・次サイクルを一つの合議記録として組み立てます。",
    demoNotice: "この公開デモはブラウザ内だけで動きます。API キー、モデル呼び出し、コード実行、ローカル CLI、外部保存は行いません。",
    missionLabel: "任務",
    missionHint: "顧客への説明や実装方針を含めて、扱いたい仕事を短く書いてください。",
    missionPlaceholder: "例: 新しい予約フローを実装する前に、要件、リスク、受入条件を合議で整理する",
    run: "合議を実行",
    running: "合議を整理中",
    pipeline: "内閣の流れ",
    pipelineHint: "各段階は、次の段階に進むための説明可能な記録を残します。",
    emptyTitle: "任務を入力して合議を始める",
    emptyBody: "ここに、役割ごとの見解、証拠ゲート、採点結果が表示されます。",
    result: "合議記録",
    decision: "判断",
    scores: { readiness: "準備度", safety: "安全性", execution: "実行設計", critique: "批判網羅" },
    scoreSuffix: "/ 100",
    download: "記録を JSON で保存",
    gates: "公開デモの境界",
    gatesBody: "この Space は製品の合議構造を示すためのものです。実際のモデル、CLI、サンドボックス runner はローカル版または承認済みのセルフホスト環境で使います。",
    browserOnly: "ブラウザ内の dry run",
    noRemote: "外部 API への送信なし",
    noRunner: "コード・PC 操作なし",
    localOnly: "本番 runner はローカル版のみ",
    next: "次にできること",
    nextItems: ["GitHub でソースと検証手順を確認する", "Mac のローカル Workbench を起動する", "実プロジェクトでは自分の API と runner を接続する"],
    github: "GitHub を開く",
    localWorkbench: "ローカル版の始め方",
    productSite: "製品ページ",
    decisionLabel: { ship: "次の承認へ", revise: "見直しが必要", block: "停止して確認" },
    stages: {
      intake: { label: "受付", summary: "任務を、担当と確認対象が明確な議題に変換します。", evidence: "目的・担当・確認範囲" },
      planning: { label: "計画", summary: "受入条件、依存関係、リスクを分けて計画を作ります。", evidence: "マイルストーン・リスク・受入条件" },
      execution: { label: "実行設計", summary: "このデモでは実行しません。ローカル版では許可済み runner にだけ仕事を渡します。", evidence: "許可範囲・実行契約・出力先" },
      critique: { label: "批判", summary: "見落とし、検証不足、利用者への影響を反対役が確認します。", evidence: "反証・テスト観点・未解決事項" },
      supervision: { label: "監督", summary: "取り消せない操作は人の承認を前提にし、境界と記録を確認します。", evidence: "承認条件・監査記録・停止条件" },
      scoring: { label: "採点", summary: "準備度、安全性、実行設計、批判の網羅性を一緒に評価します。", evidence: "評価根拠・判断・保留事項" },
      iteration: { label: "次サイクル", summary: "承認済みの学びと、次に片付ける作業を残します。", evidence: "改善項目・再利用できる知見" }
    },
    roles: {
      "prime-minister": "首相",
      "strategy-minister": "戦略大臣",
      "execution-minister": "実行大臣",
      "sandbox-operator": "サンドボックス担当",
      critic: "批判担当",
      "safety-auditor": "安全監査官",
      "scoring-office": "評価室",
      "memory-secretary": "記録官"
    }
  },
  en: {
    eyebrow: "Naikaku AI Togo System",
    title: "Try the cabinet workflow in your browser",
    subtitle: "Enter a mission to assemble planning, execution boundaries, critique, supervision, scoring, and the next cycle into one reviewable record.",
    demoNotice: "This public demo runs only in your browser. It makes no API-key use, model request, code execution, local CLI call, or remote save.",
    missionLabel: "Mission",
    missionHint: "Describe the work you want to organize, including the intended outcome or stakeholder context.",
    missionPlaceholder: "Example: Review the requirements, risks, and acceptance criteria before implementing a new reservation flow",
    run: "Run cabinet review",
    running: "Building cabinet record",
    pipeline: "Cabinet flow",
    pipelineHint: "Each stage leaves an explainable record before the next one proceeds.",
    emptyTitle: "Enter a mission to start the cabinet",
    emptyBody: "Role views, evidence gates, and a scored outcome will appear here.",
    result: "Cabinet record",
    decision: "Decision",
    scores: { readiness: "Readiness", safety: "Safety", execution: "Execution design", critique: "Critique coverage" },
    scoreSuffix: "/ 100",
    download: "Download JSON record",
    gates: "Public demo boundary",
    gatesBody: "This Space demonstrates Naikaku's cabinet structure. Real models, CLIs, and sandbox runners stay in the local workbench or an approved self-hosted environment.",
    browserOnly: "Browser-only dry run",
    noRemote: "No external API traffic",
    noRunner: "No code or computer control",
    localOnly: "Production runners stay local",
    next: "Continue with Naikaku",
    nextItems: ["Review the source and verification steps on GitHub", "Start the local Workbench on a Mac", "Connect your own API and runner for a real project"],
    github: "Open GitHub",
    localWorkbench: "Start locally",
    productSite: "Product page",
    decisionLabel: { ship: "Ready for next approval", revise: "Revision needed", block: "Stop and review" },
    stages: {
      intake: { label: "Intake", summary: "Turn the mission into an agenda with clear owners and review targets.", evidence: "Goal, owners, review scope" },
      planning: { label: "Planning", summary: "Separate acceptance criteria, dependencies, and risks into a practical plan.", evidence: "Milestones, risks, acceptance gates" },
      execution: { label: "Execution design", summary: "This demo executes nothing. The local workbench hands work only to approved runners.", evidence: "Allowed scope, runner contract, output target" },
      critique: { label: "Critique", summary: "An opposing role looks for gaps, weak evidence, and user impact.", evidence: "Challenges, test angles, open questions" },
      supervision: { label: "Supervision", summary: "Irreversible actions require human approval while boundaries and records are checked.", evidence: "Approval gates, audit record, stop conditions" },
      scoring: { label: "Scoring", summary: "Evaluate readiness, safety, execution design, and critique coverage together.", evidence: "Scoring basis, decision, holds" },
      iteration: { label: "Next cycle", summary: "Keep approved lessons and define the next work that deserves attention.", evidence: "Improvement queue, reusable lessons" }
    },
    roles: {
      "prime-minister": "Prime Minister", "strategy-minister": "Strategy Minister", "execution-minister": "Execution Minister", "sandbox-operator": "Sandbox Operator", critic: "Opposition Critic", "safety-auditor": "Safety Auditor", "scoring-office": "Scoring Office", "memory-secretary": "Memory Secretary"
    }
  },
  "zh-Hans": {
    eyebrow: "Naikaku AI Togo System",
    title: "在浏览器中体验内阁制 AI 工作流",
    subtitle: "输入一个任务，即可把规划、执行边界、批评、监督、评分和下一轮工作整理成一份可审阅记录。",
    demoNotice: "此公开演示只在浏览器中运行，不使用 API 密钥、不调用模型、不执行代码、不调用本机 CLI，也不保存到远端。",
    missionLabel: "任务",
    missionHint: "简要写下希望推进的工作，以及预期成果或相关对象。",
    missionPlaceholder: "示例：在实现新的预约流程前，合议梳理需求、风险和验收条件",
    run: "开始合议",
    running: "正在整理合议记录",
    pipeline: "内阁流程",
    pipelineHint: "每个阶段都会留下可说明的记录，再进入下一阶段。",
    emptyTitle: "输入任务以开始合议",
    emptyBody: "这里会显示各角色观点、证据闸门和评分结果。",
    result: "合议记录",
    decision: "判断",
    scores: { readiness: "准备度", safety: "安全性", execution: "执行设计", critique: "批评覆盖" },
    scoreSuffix: "/ 100",
    download: "下载 JSON 记录",
    gates: "公开演示边界",
    gatesBody: "这个 Space 用于展示 Naikaku 的合议结构。真实模型、本机 CLI 和沙箱 runner 仅在本地工作台或已获批准的自托管环境中使用。",
    browserOnly: "仅浏览器 dry run",
    noRemote: "不发送外部 API",
    noRunner: "不执行代码或电脑控制",
    localOnly: "生产 runner 仅在本地",
    next: "接下来可以做什么",
    nextItems: ["在 GitHub 查看源码和验证步骤", "在 Mac 上启动本地 Workbench", "在真实项目中连接自己的 API 和 runner"],
    github: "打开 GitHub",
    localWorkbench: "本地启动方式",
    productSite: "产品页面",
    decisionLabel: { ship: "可进入下一次审批", revise: "需要修订", block: "停止并确认" },
    stages: {
      intake: { label: "受理", summary: "把任务转换为明确负责人和审查对象的议题。", evidence: "目标、负责人、审查范围" },
      planning: { label: "规划", summary: "把验收条件、依赖关系和风险拆解为可执行计划。", evidence: "里程碑、风险、验收条件" },
      execution: { label: "执行设计", summary: "此演示不会执行操作；本地版只把工作交给获批准的 runner。", evidence: "允许范围、执行契约、输出位置" },
      critique: { label: "批评", summary: "反对角色会检查遗漏、证据不足和对用户的影响。", evidence: "反证、测试视角、未解问题" },
      supervision: { label: "监督", summary: "不可逆操作需要人工审批，并检查边界和记录。", evidence: "审批条件、审计记录、停止条件" },
      scoring: { label: "评分", summary: "综合评估准备度、安全性、执行设计和批评覆盖。", evidence: "评分依据、判断、保留事项" },
      iteration: { label: "下一轮", summary: "保留已确认的经验，并列出下一步值得处理的工作。", evidence: "改进队列、可复用经验" }
    },
    roles: {
      "prime-minister": "首相", "strategy-minister": "战略大臣", "execution-minister": "执行大臣", "sandbox-operator": "沙箱负责人", critic: "批评官", "safety-auditor": "安全审计官", "scoring-office": "评分室", "memory-secretary": "记录官"
    }
  },
  "zh-Hant": {
    eyebrow: "Naikaku AI Togo System",
    title: "在瀏覽器中體驗內閣制 AI 工作流程",
    subtitle: "輸入一個任務，即可把規劃、執行邊界、批評、監督、評分與下一輪工作整理成一份可審閱記錄。",
    demoNotice: "此公開示範只在瀏覽器中運行，不使用 API 金鑰、不呼叫模型、不執行程式碼、不呼叫本機 CLI，也不儲存到遠端。",
    missionLabel: "任務",
    missionHint: "簡要寫下希望推進的工作，以及預期成果或相關對象。",
    missionPlaceholder: "範例：在實作新的預約流程前，以合議方式整理需求、風險與驗收條件",
    run: "開始合議",
    running: "正在整理合議記錄",
    pipeline: "內閣流程",
    pipelineHint: "每個階段都會留下可說明的記錄，再進入下一階段。",
    emptyTitle: "輸入任務以開始合議",
    emptyBody: "這裡會顯示各角色觀點、證據閘門和評分結果。",
    result: "合議記錄",
    decision: "判斷",
    scores: { readiness: "準備度", safety: "安全性", execution: "執行設計", critique: "批評覆蓋" },
    scoreSuffix: "/ 100",
    download: "下載 JSON 記錄",
    gates: "公開示範邊界",
    gatesBody: "這個 Space 用於展示 Naikaku 的合議結構。真實模型、本機 CLI 與沙箱 runner 僅在本地工作台或已獲批准的自架環境中使用。",
    browserOnly: "僅瀏覽器 dry run",
    noRemote: "不傳送外部 API",
    noRunner: "不執行程式碼或電腦控制",
    localOnly: "正式 runner 僅在本地",
    next: "接下來可以做什麼",
    nextItems: ["在 GitHub 查看原始碼與驗證步驟", "在 Mac 上啟動本地 Workbench", "在真實專案中連接自己的 API 與 runner"],
    github: "開啟 GitHub",
    localWorkbench: "本地啟動方式",
    productSite: "產品頁面",
    decisionLabel: { ship: "可進入下一次審批", revise: "需要修訂", block: "停止並確認" },
    stages: {
      intake: { label: "受理", summary: "把任務轉換為明確負責人與審查對象的議題。", evidence: "目標、負責人、審查範圍" },
      planning: { label: "規劃", summary: "把驗收條件、相依關係與風險拆解為可執行計畫。", evidence: "里程碑、風險、驗收條件" },
      execution: { label: "執行設計", summary: "此示範不會執行操作；本地版只把工作交給已核准的 runner。", evidence: "允許範圍、執行契約、輸出位置" },
      critique: { label: "批評", summary: "反對角色會檢查遺漏、證據不足與對使用者的影響。", evidence: "反證、測試視角、未解問題" },
      supervision: { label: "監督", summary: "不可逆操作需要人工審批，並檢查邊界與記錄。", evidence: "審批條件、稽核記錄、停止條件" },
      scoring: { label: "評分", summary: "綜合評估準備度、安全性、執行設計與批評覆蓋。", evidence: "評分依據、判斷、保留事項" },
      iteration: { label: "下一輪", summary: "保留已確認的經驗，並列出下一步值得處理的工作。", evidence: "改善佇列、可重用經驗" }
    },
    roles: {
      "prime-minister": "首相", "strategy-minister": "戰略大臣", "execution-minister": "執行大臣", "sandbox-operator": "沙箱負責人", critic: "批評官", "safety-auditor": "安全稽核官", "scoring-office": "評分室", "memory-secretary": "記錄官"
    }
  },
  ko: {
    eyebrow: "Naikaku AI Togo System",
    title: "브라우저에서 내각형 AI 워크플로를 체험하세요",
    subtitle: "작업을 입력하면 계획, 실행 경계, 비판, 감독, 평가, 다음 주기를 하나의 검토 가능한 기록으로 정리합니다.",
    demoNotice: "이 공개 데모는 브라우저 안에서만 실행됩니다. API 키, 모델 호출, 코드 실행, 로컬 CLI 호출, 원격 저장을 하지 않습니다.",
    missionLabel: "작업",
    missionHint: "추진하려는 작업과 기대 결과 또는 이해관계자를 간단히 적어 주세요.",
    missionPlaceholder: "예: 새 예약 흐름을 구현하기 전에 요구사항, 위험, 인수 조건을 합의로 정리한다",
    run: "내각 검토 실행",
    running: "내각 기록을 정리하는 중",
    pipeline: "내각 흐름",
    pipelineHint: "각 단계는 다음 단계로 가기 전 설명 가능한 기록을 남깁니다.",
    emptyTitle: "작업을 입력해 내각 검토를 시작하세요",
    emptyBody: "역할별 견해, 증거 게이트, 평가 결과가 여기에 표시됩니다.",
    result: "내각 기록",
    decision: "판단",
    scores: { readiness: "준비도", safety: "안전성", execution: "실행 설계", critique: "비판 범위" },
    scoreSuffix: "/ 100",
    download: "JSON 기록 다운로드",
    gates: "공개 데모 경계",
    gatesBody: "이 Space는 Naikaku의 합의 구조를 보여 줍니다. 실제 모델, CLI, 샌드박스 runner는 로컬 워크벤치 또는 승인된 자체 호스팅 환경에서만 사용합니다.",
    browserOnly: "브라우저 전용 dry run",
    noRemote: "외부 API 전송 없음",
    noRunner: "코드 또는 컴퓨터 제어 없음",
    localOnly: "운영 runner는 로컬 전용",
    next: "Naikaku 계속 사용하기",
    nextItems: ["GitHub에서 소스와 검증 절차 확인", "Mac에서 로컬 Workbench 시작", "실제 프로젝트에 자신의 API와 runner 연결"],
    github: "GitHub 열기",
    localWorkbench: "로컬 시작 방법",
    productSite: "제품 페이지",
    decisionLabel: { ship: "다음 승인 단계 준비", revise: "수정 필요", block: "중지 후 검토" },
    stages: {
      intake: { label: "접수", summary: "작업을 담당자와 검토 대상이 분명한 안건으로 바꿉니다.", evidence: "목표, 담당자, 검토 범위" },
      planning: { label: "계획", summary: "인수 조건, 의존성, 위험을 실용적인 계획으로 나눕니다.", evidence: "마일스톤, 위험, 인수 게이트" },
      execution: { label: "실행 설계", summary: "이 데모는 실행하지 않습니다. 로컬 워크벤치는 승인된 runner에만 작업을 넘깁니다.", evidence: "허용 범위, runner 계약, 출력 대상" },
      critique: { label: "비판", summary: "반대 역할이 누락, 약한 증거, 사용자 영향을 살핍니다.", evidence: "반증, 테스트 관점, 미해결 질문" },
      supervision: { label: "감독", summary: "되돌릴 수 없는 작업에는 사람의 승인이 필요하며 경계와 기록을 확인합니다.", evidence: "승인 게이트, 감사 기록, 중지 조건" },
      scoring: { label: "평가", summary: "준비도, 안전성, 실행 설계, 비판 범위를 함께 평가합니다.", evidence: "평가 근거, 판단, 보류 사항" },
      iteration: { label: "다음 주기", summary: "승인된 학습을 남기고 다음으로 다룰 작업을 정합니다.", evidence: "개선 대기열, 재사용 가능한 지식" }
    },
    roles: {
      "prime-minister": "총리", "strategy-minister": "전략 장관", "execution-minister": "실행 장관", "sandbox-operator": "샌드박스 담당", critic: "비판 담당", "safety-auditor": "안전 감사관", "scoring-office": "평가실", "memory-secretary": "기록관"
    }
  }
};

const stageOrder: CabinetStageId[] = [
  "intake",
  "planning",
  "execution",
  "critique",
  "supervision",
  "scoring",
  "iteration"
];

export function DemoApp() {
  const [locale, setLocale] = useState<SupportedLocale>("ja");
  const [mission, setMission] = useState("");
  const [run, setRun] = useState<CabinetRun | null>(null);
  const [running, setRunning] = useState(false);
  const text = copy[locale];

  function startDemo() {
    if (running) return;
    setRunning(true);
    window.setTimeout(() => {
      setRun(createBrowserDemoRun({ mission, fallbackMission: text.missionPlaceholder }));
      setRunning(false);
    }, 280);
  }

  function downloadRecord() {
    if (!run) return;
    const blob = new Blob([serializeBrowserDemoRun(run)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "naikaku-browser-demo-record.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <main className="demo-shell" lang={locale}>
      <header className="demo-topbar">
        <a className="demo-brand" href="https://naikaku.emysti.net/ja/" target="_blank" rel="noreferrer">
          <span className="demo-brand-mark" aria-hidden="true"><GitBranch size={20} /></span>
          <span>Naikaku AI Togo</span>
        </a>
        <label className="demo-locale-select">
          <Languages size={16} aria-hidden="true" />
          <span className="demo-sr-only">Language</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as SupportedLocale)}>
            {supportedLocales.map((option) => <option key={option.code} value={option.code}>{option.nativeLabel}</option>)}
          </select>
        </label>
      </header>

      <section className="demo-intro" aria-labelledby="demo-title">
        <p className="demo-eyebrow">{text.eyebrow}</p>
        <h1 id="demo-title">{text.title}</h1>
        <p>{text.subtitle}</p>
        <div className="demo-notice"><ShieldCheck size={18} aria-hidden="true" />{text.demoNotice}</div>
      </section>

      <section className="demo-workspace" aria-label={text.pipeline}>
        <div className="demo-compose">
          <div className="demo-section-heading">
            <Workflow size={18} aria-hidden="true" />
            <div><h2>{text.missionLabel}</h2><p>{text.missionHint}</p></div>
          </div>
          <textarea value={mission} onChange={(event) => setMission(event.target.value)} placeholder={text.missionPlaceholder} rows={7} />
          <button className="demo-primary-action" type="button" onClick={startDemo} disabled={running}>
            <Play size={17} fill="currentColor" aria-hidden="true" />
            {running ? text.running : text.run}
          </button>

          <div className="demo-boundary">
            <h3>{text.gates}</h3>
            <p>{text.gatesBody}</p>
            <ul>
              <li><CheckCircle2 size={16} aria-hidden="true" />{text.browserOnly}</li>
              <li><CheckCircle2 size={16} aria-hidden="true" />{text.noRemote}</li>
              <li><CheckCircle2 size={16} aria-hidden="true" />{text.noRunner}</li>
              <li><CheckCircle2 size={16} aria-hidden="true" />{text.localOnly}</li>
            </ul>
          </div>
        </div>

        <div className="demo-record">
          <div className="demo-section-heading">
            <GitBranch size={18} aria-hidden="true" />
            <div><h2>{run ? text.result : text.pipeline}</h2><p>{text.pipelineHint}</p></div>
          </div>

          {run ? <ResultView run={run} text={text} onDownload={downloadRecord} /> : <EmptyPipeline text={text} />}
        </div>
      </section>

      <section className="demo-next" aria-labelledby="demo-next-title">
        <div>
          <p className="demo-eyebrow">Naikaku</p>
          <h2 id="demo-next-title">{text.next}</h2>
          <ol>{text.nextItems.map((item) => <li key={item}>{item}</li>)}</ol>
        </div>
        <nav className="demo-links" aria-label={text.next}>
          <a href="https://github.com/YAHATAKAHA/naikaku-ai-togo-system" target="_blank" rel="noreferrer">{text.github}<ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="https://github.com/YAHATAKAHA/naikaku-ai-togo-system#quick-start" target="_blank" rel="noreferrer">{text.localWorkbench}<ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="https://naikaku.emysti.net/ja/" target="_blank" rel="noreferrer">{text.productSite}<ArrowUpRight size={16} aria-hidden="true" /></a>
        </nav>
      </section>
    </main>
  );
}

function EmptyPipeline({ text }: { text: DemoCopy }) {
  return <div className="demo-empty"><div><Workflow size={28} aria-hidden="true" /><h3>{text.emptyTitle}</h3><p>{text.emptyBody}</p></div><ol className="demo-stage-outline">{stageOrder.map((stageId, index) => <li key={stageId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{text.stages[stageId].label}</strong></li>)}</ol></div>;
}

function ResultView({ run, text, onDownload }: { run: CabinetRun; text: DemoCopy; onDownload: () => void }) {
  return <div className="demo-result">
    <div className="demo-outcome">
      <div><span>{text.decision}</span><strong data-decision={run.score.decision}>{text.decisionLabel[run.score.decision]}</strong></div>
      <button className="demo-download" type="button" onClick={onDownload}><Download size={16} aria-hidden="true" />{text.download}</button>
    </div>
    <dl className="demo-scores">
      {(["readiness", "safety", "execution", "critique"] as const).map((metric) => <div key={metric}><dt>{text.scores[metric]}</dt><dd>{run.score[metric]}<small>{text.scoreSuffix}</small></dd></div>)}
    </dl>
    <ol className="demo-stage-results">
      {run.artifacts.map((artifact, index) => {
        const stage = text.stages[artifact.stageId];
        return <li key={artifact.id} className="demo-stage-result">
          <span className="demo-stage-number">{String(index + 1).padStart(2, "0")}</span>
          <div><div className="demo-stage-title"><h3>{stage.label}</h3><span>{text.roles[artifact.roleId] || artifact.roleId}</span></div><p>{stage.summary}</p><small>{stage.evidence}</small></div>
        </li>;
      })}
    </ol>
  </div>;
}
