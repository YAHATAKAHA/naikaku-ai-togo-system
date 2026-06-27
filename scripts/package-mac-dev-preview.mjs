#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const name = `${pkg.name}-${version}-mac-dev-preview`;
const outDir = path.join(root, "output", "release");
const tarPath = path.join(outDir, `${name}.tar.gz`);
const zipPath = path.join(outDir, `${name}.zip`);
const checksumsPath = path.join(outDir, "CHECKSUMS-SHA256.txt");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function assertCleanTrackedFiles() {
  const unstaged = git(["diff", "--name-only"]);
  const staged = git(["diff", "--cached", "--name-only"]);

  if (unstaged || staged) {
    console.error("Refusing to package while tracked files are dirty.");
    console.error("Commit or stash tracked changes before creating a release archive.");
    if (unstaged) console.error(`Unstaged:\n${unstaged}`);
    if (staged) console.error(`Staged:\n${staged}`);
    process.exit(1);
  }
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

assertCleanTrackedFiles();
mkdirSync(outDir, { recursive: true });

git(["archive", "--format=tar.gz", `--prefix=${name}/`, "-o", tarPath, "HEAD"]);
git(["archive", "--format=zip", `--prefix=${name}/`, "-o", zipPath, "HEAD"]);

const lines = [
  `${sha256(tarPath)}  ${path.basename(tarPath)}`,
  `${sha256(zipPath)}  ${path.basename(zipPath)}`,
  "",
];

writeFileSync(checksumsPath, lines.join("\n"));

console.log("Mac developer preview package created.");
console.log(`- ${path.relative(root, tarPath)}`);
console.log(`- ${path.relative(root, zipPath)}`);
console.log(`- ${path.relative(root, checksumsPath)}`);
