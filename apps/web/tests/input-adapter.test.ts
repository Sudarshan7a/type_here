import { describe, expect, it } from "vitest";
import { InputLogSchema } from "@realtype/schemas";

import { InputCapture } from "../src/input-adapter";

/**
 * M0/M1 input adapter: browser keyboard events -> a contract-valid InputLog.
 * These are the tests that let the web surface stay a thin renderer: the
 * adapter is the only place that knows about DOM events.
 */

function fakeKeyEvent(init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    code: init.code ?? `Key${init.key.toUpperCase()}`,
    key: init.key,
    type: init.type ?? "keydown",
    timeStamp: init.timeStamp ?? 0,
    shiftKey: init.shiftKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    altKey: init.altKey ?? false,
    metaKey: init.metaKey ?? false,
    repeat: init.repeat ?? false,
    isTrusted: init.isTrusted ?? true,
  } as unknown as KeyboardEvent;
}

describe("input adapter produces a contract-valid log", () => {
  it("captures keydown/keyup with relative timestamps and modifiers", () => {
    const capture = new InputCapture();
    capture.handleKeyDown(fakeKeyEvent({ key: "t", timeStamp: 1000 }));
    capture.handleKeyDown(fakeKeyEvent({ key: "h", timeStamp: 1200, shiftKey: true }));
    capture.handleKeyUp(fakeKeyEvent({ key: "t", timeStamp: 1100, type: "keyup" }));

    const log = capture.toLog({
      mode: "classic",
      textId: "prose-01-004",
      textHash: "ab".repeat(32),
      layout: "qwerty-us",
      errorMode: "free",
    });

    expect(InputLogSchema.safeParse(log).success).toBe(true);
    // The FIRST accepted keystroke is the t=0 origin (chapter 4, edge E1):
    // reading the passage before typing must not cost the user speed.
    expect(log.events[0]?.t).toBe(0);
    expect(log.events[1]?.t).toBe(200);
    expect(log.events[1]?.mods.shift).toBe(true);
    expect(log.events[2]?.type).toBe("up");
    expect(log.events[2]?.t).toBe(100);
  });

  it("marks OS key repeat so the engine can drop it (E2 / ENG-FIXTURE-G01)", () => {
    const capture = new InputCapture();
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 0 }));
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 520, repeat: true }));
    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: "ab".repeat(32),
      layout: "qwerty-us",
      errorMode: "free",
    });
    expect(log.events.filter((e) => e.repeat)).toHaveLength(1);
  });

  it("records focus, blur and visibility as markers, not keystrokes", () => {
    const capture = new InputCapture();
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 0 }));
    capture.handleBlur();
    capture.handleVisibilityChange("hidden");
    capture.handleVisibilityChange("visible");
    capture.handleFocus();

    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: "ab".repeat(32),
      layout: "qwerty-us",
      errorMode: "free",
    });
    expect(InputLogSchema.safeParse(log).success).toBe(true);
    expect(log.markers?.map((m) => m.kind)).toEqual(["blur", "visibility", "visibility", "focus"]);
    expect(log.markers?.find((m) => m.kind === "visibility")?.detail).toBe("hidden");
    // Markers are never keystrokes.
    expect(log.events.every((e) => e.type === "down" || e.type === "up")).toBe(true);
  });

  it("marks untrusted (synthetic) events rather than trusting them", () => {
    const capture = new InputCapture();
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 0, isTrusted: false }));
    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: "ab".repeat(32),
      layout: "qwerty-us",
      errorMode: "free",
    });
    expect(log.events[0]?.isTrusted).toBe(false);
  });

  it("rejects an empty capture at the schema level (E9: no data is not 0 WPM)", () => {
    const capture = new InputCapture();
    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: "ab".repeat(32),
      layout: "qwerty-us",
      errorMode: "free",
    });
    // An empty log is still schema-valid; it is the ENGINE that must report
    // "not available" rather than 0 WPM (asserted in eng-edge-robustness).
    expect(InputLogSchema.safeParse(log).success).toBe(true);
    expect(log.events).toHaveLength(0);
  });
});
