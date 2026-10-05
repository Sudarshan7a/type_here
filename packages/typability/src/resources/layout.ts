/**
 * Keyboard geometry for the typability scorer's `rightHandShare` feature
 * (master-spec §6.2: "share of right-side keys (easier)").
 *
 * The layout fact is NOT invented here and NOT copied from a list of typing
 * trainers: it is derived from the same hardware fact the engine documents in
 * `packages/engine/src/layout-fingers.ts` - the letter rows form a 10-column
 * block, and the touch-typing assignment is by COLUMN:
 *
 *   left:  pinky ring middle index index | right: index index middle ring pinky
 *
 * Columns are 0-9, so columns 5-9 are the right hand. On QWERTY-US that is:
 *
 *   top row    q(0) w(1) e(2) r(3) t(4) | y(5) u(6) i(7) o(8) p(9)
 *   home row   a(0) s(1) d(2) f(3) g(4) | h(5) j(6) k(7) l(8) ;(9)
 *   bottom row z(0) x(1) c(2) v(3) b(4) | n(5) m(6) ,(7) .(8) /(9)
 *
 * which gives the twelve right-hand letters `y u i o p h j k l n m` (`;` `,` `.`
 * `/` are punctuation and are handled by the symbol features, not this one).
 *
 * WHY A LOCAL DECLARATION RATHER THAN AN IMPORT
 *
 * `LAYOUT_FINGER_MAPS["qwerty-us"]` in the engine is the authority for finger
 * tags, but the engine's TypeScript sources use `./layout-fingers.js` internal
 * specifiers, which Node cannot resolve when it type-strips a `.ts` file. The
 * corpus pipeline is plain ESM run by `node`, so importing the engine's sources
 * from the scoring path is not possible today without a change to
 * `packages/engine` (see docs/typability-scoring.md §9 Deferred).
 *
 * Rather than fork the data silently, the derivation is declared here and
 * `packages/typability/tests/layout-cross-check.test.ts` asserts it against the
 * engine's own map for every letter. If the engine's map ever changes, that test
 * fails and this constant is updated in the same diff. That is a checked
 * correspondence, not an unchecked copy.
 */

/** QWERTY-US columns 5-9: the keys the right hand covers. */
export const QWERTY_US_RIGHT_HAND_LETTERS: ReadonlySet<string> = new Set([
  "y",
  "u",
  "i",
  "o",
  "p",
  "h",
  "j",
  "k",
  "l",
  "n",
  "m",
]);

/** The four finger tags the engine assigns to columns 5-9, for the cross-check test. */
export const RIGHT_HAND_FINGERS: ReadonlyArray<string> = Object.freeze(["ri", "rm", "rr", "rp"]);
