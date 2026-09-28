import { describe, expect, it } from "vitest";

import { LOG_REDACT_PATHS, buildApp } from "../src/index";

describe("API security baseline (M0-12)", () => {
  it("responds with security headers on /health", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain("script-src 'none'");
  });

  it("blocks a burst that exceeds the rate limit", async () => {
    const app = await buildApp({ rateLimitMax: 3 });
    let lastStatus = 0;
    for (let i = 0; i < 5; i++) {
      const response = await app.inject({ method: "GET", url: "/health" });
      lastStatus = response.statusCode;
    }
    expect(lastStatus).toBe(429);
  });

  it("pins the privacy log-redaction paths (never log request/response bodies)", () => {
    expect(LOG_REDACT_PATHS).toContain("req.body");
    expect(LOG_REDACT_PATHS).toContain("res.body");
    expect(LOG_REDACT_PATHS).toContain("req.headers.authorization");
  });
});
