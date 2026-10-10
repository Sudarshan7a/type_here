import { generate } from "@realtype/generators";

import { getCorpusPassages, getCorpusSnippets } from "../corpus";
import { buildNumberDrill } from "../drills";

/**
 * The programmer baseline's segments (M6-05 / PRG-17).
 *
 * Five timed runs, each in the material it measures: prose for the prose
 * baseline every other score is divided by, symbols, numbers, naming, and a
 * real snippet. What the flow produces is a Code Skill Profile — per-segment
 * figures, not one blended number that would let fast prose hide slow
 * brackets.
 *
 * Every segment's text is built deterministically from a fixed seed, so a
 * baseline and its day-30 retest differ only where M4-08 says they must (the
 * retest advances the seed, it does not reshuffle).
 */

/** How long each segment runs, in seconds. */
export const BASELINE_SEGMENTS = [
  { id: "prose", label: "Prose", seconds: 30 },
  { id: "symbols", label: "Symbols", seconds: 60 },
  { id: "numbers", label: "Numbers", seconds: 60 },
  { id: "naming", label: "Naming", seconds: 60 },
  { id: "code", label: "Code snippet", seconds: 90 },
] as const;

export type BaselineSegmentId = (typeof BASELINE_SEGMENTS)[number]["id"];

/** The fixed seeds. A retest uses seed + 1, per M4-08 item 4. */
const SEGMENT_SEEDS: Readonly<Record<BaselineSegmentId, number>> = Object.freeze({
  prose: 101,
  symbols: 102,
  numbers: 103,
  naming: 104,
  code: 105,
});

/** Enough generated material for the segment's whole window. */
function numbersText(seed: number): string {
  const set = generate({ seed, family: "numbers", count: 40, level: 3 });
  return set.items.map((item) => item.text).join(" ");
}

function namingText(seed: number): string {
  const set = generate({ seed, family: "naming", count: 30, level: 2 });
  return set.items.map((item) => item.text).join(" ");
}

/**
 * The target text for one segment.
 *
 * Pure and deterministic: the same segment and seed always produce the same
 * text. Prose and code come from the corpus (the same pool practice draws
 * from, so a baseline cannot silently be a different instrument); the
 * generated segments come from the seeded generators.
 */
export function segmentText(id: BaselineSegmentId, seedOffset = 0): { id: string; text: string } {
  const seed = SEGMENT_SEEDS[id] + seedOffset;
  switch (id) {
    case "prose": {
      const passages = getCorpusPassages("typical");
      const passage = passages[seed % Math.max(1, passages.length)] ?? passages[0]!;
      return { id: `BASELINE-PROSE-${seed}`, text: passage.text };
    }
    case "symbols":
      // The symbol ladder, repeated to fill the window: the order is the
      // drill, so repeating it repeats the pedagogy rather than padding.
      return {
        id: `BASELINE-SYMBOLS-${seed}`,
        text:
          buildNumberDrill(seed, "symbols") +
          " " +
          buildNumberDrill(seed + 1, "symbols") +
          " " +
          buildNumberDrill(seed + 2, "symbols") +
          " " +
          buildNumberDrill(seed + 3, "symbols"),
      };
    case "numbers":
      return { id: `BASELINE-NUMBERS-${seed}`, text: numbersText(seed) };
    case "naming":
      return { id: `BASELINE-NAMING-${seed}`, text: namingText(seed) };
    case "code": {
      const snippets = getCorpusSnippets("javascript");
      const snippet = snippets[seed % Math.max(1, snippets.length)] ?? snippets[0]!;
      return { id: `BASELINE-${snippet.id}-${seed}`, text: snippet.text };
    }
  }
}

/** Total typing time across the five segments. */
export const BASELINE_PROGRAMMER_SECONDS = BASELINE_SEGMENTS.reduce((n, s) => n + s.seconds, 0);
