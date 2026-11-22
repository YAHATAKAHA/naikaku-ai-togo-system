#!/usr/bin/env node
import { copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "output", "huggingface-space");

execFileSync("npm", ["run", "huggingface:build"], {
  cwd: root,
  stdio: "inherit"
});

if (!existsSync(path.join(outputDir, "index.html"))) {
  throw new Error("Hugging Face build did not produce output/huggingface-space/index.html.");
}

rmSync(path.join(outputDir, "naikaku-config.js"), { force: true });

for (const file of ["LICENSE", "NOTICE", "COMMERCIAL-LICENSE.md"]) {
  copyFileSync(path.join(root, file), path.join(outputDir, file));
}

writeFileSync(path.join(outputDir, "README.md"), `---
title: Naikaku AI Togo Demo
sdk: static
app_file: index.html
fullWidth: true
short_description: Browser-only demonstration of a governed multi-agent cabinet workflow
---

# Naikaku AI Togo Demo

日本発の Naikaku AI Togo System にある、複数ロールの合議フローをブラウザだけで確認できる公開デモです。

This Space is a browser-only demonstration of Naikaku's governed multi-agent workflow. It accepts no API key and makes no provider request, local CLI call, code execution, computer-use action, or remote persistence.

For the local workbench, source code, verification steps, and license terms, visit [YAHATAKAHA/naikaku-ai-togo-system](https://github.com/YAHATAKAHA/naikaku-ai-togo-system).

The project is distributed under the [PolyForm Noncommercial License 1.0.0](./LICENSE). Commercial use requires separate written permission from 合同会社EMYSTI; see [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).
`);

console.log("Hugging Face Static Space bundle created.");
console.log(`- ${path.relative(root, outputDir)}`);
console.log("Create a Static Space, then push this directory as its repository root.");
