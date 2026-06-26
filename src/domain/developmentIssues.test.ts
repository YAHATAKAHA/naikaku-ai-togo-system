import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildDevelopmentBoard } from "./developmentBoard";
import {
  buildDevelopmentIssueDrafts,
  serializeDevelopmentIssueDrafts,
  serializeDevelopmentIssueMarkdown
} from "./developmentIssues";
import { runCabinetMission } from "./orchestrator";
import { buildTeamHandoff } from "./teamPackages";

describe("development issue drafts", () => {
  it("builds one GitHub-ready draft per development item", () => {
    const workspace = {
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    };
    const run = runCabinetMission(workspace);
    const handoff = buildTeamHandoff({
      workspace,
      run,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const board = buildDevelopmentBoard({
      handoff,
      run,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const drafts = buildDevelopmentIssueDrafts({
      board,
      generatedAt: "2026-06-26T00:01:00.000Z"
    });

    expect(drafts.schema).toBe("naikaku.github-issue-drafts.v1");
    expect(drafts.drafts).toHaveLength(board.items.length);
    expect(drafts.summary.total).toBe(board.summary.total);
    expect(drafts.summary.labels).toContain("naikaku");
    expect(drafts.drafts.every((draft) => draft.title.startsWith("["))).toBe(true);
    expect(drafts.drafts.every((draft) => draft.body.includes("## Acceptance Criteria"))).toBe(true);
    expect(drafts.drafts.every((draft) => draft.labels.length > 0)).toBe(true);
    expect(drafts.drafts.every((draft) => draft.acceptanceCriteria.length > 0)).toBe(true);
  });

  it("serializes JSON and markdown without session secrets", () => {
    const workspace = {
      mission: defaultMission,
      roles: defaultRoles,
      sandboxPolicy: defaultSandboxPolicy
    };
    const handoff = buildTeamHandoff({
      workspace,
      generatedAt: "2026-06-26T00:00:00.000Z"
    });
    const board = buildDevelopmentBoard({ handoff });
    const drafts = buildDevelopmentIssueDrafts({ board });
    const json = serializeDevelopmentIssueDrafts(drafts);
    const markdown = serializeDevelopmentIssueMarkdown(drafts);

    expect(JSON.parse(json).schema).toBe("naikaku.github-issue-drafts.v1");
    expect(markdown).toContain("# [Team]");
    expect(json).not.toContain("sessionSecret");
    expect(markdown).not.toContain("sessionSecret");
  });
});
