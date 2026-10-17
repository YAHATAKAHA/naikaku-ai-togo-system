import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runAutonomousGoal } from "../src/domain/autonomousGoalEngine";
import type { GoalEngineInput, GoalEngineSummary, ProviderConfig, ProviderKind } from "../src/domain/types";
import type { SupportedLocale } from "../src/i18n";
import { supportedLocales } from "../src/i18n";

interface NaikakuGoalCliOptions {
  mission: string | null;
  worktreeDir: string | null;
  outputDir: string;
  maxCycles: number;
  provider: ProviderKind | null;
  locale: SupportedLocale;
  json: boolean;
  smoke: boolean;
  help: boolean;
}

const copy = {
  ja: {
    hero: "内閣 AI 統合システム - 自律目標達成エンジン (/goal)",
    missionLabel: "諮問目標 (Mission)",
    worktreeLabel: "対象作業ツリー (Worktree)",
    cyclesLabel: "最大閣議回数 (Max Cycles)",
    runningCycle: (c: number) => `\n==> [第 ${c} 次閣議] 審議・執行・査問プロセス開始`,
    intake: "総理府審議: 目標要件及び検収基準の策定",
    strategy: "政策・計画: 執行ステップおよびテスト計画の策定",
    execution: (files: number, cmds: number) => `デジタル執行: ${files} ファイル変更、${cmds} テスト・検証コマンド実行`,
    critiquePass: "野党査問: ✓ 合格 (テスト通過・欠陥なし)",
    critiqueFail: (flaws: string[]) => `野党査問: ✗ 指摘事項あり (${flaws.join("; ")})`,
    safetyPass: "国家公安監査: ✓ 安全性確認 (サンドボックス領域内・危険コマンド検出なし)",
    voteShip: (score: number) => `閣議採決: 【達成承認 (SHIP)】 総合評点: ${score}/100`,
    voteRevise: (score: number) => `閣議採決: 【継続修正 (REVISE)】 総合評点: ${score}/100 - 次回閣議へ差し戻し`,
    voteBlock: (score: number) => `閣議採決: 【安全拒絶 (BLOCK)】 総合評点: ${score}/100 - 執行停止`,
    finalShip: "目標は自律的に完全達成され、閣議によって承認されました。",
    finalRevise: "最大閣議回数に達しましたが、未解決の指摘事項があります。",
    finalBlock: "安全基準違反のため執行が遮断されました。",
    evidenceLabel: "証跡パッケージ (Evidence Bundle)",
    receiptLabel: "セッション受領書 (Receipt)",
    diffLabel: "差分 (Diff)",
    usage: "使い方: naikaku goal \"<達成したい目標>\" [オプション]",
    options: "オプション:",
    optWorktree: "--worktree <dir>       対象作業ディレクトリ (既定: ./output/goal-worktree)",
    optOut: "--out <dir>            証跡出力先ディレクトリ",
    optCycles: "--max-cycles <N>       最大ループ回数 (既定: 4)",
    optProvider: "--provider <name>      使用するプロバイダ (ollama, openai, aliyun, etc.)",
    optLocale: "--locale <lang>        言語 (ja, en, zh-Hans, zh-Hant, ko)",
    optSmoke: "--smoke                スモークテスト用の組み込み目標を実行",
    optJson: "--json                 結果を JSON 形式で出力"
  },
  en: {
    hero: "Naikaku AI Togo - Autonomous Goal Execution Engine (/goal)",
    missionLabel: "Mission",
    worktreeLabel: "Target Worktree",
    cyclesLabel: "Max Cabinet Cycles",
    runningCycle: (c: number) => `\n==> [Cabinet Cycle ${c}] Deliberation, Execution & Critique`,
    intake: "Prime Minister Intake: Formulating deliverables & acceptance gates",
    strategy: "Strategy Minister: Decomposing execution & test plan",
    execution: (files: number, cmds: number) => `Digital Execution: ${files} files modified, ${cmds} test commands executed`,
    critiquePass: "Opposition Critique: ✓ Passed (All tests green, zero defects)",
    critiqueFail: (flaws: string[]) => `Opposition Critique: ✗ Flaws detected (${flaws.join("; ")})`,
    safetyPass: "Public Safety Audit: ✓ Passed (Within sandbox boundaries, no forbidden commands)",
    voteShip: (score: number) => `Cabinet Vote: 【SHIP - APPROVED】 Overall Score: ${score}/100`,
    voteRevise: (score: number) => `Cabinet Vote: 【REVISE】 Overall Score: ${score}/100 - Returning for correction`,
    voteBlock: (score: number) => `Cabinet Vote: 【BLOCK】 Overall Score: ${score}/100 - Safety veto`,
    finalShip: "Goal successfully achieved and ratified by Cabinet.",
    finalRevise: "Max cycles reached with unresolved critique findings.",
    finalBlock: "Execution blocked due to safety violations.",
    evidenceLabel: "Evidence Bundle",
    receiptLabel: "Receipt",
    diffLabel: "Diff",
    usage: "Usage: naikaku goal \"<goal mission>\" [options]",
    options: "Options:",
    optWorktree: "--worktree <dir>       Target workspace directory (default: ./output/goal-worktree)",
    optOut: "--out <dir>            Output evidence directory",
    optCycles: "--max-cycles <N>       Max cycles (default: 4)",
    optProvider: "--provider <name>      Provider to use (ollama, openai, aliyun, etc.)",
    optLocale: "--locale <lang>        Display locale (ja, en, zh-Hans, zh-Hant, ko)",
    optSmoke: "--smoke                Run smoke verification goal",
    optJson: "--json                 Output summary in JSON format"
  },
  "zh-Hans": {
    hero: "Naikaku AI 内阁系统 - 自律目标达成引擎 (/goal)",
    missionLabel: "任务目标 (Mission)",
    worktreeLabel: "工作目录 (Worktree)",
    cyclesLabel: "最大内阁循环 (Max Cycles)",
    runningCycle: (c: number) => `\n==> [第 ${c} 轮内阁会议] 审议、执行与质询开始`,
    intake: "首相府审议: 明确交付标准与验收关卡",
    strategy: "战略规划: 拟定代码生成与测试执行方案",
    execution: (files: number, cmds: number) => `数字执行官: 变更 ${files} 个文件，执行 ${cmds} 项测试命令`,
    critiquePass: "在野党质询: ✓ 通过 (测试全绿，无遗留缺陷)",
    critiqueFail: (flaws: string[]) => `在野党质询: ✗ 发现缺陷 (${flaws.join("; ")})`,
    safetyPass: "公安审计: ✓ 检查合格 (沙盒边界安全，无越权命令)",
    voteShip: (score: number) => `内阁表决: 【批准发布 (SHIP)】 综合评分: ${score}/100`,
    voteRevise: (score: number) => `内阁表决: 【继续修正 (REVISE)】 综合评分: ${score}/100 - 发回下一轮修复`,
    voteBlock: (score: number) => `内阁表决: 【安全阻断 (BLOCK)】 综合评分: ${score}/100 - 终止执行`,
    finalShip: "目标已自主完全达成，并获得内阁表决批准！",
    finalRevise: "已达最大循环次数，仍有未解决的审查问题。",
    finalBlock: "由于违反安全规范，执行已阻断。",
    evidenceLabel: "证据包路径 (Evidence Bundle)",
    receiptLabel: "会话回执 (Receipt)",
    diffLabel: "Git 差异 (Diff)",
    usage: "用法: naikaku goal \"<目标内容>\" [选项]",
    options: "选项:",
    optWorktree: "--worktree <dir>       目标工作区目录 (默认: ./output/goal-worktree)",
    optOut: "--out <dir>            证据输出目录",
    optCycles: "--max-cycles <N>       最大循环次数 (默认: 4)",
    optProvider: "--provider <name>      使用的模型提供商 (ollama, openai, aliyun 等)",
    optLocale: "--locale <lang>        语言 (ja, en, zh-Hans, zh-Hant, ko)",
    optSmoke: "--smoke                运行内置冒烟测试目标",
    optJson: "--json                 以 JSON 格式输出结果"
  },
  "zh-Hant": {
    hero: "Naikaku AI 內閣系統 - 自律目標達成引擎 (/goal)",
    missionLabel: "任務目標 (Mission)",
    worktreeLabel: "工作目錄 (Worktree)",
    cyclesLabel: "最大內閣循環 (Max Cycles)",
    runningCycle: (c: number) => `\n==> [第 ${c} 輪內閣會議] 審議、執行與質詢開始`,
    intake: "首相府審議: 明確交付標準與驗收關卡",
    strategy: "戰略規劃: 擬定代碼生成與測試執行方案",
    execution: (files: number, cmds: number) => `數位執行官: 變更 ${files} 個檔案，執行 ${cmds} 項測試指令`,
    critiquePass: "在野黨質詢: ✓ 通過 (測試全綠，無遺留缺陷)",
    critiqueFail: (flaws: string[]) => `在野黨質詢: ✗ 發現缺陷 (${flaws.join("; ")})`,
    safetyPass: "公安審計: ✓ 檢查合格 (沙箱邊界安全，無越權指令)",
    voteShip: (score: number) => `內閣表決: 【核准發布 (SHIP)】 綜合評分: ${score}/100`,
    voteRevise: (score: number) => `內閣表決: 【繼續修正 (REVISE)】 綜合評分: ${score}/100 - 發回修復`,
    voteBlock: (score: number) => `內閣表決: 【安全阻斷 (BLOCK)】 綜合評分: ${score}/100 - 終止執行`,
    finalShip: "目標已自主完全達成，並獲得內閣表決核准！",
    finalRevise: "已達最大循環次數，仍有未解決的審查問題。",
    finalBlock: "由於違反安全規範，執行已阻斷。",
    evidenceLabel: "證據包路徑 (Evidence Bundle)",
    receiptLabel: "會話回執 (Receipt)",
    diffLabel: "Git 差異 (Diff)",
    usage: "用法: naikaku goal \"<目標內容>\" [選項]",
    options: "選項:",
    optWorktree: "--worktree <dir>       目標工作區目錄 (預設: ./output/goal-worktree)",
    optOut: "--out <dir>            證據輸出目錄",
    optCycles: "--max-cycles <N>       最大循環次數 (預設: 4)",
    optProvider: "--provider <name>      使用的模型提供商 (ollama, openai, aliyun 等)",
    optLocale: "--locale <lang>        語言 (ja, en, zh-Hans, zh-Hant, ko)",
    optSmoke: "--smoke                執行內建冒煙測試目標",
    optJson: "--json                 以 JSON 格式輸出結果"
  },
  ko: {
    hero: "Naikaku AI 내각 시스템 - 자율 목표 달성 엔진 (/goal)",
    missionLabel: "목표 과제 (Mission)",
    worktreeLabel: "작업 디렉터리 (Worktree)",
    cyclesLabel: "최대 내각 사이클 (Max Cycles)",
    runningCycle: (c: number) => `\n==> [제 ${c} 차 내각 회의] 심의, 실행 및 비평 시작`,
    intake: "총리실 심의: 목표 요구사항 및 인수 기준 수립",
    strategy: "전략 장관: 실행 및 테스트 계획 수립",
    execution: (files: number, cmds: number) => `디지털 실행: ${files} 개 파일 수정, ${cmds} 개 테스트 실행`,
    critiquePass: "야당 비평: ✓ 합격 (모든 테스트 통과, 결함 없음)",
    critiqueFail: (flaws: string[]) => `야당 비평: ✗ 결함 발견 (${flaws.join("; ")})`,
    safetyPass: "공안 감사: ✓ 합격 (샌드박스 경계 안전, 금지 명령 없음)",
    voteShip: (score: number) => `내각 표결: 【승인 (SHIP)】 종합 점수: ${score}/100`,
    voteRevise: (score: number) => `내각 표결: 【수정 (REVISE)】 종합 점수: ${score}/100 - 보완 요구`,
    voteBlock: (score: number) => `내각 표결: 【차단 (BLOCK)】 종합 점수: ${score}/100 - 안전 중단`,
    finalShip: "목표가 자율적으로 완전 달성되어 내각의 비준을 받았습니다.",
    finalRevise: "최대 사이클에 도달했으나 미해결 비평 사항이 남아있습니다.",
    finalBlock: "안전 규정 위반으로 실행이 차단되었습니다.",
    evidenceLabel: "증거 번들 (Evidence Bundle)",
    receiptLabel: "영수증 (Receipt)",
    diffLabel: "Git Diff",
    usage: "사용법: naikaku goal \"<목표 과제>\" [옵션]",
    options: "옵션:",
    optWorktree: "--worktree <dir>       작업 디렉터리 (기본값: ./output/goal-worktree)",
    optOut: "--out <dir>            증거 출력 디렉터리",
    optCycles: "--max-cycles <N>       최대 사이클 수 (기본값: 4)",
    optProvider: "--provider <name>      사용할 제공자 (ollama, openai, aliyun 등)",
    optLocale: "--locale <lang>        표시 언어 (ja, en, zh-Hans, zh-Hant, ko)",
    optSmoke: "--smoke                스모크 테스트용 내장 목표 실행",
    optJson: "--json                 JSON 형식으로 출력"
  }
};

async function main() {
  const options = parseGoalArgs(process.argv.slice(2));

  if (options.help) {
    printGoalHelp(options.locale);
    return;
  }

  const t = copy[options.locale] || copy.ja;
  const mission = options.mission || (options.smoke
    ? "Create a high-reliability email and numeric range validator module with comprehensive vitest test coverage"
    : null);

  if (!mission) {
    console.error(`Error: A goal mission is required.\n${t.usage}`);
    process.exitCode = 1;
    return;
  }

  const worktreeDir = options.worktreeDir || path.resolve(process.cwd(), "output/goal-worktree");
  const outputDir = path.resolve(options.outputDir);

  if (!options.json) {
    console.log(`\n🏛️  ${t.hero}`);
    console.log(`- ${t.missionLabel}: "${mission}"`);
    console.log(`- ${t.worktreeLabel}: ${worktreeDir}`);
    console.log(`- ${t.cyclesLabel}: ${options.maxCycles}`);
  }

  const input: GoalEngineInput = {
    mission,
    worktreeDir,
    outputDir,
    maxCycles: options.maxCycles,
    locale: options.locale
  };

  if (options.provider) {
    input.provider = defaultProviderConfig(options.provider);
  }

  const summary = await runAutonomousGoal(input);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status !== "completed") {
      process.exitCode = 1;
    }
    return;
  }

  // Terminal human-readable output
  for (const c of summary.cycles) {
    console.log(t.runningCycle(c.cycle));
    console.log(`  1. ${t.intake}`);
    console.log(`  2. ${t.strategy}`);
    console.log(`  3. ${t.execution(c.execution.modifiedFiles.length + c.execution.createdFiles.length, c.execution.commandResults.length)}`);
    if (c.critique.passed) {
      console.log(`  4. ${t.critiquePass}`);
    } else {
      console.log(`  4. ${t.critiqueFail(c.critique.flaws)}`);
    }
    console.log(`  5. ${t.safetyPass}`);
    if (c.cabinetVote.decision === "ship") {
      console.log(`  6. ${t.voteShip(c.cabinetVote.overallScore)}`);
    } else if (c.cabinetVote.decision === "block") {
      console.log(`  6. ${t.voteBlock(c.cabinetVote.overallScore)}`);
    } else {
      console.log(`  6. ${t.voteRevise(c.cabinetVote.overallScore)}`);
    }
  }

  console.log("\n------------------------------------------------------------");
  if (summary.status === "completed") {
    console.log(`✅  ${t.finalShip}`);
  } else if (summary.status === "blocked") {
    console.log(`❌  ${t.finalBlock}`);
  } else {
    console.log(`⚠️  ${t.finalRevise}`);
  }

  console.log(`- ${t.evidenceLabel}: ${summary.evidencePath}`);
  console.log(`- ${t.receiptLabel}: ${summary.receiptPath}`);
  console.log(`- ${t.diffLabel}: ${path.join(outputDir, "git.diff")}`);
  console.log("------------------------------------------------------------\n");

  if (summary.status !== "completed") {
    process.exitCode = 1;
  }
}

function parseGoalArgs(args: string[]): NaikakuGoalCliOptions {
  const options: NaikakuGoalCliOptions = {
    mission: null,
    worktreeDir: null,
    outputDir: path.resolve(process.cwd(), `output/goals/${new Date().toISOString().replace(/[:.]/g, "-")}`),
    maxCycles: 4,
    provider: null,
    locale: normalizeLocale(process.env.NAIKAKU_CLI_LOCALE) || "ja",
    json: false,
    smoke: false,
    help: false
  };

  const positional: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--smoke") {
      options.smoke = true;
    } else if (arg === "--worktree") {
      options.worktreeDir = args[i + 1] ? path.resolve(args[i + 1]) : null;
      i += 1;
    } else if (arg === "--out") {
      if (args[i + 1]) options.outputDir = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === "--max-cycles") {
      if (args[i + 1]) options.maxCycles = parseInt(args[i + 1], 10) || 4;
      i += 1;
    } else if (arg === "--provider") {
      if (args[i + 1]) options.provider = args[i + 1] as ProviderKind;
      i += 1;
    } else if (arg === "--locale") {
      if (args[i + 1]) options.locale = normalizeLocale(args[i + 1]) || "ja";
      i += 1;
    } else if (arg === "--mission") {
      if (args[i + 1]) options.mission = args[i + 1];
      i += 1;
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  if (!options.mission && positional.length > 0) {
    options.mission = positional.join(" ");
  }

  return options;
}

function normalizeLocale(val?: string): SupportedLocale | null {
  return typeof val === "string" && supportedLocales.some((loc) => loc.code === val)
    ? (val as SupportedLocale)
    : null;
}

function printGoalHelp(locale: SupportedLocale) {
  const t = copy[locale] || copy.ja;
  console.log(`\n${t.hero}`);
  console.log(`\n${t.usage}`);
  console.log(`\n${t.options}`);
  console.log(`  ${t.optWorktree}`);
  console.log(`  ${t.optOut}`);
  console.log(`  ${t.optCycles}`);
  console.log(`  ${t.optProvider}`);
  console.log(`  ${t.optLocale}`);
  console.log(`  ${t.optSmoke}`);
  console.log(`  ${t.optJson}`);
  console.log("");
}

function defaultProviderConfig(provider: ProviderKind): ProviderConfig {
  if (provider === "ollama") {
    return {
      provider: "ollama",
      endpoint: "http://127.0.0.1:11434/v1",
      model: process.env.NAIKAKU_OLLAMA_MODEL || "qwen2.5-coder:latest",
      apiKeyAlias: "",
      temperature: 0.2,
      maxTokens: 2000
    };
  }
  if (provider === "aliyun") {
    return {
      provider: "aliyun",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-turbo",
      apiKeyAlias: "DASHSCOPE_API_KEY",
      temperature: 0.2,
      maxTokens: 1500
    };
  }
  if (provider === "anthropic") {
    return {
      provider: "anthropic",
      endpoint: "https://api.anthropic.com/v1/messages",
      model: "claude-sonnet-4.5",
      apiKeyAlias: "NAIKAKU_ANTHROPIC_API_KEY",
      temperature: 0.2,
      maxTokens: 2000
    };
  }
  return {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    model: "gpt-5.4",
    apiKeyAlias: "NAIKAKU_OPENAI_API_KEY",
    temperature: 0.2,
    maxTokens: 2000
  };
}

main().catch((err) => {
  console.error("naikaku goal error:", err);
  process.exit(1);
});
