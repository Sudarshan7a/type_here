import { observationsFromLog } from "@realtype/engine";
import type { InputLog, TypingText } from "@realtype/schemas";

/**
 * Per-key progress (LRN-03's memory).
 *
 * The unlock strip needs to know which characters are solid. The engine's
 * proficiency model answers that precisely, but it needs observations across
 * sessions — and this app has no server. So the memory here is deliberately
 * small: per character, how many times it was typed and how many were right.
 * Counts, never text, never timing (keystroke-privacy, D-M4-6).
 *
 * A character is SOLID when it has been typed enough times and accurately
 * enough. The thresholds are named constants, not magic numbers, because they
 * are the one place this feature can be tuned without touching anything else.
 */

/** Attempts before a character's accuracy is trusted at all. */
export const MIN_KEY_ATTEMPTS = 20;

/** Accuracy at or above which a trusted character counts as solid. */
export const SOLID_ACCURACY = 0.95;

/** localStorage key. Namespaced like every other key in the app. */
export const KEY_PROGRESS_STORAGE_KEY = "realtype.key-progress";

/** Attempts and correct presses per character. Nothing else is stored. */
export type KeyProgress = Readonly<
  Record<string, { readonly attempts: number; readonly correct: number }>
>;

/** The empty memory, for a visitor who has never been measured. */
export const EMPTY_PROGRESS: KeyProgress = Object.freeze({});

/**
 * Fold one finished attempt into the memory.
 *
 * Pure: the log and text go in, the merged map comes out. The caller persists
 * it. Only single printable characters are counted — Backspace, Enter and
 * control keys are not characters anyone "knows", and counting them would
 * inflate the memory with noise.
 */
export function mergeAttempt(progress: KeyProgress, log: InputLog, text: TypingText): KeyProgress {
  const observations = observationsFromLog(log, text);
  const next: Record<string, { attempts: number; correct: number }> = {};
  for (const [key, value] of Object.entries(progress)) {
    next[key] = { attempts: value.attempts, correct: value.correct };
  }
  for (const sample of observations.keys) {
    const key = sample.key;
    // One printable character. Multi-char keys (Enter, Backspace, dead keys)
    // are skipped: they are not progress on any character.
    if ([...key].length !== 1) continue;
    const entry = next[key] ?? { attempts: 0, correct: 0 };
    next[key] = {
      attempts: entry.attempts + 1,
      correct: entry.correct + (sample.correct ? 1 : 0),
    };
  }
  return Object.freeze(next);
}

/**
 * The characters solid enough to unlock on.
 *
 * A character is solid when it has been typed at least MIN_KEY_ATTEMPTS times
 * and at least SOLID_ACCURACY of them were right. Below the attempt floor the
 * answer is "not yet", never "weak" — unknown is not weak (LRN-02's own rule).
 */
export function solidCharsFor(progress: KeyProgress): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [key, value] of Object.entries(progress)) {
    if (value.attempts < MIN_KEY_ATTEMPTS) continue;
    if (value.correct / value.attempts >= SOLID_ACCURACY) out.add(key);
  }
  return out;
}

/** Read the memory. Corrupt or partial data voids it rather than patching it. */
export function readKeyProgress(): KeyProgress {
  let raw: string | null;
  try {
    if (typeof localStorage === "undefined") return EMPTY_PROGRESS;
    raw = localStorage.getItem(KEY_PROGRESS_STORAGE_KEY);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (raw === null) return EMPTY_PROGRESS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (typeof parsed !== "object" || parsed === null) return EMPTY_PROGRESS;
  const out: Record<string, { attempts: number; correct: number }> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if ([...key].length !== 1) continue;
    if (typeof value !== "object" || value === null) continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry.attempts !== "number" || typeof entry.correct !== "number") continue;
    if (!Number.isFinite(entry.attempts) || !Number.isFinite(entry.correct)) continue;
    out[key] = {
      attempts: Math.max(0, Math.floor(entry.attempts)),
      correct: Math.max(0, Math.floor(entry.correct)),
    };
  }
  return Object.freeze(out);
}

/** Persist the memory. Returns whether it was written. */
export function writeKeyProgress(progress: KeyProgress): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(KEY_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
