/**
 * RealType typing engine (open-core, MIT) — log → observations adapter
 * (ENG-OBS, the integration gap LRN-02 named).
 *
 * WHY THIS FILE EXISTS. `proficiency.ts` is a correct weakness model with no
 * input: it consumes `KeySample[]` / `BigramSample[]` and nothing in the product
 * produced them. LRN-02's own report named this adapter as the one blocking
 * gap. This is that wire: captured `InputLog` → the observation records the
 * model scores.
 *
 * THE SPEC TEXT BEING IMPLEMENTED. Implementation-guide §5.3.12 "Statistics for
 * learning (feeds M4)", verbatim:
 *
 *   1. Per-key stats: for each target character, record attempts, errors, and
 *      time-to-press (time from the previous keystroke to this one).
 *   2. Per-bigram stats: for each adjacent pair in the target, record the
 *      interval between the two keystrokes and whether either was wrong.
 *   4. Rules: only count pairs where both keystrokes were accepted and adjacent
 *      in time (no pause > threshold); tag pairs as same-hand/alternate-hand/
 *      same-finger using the user's layout.
 *   5. Store aggregates compactly; never store the typed text.
 *
 * §5.3.12.5 is not a style note, it is the reason this module's return type
 * carries no string field (see PRIVACY below).
 *
 * WHY NO LAYOUT PARAMETER, despite §5.3.12.4. The hand/same-finger/same-hand
 * tag is not this module's to produce: `proficiency()` already resolves it from
 * the SCORED item via `fingerTag(from, to, context.layout)`, so a second copy
 * here would be the exact "two copies will drift" failure `itemEvidence`
 * already avoids by delegating outlier exclusion to `aggregateBigram`. Taking a
 * `Layout` and not reading it would be a lie in the signature. The layout is
 * therefore consumed where it belongs, downstream, at scoring time. (The one
 * thing the layout does NOT reach is a deferred gap, not a change here: char-
 * based `fingerTag` returns "unknown" for the AltGr/dual-key presses that
 * `aggregation.fingerTagForEvents` resolves from `event.code` — chapter 4 E8.)
 *
 * PURE BY CONSTRUCTION (AGENTS.md rule 3, INT-05 server recompute): no clock,
 * no randomness, no I/O, no module state. Every instant arrives on `event.t`,
 * so the API recomputes a stored log to byte-identical observations.
 * Determinism is a contract here, not a nicety: `itemEvidence` accumulates in
 * exact integers precisely so replaying the same observations in any order
 * cannot drift, and that guarantee is worthless if the observations themselves
 * differ between the client and the server.
 *
 * PRIVACY (AGENTS.md rule 4, keystroke-privacy skill). This is the module that
 * touches raw typed text most directly — it reads the target to decide which
 * presses were accepted — so the privacy property is STRUCTURAL rather than
 * disciplinary. Every field of `Observations` is a number, a boolean, or a
 * `SingleKey` (a branded one-character string that `singleKey()` validates).
 * There is no field of any type that could hold more than one character, so the
 * typed text cannot be carried out of here even by a careless future edit. The
 * tests prove it twice: a compile-time rejection of a text field, and a runtime
 * sweep asserting the serialised output never contains the target and that no
 * emitted key is longer than one UTF-16 code unit.
 *
 * NO EXECUTION, NO TRANSFORM. The target is read to answer exactly one question
 * per press — was it accepted, was it correct, at which target position — and is
 * never stored, echoed, embedded, or used to build content.
 */

import type { InputLog, KeyEvent, TypingText } from "@realtype/schemas";

import { filterEvents, isBackspace } from "./input-filter.js";
import { IKI_GAP_EXCLUSION_MS } from "./metrics.js";
import { singleKey, type BigramSample, type KeySample, type SingleKey } from "./proficiency.js";
import { applyPress, createTextModel } from "./text-model.js";

/**
 * §5.3.12.1 "time-to-press (time from the previous keystroke to this one)" is
 * undefined for the first press of an attempt — there is no previous
 * keystroke.
 *
 * Reporting 0 would be a lie the model would believe: a fabricated instant
 * interval is the most extreme outlier §4.12 can be handed, and it would drag
 * the median of the very key the user happened to start on. Reporting the
 * previous press's timestamp is a different lie (it invents a predecessor).
 *
 * `NaN` is the honest encoding and it is not a shrug: `itemEvidence` already
 * defines `invalid` as "observations with no usable interval (non-finite,
 * negative, overflowing)". A first-press observation therefore still counts as
 * an observation and still contributes its ACCURACY — the press happened, and
 * whether it was right is real evidence — while contributing nothing to the
 * speed estimate. The tests pin that end-to-end through `itemEvidence`.
 *
 * `JSON.stringify` writes it as `null`, and `Number.isFinite(null)` is false,
 * so a wire round-trip lands in the same `invalid` bucket: the behaviour does
 * not depend on staying in-process.
 */
const NO_PREDECESSOR_MS = Number.NaN;

/**
 * Counts that the sample arrays cannot express. All numeric, by the same
 * privacy argument as the samples themselves.
 *
 * They exist because the honest failure modes of an adapter are silent ones.
 * "I dropped something" has to be countable, or a caller cannot tell a clean
 * extraction from a lossy one and will trust both equally.
 */
export interface ObservationStats {
  /** Scoring presses inside the attempt (auto, repeat, untrusted and keyups excluded). */
  scoringPresses: number;
  /** Presses the error mode refused: must-correct pending, word-locked boundary, halt. */
  rejectedPresses: number;
  /**
   * Accepted Backspaces. Deliberately NOT samples (see the correction decision
   * in `observationsFromLog`) and therefore worth reporting: they are real
   * keystrokes that appear in no sample and are visible only here.
   */
  corrections: number;
  /** Pairs dropped because the gap exceeded `IKI_GAP_EXCLUSION_MS` (§5.3.12.4). */
  gapExcludedPairs: number;
  /**
   * Presses whose produced character is not one UTF-16 code unit and therefore
   * cannot be a `SingleKey` (an emoji, a decomposed sequence). These are the
   * only samples this module knowingly loses, and they are counted rather than
   * swallowed.
   */
  unresolvedPresses: number;
}

/**
 * Everything LRN-02 needs, and nothing it does not.
 *
 * Every field is a number, a boolean, or a `SingleKey`. There is no field that
 * can hold a word.
 */
export interface Observations {
  /** One observation per printable scoring press, in capture order. */
  readonly keys: readonly KeySample[];
  /** One observation per clean adjacent transition, in capture order. */
  readonly bigrams: readonly BigramSample[];
  readonly stats: ObservationStats;
}

/**
 * One scoring press, resolved against the target. Internal: these never leave
 * this module, and none of them can hold text either.
 *
 * A DISCRIMINATED UNION rather than a record of nullable fields, because "was
 * this press accepted" and "which target unit did it fill" are the same fact:
 * only an accepted press occupies a unit. Written as two independent nullable
 * fields they produced a guard (`accepted && position !== null`) whose first
 * clause was unreachable — `position` is non-null exactly when `accepted` is —
 * and the mutation harness proved it: deleting `accepted` from the guard
 * changed no test result. Keying the union on `accepted` turns that redundancy
 * into a COMPILE error, so the rule can no longer be quietly dropped.
 *
 * `key` is present on BOTH arms, including for a refused press: knowing which
 * key the user failed to land is the entire point of §8.2.3's error-ratio half.
 */
interface AcceptedPress {
  readonly accepted: true;
  /** The produced character, or null when the press cannot be a `SingleKey`. */
  readonly key: SingleKey | null;
  /** Target unit index the press filled. */
  readonly position: number;
  /** §5.3 (5): "a corrected mistake stays a mistake" — false once a press is wrong. */
  readonly correct: boolean;
  /** Event time, on the engine's own clock (see the `atMs` note below). */
  readonly atMs: number;
}

interface RefusedPress {
  readonly accepted: false;
  readonly key: SingleKey | null;
  /** A refused press took no unit, so it has no position. */
  readonly position: null;
  /** Always false: an unaccepted press is by definition not a correct one. */
  readonly correct: false;
  readonly atMs: number;
}

type PressRecord = AcceptedPress | RefusedPress;

/** A press eligible to take part in a pair (§5.3.12.4). */
interface PairableRecord extends AcceptedPress {
  readonly key: SingleKey;
}

function isPairable(record: PressRecord): record is PairableRecord {
  return record.accepted && record.key !== null;
}

/**
 * Turn a captured log into the observations LRN-02 scores.
 *
 * `atMs` IS `event.t`, unmodified. That is deliberate, and it is why this takes
 * a log rather than a bare event list: `KeyEvent.t` is contractually
 * "milliseconds since the first accepted keystroke", which is the same clock
 * `metrics.ts` uses for `durationMs`, `scoredDurationMs` and the IKI series.
 * Re-origining timestamps here would put the observations on a different clock
 * from the result they sit beside, and every consumer that plots a sample
 * against the run's duration — ANA-01's rhythm ribbon — would need a second,
 * private normalisation it had no way to know about. One clock, one
 * normalisation, in `metrics.ts`.
 *
 * @param log  The captured session. `log.meta.settings.errorMode` is the mode
 *   the run actually used, so the replay cannot disagree with the contract.
 * @param text The content that was typed. Supplied by the caller because the
 *   log deliberately does not contain it (it carries only `textHash`); it is
 *   read to decide acceptance and is not retained.
 */
export function observationsFromLog(log: InputLog, text: TypingText): Observations {
  const filtered = filterEvents(log.events);
  const model = createTextModel(text.text, log.meta.settings.errorMode);

  /*
   * Replay `textAffecting`, not `scoringPresses`: auto-inserted characters
   * belong in the produced text even though they are not keystrokes (ENG-09),
   * so skipping them here would score every character after an auto-paired
   * bracket against the wrong target position. This is the same list, in the
   * same order, that `computeFromEvents` replays — which is what keeps the two
   * from drifting apart, which is the ENG-09 regression restated.
   */
  const resolved: { event: KeyEvent; record: PressRecord }[] = [];
  let rejectedPresses = 0;
  let corrections = 0;
  let unresolvedPresses = 0;

  for (const event of filtered.textAffecting) {
    const insertsBefore = model.inserts.length;
    const outcome = applyPress(model, event);
    /*
     * Two presses are never observations, and both exclusions come from the
     * log itself rather than from the replay:
     *
     *   - an AUTO character is not a keystroke (ENG-09): the app pressed nothing,
     *     so there is no key, no interval and no motor transition to attribute.
     *   - an EDIT key is not a character of the target (§5.3.12.1 is per target
     *     character). "Backspace" is also eight code units long, so the
     *     representability test below would exclude it anyway; naming it says
     *     why, and stops it being counted as an unresolved key.
     */
    const typed = event.auto !== true;
    const edit = isBackspace(event.key);

    /*
     * A press "landed" when the text model appended an insert for it: that single
     * fact is the answer to three questions at once — was it accepted, was it
     * correct, and which target unit did it fill — and it is read back from
     * `model.inserts` rather than re-derived. A second `target[caret] === key`
     * here would be a second answer to the same question, and the two would
     * eventually disagree about astral-plane units — exactly as
     * `correctCharsInFinalText` had to be written grapheme by grapheme to stop
     * crediting a lone surrogate half.
     *
     * `model.inserts` grows only for TYPED presses: an auto character lands in
     * the buffer but is not an insert, which is why the growth check and not the
     * `"inserted"` outcome alone is the test.
     */
    const landed = outcome === "inserted" && model.inserts.length > insertsBefore;
    // The outcomes are mutually exclusive, so `landed` cannot be true here.
    if (outcome === "rejected") {
      rejectedPresses += 1;
    } else if (outcome === "corrected" || outcome === "cleared") {
      corrections += 1;
    }

    /*
     * `key` comes from `event.key` — the character the layout produced — and
     * NEVER from `event.code`. `code` is a physical key name: "KeyA" is four
     * characters and means nothing as a key identity, so the tempting shortcut
     * of trimming it (`code.slice(3)`) manufactures a plausible-looking letter
     * that was never pressed. Chapter 4 E8 requires attribution to the key
     * actually pressed, which for this model means the produced character — with
     * the code kept beside it for the callers that need physical resolution,
     * not a character guessed from a code. So an unknown or malformed code can
     * never become a bogus key: it is never consulted for identity at all, and
     * the physical-key questions that DO need it (`fingerForCode`,
     * `fingerTagForEvents`) already fail closed to `unknown`.
     *
     * The test is deliberately NOT `accepted`. §5.3 (5) and the
     * typing-metrics-spec both say a wrong press stays wrong, and in must-correct
     * mode the wrong press is precisely the press that was REFUSED: it never
     * reaches the buffer, yet metrics.ts counts it in `printableKeystrokes` and
     * charges it against `keystrokeAccuracy`. Observing only accepted presses
     * would report a perfect error rate for every must-correct typist and leave
     * §8.2.3's error-ratio half — half the severity score — permanently zero in
     * one of the product's primary modes. So every printable press is observed
     * and `correct` is what it was accepted for.
     *
     * `length === 1` is `singleKey()`'s own predicate, checked first as a cheap
     * guard so that `singleKey` remains the authority that mints the brand (a
     * cast would defeat it; an assertion cannot). This is reachable, not
     * defensive padding: the engine's comparison unit is a GRAPHEME (chapter 4
     * E6, ENG-FIXTURE-E6), so one emoji press is one scoring press whose `key`
     * is 2–11 UTF-16 units long. `singleKey` would throw on it and `key[0]`
     * would leave a lone surrogate half — a bogus key, and the precise failure
     * `correctCharsInFinalText` documents.
     */
    const key = typed && !edit && event.key.length === 1 ? singleKey(event.key) : null;
    // `!edit` matters here even though "Backspace" is eight code units and the
    // length test would reject it anyway: an edit key is not an unresolved
    // CHARACTER, and charging it as one would report a lossy extraction on
    // every log containing a correction.
    if (typed && !edit && key === null) unresolvedPresses += 1;

    resolved.push({
      event,
      record: landed
        ? {
            accepted: true,
            key,
            // Only an accepted press occupies a target position, so only an
            // accepted press has one.
            position: model.buffer.length - 1,
            correct: model.inserts[model.inserts.length - 1]!.correct,
            atMs: event.t,
          }
        : {
            accepted: false,
            key,
            position: null,
            correct: false,
            atMs: event.t,
          },
    });
  }

  /*
   * stop-on-error (D02): the attempt ended at the first error, so every press
   * after `haltedAtT` happened after the test was over. `metrics.ts` truncates
   * the same way, and not truncating here would let a halted run contribute
   * evidence about keys the user was only idly pressing after the fact.
   * `haltedAtT` is read into a local const because `model` is mutable and TS
   * cannot narrow a property across a closure.
   */
  const haltedAtT = model.haltedAtT;
  /*
   * `textAffecting` is the scoring presses plus the auto-inserted characters,
   * and the two sets are disjoint (`filterEvents` routes on `auto` before it
   * tests `isScoringPress`), so dropping `auto` here reproduces exactly
   * `filtered.scoringPresses`, in order — without depending on object identity
   * between the two arrays.
   */
  const presses = resolved.filter(
    (entry) => entry.event.auto !== true && (haltedAtT === null || entry.event.t <= haltedAtT),
  );

  const keys: KeySample[] = [];
  const bigrams: BigramSample[] = [];
  let gapExcludedPairs = 0;
  let previousAtMs: number | null = null;

  for (let i = 0; i < presses.length; i++) {
    const current = presses[i]!.record;

    /*
     * Every printable scoring press becomes exactly one key sample, INCLUDING
     * the ones the error mode refused. §5.3 (5) and the typing-metrics-spec
     * agree: keystroke accuracy is "correct keystrokes ÷ total printable
     * keystrokes (a corrected mistake stays a mistake)". `metrics.ts` draws that
     * identical line — `printableKeystrokes` counts a press whose insert was
     * wrong, and `keystrokeAccuracy` divides correct inserts by it — so
     * `keys.length + unresolvedPresses === printableKeystrokes` holds across
     * every fixture, and the test asserts it. Observing only the presses that
     * landed would show the weakness model a flawless typist, which is the one
     * thing §8.2.3's error-ratio half exists to prevent.
     *
     * Backspace is the only scoring press with no sample, and that is the
     * correction decision (§5.3.12.1 is per target character): it is not a
     * character of the target, and giving it a key would invent an item the
     * model would then rank forever. What the correction IS worth — that the
     * mistake happened at all — is already carried by the wrong press's
     * `correct: false`, which §5.3 (5) refuses to let anyone repair.
     */
    if (current.key !== null) {
      keys.push({
        key: current.key,
        /*
         * §5.3.12.1: "time from the previous keystroke to this one". The
         * predecessor is the previous SCORING press, Backspaces included —
         * which is exactly what `ikiMean` in metrics.ts measures, so the
         * adapter and the headline IKI are the same numbers on the same clock.
         *
         * (`KeySample`'s own doc comment says "from the previous accepted
         * press". The two readings differ only after a correction, where
         * "accepted" folds the correction's own time into the innocent key that
         * follows it. §5.3.12.1's "previous keystroke" and `ikiMean`'s
         * consecutive-scoring-press rule are the same rule and are the ones
         * implemented; the discrepancy is reported, not silently resolved.)
         */
        intervalMs: previousAtMs === null ? NO_PREDECESSOR_MS : current.atMs - previousAtMs,
        correct: current.correct,
        atMs: current.atMs,
      });
    }

    /*
     * Bigram admission (§5.3.12.2 + §5.3.12.4). A pair forms only from presses
     * that are CONSECUTIVE in the scoring-press sequence. That single rule is
     * what "both keystrokes were accepted and adjacent in time" means here, and
     * it makes every interruption break the pair without a special case:
     *
     *   - a Backspace between them is itself a scoring press, so neither
     *     (prev, bs) nor (bs, next) is a pair of two accepted presses;
     *   - an error between them is itself a scoring press that was not accepted,
     *     same result;
     *   - a pause is admitted by the gap test below;
     *   - an auto-inserted character is not a keystroke at all, so it neither
     *     forms a pair nor breaks one — the user's own consecutive presses stay
     *     consecutive.
     *
     * Pairing "the previous SAMPLE" instead would be wrong in both directions:
     * it would bridge the Backspace, reporting a transition the user never
     * made, and it would pair presses the error mode refused.
     */
    const previous = i > 0 ? presses[i - 1]!.record : null;
    if (
      previous !== null &&
      isPairable(previous) &&
      isPairable(current) &&
      // §5.3.12.2 "for each adjacent pair IN THE TARGET": adjacency is judged
      // on target positions, not on the clock. Without this, a retyped
      // character would pair with whatever the caret happened to land on next,
      // and "the hardest transition" would name a pair that is not in the text.
      // It is also what stops an auto-paired character from silently welding the
      // two keys around it into a transition the user did not type.
      current.position === previous.position + 1
    ) {
      const gap = current.atMs - previous.atMs;
      if (gap <= IKI_GAP_EXCLUSION_MS) {
        bigrams.push({
          from: previous.key,
          to: current.key,
          // §5.3.12.2: "the interval between the two keystrokes" — the
          // transition's own duration, not the first key's time-to-press.
          intervalMs: gap,
          // §5.3.12.2: "whether EITHER was wrong" — one error poisons the pair.
          correct: previous.correct && current.correct,
          // A transition completes when its second key lands, so that is when
          // it earns the §8.4.1 recency weight.
          atMs: current.atMs,
        });
      } else {
        // §5.3.12.4 "no pause > threshold", with the threshold being the IKI
        // exclusion gap the rest of the engine already uses for the same
        // reason: past it the user was not typing.
        gapExcludedPairs += 1;
      }
    }

    /*
     * Advanced for EVERY scoring press, Backspaces included — they are
     * keystrokes, they occupy real time, and `ikiMean` counts them. Skipping
     * them here would silently delete the correction's cost from the IKI series.
     */
    previousAtMs = current.atMs;
  }

  return {
    keys,
    bigrams,
    stats: {
      scoringPresses: presses.length,
      rejectedPresses,
      corrections,
      gapExcludedPairs,
      unresolvedPresses,
    },
  };
}
