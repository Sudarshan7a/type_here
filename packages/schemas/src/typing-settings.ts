import { z } from "zod";

/** Keyboard layouts supported at MVP (build order: QWERTY-US first). */
export const LayoutSchema = z.enum([
  "qwerty-us",
  "qwerty-uk",
  "dvorak",
  "colemak-dh",
  "azerty",
  "qwertz",
]);
export type Layout = z.infer<typeof LayoutSchema>;

/**
 * How errors are handled while typing.
 *
 * `no-backspace` (D03) and `word-locked` (D04) were added in CONTRACT_VERSION
 * 1.3.0 as an additive extension: the three original values keep their exact
 * meaning and every log valid at 1.2.0 is still valid. Master spec ENG-03 lists
 * both as `[V1]` additions.
 */
export const ErrorModeSchema = z.enum([
  "free",
  "must-correct",
  "stop-on-error",
  "no-backspace",
  "word-locked",
]);
export type ErrorMode = z.infer<typeof ErrorModeSchema>;

/**
 * How the caret is drawn. STEER-6.
 *
 * A display preference, not a scoring one: it changes nothing about the engine,
 * the metrics or the model version, so it belongs in the settings contract
 * without touching `CONTRACT_VERSION` the way `no-backspace` and `word-locked`
 * did. A recorded test is still comparable across users typing with different
 * carets, exactly as it is across different font sizes.
 *
 * `line` is the default and the one the design pack specifies: a 2px bar sized
 * to the glyph. `block` and `underline` exist because the owner asked for the
 * choice, not because the pack requires them.
 */
export const CaretStyleSchema = z.enum(["line", "block", "underline"]);
export type CaretStyle = z.infer<typeof CaretStyleSchema>;

/**
 * Typing settings (M1-01).
 */
export const TypingSettingsSchema = z.strictObject({
  /** How errors are handled while typing. */
  errorMode: ErrorModeSchema,
  /** Auto-indent after Enter in code-ish texts. */
  autoIndent: z.boolean(),
  /** Auto-close brackets/quotes. */
  autoPair: z.boolean(),
  /** The physical layout the user says they are typing on. */
  layout: LayoutSchema,
});

export type TypingSettings = z.infer<typeof TypingSettingsSchema>;
