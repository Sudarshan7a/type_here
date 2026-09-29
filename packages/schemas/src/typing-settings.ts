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
 * Typing settings (M1-01).
 */
export const TypingSettingsSchema = z.strictObject({
  /** How errors are handled while typing. */
  errorMode: z.enum(["free", "must-correct", "stop-on-error"]),
  /** Auto-indent after Enter in code-ish texts. */
  autoIndent: z.boolean(),
  /** Auto-close brackets/quotes. */
  autoPair: z.boolean(),
  /** The physical layout the user says they are typing on. */
  layout: LayoutSchema,
});

export type TypingSettings = z.infer<typeof TypingSettingsSchema>;
