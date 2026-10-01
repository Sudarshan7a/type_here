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
