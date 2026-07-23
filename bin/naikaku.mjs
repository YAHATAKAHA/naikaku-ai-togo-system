#!/usr/bin/env node

import { spawn } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
const [command = "help", ...args] = process.argv.slice(2);

main().catch((error) => {
  console.error(`Naikaku CLI error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

async function main() {
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
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
      await runTsx("scripts/naikaku-task.ts", args);
      return;
    case "verify":
      await runNpm(["run", "ci:open-source", ...args]);
      return;
    default:
      console.error(`Unknown Naikaku command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

function printHelp() {
  console.log([
    `Naikaku CLI ${packageJson.version}`,
    "",
    "Usage:",
    "  naikaku <command> [options]",
    "",
    "Commands:",
    "  doctor                 Inspect local prerequisites and the local gateway. Does not run models or coding CLIs.",
    "  start | dev [args]     Start the local workbench.",
    "  gateway                Start the local Naikaku gateway.",
    "  task [task options]    Create a governed task. The default mode prepares evidence only.",
    "  verify                 Run the public-source verification suite.",
    "  version                Print the CLI version.",
    "",
    "Examples:",
    "  npm run naikaku -- doctor",
    "  npm link && naikaku doctor",
    "  naikaku start",
    "  naikaku gateway",
    "  naikaku task \"Prepare a reviewed implementation plan\"",
    "  naikaku task --self-test \"Prove the local fixture path\"",
    "",
    "The CLI never accepts provider keys. Local Coding CLI credentials remain with the upstream CLI."
  ].join("\n"));
}

async function runDoctor(args) {
  const options = parseDoctorArgs(args);
  if (options.help) return;

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

  console.log("Naikaku CLI doctor");
  console.log(`- Node.js: ${report.node.version} (${report.node.compatible ? "compatible" : "Node.js 22+ required"})`);
  console.log(`- local dependencies: ${report.dependenciesInstalled ? "ready" : "missing; run npm ci"}`);
  console.log(`- local gateway: ${gateway.status}${gateway.service ? ` (${gateway.service})` : ""}`);
  console.log("- Coding CLI:");
  for (const item of report.codingCli) {
    console.log(`  - ${item.command}: ${item.path || "not found"}`);
  }
  console.log("- No model, provider, Coding CLI, or desktop action was run.");
}

function parseDoctorArgs(args) {
  const options = {
    gatewayUrl: process.env.NAIKAKU_GATEWAY_URL || `http://127.0.0.1:${process.env.NAIKAKU_GATEWAY_PORT || "8787"}`,
    json: false,
    help: false
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
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: naikaku doctor [--gateway <url>] [--json]");
      options.help = true;
    } else {
      throw new Error(`Unsupported doctor option: ${arg}`);
    }
  }

  return options;
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

async function runTsx(script, args) {
  await runLocalBinary("tsx", [script, ...args]);
}

async function runLocalBinary(binary, args) {
  const executable = resolve(projectRoot, "node_modules", ".bin", process.platform === "win32" ? `${binary}.cmd` : binary);
  if (!existsSync(executable)) {
    throw new Error(`Local ${binary} is unavailable. Run npm ci in ${projectRoot} first.`);
  }
  await runProcess(executable, args);
}

async function runNpm(args) {
  await runProcess(process.platform === "win32" ? "npm.cmd" : "npm", args);
}

function runProcess(executable, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, {
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

function findOnPath(command) {
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];
  const paths = (process.env.PATH || "").split(delimiter).filter(Boolean);

  for (const directory of paths) {
    for (const extension of extensions) {
      const candidate = resolve(directory, `${command}${extension}`);
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
