/**
 * Version notes for the typability model (CNT-02).
 *
 * master-spec §6.2 Stage A ends with "version and changelog the scoring model",
 * and AGENTS.md rule 3 sets the precedent this file follows: a formula change
 * means a version bump plus a changelog entry, not a silent edit.
 *
 * RECORD FORMAT (one entry per version, oldest first)
 *
 *   version     the exact `TYPABILITY_VERSION` string the entry describes
 *   note        what changed and why, in one paragraph
 *   boundaries  `{ from, to }` - the two band boundary values on both sides of
 *               the change. `from` is null for the first version, which had no
 *               predecessor. Both values are recorded even when they did not
 *               move, because "the boundaries did not change, the weights did"
 *               is exactly the case a reviewer needs to see.
 *   features    which feature names changed. Empty means the feature set itself
 *               is unchanged.
 *   configDigest the SHA-256 of `typabilityConfigDigestInput()` at this version,
 *               so a note can be checked against the code rather than trusted.
 *
 * WHAT THE GATE CHECKS (`scripts/check-typability.mjs`)
 *
 *   - the newest note's `version` equals the live `TYPABILITY_VERSION`;
 *   - the newest note's `boundaries.to` equals the live `BAND_BOUNDARIES`;
 *   - the newest note's `configDigest` equals the live digest;
 *   - the artifact's recorded boundaries and digest equal the live ones.
 *
 * So "the boundaries were changed without a version note" is a red build in three
 * independent ways, and a note that forgets to move with the code is also red.
 */
import { TYPABILITY_VERSION } from "./config.ts";

/** One version note. */
export interface TypabilityVersionNote {
  readonly version: string;
  readonly note: string;
  readonly boundaries: {
    readonly from: { readonly typicalMax: number; readonly hardMin: number } | null;
    readonly to: { readonly typicalMax: number; readonly hardMin: number };
  };
  readonly features: ReadonlyArray<string>;
  /** SHA-256 of the canonical config string, prefixed `sha256:`. */
  readonly configDigest: string;
}

/**
 * The changelog. Add an entry for every version bump; never edit an existing one
 * except to fix the digest field that the tests compare against.
 */
export const TYPABILITY_VERSION_NOTES: ReadonlyArray<TypabilityVersionNote> = Object.freeze([
  {
    version: TYPABILITY_VERSION,
    note:
      "First scored model. Thirteen features over the master-spec §6.2 / implementation-guide §6.5 " +
      "families, three content features at weight 1.5 and the length feature at 0.5 (see " +
      "config.ts for the reasoning), boundaries calibrated once to the tertiles of the banded " +
      "corpus at this version and then frozen. Code, word-pool, symbol-dense and non-English text " +
      "receive no band and an explicit reason. Offline validation only (§6.5 step 6): no band has " +
      "been checked against a user's speed, which is §6.5 step 7 and still outstanding.",
    boundaries: {
      from: null,
      to: { typicalMax: 65, hardMin: 57 },
    },
    features: [
      "lowercaseAmongNonSpace",
      "frequentWordShare",
      "knownWordShare",
      "meanBigramWeight",
      "rightHandLetterShare",
      "meanWordLength",
      "longWordShare",
      "symbolShare",
      "digitShare",
      "uppercaseShare",
      "classTransitionRate",
      "syllablesPerWord",
      "keystrokes",
    ],
    configDigest: "sha256:1fbe193423ee4a66757e2e1949980221f10e01ba2111a0182b9d4117ec097652",
  },
]);
