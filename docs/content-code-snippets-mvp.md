# Content Library — Code Snippets, MVP set

**Sourcing:** 100% original, written for this product. License: `original work — ours`. No attribution required.
**Purpose:** MOD-03's starter code content, as *structured snippets* a developer would actually recognise.

## Scope, stated honestly

The master spec's MOD-03 names **five** initial languages: JavaScript/TypeScript, Python, Java, SQL, HTML/CSS. **This file ships two.**

The engine's language profiles (`packages/engine/src/language-profiles.ts`) currently carry `javascript`, `python` and `generic` — and the snippet gate re-lexes every record through that token map, refusing any snippet whose language it cannot resolve. JavaScript/TypeScript share one pack upstream (the roadmap lists "JS/TS" as a single language), so both are declared `javascript`.

Java, SQL and HTML/CSS snippets **are not here yet**, and writing them would fail the gate honestly: the gate would reject them for an unresolvable language, exactly as it must. They wait on the engine's remaining language packs (PRG-02), not on content effort. They are recorded here so the gap is visible rather than silently absent.

**Two rules the snippets that ARE here are written to:**

1. **Nothing here executes.** They are display-only text (AGENTS.md rule 5). No fetch, no `eval`, no `new Function`, no dynamic import, no shell-out. The point is a realistic surface to *type*, and a snippet that could run is a snippet that could run *by accident*.
2. **Every one tokenizes cleanly** through the engine's authoritative language profile — the gate proves it, not this document.

Sentence and line lengths follow the typability model's comfort band for the declared difficulty. `Token mix` lists the token classes each snippet exercises, which is what the drill generator levels against.

---

## JavaScript / TypeScript

`CODE-TS-001` · Difficulty: Easy · Token mix: keywords, identifiers, brackets, operators
```typescript
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
```

`CODE-TS-002` · Difficulty: Typical · Token mix: keywords, types, strings, operators
```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export async function load<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return { ok: false, error: `status ${response.status}` };
    return { ok: true, value: (await response.json()) as T };
  } catch (cause) {
    return { ok: false, error: String(cause) };
  }
}
```

`CODE-TS-003` · Difficulty: Typical · Token mix: keywords, identifiers, brackets, strings
```typescript
export class Counter {
  private total = 0;

  increment(by = 1): number {
    this.total += by;
    return this.total;
  }

  get value(): number {
    return this.total;
  }
}
```

---

## Python

`CODE-PY-001` · Difficulty: Easy · Token mix: keywords, identifiers, numbers
```python
def clamp(value, low, high):
    if value < low:
        return low
    if value > high:
        return high
    return value
```

`CODE-PY-002` · Difficulty: Typical · Token mix: keywords, identifiers, strings, brackets
```python
def read_rows(path):
    rows = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            text = line.strip()
            if text and not text.startswith("#"):
                rows.append(text.split(","))
    return rows
```

`CODE-PY-003` · Difficulty: Typical · Token mix: keywords, identifiers, numbers, brackets
```python
class Budget:
    def __init__(self, total):
        self.total = total
        self.spent = 0

    def charge(self, amount):
        if self.spent + amount > self.total:
            raise ValueError("over budget")
        self.spent += amount
        return self.total - self.spent
```
