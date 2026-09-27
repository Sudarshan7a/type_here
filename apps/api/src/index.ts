import fastify, { type FastifyInstance } from "fastify";

/**
 * RealType API (M0-10). The health endpoint is the deployment and uptime
 * probe (M0-06/M0-07). Content delivery, result verification, and integrity
 * checks arrive with M3 (implementation-guide chapter 8).
 */
export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: {
      level: "info",
      // Privacy (AGENTS.md rule 4): never log request bodies — they will
      // eventually contain keystroke logs and typed text.
      redact: ["req.headers.authorization", "req.body", "res.body"],
    },
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
