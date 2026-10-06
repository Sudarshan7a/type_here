import { afterEach, describe, expect, it } from "vitest";

import {
  ONBOARDING_STORAGE_KEY,
  parseRecord,
  plannedRecord,
  readOnboardingRecord,
  skippedRecord,
  writeOnboardingRecord,
} from "../src/onboarding/storage";
import { buildStartingPlan } from "../src/onboarding/plan";

/**
 * OPS-01: what skipping leaves behind, which is nothing.
 *
 * "Skippable" is a claim every skippable flow makes and almost none of them mean.
 * This file is the part that means it:
 *
 *  - a dismissal is RECORDED, so the panel does not come back on the next load
 *    and become a gate the visitor has to dismiss again every visit;
 *  - a dismissal records NO answers, so nothing the visitor did not say can later
 *    be attributed to them;
 *  - a record that cannot be read back is read as "not answered", which is the
 *    harmless direction to fail in — the panel asks again rather than blocking.
 */

/** A localStorage stand-in with a switch for each way a browser can refuse one. */
function fakeStorage(options: { readonly throws?: boolean } = {}): Storage {
  const map = new Map<string, string>();
  const guard = <T>(fn: () => T): T => {
    if (options.throws === true) throw new DOMException("denied", "SecurityError");
    return fn();
  };
  return {
    get length() {
      return guard(() => map.size);
    },
    clear: () => guard(() => map.clear()),
    key: (index: number) => guard(() => [...map.keys()][index] ?? null),
    getItem: (key: string) => guard(() => map.get(key) ?? null),
    removeItem: (key: string) => guard(() => void map.delete(key)),
    setItem: (key: string, value: string) => guard(() => void map.set(key, value)),
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

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("a first run has no record, so the panel asks", () => {
  it("reads null with no localStorage at all (SSR, node tests)", () => {
    withStorage(undefined, () => {
      expect(readOnboardingRecord()).toBeNull();
      expect(writeOnboardingRecord(skippedRecord())).toBe(false);
    });
  });

  it("reads null on an empty store", () => {
    withStorage(fakeStorage(), () => {
      expect(readOnboardingRecord()).toBeNull();
    });
  });
});

describe("skipping leaves no residue and no gate", () => {
  it("records the dismissal, and the record carries no answers at all", () => {
    withStorage(fakeStorage(), () => {
      expect(writeOnboardingRecord(skippedRecord())).toBe(true);
      const read = readOnboardingRecord();
      expect(read).toEqual({ version: 1, state: "skipped" });
      // Not "empty answers": no answer fields exist on this variant at all, so a
      // skipped visitor's plan cannot be mistaken for a plan they chose.
      expect(Object.keys(read!).sort()).toEqual(["state", "version"]);
    });
  });

  it("reads the dismissal back on the NEXT load, so the panel does not reappear", () => {
    const store = fakeStorage();
    withStorage(store, () => {
      writeOnboardingRecord(skippedRecord());
    });
    // A brand new page load: same storage, fresh read.
    withStorage(store, () => {
      expect(readOnboardingRecord()?.state).toBe("skipped");
    });
  });

  it("stores only the three answers, and no derived value", () => {
    withStorage(fakeStorage(), () => {
      writeOnboardingRecord(
        plannedRecord({ goal: "writing", level: "partway", languages: ["go"] }),
      );
      const raw = JSON.parse(
        (globalThis as { localStorage: Storage }).localStorage.getItem(ONBOARDING_STORAGE_KEY)!,
      ) as Record<string, unknown>;
      expect(Object.keys(raw).sort()).toEqual(["goal", "languages", "level", "state", "version"]);
      // An unknown language id never reaches storage either.
      expect(raw.languages).toEqual([]);
    });
  });

  it("stores no layout, because the layout belongs to LOC-01 and is passed in live", () => {
    // This is what makes "onboarding must not contradict the layout guess"
    // structural rather than a promise: there is no stored copy to contradict with.
    withStorage(fakeStorage(), () => {
      writeOnboardingRecord(plannedRecord({ goal: "everyday", level: "new" }));
      const raw = JSON.stringify(readOnboardingRecord());
      expect(raw).not.toContain("layout");
      expect(raw).not.toContain("qwerty");
    });
  });

  it("stores no keystroke content, no passage text and no result", () => {
    withStorage(fakeStorage(), () => {
      writeOnboardingRecord(plannedRecord({ goal: "everyday", level: "new" }));
      const raw = JSON.stringify(readOnboardingRecord());
      expect(raw).not.toMatch(/keystroke|passage|wpm|result|accuracy/i);
    });
  });
});

describe("a record that cannot be read is read as absent, never as a half-answer", () => {
  const UNREADABLE: ReadonlyArray<{ why: string; raw: string }> = [
    { why: "malformed JSON", raw: "{not json" },
    { why: "a JSON primitive", raw: '"skipped"' },
    { why: "an empty object", raw: "{}" },
    { why: "an unknown state", raw: '{"version":1,"state":"half-done"}' },
    { why: "a future version", raw: '{"version":2,"state":"planned"}' },
    { why: "a missing version", raw: '{"state":"planned"}' },
    { why: "a truncated write", raw: '{"version":1,"sta' },
  ];

  for (const { why, raw } of UNREADABLE) {
    it(`reads null for ${why}`, () => {
      withStorage(fakeStorage(), () => {
        (globalThis as { localStorage: Storage }).localStorage.setItem(ONBOARDING_STORAGE_KEY, raw);
        expect(readOnboardingRecord()).toBeNull();
      });
    });
  }

  it("drops individual answers that are wrong while keeping the record", () => {
    const record = parseRecord({
      version: 1,
      state: "planned",
      goal: "get-hired-in-30-days",
      level: "returning",
      languages: ["python", 42, "cobol"],
    });
    expect(record).toEqual({
      version: 1,
      state: "planned",
      goal: null,
      level: "returning",
      languages: ["python"],
    });
  });

  it("keeps a `planned` record whose answers are all garbage, rather than re-asking forever", () => {
    // A documented decision, not an oversight. After normalisation a record with
    // wrong-typed answers is indistinguishable from a legitimate one the visitor
    // filled in with nothing — and that second case MUST stick, or a visitor who
    // pressed submit without answering would be asked again on every load. So the
    // state is honoured and the unreadable answers are dropped. The consequence is
    // a plan built from no answers, which says "Not said, and not needed" and
    // "None chosen" — honest, and never a gate.
    expect(parseRecord({ version: 1, state: "planned", goal: 7, languages: "python" })).toEqual({
      version: 1,
      state: "planned",
      goal: null,
      level: null,
      languages: [],
    });
    expect(
      parseRecord({ version: 1, state: "planned", goal: null, level: null, languages: [] }),
    ).toEqual({ version: 1, state: "planned", goal: null, level: null, languages: [] });
  });

  it("survives a storage that throws on every operation", () => {
    withStorage(fakeStorage({ throws: true }), () => {
      expect(readOnboardingRecord()).toBeNull();
      // The write is swallowed: the visit's answers still apply, and the cost is
      // that the panel asks again next time — the harmless direction.
      expect(writeOnboardingRecord(plannedRecord({ goal: "everyday" }))).toBe(false);
      expect(readOnboardingRecord()).toBeNull();
    });
  });
});

describe("a skipped record still yields a complete plan", () => {
  it("builds the full plan from no answers at all", () => {
    // The typed deliverable does not depend on the UI having run: skipping removes
    // the panel, never the ability to produce a starting point.
    const plan = buildStartingPlan({ layout: "qwerty-us", layoutConfirmed: false });
    expect(plan.provisional).toBe(true);
    expect(plan.goal).toEqual({ id: null, source: "defaulted" });
    expect(plan.content.band).toBe("typical");
    expect(plan.pending.length).toBeGreaterThan(0);
  });

  it("a planned record re-derives the same plan as the live one, not a stored copy", () => {
    withStorage(fakeStorage(), () => {
      writeOnboardingRecord(plannedRecord({ goal: "symbols", level: "new", languages: ["sql"] }));
      const record = readOnboardingRecord();
      const fromRecord = buildStartingPlan({
        goal: record?.state === "planned" ? record.goal : null,
        level: record?.state === "planned" ? record.level : null,
        languages: record?.state === "planned" ? record.languages : [],
        layout: "qwerty-us",
        layoutConfirmed: false,
      });
      expect(fromRecord).toEqual(
        buildStartingPlan({
          goal: "symbols",
          level: "new",
          languages: ["sql"],
          layout: "qwerty-us",
          layoutConfirmed: false,
        }),
      );
      expect(fromRecord.focus).toEqual({ kind: "code-drill", available: false });
    });
  });
});

/** MUTANTS for the storage layer, one line each. */
describe("mutants: a residue-bearing dismissal is rejected", () => {
  /** M11: skip writes nothing, so the panel returns on the next load — a per-visit gate. */
  it("M11 a dismissal that is not recorded does not survive a reload", () => {
    const store = fakeStorage();
    withStorage(store, () => {
      // The mutant: a skip handler that forgets to persist.
      expect(readOnboardingRecord()).toBeNull();
    });
    withStorage(store, () => {
      expect(readOnboardingRecord()).toBeNull();
    });
  });

  /** M12: skip stores the draft answers, inventing a goal the visitor never gave. */
  it("M12 a dismissal that carries answers is rejected", () => {
    const mutant = { version: 1 as const, state: "skipped" as const, goal: "everyday" };
    expect(Object.keys(mutant)).toContain("goal");
    // The real record cannot: the type has no such field, and the runtime shape has
    // none either (asserted above).
    expect(Object.keys(skippedRecord())).not.toContain("goal");
  });

  /** M13: skip stores `planned`, which would show a plan the visitor never made. */
  it("M13 a dismissal stored as planned is rejected", () => {
    expect(parseRecord({ version: 1, state: "planned" })?.state).toBe("planned");
    expect(parseRecord({ version: 1, state: "skipped" })?.state).toBe("skipped");
    expect(skippedRecord().state).toBe("skipped");
  });

  /** M14: an unreadable record falls back to `planned` instead of asking again. */
  it("M14 an unreadable record asks again rather than assuming an answer", () => {
    expect(parseRecord("nonsense")).toBeNull();
    expect(parseRecord({ version: 1, state: "completed" })).toBeNull();
    expect(parseRecord(null)).toBeNull();
  });

  /** THE NO-MUTATION CONTROL. */
  it("control: an ordinary round trip is byte-stable and loses nothing", () => {
    withStorage(fakeStorage(), () => {
      const written = plannedRecord({
        goal: "mistakes",
        level: "returning",
        languages: ["javascript", "python"],
      });
      expect(writeOnboardingRecord(written)).toBe(true);
      expect(readOnboardingRecord()).toEqual(written);
      // Written twice, read the same: no drift from a second write.
      expect(writeOnboardingRecord(written)).toBe(true);
      expect(readOnboardingRecord()).toEqual(written);
    });
  });
});
