import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  evaluateRunnerAuth,
  runnerAuthPosture,
  runnerCanUseExecutorProfile,
  type RunnerAuthEnv
} from "../server/runnerAuth";
import type { ExecutorProfileId, RunnerAuthDrillSummary } from "../src/domain/types";

interface RunnerAuthDrillOptions {
  outputDir: string;
  generatedAt: string;
  help: boolean;
}

const executorProfiles: ExecutorProfileId[] = [
  "browser-sandbox",
  "desktop-vm",
  "shell-container",
  "mcp-proxy",
  "human-approval"
];

const scopedEnv: RunnerAuthEnv = {
  NAIKAKU_RUNNER_TOKEN: "legacy-token",
  NAIKAKU_RUNNER_CREDENTIALS: JSON.stringify([
    {
      runnerId: "shell-runner-01",
      token: "shell-token",
      executorProfiles: ["shell-container"],
      rotatedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2999-01-01T00:00:00.000Z"
    },
    {
      runnerId: "browser-runner-01",
      tokenSha256: sha256("browser-token"),
      executorProfiles: ["browser-sandbox"],
      rotatedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2999-01-01T00:00:00.000Z"
    },
    {
      runnerId: "expired-runner-01",
      token: "expired-token",
      executorProfiles: ["desktop-vm"],
      rotatedAt: "2025-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:00:00.000Z"
    }
  ])
};

const rawTokens = ["legacy-token", "shell-token", "browser-token", "expired-token"];

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(options.outputDir);
  const generatedAt = options.generatedAt;
  const now = new Date(generatedAt);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const posture = runnerAuthPosture(scopedEnv, now);
  const cases = [
    caseSummary({
      id: "development-open-visible",
      decision: evaluateRunnerAuth({
        headers: {},
        env: {},
        now
      }),
      requestedProfile: "shell-container",
      deniedProfile: "browser-sandbox",
      passed: (decision) =>
        decision.ok &&
        decision.mode === "development-open" &&
        decision.allExecutorProfiles
    }),
    caseSummary({
      id: "shared-token-legacy-compatible",
      decision: evaluateRunnerAuth({
        headers: {
          "x-naikaku-runner-id": "legacy-runner-01",
          "x-naikaku-runner-token": "legacy-token"
        },
        env: {
          NAIKAKU_RUNNER_TOKEN: "legacy-token"
        },
        now
      }),
      requestedProfile: "desktop-vm",
      deniedProfile: "shell-container",
      passed: (decision) =>
        decision.ok &&
        decision.mode === "shared-token-required" &&
        decision.allExecutorProfiles
    }),
    caseSummary({
      id: "scoped-shell-runner-limited",
      decision: evaluateRunnerAuth({
        headers: {
          "x-naikaku-runner-id": "shell-runner-01",
          "x-naikaku-runner-token": "shell-token"
        },
        env: scopedEnv,
        now
      }),
      requestedProfile: "shell-container",
      deniedProfile: "browser-sandbox",
      passed: (decision) =>
        decision.ok &&
        decision.mode === "scoped-credentials-required" &&
        !decision.allExecutorProfiles &&
        runnerCanUseExecutorProfile(decision, "shell-container") &&
        !runnerCanUseExecutorProfile(decision, "browser-sandbox")
    }),
    caseSummary({
      id: "scoped-hash-token-accepted",
      decision: evaluateRunnerAuth({
        headers: {
          "x-naikaku-runner-id": "browser-runner-01",
          authorization: "Bearer browser-token"
        },
        env: scopedEnv,
        now
      }),
      requestedProfile: "browser-sandbox",
      deniedProfile: "shell-container",
      passed: (decision) =>
        decision.ok &&
        decision.allowedExecutorProfiles.length === 1 &&
        decision.allowedExecutorProfiles[0] === "browser-sandbox" &&
        Boolean(decision.tokenFingerprint)
    }),
    caseSummary({
      id: "expired-scoped-runner-rejected",
      decision: evaluateRunnerAuth({
        headers: {
          "x-naikaku-runner-id": "expired-runner-01",
          "x-naikaku-runner-token": "expired-token"
        },
        env: scopedEnv,
        now
      }),
      requestedProfile: "desktop-vm",
      deniedProfile: "shell-container",
      passed: (decision) =>
        !decision.ok &&
        decision.auditTags.includes("credential-expired")
    }),
    caseSummary({
      id: "malformed-scoped-config-fails-closed",
      decision: evaluateRunnerAuth({
        headers: {
          "x-naikaku-runner-id": "shell-runner-01",
          "x-naikaku-runner-token": "shell-token"
        },
        env: {
          NAIKAKU_RUNNER_CREDENTIALS: "{broken"
        },
        now
      }),
      requestedProfile: "shell-container",
      deniedProfile: "browser-sandbox",
      passed: (decision) =>
        !decision.ok &&
        decision.mode === "misconfigured" &&
        decision.auditTags.includes("misconfigured")
    })
  ];
  const passed = cases.filter((item) => item.passed).length;
  const summary: RunnerAuthDrillSummary = {
    schema: "naikaku.runner-auth-drill.v1",
    generatedAt,
    outputDir: relativePath(outputDir),
    source: {
      executorProfiles,
      scopedCredentials: posture.scopedRunnerCredentials.length,
      sharedTokenConfigured: Boolean(scopedEnv.NAIKAKU_RUNNER_TOKEN)
    },
    cases,
    summary: {
      total: cases.length,
      passed,
      failed: cases.length - passed,
      scopedCredentials: posture.scopedRunnerCredentials.length,
      activeScopedCredentials: posture.scopedRunnerCredentials.filter((credential) =>
        credential.status === "active"
      ).length,
      expiredScopedCredentials: posture.scopedRunnerCredentials.filter((credential) =>
        credential.status === "expired"
      ).length
    },
    checks: {
      developmentOpenVisible: cases.find((item) => item.id === "development-open-visible")?.passed === true,
      sharedTokenLegacyCompatible: cases.find((item) => item.id === "shared-token-legacy-compatible")?.passed === true,
      scopedCredentialsPreferred: posture.mode === "scoped-credentials-required",
      scopedShellRunnerLimited: cases.find((item) => item.id === "scoped-shell-runner-limited")?.passed === true,
      scopedHashTokenAccepted: cases.find((item) => item.id === "scoped-hash-token-accepted")?.passed === true,
      expiredCredentialRejected: cases.find((item) => item.id === "expired-scoped-runner-rejected")?.passed === true,
      malformedConfigFailsClosed: cases.find((item) => item.id === "malformed-scoped-config-fails-closed")?.passed === true,
      tokensRedacted: tokensRedacted(cases)
    },
    honestyClaim: {
      level: "runner-auth-drill",
      claim: "This drill self-simulates local runner authentication decisions without starting a gateway or executing runner actions.",
      limitations: [
        "It does not start HTTP routes, run shell/browser/desktop/MCP actions, write ledger evidence, call providers, deploy, or push Git.",
        "It proves scoped credential parsing and authorization decisions only; production still requires real runner identity storage and rotation operations."
      ],
      productionRequirements: [
        "Store runner credentials in a secret manager or equivalent server-side vault.",
        "Rotate scoped credentials before expiresAt and remove expired runner identities.",
        "Keep executor evidence scoped to the authenticated runner profile."
      ]
    }
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeFile(path.join(outputDir, "summary.md"), summaryMarkdown(summary), "utf8");

  printSummary(summary);

  if (!Object.values(summary.checks).every(Boolean)) {
    process.exitCode = 1;
  }
}

function caseSummary({
  id,
  decision,
  requestedProfile,
  deniedProfile,
  passed
}: {
  id: string;
  decision: ReturnType<typeof evaluateRunnerAuth>;
  requestedProfile: ExecutorProfileId;
  deniedProfile: ExecutorProfileId;
  passed: (decision: ReturnType<typeof evaluateRunnerAuth>) => boolean;
}): RunnerAuthDrillSummary["cases"][number] {
  return {
    id,
    passed: passed(decision),
    decisionOk: decision.ok,
    status: decision.status,
    mode: decision.mode,
    runnerId: decision.runnerId || null,
    allowedExecutorProfiles: decision.allowedExecutorProfiles,
    allExecutorProfiles: decision.allExecutorProfiles,
    tokenFingerprint: decision.tokenFingerprint,
    canUseRequestedProfile: runnerCanUseExecutorProfile(decision, requestedProfile),
    canUseDeniedProfile: runnerCanUseExecutorProfile(decision, deniedProfile),
    auditTags: decision.auditTags
  };
}

function tokensRedacted(value: unknown) {
  const serialized = JSON.stringify(value);
  return rawTokens.every((token) => !serialized.includes(token));
}

function summaryMarkdown(summary: RunnerAuthDrillSummary) {
  return [
    "# Runner Auth Drill",
    "",
    `Generated: ${summary.generatedAt}`,
    `Output: ${summary.outputDir}`,
    "",
    "## Summary",
    "",
    `- Cases: ${summary.summary.passed}/${summary.summary.total}`,
    `- Scoped credentials: ${summary.summary.scopedCredentials}`,
    `- Active scoped credentials: ${summary.summary.activeScopedCredentials}`,
    `- Expired scoped credentials: ${summary.summary.expiredScopedCredentials}`,
    "",
    "## Cases",
    "",
    ...summary.cases.map((item) =>
      `- ${item.passed ? "pass" : "fail"}: ${item.id} (${item.mode}, status ${item.status}, runner ${item.runnerId || "none"})`
    ),
    "",
    "## Checks",
    "",
    ...Object.entries(summary.checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Honesty Claim",
    "",
    `- ${summary.honestyClaim.claim}`,
    ...summary.honestyClaim.limitations.map((item) => `- Limitation: ${item}`),
    ...summary.honestyClaim.productionRequirements.map((item) => `- Production requirement: ${item}`),
    ""
  ].join("\n");
}

function parseArgs(args: string[]): RunnerAuthDrillOptions {
  const options: RunnerAuthDrillOptions = {
    outputDir: "output/runner-auth-drill",
    generatedAt: new Date().toISOString(),
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--out") {
      options.outputDir = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--generated-at") {
      options.generatedAt = requireValue(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function requireValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function relativePath(filePath: string) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative && !relative.startsWith("..") ? relative : filePath.replace(/\\/g, "/");
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function printSummary(summary: RunnerAuthDrillSummary) {
  const checkEntries = Object.entries(summary.checks);
  const passed = checkEntries.filter(([, ok]) => ok).length;
  const failed = checkEntries.length - passed;
  console.log(`Runner auth drill: ${failed === 0 ? "passed" : "failed"}`);
  console.log(`Output: ${summary.outputDir}`);
  console.log(`Cases: ${summary.summary.passed}/${summary.summary.total}`);
  console.log(
    `Scoped credentials: ${summary.summary.activeScopedCredentials} active, ` +
    `${summary.summary.expiredScopedCredentials} expired`
  );
  console.log(`Checks: ${passed} pass, ${failed} fail`);
}

function printHelp() {
  console.log(`Naikaku runner auth drill

Usage:
  npm run runner-auth:drill -- [options]

Options:
  --out <dir>           Write runner auth drill output. Default: output/runner-auth-drill
  --generated-at <iso>  Use a stable timestamp.
  --help                Show this help.

The drill self-simulates development-open auth, legacy shared-token auth,
scoped per-runner credentials, token-hash credentials, expired credentials,
and malformed credential fail-closed behavior. It does not start the gateway
or execute runner actions.`);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown runner auth drill failure.");
  process.exitCode = 1;
});
