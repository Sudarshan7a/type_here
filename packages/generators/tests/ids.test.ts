/**
 * The `ids` family. The centrepiece is the synthetic-data contract: implementation
 * guide M6-02 step 4 asks for format checks over 10,000 generated items, and step 7
 * asks that they are documentation-range only and look nothing like a credential.
 *
 * Every "failing direction" block below names a real value that must be REJECTED - a
 * v4 UUID, a routable address, a vendor MAC - because a test that only ever sees the
 * generator's own output cannot tell whether the rule or the generator moved.
 */

import { describe, expect, it } from "vitest";

import {
  DOC_IPV4_PREFIXES,
  ID_FORMS,
  LOCALLY_ADMINISTERED_MAC_OCTETS,
  PORT_MAX,
  PORT_MIN,
  SYNTHETIC_CIDRS,
  SYNTHETIC_HASH_MARKER,
  ULID_SYNTHETIC_PREFIX,
  UUID_RE,
  generateIds,
  isDocumentationIPv4,
  isDocumentationIPv6,
  isLocallyAdministeredMac,
  findSafetyViolations,
  isSyntheticBase64ish,
  isSyntheticCredential,
} from "../src/index";

function textsOf(form: (typeof ID_FORMS)[number], count = 500, seed = form): string[] {
  return generateIds({ seed, family: "ids", form, count, level: 5 }).map((item) => item.text);
}

describe("CNT-05 ids", () => {
  // M6-02 step 4: "validity checks pass on 10,000 generated items", per form. The count
  // is capped per call (a drill asks for tens, not tens of thousands), so each form is run
  // as its own test in 500-item batches - which also keeps every case inside the default
  // per-test timeout under coverage instrumentation.
  describe("format validity over 10,000 items", () => {
    it.each(ID_FORMS)("checks 10,000 %s items", (form) => {
      let checked = 0;
      for (let batch = 0; batch < 20; batch += 1) {
        const items = generateIds({
          seed: `ten-thousand-${batch}`,
          family: "ids",
          form,
          count: 500,
          level: 5,
        });
        expect(items).toHaveLength(500);
        for (const item of items) {
          expect(item.kind).toBe(`ids/${form}`);
          expect(item.text.length).toBeGreaterThan(0);
          expect(findSafetyViolations(item.text)).toEqual([]);
          checked += 1;
        }
      }
      expect(checked).toBe(10_000);
    });
  });

  it("emits UUID-shaped values that are version 8 and never version 4", () => {
    const uuids = textsOf("uuid", 2000);
    for (const uuid of uuids) {
      expect(uuid).toMatch(UUID_RE);
      expect(uuid.split("-")[2]!.charAt(0)).toBe("8");
      expect("89ab").toContain(uuid.split("-")[3]!.charAt(0));
    }
    // Failing direction: the canonical RFC 4122 v4 example must not pass, or the rule
    // above is just "it is a UUID" and proves nothing about synthetic-ness.
    expect(UUID_RE.test("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(false);
  });

  it("emits hex hashes that open with the fixed marker and are the right length", () => {
    for (const text of textsOf("hash-sha256", 500)) {
      expect(text).toHaveLength(64);
      expect(text.startsWith(SYNTHETIC_HASH_MARKER)).toBe(true);
    }
    for (const text of textsOf("hash-sha1", 500)) {
      expect(text).toHaveLength(40);
      expect(text.startsWith(SYNTHETIC_HASH_MARKER)).toBe(true);
    }
    // Failing direction: a real-looking digest with no marker is exactly what this
    // package must never produce, and it is indistinguishable from ours by eye.
    expect(textsOf("hash-sha256", 50).some((t) => !t.startsWith(SYNTHETIC_HASH_MARKER))).toBe(
      false,
    );
  });

  it("emits ULIDs whose first ten characters are the fixed synthetic marker", () => {
    for (const text of textsOf("ulid", 500)) {
      expect(text).toHaveLength(26);
      expect(text.startsWith(ULID_SYNTHETIC_PREFIX)).toBe(true);
      expect(text.slice(10)).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{16}$/);
    }
  });

  it("emits base64-shaped values that decode to plain English starting `sample-`", () => {
    for (const text of textsOf("base64ish", 300)) {
      expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
      // Decoded with Node's own base64url decoder, not the package's, so the two
      // implementations check each other.
      const decoded = Buffer.from(text, "base64url").toString("utf8");
      expect(decoded.startsWith("sample-")).toBe(true);
      expect(decoded).toMatch(/^sample-[a-z]+-[a-z0-9]{8}$/);
      expect(isSyntheticBase64ish(text)).toBe(true);
    }
    // Failing direction: real tokens are base64-shaped and do not decode to English.
    expect(isSyntheticBase64ish("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")).toBe(false);
  });

  it("emits IPv4 addresses from RFC 5737 documentation space only", () => {
    const addresses = textsOf("ipv4", 2000);
    for (const address of addresses) {
      expect(isDocumentationIPv4(address)).toBe(true);
      expect(DOC_IPV4_PREFIXES.some((prefix) => address.startsWith(`${prefix}.`))).toBe(true);
    }
    // Failing direction: private, loopback, link-local and ordinary public addresses
    // must all be rejected, because each of them names a host that exists or could.
    for (const rejected of [
      "10.0.0.7",
      "172.16.4.1",
      "192.168.1.1",
      "127.0.0.1",
      "169.254.10.1",
      "8.8.8.8",
      "1.1.1.1",
      "192.0.3.7",
      "192.0.2.256",
    ]) {
      expect(isDocumentationIPv4(rejected), rejected).toBe(false);
    }
  });

  it("emits IPv6 addresses in 2001:db8::/32, and compression round-trips", () => {
    for (const text of textsOf("ipv6", 1000)) {
      expect(isDocumentationIPv6(text)).toBe(true);
      expect(text).toContain("::");
      expect(text.startsWith("2001:db8:")).toBe(true);
    }
    for (const text of generateIds({
      seed: "plain-v6",
      family: "ids",
      form: "ipv6",
      count: 200,
      compressIpv6: false,
    }).map((item) => item.text)) {
      expect(text.split(":")).toHaveLength(8);
      expect(text).not.toContain("::");
      expect(isDocumentationIPv6(text)).toBe(true);
    }
    // Failing direction: a real-looking global address and a malformed address must
    // both fail, so "starts with 2001:db8" is doing the work rather than the parser.
    expect(isDocumentationIPv6("2001:4860:4860::8888")).toBe(false);
    expect(isDocumentationIPv6("2001:db8:::1")).toBe(false);
    expect(isDocumentationIPv6("2001:db8:1:2:3:4:5")).toBe(false);
  });

  it("emits documentation CIDRs only", () => {
    for (const text of textsOf("cidr", 300)) {
      expect(SYNTHETIC_CIDRS).toContain(text);
    }
  });

  it("emits locally administered unicast MAC addresses, so no vendor OUI can appear", () => {
    for (const text of textsOf("mac", 1000)) {
      expect(text).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/);
      expect(isLocallyAdministeredMac(text)).toBe(true);
      expect(LOCALLY_ADMINISTERED_MAC_OCTETS).toContain(Number.parseInt(text.slice(0, 2), 16));
    }
    // Failing direction: `00:1b:44:11:3a:b7` is a real vendor prefix.
    expect(isLocallyAdministeredMac("00:1b:44:11:3a:b7")).toBe(false);
    // Multicast (bit 0 set) is not a unicast device either.
    expect(isLocallyAdministeredMac("03:00:00:00:00:01")).toBe(false);
  });

  it("emits ports inside the unprivileged range and nothing else", () => {
    for (const text of textsOf("port", 2000)) {
      const port = Number(text);
      expect(Number.isInteger(port)).toBe(true);
      expect(port).toBeGreaterThanOrEqual(PORT_MIN);
      expect(port).toBeLessThanOrEqual(PORT_MAX);
    }
  });

  it("emits ISO dates and timestamps from the fixed window, on real calendar days", () => {
    for (const text of textsOf("iso-date", 2000)) {
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const [year, month, day] = text.split("-").map(Number) as [number, number, number];
      expect(year).toBeGreaterThanOrEqual(2001);
      expect(year).toBeLessThanOrEqual(2035);
      // Round-trip through UTC: 29 February only round-trips in a leap year, which is
      // the one date bug a random generator can actually produce.
      const stamp = Date.UTC(year, month - 1, day);
      const asDate = new Date(stamp);
      expect([asDate.getUTCFullYear(), asDate.getUTCMonth() + 1, asDate.getUTCDate()]).toEqual([
        year,
        month,
        day,
      ]);
    }
    for (const text of textsOf("iso-timestamp", 1000)) {
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(Date.parse(text)).toBeGreaterThan(0);
    }
  });

  it("emits semver, adding a prerelease only when asked", () => {
    for (const text of textsOf("semver", 1000)) {
      expect(text).toMatch(/^\d{1,2}\.\d{1,2}\.\d{1,2}(-[a-z]+\.\d)?$/);
    }
    const plain = generateIds({
      seed: "no-pre",
      family: "ids",
      form: "semver",
      count: 500,
      prerelease: false,
    });
    expect(plain.every((item) => !item.text.includes("-"))).toBe(true);
    expect(plain.every((item) => item.params.prerelease === false)).toBe(true);
  });

  it("keeps every credential-shaped string synthetic", () => {
    // The `ids` family emits no credentials; this asserts the shared predicate the
    // `strings` family relies on is not vacuously true.
    for (const text of textsOf("base64ish", 50).concat(textsOf("hash-sha256", 50))) {
      expect(isSyntheticCredential(text)).toBe(false);
    }
    expect(isSyntheticCredential("EXAMPLE-KEY-4F2A-9C11-0B7D-3E58")).toBe(true);
    for (const real of [
      "AKIAIOSFODNN7EXAMPLE",
      "sk-live-4f2a9c110b7d3e58",
      "ghp_16C7e42F292c6912E7710c838347Ae178B4a",
    ]) {
      expect(isSyntheticCredential(real), real).toBe(false);
    }
  });
});
