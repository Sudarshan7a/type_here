import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  App,
  FOCUS_MODE_STORAGE_KEY,
  SUPPORTED_THEMES,
  SUPPORTED_UI_FONTS,
  THEME_STORAGE_KEY,
  UI_FONT_STORAGE_KEY,
  defaultTheme,
  parseStoredTheme,
  parseStoredUiFont,
} from "../src/App";
import { COPY } from "../src/copy";

/**
 * CUS-02 app wiring: the theme switcher, the interface-face selector and
 * focus mode. Display-only selections — none of them reaches a metric or the
 * log — so what is pinned here is the honest-defaults contract: the page
 * never silently changes what the visitor already sees, persistence is
 * guest-first localStorage, and focus mode never activates on its own.
 */

describe("theme selection helpers", () => {
  it("accepts both shipped palettes and rejects everything else", () => {
    expect(SUPPORTED_THEMES).toEqual(["night-ink", "daylight"]);
    for (const theme of SUPPORTED_THEMES) {
      expect(parseStoredTheme(theme)).toBe(theme);
    }
    for (const raw of [null, undefined, "", "dark", "light", "Night Ink", 42, {}]) {
      expect(parseStoredTheme(raw)).toBeNull();
    }
  });

  it("names the storage key the selector persists under", () => {
    expect(THEME_STORAGE_KEY).toBe("realtype.theme");
  });

  it("defaults to Night Ink where there is no OS to ask (SSR, tests)", () => {
    // Node has no window: the `:root` default.
    expect(defaultTheme()).toBe("night-ink");
  });

  it("matches a light OS rather than silently switching it to dark", () => {
    const realWindow = (globalThis as Record<string, unknown>).window;
    try {
      (globalThis as Record<string, unknown>).window = {
        matchMedia: (query: string) => ({ matches: query.includes("light"), media: query }),
      };
      expect(defaultTheme()).toBe("daylight");
      (globalThis as Record<string, unknown>).window = {
        matchMedia: () => ({ matches: false, media: "" }),
      };
      expect(defaultTheme()).toBe("night-ink");
      (globalThis as Record<string, unknown>).window = {
        matchMedia: () => {
          throw new Error("no media");
        },
      };
      expect(defaultTheme()).toBe("night-ink");
    } finally {
      if (realWindow === undefined) delete (globalThis as Record<string, unknown>).window;
      else (globalThis as Record<string, unknown>).window = realWindow;
    }
  });
});

describe("interface-face selection helpers", () => {
  it("accepts every shipped face and rejects everything else", () => {
    expect(SUPPORTED_UI_FONTS).toEqual(["geist", "system", "atkinson"]);
    for (const face of SUPPORTED_UI_FONTS) {
      expect(parseStoredUiFont(face)).toBe(face);
    }
    for (const raw of [null, undefined, "", "JetBrains Mono", "comic-sans", 42, {}]) {
      expect(parseStoredUiFont(raw)).toBeNull();
    }
  });

  it("names the storage key the selector persists under", () => {
    expect(UI_FONT_STORAGE_KEY).toBe("realtype.uiFont");
  });
});

describe("focus-mode storage key", () => {
  it("persists guest-first under its own key", () => {
    expect(FOCUS_MODE_STORAGE_KEY).toBe("realtype.focusMode");
  });
});

describe("App shell appearance wiring (server-rendered)", () => {
  const html = renderToStaticMarkup(<App />);

  it("renders the theme selector as a labelled control with both palettes", () => {
    expect(html).toContain(`<label for="theme">${COPY.themeLabel}</label>`);
    expect(html).toContain('data-testid="theme-select"');
    for (const theme of SUPPORTED_THEMES) {
      expect(html).toContain(`value="${theme}"`);
      expect(html).toContain(COPY.themeOptions[theme]);
    }
  });

  it("renders the interface-face selector with every option and its note", () => {
    expect(html).toContain(`<label for="ui-font">${COPY.uiFontLabel}</label>`);
    expect(html).toContain('data-testid="ui-font-select"');
    for (const face of SUPPORTED_UI_FONTS) {
      expect(html).toContain(`value="${face}"`);
      expect(html).toContain(COPY.uiFontOptions[face]);
    }
    expect(html).toContain('data-testid="ui-font-note"');
    expect(html).toContain(COPY.uiFontNote);
  });

  it("renders the focus toggle off by default, outside the hidden chrome, with its note", () => {
    // Off by default: never auto-activated (user toggle only, persists).
    expect(html).toContain('data-testid="focus-mode-toggle"');
    expect(html).toContain(COPY.focusModeLabel);
    expect(html).not.toMatch(/<input[^>]*data-testid="focus-mode-toggle"[^>]*checked/);
    // The toggle must NOT sit inside `.controls`: focus mode hides `.controls`,
    // and the way back out must never be among the things hidden.
    const controls = html.slice(html.indexOf('class="controls"'));
    const controlsBlock = controls.slice(0, controls.indexOf("</div>"));
    expect(controlsBlock).not.toContain("focus-mode-toggle");
    expect(html).toContain('data-focus-mode="off"');
    expect(html).toContain('data-testid="focus-mode-note"');
    expect(html).toContain(COPY.focusModeNote);
  });

  it("defaults to the existing defaults — nothing silently switched", () => {
    // Theme: Night Ink selected (the `:root` default) where there is no OS.
    expect(html).toMatch(/<option[^>]*value="night-ink"[^>]*selected/);
    // Interface: Geist selected (the `--font-ui` default).
    expect(html).toMatch(/<option[^>]*value="geist"[^>]*selected/);
  });

  it("renders no interrupting construct around the new controls", () => {
    expect(html).not.toContain("<dialog");
    expect(html).not.toContain("aria-modal");
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("popover");
  });
});

describe("appearance copy honesty (claims ban)", () => {
  it("promises no outcome — no speed, skill, hiring or readability-cure claims", () => {
    const texts = [
      COPY.themeLabel,
      ...Object.values(COPY.themeOptions),
      COPY.uiFontLabel,
      ...Object.values(COPY.uiFontOptions),
      COPY.uiFontNote,
      COPY.focusModeLabel,
      COPY.focusModeNote,
    ];
    for (const text of texts) {
      expect(text).not.toMatch(
        /\b(faster|fastest|boost|speed\s*gains?|type\s*more|hireable|hiring|job-ready|helps?\s+dyslexia|dyslexia-friendly|cure|treats?|fix\s+your\s+reading)\b/i,
      );
    }
  });

  it("says plainly that the typing face never changes with the interface face", () => {
    expect(COPY.uiFontNote).toMatch(/JetBrains Mono/);
  });

  it("says plainly what stays usable in focus mode", () => {
    expect(COPY.focusModeNote).toMatch(/replay/);
  });
});
