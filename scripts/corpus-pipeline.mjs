/**
 * Corpus pipeline (CNT-01).
 *
 * Turns the markdown corpus (docs/content-*.md plus the licence register) into
 * a typed, machine-readable build. Pure: markdown strings in, plain objects
 * out. No filesystem, no clock, no randomness, no network. Same input always
 * produces byte-identical output, which is what makes the committed artifact
 * (`content/corpus.json`) reviewable in a diff instead of being an untraceable
 * build-time side effect.
 *
 * The four stages CNT-01 names, in the order they run:
 *
 *   1. licence per item  - every item is joined to its register row and the
 *                          row's licence is classified with the SAME
 *                          `classifyLicense` the CNT-07 gate uses, so an item
 *                          can never be emitted carrying a licence that gate
 *                          would reject. Missing / copyleft / unknown is a hard
 *                          failure, never a default.
 *   2. dedupe            - duplicate *text*, detected after an explicitly
 *                          stated normalisation (`normaliseForDedupe`).
 *                          Policy: report-and-drop, keeping the lowest-sorting
 *                          id of each group. Justified in docs/corpus-pipeline.md.
 *   3. sensitive filter  - BLOCKING, with an explicit allowlist for deliberate
 *                          cases (`SENSITIVE_ALLOWLIST`). No real secret may
 *                          enter the corpus: PRG-13 / CNT-05 own synthetic data.
 *   4. tags              - the register's `content_type_tag`, normalised to a
 *                          small explicit PROVISIONAL enum (register section 5
 *                          item 7 leaves the real taxonomy open).
 *
 * The licence gate's parsers are IMPORTED from scripts/check-content-licenses.mjs
 * (`collectCorpusInputs`, `parseRegisterMarkdown`, `discoverItemIds`,
 * `classifyLicense`, `isShippableStatus`, `expandIdRange`) rather than
 * reimplemented: two parsers for the same tables is how the two gates would
 * silently disagree about what "licensed" means.
 */
import { createHash } from "node:crypto";

import {
  classifyLicense,
  collectCorpusInputs,
  discoverItemIds,
  expandIdRange,
  isShippableStatus,
  parseRegisterMarkdown,
} from "./check-content-licenses.mjs";

/**
 * Re-exported so the corpus CLI and the CNT-07 gate cannot disagree about which
 * files count as corpus input: both call the same collector.
 */
export { collectCorpusInputs };

/** Licensable families this pipeline emits typing content for. */
export const ITEM_FAMILIES = Object.freeze(["PROSE", "QUOTE", "CODE", "WORDLIST", "COMP"]);

/** Corpus contract version. Bump on any shape change. */
export const CORPUS_VERSION = "1.0.0";

/**
 * Deterministic family order for the artifact. Explicit rather than alphabetical
 * so the diff stays readable as families are added.
 */
const FAMILY_ORDER = ITEM_FAMILIES;

/**
 * PROVISIONAL content-type taxonomy. Register section 5, item 7: "Attach
 * `content_type_tag` values to a formal, finalized taxonomy once the
 * content-selector system (6.6) is built ... the tags used here were chosen for
 * readability in this document". Small, explicit, and closed: an unmapped
 * register tag fails the build rather than being invented on the fly.
 */
export const CONTENT_TYPES = Object.freeze([
  "prose.everyday",
  "prose.workplace",
  "prose.technical",
  "prose.relationships",
  "prose.news-explanatory",
  "prose.travel",
  "quote.aphoristic-short",
  "quote.aphoristic-medium",
  "quote.aphoristic-long",
  "quote.historical",
  "quote.historical-fable",
  "quote.proverb",
  "code.utility",
  "code.algorithm",
  "code.web",
  "code.react",
  "wordlist.classic",
  "composition.reply",
  "composition.explain",
  "composition.reflect",
  "composition.describe",
  "composition.sprint",
]);

/**
 * Register `content_type_tag` -> provisional enum, keyed by `normaliseTagKey`.
 *
 * Total over every tag the register attaches to a LICENSABLE TYPING item. An
 * unmapped tag is a build failure, which is the point: extending the taxonomy
 * must be a deliberate edit here, reviewed in a diff.
 *
 * The register's three FONT tags (`typing / monospace`, `ui / body`,
 * `ui / legible alternative`) are deliberately absent. Font rows are binary
 * assets with no typing text, so they never reach this map; if one ever did, the
 * build would fail closed and ask whether a font has a typing content type at
 * all, which is the right question to be asked at that point.
 */
const REGISTER_TAG_MAP = new Map(
  Object.entries({
    "everyday/personal": "prose.everyday",
    "workplace/professional": "prose.workplace",
    "technical/instructional": "prose.technical",
    "relationships/social": "prose.relationships",
    "news/explanatory": "prose.news-explanatory",
    "news/travel": "prose.travel",
    "aphoristic/short": "quote.aphoristic-short",
    "aphoristic/medium": "quote.aphoristic-medium",
    "aphoristic/long": "quote.aphoristic-long",
    "historical/aphoristic": "quote.historical",
    historical: "quote.historical",
    "historical/fable": "quote.historical-fable",
    "traditional proverb": "quote.proverb",
    "utility function": "code.utility",
    "utility library": "code.utility",
    "type-checking utility": "code.utility",
  }),
);

/** Stable per-file defaults, used where the register declares no tag. */
const FILE_DEFAULT_CONTENT_TYPE = new Map(
  Object.entries({
    "docs/content-prose-batch-01.md": "prose.everyday",
    "docs/content-prose-batch-02.md": "prose.workplace",
    "docs/content-prose-batch-03.md": "prose.technical",
    "docs/content-prose-batch-04.md": "prose.relationships",
    // PROSE-05 interleaves two sub-domains under section headings; the
    // heading-aware resolver in `resolveContentType` splits it.
    "docs/content-quotes-original.md": "quote.aphoristic-medium",
    "docs/content-quotes-original-batch2.md": "quote.aphoristic-medium",
    "docs/content-quotes-original-batch3.md": "quote.aphoristic-medium",
    "docs/content-quotes-verified-public-domain.md": "quote.historical",
    "docs/content-quotes-verified-public-domain-batch2.md": "quote.historical",
    "docs/content-quotes-verified-public-domain-batch3.md": "quote.historical",
    "docs/content-code-snippets-javascript.md": "code.other",
    "docs/content-code-snippets-javascript-original.md": "code.utility",
    "docs/content-classic-mode-word-list.md": "wordlist.classic",
    "docs/content-classic-mode-word-list-full-corpus.md": "wordlist.classic",
    "docs/content-composition-draft-sprint-prompts.md": "composition.reply",
  }),
);

/** id prefix -> content type, for files whose id encodes the category. */
const ID_PREFIX_CONTENT_TYPE = new Map(
  Object.entries({
    "COMP-REPLY-": "composition.reply",
    "COMP-EXPLAIN-": "composition.explain",
    "COMP-REFLECT-": "composition.reflect",
    "COMP-DESCRIBE-": "composition.describe",
    "COMP-SPRINT-": "composition.sprint",
  }),
);

/**
 * Nearest `##` heading -> content type, for files that interleave sub-domains
 * inside one file (PROSE-05 splits news from travel; the original JS snippets
 * file splits utility / algorithms / web / React). Ordered, first match wins, so
 * a more specific pattern is listed before a broader one.
 */
const HEADING_CONTENT_TYPES = Object.freeze([
  [/Section B:.*\bTravel\b/i, "prose.travel"],
  [/News\s*\/\s*Explanatory/i, "prose.news-explanatory"],
  [/Data structures and algorithms/i, "code.algorithm"],
  [/Web\/frontend patterns/i, "code.web"],
  [/React-flavored/i, "code.react"],
  [/Utility functions/i, "code.utility"],
]);

/** Word-count bands the quote files themselves declare (batch 1 header). */
const QUOTE_LENGTH_BANDS = [
  [12, "quote.aphoristic-short"],
  [20, "quote.aphoristic-medium"],
  [Number.POSITIVE_INFINITY, "quote.aphoristic-long"],
];

/**
 * RFC 2606 reserved names: `example.com/net/org` and their subdomains, plus the
 * reserved TLDs `.test`, `.example`, `.invalid` and `.localhost`. None can ever
 * resolve to a real endpoint, so 6.1's "realistic prose" should use them rather
 * than be blocked by them.
 */
const RESERVED_DOMAIN_NAMES = ["example.com", "example.net", "example.org"];

function isReservedDomain(host) {
  const lower = String(host ?? "")
    .toLowerCase()
    .replace(/\.$/, "");
  if (/\.(?:example|test|invalid|localhost)$/.test(lower)) return true;
  return RESERVED_DOMAIN_NAMES.some((name) => lower === name || lower.endsWith(`.${name}`));
}

/**
 * Deliberate exceptions to the sensitive filter. Each entry names the rule it
 * suppresses and gives a written reason; the build fails if an entry stops
 * matching anything, because a stale exception is how an allowlist rots.
 */
export const SENSITIVE_ALLOWLIST = Object.freeze([
  {
    id: "PROSE-01-013",
    rule: "quoted-credential-literal",
    reason:
      "Original everyday-domain prose describing a wifi password on a sticky note " +
      '("something like "Bl4nk3t_47xz"). It unlocks nothing and is derived from no real ' +
      "credential; the shape is deliberate typing material (mixed case, digits, underscore). " +
      "Tracked here so a future hand-check can replace it with a less secret-shaped string.",
  },
]);

/* ------------------------------------------------------------------ stage 3 */

/**
 * A quoted literal that *looks* like a credential: no spaces, at least three of
 * {lower, upper, digit, symbol}, and both a letter and a digit.
 *
 * Shape-based rather than entropy-based on purpose. Entropy also fires on
 * ordinary abbreviations and identifiers, and this corpus needs the filter to be
 * precise rather than clever - a filter that guts the corpus gets switched off,
 * which is worse than no filter. This is the one rule that fires on the real
 * corpus, and the allowlist entry above is what makes that deliberate rather
 * than accidental.
 */
function looksLikeCredentialLiteral(value) {
  if (/\s/.test(value)) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  return classes >= 3 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

/**
 * Blockers only, one per real class of leak:
 *   - provider key shapes (AWS, GitHub, Slack, Stripe, Google, GitLab), JWTs,
 *     Bearer tokens, PEM private keys, credential assignments;
 *   - email / real-looking URL / real-looking IPv4 outside RFC 2606 reserved
 *     names. A documentation address (`ops@company.example`) and a private
 *     address (`192.168.1.1`) are not real endpoints and are excluded by the
 *     reserved/private rules, not by an ad-hoc per-item exception;
 *   - IBANs (mod-97) and card-like runs (Luhn). Checksums keep these exact.
 *
 * A bare digit run that merely *looks* like a national phone number is
 * deliberately NOT a blocker: a ten-digit group with no country code is
 * indistinguishable from a meeting id, an order number or an extension, and
 * 6.1 requires prose with realistic digits. E.164-formatted numbers ARE flagged.
 */
const SENSITIVE_RULES = [
  {
    id: "provider-api-key",
    pattern:
      /(?:AKIA|ASIA)[0-9A-Z]{16}|\bgh[pousr]_[A-Za-z0-9]{16,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b|\bsk-[A-Za-z0-9]{20,}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g },
  { id: "private-key-pem", pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g },
  { id: "bearer-token", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g },
  {
    id: "credential-assignment",
    pattern:
      /\b(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|auth[_-]?token|client[_-]?secret|passphrase)\b\s*[:=]\s*["']?([^\s"',.;]{6,})/gi,
  },
  {
    id: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    keep: (m) => !isReservedDomain(m[1]),
  },
  {
    id: "url",
    pattern: /\bhttps?:\/\/([^\s)"'`<>/]+)/gi,
    // A URL on an RFC 2606 documentation domain is documentation material;
    // 6.1 asks for prose with realistic URLs and example.com is the correct one.
    keep: (m) => !isReservedDomain(m[1]),
  },
  {
    id: "ipv4",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    // RFC 1918 private space and RFC 5737 documentation space are not routable
    // endpoints. 6.1 asks for prose with realistic addresses, and 192.168.1.1
    // (the default router address) is documentation material, not a leak.
    keep: (m) => !isPrivateOrDocumentationIpv4(m[0]),
  },
  {
    id: "phone-e164",
    pattern: /\+\d{1,3}[\s.-]?(?:\(\d{1,4}\)|\d{1,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
  },
  {
    id: "quoted-credential-literal",
    pattern: /"([^"]{4,80})"/g,
    keep: (m) => looksLikeCredentialLiteral(m[1].replace(/[,.;:!?"']+$/, "")),
  },
];

/** RFC 1918 private ranges plus RFC 5737 documentation ranges. */
const PRIVATE_IPV4_PREFIXES = [
  "10.",
  "127.",
  "169.254.",
  "172.16.",
  "192.168.",
  "192.0.2.",
  "198.51.100.",
  "203.0.113.",
];

function isPrivateOrDocumentationIpv4(address) {
  return PRIVATE_IPV4_PREFIXES.some((prefix) => address.startsWith(prefix));
}

/** Luhn checksum: makes the card rule exact instead of shape-guessing. */
function luhnValid(raw) {
  const digits = String(raw).replace(/[ -]/g, "");
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** ISO 13616 mod-97, likewise exact. */
function ibanValid(value) {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const part = /[0-9]/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of part) remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return remainder === 1;
}

function checksumCandidates(text, pattern, validate) {
  return [...text.matchAll(pattern)].map((m) => m[0]).filter(validate);
}

/**
 * Scan one item's text. Returns findings ALREADY allowlist-filtered, so no
 * caller can forget to consult the allowlist - a filter that can be skipped is
 * not a blocking filter. `allowlisted: true` findings must not block the build.
 */
export function scanSensitive(text, { id = null } = {}) {
  const value = String(text ?? "");
  const findings = [];
  const push = (rule, match) => {
    const allowed = SENSITIVE_ALLOWLIST.find((e) => e.rule === rule && e.id === id);
    findings.push({
      rule,
      match,
      allowlisted: Boolean(allowed),
      reason: allowed?.reason ?? null,
    });
  };
  for (const rule of SENSITIVE_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of value.matchAll(rule.pattern)) {
      if (rule.keep && !rule.keep(match)) continue;
      push(rule.id, match[0]);
    }
  }
  for (const iban of checksumCandidates(
    value,
    /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}[ ]?[A-Z0-9]{1,4}\b/g,
    ibanValid,
  )) {
    push("iban", iban);
  }
  for (const card of checksumCandidates(value, /\b\d(?:[ -]?\d){12,18}\b/g, luhnValid)) {
    push("card-number", card);
  }
  return findings;
}

/**
 * Allowlist entries that match nothing. A corpus-level property, so the gate
 * (`scripts/check-corpus.mjs`) is where it is enforced rather than every build:
 * a fixture corpus that legitimately lacks PROSE-01-013 must not "fail" for
 * having an unused exception.
 */
export function findStaleAllowlistEntries(items) {
  const used = new Set();
  for (const item of items) {
    for (const f of scanSensitive(item.text, { id: item.id })) {
      if (f.allowlisted) used.add(`${item.id}::${f.rule}`);
    }
  }
  return SENSITIVE_ALLOWLIST.filter((e) => !used.has(`${e.id}::${e.rule}`)).map(
    (entry) => `${entry.id} :: ${entry.rule} :: no longer matches any item`,
  );
}

/* ------------------------------------------------------------------ stage 2 */

/**
 * Dedupe normalisation, stated explicitly because "duplicate" is otherwise a
 * matter of opinion:
 *   1. Unicode NFKC, so full-width and compatibility forms compare equal;
 *   2. every run of whitespace (space, tab, newline) collapsed to one space;
 *   3. trimmed;
 *   4. lowercased.
 *
 * Punctuation is NOT stripped and sentence-final marks are NOT ignored:
 * "Practice makes perfect." and "Practice makes perfect" are different typing
 * strings, and collapsing them would hide a real editorial defect.
 */
export function normaliseForDedupe(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Hex SHA-256, used only for stable finding fingerprints. */
export function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Duplicate-text groups. Policy is report-and-drop: a duplicate is an authoring
 * defect in the source, not a licensing or safety violation, so blocking all
 * 700+ items over two pairs would be the wrong trade. The drop is never silent -
 * it lands in the artifact's `duplicates` array naming the kept id and every
 * dropped id, and the gate separately asserts no duplicate survived into the
 * emitted set.
 */
export function findDuplicateGroups(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = normaliseForDedupe(item.text);
    if (key === "") continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(item);
  }
  const groups = [];
  for (const [key, members] of byKey) {
    if (members.length < 2) continue;
    const sorted = [...members].sort(compareItems);
    groups.push({
      // Fingerprint of the normalised text plus a short excerpt. The excerpt
      // makes the finding reviewable in the artifact diff; the fingerprint is
      // what the gate re-checks, so the full passage is never republished into a
      // log line or a comparison.
      key: sha256Hex(key),
      excerpt: key.length > 90 ? `${key.slice(0, 90)}…` : key,
      kept: sorted[0].id,
      dropped: sorted.slice(1).map((m) => m.id),
    });
  }
  return groups.sort((a, b) => compareIds(a.kept, b.kept));
}

/* --------------------------------------------------------------- extraction */

/** Split an id so numeric segments compare numerically, not lexically. */
function idParts(id) {
  return String(id)
    .split("-")
    .map((part) => (/^\d+$/.test(part) ? [1, Number(part), ""] : [0, 0, part]));
}

/** Explicit, total id ordering: numeric segments compare as numbers. */
export function compareIds(a, b) {
  const pa = idParts(a);
  const pb = idParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? [0, 0, ""];
    const y = pb[i] ?? [0, 0, ""];
    if (x[0] !== y[0]) return x[0] - y[0];
    if (x[0] === 1) {
      if (x[1] !== y[1]) return x[1] - y[1];
    } else if (x[2] !== y[2]) {
      return x[2] < y[2] ? -1 : 1;
    }
  }
  return 0;
}

/** The artifact's single sort order: family rank, then id. */
export function compareItems(a, b) {
  const fa = FAMILY_ORDER.indexOf(a.family);
  const fb = FAMILY_ORDER.indexOf(b.family);
  if (fa !== fb) return fa - fb;
  return compareIds(a.id, b.id);
}

/**
 * Family prefix of an item id, or null when the id is not licensable typing
 * content. Register rows outside these families (FONT assets, SPEC generation
 * specs) are deliberately not typing text and never reach the emitted set; the
 * register does not backtick those ids, so `discoverItemIds` never surfaces them
 * and no exclusion list is needed.
 */
function familyOf(id) {
  const prefix = String(id).split("-")[0];
  return ITEM_FAMILIES.includes(prefix) ? prefix : null;
}

/** Difficulty band, lowercased, only where the source declares one. */
function normaliseDifficulty(value) {
  const band = String(value ?? "")
    .trim()
    .toLowerCase();
  return band === "easy" || band === "typical" || band === "hard" ? band : null;
}

/** Statuses that mean the register deliberately keeps an item out of the corpus. */
const DO_NOT_SHIP_RE = /do.?not.?ship/i;

/** Index of the next line with content, or -1. */
function nextNonEmpty(lines, from) {
  let i = from;
  while (i < lines.length && lines[i].trim() === "") i++;
  return i < lines.length ? i : -1;
}

/** Read a fenced block opened at `start`; `{ text, endLine }` or null. */
function readFence(lines, start) {
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  return { text: lines.slice(start + 1, end).join("\n"), endLine: end };
}

/**
 * Extract the word pool from a derived word-list file.
 *
 * The pool lives in a single fenced block of comma-separated lowercase words.
 * Returning the pool as the item's text is what lets one pipeline stage
 * (licence, dedupe, sensitive filter, tags) cover word lists at all; the
 * `word-list` kind records that this text is a POOL a selector samples from
 * rather than a passage someone types end to end.
 */
function extractWordList(lines) {
  const pools = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^```/.test(lines[i])) continue;
    const block = readFence(lines, i);
    if (block === null) continue;
    const words = block.text
      .split(/[,\s]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    // A real pool is entirely lowercase alphabetic tokens; a prose fence fails
    // this and is correctly ignored rather than half-ingested.
    const isPool = words.length > 0 && words.every((w) => /^[a-z][a-z']*$/.test(w));
    if (isPool) pools.push({ words, line: i + 1 });
    i = block.endLine;
  }
  if (pools.length !== 1) return null;
  return pools[0];
}

/**
 * Per-file extraction. Each corpus file declares its items in one fixed shape
 * and this reads that shape exactly; a licensable id present in the file but
 * not extracted is reported as `unparsedIds` so the caller can FAIL the build.
 *
 * That is the single most important property of this function. The corpus is
 * being loaded for real, so a parser that quietly matched 24 of 40 quotes would
 * be a silent content-loss bug nobody would notice until a user typed a
 * fragment of nothing.
 */
export function extractItems(fileName, text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const items = [];
  /** Vertical Field/Value register tables declare a CODE id whose body follows. */
  let pendingCodeId = null;
  /** Nearest `##` heading, for files that interleave sub-domains. */
  let heading = "";

  const add = (item) => items.push({ ...item, file: fileName, heading });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;

    if ((m = line.match(/^##\s+(.+)$/))) {
      heading = m[1].trim();
      continue;
    }

    // PROSE: header line, then the passage on the next non-empty line.
    if (
      (m = line.match(/^`(PROSE-[A-Za-z0-9-]+)`\s*·\s*(Easy|Typical|Hard)\s*·\s*(\d+)\s*words\s*$/))
    ) {
      const body = nextNonEmpty(lines, i + 1);
      if (body === -1) break;
      add({
        id: m[1],
        text: lines[body].trim(),
        declaredWords: Number(m[3]),
        difficulty: normaliseDifficulty(m[2]),
        source: null,
        line: i + 1,
      });
      i = body;
      continue;
    }

    // QUOTE-ORIG: `id` · N words — text
    if ((m = line.match(/^`(QUOTE-ORIG-[A-Za-z0-9-]+)`\s*·\s*(\d+)\s*words\s*—\s*(.+)$/))) {
      add({
        id: m[1],
        text: m[3].trim(),
        declaredWords: Number(m[2]),
        difficulty: null,
        source: null,
        line: i + 1,
      });
      continue;
    }

    // QUOTE-PD: `id` [·|—] [Source: ]<attribution> — text. The `Source: ` label
    // is present on the Franklin/Aesop/Marcus lines but absent on the
    // traditional-proverb lines, which carry the attribution bare.
    if ((m = line.match(/^`(QUOTE-PD-[A-Za-z0-9-]+)`\s*[·—]\s*(?:Source:\s*)?(.+?)\s*—\s*(.+)$/))) {
      add({
        id: m[1],
        text: m[3].trim(),
        declaredWords: null,
        difficulty: null,
        source: m[2].trim(),
        line: i + 1,
      });
      continue;
    }

    // COMP: `id` — text
    if ((m = line.match(/^`(COMP-[A-Za-z0-9-]+)`\s*—\s*(.+)$/))) {
      add({
        id: m[1],
        text: m[2].trim(),
        declaredWords: null,
        difficulty: null,
        source: null,
        line: i + 1,
      });
      continue;
    }

    // CODE, shape A: header line then a fenced block.
    if (
      (m = line.match(
        /^`(CODE-[A-Za-z0-9-]+)`\s*·\s*Difficulty:\s*(Easy|Typical|Hard)\s*·\s*Token mix:\s*(.+)$/,
      ))
    ) {
      const open = nextNonEmpty(lines, i + 1);
      if (open === -1 || !/^```/.test(lines[open])) continue;
      const body = readFence(lines, open);
      if (body === null) continue;
      add({
        id: m[1],
        text: body.text,
        declaredWords: null,
        difficulty: normaliseDifficulty(m[2]),
        tokenMix: m[3].trim(),
        source: null,
        line: i + 1,
      });
      i = body.endLine;
      continue;
    }

    // CODE, shape B: a vertical Field/Value register table names the id and the
    // next fenced block is its body (CODE-JS-001's shape).
    if ((m = line.match(/^\|\s*item_id\s*\|\s*`(CODE-[A-Za-z0-9-]+)`\s*\|/))) {
      pendingCodeId = m[1];
      continue;
    }

    if (/^```/.test(line) && pendingCodeId !== null) {
      const body = readFence(lines, i);
      if (body !== null) {
        add({
          id: pendingCodeId,
          text: body.text,
          declaredWords: null,
          difficulty: null,
          tokenMix: null,
          source: null,
          line: i + 1,
        });
        i = body.endLine;
      }
      pendingCodeId = null;
    }
  }

  // Word lists declare ONE licensable id in a vertical register table plus a
  // fenced word pool, rather than a header line per item. Only the id the file
  // itself declares counts: the authoritative word-list file also *mentions* the
  // superseded id it replaces, and a mention is not a declaration.
  const declaredWordListIds = [
    ...new Set(
      [...text.matchAll(/^\|\s*item_id\s*\|\s*`(WORDLIST-[A-Za-z0-9-]+)`/gm)].map((m) => m[1]),
    ),
  ];
  if (declaredWordListIds.length > 1) {
    return {
      items,
      found: new Set(items.map((it) => it.id)),
      parseErrors: [
        `WORD-LIST-MULTIPLE-IDS :: ${fileName} :: declares ${declaredWordListIds.join(", ")}`,
      ],
    };
  }
  if (declaredWordListIds.length === 1) {
    const pool = extractWordList(lines);
    if (pool === null) {
      return {
        items,
        found: new Set(items.map((it) => it.id)),
        parseErrors: [
          `WORD-LIST-POOL-NOT-FOUND :: ${fileName} :: expected exactly one fence of lowercase words`,
        ],
      };
    }
    add({
      id: declaredWordListIds[0],
      text: pool.words.join(" "),
      declaredWords: pool.words.length,
      difficulty: null,
      source: null,
      line: pool.line,
    });
  }

  const found = new Set(items.map((it) => it.id));
  return { items, found, parseErrors: [] };
}

/* -------------------------------------------------------------------- build */

/** Join register rows to item ids, keeping every covering row. */
function indexRegisterRows(registerTexts, corpusTexts) {
  const index = new Map();
  for (const { name, text } of [...registerTexts, ...corpusTexts]) {
    for (const row of parseRegisterMarkdown(text, name)) {
      for (const id of row.ids) {
        if (!index.has(id)) index.set(id, []);
        index.get(id).push(row);
      }
    }
  }
  return index;
}

/**
 * Read `content_type_tag` cells out of the same register tables
 * `parseRegisterMarkdown` reads.
 *
 * This is the one thing the pipeline needs that the gate's row shape does not
 * carry, and it is a column reader rather than a fork: it reuses the gate's
 * `expandIdRange` for the id cell, so id coverage cannot drift between the two
 * gates. Nothing licence-related is decided here.
 */
export function parseContentTypeTags(text, name) {
  const rows = [];
  const lines = String(text ?? "").split(/\r?\n/);
  const splitRow = (line) => {
    let cells = line.trim();
    if (cells.startsWith("|")) cells = cells.slice(1);
    if (cells.endsWith("|")) cells = cells.slice(0, -1);
    return cells.split("|").map((c) => c.trim());
  };
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    const sep = lines[i + 1] ?? "";
    if (!sep.includes("-") || !/^[\s|:-]+$/.test(sep)) continue;
    const header = splitRow(lines[i]).map((h) => h.toLowerCase().replace(/`/g, "").trim());
    const idIdx = header.findIndex((h) => h === "item_id" || h === "item_id range");
    const tagIdx = header.indexOf("content_type_tag");
    if (idIdx === -1 || tagIdx === -1) continue;
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      const cells = splitRow(lines[j]);
      while (cells.length < header.length) cells.push("");
      const ids = expandIdRange(cells[idIdx] ?? "");
      const tag = (cells[tagIdx] ?? "").trim();
      if (ids.length > 0 && tag !== "") rows.push({ ids, contentTypeTag: tag, file: name });
      j++;
    }
    i = j - 1;
  }
  return rows;
}

/** Register tag -> id, so tag resolution is a lookup rather than a re-parse. */
function indexContentTypeTags(registerTexts, corpusTexts) {
  const index = new Map();
  for (const { name, text } of [...registerTexts, ...corpusTexts]) {
    for (const row of parseContentTypeTags(text, name)) {
      for (const id of row.ids) {
        if (!index.has(id)) index.set(id, []);
        index.get(id).push(row);
      }
    }
  }
  return index;
}

/** Deterministic row choice: by file, then by the row's first covered id. */
function preferredRow(rows) {
  return [...rows].sort((a, b) => compareIds(a.file, b.file) || compareIds(a.ids[0], b.ids[0]))[0];
}

/** Register cell -> map key: lowercase, whitespace collapsed. */
function normaliseTagKey(tag) {
  return String(tag ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve an item's content type. Order is register tag, then id prefix, then
 * declared word-count band, then enclosing heading, then per-file default. The
 * `tagSource` recorded on the item says which rule fired, so a reader of the
 * artifact can tell a declared tag from a derived one.
 */
function resolveContentType(item, tagRows) {
  for (const row of tagRows) {
    const tag = row.contentTypeTag;
    const mapped = REGISTER_TAG_MAP.get(normaliseTagKey(tag));
    if (mapped) return { contentType: mapped, source: "register" };
    return { contentType: null, source: "register", unmappedTag: tag };
  }
  for (const [prefix, type] of ID_PREFIX_CONTENT_TYPE) {
    if (item.id.startsWith(prefix)) return { contentType: type, source: "id-prefix" };
  }
  if (item.id.startsWith("QUOTE-ORIG-") && item.declaredWords !== null) {
    for (const [limit, type] of QUOTE_LENGTH_BANDS) {
      if (item.declaredWords < limit) return { contentType: type, source: "declared-length" };
    }
  }
  for (const [pattern, type] of HEADING_CONTENT_TYPES) {
    if (pattern.test(item.heading)) return { contentType: type, source: "heading" };
  }
  const byFile = FILE_DEFAULT_CONTENT_TYPE.get(item.file);
  if (byFile) return { contentType: byFile, source: "file-default" };
  return { contentType: null, source: "none" };
}

/** Word count as this pipeline defines it: whitespace-separated tokens. */
export function countWords(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Language per family: the corpus is English prose plus JavaScript. */
function languageOf(family) {
  return family === "CODE" ? "javascript" : "en";
}

/** Item kind: the sub-family a consumer switches on. */
function kindOf(id) {
  if (id.startsWith("PROSE-")) return "prose";
  if (id.startsWith("QUOTE-ORIG-")) return "quote-original";
  if (id.startsWith("QUOTE-PD-")) return "quote-public-domain";
  if (id.startsWith("CODE-")) return "code-snippet";
  if (id.startsWith("WORDLIST-")) return "word-list";
  if (id.startsWith("COMP-")) return "composition-prompt";
  return "other";
}

/**
 * The pure build. `registerTexts` and `corpusTexts` are `{ name, text }` arrays;
 * nothing here touches disk, so tests feed fixtures.
 *
 * Returns `{ items, rejected, duplicates, failures, stats, version }`. A
 * non-empty `failures` array means the build must not be published: the CLI
 * exits non-zero and writes nothing.
 */
export function buildCorpus({ registerTexts = [], corpusTexts = [] } = {}) {
  const failures = [];
  const candidates = [];

  for (const { name, text } of corpusTexts) {
    const { items, parseErrors = [] } = extractItems(name, text);
    candidates.push(...items);
    for (const message of parseErrors) failures.push(message);
  }

  const rowIndex = indexRegisterRows(registerTexts, corpusTexts);
  const tagIndex = indexContentTypeTags(registerTexts, corpusTexts);
  const licensed = [];
  const rejected = [];
  const seen = new Map();

  for (const raw of candidates) {
    const family = familyOf(raw.id);
    if (family === null) {
      failures.push(`UNKNOWN-FAMILY :: ${raw.id} :: ${raw.file}`);
      continue;
    }

    if (seen.has(raw.id)) {
      failures.push(
        `DUPLICATE-ID :: ${raw.id} :: declared in both ${seen.get(raw.id)} and ${raw.file}`,
      );
      continue;
    }
    seen.set(raw.id, raw.file);

    if (raw.text.trim() === "") {
      failures.push(`EMPTY-TEXT :: ${raw.id} :: ${raw.file}:${raw.line}`);
      continue;
    }

    // Stage 1: licence per item. Missing / copyleft / unknown all fail closed;
    // an item is never defaulted to a licence the register does not give it.
    const rows = rowIndex.get(raw.id) ?? [];
    if (rows.length === 0) {
      failures.push(`NO-REGISTER-ROW :: ${raw.id} :: ${raw.file} :: no register row covers it`);
      continue;
    }
    const row = preferredRow(rows);
    const licenseClass = classifyLicense(row.license);
    if (licenseClass !== "allowed") {
      const code =
        licenseClass === "copyleft"
          ? "COPYLEFT-LICENSE"
          : licenseClass === "missing"
            ? "MISSING-LICENSE"
            : "UNKNOWN-LICENSE";
      failures.push(`${code} :: ${raw.id} :: ${row.file} :: "${row.license || "(empty)"}"`);
      continue;
    }

    // An item the register marks DO-NOT-SHIP is deliberately withheld (the
    // CODE-JS-P0x placeholders whose exact upstream content was never pinned).
    // That is an editorial decision already recorded, not a pipeline defect, so
    // it becomes an explicit rejection rather than a build failure.
    if (rows.some((r) => DO_NOT_SHIP_RE.test(r.status))) {
      rejected.push({
        id: raw.id,
        reason: "do-not-ship",
        detail: `register status marks it DO NOT SHIP (${row.file})`,
        provenance: { file: raw.file, line: raw.line },
      });
      continue;
    }

    const item = {
      id: raw.id,
      family,
      kind: kindOf(raw.id),
      text: raw.text,
      language: languageOf(family),
      contentType: null,
      tagSource: null,
      difficulty: raw.difficulty,
      wordCount: countWords(raw.text),
      declaredWords: raw.declaredWords,
      license: row.license.trim(),
      licenseClass,
      source: (row.source || raw.source || "").trim(),
      attribution: raw.source ?? null,
      registerRef: row.file,
      registerStatus: row.status.trim(),
      shippable: isShippableStatus(row.status),
      provenance: { file: raw.file, line: raw.line },
    };
    if (raw.tokenMix) item.tokenMix = raw.tokenMix;

    // Stage 4: tags.
    const resolved = resolveContentType(
      { id: raw.id, file: raw.file, heading: raw.heading, declaredWords: raw.declaredWords },
      tagIndex.get(raw.id) ?? [],
    );
    if (resolved.unmappedTag) {
      failures.push(
        `UNMAPPED-CONTENT-TYPE-TAG :: ${raw.id} :: register tag "${resolved.unmappedTag}" :: ${row.file}`,
      );
      continue;
    }
    if (resolved.contentType === null) {
      failures.push(`NO-CONTENT-TYPE :: ${raw.id} :: no register tag and no declared default`);
      continue;
    }
    item.contentType = resolved.contentType;
    item.tagSource = resolved.source;

    // Stage 3: sensitive filter (blocking, allowlist-aware). An allowlisted
    // finding is kept, and the exception is recorded on the item so the
    // decision travels with the content into the diff.
    const findings = scanSensitive(item.text, { id: item.id });
    const blocking = findings.filter((f) => !f.allowlisted);
    if (blocking.length > 0) {
      for (const f of blocking) {
        failures.push(
          `SENSITIVE-${f.rule.toUpperCase()} :: ${item.id} :: ${JSON.stringify(f.match)}`,
        );
      }
      continue;
    }
    if (findings.length > 0) {
      item.sensitiveAllowlist = findings.map((f) => ({
        rule: f.rule,
        match: f.match,
        reason: f.reason,
      }));
    }

    // 6.4 publish gate, as data: an item cannot go live without a licence
    // entry, a review decision and a difficulty tag. Recording the blockers
    // means the corpus states plainly that almost nothing is shippable yet
    // rather than implying readiness it does not have.
    item.publishBlockers = [
      row.status.trim() === "" ? "no-review-decision" : null,
      isShippableStatus(row.status) ? null : `status-not-shippable: ${row.status.trim()}`,
      item.difficulty === null ? "no-difficulty-band" : null,
    ].filter(Boolean);

    licensed.push(item);
  }

  // Stage 2: dedupe, after licensing so a pair that also fails licensing
  // reports the licence failure first rather than hiding behind a dedupe drop.
  licensed.sort(compareItems);
  const duplicates = findDuplicateGroups(licensed);
  const droppedTo = new Map();
  for (const group of duplicates) {
    for (const id of group.dropped) droppedTo.set(id, group);
  }
  const items = [];
  for (const item of licensed) {
    const group = droppedTo.get(item.id);
    if (group) {
      rejected.push({
        id: item.id,
        reason: "duplicate-text",
        detail: `identical to ${group.kept} after whitespace/case normalisation (${group.key.slice(0, 12)})`,
        provenance: item.provenance,
      });
      continue;
    }
    items.push(item);
  }

  // Completeness: every licensable id the CNT-07 gate discovers anywhere in the
  // corpus must end up accounted for - emitted, or rejected with a stated
  // reason. This is the anti-vacuity spine of the pipeline: it is what turns "a
  // parser quietly matched 24 of 40 quotes" from an invisible content-loss bug
  // into a red build.
  //
  // Ids the register deliberately withholds (a DO-NOT-SHIP row whose body was
  // never written - the CODE-JS-P0x placeholders) are rejected here rather than
  // failed, because the withholding is already an editorial decision on record.
  const accounted = new Set([...items.map((i) => i.id), ...rejected.map((r) => r.id)]);
  const mentioned = new Map();
  for (const { name, text } of [...registerTexts, ...corpusTexts]) {
    for (const id of discoverItemIds(text)) {
      if (familyOf(id) === null) continue;
      if (!mentioned.has(id)) mentioned.set(id, name);
    }
  }
  for (const id of [...mentioned.keys()].sort(compareIds)) {
    if (accounted.has(id)) continue;
    const rows = rowIndex.get(id) ?? [];
    if (rows.some((r) => DO_NOT_SHIP_RE.test(r.status))) {
      rejected.push({
        id,
        reason: "do-not-ship",
        detail: `register row marks it DO NOT SHIP and no content body was ever written (${preferredRow(rows).file})`,
        provenance: null,
      });
      accounted.add(id);
      continue;
    }
    failures.push(
      `UNACCOUNTED-ITEM :: ${id} :: mentioned in ${mentioned.get(id)} :: no text extracted and no register row withholds it`,
    );
  }
  rejected.sort((a, b) => compareIds(a.id, b.id));

  return {
    version: CORPUS_VERSION,
    items,
    rejected,
    duplicates,
    failures,
    stats: summarise(items, rejected, duplicates),
  };
}

/** Counts by family, content type, difficulty and tag provenance. */
function summarise(items, rejected, duplicates) {
  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);
  const byFamily = new Map();
  const byContentType = new Map();
  const byDifficulty = new Map();
  const byTagSource = new Map();
  for (const item of items) {
    bump(byFamily, item.family);
    bump(byContentType, item.contentType);
    bump(byDifficulty, item.difficulty ?? "unspecified");
    bump(byTagSource, item.tagSource);
  }
  const sorted = (map) =>
    Object.fromEntries([...map].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return {
    emitted: items.length,
    rejected: rejected.length,
    duplicateGroups: duplicates.length,
    duplicateItemsDropped: duplicates.reduce((n, g) => n + g.dropped.length, 0),
    shippable: items.filter((i) => i.shippable).length,
    withDifficultyBand: items.filter((i) => i.difficulty !== null).length,
    sensitiveAllowlisted: items.filter((i) => "sensitiveAllowlist" in i).length,
    byFamily: sorted(byFamily),
    byContentType: sorted(byContentType),
    byDifficulty: sorted(byDifficulty),
    byTagSource: sorted(byTagSource),
  };
}

/**
 * Stable JSON: key order comes from construction, never from hash order, so the
 * committed artifact diffs cleanly.
 */
export function serialiseCorpus(build) {
  return `${JSON.stringify(
    {
      version: build.version,
      stats: build.stats,
      contentTypes: CONTENT_TYPES,
      duplicates: build.duplicates,
      rejected: build.rejected,
      items: build.items,
    },
    null,
    2,
  )}\n`;
}
