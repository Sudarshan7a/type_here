import { z } from "zod";

import { TextHashSchema } from "./input-log.js";

/**
 * A signed typing session issued by the server (M1-01; used from Phase 4 /
 * INT-05+ for verified results). The nonce is single-use and expiring —
 * enforcement lives server-side; this is the wire shape.
 */
export const SessionSchema = z.strictObject({
  id: z.string().min(1),
  /** Deterministic seed for content selection. */
  seed: z.string().min(1),
  /** Single-use anti-replay nonce. */
  nonce: z.string().min(1),
  /** SHA-256 of the text the session is bound to. */
  textHash: TextHashSchema,
  /** Expiry, ISO 8601 (UTC). */
  expiresAt: z.iso.datetime(),
});

export type Session = z.infer<typeof SessionSchema>;
