import { describe, expect, it } from "vitest";

import {
  BLOCKED_FIELD_RE,
  isValidName,
  isValidRelease,
  isValidRequestId,
  isValidRoute,
  isValidStatus,
  sanitizeStack,
  scrubError,
  type ScrubContext,
} from "../src/index";

const WIN_STACK = [
  "Error: boom CANARY-ish",
  "    at foo (C:\\Users\\Sudupa\\Documents\\app\\src\\index.ts:10:5)",
  "    at bar (D:\\code\\app\\lib\\util.js:2:1)",
].join("\n");

describe("M0-07 scrubError(): stack sanitization", () => {
  it("drops the message line and strips absolute Windows paths", () => {
    const out = sanitizeStack(WIN_STACK) ?? "";
    expect(out).not.toContain("boom");
    expect(out).not.toContain("Sudupa");
    expect(out).toContain("at foo (<path>");
    expect(out).toContain("at bar (<path>");
  });

  it("strips POSIX home-rooted absolute paths", () => {
    const out = sanitizeStack("    at f (/home/dev/app/src/x.js:3:1)") ?? "";
    expect(out).not.toContain("/home");
    expect(out).toContain("(<path>)");
  });

  it("strips file:// URL frames", () => {
    const out = sanitizeStack("    at g (file:///C:/Users/bob/app.js:1:1)") ?? "";
    expect(out).not.toContain("bob");
    expect(out).toContain("<path>");
  });

  it("strips query strings from frame URLs", () => {
    const out = sanitizeStack("    at h (https://cdn.example.com/main.js?token=sekrit:2:2)") ?? "";
    expect(out).not.toContain("token");
    expect(out).not.toContain("sekrit");
  });

  it("keeps only frame lines and caps at 50 frames", () => {
    const frames = Array.from({ length: 60 }, (_, i) => `    at f${i} (a.js:${i}:1`);
    const out = sanitizeStack(`Error: m\n${frames.join("\n")}\nrandom non-frame line`) ?? "";
    const lines = out.split("\n");
    expect(lines).toHaveLength(50);
    expect(lines[0]).toContain("f0");
  });

  it("returns undefined for non-strings and empty results", () => {
    expect(sanitizeStack(123)).toBeUndefined();
    expect(sanitizeStack(null)).toBeUndefined();
    expect(sanitizeStack("no frames at all here")).toBeUndefined();
  });
});

describe("M0-07 scrubError(): field validators", () => {
  it("name: identifier-like strings only", () => {
    expect(isValidName("TypeError")).toBe("TypeError");
    expect(isValidName("Error with spaces")).toBeUndefined();
    expect(isValidName("")).toBeUndefined();
    expect(isValidName(42)).toBeUndefined();
  });

  it("release: semver core only", () => {
    expect(isValidRelease("1.2.3")).toBe("1.2.3");
    expect(isValidRelease("v1.2.3")).toBeUndefined();
    expect(isValidRelease("latest")).toBeUndefined();
  });

  it("route: lowercase path-only, query stripped, no weird characters", () => {
    expect(isValidRoute("/api/results")).toBe("/api/results");
    expect(isValidRoute("/api/results?typed=xyz")).toBe("/api/results");
    expect(isValidRoute("https://evil.example.com")).toBeUndefined();
    expect(isValidRoute("/has space")).toBeUndefined();
    expect(isValidRoute("/x'; DROP")).toBeUndefined();
    expect(isValidRoute("/API_SHOUTY")).toBeUndefined();
    expect(isValidRoute(42)).toBeUndefined();
  });

  it("status: integer 100..599 only", () => {
    expect(isValidStatus(200)).toBe(200);
    expect(isValidStatus(500)).toBe(500);
    expect(isValidStatus(99)).toBeUndefined();
    expect(isValidStatus(600)).toBeUndefined();
    expect(isValidStatus(404.5)).toBeUndefined();
    expect(isValidStatus("500")).toBeUndefined();
  });

  it("request_id: lowercase machine-generated tokens only", () => {
    expect(isValidRequestId("req-123-abc")).toBe("req-123-abc");
    expect(isValidRequestId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(isValidRequestId("REQ_123")).toBeUndefined();
    expect(isValidRequestId("has spaces")).toBeUndefined();
    expect(isValidRequestId(`x`.repeat(65))).toBeUndefined();
    expect(isValidRequestId(null)).toBeUndefined();
  });
});

describe("M0-07 scrubError(): allowlist behavior", () => {
  it("keeps name and sanitized stack from a plain Error; drops the message", () => {
    const scrubbed = scrubError(new TypeError("secret message contents"));
    expect(scrubbed).not.toBeNull();
    expect(scrubbed?.name).toBe("TypeError");
    expect(JSON.stringify(scrubbed)).not.toContain("secret message");
  });

  it("collects and sanitizes a stack from a plain (non-Error) object", () => {
    const scrubbed = scrubError({
      name: "E2E",
      stack: "Error: m\n    at f (C:\\Users\\someone\\app\\a.js:1:1)",
    });
    expect(scrubbed?.name).toBe("E2E");
    expect(scrubbed?.stack).toBe("    at f (<path>)");
  });

  it("drops every blocklisted field name at the top level", () => {
    const dirty = {
      name: "E2E",
      text: "a",
      typed: "b",
      log: "c",
      events: [{ x: 1 }],
      keystrokes: "d",
      content: "e",
      body: "f",
      userInput: "g",
      requestBody: "h",
      breadcrumbs: [{ message: "free text crumb" }],
      headers: { authorization: "Bearer xyz" },
    };
    const scrubbed = scrubError(dirty);
    expect(scrubbed).toEqual({ name: "E2E" });
  });

  it("never enters blocklisted fields, even to look for allowlisted data", () => {
    const scrubbed = scrubError({
      name: "E2E",
      content: { request_id: "req-1" },
      body: { environment: "prod" },
    });
    expect(scrubbed).toEqual({ name: "E2E" });
  });

  it("collects allowlisted fields from nested context objects and arrays", () => {
    const scrubbed = scrubError({
      name: "E2E",
      extra: {
        environment: "prod",
        request_id: "req-1",
        status: 500,
        route: "/api/results?typed=secret",
      },
      frames: [{ release: "1.2.3" }, { requestBody: "dirty" }],
    });
    expect(scrubbed).toEqual({
      name: "E2E",
      environment: "prod",
      request_id: "req-1",
      status: 500,
      route: "/api/results",
      release: "1.2.3",
    });
  });

  it("drops invalid values of allowlisted fields instead of failing", () => {
    const scrubbed = scrubError({
      name: "not a valid name!!",
      status: 42,
      route: "javascript:alert(1)",
      request_id: "bad id",
      release: "latest",
      environment: "production",
    });
    expect(scrubbed).toBeNull();
  });

  it("scrubs arbitrarily deep nesting up to a depth cap", () => {
    const deep = { l0: { l1: { l2: { l3: { l4: { request_id: "too-deep" } } } } } };
    expect(scrubError(deep)).toBeNull();
    const inReach = { l0: { l1: { l2: { l3: { request_id: "req-ok" } } } } };
    expect(scrubError(inReach)).toEqual({ request_id: "req-ok" });
  });

  it("handles cycles without hanging", () => {
    const cyclic: Record<string, unknown> = { name: "Loop" };
    cyclic.self = cyclic;
    const scrubbed = scrubError(cyclic);
    expect(scrubbed).toEqual({ name: "Loop" });
  });

  it("survives hostile objects whose keys cannot be enumerated", () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("nope");
        },
      },
    );
    expect(scrubError(hostile)).toBeNull();
  });

  it("drops error causes entirely (not on the keep-list)", () => {
    const scrubbed = scrubError(new Error("outer", { cause: new Error("inner") }));
    expect(scrubbed).not.toBeNull();
    expect(scrubbed && "cause" in scrubbed).toBe(false);
  });

  it("returns null when nothing keepable remains", () => {
    expect(scrubError(42)).toBeNull();
    expect(scrubError(null)).toBeNull();
    expect(scrubError({ foo: "bar" })).toBeNull();
    expect(scrubError("just a string")).toBeNull();
  });

  it("applies explicit context and lets it override found values", () => {
    const context: ScrubContext = {
      release: "0.0.1",
      environment: "dev",
      route: "/api/telemetry",
      status: 500,
      request_id: "req-ctx",
    };
    const scrubbed = scrubError({ name: "E2E", environment: "prod" }, context);
    expect(scrubbed).toEqual({
      name: "E2E",
      release: "0.0.1",
      environment: "dev",
      route: "/api/telemetry",
      status: 500,
      request_id: "req-ctx",
    });
  });

  it("drops invalid explicit context values", () => {
    const scrubbed = scrubError({ name: "E2E" }, { status: 999, route: "nope" });
    expect(scrubbed).toEqual({ name: "E2E" });
  });

  it("BLOCKED_FIELD_RE matches the mandated field-name families", () => {
    for (const key of [
      "text",
      "userTyped",
      "log",
      "events",
      "keystrokes",
      "content",
      "body",
      "userInput",
      "REQUEST_BODY",
    ]) {
      expect(BLOCKED_FIELD_RE.test(key), key).toBe(true);
    }
    for (const key of [
      "name",
      "stack",
      "release",
      "environment",
      "route",
      "status",
      "request_id",
    ]) {
      expect(BLOCKED_FIELD_RE.test(key), key).toBe(false);
    }
  });
});
