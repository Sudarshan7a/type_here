import { z } from "zod";

/**
 * One captured key event (M1-01). Timestamps are milliseconds, float, relative
 * to the first accepted keystroke (t = 0 at the first accepted keydown). All
 * fields are required — the recorder and the input adapter must supply them
 * explicitly; defaults would hide data-quality problems.
 */
export const KeyEventSchema = z.strictObject({
  /** KeyboardEvent.code (physical key, layout-independent), e.g. "KeyA". */
  code: z.string().min(1),
  /** KeyboardEvent.key (layout-interpreted), e.g. "a", "A", "Shift". */
  key: z.string(),
  /** Press phase. */
  type: z.enum(["down", "up"]),
  /** Milliseconds since the first accepted keystroke. Finite, >= 0. */
  t: z.number().nonnegative(),
  /** Modifier state at event time. */
  mods: z.strictObject({
    shift: z.boolean(),
    ctrl: z.boolean(),
    alt: z.boolean(),
    meta: z.boolean(),
  }),
  /** OS key-repeat flag (KeyboardEvent.repeat). */
  repeat: z.boolean(),
  /** KeyboardEvent.isTrusted — synthetic (untrusted) events are flagged. */
  isTrusted: z.boolean(),
  /** True when the character was auto-inserted by the app (e.g. auto-pair). */
  auto: z.boolean(),
  /**
   * True while an IME composition is still open (compositionstart/update):
   * the keystroke is a partial reading, not committed text, and the engine
   * must never score it (M1-04 §6, ENG-06). Committed text arrives as an
   * ordinary keydown with this flag false (or absent).
   *
   * Optional since B1-era logs predate it (the same pattern as
   * InputLog.markers): absent means "not a composition partial", so every log
   * that was valid at CONTRACT 1.3.0 still parses unchanged.
   */
  composition: z.boolean().optional(),
});

export type KeyEvent = z.infer<typeof KeyEventSchema>;
