/**
 * RealType typing engine (open-core, MIT) — input filtering (E2).
 *
 * Pure logic, no DOM: this module takes contract-valid KeyEvents and decides
 * which of them may influence the typing buffer and the metrics. The browser
 * input adapter (M1-04) feeds it; the API recomputes from captured logs with
 * the exact same code, so browser and server can never disagree.
 *
 * Decision record: packages/engine/fixtures/PROVENANCE.md.
 */
import type { KeyEvent, LogMarker } from "@realtype/schemas";

import { graphemeLength } from "./text-model.js";

/** A UI-Events dead key (`key === "Dead"`): the first half of a two-key character. */
export function isDeadKey(event: KeyEvent): boolean {
  return event.key === "Dead";
}

/** Keys that produce a character in the target text: exactly one grapheme. */
function isPrintableKey(key: string): boolean {
  // Grapheme, not code point: a decomposed `é` (e + combining acute) or a ZWJ
  // emoji in one key value is one produced character (chapter 4 E5/E6), while
  // `Dead`/modifier names are many graphemes and never printable.
  return graphemeLength(key) === 1;
}

export function isBackspace(key: string): boolean {
  return key === "Backspace";
}

/** A keydown that is a real physical press of a scoring key. */
export function isScoringPress(event: KeyEvent): boolean {
  if (event.type !== "down") return false;
  // OS key repeat is not a keystroke (chapter 4 §4.8, ENG-FIXTURE-G01).
  if (event.repeat) return false;
  // IME partials are readings, not keystrokes (M1-04 §6, ENG-06).
  if (event.composition === true) return false;
  // A dead key is half a character; the completing press scores (chapter 4 E5).
  if (isDeadKey(event)) return false;
  return isPrintableKey(event.key) || isBackspace(event.key);
}

export interface FilteredEvents {
  /** Keydowns that count as scoring presses (printable or Backspace, non-repeat). */
  scoringPresses: KeyEvent[];
  /** Keydowns dropped as OS key repeat — never user intent. */
  repeatDrops: KeyEvent[];
  /** Keydowns with isTrusted === false (synthetic input). */
  untrusted: KeyEvent[];
  /** Keydowns flagged auto-inserted by the app (auto-pair etc.). */
  auto: KeyEvent[];
  /** Keyups, used only for rollover detection. */
  keyUps: KeyEvent[];
  /** Non-printable, non-Backspace keydowns (Shift, Enter, modifiers). */
  ignored: KeyEvent[];
  /** IME composition partials (`composition === true`): readings, never scored. */
  compositionDrops: KeyEvent[];
  /**
   * Dead-key keydowns (`key === "Dead"`): the first half of a two-key
   * character (chapter 4 E5). Never scored on their own — not even for timing:
   * the completing press's gap to its predecessor already spans the dead-key
   * interval, which is the combined time cost of the one character. A lone
   * dead key with no completion is inert here (and in the text model).
   */
  deadKeys: KeyEvent[];
  /**
   * Every event that may change the produced text, in capture order: the scoring
   * presses plus the app's auto-inserted characters.
   *
   * The text model must replay THIS list, not `scoringPresses` alone. Filtering
   * auto events into a separate bucket and then replaying only the presses meant
   * an auto-paired bracket appeared in neither the produced text nor the
   * metrics, so every character after it was scored against the wrong target
   * position (ENG-09). Both compute paths read this list, which is what keeps
   * them from drifting apart again.
   */
  textAffecting: KeyEvent[];
}

export function filterEvents(events: readonly KeyEvent[]): FilteredEvents {
  const out: FilteredEvents = {
    scoringPresses: [],
    repeatDrops: [],
    untrusted: [],
    auto: [],
    keyUps: [],
    ignored: [],
    compositionDrops: [],
    deadKeys: [],
    textAffecting: [],
  };
  for (const event of events) {
    // Composition partials are dropped before anything else, keyups included:
    // a flagged keyup is part of the unread composition, not of the attempt.
    if (event.composition === true) {
      out.compositionDrops.push(event);
      continue;
    }
    if (event.type === "up") {
      out.keyUps.push(event);
      continue;
    }
    if (event.repeat) {
      out.repeatDrops.push(event);
      continue;
    }
    if (event.isTrusted === false) {
      out.untrusted.push(event);
      continue;
    }
    if (event.auto) {
      out.auto.push(event);
      out.textAffecting.push(event);
      continue;
    }
    if (isScoringPress(event)) {
      out.scoringPresses.push(event);
      out.textAffecting.push(event);
    } else if (isDeadKey(event)) {
      out.deadKeys.push(event);
    } else {
      out.ignored.push(event);
    }
  }
  return out;
}

export interface IntegrityFlags {
  flags: string[];
  /** Verified-mode sessions are invalidated by untrusted/auto input or focus loss. */
  verifiedInvalid: boolean;
}

/**
 * Integrity flags for a captured log (E2). Repeat filtering is normal
 * behaviour and is never flagged; untrusted (synthetic) events and
 * app-auto-inserted events are surfaced, and in a verified session they
 * invalidate verification (chapter 4 part2 §4.10).
 */
export function integrityFlags(
  filtered: FilteredEvents,
  markers: LogMarker[] | undefined,
  mode: "practice" | "verified",
): IntegrityFlags {
  const flags: string[] = [];
  if (filtered.untrusted.length > 0) {
    flags.push("untrusted-events");
  }
  if (filtered.auto.length > 0) {
    flags.push("auto-events-present");
  }
  const lostFocus = (markers ?? []).some((m) => m.kind === "blur" || m.kind === "visibility");
  let verifiedInvalid = false;
  if (
    mode === "verified" &&
    (filtered.untrusted.length > 0 || filtered.auto.length > 0 || lostFocus)
  ) {
    verifiedInvalid = true;
    flags.push("verified-invalid-input");
  }
  return { flags, verifiedInvalid };
}
