import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCopy,
  getInitialLocale,
  htmlLang,
  saveLocale,
  supportedLocales,
  type SupportedLocale
} from "./i18n";

const expectedLocales: SupportedLocale[] = ["ja", "en", "zh-Hans", "zh-Hant", "ko"];

describe("i18n", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps Japanese as the default and first supported locale", () => {
    expect(supportedLocales.map((locale) => locale.code)).toEqual(expectedLocales);
    expect(getInitialLocale()).toBe("ja");
  });

  it("maps supported locales to stable html lang values", () => {
    expect(htmlLang("ja")).toBe("ja");
    expect(htmlLang("en")).toBe("en");
    expect(htmlLang("zh-Hans")).toBe("zh-Hans");
    expect(htmlLang("zh-Hant")).toBe("zh-Hant");
    expect(htmlLang("ko")).toBe("ko");
  });

  it("keeps core operator copy available for every locale", () => {
    for (const locale of expectedLocales) {
      const copy = getCopy(locale);

      expect(copy.brandSubtitle).toBeTruthy();
      expect(copy.language).toBeTruthy();
      expect(copy.missionTitle).toBeTruthy();
      expect(copy.runCabinet).toBeTruthy();
      expect(copy.releaseRehearsal.title).toBeTruthy();
      expect(copy.codingBriefs.title).toBeTruthy();
      expect(copy.codingBriefs.dispatchManifest).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchJson).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchArchiveJson).toBeTruthy();
      expect(copy.codingBriefs.downloadDispatchArchiveAuditJson).toBeTruthy();
      expect(copy.codingBriefs.dispatchDecisionLabel("dispatchable")).toBeTruthy();
      expect(copy.codingBriefs.dispatchAuditDecisionLabel("verified")).toBeTruthy();
      if (locale !== "en") {
        expect(copy.codingBriefs.dispatchDecisionLabel("dispatchable")).not.toBe("dispatchable");
      }
      expect(copy.codingBriefs.dispatchSummary(2, 1, 2)).toBeTruthy();
      expect(copy.codingBriefs.dispatchArchiveSummary(4, 2, 512)).toBeTruthy();
      expect(copy.codingBriefs.dispatchUnassignedHeld(1)).toBeTruthy();
      expect(copy.codingBriefs.dispatchAuditSummary(6, 1, 0)).toBeTruthy();
      expect(copy.codingBriefs.receiptTemplate).toBeTruthy();
      expect(copy.codingBriefs.drillReady).toBeTruthy();
    }
  });

  it("falls back to Japanese when stored locale is unsupported", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => "fr"),
        setItem: vi.fn()
      }
    });

    expect(getInitialLocale()).toBe("ja");
  });

  it("persists a supported locale selection", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(),
        setItem
      }
    });

    saveLocale("ko");

    expect(setItem).toHaveBeenCalledWith("naikaku.locale", "ko");
  });
});
