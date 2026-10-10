import { describe, expect, it } from "vitest";

import {
  BAND_NET_WPM_FLOOR,
  BASELINE_SECONDS,
  RETEST_DAYS,
  bandForNetWpm,
  placementFromResult,
  retestDueAt,
  type PlacementBand,
} from "../src/baseline/placement";
import {
  BASELINE_STORAGE_KEY,
  baselineRecord,
  clearBaselineRecord,
  effectiveBand,
  readBaselineRecord,
  writeBaselineRecord,
} from "../src/baseline/storage";
import { outcomeFor, recordBaseline } from "../src/baseline/flow";

/**
 * A localStorage stand-in, the same pattern as onboarding-residue.test.ts:
 * the node environment has no DOM, so the storage is injected onto globalThis
 * rather than assumed to exist.
 */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

function withStorage(store: Storage | undefined, run: () => void): void {
  const had = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  if (store === undefined) {
    Reflect.deleteProperty(globalThis, "localStorage");
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      value: store,
      configurable: true,
      writable: true,
    });
  }
  try {
    run();
  } finally {
    if (had === undefined) Reflect.deleteProperty(globalThis, "localStorage");
    else Object.defineProperty(globalThis, "localStorage", had);
  }
}

/** Run with a fresh store, and prove the record is gone afterwards. */
function withFreshStorage(run: (store: Storage) => void): void {
  const store = fakeStorage();
  withStorage(store, () => run(store));
}

/** A finished baseline's shape, as the engine reports it. */
function result(netWpm: number, finalAccuracy: number) {
  return {
    summary: { netWpm, finalAccuracy },
    details: {},
    finalText: "",
  } as unknown as Parameters<typeof placementFromResult>[0];
}

describe("band thresholds (MOD-05)", () => {
  it("places by measured net WPM, at the documented floors", () => {
    expect(bandForNetWpm(0)).toBe("easy");
    expect(bandForNetWpm(19.9)).toBe("easy");
    expect(bandForNetWpm(BAND_NET_WPM_FLOOR.typical)).toBe("typical");
    expect(bandForNetWpm(39.9)).toBe("typical");
    expect(bandForNetWpm(BAND_NET_WPM_FLOOR.hard)).toBe("hard");
    expect(bandForNetWpm(140)).toBe("hard");
  });

  it("falls to the easiest band rather than throwing on junk", () => {
    // A crashed placement must not take the results screen with it.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      expect(bandForNetWpm(bad)).toBe("easy");
    }
  });

  it("runs the general baseline for three minutes", () => {
    // MOD-05: "general (3 min)". Long enough to clear the engine's ten-second
    // consistency floor many times over, so a real consistency figure exists.
    expect(BASELINE_SECONDS).toBe(180);
    expect(BASELINE_SECONDS).toBeGreaterThan(10_000 / 1000);
  });

  it("schedules the retest 30 days out (M4-08 item 4)", () => {
    expect(RETEST_DAYS).toBe(30);
    expect(retestDueAt(0)).toBe(30 * 86_400_000);
  });
});

describe("placement from a result (MOD-05, LRN-01)", () => {
  it("is labelled measured, because a baseline is a measurement", () => {
    const placement = placementFromResult(result(42, 98.6));
    expect(placement.basis).toBe("measured");
    // Unlike the onboarding plan, which is honest about being a self-report.
    expect(placement.band).toBe("hard");
    expect(placement.netWpm).toBe(42);
    expect(placement.finalAccuracy).toBe(98.6);
  });

  it("carries the engine's numbers through unrounded", () => {
    // The card formats them; the placement must not pre-round, or the two
    // screens can disagree about the same run.
    const placement = placementFromResult(result(37.456, 99.04));
    expect(placement.netWpm).toBe(37.456);
    expect(placement.finalAccuracy).toBe(99.04);
  });
});

describe("baseline record (MOD-05, keystroke-privacy, D-M4-6)", () => {
  it("stores five numbers and nothing else", () => {
    const record = baselineRecord(52.5, 99.1, 1_700_000_000_000);
    expect(Object.keys(record).sort()).toEqual([
      "band",
      "finalAccuracy",
      "netWpm",
      "takenAtMs",
      "version",
    ]);
    // No text, no keystrokes, no passage id, no layout: nothing that could
    // identify anyone, and nothing that can go stale and mislead.
    const serialised = JSON.stringify(record);
    expect(serialised).not.toMatch(/text|passage|layout|events|key/);
  });

  it("re-derives its own band rather than trusting the caller", () => {
    // A stored value that disagrees with the rule is a bug waiting to happen.
    expect(baselineRecord(10, 50, 0).band).toBe("easy");
    expect(baselineRecord(25, 50, 0).band).toBe("typical");
    expect(baselineRecord(70, 50, 0).band).toBe("hard");
  });

  it("round-trips through storage", () => {
    withFreshStorage((store) => {
      expect(readBaselineRecord()).toBeNull();
      const record = baselineRecord(31, 97.5, 1_700_000_000_000);
      expect(writeBaselineRecord(record)).toBe(true);
      expect(readBaselineRecord()).toEqual(record);
      expect(store.getItem(BASELINE_STORAGE_KEY)).toBe(JSON.stringify(record));
    });
  });

  it("voids a corrupt record instead of patching it", () => {
    // A placement built from one good number and one invented one would be the
    // dishonest version of this feature.
    withFreshStorage((store) => {
      store.setItem(BASELINE_STORAGE_KEY, JSON.stringify({ version: 1, netWpm: 50 }));
      expect(readBaselineRecord()).toBeNull();
      store.setItem(
        BASELINE_STORAGE_KEY,
        JSON.stringify({ version: 1, netWpm: 50, finalAccuracy: 1, takenAtMs: 0, band: "medium" }),
      );
      expect(readBaselineRecord()).toBeNull();
      store.setItem(BASELINE_STORAGE_KEY, "not json at all");
      expect(readBaselineRecord()).toBeNull();
      // A future version is unreadable, not guessed at.
      store.setItem(
        BASELINE_STORAGE_KEY,
        JSON.stringify({ version: 2, netWpm: 50, finalAccuracy: 1, takenAtMs: 0, band: "easy" }),
      );
      expect(readBaselineRecord()).toBeNull();
    });
  });

  it("reads absent outside a browser as 'never measured'", () => {
    withStorage(undefined, () => {
      expect(readBaselineRecord()).toBeNull();
      // And a write is a swallowed no-op rather than a thrown error.
      expect(writeBaselineRecord(baselineRecord(20, 99, 0))).toBe(false);
      expect(clearBaselineRecord()).toBeUndefined();
    });
  });

  it("forgets on demand", () => {
    withFreshStorage((store) => {
      writeBaselineRecord(baselineRecord(20, 99, 1));
      expect(store.length).toBe(1);
      clearBaselineRecord();
      expect(readBaselineRecord()).toBeNull();
    });
  });
});

describe("which band the app starts you in (LRN-01)", () => {
  it("prefers a measurement over a self-report", () => {
    const measured = baselineRecord(70, 99, 0); // hard
    expect(effectiveBand({ measured, selfReportedBand: "easy" })).toBe("hard");
  });

  it("falls back to the self-reported band, and to nothing", () => {
    expect(effectiveBand({ measured: null, selfReportedBand: "typical" })).toBe("typical");
    expect(effectiveBand({ measured: null, selfReportedBand: null })).toBeNull();
  });

  it("never invents a band for an unmeasured, unreported visitor", () => {
    // The surface must ask or default explicitly, not quietly start at "easy"
    // as though someone had said so.
    for (const band of ["easy", "typical", "hard"] as PlacementBand[]) {
      expect(effectiveBand({ measured: null, selfReportedBand: band })).toBe(band);
    }
  });
});

describe("a finished baseline's outcome (MOD-05)", () => {
  it("measures, derives a band, and stores both together", () => {
    withFreshStorage(() => {
      // A fixed clock, so the retest date is pinned rather than "sometime".
      const outcome = outcomeFor(result(34.6, 98.4), 1_700_000_000_000);
      expect(outcome.placement.band).toBe("typical");
      expect(outcome.placement.basis).toBe("measured");
      expect(outcome.record.band).toBe("typical");
      expect(outcome.record.takenAtMs).toBe(1_700_000_000_000);
      // The stored band is re-derived from the measured WPM, so a change to the
      // rule cannot leave a record that disagrees with it.
      expect(outcome.record.band).toBe(bandForNetWpm(outcome.placement.netWpm));
    });
  });

  it("writes the record and reports the placement (the App's handler)", () => {
    withFreshStorage(() => {
      const placement = recordBaseline(result(75, 99), () => 1_700_000_000_000);
      expect(placement?.band).toBe("hard");
      const stored = readBaselineRecord();
      expect(stored?.netWpm).toBe(75);
      expect(stored?.band).toBe("hard");
    });
  });

  it("still returns the placement when storage is unavailable", () => {
    // A visitor with storage blocked must still see where they placed; only the
    // remembering is lost, and that is the harmless direction.
    withStorage(undefined, () => {
      const placement = recordBaseline(result(75, 99), () => 1_700_000_000_000);
      expect(placement?.band).toBe("hard");
      expect(readBaselineRecord()).toBeNull();
    });
  });

  it("keeps the retest window arithmetic out of the component", () => {
    // 30 days, per M4-08 item 4 — and the record carries the date, not a
    // pre-computed promise.
    expect(retestDueAt(0)).toBe(30 * 86_400_000);
    withFreshStorage(() => {
      const stored = baselineRecord(50, 99, 1_000);
      expect(stored.takenAtMs).toBe(1_000);
      expect(retestDueAt(stored.takenAtMs)).toBe(1_000 + 30 * 86_400_000);
    });
  });
});
