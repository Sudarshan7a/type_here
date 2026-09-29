import { describe, expect, it } from "vitest";

import {
  InputLogSchema,
  KeyEventSchema,
  LIMITS,
  ResultSummarySchema,
  TypingTextSchema,
} from "../src/index";

import { validKeyEvent, validLog, validResult, validText } from "./contracts.test";

function events(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    ...validKeyEvent,
    type: (i % 2 === 0 ? "down" : "up") as "down" | "up",
    t: i * 50,
  }));
}

describe("M1-01 contracts: limit boundaries", () => {
  it(`events at exactly ${LIMITS.maxEventsPerLog} pass`, () => {
    const log = { ...validLog, events: events(LIMITS.maxEventsPerLog) };
    expect(InputLogSchema.safeParse(log).success).toBe(true);
  });

  it(`events at ${LIMITS.maxEventsPerLog + 1} fail`, () => {
    const log = { ...validLog, events: events(LIMITS.maxEventsPerLog + 1) };
    expect(InputLogSchema.safeParse(log).success).toBe(false);
  });

  it(`text at exactly ${LIMITS.maxTextLength} characters passes`, () => {
    const text = { ...validText, text: "a".repeat(LIMITS.maxTextLength) };
    expect(TypingTextSchema.safeParse(text).success).toBe(true);
  });

  it(`text at ${LIMITS.maxTextLength + 1} characters fails`, () => {
    const text = { ...validText, text: "a".repeat(LIMITS.maxTextLength + 1) };
    expect(TypingTextSchema.safeParse(text).success).toBe(false);
  });

  it("empty text fails (min 1)", () => {
    expect(TypingTextSchema.safeParse({ ...validText, text: "" }).success).toBe(false);
  });
});

describe("M1-01 contracts: timestamps and numbers", () => {
  it("t = 0 passes (first accepted keystroke)", () => {
    expect(KeyEventSchema.safeParse({ ...validKeyEvent, t: 0 }).success).toBe(true);
  });

  it("negative t fails", () => {
    expect(KeyEventSchema.safeParse({ ...validKeyEvent, t: -0.001 }).success).toBe(false);
  });

  it("NaN t fails", () => {
    expect(KeyEventSchema.safeParse({ ...validKeyEvent, t: Number.NaN }).success).toBe(false);
  });

  it("Infinity t fails", () => {
    expect(
      KeyEventSchema.safeParse({ ...validKeyEvent, t: Number.POSITIVE_INFINITY }).success,
    ).toBe(false);
  });

  it("NaN metrics fail", () => {
    for (const field of [
      "rawWpm",
      "netWpm",
      "keystrokeAccuracy",
      "kspc",
      "rolloverRatio",
      "burstWpm",
    ]) {
      const bad = { ...validResult, [field]: Number.NaN };
      expect(ResultSummarySchema.safeParse(bad).success, `${field} accepts NaN`).toBe(false);
    }
  });

  it("Infinity metrics fail", () => {
    const bad = { ...validResult, grossWpm: Number.POSITIVE_INFINITY };
    expect(ResultSummarySchema.safeParse(bad).success).toBe(false);
  });

  it("metrics out of their ranges fail (accuracy > 100, negative wpm, rollover > 1)", () => {
    expect(
      ResultSummarySchema.safeParse({ ...validResult, keystrokeAccuracy: 100.5 }).success,
    ).toBe(false);
    expect(ResultSummarySchema.safeParse({ ...validResult, rawWpm: -1 }).success).toBe(false);
    expect(ResultSummarySchema.safeParse({ ...validResult, rolloverRatio: 1.01 }).success).toBe(
      false,
    );
  });
});
