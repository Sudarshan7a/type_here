/**
 * RealType seeded pseudo-random numbers (CNT-05, master-spec §5.6 / impl guide
 * §6.3 "Synthetic generators").
 *
 * WHY A HAND-WRITTEN PRNG INSTEAD OF A DEPENDENCY
 *
 * Content determinism is a product contract here, not a convenience: INT-03 signs
 * a seed/nonce at session start, PRG-17 re-tests a user against "the same
 * difficulty", and every stored result has to be reproducible from its seed years
 * later. So the sequence a seed produces must be frozen for the lifetime of the
 * product. That argues against any library that might change its default, its
 * seeding scheme, or its bit-mixing between patch versions (several well-known
 * general-purpose RNG packages have done exactly that), and against crypto RNGs
 * whose whole point is unpredictability.
 *
 * The implementation is sfc32 ("Small Fast Counter" 32-bit), a published
 * counter-based generator with a 128-bit state that passes BigCrush and is
 * explicitly intended for simulations rather than security. It is used here
 * because its state update is *entirely* 32-bit integer arithmetic.
 *
 * WHY THE OUTPUT IS BYTE-IDENTICAL ON EVERY NODE VERSION AND EVERY JS ENGINE
 *
 * Every value produced below is computed with `|0`, `>>>`, `^` and `Math.imul` on
 * int32 values. Those are specified by ECMA-262 on integer operands (not on the
 * engine's floating-point implementation), so no step depends on:
 *   - IEEE-754 rounding of intermediate float arithmetic (we never add floats),
 *   - the engine's 32-bit truncation behaviour,
 *   - V8's Math.* fast paths or JIT int-vs-double promotion decisions.
 * The only float in the whole path is the final division by 2^32, which is exact
 * for values below 2^53 and happens once per draw. `Math.imul` is used rather than
 * `a * b | 0` because the product of two int32 values exceeds 2^53 only above ~2^26
 * and `Math.imul` defines the low 32 bits without relying on double precision.
 *
 * A cryptographically seeded source (crypto.randomUUID, crypto.getRandomValues)
 * is deliberately not used anywhere: it would make output irreproducible.
 */

export type SeedInput = number | string;

/** FNV-1a 32-bit constants (Fowler-Noll-Vo, the published specification). */
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * Normalise any numeric seed to a uint32. Two seeds that agree modulo 2^32
 * produce the same stream; that is documented rather than surprising, and it is
 * why the API also accepts strings (see {@link fnv1a32}) for callers that want a
 * seed they can read, such as INT-03's daily-challenge id.
 */
function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return Math.trunc(seed) >>> 0;
}

/**
 * FNV-1a, 32-bit. Chosen over a string hash like Java's because the
 * specification is one paragraph, the algorithm is a *fixed* published standard
 * (so it cannot drift between versions of anything) and it uses only int32 ops, so
 * it is stable for the same reasons sfc32 is.
 */
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash ^ input.charCodeAt(index)) >>> 0;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * SplitMix32, used only to expand one uint32 seed into sfc32's four 32-bit state
 * words. A single 32-bit seed would leave the other three words at zero, and sfc32
 * degrades badly from a low-entropy state.
 */
function splitmix32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x9e3779b9) | 0;
    let t = state ^ (state >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

/** sfc32 proper. Returns a draw in [0, 1) from four uint32 state words. */
function sfc32(a0: number, b0: number, c0: number, d0: number): () => number {
  let a = a0 | 0;
  let b = b0 | 0;
  let c = c0 | 0;
  let d = d0 | 0;
  return () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * SplitMix32 expansion into a usable sfc32 stream.
 *
 * No all-zero guard: an all-zero sfc32 state needs four consecutive zero outputs from
 * SplitMix32, which is 2^-128, and the canonical implementations carry a re-seed loop
 * for it anyway. Dead code that cannot be reached is worse than a probability that
 * small, so the reasoning lives here instead.
 */
function streamFromSeed(seed: number): () => number {
  const mix = splitmix32(seed);
  return sfc32(mix(), mix(), mix(), mix());
}

/**
 * Mix a seed with a family label and an item index.
 *
 * WHY per-item streams instead of one long stream: a drill has to be able to ask
 * for "the seventh item of seed 42, family ids" without generating items 0-6 (a
 * retry after a paused tab, a re-render, an analytics replay). Because the stream
 * for item *i* depends only on (seed, family, i), asking for 100 items returns the
 * same first 10 items as asking for 10 - and adding a sixth family cannot shift
 * what the other five produce.
 */
export function deriveSeed(seed: SeedInput, label: string, index = 0): number {
  const base = typeof seed === "string" ? fnv1a32(seed) : normalizeSeed(seed);
  const positional = Math.imul(index + 1, 0x9e3779b1);
  return (base ^ positional ^ fnv1a32(label)) >>> 0;
}

/**
 * The generator every CNT-05 family draws from. Immutable: constructing one with a
 * seed fully determines its sequence, and two instances with the same seed are
 * indistinguishable (which is what the determinism tests assert).
 */
export class SeededRng {
  private readonly next: () => number;
  private readonly seedValue: number;

  constructor(seed: SeedInput) {
    this.seedValue = typeof seed === "string" ? fnv1a32(seed) : normalizeSeed(seed);
    this.next = streamFromSeed(this.seedValue);
  }

  /** The uint32 this generator was built from, for the item metadata. */
  get seed(): number {
    return this.seedValue;
  }

  /** Uniform-ish float in [0, 1). The only float produced by this module. */
  float(): number {
    return this.next();
  }

  /** Integer in [min, max], both inclusive. Throws rather than returning NaN. */
  int(minInclusive: number, maxInclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
      throw new RangeError(`SeededRng.int needs integers, got ${minInclusive}..${maxInclusive}`);
    }
    if (maxInclusive < minInclusive) {
      throw new RangeError(`SeededRng.int needs min <= max, got ${minInclusive}..${maxInclusive}`);
    }
    return minInclusive + Math.floor(this.float() * (maxInclusive - minInclusive + 1));
  }

  /**
   * True with probability `probability`. Deterministic for a fixed stream, so a
   * seeded drill's "does this item get an escape sequence" is stable across runs.
   */
  chance(probability: number): boolean {
    return this.float() < probability;
  }

  /**
   * One element of a non-empty list. The empty case throws instead of returning
   * undefined, because every call site here is a generator whose pool is a
   * compile-time constant and a silent undefined would become `"undefined"` in
   * drill text.
   */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError("SeededRng.pick needs a non-empty list");
    return items[this.int(0, items.length - 1)]!;
  }

  /** Fisher-Yates on a copy: the input is never touched (purity, not politeness). */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = this.int(0, index);
      const held = copy[index]!;
      copy[index] = copy[swap]!;
      copy[swap] = held;
    }
    return copy;
  }

  /** `length` characters drawn from `alphabet`, uniform over the alphabet. */
  fromAlphabet(alphabet: string, length: number): string {
    if (alphabet.length === 0) throw new RangeError("SeededRng.fromAlphabet needs an alphabet");
    let out = "";
    for (let index = 0; index < length; index += 1) {
      out += alphabet[this.int(0, alphabet.length - 1)];
    }
    return out;
  }
}
