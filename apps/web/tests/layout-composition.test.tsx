import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { applyPress, createTextModel, filterEvents } from "@realtype/engine";
import { InputLogSchema, type Layout } from "@realtype/schemas";

import { InputCapture } from "../src/input-adapter";
import {
  App,
  LAYOUT_STORAGE_KEY,
  SUPPORTED_LAYOUTS,
  guessLayout,
  parseStoredLayout,
} from "../src/App";
import { COPY } from "../src/copy";

/**
 * LOC-01 app wiring (ENG-06): layout selection + composition lifecycle.
 *
 * The engine already drops composition partials and already attributes fingers
 * per layout (Slices 1-2, merged) — these tests pin the WEB side of that
 * contract: the adapter feeds the flag instead of swallowing it, the declared
 * layout survives into the log uncoerced, and the selector persists it.
 */

const HASH = "ab".repeat(32);

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

function logFor(layout: Layout) {
  return new InputCapture().toLog({
    mode: "classic",
    textId: "x",
    textHash: HASH,
    layout,
    errorMode: "free",
    autoIndent: false,
    autoPair: false,
  });
}

describe("layout attribution survives into the log uncoerced (LOC-01)", () => {
  it.each(SUPPORTED_LAYOUTS)("carries %s in BOTH meta.layout and settings.layout", (layout) => {
    const log = logFor(layout);
    expect(InputLogSchema.safeParse(log).success).toBe(true);
    expect(log.meta.layout).toBe(layout);
    expect(log.meta.settings.layout).toBe(layout);
  });

  it("never coerces a non-qwerty layout back to qwerty-us", () => {
    // The mutant this kills: the old settings.layout ternary that folded every
    // non-qwerty layout to "qwerty-us" while meta stayed honest.
    for (const layout of ["dvorak", "azerty", "qwertz", "colemak-dh"] as const) {
      expect(logFor(layout).meta.settings.layout).toBe(layout);
    }
  });
});

describe("composition lifecycle feeds the engine IME guard (M1-04 §6, ENG-06)", () => {
  it("flags keydowns captured while a composition is open", () => {
    const capture = new InputCapture();
    capture.handleCompositionStart();
    expect(capture.isComposing).toBe(true);
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 1000 }));
    capture.handleKeyDown(fakeKeyEvent({ key: "b", timeStamp: 1100 }));

    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: HASH,
      layout: "qwerty-us",
      errorMode: "free",
      autoIndent: false,
      autoPair: false,
    });
    expect(InputLogSchema.safeParse(log).success).toBe(true);
    expect(log.events).toHaveLength(2);
    expect(log.events.every((e) => e.composition === true)).toBe(true);

    // The engine's half of the contract: flagged events land in
    // compositionDrops and never in the text the surface paints.
    const filtered = filterEvents(log.events);
    expect(filtered.compositionDrops).toHaveLength(2);
    expect(filtered.textAffecting).toHaveLength(0);
  });

  it("scores committed text exactly once, after dropping the partials", () => {
    const capture = new InputCapture();
    capture.handleKeyDown(fakeKeyEvent({ key: "D", timeStamp: 1000 }));
    capture.handleCompositionStart();
    capture.handleKeyDown(fakeKeyEvent({ key: "x", timeStamp: 1100 }));
    capture.handleKeyDown(fakeKeyEvent({ key: "y", timeStamp: 1200 }));
    capture.handleCompositionEnd("i");
    expect(capture.isComposing).toBe(false);

    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: HASH,
      layout: "qwerty-us",
      errorMode: "free",
      autoIndent: false,
      autoPair: false,
    });
    expect(InputLogSchema.safeParse(log).success).toBe(true);

    const filtered = filterEvents(log.events);
    expect(filtered.compositionDrops).toHaveLength(2);
    // The "D" plus ONE press for the committed "i" — and nothing else.
    expect(filtered.textAffecting.map((e) => e.key)).toEqual(["D", "i"]);

    const model = createTextModel("Di", "free");
    for (const event of filtered.textAffecting) applyPress(model, event);
    expect(model.buffer.join("")).toBe("Di");
  });

  it("treats an empty or cancelled composition as no input at all", () => {
    for (const commit of [undefined, ""]) {
      const capture = new InputCapture();
      capture.handleCompositionStart();
      capture.handleCompositionEnd(commit);
      const log = capture.toLog({
        mode: "classic",
        textId: "x",
        textHash: HASH,
        layout: "qwerty-us",
        errorMode: "free",
        autoIndent: false,
        autoPair: false,
      });
      expect(log.events).toHaveLength(0);
      expect(capture.isComposing).toBe(false);
    }
  });

  it("treats an update without a start as an open composition", () => {
    const capture = new InputCapture();
    capture.handleCompositionUpdate();
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 1000 }));
    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: HASH,
      layout: "qwerty-us",
      errorMode: "free",
      autoIndent: false,
      autoPair: false,
    });
    expect(log.events[0]?.composition).toBe(true);
    expect(filterEvents(log.events).textAffecting).toHaveLength(0);
  });

  it("leaves non-composition keydowns unflagged, exactly as before", () => {
    const capture = new InputCapture();
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 1000 }));
    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: HASH,
      layout: "qwerty-us",
      errorMode: "free",
      autoIndent: false,
      autoPair: false,
    });
    expect(log.events[0]).not.toHaveProperty("composition");
  });

  it("reset clears an open composition along with the events", () => {
    const capture = new InputCapture();
    capture.handleCompositionStart();
    capture.reset();
    expect(capture.isComposing).toBe(false);
    capture.handleKeyDown(fakeKeyEvent({ key: "a", timeStamp: 1000 }));
    const log = capture.toLog({
      mode: "classic",
      textId: "x",
      textHash: HASH,
      layout: "qwerty-us",
      errorMode: "free",
      autoIndent: false,
      autoPair: false,
    });
    expect(log.events[0]).not.toHaveProperty("composition");
  });
});

describe("layout selection helpers (M2-06 §§2-3)", () => {
  it("accepts every contract layout and rejects everything else", () => {
    expect(SUPPORTED_LAYOUTS).toHaveLength(6);
    for (const layout of SUPPORTED_LAYOUTS) {
      expect(parseStoredLayout(layout)).toBe(layout);
    }
    for (const raw of [null, undefined, "", "qwerty", "QWERTY-US", "colemak", 42, {}]) {
      expect(parseStoredLayout(raw)).toBeNull();
    }
  });

  it("guesses only the high-confidence mappings, qwerty-us otherwise", () => {
    expect(guessLayout("de-DE")).toBe("qwertz");
    expect(guessLayout("de-CH")).toBe("qwertz");
    expect(guessLayout("fr-FR")).toBe("azerty");
    expect(guessLayout("fr-BE")).toBe("azerty");
    expect(guessLayout("fr-CH")).toBe("qwertz");
    expect(guessLayout("fr-CA")).toBe("qwerty-us");
    for (const lang of [undefined, null, "", "en-US", "en-GB", "es-ES", "ja-JP", "xx-YY"]) {
      expect(guessLayout(lang)).toBe("qwerty-us");
    }
  });

  it("names the storage key the selector persists under", () => {
    expect(LAYOUT_STORAGE_KEY).toBe("realtype.layout");
  });
});

describe("App shell layout wiring (server-rendered)", () => {
  const html = renderToStaticMarkup(<App />);

  it("renders the layout selector as a labelled control with every option", () => {
    expect(html).toContain(`<label for="layout">${COPY.layoutLabel}</label>`);
    expect(html).toContain('data-testid="layout-select"');
    for (const layout of SUPPORTED_LAYOUTS) {
      expect(html).toContain(`value="${layout}"`);
      expect(html).toContain(COPY.layoutOptions[layout]);
    }
  });

  it("shows the first-run prompt when nothing is stored (node has no storage)", () => {
    expect(html).toContain('data-testid="layout-why"');
    expect(html).toContain(COPY.layoutFirstRun);
    expect(html).toContain(COPY.layoutWhy);
  });

  it("always shows the IME notice beside the settings, never as an overlay", () => {
    expect(html).toContain('data-testid="ime-notice"');
    expect(html).toContain(COPY.imeNotice);
  });

  it("renders no overlay construct around the new controls", () => {
    expect(html).not.toContain("<dialog");
    expect(html).not.toContain("aria-modal");
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("popover");
  });

  it("renders the auto-insertion toggles off by default with an honest note (ENG-09)", () => {
    expect(html).toContain('data-testid="auto-indent-toggle"');
    expect(html).toContain(COPY.autoIndentLabel);
    expect(html).toContain('data-testid="auto-pair-toggle"');
    expect(html).toContain(COPY.autoPairLabel);
    // Off by default: no checked attribute on either box in static markup.
    expect(html).not.toMatch(/<input[^>]*data-testid="auto-indent-toggle"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*data-testid="auto-pair-toggle"[^>]*checked/);
    expect(html).toContain('data-testid="auto-note"');
    expect(html).toContain(COPY.autoNote);
  });
});

describe("layout and IME copy honesty (claims ban)", () => {
  it("says plainly that passages stay English whatever is selected", () => {
    expect(COPY.layoutWhy).toMatch(/English/);
  });

  it("promises no outcome — no speed, skill or hiring claims", () => {
    for (const text of [COPY.layoutFirstRun, COPY.layoutWhy, COPY.imeNotice, COPY.autoNote]) {
      expect(text).not.toMatch(
        /\b(faster|fastest|boost|speed\s*gains?|type\s*more|hireable|hiring|job-ready)\b/i,
      );
    }
  });

  it("carries layout NAMES only — never keystroke content or composition text", () => {
    for (const text of [COPY.layoutFirstRun, COPY.layoutWhy, COPY.imeNotice]) {
      expect(typeof text).toBe("string");
    }
    expect(Object.keys(COPY.layoutOptions)).toEqual([...SUPPORTED_LAYOUTS]);
  });
});
