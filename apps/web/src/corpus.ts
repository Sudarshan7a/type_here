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
  /** Set by the corpus pipeline from the license register's status column. */
  shippable?: boolean;
}

function matchesFamily(item: unknown, family: string, kindPrefix: string): item is CorpusItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    obj.family === family &&
    typeof obj.kind === "string" &&
    obj.kind.startsWith(kindPrefix) &&
    // The licence gate's own flag: an item that has not passed its review is
    // not practice content, however good it looks. The app therefore offers
    // only what the register clears, and never invents a review of its own.
    obj.shippable === true &&
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

function isCodeItem(item: unknown): item is CorpusItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    obj.family === "CODE" &&
    // The licence gate's own flag, exactly as for prose: a snippet that has not
    // cleared its review is not practice content.
    obj.shippable === true &&
    typeof obj.text === "string" &&
    obj.text.length > 0 &&
    typeof obj.id === "string" &&
    typeof obj.language === "string"
  );
}

/** A code snippet as the app offers it (MOD-03). Display-only, never executed. */
export interface Snippet {
  id: string;
  /** The engine's language profile id: `javascript` or `python` today. */
  language: string;
  text: string;
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
 * MOD-03: the shippable code snippets, optionally for one language.
 *
 * Snippet text is never executed (AGENTS.md rule 5). The typing surface paints
 * it one character element at a time and never sets innerHTML, so a snippet
 * that happens to contain markup is text on screen — not a node the browser
 * would parse. That is the sanitisation: there is no HTML path to sanitise.
 */
export function getCorpusSnippets(language?: string): Snippet[] {
  const all = (items.filter(isCodeItem) as CorpusItem[]).map((item) => ({
    id: item.id,
    language: item.language,
    text: item.text,
  }));
  return language === undefined ? all : all.filter((s) => s.language === language);
}

/** The languages MOD-03 can offer today, in the engine's profile order. */
export function getSnippetLanguages(): string[] {
  const seen = new Set<string>();
  for (const s of getCorpusSnippets()) seen.add(s.language);
  return [...seen].sort();
}

/**
 * The COMPUTED difficulty band (CNT-02) of one item, or null when the corpus
 * has no such item. The band is the engine's, never the source document's
 * declared tag: a passage can be declared Easy and still be computed Typical,
 * and the picker and the results screen show what the engine reports so they
 * cannot disagree with each other.
 */
export function bandFor(id: string): Difficulty | null {
  const item = items.find((i): i is CorpusItem =>
    isProseItem(i) || isQuoteItem(i) ? (i as CorpusItem).id === id : false,
  );
  if (item === undefined) return null;
  return item.difficulty === "easy" || item.difficulty === "typical" || item.difficulty === "hard"
    ? item.difficulty
    : null;
}

/**
 * The content-type tag of one prose item (`prose.everyday`, workplace,
 * technical, relationships, news/explanatory), or null. MOD-02's real-world
 * pool spans every domain the library carries, so a visitor is not silently
 * confined to one register of language.
 */
export function contentTypeFor(id: string): string | null {
  const item = items.find((i): i is CorpusItem => isProseItem(i) && i.id === id);
  return item?.contentType ?? null;
}

/**
 * The prose domains the library carries, in corpus order. MOD-02's real-world
 * pool spans all of them, so a visitor is not confined to one register of
 * language. These are the corpus's own `contentType` values — written from the
 * data, not from the register's prose description of them.
 */
export const PROSE_DOMAINS = [
  "prose.everyday",
  "prose.workplace",
  "prose.technical",
  "prose.relationships",
  "prose.news-explanatory",
  "prose.travel",
] as const;

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
