/**
 * Where the onboarding answer lives (OPS-01).
 *
 * Guest-first, in localStorage, exactly like every other selection in this app
 * (LOC-01's layout, CUS-02's theme and face). There is no account at MVP, so
 * there is nothing else it could live in.
 *
 * WHAT IS STORED, AND WHY IT IS SO SMALL
 *
 * Only three answers: the goal, the self-reported level, and the language ids.
 * Notably ABSENT: any derived value, and the layout. The plan is re-derived from
 * the answers on every read (one source of truth, so a stored plan can never be
 * read as current when the code has moved on), and the layout is deliberately
 * not stored here at all — it belongs to LOC-01's own key and is passed in live.
 * That is what makes "onboarding must not contradict the layout guess" a
 * structural property rather than a promise: onboarding has no copy of the
 * layout to contradict anything with.
 *
 * No keystrokes, no passage text, no results. Nothing here can identify anyone
 * (keystroke-privacy skill), and nothing is sent anywhere.
 *
 * A storage failure (private mode, locked-down storage, a quota) is not an error
 * the visitor has to handle: the write is swallowed and the visit's answers still
 * apply. The consequence is that the panel asks again next time, which is the
 * harmless direction to fail in.
 */

import {
  normaliseGoal,
  normaliseLanguages,
  normaliseLevel,
  type OnboardingGoal,
  type OnboardingLevel,
  type TrackLanguage,
} from "./plan";

/** localStorage key. Namespaced like every other key in the app. */
export const ONBOARDING_STORAGE_KEY = "realtype.onboarding";

/**
 * The stored record.
 *
 * `state` is the only thing that decides whether the panel comes back:
 *   - `skipped`  — the visitor dismissed it. No answers, and none implied.
 *   - `planned`  — the visitor answered, and a plan exists.
 * `null` (no key, an unreadable key, an unknown state, a future version) all mean
 * the same thing: not answered yet, so ask. Unknown values are read as absent
 * rather than guessed at, which is the whole defensive posture in one sentence.
 */
export type OnboardingRecord =
  | { readonly version: 1; readonly state: "skipped" }
  | {
      readonly version: 1;
      readonly state: "planned";
      readonly goal: OnboardingGoal | null;
      readonly level: OnboardingLevel | null;
      readonly languages: readonly TrackLanguage[];
    };

/** The record for a visitor who dismissed the panel without answering. */
export function skippedRecord(): OnboardingRecord {
  return { version: 1, state: "skipped" };
}

/** The record for a visitor who answered, however little. */
export function plannedRecord(input: {
  goal?: OnboardingGoal | null;
  level?: OnboardingLevel | null;
  languages?: readonly string[] | null;
}): OnboardingRecord {
  return {
    version: 1,
    state: "planned",
    goal: normaliseGoal(input.goal),
    level: normaliseLevel(input.level),
    languages: normaliseLanguages(input.languages),
  };
}

/** localStorage, or null outside a browser (SSR, tests) or when it is blocked. */
function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Read the record, or null when there is not a usable one.
 *
 * Total: a missing key, a non-string, malformed JSON, a wrong version, an unknown
 * state and answers of the wrong shape all return null — "ask again" — rather
 * than throwing or half-parsing into a plan built on values nobody chose.
 */
export function readOnboardingRecord(): OnboardingRecord | null {
  const store = storage();
  if (store === null) return null;
  let raw: string | null;
  try {
    raw = store.getItem(ONBOARDING_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseRecord(parsed);
}

/** The same defensive read, over an arbitrary value. Exported for the tests. */
export function parseRecord(value: unknown): OnboardingRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1) return null;
  if (candidate.state === "skipped") return skippedRecord();
  if (candidate.state !== "planned") return null;
  return plannedRecord({
    goal: normaliseGoal(candidate.goal),
    level: normaliseLevel(candidate.level),
    languages: Array.isArray(candidate.languages)
      ? (candidate.languages.filter((id): id is string => typeof id === "string") as string[])
      : null,
  });
}

/**
 * Persist the record. Returns whether it was written, so a caller could tell the
 * difference — nothing in the UI does, because there is no useful thing to say to
 * a visitor whose browser refused a localStorage write.
 */
export function writeOnboardingRecord(record: OnboardingRecord): boolean {
  const store = storage();
  if (store === null) return false;
  try {
    store.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
