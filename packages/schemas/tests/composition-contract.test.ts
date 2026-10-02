import { describe, expect, it } from "vitest";

import { InputLogSchema, KeyEventSchema } from "../src/index";

// CONTRACT_VERSION 1.4.0 — KeyEvent gained the optional `composition` flag for
// IME partials (M1-04 §6, ENG-06).
//
// This is an additive minor bump by the same precedent as 1.0.0 → 1.2.0
// (optional `markers` + optional `meta.recorder`, see docs/pr-log/s2-b2-recorder.md):
// an OPTIONAL field keeps every previously valid log parsing byte-identical,
// so the bump is minor, not major. The properties worth pinning are (a) a
// 1.3.0 event without the field still parses and is not coerced, and (b) the
// field, when present, is strictly boolean.

const NO_MODS = { shift: false, ctrl: false, alt: false, meta: false } as const;

const eventWithoutComposition = {
  code: "KeyA",
  key: "a",
  type: "down" as const,
  t: 1,
  mods: { ...NO_MODS },
  repeat: false,
  isTrusted: true,
  auto: false,
};

const logWithEvents = (events: unknown[]) => ({
  events,
  meta: {
    mode: "classic" as const,
    textId: "prose-0001",
    textHash: "a".repeat(64),
    layout: "qwerty-us",
    settings: { errorMode: "free", autoIndent: false, autoPair: false, layout: "qwerty-us" },
    engineVersion: "1.3.0",
    sessionId: "sess-1",
  },
});

describe("composition flag", () => {
  it("accepts an event without the field (1.3.0 shape)", () => {
    expect(KeyEventSchema.safeParse(eventWithoutComposition).success).toBe(true);
  });

  it("accepts composition true (IME partial) and false (committed text)", () => {
    expect(
      KeyEventSchema.safeParse({ ...eventWithoutComposition, composition: true }).success,
    ).toBe(true);
    expect(
      KeyEventSchema.safeParse({ ...eventWithoutComposition, composition: false }).success,
    ).toBe(true);
  });

  it("rejects a non-boolean composition flag rather than coercing it", () => {
    expect(
      KeyEventSchema.safeParse({ ...eventWithoutComposition, composition: "yes" }).success,
    ).toBe(false);
  });

  it("accepts composition events inside a full InputLog, not only bare", () => {
    const result = InputLogSchema.safeParse(
      logWithEvents([
        { ...eventWithoutComposition, composition: true },
        { ...eventWithoutComposition, composition: false },
      ]),
    );
    expect(result.success, `should validate: ${JSON.stringify(result)}`).toBe(true);
  });
});

describe("backward compatibility with 1.3.0 logs", () => {
  // The reason this bump is minor rather than major. A stored event produced
  // under 1.3.0 carries no `composition` field; a reader on 1.4.0 must still
  // accept it unchanged and must not silently fill the field in.
  it("a 1.3.0 event still parses with the field absent, not defaulted", () => {
    const parsed = KeyEventSchema.parse(eventWithoutComposition);
    expect(parsed.composition).toBeUndefined();
    expect(parsed).toEqual(eventWithoutComposition);
  });

  it("a 1.3.0 log validates byte-for-byte identically after the bump", () => {
    const parsed = InputLogSchema.parse(logWithEvents([eventWithoutComposition]));
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]).toEqual(eventWithoutComposition);
  });
});
