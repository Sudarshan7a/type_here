import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastify, { type FastifyInstance } from "fastify";

export interface AppOptions {
  /**
   * Requests per minute per IP for the global limiter. Default 100.
   * Tests lower this to verify the burst block (M0-12).
   */
  rateLimitMax?: number;
}

/**
 * Privacy (AGENTS.md rule 4): request/response bodies must never reach the
 * logs — they will eventually contain keystroke logs and typed text. Kept as
 * an exported constant so tests can pin it (M0-12).
 */
export const LOG_REDACT_PATHS = ["req.headers.authorization", "req.body", "res.body"] as const;

/**
 * RealType API (M0-10 scaffold, M0-12 security baseline). The health
 * endpoint is the deployment and uptime probe (M0-06/M0-07). Content
 * delivery, result verification, and integrity checks arrive with M3.
 *
 * Note: fastify plugin registrations are awaited — registering without
 * awaiting (fire-and-forget) was verified empirically to silently skip the
 * rate-limit hook (see BUILD-LOG, M0-12).
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: "info",
      redact: [...LOG_REDACT_PATHS],
    },
  });

  // M0-12: secure headers (strict CSP, no scripts, framing denied).
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // The API serves JSON only; scripts/pages are never served here.
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    xFrameOptions: { action: "deny" },
  });

  // M0-12: rate limiting at the edge, even at MVP.
  await app.register(rateLimit, {
    max: options.rateLimitMax ?? 100,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "realtype-api",
      time: new Date().toISOString(),
    };
  });

  return app;
}
