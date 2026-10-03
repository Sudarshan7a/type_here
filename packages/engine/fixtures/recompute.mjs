// Throwaway provenance script (Session 2, E0 arithmetic protocol).
//
// Recomputes every expected value for chapter-4 Worked Examples A-G from the
// raw keystroke logs using ONLY the authoritative formulas:
//   - docs/spec/master-spec-v1.md §6.1 (metrics definitions)
//   - .opencode/skills/typing-metrics-spec/SKILL.md
//
// It imports NOTHING from packages/engine. Chapter worked numbers that
// disagree with this recompute are recorded in PROVENANCE.md and used
// CORRECTED in the fixtures.
//
// Run: node fixtures/recompute.mjs   (from packages/engine)
//
// Documented definitions used here (also documented in PROVENANCE.md):
//   - Word = 5 characters.
//   - Duration = last scoring press t - first scoring press t (clock starts on
//     the first accepted keystroke, chapter §4.2 / Edge Case E1).
//   - Scoring presses = trusted, non-repeat, non-auto, non-composition keydowns
//     whose key is a single GRAPHEME (printable) or "Backspace". Dead-key
//     keydowns (`key === "Dead"`) are dropped like repeats (chapter 4 E5).
//   - Comparison unit = grapheme cluster via Intl.Segmenter (chapter 4 E6).
//     Final-text WPM/accuracy/KSPC denominators still count UTF-16 string
//     length (frozen metrics.ts — the E6 fixture pins the wart exactly).
//   - Raw WPM = printable presses / 5 / minutes. Printable includes wrong
//     chars and must-correct rejected attempts (they are physical presses).
//   - Keystroke accuracy = correct-at-press printable presses / printable.
//   - KSPC = accepted buffer-affecting keystrokes (accepted chars + accepted
//     backspaces; rejected attempts never touch the buffer) / final-text chars.
//   - Rollover ratio = presses typed while the immediately preceding press's
//     key was still down / presses that have a predecessor (transitions).
//   - IKI = consecutive scoring-press gaps, gaps > 5000 ms excluded.
//   - Burst = best rolling window [t, t+5000) anchored at accepted user insert
//     times; burst WPM = (chars in window / 5) / (5/60) — fixed 5 s denominator.
//   - Consistency = 100 x (1 - CV) of per-second net speed (correct accepted
//     user inserts per full second, x 12 WPM), excluding the first 2 s,
//     population stdev, clamped 0-100; null when scored duration < 10 s.

import { createHash } from "node:crypto";

const MIN_SCORED_MS = 10_000;
const IKI_MAX_GAP_MS = 5_000;
const BURST_WINDOW_MS = 5_000;

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false };

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function units(text) {
  const out = [];
  for (const { segment } of segmenter.segment(text)) out.push(segment);
  return out;
}

function codeFor(key) {
  if (key === " ") return "Space";
  if (key === "Backspace") return "Backspace";
  if (key === ".") return "Period";
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[A-Z]$/.test(key)) return `Key${key}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  throw new Error(`no code mapping for key ${JSON.stringify(key)}`);
}

function down(key, t, opts = {}) {
  return {
    code: opts.code ?? codeFor(key),
    key,
    type: "down",
    t,
    mods: { ...NO_MODS, shift: opts.shift ?? false },
    repeat: opts.repeat ?? false,
    isTrusted: opts.isTrusted ?? true,
    auto: opts.auto ?? false,
    ...(opts.composition === undefined ? {} : { composition: opts.composition }),
  };
}

function up(key, t, opts = {}) {
  return { ...down(key, t, opts), type: "up" };
}

/** Merge keydowns with constructed keyups at +holdMs (non-overlapping). */
function withKeyups(downs, holdMs = 100) {
  const events = [...downs, ...downs.map((d) => up(d.key, d.t + holdMs, { code: d.code }))].flat();
  return events.sort((a, b) => a.t - b.t);
}

// --- independent metric implementation (spec formulas only) -----------------

function classify(events) {
  const chars = [];
  const backspaces = [];
  const keyups = [];
  let repeatCount = 0;
  let untrustedCount = 0;
  let compositionCount = 0;
  let deadCount = 0;
  let ignoredCount = 0;
  for (const e of events) {
    if (e.composition === true) {
      compositionCount++;
      continue;
    }
    if (e.isTrusted === false) {
      untrustedCount++;
      continue;
    }
    if (e.repeat && e.type === "down") {
      repeatCount++;
      continue;
    }
    if (e.type === "up") {
      keyups.push(e);
      continue;
    }
    if (e.key === "Dead") {
      deadCount++;
      continue;
    }
    if (units(e.key).length === 1) chars.push(e);
    else if (e.key === "Backspace") backspaces.push(e);
    else ignoredCount++;
  }
  return {
    chars,
    backspaces,
    keyups,
    repeatCount,
    untrustedCount,
    compositionCount,
    deadCount,
    ignoredCount,
  };
}

function replay(cls, target, mode) {
  const targetUnits = units(target);
  const ops = [
    ...cls.chars.map((e) => ({ t: e.t, kind: "char", e })),
    ...cls.backspaces.map((e) => ({ t: e.t, kind: "bs", e })),
  ].sort((a, b) => a.t - b.t);
  const buf = [];
  const inserts = [];
  const acceptedBackspaces = [];
  const rejected = [];
  let pendingError = false;
  let stoppedAt = null;
  for (const op of ops) {
    if (stoppedAt !== null) break;
    if (op.kind === "char") {
      if (units(op.e.key).length !== 1) continue; // multi-grapheme commit: adapter must split
      const pos = buf.length;
      const correct = op.e.key === targetUnits[pos];
      if (mode === "must-correct" && !correct) {
        rejected.push(op.e);
        pendingError = true;
        continue;
      }
      if (mode === "stop-on-error" && !correct) {
        stoppedAt = op.t;
        break;
      }
      buf.push(op.e.key);
      inserts.push({ t: op.t, char: op.e.key, correct, auto: op.e.auto });
      pendingError = false;
    } else {
      if (mode === "must-correct" && pendingError) {
        acceptedBackspaces.push(op.e); // clears the error flash; buffer intact
        pendingError = false;
        continue;
      }
      if (buf.length > 0) {
        buf.pop();
        acceptedBackspaces.push(op.e);
      }
      pendingError = false;
    }
  }
  return {
    finalText: buf.slice(0, targetUnits.length).join(""),
    inserts,
    acceptedBackspaces,
    rejected,
    stoppedAt,
  };
}

function rolloverRatio(presses, keyups) {
  if (presses.length < 2)
    return { ratio: 0, overlapped: 0, transitions: Math.max(0, presses.length - 1) };
  const upsByCode = new Map();
  for (const u of keyups) {
    if (!upsByCode.has(u.code)) upsByCode.set(u.code, []);
    upsByCode.get(u.code).push(u.t);
  }
  for (const arr of upsByCode.values()) arr.sort((a, b) => a - b);
  let overlapped = 0;
  for (let i = 1; i < presses.length; i++) {
    const prev = presses[i - 1];
    const ups = upsByCode.get(prev.code) ?? [];
    const upT = ups.find((t) => t > prev.t);
    if (upT !== undefined && upT > presses[i].t) overlapped++;
  }
  return { ratio: overlapped / (presses.length - 1), overlapped, transitions: presses.length - 1 };
}

function ikiMean(presses) {
  const gaps = [];
  for (let i = 1; i < presses.length; i++) {
    const g = presses[i].t - presses[i - 1].t;
    if (g <= IKI_MAX_GAP_MS) gaps.push(g);
  }
  if (gaps.length === 0)
    return { mean: null, samples: 0, excluded: presses.length - 1 - gaps.length };
  return {
    mean: gaps.reduce((a, b) => a + b, 0) / gaps.length,
    samples: gaps.length,
    excluded: presses.length - 1 - gaps.length,
  };
}

function burstWpm(insertTimes) {
  const ts = [...insertTimes].sort((a, b) => a - b);
  let best = 0;
  for (let i = 0; i < ts.length; i++) {
    let j = i;
    while (j < ts.length && ts[j] < ts[i] + BURST_WINDOW_MS) j++;
    if (j - i > best) best = j - i;
  }
  return { wpm: best === 0 ? 0 : best / 5 / (BURST_WINDOW_MS / 60000), windowChars: best };
}

function consistency(correctInsertTimes, durationMs) {
  if (durationMs < MIN_SCORED_MS) return { value: null, buckets: [] };
  const lastFull = Math.floor(durationMs / 1000) - 1;
  const buckets = [];
  for (let s = 2; s <= lastFull; s++) {
    const lo = s * 1000;
    const hi = lo + 1000;
    const n = correctInsertTimes.filter((t) => t >= lo && t < hi).length;
    buckets.push({ second: s, chars: n, wpm: n * 12 });
  }
  if (buckets.length === 0) return { value: null, buckets };
  const vals = buckets.map((b) => b.wpm);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return { value: 0, buckets };
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  const cv = sd / mean;
  return { value: Math.min(100, Math.max(0, 100 * (1 - cv))), buckets, mean, sd, cv };
}

function computeMetrics(events, target, mode) {
  const cls = classify(events);
  const rep = replay(cls, target, mode);
  let { chars, backspaces, keyups } = cls;
  if (rep.stoppedAt !== null) {
    chars = chars.filter((e) => e.t <= rep.stoppedAt);
    backspaces = backspaces.filter((e) => e.t <= rep.stoppedAt);
  }
  const userChars = chars.filter((e) => !e.auto);
  // Integrity flag, mirroring input-filter.ts: auto input is recorded, never
  // banned. Every pre-existing fixture has no auto events, so this is [] for
  // all of them and ["auto-events-present"] only where auto input occurred.
  const flags = chars.some((e) => e.auto) ? ["auto-events-present"] : [];
  const presses = [...userChars, ...backspaces].sort((a, b) => a.t - b.t);
  if (presses.length === 0) throw new Error("no scored keystrokes");
  const durationMs = presses[presses.length - 1].t - presses[0].t;
  const minutes = durationMs / 60000;
  const finalText = rep.finalText;
  // Unit-by-unit (chapter 4 E6); the denominators below still count UTF-16
  // string length (frozen metrics.ts) — the E6 wart, pinned exactly.
  const finalUnits = units(finalText);
  const targetUnits = units(target);
  let correctInFinal = 0;
  for (let i = 0; i < finalUnits.length; i++) {
    if (finalUnits[i] === targetUnits[i]) correctInFinal++;
  }
  const printable = userChars.length;
  const correctPrintable = rep.inserts.filter((i) => i.correct && !i.auto).length;
  const userInserts = rep.inserts.filter((i) => !i.auto);
  const speed = (n) => (durationMs > 0 ? n / 5 / minutes : 0);
  const ro = rolloverRatio(presses, keyups);
  const iki = ikiMean(presses);
  const burst = burstWpm(userInserts.map((i) => i.t));
  const cons = consistency(
    userInserts.filter((i) => i.correct).map((i) => i.t),
    durationMs,
  );
  const totalAttempts = userChars.length + backspaces.length;
  return {
    summary: {
      rawWpm: speed(printable),
      grossWpm: speed(finalText.length),
      netWpm: speed(correctInFinal),
      keystrokeAccuracy: printable === 0 ? 0 : (correctPrintable / printable) * 100,
      finalAccuracy: finalText.length === 0 ? 0 : (correctInFinal / finalText.length) * 100,
      kspc:
        finalText.length === 0
          ? 0
          : (userInserts.length + rep.acceptedBackspaces.length) / finalText.length,
      rolloverRatio: ro.ratio,
      consistency: cons.value,
      burstWpm: burst.wpm,
      ikiMeanMs: iki.mean,
      modelVersion: "1.1.0",
      difficultyBand: null,
      verified: false,
      flags,
    },
    details: {
      durationMs,
      printableKeystrokes: printable,
      correctKeystrokes: correctPrintable,
      correctCharsInFinalText: correctInFinal,
      finalTextLength: finalText.length,
      bufferInserts: userInserts.length,
      backspaces: rep.acceptedBackspaces.length,
      rejectedAttempts: rep.rejected.length,
      totalAttempts,
      rejectedAttemptRate: totalAttempts === 0 ? 0 : (rep.rejected.length / totalAttempts) * 100,
      overlappedPresses: ro.overlapped,
      rolloverTransitions: ro.transitions,
      ikiSampleCount: iki.samples,
      ikiExcludedGaps: iki.excluded,
      burstWindowChars: burst.windowChars,
      stoppedAtMs: rep.stoppedAt,
      finalText,
    },
    consistencyBuckets: cons.buckets,
    repeatCount: cls.repeatCount,
    untrustedCount: cls.untrustedCount,
    compositionCount: cls.compositionCount,
    deadCount: cls.deadCount,
    ignoredCount: cls.ignoredCount,
  };
}

// --- raw logs for Worked Examples A-G (chapter §4.2–§4.8) ------------------

const TARGET_CAT = "the cat sat";

// §4.2 Example A: perfect even typing, 11 keystrokes at ~545 ms.
const A01_DOWNS = [
  down("t", 0),
  down("h", 545),
  down("e", 1090),
  down(" ", 1636),
  down("c", 2181),
  down("a", 2727),
  down("t", 3272),
  down(" ", 3818),
  down("s", 4363),
  down("a", 4909),
  down("t", 5454),
];

// §4.3 Example B: one corrected error (x -> Backspace -> c), +400 ms.
const B01_DOWNS = [
  down("t", 0),
  down("h", 545),
  down("e", 1090),
  down(" ", 1636),
  down("x", 2181),
  down("Backspace", 2400),
  down("c", 2581),
  down("a", 3127),
  down("t", 3672),
  down(" ", 4218),
  down("s", 4763),
  down("a", 5309),
  down("t", 5854),
];

// §4.4 Example C: one uncorrected error ("the cot sat"), same skeleton as A.
const C01_DOWNS = [
  down("t", 0),
  down("h", 545),
  down("e", 1090),
  down(" ", 1636),
  down("c", 2181),
  down("o", 2727),
  down("t", 3272),
  down(" ", 3818),
  down("s", 4363),
  down("a", 4909),
  down("t", 5454),
];

// §4.5 Example D: must-correct mode, two rejected attempts + Backspace.
const D01_DOWNS = [
  down("t", 0),
  down("h", 545),
  down("e", 1090),
  down(" ", 1636),
  down("x", 2181),
  down("a", 2350),
  down("Backspace", 2500),
  down("c", 2681),
  down("a", 3227),
  down("t", 3772),
  down(" ", 4318),
  down("s", 4863),
  down("a", 5409),
  down("t", 5954),
];

// §4.6 Example E: rollover pair (explicit keyups from the chapter).
const E01_EVENTS = [down("f", 0), down("j", 60), up("f", 110), up("j", 150)];

// §4.7 Example F: long mid-test pause. 44 chars (see PROVENANCE: the printed
// pangram is 43 chars; + trailing period = 44 makes every stated total exact).
const TARGET_FOX = "the quick brown fox jumps over the lazy dog.";
function f01Time(k) {
  // burst 1: k = 0..21 -> [0, 4000]; burst 2: k = 22..43 -> [12000, 16000]
  return k < 22 ? (k * 4000) / 21 : 12000 + ((k - 22) * 4000) / 21;
}
const F01_DOWNS = [...TARGET_FOX].map((_, k) => down(TARGET_FOX[k], f01Time(k)));

// §4.8 Example G: OS key-repeat must be filtered (explicit keyups).
const G01_EVENTS = [
  down("a", 0),
  down("a", 520, { repeat: true }),
  up("a", 540),
  down("a", 900),
  up("a", 950),
];

// §4.13 companions: E02 zero overlap passage, E03 every transition overlaps.
const E02_TARGET = "the quick brown fox";
const E02_DOWNS = [...E02_TARGET].map((ch, k) => down(ch, k * 150));
const E03_TARGET = "fjdksl";
const E03_DOWNS = [
  down("f", 0),
  down("j", 60),
  down("d", 120),
  down("k", 180),
  down("s", 240),
  down("l", 300),
];
const E03_EVENTS = [
  ...E03_DOWNS,
  up("f", 110),
  up("j", 170),
  up("d", 230),
  up("k", 290),
  up("s", 350),
  up("l", 400),
].sort((a, b) => a.t - b.t);

// --- ENG-06 input semantics (chapter 4 E3/E5/E6 + M1-04 §6 IME guard) --------

function explicitEvents(downs, holdMs = 80) {
  return [...downs, ...downs.map((d) => up(d.key, d.t + holdMs, { code: d.code }))].sort(
    (a, b) => a.t - b.t,
  );
}

// E3 (e-caps.ts): Caps-Lock case errors; digits/space unaffected by caps.
const ECAPS_TARGET = "ab 12";
const ECAPS_DOWNS = [
  down("A", 0, { shift: true }),
  down("B", 500),
  down(" ", 1000),
  down("1", 1500),
  down("2", 2000),
];
const ECAPS_EVENTS = explicitEvents(ECAPS_DOWNS, 100);

// E5 (e-deadkey.ts): dead-key ï + IME-composed é + IME-guard adversarials.
const EDEAD_TARGET = "naïve café";
const EDEAD_DOWNS = [
  down("i", 0, { code: "KeyI", composition: true }),
  down("ï", 150, { code: "KeyI", composition: true }),
  down("Escape", 300, { code: "Escape" }),
  down("n", 500),
  down("a", 900),
  down("Dead", 1300, { code: "Quote" }),
  down("ï", 1500, { code: "KeyI" }),
  down("v", 1900),
  down("e", 2300),
  down(" ", 2700),
  down("c", 3100),
  down("a", 3500),
  down("f", 3900),
  down("e", 4200, { code: "KeyE", composition: true }),
  down("é", 4350, { code: "KeyE", composition: true }),
  down("é", 4500, { code: "KeyE", composition: false }),
  down("Backspace", 4600, { code: "Backspace", composition: true }),
  down("", 4700, { code: "Unidentified", composition: false }),
  down("Dead", 4900, { code: "Quote" }),
];
const EDEAD_EVENTS = explicitEvents(EDEAD_DOWNS, 80);

// E6 (e-emoji.ts): ZWJ family as one grapheme; piecemeal part corrected.
const EEMOJI_TARGET = "ok 👨‍👩‍👧‍👦!";
const EEMOJI_DOWNS = [
  down("o", 0),
  down("k", 400),
  down(" ", 800),
  down("👨", 1200, { code: "Unidentified" }),
  down("Backspace", 1400),
  down("👨‍👩‍👧‍👦", 1800, { code: "Unidentified" }),
  down("!", 2200, { code: "Digit1", shift: true }),
];
const EEMOJI_EVENTS = explicitEvents(EEMOJI_DOWNS, 80);

// E-DUALKEY (e-dualkey.ts): code-aware attribution; dvorak "sa" (E01 skeleton,
// `s` on Semicolon) + azerty "@a" (`@` on AltGr+Digit0, `a` on KeyQ).
const EDUAL_TARGET = "sa";
const EDUAL_DOWNS = [down("s", 0, { code: "Semicolon" }), down("a", 60, { code: "KeyA" })];
const EDUAL_EVENTS = [
  ...EDUAL_DOWNS,
  up("s", 110, { code: "Semicolon" }),
  up("a", 170, { code: "KeyA" }),
].sort((a, b) => a.t - b.t);

const EDUAL_ALT_TARGET = "@a";
// NOTE: this recompute's down() always stamps NO_MODS; mods never enter the
// metric formulas (E3 precedent), so the fixture's alt:true shapes nothing here.
const EDUAL_ALT_DOWNS = [down("@", 0, { code: "Digit0" }), down("a", 400, { code: "KeyQ" })];
const EDUAL_ALT_EVENTS = [
  ...EDUAL_ALT_DOWNS,
  up("@", 100, { code: "Digit0" }),
  up("a", 500, { code: "KeyQ" }),
].sort((a, b) => a.t - b.t);

// E-AUTOINSERT (e-autoinsert.ts): auto-paired ")" excluded from typed counts.
// The auto press carries no keyup (nobody pressed it) — unlike withKeyups.
const EAUTO_TARGET = "ab()";
const EAUTO_EVENTS = [
  down("a", 0),
  up("a", 100),
  down("b", 500),
  up("b", 600),
  down("(", 1000, { code: "Digit9", shift: true }),
  up("(", 1100, { code: "Digit9" }),
  down(")", 1150, { code: "Digit0", shift: true, auto: true }),
].sort((a, b) => a.t - b.t);

const CASES = [
  ["ENG-FIXTURE-A01", withKeyups(A01_DOWNS), TARGET_CAT, "free"],
  ["ENG-FIXTURE-B01", withKeyups(B01_DOWNS), TARGET_CAT, "free"],
  ["ENG-FIXTURE-C01", withKeyups(C01_DOWNS), TARGET_CAT, "free"],
  ["ENG-FIXTURE-D01", withKeyups(D01_DOWNS), TARGET_CAT, "must-correct"],
  ["ENG-FIXTURE-E01", E01_EVENTS, "fj", "free"],
  ["ENG-FIXTURE-E02", withKeyups(E02_DOWNS, 75), E02_TARGET, "free"],
  ["ENG-FIXTURE-E03", E03_EVENTS, E03_TARGET, "free"],
  ["ENG-FIXTURE-F01", withKeyups(F01_DOWNS), TARGET_FOX, "free"],
  ["ENG-FIXTURE-G01", G01_EVENTS, "aa", "free"],
  ["ENG-FIXTURE-E3", ECAPS_EVENTS, ECAPS_TARGET, "free"],
  ["ENG-FIXTURE-E5", EDEAD_EVENTS, EDEAD_TARGET, "free"],
  ["ENG-FIXTURE-E6", EEMOJI_EVENTS, EEMOJI_TARGET, "free"],
  ["ENG-FIXTURE-E-DUALKEY", EDUAL_EVENTS, EDUAL_TARGET, "free"],
  ["ENG-FIXTURE-E-DUALKEY-ALT", EDUAL_ALT_EVENTS, EDUAL_ALT_TARGET, "free"],
  ["ENG-FIXTURE-E-AUTOINSERT", EAUTO_EVENTS, EAUTO_TARGET, "free"],
];

// --- run --------------------------------------------------------------------

console.log("target-text sha256 hashes:");
for (const t of [
  TARGET_CAT,
  TARGET_FOX,
  "fj",
  "aa",
  E02_TARGET,
  E03_TARGET,
  ECAPS_TARGET,
  EDEAD_TARGET,
  EEMOJI_TARGET,
  EDUAL_TARGET,
  EDUAL_ALT_TARGET,
  EAUTO_TARGET,
]) {
  console.log(
    `  ${JSON.stringify(t)} (${[...t].length} chars) -> ${createHash("sha256").update(t, "utf8").digest("hex")}`,
  );
}
console.log("");

for (const [id, events, target, mode] of CASES) {
  const r = computeMetrics(events, target, mode);
  console.log(`=== ${id} (mode=${mode}, target=${JSON.stringify(target)}) ===`);
  console.log("  summary:");
  for (const [k, v] of Object.entries(r.summary)) {
    console.log(
      `    ${k}: ${v === null ? "null" : typeof v === "number" ? v.toFixed(10) : JSON.stringify(v)}`,
    );
  }
  console.log("  details:");
  for (const [k, v] of Object.entries(r.details)) {
    console.log(`    ${k}: ${typeof v === "number" ? v.toFixed(10) : JSON.stringify(v)}`);
  }
  if (r.consistencyBuckets.length > 0) {
    console.log(
      `  consistency buckets (s, chars, wpm): ${r.consistencyBuckets.map((b) => `${b.second}:${b.chars}/${b.wpm}`).join(" ")}`,
    );
  }
  console.log(
    `  buckets: repeat=${r.repeatCount} untrusted=${r.untrustedCount} composition=${r.compositionCount} dead=${r.deadCount} ignored=${r.ignoredCount}`,
  );
  console.log("");
}

// F01 regression guard from the chapter: burst must beat 1.5 x net.
const f01 = computeMetrics(withKeyups(F01_DOWNS), TARGET_FOX, "free");
console.log(
  `F01 guard: burst ${f01.summary.burstWpm.toFixed(4)} > 1.5 x net ${f01.summary.netWpm.toFixed(4)} = ${(1.5 * f01.summary.netWpm).toFixed(4)} -> ${f01.summary.burstWpm > 1.5 * f01.summary.netWpm}`,
);

// Naive-IKI sanity (chapter §4.7 claims naive mean ~372 ms for F01).
const f01Presses = [...withKeyups(F01_DOWNS)].filter((e) => e.type === "down");
let sum = 0;
for (let i = 1; i < f01Presses.length; i++) sum += f01Presses[i].t - f01Presses[i - 1].t;
console.log(
  `F01 naive IKI mean (bug case, nothing excluded): ${(sum / (f01Presses.length - 1)).toFixed(4)} ms (chapter says "roughly 372 ms")`,
);

// --- INT plausibility backstop (ENG-07, INT-02) ----------------------------
//
// Standalone arithmetic for the INT fixtures under the same
// no-engine-imports protocol: per-window mean IKIs and burst spans from
// literal timestamp constructions mirroring int-fixture-001.ts,
// int-fixture-002.ts, and e-paste.ts. Verdict floors live ONLY in the tests
// (injected `[proposal]` values), never here and never in the fixtures.

function intWindowMeans(times, windowSize) {
  const means = [];
  for (let s = 0; s + windowSize <= times.length - 1; s++) {
    let total = 0;
    for (let k = s; k < s + windowSize; k++) total += times[k + 1] - times[k];
    means.push(total / windowSize);
  }
  return means;
}

// INT-FIXTURE-001: eleven presses each (ten gaps per log, one window).
const INT_BOT_T = Array.from({ length: 11 }, (_, i) => i * 20);
const INT_ELITE_GAPS = [52, 48, 61, 55, 47, 58, 50, 53, 49, 56];
const INT_ELITE_T = [0];
for (const g of INT_ELITE_GAPS) INT_ELITE_T.push(INT_ELITE_T[INT_ELITE_T.length - 1] + g);

// INT-FIXTURE-002: 200 presses at 150 ms, press 101 pulled back to +4 ms.
const INT002_T = Array.from({ length: 200 }, (_, k) => (k === 101 ? 100 * 150 + 4 : k * 150));

// ENG-FIXTURE-E-PASTE: presses at eighth-millisecond steps (bit-exact).
const PASTE_T = Array.from({ length: 40 }, (_, k) => k / 8);

console.log("");
console.log("=== INT-FIXTURE-001-physical-floor-worked ===");
for (const m of intWindowMeans(INT_BOT_T, 10)) console.log(`  bot window mean: ${m.toFixed(10)}`);
for (const m of intWindowMeans(INT_ELITE_T, 10))
  console.log(`  elite window mean: ${m.toFixed(10)}`);

console.log("=== INT-FIXTURE-002-single-outlier-detection ===");
const w002 = intWindowMeans(INT002_T, 10);
console.log(`  windows: ${w002.length}, min window mean: ${Math.min(...w002).toFixed(10)}`);
console.log(
  `  outlier gap t(101)-t(100): ${(INT002_T[101] - INT002_T[100]).toFixed(10)}, recovery gap t(102)-t(101): ${(INT002_T[102] - INT002_T[101]).toFixed(10)}`,
);

console.log("=== ENG-FIXTURE-E-PASTE ===");
console.log(
  `  presses: ${PASTE_T.length}, span t(39)-t(0): ${(PASTE_T[39] - PASTE_T[0]).toFixed(10)} ms`,
);
