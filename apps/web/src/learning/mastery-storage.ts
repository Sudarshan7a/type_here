import { DEFAULT_MASTERY_BARS, MASTERY_TYPES, type MasteryRun, type MasteryType } from "./mastery";

/**
 * Where mastery lives (LRN-04).
 *
 * Guest-first localStorage. Per content type: the last runs, the bar, and
 * whether auto-advance is on. Numbers and timestamps only — no text, no
 * keystrokes (keystroke-privacy, D-M4-6).
 *
 * The bars are ADJUSTABLE, which means they are stored rather than constant:
 * a visitor who moves the bar owns that choice, and a stored bar is read back
 * rather than reset to the default on every visit.
 */

/** localStorage key. Namespaced like every other key in the app. */
export const MASTERY_STORAGE_KEY = "realtype.mastery";

/** Runs kept per type. The window is 5; the cap is headroom, not the rule. */
export const MAX_MASTERY_RUNS = 10;

export interface MasteryTypeState {
  /** Newest last. Capped. */
  readonly runs: readonly MasteryRun[];
  /** The bar, or null when the visitor has never moved it (default applies). */
  readonly bar: number | null;
}

export interface MasteryRecord {
  readonly version: 1;
  readonly types: Readonly<Record<MasteryType, MasteryTypeState>>;
  /** Auto-advance: off unless the visitor asked. */
  readonly autoAdvance: boolean;
}

function emptyType(): MasteryTypeState {
  return { runs: [], bar: null };
}

export function emptyMasteryRecord(): MasteryRecord {
  return {
    version: 1,
    types: {
      prose: emptyType(),
      quotes: emptyType(),
      numbers: emptyType(),
      code: emptyType(),
    },
    autoAdvance: false,
  };
}

/** The bar in force: the visitor's choice, or the default. */
export function barFor(record: MasteryRecord, type: MasteryType): number {
  return record.types[type].bar ?? DEFAULT_MASTERY_BARS[type];
}

/** The runs in force: the window's worth, newest last. */
export function runsFor(record: MasteryRecord, type: MasteryType): readonly MasteryRun[] {
  return record.types[type].runs;
}

function store(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Read the record. Anything unreadable is an empty record, never a guess. */
export function readMasteryRecord(): MasteryRecord {
  const raw = store()?.getItem(MASTERY_STORAGE_KEY);
  if (raw === null || raw === undefined) return emptyMasteryRecord();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyMasteryRecord();
  }
  if (typeof parsed !== "object" || parsed === null) return emptyMasteryRecord();
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) return emptyMasteryRecord();

  const types = { ...emptyMasteryRecord().types };
  const stored = record.types as Record<string, unknown> | undefined;
  if (typeof stored === "object" && stored !== null) {
    for (const type of MASTERY_TYPES) {
      const entry = stored[type] as Record<string, unknown> | undefined;
      if (typeof entry !== "object" || entry === null) continue;
      const runs = Array.isArray(entry.runs)
        ? entry.runs
            .filter(
              (r): r is MasteryRun =>
                typeof r === "object" &&
                r !== null &&
                typeof (r as MasteryRun).netWpm === "number" &&
                Number.isFinite((r as MasteryRun).netWpm) &&
                typeof (r as MasteryRun).atMs === "number" &&
                Number.isFinite((r as MasteryRun).atMs),
            )
            .slice(-MAX_MASTERY_RUNS)
        : [];
      const bar =
        typeof entry.bar === "number" && Number.isFinite(entry.bar) && entry.bar > 0
          ? entry.bar
          : null;
      types[type] = { runs, bar };
    }
  }

  return {
    version: 1,
    types,
    autoAdvance: (record as Record<string, unknown>).autoAdvance === true,
  };
}

/** Persist. Returns whether it was written. */
export function writeMasteryRecord(record: MasteryRecord): boolean {
  const store_ = store();
  if (store_ === null) return false;
  try {
    store_.setItem(MASTERY_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Append one run to a type. Baselines and custom text do not count. */
export function recordMasteryRun(type: MasteryType, netWpm: number, atMs: number): boolean {
  const current = readMasteryRecord();
  const runs = [...current.types[type].runs, { netWpm, atMs }].slice(-MAX_MASTERY_RUNS);
  return writeMasteryRecord({
    ...current,
    types: { ...current.types, [type]: { ...current.types[type], runs } },
  });
}

/** Move the bar for a type. A non-positive bar clears back to the default. */
export function setMasteryBar(type: MasteryType, bar: number): boolean {
  const current = readMasteryRecord();
  return writeMasteryRecord({
    ...current,
    types: {
      ...current.types,
      [type]: { ...current.types[type], bar: bar > 0 ? bar : null },
    },
  });
}

/** Arm or disarm auto-advance. Off unless asked, always. */
export function setAutoAdvance(on: boolean): boolean {
  const current = readMasteryRecord();
  return writeMasteryRecord({ ...current, autoAdvance: on });
}
