import { keyDown } from "./helpers.js";

/**
 * INT-FIXTURE-001-physical-floor-worked (chapter-10 §10.2.2).
 *
 * Two eleven-press timing logs over the same key set, built for the
 * sustained-rate floor check (`windowMeans` + `flagSustainedFloor`, whose
 * floor value is injected by the test — this file pins DATA only):
 *
 * - BOT: a naive auto-typer at a fixed pace, gaps of 20 ms throughout.
 *   t = 0, 20, …, 200 (eleven presses, ten gaps).
 * - ELITE: a genuine elite burst from the chapter's worked example, gaps
 *   52, 48, 61, 55, 47, 58, 50, 53, 49, 56 ms, i.e. t = 0, 52, 100, 161,
 *   216, 263, 321, 371, 424, 473, 529 (eleven presses, ten gaps).
 *
 * Hand-computed window means (window = ten consecutive gaps, so each log
 * yields exactly one window; recomputed independently by recompute.mjs,
 * which imports nothing from packages/engine):
 *
 *   bot     (10 × 20) / 10                                        → 20.0
 *   elite   (52+48+61+55+47+58+50+53+49+56) / 10 = 529 / 10        → 52.9
 *
 * The chapter's point, pinned here as data for the test to judge: the bot
 * mean (20.0) sits far below any human-plausible sustained floor while the
 * elite mean (52.9) sits clearly above it — the margin between them is what
 * lets one dividing line separate automation from the fastest real typists.
 * The verdict (flag/pass) and the margin arithmetic live in the test, next
 * to the injected floor value.
 *
 * Privacy: press times and physical codes only — no text, no content.
 */
export const FIXTURE_ID = "INT-FIXTURE-001-physical-floor-worked";

const BOT_GAP_MS = 20;
const ELITE_GAPS_MS = [52, 48, 61, 55, 47, 58, 50, 53, 49, 56];

const KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];

function pressesAt(times: number[]) {
  return times.map((t, i) => keyDown(KEYS[i]!, t));
}

export const botDowns = pressesAt(KEYS.map((_, i) => i * BOT_GAP_MS));

const eliteTimes: number[] = [0];
for (const gap of ELITE_GAPS_MS) eliteTimes.push(eliteTimes[eliteTimes.length - 1]! + gap);

export const eliteDowns = pressesAt(eliteTimes);

/** Hand-computed: ten gaps of 20 ms → mean 20.0. */
export const BOT_WINDOW_MEAN = 20;

/** Hand-computed: gap sum 529 ms over ten gaps → mean 52.9. */
export const ELITE_WINDOW_MEAN = 52.9;

/** The elite gap sequence, kept for independent recomputation. */
export { ELITE_GAPS_MS };
