/**
 * The synthetic-data gate itself (CNT-05's hard rule: synthetic only, no real data).
 *
 * These tests treat the generator as untrusted input. They are the ones a reviewer
 * should read first, because "we never emit real data" is a claim about output, and the
 * only honest way to check it is to run the check over a lot of output.
 */

import { describe, expect, it } from "vitest";

import {
  BASE64_PLAINTEXT_PREFIX,
  GENERATOR_FAMILIES,
  base64urlDecode,
  base64urlEncode,
  bracketBalance,
  expandIpv6,
  findSafetyViolations,
  generate,
  isDocumentationIPv4,
  isDocumentationIPv6,
} from "../src/index";

describe("CNT-05 synthetic-data gate", () => {
  it("finds nothing suspicious in a large corpus from every family, level and skin", () => {
    for (const family of GENERATOR_FAMILIES) {
      for (const level of [1, 2, 3, 4, 5]) {
        for (const language of ["javascript", "python", "generic"]) {
          const set = generate({ seed: `gate-${level}`, family, count: 300, level, language });
          for (const item of set.items) {
            expect(findSafetyViolations(item.text), `${item.kind}: ${item.text}`).toEqual([]);
          }
        }
      }
    }
  });

  it("flags a routable address, a live domain and a real credential prefix", () => {
    // Failing direction: a gate that has only ever seen synthetic output is
    // indistinguishable from no gate at all.
    const routable = findSafetyViolations("host 93.184.216.34:8080").map((v) => v.kind);
    expect(routable).toContain("ipv4-outside-documentation-space");

    const email = findSafetyViolations("ops@acme-internal.io").map((v) => v.kind);
    expect(email).toContain("email-outside-example-domain");

    const credential = findSafetyViolations("AKIAIOSFODNN7EXAMPLE").map((v) => v.kind);
    expect(credential).toContain("real-credential-prefix");
  });

  it("accepts documentation addresses and example domains, and nothing else", () => {
    expect(findSafetyViolations("192.0.2.10 198.51.100.7 203.0.113.9")).toEqual([]);
    expect(findSafetyViolations("2001:db8::a1b2")).toEqual([]);
    expect(findSafetyViolations("docs@example.com")).toEqual([]);
    expect(findSafetyViolations("docs@sub.example.org")).toEqual([]);
    expect(findSafetyViolations("docs@example.co.uk")).not.toEqual([]);
  });

  it("does not mistake identifier punctuation for an address", () => {
    // The `::` in a namespace identifier is hex-and-colons text that *parses* as an
    // IPv6 address. Without a boundary check the gate would reject every namespace
    // identifier it ever saw.
    expect(findSafetyViolations("logging::file_handler")).toEqual([]);
    expect(findSafetyViolations("db::migrations::pending")).toEqual([]);
    expect(findSafetyViolations("peer 2001:4860:4860::8888")).not.toEqual([]);
    expect(findSafetyViolations("02:1a:2b:3c:4d:5e")).toEqual([]);
    expect(findSafetyViolations("2024-03-17T08:41:12.042Z")).toEqual([]);
  });

  it("expands IPv6 exactly as the standard says, and rejects what it does not", () => {
    expect(expandIpv6("2001:db8::1")).toEqual(["2001", "db8", "0", "0", "0", "0", "0", "1"]);
    expect(expandIpv6("::")).toEqual(Array.from({ length: 8 }, () => "0"));
    expect(expandIpv6("::1")).toEqual(["0", "0", "0", "0", "0", "0", "0", "1"]);
    expect(expandIpv6("2001:db8:0:1:1:1:1:1")).toEqual([
      "2001",
      "db8",
      "0",
      "1",
      "1",
      "1",
      "1",
      "1",
    ]);
    expect(expandIpv6("1::2::3")).toBeNull();
    expect(expandIpv6("1:2:3")).toBeNull();
    expect(expandIpv6("1:2:3:4:5:6:7:8:9")).toBeNull();
    // Eight explicit groups *and* a `::` is one group too many, even though each half
    // on its own would be legal.
    expect(expandIpv6("1:2:3:4:5:6:7:8::")).toBeNull();
    expect(expandIpv6("::1:2:3:4:5:6:7:8")).toBeNull();
    expect(expandIpv6("2001:db8:zzzz::1")).toBeNull();
    expect(expandIpv6("db::")).not.toBeNull();
    expect(isDocumentationIPv6("db::")).toBe(false);
  });

  it("round-trips its own base64url encoder against Node's decoder", () => {
    for (const plaintext of ["sample-buffer-7f3d9a2b", "a", "ab", "abc", "abcd", "abcde"]) {
      const encoded = base64urlEncode(plaintext);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      // Independent decoder: if the encoder and this check ever shared a bug, both
      // would have to be wrong in the same direction to pass.
      expect(Buffer.from(encoded, "base64url").toString("utf8")).toBe(plaintext);
    }
    expect(base64urlDecode(base64urlEncode("sample-cursor-00000000"))).toBe(
      "sample-cursor-00000000",
    );
    expect(base64urlDecode("not base64!")).toBeNull();
    // Too short to be a generated item, so the decoder declines rather than guessing.
    expect(base64urlDecode("short")).toBeNull();
  });

  it("keeps the base64 plaintext marker honest", () => {
    expect(BASE64_PLAINTEXT_PREFIX).toBe("sample-");
    expect(base64urlDecode(base64urlEncode("sample-cursor-00000000"))).toBe(
      "sample-cursor-00000000",
    );
  });

  it("counts bracket depth without being fooled by content characters", () => {
    expect(bracketBalance("(a[b]c)").imbalance).toBe(0);
    expect(bracketBalance("(a[b]c)").maxDepth).toBe(2);
    expect(bracketBalance("(a[b)c").imbalance).toBe(1);
    expect(bracketBalance("[[]]").maxDepth).toBe(2);
    expect(bracketBalance("ab").imbalance).toBe(0);
    expect(isDocumentationIPv4("192.0.2")).toBe(false);
    expect(isDocumentationIPv4("192.0.2.10")).toBe(true);
  });
});
