import { computeResult, type EngineResult } from "@realtype/engine";
import type { InputLog, KeyEvent } from "@realtype/schemas";
import { describe, expect, it } from "vitest";

import { COPY } from "../src/copy";
import { placeholderHash } from "../src/passages";
import { SHORT_TEST_MS, assessResult, flagNotes, shortNotice } from "../src/results/assess";
import { buildAnnouncement } from "../src/results/announce";
import {
  PRECISION,
  displayNumber,
  formatPercent,
  formatRatio,
  formatSeconds,
  formatSpeech,
  formatSpeed,
} from "../src/results/format";
import { DETAIL_METRICS, detailRows, headlineFigures, metricValue } from "../src/results/metrics";

/**
 * ANA-01: the numbers, and only the numbers.
 *
 * The ledger's acceptance note for this row is "numbers must match server
 * recomputation (INT-01)". In this codebase that has one concrete meaning:
 * `computeResult` is documented as the single entry point the client and the API
 * both call, so if every figure on the screen is read off the object it returns
 * and only formatted, there is nothing left for a server recompute to disagree
 * with. These tests pin that property directly — every displayed string is
 * compared against the engine's own number, and the ONLY transformation allowed
 * between the two is the precision the formatter declares.
 *
 * They also pin the reverse direction, which is the one that actually catches
 * mistakes: changing an engine value must change what is displayed. A formatter
 * that ignored its input would pass a naive equality check forever.
 */

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

/** A keypress on `key` at `t`, with the physical code the engine matches on. */
function press(key: string, t: number, code = `Key${key.toUpperCase()}`): KeyEvent {
  return {
    code,
    key,
    type: "down",
    t,
    mods: { ...NO_MODS },
    repeat: false,
    isTrusted: true,
    auto: false,
  };
}

function keyup(key: string, t: number, code = `Key${key.toUpperCase()}`): KeyEvent {
  return { ...press(key, t, code), type: "up" };
}

/**
 * A log for the KEYS the user pressed (`text`), scored against `target`. One
 * keyup a little after each press, so rollover has a predecessor to compare
 * against without any press overlapping the next.
 */
function logFor(text: string, target: string, intervalMs = 100): InputLog {
  const events: KeyEvent[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const key = text[i]!;
    const t = i * intervalMs;
    events.push(press(key, t, key === " " ? "Space" : `Key${key.toUpperCase()}`));
    events.push(keyup(key, t + 20, key === " " ? "Space" : `Key${key.toUpperCase()}`));
  }
  return {
    events,
    markers: [],
    meta: {
      mode: "classic",
      textId: "PROSE-TEST-001",
      textHash: placeholderHash(target),
      layout: "qwerty-us",
      settings: {
        errorMode: "free",
        layout: "qwerty-us",
        autoIndent: false,
        autoPair: false,
      },
      engineVersion: "1.1.0",
    },
  };
}

const TARGET = "the quick brown fox jumps over the lazy dog";
const CLEAN = computeResult(logFor(TARGET, TARGET, 250), { id: "PROSE-TEST-001", text: TARGET });

/** The same text with one substitution, so the three speed fields part company. */
const TYPO = "the qwick brown fox jumps over the lazy dog";
const TYPO_RESULT = computeResult(logFor(TYPO, TARGET, 250), {
  id: "PROSE-TEST-001",
  text: TARGET,
});

/** The typo run, plus one event the browser did not mark as trusted. */
function flaggedResult(): EngineResult {
  const log = logFor(TYPO, TARGET, 250);
  log.events.push({ ...press("q", 60_000), isTrusted: false });
  return computeResult(log, { id: "PROSE-TEST-001", text: TARGET });
}

/** A run shorter than the engine's own consistency floor. */
function shortResult(): EngineResult {
  const tiny = "ab cd";
  return computeResult(logFor(tiny, tiny, 60), { id: "PROSE-TEST-001", text: tiny });
}

describe("the formatter changes precision and nothing else", () => {
  it("renders a number at exactly the declared precision", () => {
    expect(displayNumber(62.349, PRECISION.speed)).toBe("62.3");
    expect(displayNumber(62.351, PRECISION.speed)).toBe("62.4");
    expect(displayNumber(98.94, PRECISION.percent)).toBe("98.9");
    expect(displayNumber(1.0449, PRECISION.ratio)).toBe("1.04");
    expect(displayNumber(1.0451, PRECISION.ratio)).toBe("1.05");
    // `displayNumber` formats a number it is given; seconds come from
    // `formatSeconds`, which does the conversion first.
    expect(displayNumber(1.234, PRECISION.seconds)).toBe("1.2");
  });

  it("never renders a signed zero or a non-finite value", () => {
    // `(-0).toFixed(1)` is "-0.0", which reads as a defect to a person.
    expect(displayNumber(-0, 1)).toBe("0.0");
    // A NaN reaching the screen would be the engine's bug made visible as a
    // mystery; null makes it a stated absence instead.
    expect(displayNumber(Number.NaN, 1)).toBeNull();
    expect(displayNumber(Number.POSITIVE_INFINITY, 1)).toBeNull();
  });

  it("uses one rule per figure class, so two rows cannot disagree", () => {
    // KSPC gets two decimals because the interesting range is around 1.0 and one
    // decimal cannot separate 1.02 from 1.04. If this ever changes, the reason
    // changes with it.
    expect(formatRatio(1.02)).toBe("1.02");
    expect(formatRatio(1.04)).toBe("1.04");
    expect(PRECISION.speed).toBe(PRECISION.percent);
    expect(formatSpeed(12.34)).toBe("12.3");
    expect(formatPercent(12.34)).toBe("12.3");
    expect(formatSeconds(2_340)).toBe("2.3");
  });

  it("rounds for speech only, and never touches a displayed figure", () => {
    expect(formatSpeech(62.4)).toBe("62");
    expect(formatSpeech(98.94)).toBe("99");
    expect(formatSpeed(62.4)).toBe("62.4");
  });
});

describe("every displayed figure is the engine's own number (ANA-01 / INT-01)", () => {
  const headline = headlineFigures(CLEAN);

  it("the headline is net WPM, final accuracy and gross WPM, verbatim", () => {
    expect(headline.netWpm).toBe(COPY.headlineNetWpm(CLEAN.summary.netWpm));
    expect(headline.accuracy).toBe(COPY.headlineAccuracy(CLEAN.summary.finalAccuracy));
    expect(headline.classicWpm).toBe(COPY.resultsClassicWpm(formatSpeed(CLEAN.summary.grossWpm)!));

    // And the digits on screen are the engine digits at the stated precision —
    // not a re-rounded value, and not a neighbouring field.
    expect(headline.netWpm).toBe(`${CLEAN.summary.netWpm.toFixed(1)} WPM`);
    expect(headline.accuracy).toBe(`${CLEAN.summary.finalAccuracy.toFixed(1)}% accuracy`);
    expect(headline.classicWpm).toBe(`Classic WPM: ${CLEAN.summary.grossWpm.toFixed(1)}`);
  });

  it("the three speeds are three different fields, and a typo separates them", () => {
    // On a perfect run net, gross and raw coincide — which is correct, and is
    // exactly why a test that only ever looked at a clean run could not tell
    // which field the headline was reading. With one substitution they part
    // company: net drops with the correct characters, gross counts what was
    // produced, raw counts what was pressed.
    expect(TYPO_RESULT.summary.netWpm).toBeLessThan(TYPO_RESULT.summary.grossWpm);
    expect(TYPO_RESULT.summary.finalAccuracy).toBeLessThan(100);
    expect(headlineFigures(TYPO_RESULT).netWpm).not.toBe(headlineFigures(TYPO_RESULT).classicWpm);
  });

  it("the figures list reads one engine field per row, and rejoins to the string table", () => {
    const rows = detailRows(CLEAN);
    expect(rows.map((row) => row.id)).toEqual(DETAIL_METRICS.map((metric) => metric.id));

    rows.forEach((row, index) => {
      const metric = DETAIL_METRICS[index]!;
      const raw = metric.read(CLEAN);
      expect(raw, `${row.id} must read a real engine field`).not.toBeNull();
      // The displayed value is the engine value at the row's declared precision.
      expect(row.value).toContain(raw!.toFixed(metric.decimals));
      // The halves are a split of the string table's own render, not two strings
      // that merely look alike.
      expect(`${row.label}: ${row.value}`).toBe(metric.template(raw!.toFixed(metric.decimals)));
    });

    // The specific field per row, named rather than inferred.
    expect(metricValue(CLEAN, "results-raw")).toBe(CLEAN.summary.rawWpm.toFixed(1));
    expect(metricValue(CLEAN, "results-kspc")).toBe(CLEAN.summary.kspc.toFixed(2));
    expect(metricValue(CLEAN, "results-rollover")).toBe(CLEAN.summary.rolloverRatio.toFixed(1));
    expect(metricValue(CLEAN, "results-burst")).toBe(CLEAN.summary.burstWpm.toFixed(1));
  });

  it("every row's engine field is a field the server recompute also produces", () => {
    // The whole INT-01 claim, stated as a check: every field the table reads must
    // exist on EngineResult. A row reaching for something the server does not
    // compute would not typecheck; this makes the intent explicit and fails
    // loudly if a row is added for a field that arrives later.
    for (const metric of DETAIL_METRICS) {
      const present = metric.read(CLEAN);
      expect(present, `${metric.id} must resolve against a real result`).not.toBeUndefined();
    }
    expect(Object.keys(CLEAN.summary).sort()).toEqual(
      [
        "burstWpm",
        "consistency",
        "difficultyBand",
        "finalAccuracy",
        "flags",
        "grossWpm",
        "ikiMeanMs",
        "keystrokeAccuracy",
        "kspc",
        "modelVersion",
        "netWpm",
        "rawWpm",
        "rolloverRatio",
        "verified",
      ].sort(),
    );
  });

  it("changes what it displays when the engine's value changes (reverse direction)", () => {
    // The check a formatter cannot fake: perturb the engine's number and the
    // displayed string must follow. A view that ignored its input, or that
    // recomputed something else under the same name, fails here.
    const before = detailRows(CLEAN).map((row) => row.value);
    const slower = computeResult(logFor(TARGET, TARGET, 420), {
      id: "PROSE-TEST-001",
      text: TARGET,
    });
    expect(slower.summary.netWpm).toBeLessThan(CLEAN.summary.netWpm);
    const after = detailRows(slower).map((row) => row.value);
    expect(after).not.toEqual(before);
    expect(headlineFigures(slower).netWpm).not.toBe(headline.netWpm);
  });

  it("a non-finite engine value becomes a stated absence, never a NaN on screen", () => {
    const broken: EngineResult = {
      ...CLEAN,
      summary: { ...CLEAN.summary, burstWpm: Number.NaN, rawWpm: Number.NaN },
    };
    const rows = detailRows(broken);
    for (const row of rows) expect(row.value).not.toMatch(/NaN|Infinity/);
    expect(rows.every((row) => row.reported === false)).toBe(false);
    expect(rows.filter((row) => !row.reported).map((row) => row.id)).toEqual([
      "results-raw",
      "results-burst",
    ]);
    expect(metricValue(broken, "results-burst")).toBeNull();
  });
});

describe("honest states are decided from the engine, not invented in the view", () => {
  it("a clean run has no flags and says nothing about having none", () => {
    const assessment = assessResult(CLEAN);
    expect(assessment.flags).toEqual([]);
    // No "nothing flagged" sentence exists, and that is the design: the
    // plausibility checks are threshold-free and server-side, so the client has
    // not looked and must not claim to have.
    expect(COPY).not.toHaveProperty("resultsFlagsNone");
    expect(flagNotes([])).toBe("");
  });

  it("a flagged run is labelled from the engine's own codes", () => {
    const flagged = flaggedResult();
    expect(flagged.summary.flags).toContain("untrusted-events");
    const assessment = assessResult(flagged);
    expect(assessment.flags).toEqual(flagged.summary.flags);
    expect(flagNotes(assessment.flags)).toBe(COPY.resultsFlagWords["untrusted-events"]);
  });

  it("an unrecognised flag is shown verbatim rather than dropped", () => {
    // Hiding a code this file is behind would make the screen look cleaner than
    // the run was, which is the opposite of what it is for.
    expect(flagNotes(["some-future-code"])).toBe("some-future-code");
    expect(flagNotes(["untrusted-events", "some-future-code"])).toBe(
      "input the browser did not mark as trusted, some-future-code",
    );
  });

  it("'short' means the engine's own floor, read from the engine", async () => {
    const { MIN_CONSISTENCY_DURATION_MS } = await import("@realtype/engine");
    expect(SHORT_TEST_MS).toBe(MIN_CONSISTENCY_DURATION_MS);

    const short = assessResult(shortResult());
    expect(short.short).toBe(true);
    expect(short.scoredMs).toBeLessThan(SHORT_TEST_MS);
    // The notice quotes the engine's duration, not a recomputed one.
    expect(shortNotice(short)).toBe(
      COPY.resultsShortBody(formatSeconds(short.scoredMs)!, formatSeconds(SHORT_TEST_MS)!),
    );

    expect(assessResult(CLEAN).short).toBe(false);
  });

  it("the difficulty band is whatever the engine returned, including null", () => {
    expect(assessResult(CLEAN).difficulty).toBeNull();
    // The panel must be able to render a rated and an unrated passage from the
    // same code path, so a band is carried through untouched.
    const rated: EngineResult = {
      ...CLEAN,
      summary: { ...CLEAN.summary, difficultyBand: "typical" },
    };
    expect(assessResult(rated).difficulty).toBe("typical");
  });
});

describe("the one announcement", () => {
  it("carries both headline figures at speech precision and nothing else", () => {
    const sentence = buildAnnouncement(CLEAN);
    expect(sentence).toBe(
      COPY.announceTestFinished(
        formatSpeech(CLEAN.summary.netWpm),
        formatSpeech(CLEAN.summary.finalAccuracy),
        undefined,
      ),
    );
    expect(sentence).toMatch(/words per minute/);
    expect(sentence).toMatch(/percent accuracy/);
    expect(sentence).not.toMatch(/NaN/);
  });

  it("appends the flagged sentence when the run was flagged, in the same string", () => {
    const sentence = buildAnnouncement(flaggedResult());
    expect(sentence).toContain(COPY.resultsFlagsAnnounce);
    // One sentence's worth of text, not two live regions' worth: the note rides
    // on the announcement rather than beside it.
    expect(sentence.indexOf(COPY.resultsFlagsAnnounce)).toBeGreaterThan(
      sentence.indexOf("percent accuracy"),
    );
  });
});
