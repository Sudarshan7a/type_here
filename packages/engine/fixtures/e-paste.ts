import { keyDown } from "./helpers.js";

/**
 * ENG-FIXTURE-E-PASTE (chapter-4 edge case E7, §4.9).
 *
 * Defense in depth for pasting: the client blocks the paste event at the DOM
 * level, but if that block fails on some browser/OS combination, the
 * server-side plausibility backstop must still catch the shape — a block of
 * characters arriving far faster than any physical typing. This fixture pins
 * the chapter's worked shape as DATA (the verdict limits are injected by the
 * test, never stored here):
 *
 *   presses at t = k/8 ms for k = 0 … 39 (eighth-millisecond steps are
 *   exactly representable, so the hand arithmetic below is bit-exact).
 *
 * Hand computation (recomputed independently by recompute.mjs, which imports
 * nothing from packages/engine):
 *
 *   event count   39 − 0 + 1                                    → 40 presses
 *   span          t(39) − t(0) = 39/8                           → 4.875 ms
 *   mean gap      4.875 / 39                                    → 0.125 ms
 *
 * The count above is event data mirroring the chapter's worked example, not
 * a policy threshold — the policy numbers (how many presses, how small a
 * span) are injected by the test and, in production, by the WAVE-1 server.
 *
 * Privacy: press times and physical codes only — no text, no content.
 */
export const FIXTURE_ID = "ENG-FIXTURE-E-PASTE";

/** Worked-example size from chapter-4 E7 (event DATA, not a threshold). */
const PASTE_PRESS_COUNT = 40;

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export const pasteDowns = Array.from({ length: PASTE_PRESS_COUNT }, (_, k) =>
  keyDown(LETTERS[k % LETTERS.length]!, k / 8),
);

/** Hand-computed: t(39) − t(0) = 39/8 = 4.875 ms. */
export const PASTE_SPAN_MS = 4.875;

/** Construction pin, exported so the test cannot drift from this comment. */
export { PASTE_PRESS_COUNT };
