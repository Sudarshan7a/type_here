/**
 * The `brackets` family (CNT-05; master-spec §7 tier 1 "Brackets & pairs", skill tier 1,
 * implementation guide levels 1-5 and the "Bracket Gauntlet" boss).
 *
 * BOUNDARY WITH PRG-11. PRG-11 owns the balance *drill*: the nesting ladder UI, the
 * open-to-close latency metric, and the auto-pair/`partial` behaviour it owns from
 * ENG-09. This module owns the material and one decision that belongs to generation:
 * whether an item is balanced, and if not, **why**. Every deliberately unbalanced item
 * carries its intent in its parameters, because a drill cannot score an imbalance it
 * cannot name, and because an unmarked imbalance is indistinguishable from a bug.
 *
 * THE SKIN DECIDES WHICH BRACKETS EXIST. `<` and `>` are brackets in a C-like language
 * and two comparison operators in Python (master-spec §7.1, and the lexer's rule 7), so
 * a Python drill that contained `<>` would type two operators while the drill called
 * them a bracket pair. The generator asks the profile rather than hard-coding six
 * characters.
 */

import type { LanguageProfile } from "@realtype/engine";

import type { SeededRng } from "./prng.js";
import { SeededRng as Rng, deriveSeed } from "./prng.js";
import { bracketBalance } from "./safety.js";
import { clampCount, clampInt, clampLevel, makeItem, pickForm, resolveSkin } from "./shared.js";
import type { BracketSetOptions, BracketShape, GeneratedItem } from "./types.js";

export const BRACKET_SHAPES: readonly BracketShape[] = Object.freeze([
  "pairs",
  "content",
  "nesting",
  "mixed",
  "ladder",
  "overtype",
  "unbalanced",
]);

/**
 * Shape pools per level, following levels 1-5: isolated pairs, pairs with content,
 * depth-2 nesting, mixed nesting to depth 3-4, and the boss's deliberately broken
 * fragments. `[proposal]` (§10.5).
 */
const SHAPES_BY_LEVEL: Readonly<Record<number, readonly BracketShape[]>> = Object.freeze({
  1: ["pairs"],
  2: ["pairs", "content"],
  3: ["pairs", "content", "nesting", "mixed"],
  4: ["pairs", "content", "nesting", "mixed", "ladder"],
  5: ["pairs", "content", "nesting", "mixed", "ladder", "overtype", "unbalanced"],
});

/** Opening-to-closing map for the characters the engine classes as brackets. */
function bracketPairs(profile: LanguageProfile): ReadonlyMap<string, string> {
  const declared = new Set(profile.brackets);
  // The profile lists the six characters, not the pairs; the pairs are fixed by the
  // keyboard, not by the language, so both halves are checked against the profile.
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["<", ">"],
  ];
  return new Map(pairs.filter(([open, close]) => declared.has(open) && declared.has(close)));
}

/**
 * The subset of pairs that may be *nested*: everything except the angle brackets.
 *
 * A run of the same angle bracket (`<<<<`) is a shift operator in every profile that
 * has `<<`, and the lexer matches multi-character operators before brackets (token-map
 * rules 6 and 7), so such a run does not tokenize as brackets at all. Emitting it would
 * put content into the drill that the authoritative token map cannot classify - the one
 * thing this package promises never to do. Angle brackets therefore appear as single
 * pairs, where they are what a typist actually meets (`<div>`, `<T>`), and never as a
 * repeated run.
 *
 * The exclusion is unconditional rather than profile-conditional: every shipped profile
 * lists `<<`/`>>` among its operators, so the two rules agree today, and one rule has no
 * unreachable branch to keep honest.
 */
function nestingPairs(pairs: ReadonlyMap<string, string>) {
  return new Map([...pairs].filter(([open]) => open !== "<"));
}

const CONTENT_ALPHABET = "abcxyzw01";

interface Built {
  readonly text: string;
  readonly params: Readonly<Record<string, string | number | boolean>>;
  /** Only `overtype`: the balanced expression the openers belong to. */
  readonly fullText?: string;
}

/** `count` adjacent pairs, e.g. `()[]{}`. Isolated pairs are level 1's whole content. */
function buildPairs(rng: SeededRng, pairs: ReadonlyMap<string, string>, count: number): Built {
  const text = Array.from({ length: count }, () => {
    const open = rng.pick([...pairs.keys()]);
    return open + pairs.get(open)!;
  }).join("");
  return { text, params: { shape: "pairs", pairs: count } };
}

/** Pairs with a little content between them, which is what level 2 adds. */
function buildContent(rng: SeededRng, pairs: ReadonlyMap<string, string>, count: number): Built {
  const text = Array.from({ length: count }, () => {
    const open = rng.pick([...pairs.keys()]);
    const body = rng.fromAlphabet(CONTENT_ALPHABET, rng.int(1, 4));
    return open + body + pairs.get(open)!;
  }).join("");
  return { text, params: { shape: "content", pairs: count } };
}

/**
 * `depth` nested copies of one bracket type, e.g. `(((())))`. Same-type nesting is the
 * level-3 form; `mixed` (below) is the one that makes the drill about matching rather
 * than about repetition.
 */
function buildNesting(rng: SeededRng, pairs: ReadonlyMap<string, string>, depth: number): Built {
  const open = rng.pick([...pairs.keys()]);
  const close = pairs.get(open)!;
  return { text: open.repeat(depth) + close.repeat(depth), params: { shape: "nesting", depth } };
}

/**
 * `depth` levels of nesting with the bracket type chosen per level, e.g. `([{}])`.
 * This is the level-4 "mixed nesting" step and the one that makes the drill about
 * *matching* rather than about repetition; `nesting` above is its same-type
 * counterpart.
 */
function buildMixed(rng: SeededRng, pairs: ReadonlyMap<string, string>, depth: number): Built {
  const openers = Array.from({ length: depth }, () => rng.pick([...pairs.keys()]));
  const closers = openers.map((open) => pairs.get(open)!).reverse();
  return {
    text: openers.join("") + closers.join(""),
    params: { shape: "mixed", depth },
  };
}

/**
 * A ladder of nests of increasing depth, `() (()) ((()))`, which is the level-4
 * "mixed nesting, longer sequences" step: each rung is balanced on its own, so a run
 * of them is a sequence of balanced units rather than one deep expression.
 */
function buildLadder(rng: SeededRng, pairs: ReadonlyMap<string, string>, depth: number): Built {
  const keys = [...pairs.keys()];
  const rungs = Array.from({ length: depth }, (_, rung) => {
    const open = rng.pick(keys);
    const close = pairs.get(open)!;
    return open.repeat(rung + 1) + close.repeat(rung + 1);
  }).join(" ");
  return { text: rungs, params: { shape: "ladder", depth } };
}

/**
 * The openers only: what a user actually presses when the editor auto-inserts the
 * matching closer. `fullText` carries the balanced expression those openers belong to,
 * so PRG-11's auto-pair drill has both projections without either side re-deriving the
 * other.
 */
function buildOvertype(rng: SeededRng, pairs: ReadonlyMap<string, string>, depth: number): Built {
  const built = buildMixed(rng, pairs, depth);
  const closers = new Set([...pairs.values()]);
  const openersOnly = [...built.text].filter((char) => !closers.has(char)).join("");
  return {
    text: openersOnly,
    params: { shape: "overtype", depth, autoPair: true },
    fullText: built.text,
  };
}

/**
 * A balanced expression with exactly one bracket added or removed, and the reason
 * recorded. The three intents are the three ways a nest actually goes wrong:
 *
 *  - `missing-closer` - one closer was never typed. Net depth +1.
 *  - `extra-opener`  - one opener was typed that should not have been. Net depth +1.
 *  - `extra-closer`  - a closer arrives with nothing open, the classic "typed `)` too
 *    early". Net depth -1, and the depth trace dips below zero, which is the signature
 *    a drill measures rather than just the total.
 *
 * |imbalance| is always 1, so a drill can score "one error" rather than "broken". The
 * removal is done *by index*: filtering out a character value would remove one bracket
 * per nesting level and report a three-bracket imbalance on an item labelled one.
 */
function buildUnbalanced(rng: SeededRng, pairs: ReadonlyMap<string, string>, depth: number): Built {
  const chars = [...buildMixed(rng, pairs, Math.max(depth, 2)).text];
  const closers = new Set([...pairs.values()]);
  const intent = rng.pick(["missing-closer", "extra-opener", "extra-closer"] as const);
  if (intent === "extra-opener") {
    return {
      text: rng.pick([...pairs.keys()]) + chars.join(""),
      params: { shape: "unbalanced", intent, imbalance: 1, balanced: false },
    };
  }
  if (intent === "extra-closer") {
    return {
      text: chars.join("") + rng.pick([...closers]),
      params: { shape: "unbalanced", intent, imbalance: -1, balanced: false },
    };
  }
  const closerAt = chars
    .map((char, index) => (closers.has(char) ? index : -1))
    .filter((i) => i >= 0);
  chars.splice(rng.pick(closerAt), 1);
  return {
    text: chars.join(""),
    params: { shape: "unbalanced", intent, imbalance: 1, balanced: false },
  };
}

export function generateBrackets(options: BracketSetOptions): readonly GeneratedItem[] {
  const level = clampLevel(options.level);
  const count = clampCount(options.count);
  const depth = clampInt(options.depth, 1, 4, level >= 4 ? 4 : 2);
  const allowed = SHAPES_BY_LEVEL[level]!;
  const profile = resolveSkin(options.language);
  const pairs = bracketPairs(profile);
  const nest = nestingPairs(pairs);
  // A profile with no bracket characters at all would leave the pools empty, and the
  // first `pick` raises a RangeError naming the empty list. No shipped profile does.
  return Array.from({ length: count }, (_, index) => {
    const rng = new Rng(deriveSeed(options.seed, "brackets", index));
    const shape = pickForm(options.shape, allowed, rng);
    let built: Built;
    switch (shape) {
      case "pairs":
        built = buildPairs(rng, pairs, rng.int(3, 6));
        break;
      case "content":
        built = buildContent(rng, pairs, rng.int(2, 4));
        break;
      case "nesting":
        built = buildNesting(rng, nest, depth);
        break;
      case "mixed":
        built = buildMixed(rng, nest, depth);
        break;
      case "ladder":
        built = buildLadder(rng, nest, depth);
        break;
      case "overtype":
        built = buildOvertype(rng, nest, depth);
        break;
      case "unbalanced":
        built = buildUnbalanced(rng, nest, depth);
        break;
    }
    const balance = bracketBalance(built.text);
    const params: Record<string, string | number | boolean> = { ...built.params };
    // The one number a drill must never have to guess: 0 unless the intent says
    // otherwise, in which case the intent is right here.
    if (built.fullText === undefined && params.intent === undefined) {
      params.balanced = balance.imbalance === 0 && balance.minDepth === 0;
    }
    return makeItem("brackets", `brackets/${shape}`, profile, built.text, params, built.fullText);
  });
}
