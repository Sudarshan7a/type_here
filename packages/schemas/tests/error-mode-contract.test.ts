import { describe, expect, it } from "vitest";

import { CONTRACT_VERSION, InputLogSchema, TypingSettingsSchema } from "../src/index";

// CONTRACT_VERSION 1.3.0 — the errorMode enum widened from three values to five
// (`no-backspace` for D03, `word-locked` for D04).
//
// This is an additive minor bump: the three original values keep their exact
// meaning and every log that was valid at 1.2.0 must still be valid. That last
// property is the one worth pinning, because a `z.enum` widening is exactly the
// kind of change that silently breaks stored data if it is done by replacement
// rather than by extension.

const LEGACY_MODES = ["free", "must-correct", "stop-on-error"] as const;
const NEW_MODES = ["no-backspace", "word-locked"] as const;

const baseSettings = {
  autoIndent: false,
  autoPair: false,
  layout: "qwerty-us" as const,
};

const logWithErrorMode = (errorMode: string) => ({
  events: [
    {
      code: "KeyA",
      key: "a",
      type: "down" as const,
      t: 1,
      mods: { shift: false, ctrl: false, alt: false, meta: false },
      repeat: false,
      isTrusted: true,
      auto: false,
    },
  ],
  meta: {
    mode: "classic" as const,
    textId: "prose-0001",
    textHash: "a".repeat(64),
    layout: "qwerty-us",
    settings: { ...baseSettings, errorMode },
    engineVersion: "1.2.0",
    sessionId: "sess-1",
  },
});

describe("CONTRACT_VERSION", () => {
  it("is 1.3.0 — a minor bump for an additive enum extension", () => {
    expect(CONTRACT_VERSION).toBe("1.3.0");
  });
});

describe("errorMode enum", () => {
  it.each([...LEGACY_MODES, ...NEW_MODES])("accepts %s", (mode) => {
    expect(TypingSettingsSchema.safeParse({ ...baseSettings, errorMode: mode }).success).toBe(true);
  });

  it("rejects an unknown mode rather than accepting any string", () => {
    expect(TypingSettingsSchema.safeParse({ ...baseSettings, errorMode: "turbo" }).success).toBe(
      false,
    );
  });

  it("accepts every mode inside a full InputLog, not only in bare settings", () => {
    for (const mode of [...LEGACY_MODES, ...NEW_MODES]) {
      const result = InputLogSchema.safeParse(logWithErrorMode(mode));
      expect(result.success, `${mode} should validate: ${JSON.stringify(result)}`).toBe(true);
    }
  });
});

describe("backward compatibility with 1.2.0 logs", () => {
  // The reason this bump is minor rather than major. A stored log produced
  // under 1.2.0 carries one of the three original modes; a reader on 1.3.0 must
  // still accept it unchanged. If a future change ever renames or removes a
  // value, this test is what should fail first.
  it.each(LEGACY_MODES)("a 1.2.0 log with errorMode %s still parses", (mode) => {
    const result = InputLogSchema.safeParse(logWithErrorMode(mode));
    expect(result.success, `${mode} should still parse: ${JSON.stringify(result)}`).toBe(true);
  });

  it("a 1.2.0 log validates byte-for-byte identically after the bump", () => {
    // Parsing must not silently coerce or drop the settings block.
    const parsed = InputLogSchema.parse(logWithErrorMode("must-correct"));
    expect(parsed.meta.settings.errorMode).toBe("must-correct");
    expect(parsed.meta.settings.layout).toBe("qwerty-us");
    expect(parsed.meta.settings.autoIndent).toBe(false);
    expect(parsed.meta.settings.autoPair).toBe(false);
  });

  it("an engineVersion of 1.2.0 is still accepted (the bump is not a floor)", () => {
    const parsed = InputLogSchema.safeParse(logWithErrorMode("free"));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.meta.engineVersion).toBe("1.2.0");
  });
});
