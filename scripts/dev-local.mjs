#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = readPort(process.env.NAIKAKU_GATEWAY_PORT || "8787");
const host = process.env.NAIKAKU_GATEWAY_HOST || "127.0.0.1";
const healthHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
const healthUrl = `http://${healthHost}:${port}/health`;
const tsx = localBinary("tsx");
const vite = localBinary("vite");
const viteArgs = withDefaultViteHost(process.argv.slice(2));
let gatewayChild = null;
let viteChild = null;
let stopping = false;

main().catch((error) => {
  console.error(`Naikaku local workbench could not start: ${messageOf(error)}`);
  stopChildren();
  process.exitCode = 1;
});

async function main() {
  if (await gatewayIsReady()) {
    console.log(`Naikaku local gateway is already ready at ${healthUrl}.`);
  } else {
    console.log(`Starting Naikaku local gateway at ${healthUrl}.`);
    gatewayChild = spawn(tsx, ["server/gateway.ts"], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    gatewayChild.once("error", (error) => {
      if (!stopping) {
        console.error(`Naikaku local gateway could not start: ${messageOf(error)}`);
        stopChildren();
        process.exitCode = 1;
      }
    });
    await waitForGateway(gatewayChild);
  }

  console.log("Starting Naikaku Workbench. Press Ctrl+C to stop the Workbench and its local gateway.");
  viteChild = spawn(vite, viteArgs, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  viteChild.once("error", (error) => {
    if (!stopping) {
      console.error(`Naikaku Workbench could not start: ${messageOf(error)}`);
      stopChildren();
      process.exitCode = 1;
    }
  });
  viteChild.once("exit", (code, signal) => {
    if (!stopping && (code !== 0 || signal)) {
      console.error(
        `Naikaku Workbench stopped with ${signal ? `signal ${signal}` : `code ${code ?? 1}`}.`,
      );
      process.exitCode = code || 1;
    }
    stopChildren();
  });

  if (gatewayChild) {
    gatewayChild.once("exit", (code, signal) => {
      if (!stopping && viteChild) {
        console.error(
          `Naikaku local gateway stopped with ${signal ? `signal ${signal}` : `code ${code ?? 1}`}.`,
        );
        process.exitCode = code || 1;
        stopChildren();
      }
    });
  }
}

function localBinary(name) {
  const executable = resolve(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name,
  );
  if (!existsSync(executable)) {
    throw new Error(`Local ${name} is unavailable. Run npm ci in ${root} first.`);
  }
  return executable;
}

function readPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("NAIKAKU_GATEWAY_PORT must be a valid TCP port.");
  }
  return port;
}

function withDefaultViteHost(args) {
  const hasHost = args.some((arg) => arg === "--host" || arg.startsWith("--host="));
  return hasHost ? args : ["--host", "127.0.0.1", ...args];
}

async function waitForGateway(child) {
  const deadline = Date.now() + 6_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Local gateway exited with code ${child.exitCode} before it became ready.`);
    }
    if (await gatewayIsReady()) return;
    await sleep(100);
  }
  throw new Error(`Local gateway did not become ready at ${healthUrl}.`);
}

async function gatewayIsReady() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    const payload = await response.json().catch(() => null);
    return response.ok && payload?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function stopChildren() {
  if (stopping) return;
  stopping = true;
  for (const child of [viteChild, gatewayChild]) {
    if (child && child.exitCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => stopChildren());
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
