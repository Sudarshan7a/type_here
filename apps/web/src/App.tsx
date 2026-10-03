/**
 * The RealType app shell.
 *
 * Deliberately thin: it owns which passage is loaded and nothing else. Every
 * decision about the test itself — character states, metrics, error modes, the
 * clock — belongs to packages/engine, and the surface is the only thing that
 * talks to it.
 */
import { useCallback, useEffect, useState } from "react";
import type { ErrorMode } from "@realtype/engine";
import { LayoutSchema, type CaretStyle, type Layout } from "@realtype/schemas";

import { COPY } from "./copy";

import { TypingSurface } from "./TypingSurface";
import { PASSAGES, type Passage } from "./passages";

/** localStorage key for the layout override (LOC-01, M2-06 §2). */
export const LAYOUT_STORAGE_KEY = "realtype.layout";

/** The six contract layouts, in roadmap build order (decision log D-log). */
export const SUPPORTED_LAYOUTS: readonly Layout[] = [
  "qwerty-us",
  "qwerty-uk",
  "dvorak",
  "colemak-dh",
  "azerty",
  "qwertz",
];

/**
 * Parse a stored layout value. Unknown or corrupt values are ignored (M2-05
 * §3): a bad stored string falls back to the guess, never to a crash.
 */
export function parseStoredLayout(raw: unknown): Layout | null {
  const parsed = LayoutSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Cautious first-run guess from the browser language (M2-06 §3): a couple of
 * high-confidence mappings, everything else falls back to qwerty-us. The guess
 * is labelled as a guess in the UI and the override beside it is always
 * visible — detection is never trusted on its own. Full limits, including
 * ANSI/ISO hardware quirks, are in docs/LAYOUT-VERIFICATION.md.
 */
export function guessLayout(language: string | undefined | null): Layout {
  const lang = (language ?? "").toLowerCase();
  if (/^de([-_]|$)/.test(lang)) return "qwertz";
  if (/^fr([-_]|$)/.test(lang)) {
    if (/^fr-ch\b/.test(lang.replace("_", "-"))) return "qwertz";
    if (/^fr-ca\b/.test(lang.replace("_", "-"))) return "qwerty-us";
    return "azerty";
  }
  return "qwerty-us";
}

/** The browser language, or null outside a browser (SSR, tests). */
function browserLanguage(): string | null {
  if (typeof navigator === "undefined") return null;
  return typeof navigator.language === "string" ? navigator.language : null;
}

/** The persisted override, or null on first run / outside a browser. */
function readStoredLayout(): Layout | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return parseStoredLayout(localStorage.getItem(LAYOUT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persist the override. A storage failure keeps the visit's selection. */
function storeLayout(layout: Layout): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch {
    // Private mode and locked-down storage: the selection still applies.
  }
}

/** Storage keys for the ENG-09 auto-insertion toggles (off by default). */
export const AUTO_INDENT_STORAGE_KEY = "realtype.autoIndent";
export const AUTO_PAIR_STORAGE_KEY = "realtype.autoPair";
/** Read an armed toggle: only the exact string "true" arms it. */
function readStoredToggle(key: string): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

/** Persist a toggle. A storage failure keeps the visit's selection. */
function storeToggle(key: string, value: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, String(value));
  } catch {
    // Private mode and locked-down storage: the selection still applies.
  }
}

/**
 * CUS-02 theme selection. Display-only, like the caret style: it reaches no
 * metric and no `modelVersion`, so it lives in the web app rather than in
 * @realtype/schemas (no contract bump for a palette choice).
 *
 * `night-ink` is the `:root` default; `daylight` is `data-theme="daylight"`.
 * An explicit `night-ink` value inherits the same dark tokens — it names the
 * default so the selector always shows something truthful, and it opts out of
 * the OS-light mapping, which is what "I chose Night Ink" has to mean.
 */
export const THEME_STORAGE_KEY = "realtype.theme";
export type Theme = "night-ink" | "daylight";
export const SUPPORTED_THEMES: readonly Theme[] = ["night-ink", "daylight"];

/** Parse a stored theme value. Unknown or corrupt values are ignored. */
export function parseStoredTheme(raw: unknown): Theme | null {
  return raw === "night-ink" || raw === "daylight" ? raw : null;
}

/**
 * The first-run theme: what the visitor already sees. A light OS gets
 * Daylight through the CSS `prefers-color-scheme` mapping, so the derived
 * default matches it rather than silently switching to dark. Outside a
 * browser (SSR, tests) there is no OS to ask — Night Ink, the `:root`
 * default. Never persisted: persistence happens on selection only.
 */
export function defaultTheme(): Theme {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      return "daylight";
    }
  } catch {
    // A matchMedia that throws is no evidence about the OS.
  }
  return "night-ink";
}

/** Read a stored string value, or null on first run / outside a browser. */
function readStoredString(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Persist a string selection. A storage failure keeps the visit's choice. */
function storeString(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // Private mode and locked-down storage: the selection still applies.
  }
}

/**
 * CUS-02 interface-face selection. Display-only like the theme. `geist` is
 * the `:root` default (`--font-ui`); `system` and `atkinson` swap that token
 * via `data-ui-font`. The typing face (`--font-type`) is never involved, so
 * this choice can never silently restyle the text being typed.
 */
export const UI_FONT_STORAGE_KEY = "realtype.uiFont";
export type UiFont = "geist" | "system" | "atkinson";
export const SUPPORTED_UI_FONTS: readonly UiFont[] = ["geist", "system", "atkinson"];

/** Parse a stored interface-face value. Unknown values fall back to Geist. */
export function parseStoredUiFont(raw: unknown): UiFont | null {
  return raw === "geist" || raw === "system" || raw === "atkinson" ? raw : null;
}

/**
 * CUS-02 focus mode. Display-only like the rest. Off by default, armed only
 * by the toggle — nothing auto-activates it, and persistence is the same
 * guest-first exact-"true" pattern as the auto-insertion toggles.
 */
export const FOCUS_MODE_STORAGE_KEY = "realtype.focusMode";

export function App() {
  const [passage, setPassage] = useState<Passage>(PASSAGES[0]!);
  // Free mode is the only error mode exposed for now; the contract carries five
  // (CONTRACT_VERSION 1.3.0) and the settings UI is a later slice. A hard-coded
  // constant is honest about that; a mode bar with one working option is not.
  const errorMode: ErrorMode = "free";
  // STEER-6: the caret style is a display preference, and "line" is the
  // design-pack default. It deliberately does NOT live in the engine or touch
  // `modelVersion` — a recorded test stays comparable whichever way the caret
  // is drawn, which is why this is a plain prop and not a setting the metrics
  // package has to agree with.
  const [caretStyle, setCaretStyle] = useState<CaretStyle>("line");
  // LOC-01: the declared keyboard layout. Guest-first persistence (auth comes
  // later): first run starts from a labelled guess, every later visit from the
  // stored override. React state changes only here, on selection — never in
  // the key path (AGENTS.md rule 2).
  const [layout, setLayout] = useState<Layout>(
    () => readStoredLayout() ?? guessLayout(browserLanguage()),
  );
  const [layoutConfirmed, setLayoutConfirmed] = useState<boolean>(
    () => readStoredLayout() !== null,
  );

  const changeLayout = useCallback((next: Layout) => {
    setLayout(next);
    setLayoutConfirmed(true);
    storeLayout(next);
    // Telemetry layout_changed is DEFERRED (WAVE 0.15 NFR-09/OPS-13): the web
    // app has no telemetry client yet, and only layout NAMES would ever be
    // sent — never keystroke content (keystroke-privacy skill).
  }, []);

  // ENG-09: the armed auto-insertion toggles. Off by default, persisted
  // guest-first like the layout. State changes only on toggle — never in the
  // key path (AGENTS.md rule 2). No producer exists in prose mode: arming
  // changes nothing on screen today, and the note beside the controls says
  // so. Code passages (WAVE 3, PRG-11/PRG-15) will produce `auto: true`
  // events from these.
  const [autoIndent, setAutoIndent] = useState<boolean>(() =>
    readStoredToggle(AUTO_INDENT_STORAGE_KEY),
  );
  const [autoPair, setAutoPair] = useState<boolean>(() => readStoredToggle(AUTO_PAIR_STORAGE_KEY));

  const changeAutoIndent = useCallback((next: boolean) => {
    setAutoIndent(next);
    storeToggle(AUTO_INDENT_STORAGE_KEY, next);
  }, []);

  const changeAutoPair = useCallback((next: boolean) => {
    setAutoPair(next);
    storeToggle(AUTO_PAIR_STORAGE_KEY, next);
  }, []);

  // CUS-02: the theme switcher. Guest-first persistence like the layout:
  // first run starts from the derived default (what the visitor already
  // sees), every later visit from the stored choice. React state changes only
  // here, on selection — never in the key path (AGENTS.md rule 2). The effect
  // below writes `data-theme` on <html>; with no stored choice there is no
  // attribute and the CSS OS mapping decides, exactly as before.
  const [theme, setTheme] = useState<Theme>(
    () => parseStoredTheme(readStoredString(THEME_STORAGE_KEY)) ?? defaultTheme(),
  );

  const changeTheme = useCallback((next: Theme) => {
    setTheme(next);
    storeString(THEME_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme;
    } catch {
      // Outside a browser there is no <html> to mark (SSR, tests).
    }
  }, [theme]);

  // CUS-02: the interface-face selector. Same shape as the theme: derived
  // default (Geist, the `:root` default), stored choice wins, selection-only
  // state, `data-ui-font` on <html>. The typing face is untouched.
  const [uiFont, setUiFont] = useState<UiFont>(
    () => parseStoredUiFont(readStoredString(UI_FONT_STORAGE_KEY)) ?? "geist",
  );

  const changeUiFont = useCallback((next: UiFont) => {
    setUiFont(next);
    storeString(UI_FONT_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    try {
      document.documentElement.dataset.uiFont = uiFont;
    } catch {
      // Outside a browser there is no <html> to mark (SSR, tests).
    }
  }, [uiFont]);

  // CUS-02: focus mode. Off by default, armed only by the toggle below —
  // never auto-activated (no media query, no timer, no first-run logic).
  // `data-focus-mode` rides the `.app` div so it server-renders truthfully.
  const [focusMode, setFocusMode] = useState<boolean>(() =>
    readStoredToggle(FOCUS_MODE_STORAGE_KEY),
  );

  const changeFocusMode = useCallback((next: boolean) => {
    setFocusMode(next);
    storeToggle(FOCUS_MODE_STORAGE_KEY, next);
  }, []);

  const newPassage = useCallback(() => {
    setPassage((current) => {
      const index = PASSAGES.findIndex((p) => p.id === current.id);
      const next = PASSAGES[(index + 1) % PASSAGES.length];
      return next ?? PASSAGES[0]!;
    });
  }, []);

  return (
    <div className="app" data-focus-mode={focusMode ? "on" : "off"}>
      {/*
        13 §1: a keyboard user must be able to reach the typing field in one key.
        It is off-screen until focused rather than `display: none`, because a
        hidden link is not focusable and so would be no link at all.
      */}
      <a className="skip-link" href="#surface">
        Skip to the typing field
      </a>

      <main>
        <h1 className="app-title" data-testid="app-title">
          RealType
        </h1>

        <div className="controls">
          <label htmlFor="passage">Passage</label>
          <select
            id="passage"
            value={passage.id}
            data-testid="passage-select"
            onChange={(event) => {
              const next = PASSAGES.find((p) => p.id === event.target.value);
              if (next !== undefined) setPassage(next);
            }}
          >
            {PASSAGES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </select>

          <label htmlFor="caret-style">{COPY.caretStyleLabel}</label>
          <select
            id="caret-style"
            value={caretStyle}
            data-testid="caret-style-select"
            onChange={(event) => setCaretStyle(event.target.value as CaretStyle)}
          >
            {(Object.keys(COPY.caretStyleOptions) as CaretStyle[]).map((style) => (
              <option key={style} value={style}>
                {COPY.caretStyleOptions[style]}
              </option>
            ))}
          </select>

          <label htmlFor="layout">{COPY.layoutLabel}</label>
          <select
            id="layout"
            value={layout}
            data-testid="layout-select"
            onChange={(event) => {
              const next = parseStoredLayout(event.target.value);
              if (next !== null) changeLayout(next);
            }}
          >
            {SUPPORTED_LAYOUTS.map((name) => (
              <option key={name} value={name}>
                {COPY.layoutOptions[name]}
              </option>
            ))}
          </select>

          <label htmlFor="auto-indent">
            <input
              id="auto-indent"
              type="checkbox"
              data-testid="auto-indent-toggle"
              checked={autoIndent}
              onChange={(event) => changeAutoIndent(event.target.checked)}
            />
            {COPY.autoIndentLabel}
          </label>

          <label htmlFor="auto-pair">
            <input
              id="auto-pair"
              type="checkbox"
              data-testid="auto-pair-toggle"
              checked={autoPair}
              onChange={(event) => changeAutoPair(event.target.checked)}
            />
            {COPY.autoPairLabel}
          </label>

          <label htmlFor="theme">{COPY.themeLabel}</label>
          <select
            id="theme"
            value={theme}
            data-testid="theme-select"
            onChange={(event) => {
              const next = parseStoredTheme(event.target.value);
              if (next !== null) changeTheme(next);
            }}
          >
            {SUPPORTED_THEMES.map((name) => (
              <option key={name} value={name}>
                {COPY.themeOptions[name]}
              </option>
            ))}
          </select>

          <label htmlFor="ui-font">{COPY.uiFontLabel}</label>
          <select
            id="ui-font"
            value={uiFont}
            data-testid="ui-font-select"
            onChange={(event) => {
              const next = parseStoredUiFont(event.target.value);
              if (next !== null) changeUiFont(next);
            }}
          >
            {SUPPORTED_UI_FONTS.map((name) => (
              <option key={name} value={name}>
                {COPY.uiFontOptions[name]}
              </option>
            ))}
          </select>
        </div>

        {/*
          The focus toggle lives OUTSIDE `.controls` in its own row: focus mode
          hides `.controls`, and the way back out must never be among the things
          hidden. A plain labelled checkbox, keyboard-reachable in both modes.
        */}
        <div className="focus-control">
          <label htmlFor="focus-mode">
            <input
              id="focus-mode"
              type="checkbox"
              data-testid="focus-mode-toggle"
              checked={focusMode}
              onChange={(event) => changeFocusMode(event.target.checked)}
            />
            {COPY.focusModeLabel}
          </label>
        </div>

        <p className="note" data-testid="ui-font-note">
          {COPY.uiFontNote}
        </p>

        <p className="note" data-testid="focus-mode-note">
          {COPY.focusModeNote}
        </p>

        <p className="note" data-testid="auto-note">
          {COPY.autoNote}
        </p>

        {/*
          First-run layout prompt and the IME notice (M1-04 §6, M2-06 §2). Plain
          text beside the settings, above the surface — never covering it, so
          AC6 (no interrupting chrome) holds by construction.
        */}
        {!layoutConfirmed && (
          <p className="note" data-testid="layout-why">
            {COPY.layoutFirstRun} {COPY.layoutWhy}
          </p>
        )}
        <p className="note" data-testid="ime-notice">
          {COPY.imeNotice}
        </p>

        <TypingSurface
          // Remounting on a passage change is deliberate: it resets every ref, the
          // capture and the offsets in one step, instead of relying on an effect to
          // remember to undo the previous attempt.
          //
          // The layout joins the key for the same reason: a run must carry ONE
          // declared layout, so changing it mid-test restarts the attempt rather
          // than producing a mixed-attribution log.
          key={`${passage.id}:${layout}`}
          passage={passage}
          errorMode={errorMode}
          caretStyle={caretStyle}
          layout={layout}
          autoIndent={autoIndent}
          autoPair={autoPair}
          onNewPassage={newPassage}
        />
      </main>

      <p className="banner" role="note">
        Practice surface. Every score comes from the RealType engine in this repository — nothing is
        sent anywhere and nothing is saved.
      </p>
    </div>
  );
}
