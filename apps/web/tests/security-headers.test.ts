import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Block A5: the static host's security headers live in vercel.json (single
 * source of truth, also served by `vite preview`). This test parses the config
 * and asserts every directive the host must send.
 */

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

const config = JSON.parse(
  readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"),
) as VercelConfig;

function header(key: string): string {
  const all = config.headers.flatMap((rule) => rule.headers);
  const found = all.find((h) => h.key.toLowerCase() === key.toLowerCase());
  if (found === undefined) throw new Error(`missing header: ${key}`);
  return found.value;
}

function cspDirectives(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const directive of csp
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)) {
    const [name, ...values] = directive.split(/\s+/);
    if (name === undefined) continue;
    map.set(name.toLowerCase(), values);
  }
  return map;
}

describe("static host security headers (A5)", () => {
  const csp = header("Content-Security-Policy");
  const d = cspDirectives(csp);

  it("applies to every route", () => {
    expect(config.headers[0]?.source).toBe("/(.*)");
  });

  it("default-src, script-src, style-src are 'self' — no inline, no eval, no external origins", () => {
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("script-src")).toEqual(["'self'"]);
    expect(d.get("style-src")).toEqual(["'self'"]);
  });

  it("img-src allows self and data: only", () => {
    expect(d.get("img-src")).toEqual(["'self'", "data:"]);
  });

  it("connect-src is 'self' plus exactly one API origin (placeholder until the real domain exists)", () => {
    const connect = d.get("connect-src");
    expect(connect?.[0]).toBe("'self'");
    const origins = connect?.slice(1) ?? [];
    expect(origins).toHaveLength(1);
    expect(origins[0]).toMatch(/^https:\/\//);
  });

  it("locks down objects, base, forms, and framing", () => {
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("sends Referrer-Policy and Permissions-Policy", () => {
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toContain("camera=()");
    expect(header("Permissions-Policy")).toContain("microphone=()");
    expect(header("Permissions-Policy")).toContain("geolocation=()");
  });

  it("sends nosniff, X-Frame-Options DENY, and HSTS", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("Strict-Transport-Security")).toContain("max-age=63072000");
  });
});
