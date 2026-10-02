import { describe, expect, it } from "vitest";

import { CaretStyleSchema, ErrorModeSchema, LayoutSchema, ModeSchema } from "@realtype/schemas";

import { ERROR_MODES, LAYOUTS, MODES, SETTING_NAMES, SETTING_VALUES } from "../src/events";

// The telemetry allowlists restate values that already have a single source of
// truth in @realtype/schemas. Restating is necessary — telemetry must never log
// a value outside its allowlist — but a hand-copied list drifts silently. It
// already did once: `no-backspace` and `word-locked` were added to the contract
// in 1.3.0 and this file still carried only three modes.
//
// These tests fail the moment the copies disagree, in either direction.

describe("ERROR_MODES", () => {
  it("is exactly the schemas errorMode enum, in the same order", () => {
    expect(ERROR_MODES).toEqual([...ErrorModeSchema.options]);
  });
});

describe("SETTING_VALUES", () => {
  it("includes every error mode", () => {
    // SETTING_VALUES is the union of everything any setting may take, so it
    // must be a superset of ERROR_MODES. The exact ERROR_MODES list is pinned
    // by the test above; this one catches a mode dropped from the union, which
    // would make a legitimate settings event fail at runtime.
    for (const mode of ERROR_MODES) {
      expect(SETTING_VALUES).toContain(mode);
    }
  });
});

describe("MODES", () => {
  it("is exactly the schemas ModeSchema enum, in the same order", () => {
    expect(MODES).toEqual([...ModeSchema.options]);
  });
});

describe("LAYOUTS", () => {
  it("is exactly the schemas LayoutSchema enum, in the same order", () => {
    expect(LAYOUTS).toEqual([...LayoutSchema.options]);
  });
});

describe("caret style", () => {
  it("is a superset of the schemas caretStyle enum", () => {
    // Same discipline as ERROR_MODES: the telemetry allowlist is a hand-copied
    // superset, and a value that never reaches it makes a legitimate
    // `setting_changed` event fail at runtime rather than at build time.
    for (const style of CaretStyleSchema.options) {
      expect(SETTING_VALUES).toContain(style);
    }
  });

  it("is nameable as a setting, so the event can carry it", () => {
    expect(SETTING_NAMES).toContain("caret_style");
  });
});
