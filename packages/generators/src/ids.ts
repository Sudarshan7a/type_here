/**
 * The `ids` family (CNT-05; master-spec §7 tier 6 "Number systems & IDs",
 * implementation guide M6-02 item 3).
 *
 * BOUNDARY WITH PRG-13. PRG-13 owns the drill and the ID-level metrics; this module
 * owns the material. Every shape here is synthetic by construction, and the reasons
 * live in ./safety.ts, which also holds the predicates the tests assert against. The
 * three that shape the *bytes* rather than just the validation:
 *
 *  - UUIDs are version **8** (RFC 9562's custom/experimental version) with an RFC 4122
 *    variant nibble. A v4 UUID is 122 random bits and therefore indistinguishable
 *    from a real one, which is exactly the collision the ledger's "no real data" note
 *    is about. Version 8 keeps the syntax real and the identity impossible.
 *  - Hex hashes open with a fixed 16-character marker and ULIDs with a fixed readable
 *    prefix, so "obviously synthetic" is structural rather than a label nobody reads.
 *  - IPv4/IPv6 are documentation space and MACs are locally administered: not one of
 *    these values can name a real host or a real vendor interface.
 *
 * NOT GENERATED, ON PURPOSE:
 *  - ISBN/EAN/credit-card-shaped numbers. They are in no spec tier, and a valid check
 *    digit on an invented number is a number that validates against a real registry's
 *    algorithm - the precise "looks real but is invented" hazard this package exists
 *    to avoid.
 *  - Phone numbers, national IDs, IBANs: same reason. A checksum a foreign validator
 *    accepts is a value that can be mistaken for a real record.
 *  - Live host names. The skill reserves `example.com|org|net` for synthetic hosts,
 *    which is why `findSafetyViolations` tolerates them; no family here emits one
 *    today, and a future family that wants URLs must go through that predicate.
 */

import type { SeededRng } from "./prng.js";
import { SeededRng as Rng, deriveSeed } from "./prng.js";
import {
  BASE64_PLAINTEXT_PREFIX,
  DOC_IPV4_PREFIXES,
  LOCALLY_ADMINISTERED_MAC_OCTETS,
  PORT_MAX,
  PORT_MIN,
  SYNTHETIC_CIDRS,
  SYNTHETIC_DATE_MAX,
  SYNTHETIC_DATE_MIN,
  SYNTHETIC_HASH_MARKER,
  ULID_SYNTHETIC_PREFIX,
  UUID_SYNTHETIC_VERSION,
  UUID_VARIANT_NIBBLES,
  base64urlEncode,
} from "./safety.js";
import { clampCount, clampLevel, makeItem, pickForm, resolveSkin } from "./shared.js";
import type { GeneratedItem, IdForm, IdSetOptions } from "./types.js";
import { TECH_WORDS } from "./words.js";

export const ID_FORMS: readonly IdForm[] = Object.freeze([
  "uuid",
  "ulid",
  "hash-sha1",
  "hash-sha256",
  "base64ish",
  "ipv4",
  "ipv6",
  "cidr",
  "mac",
  "port",
  "iso-date",
  "iso-timestamp",
  "semver",
]);

/**
 * Form pools per level. `[proposal]` (§10.5): ordered by symbol density and by how
 * much *reading* a shape needs as opposed to typing, which is why addresses and dates
 * open at level 2 and IPv6 (four colons and a compressed run) waits for level 4.
 */
const ID_FORMS_BY_LEVEL: Readonly<Record<number, readonly IdForm[]>> = Object.freeze({
  1: ["port", "ipv4"],
  2: ["port", "ipv4", "uuid", "semver", "iso-date"],
  3: ["uuid", "semver", "iso-date", "hash-sha256", "mac", "cidr", "iso-timestamp"],
  4: [
    "uuid",
    "ulid",
    "hash-sha1",
    "hash-sha256",
    "base64ish",
    "ipv6",
    "cidr",
    "mac",
    "iso-timestamp",
  ],
  5: ID_FORMS,
});

const LOWER_HEX = "0123456789abcdef";
const BASE32_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BASE36_TAIL = "abcdefghijklmnopqrstuvwxyz0123456789";

interface Built {
  readonly text: string;
  readonly params: Readonly<Record<string, string | number | boolean>>;
}

function buildUuid(rng: SeededRng): Built {
  // Built group by group so the two fixed nibbles are written down where they are
  // rather than patched into a 32-character string by index arithmetic.
  const groups = [
    rng.fromAlphabet(LOWER_HEX, 8),
    rng.fromAlphabet(LOWER_HEX, 4),
    `${UUID_SYNTHETIC_VERSION}${rng.fromAlphabet(LOWER_HEX, 3)}`,
    `${rng.pick(UUID_VARIANT_NIBBLES)}${rng.fromAlphabet(LOWER_HEX, 3)}`,
    rng.fromAlphabet(LOWER_HEX, 12),
  ];
  return { text: groups.join("-"), params: { version: UUID_SYNTHETIC_VERSION } };
}

function buildUlid(rng: SeededRng): Built {
  return {
    text: ULID_SYNTHETIC_PREFIX + rng.fromAlphabet(BASE32_CROCKFORD, 16),
    params: { marker: ULID_SYNTHETIC_PREFIX },
  };
}

function buildHash(rng: SeededRng, form: "hash-sha1" | "hash-sha256"): Built {
  const total = form === "hash-sha1" ? 40 : 64;
  return {
    text: SYNTHETIC_HASH_MARKER + rng.fromAlphabet(LOWER_HEX, total - SYNTHETIC_HASH_MARKER.length),
    params: { length: total, marker: SYNTHETIC_HASH_MARKER },
  };
}

function buildBase64ish(rng: SeededRng): Built {
  // Plaintext is `sample-<word>-<tail>`: an item that decodes to English cannot be
  // mistaken for a signed token, and the decoded text is a legible reason why.
  const plaintext = `${BASE64_PLAINTEXT_PREFIX}${rng.pick(TECH_WORDS)}-${rng.fromAlphabet(BASE36_TAIL, 8)}`;
  return { text: base64urlEncode(plaintext), params: {} };
}

function buildIpv4(rng: SeededRng): Built {
  const prefix = rng.pick(DOC_IPV4_PREFIXES);
  return { text: `${prefix}.${rng.int(0, 255)}`, params: { prefix } };
}

/**
 * A group whose first digit is not zero, so "0000" can never appear by accident and a
 * planted zero run is unambiguously the longest one - which is the run RFC 4291 says
 * must be the compressed one.
 */
function nonZeroGroup(rng: SeededRng): string {
  return rng.fromAlphabet("123456789abcdef", 1) + rng.fromAlphabet(LOWER_HEX, 3);
}

function buildIpv6(rng: SeededRng, compress: boolean): Built {
  const randomGroups = () => Array.from({ length: 6 }, () => nonZeroGroup(rng));
  if (!compress) {
    return { text: ["2001", "db8", ...randomGroups()].join(":"), params: { compressed: false } };
  }
  // `::` may only stand for a run of two or more zero groups, and the longest run is
  // the one that compresses (RFC 4291 2.2.2). The run is *planted* rather than waited
  // for: four random hex digits are "0000" once in 65,536, so re-drawing until two
  // neighbours happened to be zero would spin for ever.
  const start = rng.int(2, 5);
  const run = rng.int(2, 3);
  const groups = ["2001", "db8"];
  for (let index = 2; index < 8; index += 1) {
    const inRun = index >= start && index < start + run;
    groups.push(inRun ? "0" : nonZeroGroup(rng));
  }
  const head = groups.slice(0, start).join(":");
  const tail = groups.slice(start + run).join(":");
  return { text: `${head}::${tail}`, params: { compressed: true, zeroRun: run } };
}

function buildCidr(rng: SeededRng): Built {
  const text = rng.pick(SYNTHETIC_CIDRS);
  return { text, params: { network: text } };
}

function buildMac(rng: SeededRng): Built {
  const octets = [
    rng.pick(LOCALLY_ADMINISTERED_MAC_OCTETS),
    rng.int(0, 255),
    rng.int(0, 255),
    rng.int(0, 255),
    rng.int(0, 255),
    rng.int(0, 255),
  ];
  return { text: octets.map((octet) => octet.toString(16).padStart(2, "0")).join(":"), params: {} };
}

function buildPort(rng: SeededRng): Built {
  const port = rng.int(PORT_MIN, PORT_MAX);
  return { text: String(port), params: { port } };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1]!;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function buildIsoDate(rng: SeededRng): Built {
  const year = rng.int(
    Number(SYNTHETIC_DATE_MIN.slice(0, 4)),
    Number(SYNTHETIC_DATE_MAX.slice(0, 4)),
  );
  const month = rng.int(1, 12);
  const day = rng.int(1, daysInMonth(year, month));
  return {
    text: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`,
    params: { year, month, day },
  };
}

function buildIsoTimestamp(rng: SeededRng): Built {
  const date = buildIsoDate(rng);
  const time = `${pad(rng.int(0, 23), 2)}:${pad(rng.int(0, 59), 2)}:${pad(rng.int(0, 59), 2)}`;
  return {
    text: `${date.text}T${time}.${pad(rng.int(0, 999), 3)}Z`,
    params: { date: date.text },
  };
}

function buildSemver(rng: SeededRng, prerelease: boolean): Built {
  const core = `${rng.int(0, 30)}.${rng.int(0, 25)}.${rng.int(0, 30)}`;
  if (!prerelease || !rng.chance(0.35)) {
    return { text: core, params: { prerelease: false } };
  }
  return {
    text: `${core}-${rng.pick(["alpha", "beta", "rc"])}.${rng.int(1, 9)}`,
    params: { prerelease: true },
  };
}

function buildId(rng: SeededRng, form: IdForm, compress: boolean, prerelease: boolean): Built {
  switch (form) {
    case "uuid":
      return buildUuid(rng);
    case "ulid":
      return buildUlid(rng);
    case "hash-sha1":
      return buildHash(rng, "hash-sha1");
    case "hash-sha256":
      return buildHash(rng, "hash-sha256");
    case "base64ish":
      return buildBase64ish(rng);
    case "ipv4":
      return buildIpv4(rng);
    case "ipv6":
      return buildIpv6(rng, compress);
    case "cidr":
      return buildCidr(rng);
    case "mac":
      return buildMac(rng);
    case "port":
      return buildPort(rng);
    case "iso-date":
      return buildIsoDate(rng);
    case "iso-timestamp":
      return buildIsoTimestamp(rng);
    case "semver":
      return buildSemver(rng, prerelease);
  }
}

export function generateIds(options: IdSetOptions): readonly GeneratedItem[] {
  const level = clampLevel(options.level);
  const count = clampCount(options.count);
  const allowed = ID_FORMS_BY_LEVEL[level]!;
  const compress = options.compressIpv6 ?? true;
  const prerelease = options.prerelease ?? true;
  const profile = resolveSkin(options.language);
  return Array.from({ length: count }, (_, index) => {
    const rng = new Rng(deriveSeed(options.seed, "ids", index));
    const form = pickForm(options.form, allowed, rng);
    const built = buildId(rng, form, compress, prerelease);
    // The form is recorded on every item whatever the builder added, so a stored
    // drill can be re-derived from its seed without re-reading the drill logic.
    return makeItem("ids", `ids/${form}`, profile, built.text, { form, ...built.params });
  });
}
