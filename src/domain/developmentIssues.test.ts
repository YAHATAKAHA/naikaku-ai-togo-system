import { describe, expect, it } from "vitest";
import { defaultMission, defaultRoles, defaultSandboxPolicy } from "../data/defaultCabinet";
import { buildDevelopmentBoard } from "./developmentBoard";
import {
  buildDevelopmentIssueDrafts,
  serializeDevelopmentIssueDrafts,
  serializeDevelopmentIssueGhScript,
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

  it("serializes a reviewable GitHub CLI creation script", () => {
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
    const script = serializeDevelopmentIssueGhScript({
      ...drafts,
      drafts: [
        {
          ...drafts.drafts[0],
          title: "Owner's task",
          body: `${drafts.drafts[0].body}\n\nDon't break quoted body text.`,
          labels: ["naikaku", "team's-label"],
          assigneeHint: "Builder's team",
          milestoneHint: "MVP's first run"
        }
      ]
    });

    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("gh issue create");
    expect(script).toContain("--body-file '.naikaku-issue-01-");
    expect(script).toContain("--title 'Owner'\\''s task'");
    expect(script).toContain("--label 'naikaku'");
    expect(script).toContain("--label 'team'\\''s-label'");
    expect(script).toContain("# Assignee hint: Builder's team");
    expect(script).toContain("# Milestone hint: MVP's first run");
    expect(script).not.toContain("--milestone");
    expect(script).not.toContain("sessionSecret");
  });
});
