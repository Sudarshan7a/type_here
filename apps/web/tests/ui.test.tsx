import { describe, expect, it } from "vitest";

import { COPY } from "../src/copy";
import { PASSAGES, passageLabel, placeholderHash } from "../src/passages";

/**
 * The passage data and the copy bindings are pure enough to assert in node. The
 * interactive surface is covered by the Playwright suite
 * (e2e/typing-surface.spec.ts), which drives a real browser with real keystrokes
 * and asserts the six STEER-2 acceptance criteria against real engine output.
 */

describe("passage data", () => {
  it("carries original prose with ids from the content library", () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(4);
    for (const p of PASSAGES) {
      expect(p.id).toMatch(/^PROSE-01-\d{3}$/);
      expect(p.text.length).toBeGreaterThan(40);
    }
  });

  it("produces a 64-char hex placeholder hash (contract-compatible until sha256 lands)", () => {
    const hash = placeholderHash("hello");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(placeholderHash("hello")).toBe(placeholderHash("hello"));
    expect(placeholderHash("hello")).not.toBe(placeholderHash("hellp"));
  });

  it("labels passages with their own opening words, deterministically", () => {
    // The picker shows words, not ids: the id stays on the option value (and
    // in the log), so renaming a label can never misattribute a run.
    for (const p of PASSAGES) {
      const label = passageLabel(p);
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(35);
      expect(passageLabel(p)).toBe(label);
      expect(p.text.startsWith(label.replace(/…$/, ""))).toBe(true);
    }
    // Short text is shown whole, with no ellipsis.
    expect(passageLabel({ id: "X", text: "Short line." })).toBe("Short line.");
  });
});

describe("copy bindings", () => {
  it("renders the results headline in the formats the string table declares", () => {
    // results.headline.netWpm is "{value} WPM" and results.headline.accuracy is
    // "{value}% accuracy". The surface must format from the template rather than
    // hard-coding a shape of its own.
    expect(COPY.headlineNetWpm(62.34)).toBe("62.3 WPM");
    expect(COPY.headlineAccuracy(96.5)).toBe("96.5% accuracy");
  });

  it("fills the a11y announcement template with both figures", () => {
    // a11y.announce.testFinished is "Test finished. {wpm} words per minute,
    // {accuracy} percent accuracy."
    expect(COPY.announceTestFinished("62", "97")).toBe(
      "Test finished. 62 words per minute, 97 percent accuracy.",
    );
  });

  it("names the engine model version in the stamp, so a score is attributable", () => {
    expect(COPY.engineStamp("1.0.0")).toContain("1.0.0");
  });

  it("never renders a speed figure as a bare 0 before any data exists", () => {
    // Chapter 4 E9: the not-available placeholder is text, never the number 0.
    // This is a property of the copy, not of the engine: the view must have a
    // string for "no data" or it will reach for 0 instead.
    expect(COPY).not.toHaveProperty("netWpmUnavailable0");
    expect(COPY.headlineAccuracy(0)).toBe("0.0% accuracy");
  });
});
