import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildMemoryCandidates, createMemoryDecision, serializeMemoryEntries } from "./memory";
import { runCabinetMission } from "./orchestrator";

describe("memory candidates", () => {
  it("turns a cabinet run into reviewable memory candidates", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const candidates = buildMemoryCandidates({
      run,
      createdAt: "2026-06-25T00:00:00.000Z"
    });

    expect(candidates.length).toBeGreaterThan(run.nextIteration.length);
    expect(candidates.every((candidate) => candidate.status === "candidate")).toBe(true);
    expect(candidates.every((candidate) => candidate.consentTag === "needs-review")).toBe(true);
    expect(candidates.some((candidate) => candidate.kind === "skill")).toBe(true);
    expect(candidates.some((candidate) => candidate.kind === "follow-up")).toBe(true);
  });

  it("records accepted and rejected decisions only after operator review", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const [candidate] = buildMemoryCandidates({ run });
    const accepted = createMemoryDecision({
      entry: candidate,
      decision: "accepted",
      decidedAt: "2026-06-25T01:00:00.000Z"
    });
    const rejected = createMemoryDecision({
      entry: candidate,
      decision: "rejected",
      decidedAt: "2026-06-25T02:00:00.000Z"
    });

    expect(accepted.status).toBe("accepted");
    expect(rejected.status).toBe("rejected");
    expect(accepted.consentTag).toBe("operator-reviewed");
    expect(accepted.decidedBy).toBe("operator");
  });

  it("exports a memory log without raw session secrets", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const accepted = createMemoryDecision({
      entry: buildMemoryCandidates({ run })[0],
      decision: "accepted"
    });
    const exported = serializeMemoryEntries([accepted]);
    const parsed = JSON.parse(exported) as { schema: string; entries: unknown[] };

    expect(parsed.schema).toBe("naikaku.memory-log.v1");
    expect(parsed.entries).toHaveLength(1);
    expect(exported).not.toContain("sessionSecret");
  });
});
