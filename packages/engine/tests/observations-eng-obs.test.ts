import { afterEach, describe, expect, it, vi } from "vitest";

import type { InputLog, TypingText } from "@realtype/schemas";

import * as b01 from "../fixtures/b01.js";
import * as c01 from "../fixtures/c01.js";
import * as d01 from "../fixtures/d01.js";
import * as d02 from "../fixtures/d02.js";
import * as d03 from "../fixtures/d03.js";
import * as d04 from "../fixtures/d04.js";
import * as eAutoinsert from "../fixtures/e-autoinsert.js";
import * as eDeadkey from "../fixtures/e-deadkey.js";
import * as eDualkey from "../fixtures/e-dualkey.js";
import * as eEmoji from "../fixtures/e-emoji.js";
import * as f01 from "../fixtures/f01.js";
import * as g01 from "../fixtures/g01.js";
import * as pause from "../fixtures/pause.js";
import { buildLog, keyDown, keyUp, typingText } from "../fixtures/helpers.js";
import { filterEvents } from "../src/input-filter.js";
import { computeFromEvents, IKI_GAP_EXCLUSION_MS } from "../src/metrics.js";
import { observationsFromLog } from "../src/observations.js";
import { itemEvidence, keyRef } from "../src/proficiency.js";

/**
 * ENG-OBS — the log → observations adapter.
 *
 * Every rule is pinned in its FAILING direction: the assertion names the
 * observation that must NOT appear. A test that only checked the happy path
 * would pass just as well if the adapter emitted every adjacent pair regardless
 * of corrections, pauses and errors, which is the bug this module exists to
 * not have.
 *
 * Expected values are hand-derived from the fixture logs and the §5.3.12 rules,
 * not read back from the adapter — the same discipline fixtures/recompute.mjs
 * applies to the metric fixtures.
 */

/** `t→h`-style id, so a missing pair is visible by omission. */
const ids = (samples: readonly { from: string; to: string }[]): string[] =>
  samples.map((s) => `${s.from}→${s.to}`);

/** Every string anywhere in a value, for the structural privacy sweep. */
function stringLeaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) stringLeaves(item, out);
  else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) stringLeaves(item, out);
  }
  return out;
}

describe("ENG-OBS-01 keys: one sample per printable scoring press", () => {
  it("B01: 12 samples, 11 correct, the first with no predecessor", () => {
    const obs = observationsFromLog(b01.log, b01.text);

    // 13 scoring presses, one of them the Backspace → 12 printable.
    expect(obs.keys).toHaveLength(12);
    expect(obs.keys.filter((k) => k.correct)).toHaveLength(11);
    // "time from the previous keystroke to this one" is undefined for the first
    // press, and must be reported as unusable rather than as 0 ms — a fabricated
    // zero is the most extreme outlier the §4.12 median can be handed.
    expect(Number.isNaN(obs.keys[0]!.intervalMs)).toBe(true);
    // The correction's time is charged to the press that FOLLOWS it, because the
    // predecessor is the previous keystroke of any kind: x@2181 → Backspace@2400
    // → c@2581, so the retype's time-to-press is 181 ms and the 219 ms spent
    // reaching the Backspace belongs to no key at all. That is exactly what
    // `ikiMean` measures, which is the parity test below.
    expect(obs.keys.slice(1).map((k) => k.intervalMs)).toEqual([
      545, 545, 546, 545, 181, 546, 545, 546, 545, 546, 545,
    ]);
  });

  it("B01: the mis-typed x is a sample flagged wrong, not dropped", () => {
    const obs = observationsFromLog(b01.log, b01.text);

    // The failing direction: 12 samples including the wrong one, and exactly one
    // of them carries correct:false.
    const wrong = obs.keys.filter((k) => !k.correct);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]!.key).toBe("x");
    expect(obs.stats.corrections).toBe(1);
  });

  it("D01 must-correct: both REFUSED presses are observed, flagged wrong", () => {
    const obs = observationsFromLog(d01.log, d01.text);

    // `x` opened the pending error and `a` was refused behind it; neither ever
    // reached the buffer. Observing only landed presses would report a zero
    // error rate for every must-correct typist and leave §8.2.3's error-ratio
    // half permanently 0 in a primary mode. metrics.ts agrees: printable 13,
    // correct 11.
    expect(obs.keys).toHaveLength(13);
    expect(obs.keys.filter((k) => !k.correct).map((k) => k.key)).toEqual(["x", "a"]);
    expect(obs.stats.rejectedPresses).toBe(2);
  });

  it("D02 stop-on-error: the halting press is the last sample, nothing after it", () => {
    const obs = observationsFromLog(d02.log, d02.text);

    // 13 presses in the log; the run ended at 2181 ms, so only the first 5 are
    // observations. The failing direction: 5, not 13.
    expect(obs.stats.scoringPresses).toBe(5);
    expect(obs.keys).toHaveLength(5);
    expect(obs.keys.map((k) => k.key)).toEqual(["t", "h", "e", " ", "x"]);
    expect(obs.keys.at(-1)!.correct).toBe(false);
    // `c`, the first post-halt press, must not appear anywhere in the output.
    expect(JSON.stringify(obs)).not.toContain('"c"');
  });

  it("D03 no-backspace: the ignored Backspace is neither a sample nor a correction", () => {
    const obs = observationsFromLog(d03.log, d03.text);

    // Two Backspaces are in the log and the mode refuses both, so the buffer
    // keeps the typo — the whole point of D03. They must leave no trace but
    // time: no sample, and `corrections` must not claim a correction happened.
    expect(obs.stats.corrections).toBe(0);
    expect(obs.stats.scoringPresses).toBe(13);
    expect(obs.keys.map((k) => k.key)).toEqual([
      "t",
      "h",
      "e",
      " ",
      "x",
      "a",
      "t",
      " ",
      "s",
      "a",
      "t",
    ]);
  });

  it("D03: a wrong press that LANDS still forms a pair, flagged wrong", () => {
    const obs = observationsFromLog(d03.log, d03.text);

    // Distinct from must-correct: nothing refused `x`, so the transition out of
    // the space really was made — it was just made wrongly. §5.3.12.2 asks
    // "whether either was wrong", so the pair exists and reads false.
    expect(ids(obs.bigrams)).toContain(" →x");
    expect(obs.bigrams.find((b) => b.from === " " && b.to === "x")!.correct).toBe(false);
    expect(obs.stats.rejectedPresses).toBe(0);
  });

  it("D04 word-locked: presses refused at the boundary break the pair", () => {
    const obs = observationsFromLog(d04.log, d04.text);

    // 20 scoring presses, 3 of them Backspaces. The three boundary refusals
    // (the space and the `s` after "the cxt", then the space after "the cxa")
    // are real presses that took no target position — each one destroys two
    // candidate gaps, as does each Backspace.
    expect(obs.keys).toHaveLength(17);
    expect(obs.stats.rejectedPresses).toBe(3);
    expect(obs.stats.corrections).toBe(3);

    // The failing direction: no pair is timestamped at a refused press, so no
    // pair can have one as an end.
    for (const refusedAt of [3500, 3700, 4300]) {
      expect(obs.bigrams.some((b) => b.atMs === refusedAt)).toBe(false);
    }
    // The exact list, hand-derived press by press. It is written out rather than
    // only counted because a count of 11 cannot say WHICH eleven, and the
    // skipped gaps are the whole point of the rule.
    expect(ids(obs.bigrams)).toEqual([
      "t→h",
      "h→e",
      "e→ ",
      " →c",
      "c→x",
      "x→t",
      "a→t",
      "t→ ",
      " →s",
      "s→a",
      "a→t",
    ]);
  });

  it("D04: the two wrong-but-landed presses each poison their pair", () => {
    const obs = observationsFromLog(d04.log, d04.text);

    // `c` was right and `x` was wrong, so `c→x` reads false; `x` was wrong and
    // `t` was right, so `x→t` reads false too. The failing direction: a pair
    // scored on its own end alone, which is how a user's worst transitions get
    // hidden behind their good neighbours.
    expect(obs.bigrams.find((b) => b.from === "c")!.correct).toBe(false);
    expect(obs.bigrams.find((b) => b.from === "x")!.correct).toBe(false);
    // And once the word is corrected the clean tail does read clean.
    expect(obs.bigrams.filter((b) => b.correct).map((b) => `${b.from}→${b.to}`)).toEqual([
      "t→h",
      "h→e",
      "e→ ",
      " →c",
      "a→t",
      "t→ ",
      " →s",
      "s→a",
      "a→t",
    ]);
  });

  it("G01 key repeat: repeated presses are not observations", () => {
    const obs = observationsFromLog(g01.log, g01.text);
    // Target "aa" — the fixture's whole point is that the OS repeat is dropped
    // by filterEvents, so exactly two keys and one pair.
    expect(obs.keys).toHaveLength(2);
    expect(ids(obs.bigrams)).toEqual(["a→a"]);
  });

  it("E5 dead key and IME: neither scores a key", () => {
    const obs = observationsFromLog(eDeadkey.log, eDeadkey.text);

    // The failing direction: a `Dead` keydown (half a character), an `Escape`
    // (non-printable), and the IME composition partials are all absent. Only the
    // completing presses are observations.
    for (const forbidden of ["Dead", "Escape", ""]) {
      expect(obs.keys.map((k) => k.key)).not.toContain(forbidden);
    }
    expect(obs.keys.every((k) => k.key.length === 1)).toBe(true);
    expect(obs.stats.unresolvedPresses).toBe(0);
  });
});

describe("ENG-OBS-02 auto-inserted characters are not keystrokes (ENG-09)", () => {
  it("E-AUTOINSERT: the auto-paired bracket yields no key sample", () => {
    const obs = observationsFromLog(eAutoinsert.log, eAutoinsert.text);

    // 4 characters land in the text, 3 were typed. The failing direction: 3
    // samples, not 4 — an auto character is not a keystroke.
    expect(obs.keys.map((k) => k.key)).toEqual(["a", "b", "("]);
    expect(obs.stats.scoringPresses).toBe(3);
    expect(obs.stats.unresolvedPresses).toBe(0);
  });

  it("an auto insert after the last typed key neither adds nor breaks a pair", () => {
    const obs = observationsFromLog(eAutoinsert.log, eAutoinsert.text);
    expect(ids(obs.bigrams)).toEqual(["a→b", "b→("]);
  });

  it("an auto-inserted character the model cannot represent is still not unresolved", () => {
    // A picker or auto-emoji committing a multi-unit character is not a
    // keystroke, so it must not be charged as a LOST observation either. The
    // failing direction: the extraction reporting itself as lossy because of
    // something the user never pressed.
    const text = typingText("eng-obs-auto-emoji", "ab👨‍👩‍👧‍👦");
    const log = buildLog({
      events: [
        keyDown("a", 0),
        keyDown("👨‍👩‍👧‍👦", 40, { code: "Unidentified", auto: true }),
        keyDown("b", 200),
        keyUp("b", 260),
      ],
      textId: text.id,
      textHash: "a2".repeat(32),
      errorMode: "free",
    });

    const obs = observationsFromLog(log, text);
    expect(obs.keys.map((k) => k.key)).toEqual(["a", "b"]);
    expect(obs.stats.unresolvedPresses).toBe(0);
    expect(obs.stats.scoringPresses).toBe(2);
  });

  it("a log of nothing but auto-inserted characters yields zero key samples", () => {
    const text = typingText("eng-obs-all-auto", "()");
    const log = buildLog({
      events: [
        keyDown("(", 0, { code: "Digit9", auto: true }),
        keyDown(")", 40, { code: "Digit0", auto: true }),
      ],
      textId: text.id,
      textHash: "a".repeat(64),
      errorMode: "free",
    });

    const obs = observationsFromLog(log, text);
    // The failing direction, stated as a total: no keystroke was typed, so no
    // key may be observed. A model fed this must see an unmeasured profile, not
    // a fast one.
    expect(obs.keys).toEqual([]);
    expect(obs.bigrams).toEqual([]);
    expect(obs.stats).toEqual({
      scoringPresses: 0,
      rejectedPresses: 0,
      corrections: 0,
      gapExcludedPairs: 0,
      unresolvedPresses: 0,
    });
  });

  it("an auto-paired character stops the next typed key from pairing across it", () => {
    // The realistic auto-pair shape: the user types `f`, then `(`, the app
    // closes the bracket, then the user types the next character. That character
    // now fills a target unit two places on, so there is no clean transition
    // into it (§5.3.12.2 "adjacent pair in the target").
    const text = typingText("eng-obs-autopair-gap", "f(x)");
    const log = buildLog({
      events: [
        keyDown("f", 0),
        keyUp("f", 80),
        keyDown("(", 100, { code: "Digit9", shift: true }),
        keyDown(")", 110, { code: "Digit0", shift: true, auto: true }),
        keyDown("x", 160),
        keyUp("x", 240),
      ],
      textId: text.id,
      textHash: "b".repeat(64),
      errorMode: "free",
    });

    const obs = observationsFromLog(log, text);
    // The failing direction: no `(→x` transition is reported.
    expect(ids(obs.bigrams)).toEqual(["f→("]);
    // And `x` is still a key sample, flagged wrong against the auto-inserted `)`.
    expect(obs.keys.map((k) => k.key)).toEqual(["f", "(", "x"]);
    expect(obs.keys.at(-1)!.correct).toBe(false);
  });
});

describe("ENG-OBS-03 bigram pairing requires adjacency (§5.3.12.4)", () => {
  it("B01: no pair spans the Backspace", () => {
    const obs = observationsFromLog(b01.log, b01.text);

    const formed = ids(obs.bigrams);
    // The failing direction, three ways:
    expect(formed).not.toContain("x→c"); // the correction pairs with nothing
    expect(formed).not.toContain(" →c"); // and the retype inherits no earlier partner
    expect(formed).not.toContain("x→Backspace");
    // 13 scoring presses → 12 candidate gaps; the Backspace destroys two of them.
    expect(formed).toEqual(["t→h", "h→e", "e→ ", " →x", "c→a", "a→t", "t→ ", " →s", "s→a", "a→t"]);
    // `x` DID land (free mode keeps the typo), so the transition into it really
    // was made — wrongly. §5.3.12.2 asks "whether either was wrong", so the pair
    // exists and reads false. Asserted in ENG-OBS-04; noted here so the list
    // above is not misread as a gap in the chain.
    expect(obs.bigrams.find((b) => b.from === " " && b.to === "x")!.correct).toBe(false);
  });

  it("D01: an error between two presses breaks the pair", () => {
    const obs = observationsFromLog(d01.log, d01.text);

    const formed = ids(obs.bigrams);
    // The failing direction: must-correct refused BOTH `x` and `a`, so the run
    // must not jump the two interruptions and report ` →c` — a transition the
    // user did not make in one movement.
    expect(formed).not.toContain(" →c");
    expect(formed).not.toContain("x→a");
    expect(formed).toHaveLength(9);
    expect(formed[0]).toBe("t→h");
    // The chain resumes cleanly once the pending error is cleared by Backspace.
    expect(formed[3]).toBe("c→a");
  });

  it("F01: a pause longer than the IKI gap yields no pair, and is counted", () => {
    const obs = observationsFromLog(f01.log, f01.text);

    // 44 keys, 43 gaps, one of them the fixture's 8 000 ms thinking pause.
    expect(obs.keys).toHaveLength(44);
    expect(obs.bigrams).toHaveLength(42);
    expect(obs.stats.gapExcludedPairs).toBe(1);
    // The failing direction: no pair anywhere spans more than the exclusion.
    expect(obs.bigrams.every((b) => b.intervalMs <= IKI_GAP_EXCLUSION_MS)).toBe(true);
    // And the surviving pairs are exactly the engine's own IKI sample set.
    const mean = obs.bigrams.reduce((sum, b) => sum + b.intervalMs, 0) / obs.bigrams.length;
    expect(mean).toBeCloseTo(190.4761904762, 9);
  });

  it("a gap exactly at the exclusion is kept, one millisecond over is dropped", () => {
    // §5.3.12.4 says "no pause > threshold", and `ikiMean` excludes `> 5000` —
    // the boundary must not be decided differently in two places.
    const text = typingText("eng-obs-gap-boundary", "ab");
    const atLimit = observationsFromLog(
      buildLog({
        events: [keyDown("a", 0), keyDown("b", IKI_GAP_EXCLUSION_MS)],
        textId: text.id,
        textHash: "c".repeat(64),
        errorMode: "free",
      }),
      text,
    );
    expect(atLimit.bigrams).toHaveLength(1);
    expect(atLimit.stats.gapExcludedPairs).toBe(0);

    const overLimit = observationsFromLog(
      buildLog({
        events: [keyDown("a", 0), keyDown("b", IKI_GAP_EXCLUSION_MS + 1)],
        textId: text.id,
        textHash: "c".repeat(64),
        errorMode: "free",
      }),
      text,
    );
    // The failing direction: a 5 001 ms gap is still "a pause", not a transition.
    expect(overLimit.bigrams).toEqual([]);
    expect(overLimit.stats.gapExcludedPairs).toBe(1);
    // The KEY is still observed either way: the press happened and its timing is
    // its own business, not the pair's.
    expect(overLimit.keys).toHaveLength(2);
  });

  it("pause-blur fixture: the 10 s blur gap yields no pair", () => {
    const obs = observationsFromLog(pause.log, pause.text);

    // `c`@3000 → `a`@13000 is the excluded 10 000 ms gap.
    expect(obs.keys).toHaveLength(9);
    expect(obs.bigrams).toHaveLength(7);
    expect(obs.stats.gapExcludedPairs).toBe(1);
    expect(ids(obs.bigrams)).not.toContain("c→a");
    expect(ids(obs.bigrams).slice(0, 4)).toEqual(["t→h", "h→e", "e→ ", " →c"]);
  });

  it("D02: the halting press ends the pairs too", () => {
    const obs = observationsFromLog(d02.log, d02.text);

    expect(ids(obs.bigrams)).toEqual(["t→h", "h→e", "e→ "]);
    expect(obs.bigrams.some((b) => !b.correct)).toBe(false);
  });

  it("C01: an uncorrected typo yields a wrong pair carrying the typo", () => {
    const obs = observationsFromLog(c01.log, c01.text);

    // Target "the cat sat", the user typed "the cot sat": `c`@2181 is right and
    // `o`@2727 is wrong. The failing direction: a wrong pair is recorded as
    // correct because both presses "were typed".
    const wrong = obs.bigrams.filter((b) => !b.correct);
    expect(wrong).toHaveLength(2);
    expect(wrong.map((b) => `${b.from}→${b.to}`)).toEqual(["c→o", "o→t"]);
  });
});

describe("ENG-OBS-04 a pair requires both presses accepted, not merely present", () => {
  it("a pair of two wrong keys is still correct:false", () => {
    const text = typingText("eng-obs-both-wrong", "ab");
    const log = buildLog({
      events: [keyDown("x", 0), keyUp("x", 50), keyDown("y", 120), keyUp("y", 170)],
      textId: text.id,
      textHash: "d".repeat(64),
      errorMode: "free",
    });

    const obs = observationsFromLog(log, text);
    expect(ids(obs.bigrams)).toEqual(["x→y"]);
    // The failing direction: a transition of two wrong keys must not be scored
    // as clean just because both were typed.
    expect(obs.bigrams.filter((b) => b.correct)).toEqual([]);
  });

  it("a press that did not land cannot be an end of a pair, however recent it was", () => {
    const text = typingText("eng-obs-refused-pair", "ab");
    const log = buildLog({
      events: [keyDown("a", 0), keyDown("z", 40), keyDown("b", 80)],
      textId: text.id,
      textHash: "e".repeat(64),
      errorMode: "must-correct",
    });

    const obs = observationsFromLog(log, text);
    // must-correct refuses everything from the first error until Backspace, so
    // `z` and `b` both failed to land. All three presses are observed; only `a`
    // was accepted. The failing direction: a pair `a→b` reconstructed from "the
    // accepted presses", ignoring that the user never actually reached `b` by
    // typing it — the run was stuck behind a mistake.
    expect(ids(obs.bigrams)).toEqual([]);
    expect(obs.keys.map((k) => k.key)).toEqual(["a", "z", "b"]);
    expect(obs.keys.map((k) => k.correct)).toEqual([true, false, false]);
    expect(obs.stats.rejectedPresses).toBe(2);
  });
});

describe("ENG-OBS-05 representability: a key is one UTF-16 code unit or it is counted", () => {
  it("E6 emoji: multi-unit presses are counted, not turned into a bogus key", () => {
    const obs = observationsFromLog(eEmoji.log, eEmoji.text);

    // 6 printable presses; 2 of them are emoji no `SingleKey` can hold. The
    // failing direction: 4 samples, not 6 with surrogate halves, and not 6 with
    // `key[0]` amputated into bogus letters.
    expect(obs.keys).toHaveLength(4);
    expect(obs.keys.map((k) => k.key)).toEqual(["o", "k", " ", "!"]);
    expect(obs.stats.unresolvedPresses).toBe(2);
    expect(JSON.stringify(obs)).not.toContain("\\ud83d");
  });

  it("an emoji press also breaks the pair it would have formed", () => {
    const obs = observationsFromLog(eEmoji.log, eEmoji.text);
    expect(ids(obs.bigrams)).toEqual(["o→k", "k→ "]);
  });

  it("a key is never derived from event.code", () => {
    // E8: the same character on two different physical keys is one observation,
    // and an unrecognised code changes nothing. The failing direction is a
    // fabricated key — `code.slice(3)` turns "KeyS" into "K" and "Semicolon"
    // into "S", neither of which is what was pressed.
    const text = typingText("eng-obs-codes", "sss");
    const log = buildLog({
      events: [
        keyDown("s", 0, { code: "Semicolon" }),
        keyUp("s", 50, { code: "Semicolon" }),
        keyDown("s", 100, { code: "KeyS" }),
        keyUp("s", 150, { code: "KeyS" }),
        keyDown("s", 200, { code: "NoSuchPhysicalKey" }),
        keyUp("s", 250, { code: "NoSuchPhysicalKey" }),
      ],
      textId: text.id,
      textHash: "9".repeat(64),
      errorMode: "free",
    });

    const obs = observationsFromLog(log, text);
    expect(obs.keys.map((k) => k.key)).toEqual(["s", "s", "s"]);
    expect(ids(obs.bigrams)).toEqual(["s→s", "s→s"]);
    expect(obs.stats.unresolvedPresses).toBe(0);
  });

  it("the E-DUALKEY fixtures extract cleanly on their own layouts", () => {
    const dvorak = observationsFromLog(eDualkey.log, eDualkey.text);
    expect(dvorak.keys.map((k) => k.key)).toEqual(["s", "a"]);
    expect(ids(dvorak.bigrams)).toEqual(["s→a"]);

    const azerty = observationsFromLog(eDualkey.logAlt, eDualkey.textAlt);
    expect(azerty.keys.map((k) => k.key)).toEqual(["@", "a"]);
    expect(ids(azerty.bigrams)).toEqual(["@→a"]);
  });
});

describe("ENG-OBS-06 timestamps and monotonicity", () => {
  const allLogs: [string, InputLog, TypingText][] = [
    ["b01", b01.log, b01.text],
    ["c01", c01.log, c01.text],
    ["d01", d01.log, d01.text],
    ["d02", d02.log, d02.text],
    ["d03", d03.log, d03.text],
    ["d04", d04.log, d04.text],
    ["e-autoinsert", eAutoinsert.log, eAutoinsert.text],
    ["e-deadkey", eDeadkey.log, eDeadkey.text],
    ["e-emoji", eEmoji.log, eEmoji.text],
    ["f01", f01.log, f01.text],
    ["g01", g01.log, g01.text],
    ["pause", pause.log, pause.text],
  ];

  it("atMs is event.t verbatim, on the engine's own clock", () => {
    const obs = observationsFromLog(b01.log, b01.text);
    expect(obs.keys.map((k) => k.atMs)).toEqual([
      0, 545, 1090, 1636, 2181, 2581, 3127, 3672, 4218, 4763, 5309, 5854,
    ]);
    // A pair is timestamped when its SECOND key lands: that is when the
    // transition completed and when it earns its §8.4.1 recency weight.
    expect(obs.bigrams[0]!.atMs).toBe(545);
  });

  it.each(allLogs)("%s: every timestamp is non-decreasing", (_id, log, text) => {
    const obs = observationsFromLog(log, text);
    for (const samples of [obs.keys, obs.bigrams]) {
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i]!.atMs).toBeGreaterThanOrEqual(samples[i - 1]!.atMs);
      }
    }
  });

  it("an out-of-order log is not silently repaired", () => {
    // metrics.ts documents a corrupted capture whose second event claims an
    // earlier time. Reordering here would make the adapter disagree with every
    // other metric AND hide the corruption; clamping the interval would invent
    // a plausible one. Both presses are observed in capture order and the
    // negative interval is passed through so `itemEvidence` files it `invalid`.
    const text = typingText("eng-obs-out-of-order", "ab");
    const log = buildLog({
      events: [keyDown("b", 300), keyDown("a", 0)],
      textId: text.id,
      textHash: "a1".repeat(32),
      errorMode: "free",
    });

    const obs = observationsFromLog(log, text);
    expect(obs.keys.map((k) => k.key)).toEqual(["b", "a"]);
    expect(obs.keys.map((k) => k.atMs)).toEqual([300, 0]);
    expect(obs.keys[1]!.intervalMs).toBe(-300);

    const evidence = itemEvidence(keyRef(obs.keys[1]!.key), [obs.keys[1]!], { asOfMs: 1_000 });
    expect(evidence.invalid).toBe(1);
  });

  it("an empty log yields empty output and no crash", () => {
    const text = typingText("eng-obs-empty", "");
    const log = buildLog({
      events: [],
      textId: text.id,
      textHash: "b1".repeat(32),
      errorMode: "must-correct",
    });

    const obs = observationsFromLog(log, text);
    expect(obs.keys).toEqual([]);
    expect(obs.bigrams).toEqual([]);
    expect(obs.stats.scoringPresses).toBe(0);
  });

  it("a log of only keyups yields empty output", () => {
    const text = typingText("eng-obs-keyups-only", "ab");
    const log = buildLog({
      events: [keyUp("a", 10), keyUp("b", 40)],
      textId: text.id,
      textHash: "c1".repeat(32),
      errorMode: "free",
    });

    expect(observationsFromLog(log, text).keys).toEqual([]);
  });
});

describe("ENG-OBS-07 determinism, purity and server parity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extraction runs with Date.now and Math.random booby-trapped", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("the engine must not read a wall clock");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("the engine must not be nondeterministic");
    });

    expect(observationsFromLog(f01.log, f01.text).keys).toHaveLength(44);
  });

  it("two extractions of one log are identical, structurally and byte for byte", () => {
    const first = observationsFromLog(f01.log, f01.text);
    const second = observationsFromLog(f01.log, f01.text);

    expect(first).toStrictEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it.each([
    ["b01", b01.log, b01.text],
    ["c01", c01.log, c01.text],
    ["d01", d01.log, d01.text],
    ["d02", d02.log, d02.text],
    ["d03", d03.log, d03.text],
    ["d04", d04.log, d04.text],
    ["e-autoinsert", eAutoinsert.log, eAutoinsert.text],
    ["e-deadkey", eDeadkey.log, eDeadkey.text],
    ["e-emoji", eEmoji.log, eEmoji.text],
    ["f01", f01.log, f01.text],
    ["pause", pause.log, pause.text],
  ])("%s: key samples agree with metrics.ts press counts", (_id, log, text) => {
    const obs = observationsFromLog(log, text);
    const engine = computeFromEvents(text.text, log.events, log.meta.settings.errorMode, {
      markers: log.markers,
    });

    // One sample per printable press — right, wrong or refused — plus the
    // counted losses. This is the cross-module invariant that keeps the weakness
    // model and the headline metrics describing the same typing.
    expect(obs.keys.length + obs.stats.unresolvedPresses).toBe(engine.details.printableKeystrokes);

    if (obs.stats.unresolvedPresses === 0) {
      expect(obs.keys.filter((k) => k.correct)).toHaveLength(engine.details.correctKeystrokes);
    }
    // With lossy presses the exact identity is `corrects + unresolved corrects`,
    // which the adapter does not track; ENG-OBS-05 pins the loss instead.
  });

  it.each([
    ["c01", c01.log, c01.text],
    ["e-deadkey", eDeadkey.log, eDeadkey.text],
    ["f01", f01.log, f01.text],
    ["g01", g01.log, g01.text],
    ["pause", pause.log, pause.text],
  ])(
    "%s: the interval clock is metrics.ts's IKI clock",
    // Restricted to logs whose scoring-press list holds no Backspace and does not
    // halt. Those are the only cases where every gap between consecutive scoring
    // presses ends on a printable press; a Backspace consumes a gap of its own
    // and a halt truncates the press list, so `presses - 1` is not the right
    // expectation there. Both are pinned by exact values in ENG-OBS-01 (B01's
    // 181 ms, D02's five keys). The Backspace precondition is asserted rather
    // than assumed, so the whitelist cannot rot silently when a fixture changes.
    (_id, log, text) => {
      const obs = observationsFromLog(log, text);
      // `filterEvents` — the engine's own filter — not a hand-rolled
      // re-implementation, so this test cannot drift from what the log means.
      const presses = filterEvents(log.events).scoringPresses;
      expect(presses.some((p) => p.key === "Backspace")).toBe(false);

      const intervals = obs.keys.map((k) => k.intervalMs).filter((v) => Number.isFinite(v));
      expect(intervals).toHaveLength(presses.length - 1);
      // And each interval is exactly the gap to the press before it.
      expect(intervals).toEqual(presses.slice(1).map((p, i) => p.t - presses[i]!.t));
    },
  );

  it("F01: the pair intervals are the engine's IKI samples, mean for mean", () => {
    const engine = computeFromEvents(f01.text.text, f01.log.events, "free");
    const obs = observationsFromLog(f01.log, f01.text);

    expect(engine.details.ikiSampleCount).toBe(obs.bigrams.length);
    const mean = obs.bigrams.reduce((sum, b) => sum + b.intervalMs, 0) / obs.bigrams.length;
    expect(mean).toBeCloseTo(engine.summary.ikiMeanMs ?? 0, 9);
  });
});

describe("ENG-OBS-08 privacy is structural, not conventional", () => {
  it("Observations has no field that could hold text — the compiler refuses", () => {
    const obs: ReturnType<typeof observationsFromLog> = {
      keys: [],
      bigrams: [],
      stats: {
        scoringPresses: 0,
        rejectedPresses: 0,
        corrections: 0,
        gapExcludedPairs: 0,
        unresolvedPresses: 0,
      },
      // @ts-expect-error There is nowhere to put text, and that is the point.
      text: "correcthorsebatterystaple",
    };
    expect(obs.keys).toEqual([]);
  });

  it("ObservationStats is numbers only", () => {
    const stats: ReturnType<typeof observationsFromLog>["stats"] = {
      scoringPresses: 0,
      rejectedPresses: 0,
      corrections: 0,
      gapExcludedPairs: 0,
      unresolvedPresses: 0,
      // @ts-expect-error A count is a count.
      keys: "correcthorsebatterystaple",
    };
    expect(stats.scoringPresses).toBe(0);
  });

  it("not one string in any fixture's output is longer than one character", () => {
    const pairs: [string, InputLog, TypingText][] = [
      ["b01", b01.log, b01.text],
      ["c01", c01.log, c01.text],
      ["d01", d01.log, d01.text],
      ["d02", d02.log, d02.text],
      ["d03", d03.log, d03.text],
      ["d04", d04.log, d04.text],
      ["e-autoinsert", eAutoinsert.log, eAutoinsert.text],
      ["e-deadkey", eDeadkey.log, eDeadkey.text],
      ["e-emoji", eEmoji.log, eEmoji.text],
      ["f01", f01.log, f01.text],
      ["g01", g01.log, g01.text],
      ["pause", pause.log, pause.text],
    ];

    for (const [id, log, text] of pairs) {
      const obs = observationsFromLog(log, text);
      // The whole output, field names included — only the VALUES are swept, so
      // the claim is about data, not about identifiers.
      for (const value of stringLeaves(obs)) {
        expect(value.length, `${id} leaked a ${value.length}-character value`).toBe(1);
      }
      expect(JSON.stringify(obs), id).not.toContain(text.text);
    }
  });

  it("a hostile text field forced onto the result never reaches the samples", () => {
    const hostile = {
      ...observationsFromLog(b01.log, b01.text),
      text: b01.text.text,
      word: "correcthorsebatterystaple",
    } as unknown as ReturnType<typeof observationsFromLog>;

    expect(JSON.stringify(hostile.keys)).not.toContain("correcthorse");
    expect(JSON.stringify(hostile.bigrams)).not.toContain("correcthorse");
  });

  it("the samples feed itemEvidence carrying nothing but keys and times", () => {
    const obs = observationsFromLog(f01.log, f01.text);
    const key = obs.keys[0]!.key;
    const evidence = itemEvidence(
      keyRef(key),
      obs.keys.filter((k) => k.key === key),
      // Later than every sample, so weights are real rather than clamped to 1.
      { asOfMs: 20_000 },
    );

    expect(evidence.observations).toBeGreaterThan(0);
    expect(JSON.stringify(evidence)).not.toContain(f01.text.text);
  });
});

describe("ENG-OBS-09 the first press is honest about having no predecessor", () => {
  it("its interval is filed as invalid rather than invented as 0", () => {
    const obs = observationsFromLog(twoKeyLog(), twoKeyText());
    expect(Number.isNaN(obs.keys[0]!.intervalMs)).toBe(true);
    expect(obs.keys[0]!.correct).toBe(true);

    // `itemEvidence` files a non-finite interval as `invalid` and does NOT count
    // it as an observation. Pinned here because the consequence is real and
    // belongs in the ledger, not because it is desirable: the FIRST key of every
    // attempt loses its accuracy evidence, and since §8.5.2 ranks a profile at
    // 150 observations, one systematic omission per attempt is a measurable
    // dilution. A fabricated 0 would be worse — it would be the most extreme
    // outlier the §4.12 median can be handed, attributed to whichever key the
    // passage happened to start with. See the report: fixing the bias belongs in
    // `itemEvidence`, which owns the `invalid` semantics.
    const evidence = itemEvidence(keyRef(obs.keys[0]!.key), [obs.keys[0]!], { asOfMs: 10_000 });
    expect(evidence.invalid).toBe(1);
    expect(evidence.samples).toBe(0);
    expect(evidence.observations).toBe(0);
    expect(evidence.errors).toBe(0);
    expect(evidence.medianMs).toBe(0);
  });

  it("exactly one observation per attempt is lost, and never more", () => {
    // The loss is bounded and countable, which is the property that makes it
    // reportable rather than a silent drift.
    for (const [log, text] of [
      [b01.log, b01.text],
      [d01.log, d01.text],
      [f01.log, f01.text],
      [eEmoji.log, eEmoji.text],
    ] as [InputLog, TypingText][]) {
      const obs = observationsFromLog(log, text);
      expect(Number.isNaN(obs.keys[0]!.intervalMs)).toBe(true);
      expect(obs.keys.slice(1).every((k) => Number.isFinite(k.intervalMs))).toBe(true);
    }
  });

  it("the second press onward keeps a real interval and full evidence", () => {
    const obs = observationsFromLog(twoKeyLog(), twoKeyText());
    const evidence = itemEvidence(keyRef(obs.keys[1]!.key), [obs.keys[1]!], { asOfMs: 10_000 });

    expect(evidence.observations).toBe(1);
    expect(evidence.errors).toBe(0);
    expect(evidence.invalid).toBe(0);
    expect(evidence.samples).toBe(1);
    expect(evidence.medianMs).toBe(200);
  });
});

/** `ab`, typed correctly 200 ms apart — the smallest log with a second press. */
function twoKeyText(): TypingText {
  return typingText("eng-obs-first-press", "ab");
}

function twoKeyLog(): InputLog {
  const text = twoKeyText();
  return buildLog({
    events: [keyDown("a", 0), keyDown("b", 200)],
    textId: text.id,
    textHash: "d1".repeat(32),
    errorMode: "free",
  });
}
