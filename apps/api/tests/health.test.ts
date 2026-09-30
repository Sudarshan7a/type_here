import { describe, expect, it } from "vitest";

import { buildApp } from "../src/index";

describe("API health endpoint (M0-10)", () => {
  it("GET /health responds 200 with status ok", async () => {
    const app = await buildApp({ rateLimitKey: "health-test" });
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string; service: string; time: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("realtype-api");
    expect(body.time).toEqual(expect.any(String));
  });
});
