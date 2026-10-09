import { describe, expect, it } from "vitest";

/**
 * MOD-01 — the classic test setup: the modes that change WHEN a test ends.
 *
 * The engine scores a keystroke identically in every mode; these cover the
 * surface-level machinery that decides when the test is over, plus the text
 * selection that feeds it. Deterministic and pure: no timers run, no browser
 * is involved.
 */
import {
  getCorpusPassages,
  getCorpusQuotes,
  truncateToWords,
  type Difficulty,
} from "../src/corpus";
import { COPY } from "../src/copy";
import { logModeFor, MAX_CUSTOM_CHARS } from "../src/App";

describe("corpus selection (MOD-01)", () => {
  it("offers prose at every difficulty, ordered deterministically", () => {
    for (const difficulty of ["easy", "typical", "hard"] as Difficulty[]) {
      const passages = getCorpusPassages(difficulty);
      expect(passages.length).toBeGreaterThan(10);
      for (const p of passages) {
        expect(p.text.length).toBeGreaterThan(0);
        // The library spans batch 01-05 of the everyday domain.
        expect(p.id).toMatch(/^PROSE-0\d-\d{3}$/);
      }
      // Deterministic ordering: the same request yields the same sequence, so
      // a re-render can never reshuffle the picker under the user.
      expect(getCorpusPassages(difficulty)).toEqual(passages);
    }
  });

  it("returns distinct pools per difficulty", () => {
    const easy = new Set(getCorpusPassages("easy").map((p) => p.id));
    const hard = new Set(getCorpusPassages("hard").map((p) => p.id));
    expect(easy.size).toBeGreaterThan(0);
    expect(hard.size).toBeGreaterThan(0);
    // A passage carries ONE difficulty, never two.
    for (const id of easy) expect(hard.has(id)).toBe(false);
  });

  it("offers quotes from the content library", () => {
    const quotes = getCorpusQuotes();
    expect(quotes.length).toBeGreaterThan(10);
    for (const q of quotes) {
      expect(q.id).toMatch(/^QUOTE-/);
      expect(q.text.trim().length).toBeGreaterThan(0);
    }
    // The quote pool is not the prose pool: a quote must never appear as prose.
    const proseIds = new Set(getCorpusPassages().map((p) => p.id));
    for (const q of quotes) expect(proseIds.has(q.id)).toBe(false);
  });

  it("truncates to the first N words, never past the end", () => {
    const text = "one two three four five six seven";
    expect(truncateToWords(text, 3)).toBe("one two three");
    expect(truncateToWords(text, 1)).toBe("one");
    // Asking for more than exists returns the whole text unchanged — a target
    // must never be padded, truncated mid-word, or silently duplicated.
    expect(truncateToWords(text, 99)).toBe(text);
    expect(truncateToWords(text, 0)).toBe(text);
    expect(truncateToWords("solo", 5)).toBe("solo");
    // Interior whitespace never leaks into the target.
    expect(truncateToWords("  a   b  ", 1)).toBe("a");
  });

  it("keeps the word-count target a prefix of the passage", () => {
    // A word-count test is the opening of a real passage, so the run stays
    // reproducible from the corpus alone.
    const first = getCorpusPassages("easy")[0]!;
    for (const n of [15, 30, 60]) {
      const target = truncateToWords(first.text, n);
      expect(first.text.startsWith(target)).toBe(true);
    }
  });
});

describe("mode attribution (MOD-01)", () => {
  it("records custom text as custom and everything else as classic", () => {
    // The mode is attribution, not scoring: the engine's numbers are the
    // same for a timed prose test and a full-passage prose test.
    expect(logModeFor("prose")).toBe("classic");
    expect(logModeFor("time")).toBe("classic");
    expect(logModeFor("words")).toBe("classic");
    expect(logModeFor("quotes")).toBe("classic");
    expect(logModeFor("custom")).toBe("custom");
  });

  it("caps custom text and says so beside the field", () => {
    expect(MAX_CUSTOM_CHARS).toBe(2000);
    expect(COPY.testSetup.customLimitNote).toContain(String(MAX_CUSTOM_CHARS));
    // The privacy rule rides the same sentence as the limit.
    expect(COPY.testSetup.customLimitNote.toLowerCase()).toContain("not");
    expect(COPY.testSetup.customLimitNote.toLowerCase()).toContain("stored");
  });
});

describe("test-setup copy (MOD-01)", () => {
  it("names what each mode is, with no outcome promised", () => {
    // Claims ban (rule 9): no "faster", "improve", "boost", "master" …
    const banned = /\b(faster|fastest|improve|improving|boost|master|easier)\b/i;
    const strings = [
      COPY.testSetup.modeLabel,
      ...Object.values(COPY.testSetup.modeOptions),
      ...Object.values(COPY.testSetup.modeNotes),
      COPY.testSetup.durationLabel,
      COPY.testSetup.wordCountLabel,
      COPY.liveTimeRemainingLabel,
    ];
    for (const s of strings) {
      expect(banned.test(s), `claims-banned wording in: ${s}`).toBe(false);
    }
  });

  it("carries the contract's timed lengths and word counts", () => {
    expect(Object.keys(COPY.testSetup.durationOptions)).toEqual(["15", "30", "60", "120"]);
    expect(Object.keys(COPY.testSetup.wordCountOptions)).toEqual(["15", "30", "60"]);
    // The default timed length is 60s, the contract's default (M2-03 §3).
    expect(COPY.testSetup.durationOptions[60]).toBe("60s");
  });

  it("keeps the no-timer option available", () => {
    // a11y-typing-ui / LRN-04: practice must exist without a clock. Prose is
    // the default mode and its own note says so.
    expect(COPY.testSetup.modeOptions.prose).toBeTruthy();
    expect(COPY.testSetup.modeNotes.prose.toLowerCase()).toContain("no clock");
  });
});
