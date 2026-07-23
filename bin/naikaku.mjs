#!/usr/bin/env node

import { spawn } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
const [command = "help", ...args] = process.argv.slice(2);
const supportedLocales = ["ja", "en", "zh-Hans", "zh-Hant", "ko"];
let colorEnabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const copy = {
  ja: {
    product: "Naikaku AI Togo",
    subtitle: "内閣ワークベンチ CLI",
    helpLead: "ローカルの AI 作業を、承認・証跡・人間の確認のもとで進めます。",
    usage: "使い方",
    commands: "主なコマンド",
    firstSteps: "最短の始め方",
    doctor: "本機と local gateway を読むだけで確認します。モデルや Coding CLI は実行しません。",
    start: "ブラウザの Workbench を起動します。",
    gateway: "ローカル gateway を起動します。",
    task: "統制された task を準備します。既定では外部 runner を始めません。",
    verify: "公開ソースの検証一式を実行します。",
    version: "CLI のバージョンを表示します。",
    boundary: "provider key は受け取りません。Coding CLI の認証情報は upstream CLI と本機に残ります。",
    doctorTitle: "ローカル準備状況",
    doctorLead: "検出だけを行う read-only check です。",
    runtime: "実行環境",
    node: "Node.js",
    dependencies: "ローカル依存関係",
    gatewayStatus: "local gateway",
    codingCli: "Coding CLI",
    ready: "準備完了",
    detected: "検出済み",
    missing: "未導入",
    unavailable: "未起動",
    needsNode: "Node.js 22 以上が必要",
    needsInstall: "npm ci が必要",
    next: "次に行うこと",
    nextGateway: "gateway を起動する",
    nextWorkbench: "Workbench を起動する",
    nextTask: "まず task を準備する",
    doctorBoundary: "この確認では、モデル、provider、Coding CLI、desktop automation を実行しません。",
    taskTitle: "統制された task",
    taskLead: "依頼を最初に reviewable な task と証跡へ変換します。",
    sampleMission: "レビュー可能な実装計画を準備する",
    defaultTask: "既定: task と evidence package を準備するだけです。",
    fixtureTask: "fixture だけで、ローカルの安全な実行経路を確認します。モデルは呼びません。",
    advancedTask: "実行可能な runner は Workbench で、対象 worktree と今回だけの承認を確認してから有効化します。",
    advancedHelp: "詳細な task option を見る",
    invalidLocale: "対応していない locale です。",
    unknownCommand: "不明なコマンドです"
  },
  en: {
    product: "Naikaku AI Togo",
    subtitle: "Cabinet Workbench CLI",
    helpLead: "Run local AI work with approvals, evidence, and human review.",
    usage: "Usage",
    commands: "Primary commands",
    firstSteps: "Quick start",
    doctor: "Read local prerequisites and the local gateway only. It never runs a model or Coding CLI.",
    start: "Start the browser Workbench.",
    gateway: "Start the local gateway.",
    task: "Prepare a governed task. It does not start an external runner by default.",
    verify: "Run the public-source verification suite.",
    version: "Print the CLI version.",
    boundary: "The CLI never accepts provider keys. Coding CLI credentials remain with the upstream CLI and this machine.",
    doctorTitle: "Local readiness",
    doctorLead: "A read-only inspection only.",
    runtime: "Runtime",
    node: "Node.js",
    dependencies: "Local dependencies",
    gatewayStatus: "Local gateway",
    codingCli: "Coding CLI",
    ready: "Ready",
    detected: "Detected",
    missing: "Not installed",
    unavailable: "Not running",
    needsNode: "Node.js 22+ required",
    needsInstall: "Run npm ci",
    next: "Next steps",
    nextGateway: "Start the gateway",
    nextWorkbench: "Start the Workbench",
    nextTask: "Prepare a task first",
    doctorBoundary: "This check does not run models, providers, Coding CLIs, or desktop automation.",
    taskTitle: "Governed task",
    taskLead: "Turn a request into a reviewable task and evidence package first.",
    sampleMission: "Prepare a reviewed implementation plan",
    defaultTask: "Default: prepare a task and evidence package only.",
    fixtureTask: "Use the fixture to prove the safe local path without calling a model.",
    advancedTask: "Enable a runnable local CLI from the Workbench only after selecting a worktree and approving that run.",
    advancedHelp: "Show detailed task options",
    invalidLocale: "Unsupported locale.",
    unknownCommand: "Unknown command"
  },
  "zh-Hans": {
    product: "Naikaku AI Togo",
    subtitle: "AI 内阁工作台 CLI",
    helpLead: "让本地 AI 工作在审批、证据和人工确认之下进行。",
    usage: "用法",
    commands: "常用命令",
    firstSteps: "快速开始",
    doctor: "仅检查本机和本地 gateway，不会运行模型或 Coding CLI。",
    start: "启动浏览器工作台。",
    gateway: "启动本地 gateway。",
    task: "准备受治理任务；默认不启动外部 runner。",
    verify: "运行开源验证套件。",
    version: "显示 CLI 版本。",
    boundary: "CLI 不接收 provider key。Coding CLI 登录信息保留在上游 CLI 和本机。",
    doctorTitle: "本机准备情况",
    doctorLead: "这是只读检查。",
    runtime: "运行环境",
    node: "Node.js",
    dependencies: "本地依赖",
    gatewayStatus: "本地 gateway",
    codingCli: "Coding CLI",
    ready: "已就绪",
    detected: "已检测",
    missing: "未安装",
    unavailable: "未启动",
    needsNode: "需要 Node.js 22+",
    needsInstall: "请运行 npm ci",
    next: "下一步",
    nextGateway: "启动 gateway",
    nextWorkbench: "启动工作台",
    nextTask: "先准备任务",
    doctorBoundary: "此检查不会运行模型、provider、Coding CLI 或桌面自动化。",
    taskTitle: "受治理任务",
    taskLead: "先将请求变成可审查的任务和证据包。",
    sampleMission: "准备可审查的实现计划",
    defaultTask: "默认：只准备任务和证据包。",
    fixtureTask: "使用 fixture 验证安全本地路径，不调用模型。",
    advancedTask: "只有在工作台选择 worktree 并确认本次授权后，才会启用可执行的本地 CLI。",
    advancedHelp: "查看详细 task 选项",
    invalidLocale: "不支持的 locale。",
    unknownCommand: "未知命令"
  },
  "zh-Hant": {
    product: "Naikaku AI Togo",
    subtitle: "AI 內閣工作台 CLI",
    helpLead: "讓本機 AI 工作在核准、證據與人工確認下進行。",
    usage: "用法",
    commands: "常用指令",
    firstSteps: "快速開始",
    doctor: "只檢查本機與 local gateway，不會執行模型或 Coding CLI。",
    start: "啟動瀏覽器工作台。",
    gateway: "啟動 local gateway。",
    task: "準備受治理的 task；預設不啟動外部 runner。",
    verify: "執行開源驗證套件。",
    version: "顯示 CLI 版本。",
    boundary: "CLI 不接收 provider key。Coding CLI 認證資訊保留於上游 CLI 和本機。",
    doctorTitle: "本機準備狀況",
    doctorLead: "這是唯讀檢查。",
    runtime: "執行環境",
    node: "Node.js",
    dependencies: "本機相依項",
    gatewayStatus: "local gateway",
    codingCli: "Coding CLI",
    ready: "已就緒",
    detected: "已偵測",
    missing: "未安裝",
    unavailable: "未啟動",
    needsNode: "需要 Node.js 22+",
    needsInstall: "請執行 npm ci",
    next: "下一步",
    nextGateway: "啟動 gateway",
    nextWorkbench: "啟動工作台",
    nextTask: "先準備 task",
    doctorBoundary: "此檢查不會執行模型、provider、Coding CLI 或桌面自動化。",
    taskTitle: "受治理 task",
    taskLead: "先將請求轉為可檢閱的 task 與證據包。",
    sampleMission: "準備可檢閱的實作計畫",
    defaultTask: "預設：只準備 task 和證據包。",
    fixtureTask: "使用 fixture 驗證安全的本機路徑，不呼叫模型。",
    advancedTask: "只有在工作台選定 worktree 並核准這次執行後，才會啟用可執行的本機 CLI。",
    advancedHelp: "查看詳細 task 選項",
    invalidLocale: "不支援的 locale。",
    unknownCommand: "未知指令"
  },
  ko: {
    product: "Naikaku AI Togo",
    subtitle: "AI Cabinet Workbench CLI",
    helpLead: "승인, 증적, 사람의 확인 아래에서 로컬 AI 작업을 진행합니다.",
    usage: "사용법",
    commands: "주요 명령",
    firstSteps: "빠른 시작",
    doctor: "로컬 준비 상태와 gateway만 읽습니다. 모델이나 Coding CLI를 실행하지 않습니다.",
    start: "브라우저 Workbench를 시작합니다.",
    gateway: "로컬 gateway를 시작합니다.",
    task: "관리되는 task를 준비합니다. 기본값으로 외부 runner를 시작하지 않습니다.",
    verify: "오픈 소스 검증 모음을 실행합니다.",
    version: "CLI 버전을 표시합니다.",
    boundary: "CLI는 provider key를 받지 않습니다. Coding CLI 인증 정보는 upstream CLI와 이 컴퓨터에 남습니다.",
    doctorTitle: "로컬 준비 상태",
    doctorLead: "읽기 전용 검사입니다.",
    runtime: "실행 환경",
    node: "Node.js",
    dependencies: "로컬 의존성",
    gatewayStatus: "로컬 gateway",
    codingCli: "Coding CLI",
    ready: "준비 완료",
    detected: "감지됨",
    missing: "설치되지 않음",
    unavailable: "실행되지 않음",
    needsNode: "Node.js 22+ 필요",
    needsInstall: "npm ci 실행 필요",
    next: "다음 단계",
    nextGateway: "gateway 시작",
    nextWorkbench: "Workbench 시작",
    nextTask: "먼저 task 준비",
    doctorBoundary: "이 검사는 모델, provider, Coding CLI 또는 데스크톱 자동화를 실행하지 않습니다.",
    taskTitle: "관리되는 task",
    taskLead: "요청을 먼저 검토 가능한 task와 증적 패키지로 만듭니다.",
    sampleMission: "검토 가능한 구현 계획을 준비합니다",
    defaultTask: "기본값: task와 증적 패키지만 준비합니다.",
    fixtureTask: "fixture로 모델 호출 없이 안전한 로컬 경로를 확인합니다.",
    advancedTask: "Workbench에서 worktree를 선택하고 이번 실행을 승인한 뒤에만 실행 가능한 로컬 CLI를 활성화합니다.",
    advancedHelp: "세부 task 옵션 보기",
    invalidLocale: "지원하지 않는 locale입니다.",
    unknownCommand: "알 수 없는 명령입니다"
  }
};

main().catch((error) => {
  console.error(`${tone("Naikaku", "danger")}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

async function main() {
  switch (command) {
    case "help":
    case "--help":
    case "-h": {
      const display = parseDisplayOptions(args);
      applyDisplayOptions(display);
      printHelp(display.locale);
      return;
    }
    case "--version":
    case "-v":
    case "version":
      console.log(packageJson.version);
      return;
    case "doctor":
      await runDoctor(args);
      return;
    case "start":
    case "dev":
      await runLocalBinary("vite", args);
      return;
    case "gateway":
      await runTsx("server/gateway.ts", args);
      return;
    case "task":
      if (args.includes("--help") || args.includes("-h")) {
        const display = parseDisplayOptions(args);
        applyDisplayOptions(display);
        printTaskHelp(display.locale);
        return;
      }
      await runTsx("scripts/naikaku-task.ts", args);
      return;
    case "verify":
      await runNpm(["run", "ci:open-source", ...args]);
      return;
    default: {
      const display = parseDisplayOptions(args);
      applyDisplayOptions(display);
      console.error(`${copy[display.locale].unknownCommand}: ${command}`);
      printHelp(display.locale);
      process.exitCode = 1;
    }
  }
}

function printHelp(locale) {
  const text = copy[locale];
  printHero({ locale, title: text.subtitle, lead: text.helpLead });
  printSection(text.usage);
  printCode("naikaku <command> [options]");
  printSection(text.commands);
  printCommand("naikaku doctor", text.doctor);
  printCommand("naikaku start", text.start);
  printCommand("naikaku gateway", text.gateway);
  printCommand("naikaku task \"...\"", text.task);
  printCommand("naikaku verify", text.verify);
  printCommand("naikaku version", text.version);
  printSection(text.firstSteps);
  printCode("npm run naikaku -- doctor");
  printCode("npm link && naikaku doctor");
  printCode("naikaku start");
  printNotice(text.boundary);
}

function printTaskHelp(locale) {
  const text = copy[locale];
  printHero({ locale, title: text.taskTitle, lead: text.taskLead });
  printSection(text.usage);
  printCode(`naikaku task ${JSON.stringify(text.sampleMission)}`);
  printCommand("naikaku task \"...\"", text.defaultTask);
  printCommand("naikaku task --self-test \"...\"", text.fixtureTask);
  printSection(text.next);
  printNotice(text.advancedTask);
  printCommand("npm run naikaku:task -- --help", text.advancedHelp);
}

async function runDoctor(args) {
  const options = parseDoctorArgs(args);
  applyDisplayOptions(options);
  if (options.help) {
    printDoctorHelp(options.locale);
    return;
  }

  const gateway = await inspectGateway(options.gatewayUrl);
  const report = {
    schema: "naikaku.cli-doctor.v1",
    version: packageJson.version,
    projectRoot,
    node: {
      version: process.version,
      compatible: Number(process.versions.node.split(".")[0]) >= 22
    },
    dependenciesInstalled: existsSync(resolve(projectRoot, "node_modules", "tsx")),
    gateway,
    codingCli: ["codex", "claude", "qwen"].map((name) => ({
      command: name,
      path: findOnPath(name)
    })),
    claimBoundary: "Doctor only locates local commands and reads the local gateway health endpoint. It does not execute models, coding CLIs, provider calls, or desktop automation."
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printDoctor(report, options.locale);
}

function printDoctor(report, locale) {
  const text = copy[locale];
  printHero({ locale, title: text.doctorTitle, lead: text.doctorLead });
  printSection(text.runtime);
  printStatus(text.node, report.node.compatible ? text.ready : text.needsNode, report.node.compatible ? "ready" : "warning", report.node.version);
  printStatus(text.dependencies, report.dependenciesInstalled ? text.ready : text.needsInstall, report.dependenciesInstalled ? "ready" : "warning");
  printStatus(text.gatewayStatus, report.gateway.status === "ready" ? text.ready : text.unavailable, report.gateway.status === "ready" ? "ready" : "warning", report.gateway.service || undefined);
  printSection(text.codingCli);
  for (const item of report.codingCli) {
    printStatus(displayCliName(item.command), item.path ? text.detected : text.missing, item.path ? "ready" : "muted");
  }
  printSection(text.next);
  if (report.gateway.status !== "ready") {
    printCommand("naikaku gateway", text.nextGateway);
  }
  printCommand("naikaku start", text.nextWorkbench);
  printCommand("naikaku task \"...\"", text.nextTask);
  printNotice(text.doctorBoundary);
}

function printDoctorHelp(locale) {
  const text = copy[locale];
  printHero({ locale, title: text.doctorTitle, lead: text.doctorLead });
  printSection(text.usage);
  printCode("naikaku doctor [--gateway <url>] [--locale <ja|en|zh-Hans|zh-Hant|ko>] [--no-color] [--json]");
  printNotice(text.doctorBoundary);
}

function parseDoctorArgs(args) {
  const options = {
    gatewayUrl: process.env.NAIKAKU_GATEWAY_URL || `http://127.0.0.1:${process.env.NAIKAKU_GATEWAY_PORT || "8787"}`,
    json: false,
    help: false,
    ...defaultDisplayOptions()
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--gateway") {
      const value = args[index + 1];
      if (!value) throw new Error("--gateway requires a URL.");
      options.gatewayUrl = value;
      index += 1;
    } else if (arg === "--locale") {
      options.locale = parseLocale(args[index + 1]);
      index += 1;
    } else if (arg === "--no-color") {
      options.noColor = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unsupported doctor option: ${arg}`);
    }
  }

  return options;
}

function parseDisplayOptions(args) {
  const options = defaultDisplayOptions();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--locale") {
      options.locale = parseLocale(args[index + 1]);
      index += 1;
    } else if (arg === "--no-color") {
      options.noColor = true;
    }
  }
  return options;
}

function defaultDisplayOptions() {
  return {
    locale: normalizeLocale(process.env.NAIKAKU_CLI_LOCALE) || "ja",
    noColor: false
  };
}

function parseLocale(value) {
  const locale = normalizeLocale(value);
  if (locale) return locale;
  throw new Error(`${copy.ja.invalidLocale} ${supportedLocales.join(", ")}`);
}

function normalizeLocale(value) {
  return typeof value === "string" && supportedLocales.includes(value) ? value : null;
}

function applyDisplayOptions(options) {
  if (options.noColor) colorEnabled = false;
}

async function inspectGateway(gatewayUrl) {
  let healthUrl;
  try {
    healthUrl = new URL("/health", gatewayUrl);
  } catch {
    return { status: "invalid gateway URL", service: null, url: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1_500);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      return { status: `unhealthy (${response.status})`, service: null, url: displayUrl(healthUrl) };
    }
    return {
      status: "ready",
      service: typeof payload.service === "string" ? payload.service : null,
      url: displayUrl(healthUrl)
    };
  } catch {
    return { status: "not running", service: null, url: displayUrl(healthUrl) };
  } finally {
    clearTimeout(timer);
  }
}

function displayUrl(value) {
  const safe = new URL(value);
  safe.username = "";
  safe.password = "";
  return safe.toString();
}

function printHero({ locale, title, lead }) {
  const text = copy[locale];
  if (colorEnabled) {
    const width = Math.max(52, Math.min(76, process.stdout.columns || 76));
    console.log(tone(`╭${"─".repeat(width - 2)}╮`, "line"));
    console.log(`│  ${tone(text.product, "brand")} ${tone(`v${packageJson.version}`, "muted")}`);
    console.log(`│  ${tone(title, "strong")}`);
    console.log(`│  ${tone(lead, "muted")}`);
    console.log(tone(`╰${"─".repeat(width - 2)}╯`, "line"));
    return;
  }

  console.log(`${text.product} v${packageJson.version}`);
  console.log(title);
  console.log(lead);
}

function printSection(title) {
  console.log("");
  console.log(`  ${tone(title, "brand")}`);
}

function printCode(commandLine) {
  console.log(`  ${tone(commandLine, "command")}`);
}

function printCommand(commandLine, description) {
  console.log(`  ${tone(commandLine, "command")}`);
  console.log(`    ${tone(description, "muted")}`);
}

function printStatus(label, status, state, detail) {
  const badge = state === "ready" ? "●" : state === "warning" ? "!" : "○";
  const color = state === "ready" ? "success" : state === "warning" ? "warning" : "muted";
  const suffix = detail ? ` ${tone(detail, "muted")}` : "";
  console.log(`  ${tone(badge, color)} ${tone(label, "strong")}  ${tone(status, color)}${suffix}`);
}

function printNotice(message) {
  console.log("");
  const marker = colorEnabled ? "◇" : "[info]";
  console.log(`  ${tone(marker, "brand")} ${tone(message, "muted")}`);
}

function displayCliName(commandName) {
  if (commandName === "codex") return "Codex CLI";
  if (commandName === "claude") return "Claude Code";
  return "Qwen Code";
}

function tone(value, kind) {
  if (!colorEnabled) return value;
  const codes = {
    brand: "38;5;37",
    strong: "1;38;5;255",
    muted: "38;5;246",
    command: "1;38;5;111",
    success: "38;5;42",
    warning: "38;5;214",
    danger: "38;5;203",
    line: "38;5;67"
  };
  return `\u001b[${codes[kind] || codes.muted}m${value}\u001b[0m`;
}

async function runTsx(script, commandArgs) {
  await runLocalBinary("tsx", [script, ...commandArgs]);
}

async function runLocalBinary(binary, commandArgs) {
  const executable = resolve(projectRoot, "node_modules", ".bin", process.platform === "win32" ? `${binary}.cmd` : binary);
  if (!existsSync(executable)) {
    throw new Error(`Local ${binary} is unavailable. Run npm ci in ${projectRoot} first.`);
  }
  await runProcess(executable, commandArgs);
}

async function runNpm(commandArgs) {
  await runProcess(process.platform === "win32" ? "npm.cmd" : "npm", commandArgs);
}

function runProcess(executable, commandArgs) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, commandArgs, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${executable} exited with ${signal ? `signal ${signal}` : `code ${code ?? 1}`}.`));
    });
  });
}

function findOnPath(commandName) {
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];
  const paths = (process.env.PATH || "").split(delimiter).filter(Boolean);

  for (const directory of paths) {
    for (const extension of extensions) {
      const candidate = resolve(directory, `${commandName}${extension}`);
      if (!existsSync(candidate)) continue;
      try {
        if (process.platform !== "win32") accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Keep scanning: a non-executable file with the same name is not a CLI.
      }
    }
  }
  return null;
}
