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

function isProseItem(item: unknown): item is CorpusItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    obj.family === "PROSE" &&
    obj.kind === "prose" &&
    obj.language === "en" &&
    typeof obj.text === "string" &&
    obj.text.length > 0 &&
    typeof obj.difficulty === "string" &&
    typeof obj.id === "string"
  );
}

// Cast items to unknown[] to avoid strict union type from JSON import
const items = corpusData.items as unknown[];

export function getCorpusPassages(difficulty?: Difficulty): Passage[] {
  const proseItems = items.filter(isProseItem) as CorpusItem[];

  const filtered = difficulty ? proseItems.filter((p) => p.difficulty === difficulty) : proseItems;

  return filtered.map((item) => ({ id: item.id, text: item.text }));
}

export function getAvailableDifficulties(): Difficulty[] {
  return ["easy", "typical", "hard"];
}
