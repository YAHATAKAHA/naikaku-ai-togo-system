import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

type CheckStatus = "pass" | "warn" | "fail";

interface ReadinessCheck {
  id: string;
  status: CheckStatus;
  summary: string;
  evidence: string[];
  nextAction: string;
}

const checks: ReadinessCheck[] = [
  requiredFileCheck(),
  packageScriptCheck(),
  environmentTemplateCheck(),
  runtimeConfigCheck(),
  containerCheck(),
  commercialLicenseCheck(),
  documentationCheck(),
  publicScopeCheck()
];

const failCount = checks.filter((check) => check.status === "fail").length;
const warnCount = checks.filter((check) => check.status === "warn").length;
const decision = failCount > 0 ? "blocked" : warnCount > 0 ? "needs-review" : "deployment-ready";

console.log(`Naikaku deployment readiness: ${decision}`);
for (const check of checks) {
  console.log(`- [${check.status}] ${check.id}: ${check.summary}`);
  check.evidence.forEach((item) => console.log(`  evidence: ${item}`));
  if (check.status !== "pass") {
    console.log(`  next: ${check.nextAction}`);
  }
}

if (failCount > 0) {
  process.exit(1);
}

function requiredFileCheck(): ReadinessCheck {
  const required = [
    "Dockerfile",
    "compose.yaml",
    ".dockerignore",
    ".env.example",
    "public/naikaku-config.js",
    "scripts/write-runtime-config.mjs",
    "CHANGELOG.md",
    "README.md",
    "README.ja.md",
    "COMMERCIAL-LICENSE.md",
    "docs/commercial-deployment-checklist.md",
    "docs/strategy-iterations.md",
    "docs/adr/README.md",
    "docs/adr/0001-strategy-iteration-gate.md",
    "PUBLIC-SOURCE-SCOPE.md",
    "SECURITY.md"
  ];
  const missing = required.filter((file) => !existsSync(file));

  return {
    id: "required-files",
    status: missing.length ? "fail" : "pass",
    summary: missing.length
      ? `${missing.length} deployment or commercial files are missing.`
      : "Deployment, scope, security, and commercial files are present.",
    evidence: missing.length ? missing : required,
    nextAction: "Restore missing deployment/commercial files before packaging."
  };
}

function packageScriptCheck(): ReadinessCheck {
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const requiredScripts = [
    "build",
    "gateway",
    "preview",
    "runtime-config",
    "preview:self-host",
    "release:mac-dev-package",
    "public-scope:check",
    "strategy:iterate",
    "open-source:mvp-check",
    "ci:open-source"
  ];
  const missing = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

  return {
    id: "package-scripts",
    status: missing.length ? "fail" : "pass",
    summary: missing.length
      ? `${missing.length} expected operator scripts are missing.`
      : "Build, gateway, packaging, and verification scripts are available.",
    evidence: missing.length ? missing : requiredScripts,
    nextAction: "Add missing package scripts or update the deployment guide."
  };
}

function environmentTemplateCheck(): ReadinessCheck {
  const env = parseEnvExample(read(".env.example"));
  const requiredKeys = [
    "VITE_NAIKAKU_GATEWAY_URL",
    "NAIKAKU_PUBLIC_GATEWAY_URL",
    "NAIKAKU_GATEWAY_HOST",
    "NAIKAKU_GATEWAY_PORT",
    "NAIKAKU_WEB_PORT",
    "NAIKAKU_CORS_ORIGIN",
    "NAIKAKU_RUNNER_TOKEN",
    "NAIKAKU_RUNNER_CREDENTIALS",
    "NAIKAKU_ENGINEERING_RUNNER_PRESETS",
    "NAIKAKU_ENGINEERING_RUNNER_PRESETS_FILE",
    "NAIKAKU_LEDGER_DIR"
  ];
  const missing = requiredKeys.filter((key) => !(key in env));
  const filledSecrets = Object.entries(env)
    .filter(([key, value]) => isSecretKey(key) && value.trim())
    .map(([key]) => key);

  if (missing.length || filledSecrets.length) {
    return {
      id: "environment-template",
      status: "fail",
      summary: "Environment template is incomplete or contains filled secret placeholders.",
      evidence: [
        ...missing.map((key) => `missing:${key}`),
        ...filledSecrets.map((key) => `filled-secret:${key}`)
      ],
      nextAction: "Keep secret fields blank and add all documented deployment keys."
    };
  }

  return {
    id: "environment-template",
    status: "pass",
    summary: "Environment template includes deployment keys and keeps secrets blank.",
    evidence: requiredKeys,
    nextAction: "Keep real values only in ignored .env files, CI secrets, vaults, or hosting control panels."
  };
}

function runtimeConfigCheck(): ReadinessCheck {
  const gatewayClient = read("src/domain/gatewayClient.ts");
  const configScript = read("scripts/write-runtime-config.mjs");
  const publicConfig = read("public/naikaku-config.js");
  const indexHtml = read("index.html");
  const ok =
    gatewayClient.includes("window.NAIKAKU_CONFIG") &&
    configScript.includes("NAIKAKU_PUBLIC_GATEWAY_URL") &&
    publicConfig.includes("gatewayUrl") &&
    indexHtml.includes("/naikaku-config.js");

  return {
    id: "runtime-config",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Frontend gateway URL can be changed at deployment runtime."
      : "Runtime gateway configuration is incomplete.",
    evidence: [
      "src/domain/gatewayClient.ts",
      "scripts/write-runtime-config.mjs",
      "public/naikaku-config.js",
      "index.html"
    ],
    nextAction: "Wire the static runtime config before building deployment images."
  };
}

function containerCheck(): ReadinessCheck {
  const dockerfile = read("Dockerfile");
  const compose = read("compose.yaml");
  const dockerignore = read(".dockerignore");
  const requirements = [
    dockerfile.includes("USER naikaku"),
    dockerfile.includes("HEALTHCHECK"),
    dockerfile.includes("FROM node:22-alpine"),
    compose.includes("gateway:"),
    compose.includes("web:"),
    compose.includes("NAIKAKU_RUNNER_CREDENTIALS"),
    dockerignore.includes(".env.*"),
    dockerignore.includes("node_modules"),
    dockerignore.includes(".naikaku-data")
  ];
  const ok = requirements.every(Boolean);

  return {
    id: "container-deployment",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Dockerfile and Compose define separate web/gateway services with health checks and ignored secrets."
      : "Container deployment files are missing expected safety or service settings.",
    evidence: ["Dockerfile", "compose.yaml", ".dockerignore"],
    nextAction: "Keep web/gateway split, non-root runtime, health checks, and secret ignores intact."
  };
}

function commercialLicenseCheck(): ReadinessCheck {
  const commercial = read("COMMERCIAL-LICENSE.md");
  const readme = read("README.md");
  const packageJson = read("package.json");
  const ok =
    commercial.includes("commercial license") &&
    commercial.includes("合同会社EMYSTI") &&
    readme.includes("Commercial use") &&
    packageJson.includes("PolyForm-Noncommercial-1.0.0");

  return {
    id: "commercial-boundary",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "Commercial licensing boundary is visible in package metadata and docs."
      : "Commercial licensing boundary is not clear enough for distribution.",
    evidence: ["package.json", "README.md", "COMMERCIAL-LICENSE.md"],
    nextAction: "State noncommercial source terms and separate written commercial permission clearly."
  };
}

function documentationCheck(): ReadinessCheck {
  const docs = [
    "docs/deployment.md",
    "docs/deployment.ja.md",
    "docs/commercial-deployment-checklist.md",
    "docs/strategy-iterations.md",
    "docs/adr/README.md",
    "docs/adr/0001-strategy-iteration-gate.md"
  ];
  const missing = docs.filter((file) => !existsSync(file));
  if (missing.length) {
    return {
      id: "deployment-docs",
      status: "fail",
      summary: "Deployment guide is missing.",
      evidence: missing,
      nextAction: "Add English and Japanese self-host deployment guides."
    };
  }

  const english = read("docs/deployment.md");
  const japanese = read("docs/deployment.ja.md");
  const ok =
    english.includes("Docker Compose") &&
    english.includes("commercial license") &&
    japanese.includes("Docker Compose") &&
    japanese.includes("商用") &&
    read("docs/commercial-deployment-checklist.md").includes("Commercial Deployment Checklist") &&
    read("docs/strategy-iterations.md").includes("Strategy Iterations") &&
    read("docs/adr/README.md").includes("Architecture Decision Records") &&
    read("docs/adr/0001-strategy-iteration-gate.md").includes("Accepted");

  return {
    id: "deployment-docs",
    status: ok ? "pass" : "fail",
    summary: ok
      ? "English and Japanese deployment guides, strategy gate, and ADR cover self-hosting and commercial boundaries."
      : "Deployment guides exist but do not cover required commercial, deployment, and strategy-gate topics.",
    evidence: docs,
    nextAction: "Document self-host startup, secrets, runtime config, commercial use boundary, and strategy-gate evidence."
  };
}

function publicScopeCheck(): ReadinessCheck {
  try {
    execFileSync("npm", ["run", "public-scope:check"], { stdio: "pipe" });
    return {
      id: "public-source-scope",
      status: "pass",
      summary: "Public source scope check passes.",
      evidence: ["npm run public-scope:check"],
      nextAction: "Keep private deployment files, credentials, and website source out of this repository."
    };
  } catch (error) {
    return {
      id: "public-source-scope",
      status: "fail",
      summary: "Public source scope check failed.",
      evidence: [error instanceof Error ? error.message : "unknown public-scope failure"],
      nextAction: "Remove forbidden files or secret-looking content before deployment packaging."
    };
  }
}

function read(file: string) {
  return readFileSync(file, "utf8");
}

function parseEnvExample(text: string) {
  return Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function isSecretKey(key: string) {
  return /(?:API_KEY|TOKEN|CREDENTIALS)$/.test(key);
}
