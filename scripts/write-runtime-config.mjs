#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const outputPath = path.join(distDir, "naikaku-config.js");
const gatewayUrl = (
  process.env.NAIKAKU_PUBLIC_GATEWAY_URL ||
  process.env.VITE_NAIKAKU_GATEWAY_URL ||
  "http://127.0.0.1:8787"
).replace(/\/$/, "");

mkdirSync(distDir, { recursive: true });
writeFileSync(
  outputPath,
  `window.NAIKAKU_CONFIG = ${JSON.stringify({ gatewayUrl }, null, 2)};\n`
);

console.log(`Runtime config written: ${path.relative(root, outputPath)}`);
console.log(`Gateway URL: ${gatewayUrl}`);
