/**
 * The starting plan (OPS-01) — a typed object, not a sentence.
 *
 * The ledger's note on this row is "produces a starting plan", and that is the
 * whole requirement: whatever onboarding collects has to come out the other side
 * as something a screen can render and a later slice can act on. A string cannot
 * be acted on, so this file emits a value and the component renders it.
 *
 * WHAT IS IN IT TODAY, AND WHAT IS NAMED AS PENDING
 *
 * Every field below is either something the app already does, or a field whose
 * value is `null`/`false` with the reason attached. Nothing is described as
 * available when it is not:
 *
 *   - content.band          CNT-02's three labels (easy/typical/hard). Taken from
 *                           the ENGINE's own result type, not from a local copy,
 *                           so the enum cannot drift from the one that produces it.
 *   - content.scored        `false`, permanently, at Stage A: master-spec §6.2
 *                           publishes a band and no score ("no score
 *                           multiplication yet"), so there is no number to carry.
 *   - content.codeBands     `"none"`. CNT-02's `classifyScope` returns
 *                           `out-of-scope-code` for every CODE item, by
 *                           construction rather than by caveat. The plan may
 *                           therefore recommend prose and only prose.
 *   - mode                  the one thing the app runs: a passage in free mode.
 *   - layout                whatever LOC-01 already decided, with its provenance.
 *   - languages             the visitor's interests, plus per-language readiness.
 *   - pending               the named work that would replace the self-reports
 *                           with measurements.
 *
 * WHY NOTHING HERE IS A MEASUREMENT
 *
 * bandBasis and level.basis are `self-report` on every path, including the
 * "unsure" and skipped ones. A placement test (LRN-01) and baseline tests
 * (MOD-05) are NOT STARTED in the ledger, so the only honest starting band is one
 * derived from what the visitor said — labelled as such, with `provisional: true`
 * on the whole plan. A plan that quietly upgraded a self-report into a
 * measurement would be the dishonest version of this feature, and the tests in
 * apps/web/tests/onboarding-plan.test.ts fail the build if one ever does.
 */

import type { EngineResult } from "@realtype/engine";
import type { Layout } from "@realtype/schemas";

/**
 * CNT-02's band enum, derived from the engine's own `difficultyBand` so the two
 * cannot drift: `Exclude<…, null>` is `easy | typical | hard`, or the assignment
 * below would not typecheck.
 *
 * `@realtype/typability` is deliberately NOT imported. It is not a dependency of
 * apps/web (and package.json is not this task's to edit), and a duplicate enum is
 * a drift risk. The engine's `EngineResult.difficultyBand` is the type the app
 * already reads bands from, so it is the right thing to derive from. The
 * equivalence with CNT-02's own `DIFFICULTY_BANDS` is pinned by
 * `tests/onboarding-plan.test.ts`.
 */
export type DifficultyBand = Exclude<EngineResult["summary"]["difficultyBand"], null>;

/** The goal answers. `unsure` is an answer, not a skip. */
export const ONBOARDING_GOALS = ["everyday", "mistakes", "symbols", "writing", "unsure"] as const;
export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number];

/**
 * The self-reported starting level.
 *
 * `returning` and `unsure` are here for a stated reason: the retention playbook
 * §9.5 names adult re-learners as their own segment, and an adult who typed for
 * years and stopped must not be pushed through a "I'm new to it" question to get
 * a plan. "I'd rather not say" is a complete answer here — the plan is emitted
 * either way, and `tests/onboarding-plan.test.ts` asserts exactly that.
 */
export const ONBOARDING_LEVELS = ["new", "partway", "returning", "comfortable", "unsure"] as const;
export type OnboardingLevel = (typeof ONBOARDING_LEVELS)[number];

/** What exists today for each track language, and what does not. */
export interface LanguageReadiness {
  /**
   * True when the engine ships a grammar/token profile for this language, so a
   * token map can be produced the moment content exists. Pinned against
   * `knownLanguages()` from @realtype/engine in the tests, so this cannot claim
   * a map that is not there.
   */
  readonly grammarMap: boolean;
  /**
   * True when a passage in this language is selectable in the app today. False
   * for every row: the corpus's 34 code items are `draft` behind CNT-01's
   * second-reviewer audit, and no code passage is wired into the surface.
   */
  readonly passages: boolean;
}

export const TRACK_LANGUAGES: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly readiness: LanguageReadiness;
}> = [
  {
    id: "javascript",
    label: "JavaScript / TypeScript",
    readiness: { grammarMap: true, passages: false },
  },
  { id: "python", label: "Python", readiness: { grammarMap: true, passages: false } },
  { id: "java", label: "Java", readiness: { grammarMap: false, passages: false } },
  { id: "sql", label: "SQL", readiness: { grammarMap: false, passages: false } },
  { id: "html-css", label: "HTML / CSS", readiness: { grammarMap: false, passages: false } },
];

/** The language ids, as a closed union of the ids above. */
export type TrackLanguage = (typeof TRACK_LANGUAGES)[number]["id"];

/** Every track language id, for validation and for tests. */
export const TRACK_LANGUAGE_IDS: readonly string[] = TRACK_LANGUAGES.map((l) => l.id);

/** The display name of a track language, or null for an id this build does not have. */
export function languageLabel(id: string): string | null {
  return TRACK_LANGUAGES.find((l) => l.id === id)?.label ?? null;
}

/** The readiness of a track language, or null for an id this build does not have. */
export function languageReadiness(id: string): LanguageReadiness | null {
  return TRACK_LANGUAGES.find((l) => l.id === id)?.readiness ?? null;
}

/**
 * The self-report → starting band mapping.
 *
 * `new` gets the easiest band because the surface has no timer and no gate: a
 * visitor who cannot type yet still finishes a test. `returning` is mapped to the
 * MIDDLE band, not the easiest and not the hardest — an adult re-learner has not
 * said they are a beginner, and has not claimed fluency either. `unsure` takes
 * the middle too, because "I don't know" is not evidence of either extreme.
 */
const BAND_FOR_LEVEL: Readonly<Record<OnboardingLevel, DifficultyBand>> = {
  new: "easy",
  partway: "typical",
  returning: "typical",
  comfortable: "hard",
  unsure: "typical",
};

/** What the plan points the visitor at, and whether it exists yet. */
export interface PlanFocus {
  readonly kind: "prose" | "code-drill";
  /** False only for the code drill: no code passage is selectable at MVP. */
  readonly available: boolean;
}

/** The goal's effect on the plan, as a machine-readable value. */
const FOCUS_FOR_GOAL: Readonly<Record<OnboardingGoal, PlanFocus>> = {
  everyday: { kind: "prose", available: true },
  mistakes: { kind: "prose", available: true },
  // The one honest refusal in the plan: the goal is recorded, and the thing it
  // asks for is named as missing instead of being implied into existence.
  symbols: { kind: "code-drill", available: false },
  writing: { kind: "prose", available: true },
  unsure: { kind: "prose", available: true },
};

/** Named work that has not been built, so the plan can point at it by id. */
export const PENDING_REQUIREMENTS = ["LRN-01", "MOD-05", "PRG-18", "CNT-01"] as const;
export type PendingRequirement = (typeof PENDING_REQUIREMENTS)[number];

/** The emitted plan. Read-only: it is derived, never edited in place. */
export interface StartingPlan {
  /** Bumped when a field changes meaning, so a stored plan is never misread. */
  readonly version: 1;

  readonly goal: {
    /** null when the visitor skipped or declined the question. */
    readonly id: OnboardingGoal | null;
    /** `asked` when they chose; `defaulted` when the plan was built without them. */
    readonly source: "asked" | "defaulted";
  };

  readonly level: {
    readonly selfReported: OnboardingLevel | null;
    /** Always `self-report`: LRN-01/MOD-05 are not built. */
    readonly basis: "self-report";
    /** Always null, and named so the hole is visible rather than inferred. */
    readonly measured: null;
  };

  readonly content: {
    /** Always `prose`: CNT-02 scores prose and quotes, and nothing else. */
    readonly family: "prose";
    readonly band: DifficultyBand;
    readonly bandBasis: "self-report";
    /** Always false. Stage A publishes a label, not a score (master-spec §6.2). */
    readonly scored: false;
    /** Always `none`: `out-of-scope-code` for every code item, by construction. */
    readonly codeBands: "none";
  };

  readonly mode: {
    /** The only mode the app runs today: one passage, until the test finishes. */
    readonly id: "passage";
    readonly errorMode: "free";
    readonly available: true;
  };

  readonly layout: {
    readonly value: Layout;
    /** `guessed` until the visitor has chosen one (LOC-01). Never invented here. */
    readonly source: "guessed" | "confirmed";
  };

  readonly languages: {
    /** Only ids this build knows. Unknown ids are dropped, not passed through. */
    readonly selected: readonly TrackLanguage[];
    /** Readiness per selected id, so the plan says what exists and what does not. */
    readonly readiness: ReadonlyArray<{ id: TrackLanguage; readiness: LanguageReadiness }>;
  };

  readonly focus: PlanFocus;

  /** True on every path, including the fully-defaulted one. There is no other value. */
  readonly provisional: true;
  /** The named work that would turn the self-reports above into measurements. */
  readonly pending: readonly PendingRequirement[];
}

/** Everything the plan is built from. Every field is optional: skipping is a path. */
export interface StartingPlanInput {
  readonly goal?: OnboardingGoal | null;
  readonly level?: OnboardingLevel | null;
  /** Unvalidated on purpose: see `normaliseLanguages`. */
  readonly languages?: readonly string[] | null;
  /** The layout LOC-01 already decided. The plan never chooses one. */
  readonly layout: Layout;
  /** Whether that layout was guessed or chosen by the visitor. */
  readonly layoutConfirmed: boolean;
}

/** Keep only ids this build knows, in the order given, without duplicates. */
export function normaliseLanguages(raw: readonly string[] | null | undefined): TrackLanguage[] {
  if (!Array.isArray(raw)) return [];
  const out: TrackLanguage[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    if (!TRACK_LANGUAGE_IDS.includes(value)) continue;
    const id = value as TrackLanguage;
    if (out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

/** Coerce anything to a goal, or null for an unknown/absent one. Never guesses. */
export function normaliseGoal(raw: unknown): OnboardingGoal | null {
  return typeof raw === "string" && (ONBOARDING_GOALS as readonly string[]).includes(raw)
    ? (raw as OnboardingGoal)
    : null;
}

/** Coerce anything to a level, or null. Never guesses — "unsure" is a real answer. */
export function normaliseLevel(raw: unknown): OnboardingLevel | null {
  return typeof raw === "string" && (ONBOARDING_LEVELS as readonly string[]).includes(raw)
    ? (raw as OnboardingLevel)
    : null;
}

/**
 * The plan. Pure, total and deterministic: the same input always yields the same
 * plan, so a stored record re-derives rather than being trusted.
 *
 * It never throws and never asks a question. An absent goal, an absent level, an
 * empty language list and a corrupt layout source all produce a complete plan
 * with the gaps named — which is what makes "skippable" mean the app still has a
 * starting point rather than a null.
 */
export function buildStartingPlan(input: StartingPlanInput): StartingPlan {
  const goal = normaliseGoal(input.goal);
  const level = normaliseLevel(input.level);
  const selected = normaliseLanguages(input.languages);
  // `unsure` is a real answer to both questions and is kept as one; only a
  // genuinely absent or unrecognised answer falls back to the middle band.
  const band = level === null ? BAND_FOR_LEVEL.unsure : BAND_FOR_LEVEL[level];
  const focus = goal === null ? FOCUS_FOR_GOAL.unsure : FOCUS_FOR_GOAL[goal];

  return {
    version: 1,
    goal: { id: goal, source: goal === null ? "defaulted" : "asked" },
    level: { selfReported: level, basis: "self-report", measured: null },
    content: {
      family: "prose",
      band,
      bandBasis: "self-report",
      scored: false,
      codeBands: "none",
    },
    mode: { id: "passage", errorMode: "free", available: true },
    layout: {
      value: input.layout,
      source: input.layoutConfirmed ? "confirmed" : "guessed",
    },
    languages: {
      selected,
      readiness: selected.map((id) => ({ id, readiness: languageReadiness(id)! })),
    },
    focus,
    provisional: true,
    pending: PENDING_REQUIREMENTS,
  };
}
