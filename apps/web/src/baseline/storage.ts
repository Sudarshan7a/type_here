/**
 * Where a measured baseline lives (MOD-05, LRN-01).
 *
 * Guest-first localStorage, exactly like every other selection in this app.
 * There is no account at MVP, so there is nowhere else it could go.
 *
 * WHAT IS STORED, AND WHY IT IS SO SMALL
 *
 * Five numbers and a band. Notably ABSENT: any typed text, any keystroke
 * timing, any passage id, the layout, and any derived value that could go
 * stale. The placement is re-derivable from the stored net WPM by
 * `bandForNetWpm` — one source of truth, so a stored record can never disagree
 * with what the code would decide today.
 *
 * No keystrokes, no passage text (keystroke-privacy skill, D-M4-6 "Never store
 * typed text"). Nothing here can identify anyone, and nothing is sent
 * anywhere.
 *
 * A storage failure is not an error the visitor has to handle: the write is
 * swallowed and the visit still shows the placement they just earned. The
 * consequence is that it is not remembered, which is the harmless direction.
 */

import { bandForNetWpm, type PlacementBand } from "./placement";

/** localStorage key. Namespaced like every other key in the app. */
export const BASELINE_STORAGE_KEY = "realtype.baseline";

/**
 * The stored record.
 *
 * `null` (no key, an unreadable key, a future version) means "never measured",
 * so the app offers the baseline rather than guessing at a result. Unknown
 * values are read as absent rather than guessed at.
 */
export type BaselineRecord = {
  /** Bumped when a field changes meaning, so a stored record is never misread. */
  readonly version: 1;
  /** Measured net WPM, as the engine reported it. */
  readonly netWpm: number;
  /** Measured final accuracy, as the engine reported it. */
  readonly finalAccuracy: number;
  /** The band this baseline placed the visitor in. */
  readonly band: PlacementBand;
  /** Epoch ms the result was recorded. Feeds the day-30 retest window only. */
  readonly takenAtMs: number;
};

/** Window.localStorage, or null outside a browser. Never throws. */
function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Read the stored baseline.
 *
 * A corrupt or non-numeric field voids the whole record rather than being
 * patched: a placement built from one good number and one invented one would
 * be the dishonest version of this feature.
 */
export function readBaselineRecord(): BaselineRecord | null {
  const raw = storage()?.getItem(BASELINE_STORAGE_KEY);
  if (raw === null || raw === undefined) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) return null;
  if (typeof record.netWpm !== "number" || !Number.isFinite(record.netWpm)) return null;
  if (typeof record.finalAccuracy !== "number" || !Number.isFinite(record.finalAccuracy))
    return null;
  if (typeof record.takenAtMs !== "number" || !Number.isFinite(record.takenAtMs)) return null;
  const band = record.band;
  if (band !== "easy" && band !== "typical" && band !== "hard") return null;
  return {
    version: 1,
    netWpm: record.netWpm,
    finalAccuracy: record.finalAccuracy,
    band,
    takenAtMs: record.takenAtMs,
  };
}

/**
 * Build the record a finished baseline writes.
 *
 * The band is RE-DERIVED here from the measured WPM rather than copied from
 * whatever the caller believed, so the stored value cannot drift from the rule.
 */
export function baselineRecord(
  netWpm: number,
  finalAccuracy: number,
  takenAtMs: number,
): BaselineRecord {
  return {
    version: 1,
    netWpm,
    finalAccuracy,
    band: bandForNetWpm(netWpm),
    takenAtMs,
  };
}

/**
 * Persist the record. Returns whether it was WRITTEN.
 *
 * `false` when there is nowhere to write it (no browser, private mode, a full
 * quota) — not `true` because the write happened to be a no-op rather than a
 * throw. A caller that believed a record had been stored when it had not would
 * be the dishonest version of "did that work?".
 */
export function writeBaselineRecord(record: BaselineRecord): boolean {
  const store = storage();
  if (store === null) return false;
  try {
    store.setItem(BASELINE_STORAGE_KEY, JSON.stringify(record));
    // Read back: a silent-failure storage (some embedded webviews) can accept
    // a write and drop it.
    return readBaselineRecord() !== null;
  } catch {
    // Private mode and locked-down storage: the visit still shows the result.
    return false;
  }
}

/** Forget the baseline. Kept for the retake path, which overwrites anyway. */
export function clearBaselineRecord(): void {
  try {
    storage()?.removeItem(BASELINE_STORAGE_KEY);
  } catch {
    // Nothing to do: the record is already unreadable.
  }
}

/**
 * The band the app should start a visitor in, given the stored answers and any
 * measurement.
 *
 * A measurement WINS over a self-report, because it is better evidence — and
 * the plan that consumes this marks its basis accordingly rather than quietly
 * upgrading the self-report it was given.
 */
export function effectiveBand(params: {
  measured: BaselineRecord | null;
  selfReportedBand: PlacementBand | null;
}): PlacementBand | null {
  if (params.measured !== null) return params.measured.band;
  return params.selfReportedBand;
}
