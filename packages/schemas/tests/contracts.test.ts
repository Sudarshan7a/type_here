import { describe, expect, it } from "vitest";

import {
  KeyEventSchema,
  ResultSummarySchema,
  SessionSchema,
  TypingSettingsSchema,
  TypingTextSchema,
  InputLogSchema,
} from "../src/index";

export const validKeyEvent = {
  code: "KeyA",
  key: "a",
  type: "down" as const,
  t: 123.4,
  mods: { shift: false, ctrl: false, alt: false, meta: false },
  repeat: false,
  isTrusted: true,
  auto: false,
};

export const validSettings = {
  errorMode: "free" as const,
  autoIndent: false,
  autoPair: false,
  layout: "qwerty-us" as const,
};

export const validText = { id: "prose-0001", text: "the cat sat on the mat" };

export const validLog = {
  events: [
    validKeyEvent,
    { ...validKeyEvent, type: "up" as const, t: 150.2 },
    { ...validKeyEvent, code: "Space", key: " ", type: "down" as const, t: 180 },
  ],
  meta: {
    mode: "classic" as const,
    textId: "prose-0001",
    textHash: "a".repeat(64),
    layout: "qwerty-us",
    settings: validSettings,
    engineVersion: "0.0.1",
    sessionId: "sess-1",
  },
};

export const validResult = {
  rawWpm: 60.123456,
  grossWpm: 58.1,
  netWpm: 57.9,
  keystrokeAccuracy: 97.5,
  finalAccuracy: 100,
  kspc: 1.03,
  rolloverRatio: 0.12,
  consistency: 88.2,
  burstWpm: 74.5,
  ikiMeanMs: 142.85,
  modelVersion: "0.0.1",
  difficultyBand: "typical" as const,
  verified: false,
  flags: [],
};

export const validSession = {
  id: "sess-1",
  seed: "seed-abc",
  nonce: "nonce-def",
  textHash: "a".repeat(64),
  expiresAt: "2026-10-05T12:00:00.000Z",
};

describe("M1-01 contracts: valid samples parse", () => {
  it("KeyEvent", () => {
    expect(KeyEventSchema.parse(validKeyEvent)).toEqual(validKeyEvent);
  });
  it("TypingText", () => {
    expect(TypingTextSchema.parse(validText)).toEqual(validText);
  });
  it("TypingSettings", () => {
    expect(TypingSettingsSchema.parse(validSettings)).toEqual(validSettings);
  });
  it("InputLog", () => {
    const parsed = InputLogSchema.parse(validLog);
    expect(parsed.events).toHaveLength(3);
    expect(parsed.meta.textHash).toHaveLength(64);
  });
  it("InputLog without optional sessionId", () => {
    const { mode, textId, textHash, layout, settings, engineVersion } = validLog.meta;
    const parsed = InputLogSchema.parse({
      events: validLog.events,
      meta: { mode, textId, textHash, layout, settings, engineVersion },
    });
    expect(parsed.meta.sessionId).toBeUndefined();
  });
  it("ResultSummary", () => {
    expect(ResultSummarySchema.parse(validResult)).toEqual(validResult);
  });
  it("ResultSummary with null consistency/IKI/band (short tests, code text)", () => {
    expect(
      ResultSummarySchema.parse({
        ...validResult,
        consistency: null,
        ikiMeanMs: null,
        difficultyBand: null,
      }),
    ).toBeTruthy();
  });
  it("Session", () => {
    expect(SessionSchema.parse(validSession)).toEqual(validSession);
  });
});

describe("M1-01 contracts: unknown fields are rejected on every schema", () => {
  const cases: [
    name: string,
    schema: { safeParse: (x: unknown) => { success: boolean } },
    sample: unknown,
    evil: string,
  ][] = [
    ["KeyEvent", KeyEventSchema, validKeyEvent, "evil"],
    ["TypingText", TypingTextSchema, validText, "evil"],
    ["TypingSettings", TypingSettingsSchema, validSettings, "evil"],
    ["InputLog", InputLogSchema, validLog, "evil"],
    ["InputLog.meta (nested)", InputLogSchema, validLog, "meta"],
    ["ResultSummary", ResultSummarySchema, validResult, "evil"],
    ["Session", SessionSchema, validSession, "evil"],
  ];

  for (const [name, schema, sample, evil] of cases) {
    it(name, () => {
      const bad =
        evil === "meta"
          ? { ...(sample as object), meta: { ...(sample as { meta: object }).meta, extra: 1 } }
          : { ...(sample as object), extra: 1 };
      expect(schema.safeParse(bad).success).toBe(false);
    });
  }

  it("KeyEvent.mods (nested strict)", () => {
    const bad = { ...validKeyEvent, mods: { ...validKeyEvent.mods, extra: true } };
    expect(KeyEventSchema.safeParse(bad).success).toBe(false);
  });

  it("baseline sanity: the unmodified samples pass (guards against a broken strict mode)", () => {
    expect(KeyEventSchema.safeParse(validKeyEvent).success).toBe(true);
    expect(TypingTextSchema.safeParse(validText).success).toBe(true);
    expect(TypingSettingsSchema.safeParse(validSettings).success).toBe(true);
    expect(InputLogSchema.safeParse(validLog).success).toBe(true);
    expect(ResultSummarySchema.safeParse(validResult).success).toBe(true);
    expect(SessionSchema.safeParse(validSession).success).toBe(true);
  });
});
