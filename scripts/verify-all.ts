import { spawn } from "node:child_process";

interface CommandStep {
  label: string;
  command: string;
  args: string[];
  expectExitCode?: number;
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const steps: CommandStep[] = [
  {
    label: "Unit and domain tests",
    command: npmCommand,
    args: ["run", "test"]
  },
  {
    label: "Type-check and production build",
    command: npmCommand,
    args: ["run", "build"]
  },
  {
    label: "Dry-run release verification with localization, executor, coding-agent dispatch/simulation/runner/self-test/sandbox-runner/receipt drills and manifest",
    command: npmCommand,
    args: ["run", "release:verify"]
  },
  {
    label: "Production boundary negative check",
    command: npmCommand,
    args: ["run", "release:verify:production"],
    expectExitCode: 4
  },
  {
    label: "Git whitespace check",
    command: "git",
    args: ["diff", "--check"]
  }
];

async function main() {
  const results: { label: string; exitCode: number; expected: number }[] = [];

  for (const step of steps) {
    const expected = step.expectExitCode ?? 0;
    console.log(`\n==> ${step.label}`);
    console.log(`$ ${[step.command, ...step.args].join(" ")}`);
    const exitCode = await runStep(step);
    results.push({
      label: step.label,
      exitCode,
      expected
    });

    if (exitCode !== expected) {
      console.error(`\nVerification failed: ${step.label}`);
      console.error(`Expected exit code ${expected}, got ${exitCode}.`);
      printSummary(results);
      process.exitCode = exitCode || 1;
      return;
    }

    if (step.expectExitCode === 4) {
      console.log("Expected production boundary failure observed (exit code 4).");
    }
  }

  printSummary(results);
}

function runStep(step: CommandStep) {
  return new Promise<number>((resolve) => {
    const child = spawn(step.command, step.args, {
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      console.error(error instanceof Error ? error.message : error);
      resolve(1);
    });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

function printSummary(results: { label: string; exitCode: number; expected: number }[]) {
  console.log("\nVerification summary");
  for (const result of results) {
    const status = result.exitCode === result.expected ? "pass" : "fail";
    console.log(`- [${status}] ${result.label}: exit ${result.exitCode}, expected ${result.expected}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown verification failure.");
  process.exitCode = 1;
});
