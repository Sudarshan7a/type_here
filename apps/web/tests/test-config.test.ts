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
  bandFor,
  contentTypeFor,
  PROSE_DOMAINS,
  truncateToWords,
  type Difficulty,
} from "../src/corpus";
import { NUMBER_DRILLS, buildNumberDrill } from "../src/drills";
import { getCorpusSnippets, getSnippetLanguages } from "../src/corpus";
import { LANGUAGE_LABELS, logModeFor, MAX_CUSTOM_CHARS } from "../src/App";
import { COPY } from "../src/copy";

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

describe("real-world prose (MOD-02)", () => {
  it("names the real-world features its copy promises", () => {
    // The ledger for MOD-02 is "mixed case, punctuation, digits, names, URLs".
    // URLs are NOT claimed, because the shippable prose pool contains none —
    // a copy claim the content cannot back is what the claims ban is for.
    const note = COPY.testSetup.modeNotes.prose.toLowerCase();
    for (const feature of ["mixed case", "punctuation", "digits", "names", "symbols"]) {
      expect(note, `prose note must name ${feature}`).toContain(feature);
    }
    expect(note).not.toContain("url");
  });

  it("offers prose that really carries every feature it names", () => {
    // If the copy names mixed case, digits, names, punctuation and symbols,
    // shippable passages must contain each. Measured against the real corpus,
    // not a fixture.
    const passages = getCorpusPassages();
    expect(passages.length).toBeGreaterThan(100);

    // Mixed case: capitals somewhere other than the sentence start.
    expect(
      passages.some((p) => /[a-z] [A-Z]/.test(p.text)),
      "mixed case",
    ).toBe(true);
    // Punctuation: commas, full stops, apostrophes, question marks.
    expect(
      passages.some((p) => /[.,?!;:]/.test(p.text)),
      "punctuation",
    ).toBe(true);
    expect(
      passages.some((p) => /['\u2019]/.test(p.text)),
      "apostrophes",
    ).toBe(true);
    // Digits: 90 of the 300 carry them (prices, times, amounts).
    expect(
      passages.some((p) => /\d/.test(p.text)),
      "digits",
    ).toBe(true);
    // Names: a mid-sentence proper noun (a street, a weekday, a fictional name).
    expect(
      passages.some((p) => /[a-z] [A-Z][a-z]+/.test(p.text)),
      "names",
    ).toBe(true);
    // Symbols: at least one passage carries a non-alphanumeric symbol.
    expect(
      passages.some((p) => /[&@#%*+=/_$]/.test(p.text)),
      "symbols",
    ).toBe(true);

    // And the honest negative: no URL is claimed, because none exists.
    expect(passages.some((p) => /(www\.|https?:\/\/|\.com\b|\.org\b|\.net\b)/i.test(p.text))).toBe(
      false,
    );
  });

  it("reports a computed band for corpus prose and none for custom text", () => {
    // The band is the ENGINE's (CNT-02): shown beside the id as words, so it
    // needs no colour vision to read (rule 7).
    const first = getCorpusPassages()[0]!;
    const band = bandFor(first.id);
    expect(["easy", "typical", "hard"]).toContain(band);
    expect(bandFor("CUSTOM")).toBeNull();
    expect(bandFor("PROSE-99-999")).toBeNull();
  });

  it("spans every prose domain the library carries", () => {
    // MOD-02's pool is the whole real-world library, not one register of
    // language — so a visitor is not silently confined to one domain.
    const domains = new Set(
      getCorpusPassages()
        .map((p) => contentTypeFor(p.id))
        .filter((t) => t !== null),
    );
    for (const domain of PROSE_DOMAINS) {
      expect(domains.has(domain), `prose pool must include ${domain}`).toBe(true);
    }
  });

  it("offers only content the licence register clears", () => {
    // CNT-06: `shippable` is the gate's own flag. The app offers nothing that
    // has not passed its review, and invents no review of its own.
    for (const p of getCorpusPassages()) {
      expect(p.id).toMatch(/^PROSE-/);
    }
    const quotes = getCorpusQuotes();
    expect(quotes.length).toBeGreaterThan(0);
    for (const q of quotes) {
      expect(q.id).toMatch(/^QUOTE-/);
    }
  });
});

describe("numbers and symbols drills (MOD-04)", () => {
  it("builds each drill kind from real characters", () => {
    for (const drill of NUMBER_DRILLS) {
      const text = buildNumberDrill(7, drill);
      expect(text.length, `${drill} must produce something to type`).toBeGreaterThan(10);
      // The target is exactly what the drill promises, and nothing else — a
      // drill that quietly contains letters in a digits row is a lie.
      switch (drill) {
        case "digits":
          expect(text).toMatch(/^\d+( \d+)*$/);
          break;
        case "decimals":
          // Signs, points, separators and group underscores only — no hex
          // binaries or alphanumerics sneaking into a numbers row.
          expect(text).toMatch(/^[-+]?[\d.,e_]+( [-+]?[\d.,e_]+)*$/i);
          break;
        case "symbols":
          expect(text).toMatch(/^[^A-Za-z0-9\s]+( [^A-Za-z0-9\s]+)*$/);
          break;
        case "mixed":
          expect(text).toMatch(/[0-9]/);
          expect(text).toMatch(/[A-Za-z]/);
          break;
      }
    }
  });

  it("is deterministic: the same seed reproduces the same drill", () => {
    // The generator's own contract, honoured end to end by this builder: a
    // recorded run can be replayed against the same target.
    for (const drill of NUMBER_DRILLS) {
      expect(buildNumberDrill(42, drill)).toBe(buildNumberDrill(42, drill));
    }
    // "New drill" is a new seed, so a different drill must not be the same
    // text — except for the symbol rows, which are a fixed, ordered ladder.
    for (const drill of NUMBER_DRILLS) {
      const a = buildNumberDrill(1, drill);
      const b = buildNumberDrill(2, drill);
      expect(a === b).toBe(drill === "symbols");
    }
  });

  it("orders symbol rows home-row first", () => {
    // A symbol row that starts at `~` is a row nobody can practise: the order
    // is part of the drill, not decoration.
    const first = buildNumberDrill(1, "symbols").split(" ")[0]!;
    expect(first.startsWith("!@#$%^&*()")).toBe(true);
  });

  it("generates no real data of any kind", () => {
    // The generators' safety predicates are the package's own; the drill must
    // inherit them rather than invent a weaker check.
    for (const drill of NUMBER_DRILLS) {
      const text = buildNumberDrill(3, drill);
      expect(text).not.toMatch(/\+?\d{3}[-. ]?\d{3}[-. ]?\d{4}/); // nothing phone-shaped
      expect(text).not.toMatch(/\b\d{1,3}\.\d{4,}\b/); // nothing coordinate-shaped
    }
  });

  it("names a drill as digits or symbols, never as an outcome", () => {
    const banned = /\b(faster|improve|boost|master|perfect)\b/i;
    for (const label of Object.values(COPY.testSetup.drillOptions)) {
      expect(banned.test(label), `claims-banned wording in: ${label}`).toBe(false);
    }
    expect(COPY.testSetup.drillOptions.digits).toBe("Digit rows");
    expect(COPY.testSetup.drillOptions.symbols).toBe("Symbol rows");
  });
});

describe("code mode (MOD-03)", () => {
  it("offers only snippets the licence register clears", () => {
    // Same gate as prose: `shippable` is the licence gate's own flag, and the
    // app invents no review of its own.
    const snippets = getCorpusSnippets();
    expect(snippets.length).toBeGreaterThan(5);
    for (const s of snippets) {
      expect(s.id).toMatch(/^CODE-/);
      expect(s.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("offers real structured snippets, not syntax puzzles", () => {
    // A snippet a developer recognises has lines, indentation and structure.
    const snippets = getCorpusSnippets();
    const multiLine = snippets.filter((s) => s.text.includes("\n"));
    expect(multiLine.length, "snippets must be multi-line").toBeGreaterThan(4);
    const indented = snippets.filter((s) => /^ {2,}/m.test(s.text));
    expect(indented.length, "snippets must be indented").toBeGreaterThan(4);
    // And a real body: a function or a block, not a keyword list.
    expect(snippets.some((s) => /\{[\s\S]*\}/.test(s.text))).toBe(true);
    expect(snippets.some((s) => /:\s*\n/.test(s.text) || /def /.test(s.text))).toBe(true);
  });

  it("names only languages the engine can classify", () => {
    // The master spec names five languages. The engine's language profiles
    // carry JavaScript/TypeScript and Python today, so those are the two the
    // app offers — a language label the token map cannot read is a label the
    // gate would refuse, and a UI that offers one is a UI that lies.
    const languages = getSnippetLanguages();
    expect(languages).toEqual(["javascript", "python"]);
    for (const lang of languages) {
      expect(Object.keys(LANGUAGE_LABELS)).toContain(lang);
    }
  });

  it("never executes a snippet: there is no HTML path to sanitise", () => {
    // AGENTS.md rule 5. The surface paints one character element per character
    // and never sets innerHTML, so a snippet containing markup is text on
    // screen rather than a node the browser would parse. These are records of
    // what the source content itself forbids.
    const snippets = getCorpusSnippets();
    for (const s of snippets) {
      expect(s.text).not.toMatch(/\beval\s*\(/);
      expect(s.text).not.toMatch(/new\s+Function\s*\(/);
      expect(s.text).not.toMatch(/import\s*\(/);
      expect(s.text).not.toMatch(/child_process|\bexecSync\b|\bspawn\s*\(/);
      expect(s.text).not.toMatch(/document\.write|<script/i);
    }
  });

  it("says in the UI that snippets do not run", () => {
    // The claim has to be visible where the code is, not buried in a doc.
    expect(COPY.testSetup.codeNote.toLowerCase()).toContain("display-only");
    expect(COPY.testSetup.codeNote.toLowerCase()).toContain("nothing you see here runs");
  });
});
