import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { InputLogSchema } from "@realtype/schemas";

import { CaptureLog, type RawKeyInput } from "../src/capture";
import { SCENARIOS } from "../src/scenarios";

const key = (at: number, code = "KeyA", key_ = "a", type: "down" | "up" = "down"): RawKeyInput => ({
  code,
  key: key_,
  type,
  at,
  mods: { shift: false, ctrl: false, alt: false, meta: false },
  repeat: false,
  isTrusted: true,
});

const meta = {
  mode: "classic" as const,
  textId: "fixture-R01",
  textHash: "ab".repeat(32),
  layout: "qwerty-us",
  settings: {
    errorMode: "free" as const,
    autoIndent: false,
    autoPair: false,
    layout: "qwerty-us" as const,
  },
  engineVersion: "0.0.1",
  recorder: { userAgent: "vitest", note: "test keyboard" },
};

describe("capture module smoke (B2)", () => {
  it("produces a contract-valid InputLog (validated against @realtype/schemas)", () => {
    const log = new CaptureLog();
    log.recordMarker("focus", 100);
    log.recordKey(key(150));
    log.recordKey({ ...key(200, "Space", " ", "down") });
    log.recordKey(key(210, "KeyT", "t", "down"));
    log.recordMarker("visibility", 5_000, "hidden");
    log.recordMarker("visibility", 15_000, "visible");
    log.recordKey(key(15_050, "KeyH", "h", "down"));

    const out = log.toInputLog(meta);
    const parsed = InputLogSchema.parse(out);
    expect(parsed.events[0]?.t).toBe(0);
    expect(parsed.events[1]?.t).toBe(50);
    expect(parsed.markers?.[0]).toEqual({ kind: "focus", t: 0 });
    expect(parsed.markers?.[1]).toEqual({ kind: "visibility", t: 4_850, detail: "hidden" });
  });

  it("never emits negative timestamps (pre-keystroke markers clamp to 0)", () => {
    const log = new CaptureLog();
    log.recordMarker("blur", 50);
    log.recordKey(key(500));
    const parsed = InputLogSchema.parse(log.toInputLog(meta));
    expect(parsed.markers?.[0]?.t).toBe(0);
    expect(parsed.events[0]?.t).toBe(0);
  });

  it("rejects export with zero keystrokes (a log must contain events)", () => {
    const log = new CaptureLog();
    log.recordMarker("focus", 10);
    expect(() => log.toInputLog(meta)).toThrow(/at least one keystroke/);
  });

  it("enforces the 20,000-event limit", () => {
    const log = new CaptureLog(3);
    log.recordKey(key(1));
    log.recordKey(key(2));
    log.recordKey(key(3));
    expect(() => log.recordKey(key(4))).toThrow(/full/);
  });

  it("all 11 scenarios R01-R11 exist with prompt + instruction", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "R01",
      "R02",
      "R03",
      "R04",
      "R05",
      "R06",
      "R07",
      "R08",
      "R09",
      "R10",
      "R11",
    ]);
    for (const sc of SCENARIOS) {
      expect(sc.prompt.length).toBeGreaterThan(0);
      expect(sc.instruction.length).toBeGreaterThan(0);
    }
  });
});

describe("fixture recorder contains no network or storage code (B2)", () => {
  const root = join(__dirname, "..");

  function sourceFiles(): string[] {
    const files: string[] = [join(root, "index.html"), join(root, "src", "main.ts")];
    const srcDir = join(root, "src");
    for (const name of readdirSync(srcDir)) {
      const p = join(srcDir, name);
      files.push(p);
    }
    return files;
  }

  const FORBIDDEN = [
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "sendBeacon",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "http://",
    "https://",
  ];

  for (const file of sourceFiles()) {
    it(`${file.split(/[\\/]/).pop()} has no network/storage APIs or URLs`, () => {
      const content = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        expect(content.includes(pattern), `${file} contains ${pattern}`).toBe(false);
      }
    });
  }

  it("index.html declares a CSP with connect-src 'none'", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
    expect(csp).toBeDefined();
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("script-src 'self'");
  });
});
