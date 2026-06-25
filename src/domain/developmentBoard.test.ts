import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildDevelopmentBoard, serializeDevelopmentBoard, updateDevelopmentWorkItemStatus } from "./developmentBoard";
import { buildMemoryCandidates, createMemoryDecision } from "./memory";
import { runCabinetMission } from "./orchestrator";
import { buildTeamHandoff } from "./teamPackages";

describe("development board", () => {
  it("builds work items from team packages and next iteration tasks", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const handoff = buildTeamHandoff({
      workspace: {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      },
      run,
      generatedAt: "2026-06-25T00:00:00.000Z"
    });
    const board = buildDevelopmentBoard({ handoff, run });

    expect(board.schema).toBe("naikaku.development-board.v1");
    expect(board.items.length).toBe(handoff.packages.length + run.nextIteration.length);
    expect(board.items.some((item) => item.source === "team-package")).toBe(true);
    expect(board.items.some((item) => item.source === "next-iteration")).toBe(true);
    expect(board.summary.total).toBe(board.items.length);
  });

  it("preserves saved item status when regenerating the board", () => {
    const handoff = buildTeamHandoff({
      workspace: {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      },
      generatedAt: "2026-06-25T00:00:00.000Z"
    });
    const board = buildDevelopmentBoard({ handoff });
    const updated = updateDevelopmentWorkItemStatus({
      item: board.items[0],
      status: "in-progress",
      updatedAt: "2026-06-25T01:00:00.000Z"
    });
    const regenerated = buildDevelopmentBoard({
      handoff,
      savedItems: [updated],
      generatedAt: "2026-06-25T02:00:00.000Z"
    });

    expect(regenerated.items[0].status).toBe("in-progress");
    expect(regenerated.items[0].updatedAt).toBe("2026-06-25T01:00:00.000Z");
  });

  it("adds accepted memory skills as development work items", () => {
    const run = runCabinetMission({
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    });
    const memorySkill = buildMemoryCandidates({ run }).find((entry) => entry.kind === "skill");
    if (!memorySkill) {
      throw new Error("Expected a memory skill candidate.");
    }
    const acceptedMemory = createMemoryDecision({
      entry: memorySkill,
      decision: "accepted",
      decidedAt: "2026-06-25T01:00:00.000Z"
    });
    const handoff = buildTeamHandoff({
      workspace: {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      },
      run
    });
    const board = buildDevelopmentBoard({
      handoff,
      run,
      memoryEntries: [acceptedMemory]
    });

    expect(board.items.some((item) => item.source === "memory-entry")).toBe(true);
    expect(board.items.find((item) => item.source === "memory-entry")?.priority).toBe("high");
  });

  it("exports the board without raw session secrets", () => {
    const handoff = buildTeamHandoff({
      workspace: {
        roles: defaultRoles,
        sandboxPolicy: defaultSandboxPolicy,
        mission: defaultMission
      }
    });
    const exported = serializeDevelopmentBoard(buildDevelopmentBoard({ handoff }));
    const parsed = JSON.parse(exported) as { schema: string; items: unknown[] };

    expect(parsed.schema).toBe("naikaku.development-board.v1");
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(exported).not.toContain("sessionSecret");
  });
});
