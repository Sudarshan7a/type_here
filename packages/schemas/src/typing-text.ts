import { z } from "zod";

import { LIMITS } from "./limits.js";

/**
 * A text to type (M1-01): id + the text itself. The text hash is computed by
 * the engine and carried in InputLog.meta.textHash, not here.
 */
export const TypingTextSchema = z.strictObject({
  /** Stable content identifier (content pipeline key). */
  id: z.string().min(1),
  /** The literal text, 1..maxTextLength characters. */
  text: z.string().min(1).max(LIMITS.maxTextLength),
});

export type TypingText = z.infer<typeof TypingTextSchema>;
