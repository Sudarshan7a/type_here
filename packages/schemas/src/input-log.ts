import { z } from "zod";

import { KeyEventSchema } from "./key-event.js";
import { LIMITS } from "./limits.js";
import { TypingSettingsSchema } from "./typing-settings.js";

/** Practice modes at MVP (master spec §3.2). Provisional string values. */
export const ModeSchema = z.enum(["classic", "real-world", "numbers-symbols", "custom", "code"]);
export type Mode = z.infer<typeof ModeSchema>;

/** SHA-256 hex digest (64 lowercase hex chars). */
export const TextHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export type TextHash = z.infer<typeof TextHashSchema>;

/** Semantic-version core (no prerelease/build tags in contracts). */
export const VersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * A captured typing session's raw event log (M1-01). The log is data only —
 * metrics are computed from it by packages/engine, never stored here.
 */
export const InputLogMetaSchema = z.strictObject({
  mode: ModeSchema,
  /** Content identifier of the typed text. */
  textId: z.string().min(1),
  /** SHA-256 of the typed text — binds the log to its text. */
  textHash: TextHashSchema,
  /** Layout the user declared (settings carry the effective layout too). */
  layout: z.string().min(1),
  settings: TypingSettingsSchema,
  /** Engine version that produced/validated this log. */
  engineVersion: VersionSchema,
  /** Present when the log belongs to a signed server session. */
  sessionId: z.string().min(1).optional(),
});

export const InputLogSchema = z.strictObject({
  events: z.array(KeyEventSchema).max(LIMITS.maxEventsPerLog),
  meta: InputLogMetaSchema,
});

export type InputLog = z.infer<typeof InputLogSchema>;
export type InputLogMeta = z.infer<typeof InputLogMetaSchema>;
