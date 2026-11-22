import { describe, expect, it } from "vitest";
import { createBrowserDemoRun, serializeBrowserDemoRun } from "./demoRun";

describe("browser demo run", () => {
  it("marks every cabinet stage as a browser-only dry run", () => {
    const run = createBrowserDemoRun({
      mission: "Review a release candidate",
      fallbackMission: "Fallback mission"
    });

    expect(run.mission).toBe("Review a release candidate");
    expect(run.artifacts).toHaveLength(7);
    expect(run.artifacts.every((artifact) => artifact.providerStatus === "dry-run")).toBe(true);
  });

  it("exports a compact record without provider configuration", () => {
    const run = createBrowserDemoRun({
      mission: "",
      fallbackMission: "Fallback mission"
    });
    const serialized = serializeBrowserDemoRun(run);

    expect(serialized).toContain("browser-only-dry-run");
    expect(serialized).toContain("Fallback mission");
    expect(serialized).not.toContain("NAIKAKU_OPENAI_API_KEY");
  });
});
