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

/** Keys that produce a character in the target text. */
function isPrintableKey(key: string): boolean {
  return [...key].length === 1;
}

export function isBackspace(key: string): boolean {
  return key === "Backspace";
}

/** A keydown that is a real physical press of a scoring key. */
export function isScoringPress(event: KeyEvent): boolean {
  if (event.type !== "down") return false;
  // OS key repeat is not a keystroke (chapter 4 §4.8, ENG-FIXTURE-G01).
  if (event.repeat) return false;
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
}

export function filterEvents(events: KeyEvent[]): FilteredEvents {
  const out: FilteredEvents = {
    scoringPresses: [],
    repeatDrops: [],
    untrusted: [],
    auto: [],
    keyUps: [],
    ignored: [],
  };
  for (const event of events) {
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
      continue;
    }
    if (isScoringPress(event)) {
      out.scoringPresses.push(event);
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
