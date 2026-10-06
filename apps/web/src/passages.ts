/**
 * A few original prose passages from the RealType prose library
 * (content-prose-batch-01.md, "original work — ours"), used by the manual
 * engine test surface only. The full content pipeline lands in Phase 2.
 */
export interface Passage {
  id: string;
  text: string;
}

export const PASSAGES: Passage[] = [
  {
    id: "PROSE-01-004",
    text: "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.",
  },
  {
    id: "PROSE-01-001",
    text: "Can you pick up milk on your way home? We're also out of bread and there's barely any coffee left in the jar.",
  },
  {
    id: "PROSE-01-008",
    text: "Happy birthday! I hope your day is full of good food, better company, and at least one nap.",
  },
  {
    id: "PROSE-01-002",
    text: "The weather turned cold overnight, so I dug out my winter coat this morning and found a five-dollar bill in the pocket.",
  },
];

/**
 * A human-readable label for the passage picker. The id (`PROSE-01-004`) is
 * what the log records and what the option value carries; the label is what a
 * reader scans. First words up to 34 characters, cut at the last space, with
 * an ellipsis — deterministic and pure, so the picker cannot disagree with
 * itself between renders.
 */
export function passageLabel(passage: Passage): string {
  const text = passage.text.trim();
  if (text.length <= 34) return text;
  const cut = text.slice(0, 34);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * textHash must be a 64-char lowercase hex string (the InputLog contract).
 * The recorder used an FNV-1a placeholder for the same offline reason: the
 * real sha-256 comes from the content pipeline, which does not exist yet.
 */
export function placeholderHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").repeat(8);
}
