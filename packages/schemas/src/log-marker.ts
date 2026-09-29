import { z } from "zod";

/**
 * Non-keyboard markers captured alongside key events (M1-01, added for the
 * fixture recorder in Block B2): focus/blur of the capture surface and
 * visibility changes (tab switches). They never count as keystrokes — the
 * engine uses them to reason about pauses and invalidation (hidden-tab
 * behavior, S6).
 */
export const LogMarkerKindSchema = z.enum(["focus", "blur", "visibility"]);
export type LogMarkerKind = z.infer<typeof LogMarkerKindSchema>;

export const LogMarkerSchema = z.strictObject({
  kind: LogMarkerKindSchema,
  /** Milliseconds since the first accepted keystroke (same clock as events). */
  t: z.number().nonnegative(),
  /** For visibility markers: the document.visibilityState value. */
  detail: z.string().optional(),
});

export type LogMarker = z.infer<typeof LogMarkerSchema>;
