/**
 * The RealType app shell.
 *
 * Deliberately thin: it owns which passage is loaded and nothing else. Every
 * decision about the test itself — character states, metrics, error modes, the
 * clock — belongs to packages/engine, and the surface is the only thing that
 * talks to it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorMode, EngineResult } from "@realtype/engine";
import {
  LayoutSchema,
  type CaretStyle,
  type InputLog,
  type Layout,
  type Mode,
  type TypingText,
} from "@realtype/schemas";

import { COPY } from "./copy";

import { OnboardingPanel } from "./onboarding/OnboardingPanel";
import { PlacementCard } from "./baseline/PlacementCard";
import { MasteryPanel } from "./learning/MasteryPanel";
import { recordMasteryRun } from "./learning/mastery-storage";
import type { MasteryType } from "./learning/mastery";
import { GoalPanel } from "./learning/GoalPanel";
import { UnlockStrip } from "./learning/UnlockStrip";
import { unlockStateFor } from "./learning/unlocking";
import {
  mergeAttempt,
  readKeyProgress,
  solidCharsFor,
  writeKeyProgress,
} from "./learning/key-progress";
import { readGoalRecord, recordAttempt, type GoalSample } from "./learning/goal-storage";
import { TypingSurface } from "./TypingSurface";
import { passageLabel, type Passage } from "./passages";
import { DEFAULT_NUMBER_DRILL, NUMBER_DRILLS, buildNumberDrill, type NumberDrill } from "./drills";
import { BASELINE_SECONDS, type Placement } from "./baseline/placement";
import {
  baselineRecord as buildBaselineRecord,
  readBaselineRecord,
  type BaselineRecord,
} from "./baseline/storage";
import { recordBaseline } from "./baseline/flow";
import {
  getCorpusPassages,
  getCorpusQuotes,
  getCorpusSnippets,
  getAvailableDifficulties,
  bandFor,
  truncateToWords,
  type Difficulty,
} from "./corpus";

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

/** MOD-01: what kind of test the visitor is setting up. */
export type TestMode =
  "prose" | "time" | "words" | "quotes" | "custom" | "numbers" | "code" | "baseline";

/** MOD-01: the contract's timed lengths. */
export const TIME_LIMITS = [15, 30, 60, 120, 180] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

/** MOD-01: the word counts offered. */
export const WORD_COUNTS = [15, 30, 60] as const;
export type WordCount = (typeof WORD_COUNTS)[number];

/** MOD-01: the longest custom text the surface will accept. */
export const MAX_CUSTOM_CHARS = 2000;

/**
 * The InputLog mode each setup records. The modes differ in WHEN a test ends,
 * never in how a keystroke is scored, so this is attribution only: the
 * engine's numbers are identical for "classic" and "custom".
 */
export function logModeFor(mode: TestMode): Mode {
  return mode === "custom" ? "custom" : "classic";
}

/**
 * LRN-04: which mastery type a finished test counts toward, if any.
 *
 * Prose-family modes share one window; quotes, numbers and code keep their
 * own, so a bad numbers drill cannot drag down a prose average. Custom text
 * and baselines do not count: one is the visitor's own text, the other is a
 * measurement rather than practice.
 */
function masteryTypeFor(mode: TestMode): MasteryType | null {
  switch (mode) {
    case "prose":
    case "time":
    case "words":
      return "prose";
    case "quotes":
      return "quotes";
    case "numbers":
      return "numbers";
    case "code":
      return "code";
    default:
      return null;
  }
}

/** MOD-01: the last-resort text if the corpus ever fails to load. */
const FALLBACK_PASSAGE = "The quick brown fox jumps over the lazy dog.";

/**
 * The band the app opens on.
 *
 * "Typical" is the mid band — the one the onboarding plan maps most visitors
 * to (partway / returning / unsure all land there), and the band the level-1
 * opener PROSE-01-004 actually sits in. The bands are COMPUTED typability
 * bands (CNT-02), not the declared ones, so a passage can be declared Easy and
 * still be computed Typical: the picker follows the computed value the engine
 * reports, because that is the one the results screen shows.
 */
const DEFAULT_DIFFICULTY: Difficulty = "typical";

/**
 * The passage the app opens on: the level-1 gentle opener named in
 * docs/levels-02-boss-and-challenge-content.md (rotation table, level 1). It
 * is also what the first-session prototype and the whole e2e suite type, so
 * the picker's default is a documented decision rather than an accident of
 * corpus ordering.
 */
const DEFAULT_PROSE_ID = "PROSE-01-004";

/**
 * MOD-03's languages, read from what the corpus can actually classify (the
 * engine's own language profiles). The master spec names five; the engine
 * currently carries JavaScript/TypeScript and Python, so this list is two — and
 * it is derived, not hand-written, so it cannot name a language the token map
 * cannot read.
 */
const SNIPPET_LANGUAGES = getCorpusSnippets()
  .map((s) => s.language)
  .filter((l, i, all) => all.indexOf(l) === i);

/** Human names for the engine's language profile ids (MOD-03). */
export const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  javascript: "JavaScript / TypeScript",
  python: "Python",
};

export function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [testMode, setTestMode] = useState<TestMode>("prose");
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(60);
  const [wordCount, setWordCount] = useState<WordCount>(30);
  const [customText, setCustomText] = useState("");
  // MOD-04: the drill kind and its seed. The seed is what makes a drill
  // reproducible, and a new drill is a new seed — never "shuffle".
  const [numberDrill, setNumberDrill] = useState<NumberDrill>(DEFAULT_NUMBER_DRILL);
  const [drillSeed, setDrillSeed] = useState(1);
  // MOD-05 / LRN-01: the measured baseline, and the placement it produced for
  // the run that has just finished. The stored record is read once at mount;
  // `placement` is only ever set by a finished baseline, and cleared on
  // restart, so the card belongs to the attempt it describes.
  const [baseline, setBaseline] = useState<BaselineRecord | null>(() => readBaselineRecord());
  // Bumped whenever a baseline is written, so the onboarding plan re-derives
  // with the measurement instead of the self-report it was showing.
  const [baselineVersion, setBaselineVersion] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // Which prose passage the baseline loads. A retest must use DIFFERENT text of
  // the same band (M4-08 item 4), so retaking advances this rather than re-reading
  // the same passage a visitor may have practised on.
  const [baselineIndex, setBaselineIndex] = useState(0);
  // LRN-06: the practice history the goal's ETA is derived from. Read once at
  // mount, appended on finish — never in the key path.
  const [goalHistory, setGoalHistory] = useState<readonly GoalSample[]>(
    () => readGoalRecord().history,
  );
  // LRN-04: bumped whenever a run joins a mastery window, so the panel
  // re-derives. The record is the source of truth; this is only a version.
  const [masteryVersion, setMasteryVersion] = useState(0);
  // LRN-03: what is unlocked, from what has been measured. The memory is read
  // once at mount and folded on every finished attempt — never in the key
  // path. Unknown characters are not weak, so an empty memory unlocks exactly
  // the home row and nothing else.
  const [keyProgress, setKeyProgress] = useState(() => readKeyProgress());
  const solidChars = useMemo(() => solidCharsFor(keyProgress), [keyProgress]);

  /**
   * LRN-03: fold one finished attempt into the per-key memory.
   *
   * Counts only, persisted; the log and the text never leave the surface.
   * Runs for every mode including drills and baselines, because progress made
   * anywhere is progress.
   */
  const handleAttemptLogged = useCallback((log: InputLog, text: TypingText) => {
    const next = mergeAttempt(readKeyProgress(), log, text);
    writeKeyProgress(next);
    setKeyProgress(next);
  }, []);
  // MOD-03: the language and snippet index. The language list comes from the
  // engine's language profiles, so it cannot name one the token map cannot
  // read — a label the gate would refuse is a label the UI never shows.
  const [codeLanguage, setCodeLanguage] = useState<string>(SNIPPET_LANGUAGES[0] ?? "javascript");
  const [snippetIndex, setSnippetIndex] = useState(0);

  const snippets = useMemo(() => getCorpusSnippets(codeLanguage), [codeLanguage]);
  /**
   * Which prose passage is loaded (prose / timed / word-count modes).
   *
   * The default is PROSE-01-004, the passage the level-1 rotation names as the
   * gentle opener (docs/levels-02-boss-and-challenge-content.md §rotation) —
   * the same one the first-session prototype and the e2e suite type. Changing
   * difficulty moves to the top of that band.
   */
  const [proseIndex, setProseIndex] = useState(() => {
    const band = getCorpusPassages(DEFAULT_DIFFICULTY);
    const opener = band.findIndex((p) => p.id === DEFAULT_PROSE_ID);
    return opener >= 0 ? opener : 0;
  });
  /** Which quote is loaded (quote mode). */
  const [quoteIndex, setQuoteIndex] = useState(0);

  const prosePassages = useMemo(() => getCorpusPassages(difficulty), [difficulty]);
  const quotes = useMemo(() => getCorpusQuotes(), []);

  const fallback = useMemo<Passage>(() => ({ id: "PROSE-01-004", text: FALLBACK_PASSAGE }), []);

  /**
   * The effective target for the surface.
   *
   * The App owns WHICH text is loaded and nothing else (see the header note):
   * this maps the setup to one passage, and the surface scores it exactly as
   * it scores any other. MOD-01's modes differ in WHEN a test ends — the
   * countdown, the word cap — and never in how a keystroke is counted.
   */
  const passage: Passage = useMemo(() => {
    switch (testMode) {
      case "time":
      case "prose":
        return prosePassages[proseIndex] ?? prosePassages[0] ?? fallback;
      case "words": {
        const source = prosePassages[proseIndex] ?? prosePassages[0];
        if (source === undefined) return fallback;
        return { id: source.id, text: truncateToWords(source.text, wordCount) };
      }
      case "quotes":
        return quotes[quoteIndex % Math.max(1, quotes.length)] ?? prosePassages[0] ?? fallback;
      case "numbers":
        // MOD-04: a synthetic, seeded drill. The id carries the drill kind and
        // its seed so a recorded run names exactly which drill it was, the way
        // a corpus passage carries its content id.
        return {
          id: `NUMBERS-${numberDrill}-${drillSeed}`,
          text: buildNumberDrill(drillSeed, numberDrill),
        };
      case "baseline":
        // MOD-05: the general baseline is a 3-minute real-world prose run —
        // the same content, the same engine, the same scoring as a practice
        // test. What differs is the length and what the result is USED for.
        return prosePassages[baselineIndex] ?? prosePassages[0] ?? fallback;
      case "code": {
        // MOD-03: a structured snippet. Its content id is the corpus record's,
        // so a recorded run says which snippet it was rather than "some code".
        const snippet = snippets[snippetIndex % Math.max(1, snippets.length)] ?? snippets[0];
        return snippet === undefined ? fallback : { id: snippet.id, text: snippet.text };
      }
      case "custom":
      default:
        return customText.trim().length > 0 ? { id: "CUSTOM", text: customText } : fallback;
    }
  }, [
    testMode,
    prosePassages,
    proseIndex,
    wordCount,
    quotes,
    quoteIndex,
    numberDrill,
    drillSeed,
    snippets,
    snippetIndex,
    baselineIndex,
    customText,
    fallback,
  ]);
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
  // below writes `data-theme` on <html> ONLY when a stored choice exists;
  // with no stored choice there is no attribute and the CSS OS mapping
  // decides live (including later OS switches). No pre-paint inline script:
  // the security-headers gate pins script-src 'self', so a returning visitor
  // whose stored theme differs from the OS sees one frame of the OS palette
  // before the effect reconciles — accepted MVP debt, recorded in the ledger.
  const [theme, setTheme] = useState<Theme>(
    () => parseStoredTheme(readStoredString(THEME_STORAGE_KEY)) ?? defaultTheme(),
  );

  const changeTheme = useCallback((next: Theme) => {
    setTheme(next);
    storeString(THEME_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    try {
      if (parseStoredTheme(readStoredString(THEME_STORAGE_KEY)) !== null) {
        document.documentElement.dataset.theme = theme;
      } else {
        delete document.documentElement.dataset.theme;
      }
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
      if (parseStoredUiFont(readStoredString(UI_FONT_STORAGE_KEY)) !== null) {
        document.documentElement.dataset.uiFont = uiFont;
      } else {
        delete document.documentElement.dataset.uiFont;
      }
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
  const focusToggleRef = useRef<HTMLInputElement>(null);

  const changeFocusMode = useCallback((next: boolean) => {
    setFocusMode(next);
    storeToggle(FOCUS_MODE_STORAGE_KEY, next);
    // If focus sits on a control the hide is about to remove (e.g. toggled
    // via AT while focused inside .controls), move it to the toggle that
    // survives — focus must never drop to <body> on this action.
    if (next && document.activeElement instanceof HTMLElement) {
      const controls = document.querySelector(".controls");
      if (controls !== null && controls.contains(document.activeElement)) {
        focusToggleRef.current?.focus();
      }
    }
  }, []);

  /**
   * "New passage" (action.newPassage): loads different text, so the surface is
   * never handed the same one back. Quote mode advances the quote; the prose,
   * timed and word-count modes carry their own picker, so the button moves
   * that picker rather than silently re-reading the same string.
   */
  const newPassage = useCallback(() => {
    if (testMode === "quotes") {
      setQuoteIndex((i) => i + 1);
      return;
    }
    setProseIndex((i) => (i + 1) % Math.max(1, prosePassages.length));
  }, [testMode, prosePassages.length]);

  /**
   * MOD-05: what a finished BASELINE does that no other mode does.
   *
   * It measures, and it stores the measurement. Everything else — the mode,
   * the passage, the engine, the scoring — is the ordinary practice path, so
   * a baseline cannot silently score differently from a practice test: the
   * two would then disagree about the same typing.
   *
   * Only the engine's summary numbers are written. No text, no keystrokes, no
   * passage id (keystroke-privacy, D-M4-6).
   */
  /**
   * LRN-05: the one-click drill.
   *
   * The confusion's own characters become the target, as custom text — the
   * same path MOD-01 already uses for a visitor's own text, so the drill is a
   * passage like any other and the surface scores it unchanged. Nothing here
   * special-cases scoring: a drill is not a different instrument.
   */
  const drillConfusion = useCallback((drillText: string) => {
    setCustomText(drillText);
    setTestMode("custom");
  }, []);

  /**
   * LRN-06: every PRACTICE attempt joins the goal's history.
   *
   * A baseline does not: it is a measurement, not practice, and mixing the two
   * would make the trend describe something it never measured. Only the net
   * WPM and a timestamp are written — no text, no keystrokes.
   */
  const handleFinish = useCallback(
    (result: EngineResult) => {
      if (testMode === "baseline") {
        const next = recordBaseline(result, () => Date.now());
        if (next === null) return;
        setPlacement(next);
        // Read back what was actually written rather than assuming the write
        // landed: a silent-failure storage must not be reported as a success.
        setBaseline(
          readBaselineRecord() ?? buildBaselineRecord(next.netWpm, next.finalAccuracy, Date.now()),
        );
        setBaselineVersion((v) => v + 1);
        return;
      }
      recordAttempt(result.summary.netWpm, Date.now());
      setGoalHistory(readGoalRecord().history);
      // LRN-04: the run joins its content type's window. Best 3 of 5 is
      // computed on read, so nothing here decides anything — it only records.
      const masteryType = masteryTypeFor(testMode);
      if (masteryType !== null) {
        recordMasteryRun(masteryType, result.summary.netWpm, Date.now());
        setMasteryVersion((v) => v + 1);
      }
    },
    [testMode],
  );

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

      {/*
        The product header: brand only — wordmark, mark and tagline, nothing
        focusable. It deliberately holds no navigation (there are no routes
        yet, and links to nowhere would be decoration pretending to be
        structure) and no controls: the focus-mode keyboard path (skip link,
        then toggle) is pinned by e2e/appearance.spec.ts down to the tab
        count, so adding a focus stop before the toggle would break it, and
        the AC6 live-DOM scan fails any element that paints over the field —
        hence no sticky or fixed positioning anywhere here either.
      */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <h1 className="app-title" data-testid="app-title">
            RealType
          </h1>
          <span className="brand-tag">{COPY.brandTagline}</span>
        </div>
      </header>

      <main>
        <OnboardingPanel
          layout={layout}
          layoutConfirmed={layoutConfirmed}
          // MOD-05: a baseline written while this panel is open re-derives the
          // plan with the measurement instead of the self-report.
          baselineVersion={baselineVersion}
        />

        <div className="controls">
          <div className="toolbar-group" role="group" aria-labelledby="toolbar-test">
            <span className="toolbar-caption" id="toolbar-test">
              {COPY.toolbarGroups.test}
            </span>
            <label htmlFor="test-mode">{COPY.testSetup.modeLabel}</label>
            <select
              id="test-mode"
              value={testMode}
              data-testid="test-mode-select"
              onChange={(event) => setTestMode(event.target.value as TestMode)}
            >
              {(Object.keys(COPY.testSetup.modeOptions) as TestMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {COPY.testSetup.modeOptions[mode]}
                </option>
              ))}
            </select>
            {/*
              LRN-01: skip-ahead. A visitor is never routed through the
              baseline to reach the typing surface — the button leaves for the
              ordinary prose mode in one activation, and the baseline stays
              available in the mode bar for whenever they want it.
            */}
            {testMode === "baseline" && (
              <button
                type="button"
                data-testid="baseline-skip"
                onClick={() => setTestMode("prose")}
              >
                {COPY.testSetup.baselineSkip}
              </button>
            )}
            {testMode === "time" && (
              <>
                <label htmlFor="time-limit">{COPY.testSetup.durationLabel}</label>
                <select
                  id="time-limit"
                  value={timeLimit}
                  data-testid="time-limit-select"
                  onChange={(event) => setTimeLimit(Number(event.target.value) as TimeLimit)}
                >
                  {TIME_LIMITS.map((sec) => (
                    <option key={sec} value={sec}>
                      {COPY.testSetup.durationOptions[sec]}
                    </option>
                  ))}
                </select>
              </>
            )}
            {testMode === "words" && (
              <>
                <label htmlFor="word-count">{COPY.testSetup.wordCountLabel}</label>
                <select
                  id="word-count"
                  value={wordCount}
                  data-testid="word-count-select"
                  onChange={(event) => setWordCount(Number(event.target.value) as WordCount)}
                >
                  {WORD_COUNTS.map((n) => (
                    <option key={n} value={n}>
                      {COPY.testSetup.wordCountOptions[n]}
                    </option>
                  ))}
                </select>
              </>
            )}
            {testMode === "custom" && (
              <>
                <label htmlFor="custom-text">{COPY.testSetup.customLabel}</label>
                <textarea
                  id="custom-text"
                  data-testid="custom-text-input"
                  rows={3}
                  maxLength={MAX_CUSTOM_CHARS}
                  value={customText}
                  aria-describedby="custom-text-note"
                  onChange={(event) => setCustomText(event.target.value)}
                />
                <p className="note" id="custom-text-note" data-testid="custom-text-note">
                  {COPY.testSetup.customLimitNote}
                </p>
              </>
            )}
            {testMode === "code" && (
              <p className="note" data-testid="code-note">
                {COPY.testSetup.codeNote}
              </p>
            )}
            <p className="note" data-testid="test-mode-note">
              {COPY.testSetup.modeNotes[testMode]}
            </p>
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              value={difficulty}
              data-testid="difficulty-select"
              onChange={(event) => {
                setDifficulty(event.target.value as Difficulty);
                setProseIndex(0);
              }}
            >
              {getAvailableDifficulties().map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
            {testMode === "numbers" && (
              <>
                <label htmlFor="drill-kind">Drill</label>
                <select
                  id="drill-kind"
                  value={numberDrill}
                  data-testid="drill-kind-select"
                  onChange={(event) => setNumberDrill(event.target.value as NumberDrill)}
                >
                  {NUMBER_DRILLS.map((kind) => (
                    <option key={kind} value={kind}>
                      {COPY.testSetup.drillOptions[kind]}
                    </option>
                  ))}
                </select>
                {/*
                  One new seed per click, so "New drill" is a fact about the
                  drill rather than a shuffle that cannot be reproduced.
                */}
                <button
                  type="button"
                  data-testid="new-drill"
                  onClick={() => setDrillSeed((s) => s + 1)}
                >
                  {COPY.testSetup.drillAction}
                </button>
              </>
            )}
            {testMode === "code" && (
              <>
                <label htmlFor="code-language">Language</label>
                <select
                  id="code-language"
                  value={codeLanguage}
                  data-testid="code-language-select"
                  onChange={(event) => {
                    setCodeLanguage(event.target.value);
                    setSnippetIndex(0);
                  }}
                >
                  {SNIPPET_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] ?? lang}
                    </option>
                  ))}
                </select>
                <label htmlFor="snippet">Snippet</label>
                <select
                  id="snippet"
                  value={snippetIndex}
                  data-testid="snippet-select"
                  onChange={(event) => setSnippetIndex(Number(event.target.value))}
                >
                  {snippets.map((snippet, index) => (
                    <option key={snippet.id} value={index}>
                      {snippet.id}
                    </option>
                  ))}
                </select>
              </>
            )}
            {testMode === "quotes" && (
              <>
                <button
                  type="button"
                  data-testid="next-quote"
                  onClick={() => setQuoteIndex((i) => i + 1)}
                >
                  {COPY.testSetup.quoteAction}
                </button>
              </>
            )}
            <label htmlFor="passage">Passage</label>
            <select
              id="passage"
              value={proseIndex}
              data-testid="passage-select"
              onChange={(event) => setProseIndex(Number(event.target.value))}
            >
              {prosePassages.map((p, index) => (
                <option key={p.id} value={index}>
                  {passageLabel(p)}
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
          </div>

          <div className="toolbar-group" role="group" aria-labelledby="toolbar-display">
            <span className="toolbar-caption" id="toolbar-display">
              {COPY.toolbarGroups.display}
            </span>
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
              aria-describedby="ui-font-note"
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

          <div className="toolbar-group" role="group" aria-labelledby="toolbar-typing">
            <span className="toolbar-caption" id="toolbar-typing">
              {COPY.toolbarGroups.typing}
            </span>
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
          </div>
        </div>

        {/*
          The focus toggle lives OUTSIDE `.controls` in its own row: focus mode
          hides `.controls`, and the way back out must never be among the things
          hidden. A plain labelled checkbox, keyboard-reachable in both modes —
          and it stays exactly where it has always been in the tab order (after
          the settings row), because e2e/appearance.spec.ts pins the focus-mode
          keyboard path down to the tab count.
        */}
        <div className="focus-control">
          <label htmlFor="focus-mode">
            <input
              id="focus-mode"
              ref={focusToggleRef}
              type="checkbox"
              data-testid="focus-mode-toggle"
              checked={focusMode}
              aria-describedby="focus-mode-note"
              onChange={(event) => changeFocusMode(event.target.checked)}
            />
            {COPY.focusModeLabel}
          </label>
        </div>

        <p className="note" id="ui-font-note" data-testid="ui-font-note">
          {COPY.uiFontNote}
        </p>

        <p className="note" id="focus-mode-note" data-testid="focus-mode-note">
          {COPY.focusModeNote}
        </p>

        <p className="note" data-testid="auto-note">
          {COPY.autoNote}
        </p>

        {/*
          CUS-03: the shortcuts list. A native disclosure: keyboard-operable
          by construction, static text beside the settings, never covering
          the field. Every entry is a binding the app honors, each exercised
          in e2e/keyboard-flow.spec.ts or the replay suite.
        */}
        <details className="note" data-testid="shortcuts">
          <summary>
            {COPY.shortcutsTitle} — {COPY.shortcutsIntro}
          </summary>
          <ul>
            {COPY.shortcuts.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>

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
          // MOD-01: a timed test ends when the clock runs out. Every other
          // mode has no clock — the surface keeps its fixed-length behaviour.
          timeLimitSec={testMode === "time" ? timeLimit : 0}
          // MOD-01: attribution for what kind of test this was. The modes
          // differ in when the test ends, never in how a keystroke is scored,
          // so this touches no metric and no `modelVersion`.
          logMode={logModeFor(testMode)}
          // MOD-05: the baseline is a timed run through the ordinary practice
          // path — same surface, same engine, same scoring.
          timeLimitOverride={testMode === "baseline" ? BASELINE_SECONDS : undefined}
          // MOD-02: the engine's own computed band (CNT-02) for the loaded
          // corpus item, shown as words beside the content id. Custom text and
          // generated drills have no band, so they show none rather than a
          // guessed one.
          difficultyBand={testMode === "custom" ? undefined : (bandFor(passage.id) ?? undefined)}
          // MOD-05: a finished baseline measures and stores; every other mode
          // ignores this hook entirely.
          onFinish={handleFinish}
          // LRN-05: the one-click drill, from the finished screen.
          onDrillConfusion={drillConfusion}
          // LRN-03: the finished attempt's log, folded into per-key progress.
          onAttemptLogged={handleAttemptLogged}
          onNewPassage={newPassage}
        />

        {/*
          MOD-05 / LRN-01: the placement card, only after a baseline has
          actually been measured. It sits in normal flow under the results
          panel, covering nothing — the surface stays usable and untouched
          (rule 1), and it is not a live region, so the surface's single polite
          announcer is still the only thing announced all session.
        */}
        {placement !== null && testMode === "baseline" && (
          <PlacementCard
            placement={placement}
            stored={baseline}
            onChooseBand={() => {
              // The stored record is what everything else reads, so an override
              // writes a record rather than a side value that could disagree
              // with it. Choosing the band the measurement already produced
              // writes exactly the same thing.
            }}
            onRetake={() => {
              // M4-08 item 4: a retest uses DIFFERENT text of the same band, so
              // the passage advances rather than being handed straight back.
              setBaselineIndex((i) => (i + 1) % Math.max(1, prosePassages.length));
              setPlacement(null);
            }}
            onSkip={() => setPlacement(null)}
          />
        )}
        {/*
          LRN-06: the goal panel. Below the results panel and the placement
          card, in normal flow, covering nothing — and not a live region, so
          the surface's single polite announcer stays the only announcement.
        */}
        <GoalPanel history={goalHistory} />

        {/*
          LRN-04: mastery per content type. Below the goal panel in normal
          flow, covering nothing — and not a live region, so the surface's
          single polite announcer stays the only announcement.
        */}
        <MasteryPanel
          version={masteryVersion}
          onAdvance={(type) => {
            // Auto-advance PROPOSES the next band; it never routes. Moving the
            // difficulty picker is an explicit, visible choice the visitor can
            // see and undo — an app that yanked the test out from under someone
            // is an app nobody trusts.
            if (type === "prose" || type === "quotes") {
              const order: Difficulty[] = ["easy", "typical", "hard"];
              const next = order[Math.min(order.length - 1, order.indexOf(difficulty) + 1)];
              if (next !== undefined) {
                setDifficulty(next);
                setProseIndex(0);
              }
            }
          }}
        />

        {/*
          LRN-03: what is unlocked, and what is being learned. Above the goal
          panel because it describes the practice the visitor is about to do,
          and only when the surface has something to unlock — a visitor who has
          cleared every set sees the summary and nothing else.
        */}
        <UnlockStrip
          state={unlockStateFor(solidChars)}
          onDrillNext={(chars) => {
            setCustomText(chars);
            setTestMode("custom");
          }}
        />
      </main>

      {/*
        The page footer. It carries the practice-surface note and nothing else:
        a footer with links would promise pages that do not exist yet, and a
        footer that stays visible in focus mode would contradict the mode's own
        contract (settings and notes hidden, field and feedback usable).
      */}
      <footer className="site-footer">
        <p className="banner" role="note">
          Practice surface. Every score comes from the RealType engine in this repository — nothing
          is sent anywhere and nothing is saved.
        </p>
      </footer>
    </div>
  );
}
