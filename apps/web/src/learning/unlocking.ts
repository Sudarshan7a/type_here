/**
 * Gradual unlocking (LRN-03): what the surface may put in front of you.
 *
 * The rule the spec states is "max 2 new items at once by default", with
 * SEPARATE averages per content type so harder text does not distort the
 * baseline. The engine already scores per key and per bigram; what was missing
 * is the decision about which items are AVAILABLE.
 *
 * This module makes that decision, as a pure function of what has been
 * measured. It does not decide how anything is scored (rule 3) and it does not
 * know anything about the DOM.
 *
 * THE UNLOCKING ORDER
 *
 * Home row → top row → bottom row → numbers → symbols. Five character sets,
 * unlocked one at a time. The max-two-new rule is applied WITHIN a set: a set
 * is only offered once every key in the previous set is solid, and while it is
 * being learned, at most two of its keys are new at any time.
 *
 * Progress is never re-locked. A key that is once solid stays unlocked, because
 * a learner who watched a set unlock should not see it close again after a bad
 * afternoon.
 */

/** The character sets, in the order they are unlocked. */
export const UNLOCK_SETS = [
  { id: "home", label: "Home row", charset: "asdfjkl;" },
  { id: "top", label: "Top row", charset: "qwertyuiop" },
  { id: "bottom", label: "Bottom row", charset: "zxcvbnm,./" },
  { id: "shift", label: "Capitals", charset: "ASDFJKLQWERTYUIOPZXCVBNM" },
  { id: "numbers", label: "Numbers", charset: "0123456789" },
] as const;

export type UnlockSetId = (typeof UNLOCK_SETS)[number]["id"];

/** How many keys may be new at once, per LRN-03. */
export const MAX_NEW_AT_ONCE = 2;

/** Below this confidence an item counts as still being learned, not solid. */
export const SOLID_CONFIDENCE = 0.6;

export interface UnlockState {
  /** The set the visitor is currently working through. */
  readonly activeSetId: UnlockSetId;
  /** Every set already unlocked, in order. */
  readonly unlockedSetIds: readonly UnlockSetId[];
  /** The characters the surface may put in front of them right now. */
  readonly availableChars: ReadonlySet<string>;
  /** The characters that are unlocked but not yet solid, capped at MAX_NEW. */
  readonly learningChars: readonly string[];
}

/**
 * The unlock state for a measured profile.
 *
 * `solidChars` is the set of characters the visitor is solid on (from the
 * engine's proficiency report or any honest caller). A set unlocks when every
 * character in the set before it is solid; while a set is active, its first
 * `MAX_NEW_AT_ONCE` characters are the ones being learned.
 */
export function unlockStateFor(solidChars: ReadonlySet<string>): UnlockState {
  const unlocked: UnlockSetId[] = [];
  let activeIndex = 0;

  for (let i = 0; i < UNLOCK_SETS.length; i++) {
    const set = UNLOCK_SETS[i]!;
    const previous = i === 0 ? null : UNLOCK_SETS[i - 1]!;
    // A set unlocks when the one before it is fully solid (or is the first).
    const ready = previous === null || [...previous.charset].every((c) => solidChars.has(c));
    if (ready) {
      unlocked.push(set.id);
      activeIndex = i;
    } else {
      break;
    }
  }

  const active = UNLOCK_SETS[activeIndex]!;
  const learning = [...active.charset].filter((c) => !solidChars.has(c)).slice(0, MAX_NEW_AT_ONCE);

  // Available = everything unlocked, including the at-most-two new keys.
  const available = new Set<string>();
  for (const set of UNLOCK_SETS) {
    if (!unlocked.includes(set.id)) continue;
    for (const c of set.charset) available.add(c);
  }
  for (const c of learning) available.add(c);

  return {
    activeSetId: active.id,
    unlockedSetIds: unlocked,
    availableChars: available,
    learningChars: learning,
  };
}

/**
 * The label for the set being learned, for the UI. Pure and total, so a state
 * that names an unknown set still renders something rather than nothing.
 */
export function setLabel(id: UnlockSetId): string {
  return UNLOCK_SETS.find((s) => s.id === id)?.label ?? "Practice";
}

/** The next `n` characters the learner will meet, for the "what's next" line. */
export function upcomingChars(state: UnlockState, n = 4): readonly string[] {
  const active = UNLOCK_SETS.find((s) => s.id === state.activeSetId)!;
  return [...active.charset].filter((c) => !state.availableChars.has(c)).slice(0, n);
}
