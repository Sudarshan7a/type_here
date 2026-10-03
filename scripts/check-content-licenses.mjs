/**
 * Content-corpus licence gate (CNT-07).
 *
 * The dependency copyleft gate (scripts/check-licenses.mjs, D12) scans npm
 * production dependencies only. It never reads the typing corpus, so it
 * cannot enforce the content rule: no GPL/AGPL-sourced word lists, quotes or
 * code (Monkeytype/Keybr lineage), and every item needs a licence entry.
 * This gate covers the corpus instead.
 *
 * Corpus roots scanned (both — content/ is the future home, docs/ is where
 * the corpus actually lives today):
 *   - content/ tree, every .md file (recursive)
 *   - docs/content-*.md, except the plan, the register itself and register
 *     updates (see DOCS_NON_CORPUS / REGISTER_UPDATE_RE below)
 *
 * Register set (an item is covered if ANY of these names it):
 *   - docs/content-license-register.md
 *   - docs/content-register-update-*.md (batches whose rows are not yet
 *     merged into the main register)
 *   - per-file register tables inside the corpus files themselves
 *     ("Register entr*" sections and Field/Value blocks)
 *
 * Item discovery: backticked IDs of the families
 *   PROSE | QUOTE | CODE | WORDLIST | COMP | FONT
 * e.g. `PROSE-01-001`, `CODE-JS-P01`, `WORDLIST-CLASSIC-02`, `COMP-REPLY-001`.
 * SPEC-* entries are generation specs, not shippable typing content; they are
 * covered by their file-level register entry instead of per-ID rows.
 *
 * Minimal machine-readable convention (every current corpus file already
 * satisfies it, so no migration was needed): a corpus file that contains
 * items must declare at least one recognized licence via a
 * `License: `...`` line, a `| license | ... |` row, or a register table with
 * a licence column carrying a recognized value.
 *
 * Failure rules (fail-closed throughout, mirroring check-licenses.mjs):
 *   1. Item without a licence field/entry (no register row, or a row with an
 *      empty licence; file with items but no recognized file-level licence).
 *   2. Copyleft licence (GPL/AGPL family, incl. LGPL/SSPL and "MIT OR GPL"
 *      duals), an unrecognized licence, or a Monkeytype/Keybr source lineage.
 *   3. DO-NOT-SHIP item not pinned by content/README's never-load list, or a
 *      DO-NOT-SHIP item marked with a shippable status anywhere.
 *   4. Shippable third-party-licence row (MIT/Apache/BSD/CC0/OFL) without its
 *      licence text saved, or with a saved-text path that does not exist.
 * Vacuity guard: zero discovered items or zero register rows is itself a
 * failure — a gate that only ever passes proves nothing.
 *
 * The pure scanning core (findContentLicenseOffenders and helpers) is
 * exported for unit testing against fixture markdown (same pattern as
 * check-licenses.mjs Block A2: prove the gate fails on bad input without
 * touching the real corpus).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** docs/content-*.md files that are plan/register documents, not corpus. */
const DOCS_NON_CORPUS = new Set([
  "content-00-master-plan-and-license-register.md",
  "content-license-register.md",
]);
const REGISTER_UPDATE_RE = /^content-register-update-.*\.md$/;
const DOCS_CORPUS_RE = /^content-.*\.md$/;

/** Licensable item families. SPEC-* specs are covered at file level, not per ID. */
const ITEM_FAMILIES = "(?:PROSE|QUOTE|CODE|WORDLIST|COMP|FONT)";

/** Statuses containing DO NOT SHIP mark items that must never reach users. */
const DO_NOT_SHIP_RE = /do.?not.?ship/i;

/** Monkeytype/Keybr lineage is banned by the master plan content rule. */
const BANNED_LINEAGE_RE = /monkeytype|keybr/i;

/**
 * Classify a licence cell. Returns "copyleft" | "allowed" | "unknown" |
 * "missing". Copyleft is tested first so duals like "MIT OR GPL-2.0" fail.
 * The allowlist is exactly the master-plan sourcing paths (original work,
 * verified public domain, MIT/Apache/BSD/CC0) plus SIL OFL for font files.
 */
export function classifyLicense(license) {
  const raw = String(license ?? "")
    .replace(/[̀-̄]/g, "-")
    .trim();
  if (!raw) return "missing";
  if (/\b(gpl|agpl|lgpl|sspl|copyleft)\b/i.test(raw)) return "copyleft";
  if (
    /(original work|public domain|\bcc0\b|\bmit\b|apache|\bbsd\b|bsd-\d|\bofl\b|sil open font)/i.test(
      raw,
    )
  ) {
    return "allowed";
  }
  return "unknown";
}

/** Third-party licences whose text must be saved for shippable items. */
export function needsLicenseText(license) {
  const raw = String(license ?? "").replace(/[\u0300-\u036f]/g, "-");
  // Public-domain and original work need no saved licence text, even when a
  // sourcing note mentions a permissive dedication (e.g. "CC0").
  if (/public domain|original work/i.test(raw)) return false;
  return /(\bmit\b|apache|\bbsd\b|bsd-\d|\bcc0\b|\bofl\b|sil open font)/i.test(raw);
}

/**
 * A status counts as shippable only when it claims reviewed/live/shipped AND
 * carries no draft/pending/blocked qualifier. "draft - pending live
 * verification" and "draft — DO NOT SHIP" are therefore not shippable even
 * though they contain "live"/"ship" as substrings.
 */
export function isShippableStatus(status) {
  const s = String(status ?? "");
  if (!/\b(reviewed|live|ships?|shipped)\b/i.test(s)) return false;
  if (/draft|pending|do.?not.?ship|not yet|blocked|held below/i.test(s)) return false;
  return true;
}

function parseIdHead(part) {
  const m = String(part)
    .replace(/`/g, "")
    .trim()
    .match(new RegExp(`^(${ITEM_FAMILIES}-[A-Za-z0-9-]*?)(\\d+)$`));
  if (!m) return null;
  return { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length };
}

function collectSingles(text) {
  return [
    ...String(text ?? "").matchAll(new RegExp(`\\b(${ITEM_FAMILIES}-[A-Za-z0-9-]+)\\b`, "g")),
  ].map((m) => m[1]);
}

/**
 * Expand a register item_id cell into individual IDs. Handles full ranges
 * ("PROSE-01-001 to PROSE-01-060"), abbreviated ends ("QUOTE-ORIG-091 to
 * 180", "COMP-REPLY-001 to 025") and single IDs. Runaway or inverted ranges
 * fall back to the literal endpoints so a weird cell can never silently cover
 * (or uncover) thousands of IDs.
 */
export function expandIdRange(cell) {
  const clean = String(cell ?? "")
    .replace(/[̀-̄]/g, "-")
    .replace(/`/g, "")
    .trim();
  if (!clean) return [];
  const parts = clean.split(/\s+to\s+|\s+through\s+/i);
  if (parts.length === 1) return collectSingles(clean);
  const head = parseIdHead(parts[0]);
  if (!head) return collectSingles(clean);
  let tail;
  if (/^\d+$/.test(parts[1].trim())) {
    tail = {
      prefix: head.prefix,
      num: parseInt(parts[1].trim(), 10),
      width: Math.max(head.width, parts[1].trim().length),
    };
  } else {
    const parsed = parseIdHead(parts[1]);
    if (!parsed || parsed.prefix !== head.prefix) return collectSingles(clean);
    tail = { ...parsed, width: Math.max(head.width, parsed.width) };
  }
  const count = tail.num - head.num + 1;
  if (count < 1 || count > 2000) return collectSingles(clean);
  const ids = [];
  for (let n = head.num; n <= tail.num; n++) {
    ids.push(`${head.prefix}${String(n).padStart(tail.width, "0")}`);
  }
  return ids;
}

function splitRow(line) {
  let cells = line.trim();
  if (cells.startsWith("|")) cells = cells.slice(1);
  if (cells.endsWith("|")) cells = cells.slice(0, -1);
  return cells.split("|").map((c) => c.trim());
}

const isSeparatorLine = (line) => line.includes("|") && /-/.test(line) && /^[\s|:-]+$/.test(line);

/**
 * Parse every register row out of one markdown document: horizontal tables
 * headed by an exact `item_id` / `item_id range` column, and vertical
 * Field/Value blocks carrying an item_id key. Vertical blocks without an
 * item_id (spec-file and ui-copy whole-file entries) are returned with
 * ids: [] so the caller can count them as file-level licence declarations.
 */
export function parseRegisterMarkdown(text, name) {
  const rows = [];
  const lines = String(text ?? "").split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    if (/^\s*\|/.test(lines[i]) && i + 1 < lines.length && isSeparatorLine(lines[i + 1])) {
      const header = splitRow(lines[i]);
      const hn = header.map((h) => h.toLowerCase().replace(/`/g, "").trim());
      const body = [];
      let j = i + 2;
      while (j < lines.length && /^\s*\|/.test(lines[j])) {
        body.push(splitRow(lines[j]));
        j++;
      }
      if (hn.length === 2 && hn[0] === "field" && hn[1] === "value") {
        const map = {};
        for (const r of body) {
          map[(r[0] ?? "").toLowerCase().replace(/`/g, "").trim()] = (r[1] ?? "").trim();
        }
        rows.push({
          ids: map["item_id"] ? expandIdRange(map["item_id"]) : [],
          license: map["license"] ?? "",
          licenseTextSaved: map["license_text_saved"] ?? null,
          status: map["status"] ?? "",
          source: map["source"] ?? "",
          file: name,
        });
      } else {
        const idIdx = hn.findIndex((h) => h === "item_id" || h === "item_id range");
        if (idIdx !== -1) {
          const licIdx = hn.findIndex((h) => h === "license" || h === "confirmed license");
          const statusIdx = hn.findIndex((h) => h === "status");
          const srcIdx = hn.findIndex((h) => h === "source" || h === "real repository");
          const txtIdx = hn.findIndex(
            (h) => h === "license_text_saved" || h === "license text saved",
          );
          for (const r of body) {
            const cells = [...r];
            while (cells.length < header.length) cells.push("");
            const ids = expandIdRange(cells[idIdx] ?? "");
            if (ids.length === 0) continue;
            rows.push({
              ids,
              license: licIdx === -1 ? "" : (cells[licIdx] ?? ""),
              licenseTextSaved: txtIdx === -1 ? null : (cells[txtIdx] ?? ""),
              status: statusIdx === -1 ? "" : (cells[statusIdx] ?? ""),
              source: srcIdx === -1 ? "" : (cells[srcIdx] ?? ""),
              file: name,
            });
          }
        }
      }
      i = j;
    } else {
      i++;
    }
  }
  return rows;
}

/** Every backticked licensable item ID in a corpus document (deduped). */
export function discoverItemIds(text) {
  const ids = [];
  const seen = new Set();
  for (const m of String(text ?? "").matchAll(
    new RegExp(`\`(${ITEM_FAMILIES}-[A-Za-z0-9-]+)\``, "g"),
  )) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}

/** File-level licence declarations: `License: `...`` lines and `| license |` rows. */
export function extractFileLicenses(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(/License:\s*[*_]*\s*`([^`]+)`/gi))
    out.push(m[1].trim());
  for (const m of String(text ?? "").matchAll(/^\s*\|\s*license\s*\|\s*([^|]+)\|/gim)) {
    out.push(m[1].trim());
  }
  return out;
}

/**
 * A DO-NOT-SHIP ID is pinned when content/README's never-load list names it
 * exactly or via an x-wildcard token such as `CODE-JS-P0x`.
 */
export function isPinnedByNeverLoad(neverLoadText, id) {
  const tokens = [...String(neverLoadText ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  return tokens.some((t) => {
    if (t.toLowerCase() === id.toLowerCase()) return true;
    if (/x/i.test(t)) {
      const pattern = "^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/x+/gi, "\\d+") + "$";
      try {
        return new RegExp(pattern, "i").test(id);
      } catch {
        return false;
      }
    }
    return false;
  });
}

function shortIds(ids) {
  if (ids.length <= 5) return ids.join(", ");
  return `${ids.slice(0, 5).join(", ")} (+${ids.length - 5} more)`;
}

function textSavedMissing(cell) {
  if (cell === null || cell === undefined) return true;
  const s = String(cell).trim();
  return s === "" || /^\s*no\b/i.test(s);
}

function savedTextPaths(cell) {
  return [...String(cell ?? "").matchAll(/`([^`]+\.txt)`/g)].map((m) => m[1].trim());
}

/**
 * Run every content-licence rule over parsed register and corpus documents.
 * Inputs are markdown strings (plus a fileExists predicate for licence-text
 * path checks), so unit tests can prove each failing direction without
 * touching the real corpus.
 */
export function findContentLicenseOffenders({
  registerTexts = [],
  corpusTexts = [],
  neverLoadText = "",
  fileExists = () => false,
} = {}) {
  const offenders = [];
  // Register set = the main register, register-update batches, AND per-file
  // `Register entr*` tables inside the corpus files themselves. Corpus files
  // that declare their own rows are thus covered without duplication in the
  // central register (the documented "an item is covered if ANY of these names
  // it" contract).
  const rows = [...registerTexts, ...corpusTexts].flatMap(({ name, text }) =>
    parseRegisterMarkdown(text, name),
  );

  const totalItems = corpusTexts.reduce((n, { text }) => n + discoverItemIds(text).length, 0);
  if (totalItems === 0) {
    offenders.push(
      `NO-CORPUS-ITEMS-DISCOVERED :: scanned ${corpusTexts.length} file(s), found 0 licensable items`,
    );
  }
  if (rows.length === 0) {
    offenders.push(
      `NO-REGISTER-ROWS :: parsed 0 register rows from ${registerTexts.length} register document(s) and ${corpusTexts.length} corpus file(s)`,
    );
  }
  if (offenders.length > 0) return offenders;

  const index = new Map();
  for (const row of rows) {
    for (const id of row.ids) {
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(row);
    }
  }
  const fileLevelLicenses = new Map();
  for (const { name, text } of corpusTexts) {
    fileLevelLicenses.set(name, extractFileLicenses(text));
  }
  for (const row of rows) {
    if (row.ids.length === 0 && row.license && fileLevelLicenses.has(row.file)) {
      fileLevelLicenses.get(row.file).push(row.license);
    }
  }

  // Rule 1: every corpus item needs a register entry with a licence field,
  // and every corpus file needs a file-level licence declaration.
  for (const { name, text } of corpusTexts) {
    const ids = discoverItemIds(text);
    if (ids.length === 0) continue;
    const declared = (fileLevelLicenses.get(name) ?? []).filter(
      (l) => classifyLicense(l) === "allowed",
    );
    if (declared.length === 0) {
      offenders.push(
        `NO-FILE-LICENSE :: ${name} :: ${ids.length} item(s) but no recognized licence declaration`,
      );
    }
    for (const id of ids) {
      const covering = index.get(id) ?? [];
      if (covering.length === 0) {
        offenders.push(`NO-REGISTER-ENTRY :: ${id} :: ${name}`);
      } else if (covering.every((r) => classifyLicense(r.license) === "missing")) {
        offenders.push(`NO-LICENSE-FIELD :: ${id} :: register row with empty licence :: ${name}`);
      }
    }
  }

  // Rules 2 + 4: licence values and saved licence text, per register row.
  for (const row of rows) {
    if (row.ids.length === 0) continue;
    const kind = classifyLicense(row.license);
    const who = `${shortIds(row.ids)} :: ${row.file}`;
    if (kind === "copyleft") {
      offenders.push(`COPYLEFT-LICENSE :: ${who} :: ${row.license}`);
      continue;
    }
    if (kind === "missing" || kind === "unknown") {
      offenders.push(`UNKNOWN-LICENSE :: ${who} :: ${row.license || "(empty)"} (fail-closed)`);
      continue;
    }
    if (BANNED_LINEAGE_RE.test(`${row.source} ${row.license}`)) {
      offenders.push(`BANNED-LINEAGE-SOURCE :: ${who} :: ${row.source}`);
    }
    if (needsLicenseText(row.license) && isShippableStatus(row.status)) {
      if (textSavedMissing(row.licenseTextSaved)) {
        offenders.push(
          `LICENSE-TEXT-MISSING :: ${who} :: ${row.license} :: status "${row.status}"`,
        );
      } else {
        for (const p of savedTextPaths(row.licenseTextSaved)) {
          if (!fileExists(p))
            offenders.push(`LICENSE-FILE-MISSING :: ${shortIds(row.ids)} :: ${p}`);
        }
      }
    }
  }

  // Rule 3: DO-NOT-SHIP items stay pinned and never read as shippable.
  const doNotShipIds = new Set();
  for (const row of rows) {
    if (DO_NOT_SHIP_RE.test(row.status)) {
      for (const id of row.ids) doNotShipIds.add(id);
    }
  }
  for (const id of [...doNotShipIds].sort()) {
    if (!isPinnedByNeverLoad(neverLoadText, id)) {
      offenders.push(`DO-NOT-SHIP-UNPINNED :: ${id} :: not listed in content/README never-load`);
    }
    for (const row of index.get(id) ?? []) {
      if (isShippableStatus(row.status)) {
        offenders.push(
          `DO-NOT-SHIP-MARKED-SHIPPABLE :: ${id} :: status "${row.status}" :: ${row.file}`,
        );
      }
    }
  }

  return offenders;
}

function walkMarkdown(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      // README.md documents the never-load list and is not licensable content.
      out.push(full);
    }
  }
  return out;
}

function familyOf(id) {
  const m = id.match(/^(PROSE|QUOTE|CODE|WORDLIST|COMP|FONT)-/);
  return m ? m[1] : "OTHER";
}

/**
 * Collect the real corpus inputs from a repo root: the central register, the
 * register-update batches, every corpus markdown file, and the never-load
 * list. Exported so the test can assert the real corpus passes (and so the CLI
 * and the test cannot drift on which files count).
 */
export function collectCorpusInputs(rootDir) {
  const docsDir = join(rootDir, "docs");
  const contentDir = join(rootDir, "content");
  const registerMain = join(docsDir, "content-license-register.md");
  const neverLoadFile = join(contentDir, "README.md");

  const registerTexts = [];
  if (existsSync(registerMain)) {
    registerTexts.push({
      name: "docs/content-license-register.md",
      text: readFileSync(registerMain, "utf8"),
    });
  }
  if (existsSync(docsDir)) {
    for (const entry of readdirSync(docsDir)) {
      if (REGISTER_UPDATE_RE.test(entry) && DOCS_CORPUS_RE.test(entry)) {
        registerTexts.push({
          name: `docs/${entry}`,
          text: readFileSync(join(docsDir, entry), "utf8"),
        });
      }
    }
  }

  const corpusTexts = [];
  if (existsSync(docsDir)) {
    for (const entry of readdirSync(docsDir)) {
      if (!DOCS_CORPUS_RE.test(entry)) continue;
      if (DOCS_NON_CORPUS.has(entry) || REGISTER_UPDATE_RE.test(entry)) continue;
      corpusTexts.push({ name: `docs/${entry}`, text: readFileSync(join(docsDir, entry), "utf8") });
    }
  }
  for (const full of walkMarkdown(contentDir)) {
    corpusTexts.push({
      name: full.replace(rootDir, "").replaceAll("\\", "/").replace(/^\//, ""),
      text: readFileSync(full, "utf8"),
    });
  }

  const neverLoadText = existsSync(neverLoadFile) ? readFileSync(neverLoadFile, "utf8") : "";
  return { registerTexts, corpusTexts, neverLoadText };
}

async function main() {
  const { registerTexts, corpusTexts, neverLoadText } = collectCorpusInputs(root);
  const offenders = findContentLicenseOffenders({
    registerTexts,
    corpusTexts,
    neverLoadText,
    fileExists: (p) => existsSync(join(root, p)),
  });

  if (offenders.length > 0) {
    console.error("FAIL: content-corpus licence violations (CNT-07):");
    for (const o of offenders) {
      console.error(`  - ${o}`);
    }
    process.exit(1);
  }

  const counts = {};
  let total = 0;
  for (const { text } of corpusTexts) {
    for (const id of discoverItemIds(text)) {
      total++;
      const fam = familyOf(id);
      counts[fam] = (counts[fam] ?? 0) + 1;
    }
  }
  const breakdown = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fam, n]) => `${fam} ${n}`)
    .join(", ");
  const rowCount = [...registerTexts, ...corpusTexts].reduce(
    (n, { name, text }) => n + parseRegisterMarkdown(text, name).length,
    0,
  );
  console.log(
    `Content-licence gate passed (CNT-07): ${total} items across ${corpusTexts.length} files (${breakdown}), ${rowCount} register rows.`,
  );
}

// Only run as CLI when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  await main();
}
