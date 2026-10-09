import corpusData from "../../../content/corpus.json";
import type { Passage } from "./passages";

export type Difficulty = "easy" | "typical" | "hard";

interface CorpusItem {
  id: string;
  family: string;
  kind: string;
  text: string;
  language: string;
  contentType: string;
  difficulty: string;
  wordCount: number;
}

function matchesFamily(item: unknown, family: string, kindPrefix: string): item is CorpusItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    obj.family === family &&
    typeof obj.kind === "string" &&
    obj.kind.startsWith(kindPrefix) &&
    obj.language === "en" &&
    typeof obj.text === "string" &&
    obj.text.length > 0 &&
    typeof obj.difficulty === "string" &&
    typeof obj.id === "string"
  );
}

function isProseItem(item: unknown): item is CorpusItem {
  return matchesFamily(item, "PROSE", "prose");
}

function isQuoteItem(item: unknown): item is CorpusItem {
  // Quote-original and quote-public-domain both live under QUOTE.
  return matchesFamily(item, "QUOTE", "quote");
}

// Cast items to unknown[] to avoid strict union type from JSON import
const items = corpusData.items as unknown[];

export function getCorpusPassages(difficulty?: Difficulty): Passage[] {
  const proseItems = items.filter(isProseItem) as CorpusItem[];

  const filtered = difficulty ? proseItems.filter((p) => p.difficulty === difficulty) : proseItems;

  return filtered.map((item) => ({ id: item.id, text: item.text }));
}

export function getCorpusQuotes(): Passage[] {
  return (items.filter(isQuoteItem) as CorpusItem[]).map((item) => ({
    id: item.id,
    text: item.text,
  }));
}

export function getAvailableDifficulties(): Difficulty[] {
  return ["easy", "typical", "hard"];
}

/**
 * Truncate a passage to the first `count` whitespace-separated words.
 * Deterministic and pure: the same passage and count always produce the
 * same target text, so a run is reproducible.
 */
export function truncateToWords(text: string, count: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (count <= 0 || count >= words.length) return text;
  return words.slice(0, count).join(" ");
}
