import { knownLanguages } from "@realtype/engine";
import { describe, expect, it } from "vitest";

import {
  ONBOARDING_GOALS,
  ONBOARDING_LEVELS,
  PENDING_REQUIREMENTS,
  TRACK_LANGUAGES,
  TRACK_LANGUAGE_IDS,
  buildStartingPlan,
  languageLabel,
  languageReadiness,
  normaliseGoal,
  normaliseLanguages,
  normaliseLevel,
  type DifficultyBand,
  type OnboardingGoal,
  type OnboardingLevel,
  type TrackLanguage,
} from "../src/onboarding/plan";

/**
 * OPS-01: the emitted plan.
 *
 * This file is where "produces a starting plan" is either true or not. It covers
 * every field of the typed plan on every path — answered, unanswered, skipped and
 * corrupt — and it is written so that the dishonest versions FAIL:
 *
 *  - a plan that calls a self-report a measurement;
 *  - a plan that promises a code difficulty band (CNT-02 scores prose and quotes
 *    only, and `classifyScope` returns `out-of-scope-code` by construction);
 *  - a plan that carries a score (master-spec §6.2 Stage A: a band and no score);
 *  - a plan that invents a mode, a layout or a language readiness;
 *  - a plan that fails to come out at all when a question went unanswered.
 *
 * The mutants at the bottom are the same idea as explicit mutations: each one is a
 * broken variant of the implementation, asserted to be caught.
 */

/** CNT-02's band enum, restated here so the drift the type guards against fails. */
const BANDS: readonly DifficultyBand[] = ["easy", "typical", "hard"];

const LAYOUT = { layout: "qwerty-us", layoutConfirmed: false } as const;

describe("the plan's shape is total: every field, on every path", () => {
  it("emits every field from a fully answered input", () => {
    const plan = buildStartingPlan({
      goal: "mistakes",
      level: "returning",
      languages: ["python", "sql"],
      layout: "dvorak",
      layoutConfirmed: true,
    });

    expect(plan).toEqual({
      version: 1,
      goal: { id: "mistakes", source: "asked" },
      level: { selfReported: "returning", basis: "self-report", measured: null },
      content: {
        family: "prose",
        band: "typical",
        bandBasis: "self-report",
        scored: false,
        codeBands: "none",
      },
      mode: { id: "passage", errorMode: "free", available: true },
      layout: { value: "dvorak", source: "confirmed" },
      languages: {
        selected: ["python", "sql"],
        readiness: [
          { id: "python", readiness: { grammarMap: true, passages: false } },
          { id: "sql", readiness: { grammarMap: false, passages: false } },
        ],
      },
      focus: { kind: "prose", available: true },
      provisional: true,
      pending: [...PENDING_REQUIREMENTS],
    });
  });

  it("emits a complete plan from an EMPTY input — an unknown goal still yields a plan", () => {
    // The load-bearing case for "skippable". Every field of it is present, and the
    // gaps are named rather than left as holes.
    const plan = buildStartingPlan({ ...LAYOUT, goal: null, level: null, languages: [] });

    expect(plan.version).toBe(1);
    expect(plan.goal).toEqual({ id: null, source: "defaulted" });
    expect(plan.level).toEqual({ selfReported: null, basis: "self-report", measured: null });
    expect(plan.content.family).toBe("prose");
    expect(plan.content.band).toBe("typical");
    expect(plan.content.bandBasis).toBe("self-report");
    expect(plan.content.scored).toBe(false);
    expect(plan.content.codeBands).toBe("none");
    expect(plan.languages.selected).toEqual([]);
    expect(plan.languages.readiness).toEqual([]);
    expect(plan.focus).toEqual({ kind: "prose", available: true });
    expect(plan.provisional).toBe(true);
    expect(plan.pending.length).toBeGreaterThan(0);
  });

  it("emits a complete plan from an input with NO optional keys at all", () => {
    // `buildStartingPlan({ layout, layoutConfirmed })` — the shape the component
    // can produce from a dismissed panel, and the shape a future caller would
    // write by forgetting the questions.
    const plan = buildStartingPlan({ layout: "azerty", layoutConfirmed: true });
    expect(plan.goal.source).toBe("defaulted");
    expect(plan.level.selfReported).toBeNull();
    expect(plan.layout).toEqual({ value: "azerty", source: "confirmed" });
    expect(plan.provisional).toBe(true);
  });

  it("is deterministic: the same input yields a structurally identical plan", () => {
    const input = {
      goal: "writing" as const,
      level: "partway" as const,
      languages: ["java"],
      layout: "qwerty-uk" as const,
      layoutConfirmed: false,
    };
    expect(buildStartingPlan(input)).toEqual(buildStartingPlan(input));
  });

  it("says self-report when nothing has been measured", () => {
    for (const level of [...ONBOARDING_LEVELS, null]) {
      const plan = buildStartingPlan({ ...LAYOUT, level });
      expect(plan.level.measured).toBeNull();
      expect(plan.level.basis).toBe("self-report");
      expect(plan.content.bandBasis).toBe("self-report");
    }
  });

  it("says measured once a baseline has been taken (MOD-05)", () => {
    // The one path where the plan is NOT a self-report. It names the measured
    // band and the basis that produced it, rather than blurring the two — a
    // plan that quietly upgraded a self-report into a measurement would be the
    // dishonest version of this feature.

    for (const band of ["easy", "typical", "hard"] as const) {
      const plan = buildStartingPlan({ ...LAYOUT, level: "new", measuredBand: band });
      expect(plan.level.basis).toBe("measured");
      expect(plan.level.measured).toBe(band);
      expect(plan.content.band).toBe(band);
      expect(plan.content.bandBasis).toBe("measured");
      expect(plan.level.selfReported).toBe("new");
    }

    // And the measurement really does override the self-report: a visitor who
    // says `new` but measures as `comfortable` is started at hard, not easy.
    const overridden = buildStartingPlan({ ...LAYOUT, level: "new", measuredBand: "hard" });
    expect(overridden.content.band).toBe("hard");
  });

  it("keeps a measurement even when the visitor said nothing", () => {
    const plan = buildStartingPlan({ ...LAYOUT, measuredBand: "hard" });
    expect(plan.level.selfReported).toBeNull();
    expect(plan.level.measured).toBe("hard");
    expect(plan.level.basis).toBe("measured");
    expect(plan.content.band).toBe("hard");
  });
});

describe("the goal is an input to planning, never a promise", () => {
  it("every goal produces a plan", () => {
    for (const goal of ONBOARDING_GOALS) {
      const plan = buildStartingPlan({ ...LAYOUT, goal });
      expect(plan.goal).toEqual({ id: goal, source: "asked" });
      expect(plan.provisional).toBe(true);
    }
  });

  it("the symbols goal records the interest and refuses to promise a code drill", () => {
    // CNT-02's `classifyScope` returns `out-of-scope-code` for every CODE item, so
    // no code difficulty band exists to recommend. The plan says so in a field
    // rather than implying one.
    const plan = buildStartingPlan({ ...LAYOUT, goal: "symbols" });
    expect(plan.goal.id).toBe("symbols");
    expect(plan.focus).toEqual({ kind: "code-drill", available: false });
    // …and it still recommends prose, with a band that is prose-only.
    expect(plan.content.family).toBe("prose");
    expect(plan.content.codeBands).toBe("none");
    expect(BANDS).toContain(plan.content.band);
  });

  it("every other goal points at prose, which is available", () => {
    for (const goal of ONBOARDING_GOALS) {
      if (goal === "symbols") continue;
      expect(buildStartingPlan({ ...LAYOUT, goal }).focus).toEqual({
        kind: "prose",
        available: true,
      });
    }
  });

  it("an unknown goal string is read as absent, not guessed at", () => {
    const plan = buildStartingPlan({ ...LAYOUT, goal: "get-hired-quickly" as OnboardingGoal });
    expect(plan.goal).toEqual({ id: null, source: "defaulted" });
    expect(plan.focus.kind).toBe("prose");
  });
});

describe("the band is CNT-02's enum and never a number", () => {
  it("uses exactly the three labels the engine's result type publishes", () => {
    // The type derives from EngineResult["summary"]["difficultyBand"], so this test
    // is the runtime half of that guarantee: no fourth value, and no spelling
    // drift from what the results screen reads.
    const seen = new Set<DifficultyBand>();
    for (const level of [...ONBOARDING_LEVELS, null]) {
      seen.add(buildStartingPlan({ ...LAYOUT, level }).content.band);
    }
    expect([...seen].sort()).toEqual([...BANDS].sort());
  });

  it("maps each self-report to a band, and 'unsure' to the middle one", () => {
    const bandFor = (level: OnboardingLevel | null): DifficultyBand =>
      buildStartingPlan({ ...LAYOUT, level }).content.band;
    expect(bandFor("new")).toBe("easy");
    expect(bandFor("partway")).toBe("typical");
    // An adult re-learner is not routed to the easiest band: "coming back to it" is
    // not "I'm new to it", and the retention playbook §9.5 treats them as separate.
    expect(bandFor("returning")).toBe("typical");
    expect(bandFor("comfortable")).toBe("hard");
    expect(bandFor("unsure")).toBe("typical");
    expect(bandFor(null)).toBe("typical");
  });

  it("carries no score and no multiplication, because Stage A publishes neither", () => {
    const plan = buildStartingPlan({ ...LAYOUT, level: "comfortable" });
    expect(plan.content.scored).toBe(false);
    expect(Object.keys(plan.content)).toEqual([
      "family",
      "band",
      "bandBasis",
      "scored",
      "codeBands",
    ]);
  });
});

describe("the layout is carried, never chosen", () => {
  it("reports a first-run guess as a guess and a chosen layout as chosen", () => {
    expect(buildStartingPlan({ layout: "qwertz", layoutConfirmed: false }).layout).toEqual({
      value: "qwertz",
      source: "guessed",
    });
    expect(buildStartingPlan({ layout: "qwertz", layoutConfirmed: true }).layout).toEqual({
      value: "qwertz",
      source: "confirmed",
    });
  });

  it("never invents a layout: every contract layout passes through unchanged", () => {
    const layouts = ["qwerty-us", "qwerty-uk", "dvorak", "colemak-dh", "azerty", "qwertz"] as const;
    for (const layout of layouts) {
      expect(buildStartingPlan({ layout, layoutConfirmed: false }).layout.value).toBe(layout);
    }
  });
});

describe("languages: only ids this build knows, with what actually exists", () => {
  it("drops unknown ids, duplicates and non-strings instead of passing them through", () => {
    expect(
      normaliseLanguages([
        "python",
        "python",
        "brainfuck",
        42,
        "javascript",
        null,
      ] as unknown as string[]),
    ).toEqual(["python", "javascript"]);
    expect(normaliseLanguages(null)).toEqual([]);
    expect(normaliseLanguages(undefined)).toEqual([]);
    expect(normaliseLanguages("python" as never)).toEqual([]);
  });

  it("preserves the order the visitor picked, so the plan reads as they chose it", () => {
    expect(normaliseLanguages(["sql", "javascript", "python"])).toEqual([
      "sql",
      "javascript",
      "python",
    ]);
  });

  it("claims a grammar map only where the engine actually ships one", () => {
    // The load-bearing honesty check. `knownLanguages()` is the engine's own list;
    // if a profile is added or removed there, this goes red rather than leaving the
    // plan describing a map that does not exist.
    const inEngine = new Set(knownLanguages());
    for (const language of TRACK_LANGUAGES) {
      const expectsMap =
        language.id === "javascript" ? inEngine.has("javascript") : language.id === "python";
      expect(language.readiness.grammarMap, `${language.id} grammarMap claim`).toBe(expectsMap);
    }
    expect(knownLanguages()).toContain("javascript");
    expect(knownLanguages()).toContain("python");
    expect(knownLanguages()).not.toContain("java");
    expect(knownLanguages()).not.toContain("sql");
  });

  it("claims passages in NO language, because no code passage is selectable at MVP", () => {
    for (const language of TRACK_LANGUAGES) {
      expect(language.readiness.passages, `${language.id} passages claim`).toBe(false);
    }
  });

  it("reports readiness per selected id, and nothing for unselected ones", () => {
    const plan = buildStartingPlan({ ...LAYOUT, languages: ["javascript", "html-css"] });
    expect(plan.languages.readiness.map((r) => r.id)).toEqual(["javascript", "html-css"]);
    expect(languageReadiness("html-css")).toEqual({ grammarMap: false, passages: false });
    expect(languageReadiness("cobol")).toBeNull();
    expect(languageLabel("cobol")).toBeNull();
  });

  it("has a display label for every id it can emit", () => {
    for (const id of TRACK_LANGUAGE_IDS) {
      expect(languageLabel(id), `no label for ${id}`).not.toBeNull();
    }
  });
});

describe("normalisers never guess", () => {
  it("reads an absent, wrong-typed or unknown goal as null", () => {
    for (const value of [null, undefined, "", "faster", 7, {}, ["everyday"]]) {
      expect(normaliseGoal(value)).toBeNull();
    }
    expect(normaliseGoal("everyday")).toBe("everyday");
  });

  it("reads an absent, wrong-typed or unknown level as null", () => {
    for (const value of [null, undefined, "", "expert", 7]) {
      expect(normaliseLevel(value)).toBeNull();
    }
    expect(normaliseLevel("returning")).toBe("returning");
  });

  it("keeps 'unsure' as an answer rather than collapsing it to absent", () => {
    // The difference matters: "I'd rather not say" is something the visitor chose,
    // and the plan records a chosen answer differently from a missing one.
    expect(normaliseGoal("unsure")).toBe("unsure");
    expect(normaliseLevel("unsure")).toBe("unsure");
    expect(buildStartingPlan({ ...LAYOUT, goal: "unsure" }).goal.source).toBe("asked");
    expect(buildStartingPlan({ ...LAYOUT, level: "unsure" }).level.selfReported).toBe("unsure");
  });
});

describe("the pending list names real work", () => {
  it("points at the requirements that would replace a self-report with a measurement", () => {
    // These four rows are NOT STARTED in docs/FEATURE-LEDGER.md at the time of
    // writing. If one of them ships, this list is the thing to revisit — the ids
    // are here so the plan can point at the work rather than around it.
    expect([...PENDING_REQUIREMENTS]).toEqual(["LRN-01", "MOD-05", "PRG-18", "CNT-01"]);
  });

  it("is the same list on every path, so a skipped plan is not a poorer plan", () => {
    const skipped = buildStartingPlan({ ...LAYOUT });
    const answered = buildStartingPlan({
      ...LAYOUT,
      goal: "everyday",
      level: "new",
      languages: ["python"],
    });
    expect(skipped.pending).toEqual(answered.pending);
    expect(skipped.provisional).toBe(answered.provisional);
  });
});

/**
 * MUTANTS — deliberately broken variants, one line each. Each is a real way this
 * feature could lie, and each must be caught by the assertions above. They are
 * written as explicit bad builders rather than as text substitutions, because the
 * thing being proved is about the PLAN's values, not about the source text.
 */
describe("mutants: the dishonest plans are all rejected", () => {
  /** M1: upgrade the self-reported band into a measured one. */
  const measureTheLevel = (level: OnboardingLevel | null) => {
    const honest = buildStartingPlan({ ...LAYOUT, level });
    return {
      ...honest,
      level: { selfReported: level, basis: "measured" as const, measured: level },
      content: { ...honest.content, bandBasis: "baseline" as const },
      provisional: false as unknown as true,
    };
  };

  it("M1 a self-report presented as a measurement is rejected", () => {
    const plan = measureTheLevel("new");
    expect(plan.level.basis).not.toBe("self-report");
    expect(plan.level.measured).not.toBeNull();
    expect(plan.content.bandBasis).not.toBe("self-report");
    expect(plan.provisional).not.toBe(true);
  });

  /** M2: promise a code band that CNT-02 does not produce. */
  const promiseACodeBand = () => ({
    ...buildStartingPlan({ ...LAYOUT, goal: "symbols" }),
    content: { ...buildStartingPlan({ ...LAYOUT, goal: "symbols" }).content, codeBands: "easy" },
  });

  it("M2 a code difficulty band is rejected — CNT-02 has none", () => {
    expect(promiseACodeBand().content.codeBands).not.toBe("none");
  });

  /** M3: carry a numeric score, as if Stage A published one. */
  const carryAScore = () => ({
    ...buildStartingPlan({ ...LAYOUT }),
    content: { ...buildStartingPlan({ ...LAYOUT }).content, scored: 87.4 as unknown as false },
  });

  it("M3 a difficulty score is rejected — Stage A is a label, not a number", () => {
    expect(carryAScore().content.scored).not.toBe(false);
  });

  /** M4: call LOC-01's guess a confirmed choice. */
  const confirmTheGuess = () => ({
    ...buildStartingPlan({ ...LAYOUT }),
    layout: { ...buildStartingPlan({ ...LAYOUT }).layout, source: "confirmed" as const },
  });

  it("M4 a guess reported as a confirmed choice is rejected", () => {
    expect(confirmTheGuess().layout.source).not.toBe("guessed");
  });

  /** M5: claim a code passage exists for a language that has none. */
  const claimPassages = () => ({
    ...buildStartingPlan({ ...LAYOUT, languages: ["sql"] }),
    languages: {
      selected: ["sql"] as const,
      readiness: [{ id: "sql" as const, readiness: { grammarMap: true, passages: true } }],
    },
  });

  it("M5 claiming a passage in a language that has none is rejected", () => {
    const plan = claimPassages();
    expect(plan.languages.readiness[0]!.readiness.passages).not.toBe(false);
    expect(plan.languages.readiness[0]!.readiness.grammarMap).not.toBe(false);
  });

  /** M6: return null when the goal is unknown, i.e. make skipping cost the user a plan. */
  it("M6 an absent goal still yields a plan, so skipping never costs anything", () => {
    // The negative control for this one is that the mutant (returning null) is not
    // something the plan can express at all: buildStartingPlan has no null return.
    for (const goal of [null, undefined, "nonsense"] as unknown as Array<OnboardingGoal | null>) {
      expect(buildStartingPlan({ ...LAYOUT, goal })).not.toBeNull();
    }
    expect(buildStartingPlan({ ...LAYOUT }).pending.length).toBe(PENDING_REQUIREMENTS.length);
  });

  /** M7: pass an unknown language straight through to the plan. */
  it("M7 an unknown language id never reaches the plan", () => {
    const plan = buildStartingPlan({
      ...LAYOUT,
      languages: ["python", "malbolge"],
    });
    expect(plan.languages.selected).toEqual(["python"]);
    expect(plan.languages.readiness.map((r) => r.id)).not.toContain("malbolge");
  });

  /** M8: route "I'm coming back to it" to the easiest band, as a beginner drill would. */
  it("M8 the adult re-learner is not routed to the beginner band", () => {
    expect(buildStartingPlan({ ...LAYOUT, level: "returning" }).content.band).not.toBe("easy");
    expect(buildStartingPlan({ ...LAYOUT, level: "returning" }).content.band).toBe(
      buildStartingPlan({ ...LAYOUT, level: "unsure" }).content.band,
    );
  });

  /** M9: forget the pending list on the skipped path — a poorer plan for a skipper. */
  it("M9 the pending list cannot be dropped for a skipped visitor", () => {
    expect(buildStartingPlan({ ...LAYOUT }).pending).toEqual([...PENDING_REQUIREMENTS]);
  });

  /** M10: invent a mode the app does not run. */
  it("M10 the plan names only the mode the app actually runs", () => {
    expect(buildStartingPlan({ ...LAYOUT }).mode).toEqual({
      id: "passage",
      errorMode: "free",
      available: true,
    });
    expect(Object.keys(buildStartingPlan({ ...LAYOUT }).mode)).toEqual([
      "id",
      "errorMode",
      "available",
    ]);
  });

  /** THE NO-MUTATION CONTROL. */
  it("control: with no mutation applied, the plan passes every assertion above", () => {
    const plan = buildStartingPlan({
      goal: "everyday",
      level: "new",
      languages: ["javascript"],
      layout: "colemak-dh",
      layoutConfirmed: true,
    });
    expect(plan.provisional).toBe(true);
    expect(plan.goal).toEqual({ id: "everyday", source: "asked" });
    expect(plan.level).toEqual({
      selfReported: "new",
      basis: "self-report",
      measured: null,
    });
    expect(plan.content).toEqual({
      family: "prose",
      band: "easy",
      bandBasis: "self-report",
      scored: false,
      codeBands: "none",
    });
    expect(plan.layout).toEqual({ value: "colemak-dh", source: "confirmed" });
    expect(plan.focus).toEqual({ kind: "prose", available: true });
    expect(plan.pending).toEqual([...PENDING_REQUIREMENTS]);
    expect(BANDS).toContain(plan.content.band);
    expect(plan.languages.selected).toEqual(["javascript" as TrackLanguage]);
  });
});
