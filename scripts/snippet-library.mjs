/**
 * Code snippet library (CNT-04) - the pure core.
 *
 * WHAT THIS IS. The layer between the CNT-01 corpus artifact and the programmer
 * track. `content/corpus.json` says what exists and what licence it has; this
 * module turns the 34 emitted JavaScript snippets into **typed, reviewable
 * records** with everything the track needs to select one: real size, a
 * **computed** token-class mix, surface/feature tags, drill tiers, and the
 * licence fields promoted out of the register join. It also carries the two
 * things CNT-01 deliberately refused to resolve - the `CODE-JS-P0x` placeholders
 * and the `CODE-JS-001`/`CODE-JS-002` duplicate - as first-class, *present but
 * unselectable* records.
 *
 * PURE BY CONSTRUCTION: no `fs`, no `clock`, no randomness, no engine import.
 * The lexer arrives as the injected `lexSnippet` parameter, which is what lets
 * the tests run failing directions against a hand-made lexer and lets the
 * mutant suite re-import a deliberately broken copy of this file. The CLI
 * (`build-snippets.mjs`) supplies the real PRG-01 lexer; see
 * `snippet-engine-loader.mjs` for why that indirection exists.
 *
 * WHY REUSE INSTEAD OF REIMPLEMENTING (this is the whole point of the task):
 *
 *   - `classifyLicense`, `normaliseForDedupe`, `sha256Hex`, `compareIds` and
 *     `compareItems` come from `corpus-pipeline.mjs`; `classifyLicense` itself
 *     comes from CNT-07's `check-content-licenses.mjs`. A second copy of the
 *     licence regexes would be a second opinion that drifts, and the one rule
 *     that must never drift is "is this content licence-clean".
 *   - The token classes, the diagnostics and the tiling invariant come from
 *     `packages/engine`'s `tokenize` (PRG-01). Not a reimplementation: the
 *     engine is the single authority for what a token is (AGENTS.md rule 3), and
 *     a content gate with its own lexer would validate against fiction.
 *   - The drill-tier numbering comes from CNT-05's `TIER_BY_FAMILY`.
 *
 * NEVER EXECUTE (AGENTS.md rule 5). This module only ever *reads* snippet text:
 * it hands the text to a lexer, computes set membership and string operations,
 * and writes a JSON document. There is no `eval`, no `new Function`, no dynamic
 * import of snippet content, no `child_process`, and no test anywhere runs a
 * snippet. `scripts/snippet-no-execution.test.mjs` proves the negative by static
 * analysis of this file and by a poisoned-global runtime check, so the claim is
 * mechanical rather than a promise in a comment.
 */
import { compareIds, normaliseForDedupe, sha256Hex } from "./corpus-pipeline.mjs";
import { classifyLicense, isShippableStatus, needsLicenseText } from "./check-content-licenses.mjs";

/**
 * Artifact version. Bump on any shape change. Deliberately separate from the
 * corpus version it reads: the library can be rebuilt without the corpus moving.
 */
export const LIBRARY_VERSION = "1.0.0";

/**
 * The typability scorer's version, which is `null` because CNT-02 has not landed
 * and, per implementation guide 6.5 step 8, is not valid for code text anyway.
 *
 * It is written into every artifact rather than mentioned in prose because a
 * missing field reads as "nobody thought about it" while `null` with a sibling
 * reason reads as "we looked and it is not available".
 */
export const TYPABILITY_MODEL_VERSION = null;

/** Why no band is computed here, recorded on every record with `difficulty.band === null`. */
export const NO_BAND_REASON =
  "no typability band for code: CNT-02's scorer is not built and implementation guide 6.5 step 8 " +
  "states it is not valid for code or symbol-heavy text. A band is only ever copied from the " +
  "content register, never guessed from length or symbol density.";

/**
 * The closed set of content surfaces (what the snippet *is*), from the register's
 * own `content_type_tag`. Distinct from the token *surface tags* below, which say
 * what a snippet is made of - a react snippet is `code.react` by content type and
 * carries `brackets`/`chords`/`strings` by mix, and conflating the two would make
 * "which surfaces does this library cover" answer two different questions.
 */
export const CONTENT_SURFACES = ["utility", "algorithm", "web", "react"];

/** `contentType` prefix -> library surface. */
const CONTENT_TYPE_SURFACE = {
  "code.utility": "utility",
  "code.algorithm": "algorithm",
  "code.web": "web",
  "code.react": "react",
};

/**
 * Surface tag per token class, derived from the mix rather than declared by
 * hand. Every one of the twelve classes gets a tag, so a class with no drill
 * (comments) is still visible in the record instead of quietly missing.
 */
export const CLASS_SURFACE_TAGS = Object.freeze({
  bracket: "brackets",
  operator: "operators",
  chord: "chords",
  string: "strings",
  number: "numbers",
  "number-systems": "number-systems",
  identifier: "identifiers",
  keyword: "keywords",
  comment: "comments",
  path: "paths",
  data: "data",
  whitespace: "whitespace",
});

/** Tag -> drill tier, from the skill's six-tier scheme. `null` = no drill covers it. */
export const SURFACE_TIERS = Object.freeze({
  brackets: 1,
  operators: 2,
  chords: 2,
  strings: 3,
  numbers: 4,
  "number-systems": 5,
  paths: 5,
  identifiers: 6,
  keywords: 6,
  // A regex literal is Class 12 `data`, but typing one is quote-context string
  // work (packages/engine/src/token-class.ts says so of the tension), so it
  // drills with tier 3 rather than being unclassifiable.
  data: 3,
  // Structure: PRG-15's auto-indent owns it, and it is V1 per the tier tables.
  whitespace: 7,
  // Comments are docs, not a drill. Explicitly null rather than absent.
  comments: null,
});

/** Drill tiers CNT-05's `TIER_BY_FAMILY` owns, versus the ones no generator covers. */
export const GENERATOR_OWNED_TIERS = Object.freeze([1, 3, 4, 5, 6]);

/** Tiers with no seeded generator behind them, with the reason. */
export const UNGENERATED_TIERS = Object.freeze({
  2: "operator/chord tier has no generator family; PRG-11 owns bracket-pair latency and tier-2 drills are hand-authored",
  7: "whitespace/structure is auto-indent (PRG-15), deferred to V1 by the tier tables",
});

/** The closed feature vocabulary. Every entry is derived from the token map, never typed in. */
export const FEATURE_TAGS = Object.freeze([
  "function-declaration",
  "class-declaration",
  "arrow-function",
  "async-await",
  "template-literal",
  "regex-literal",
  "comment-line",
  "comment-block",
  "default-parameter",
  "spread-rest",
  "optional-chaining",
  "nullish-coalescing",
  "jsx",
  "dom-api",
  "react-hook",
  "array-method-chain",
  "promise",
]);

/** Identifiers that mean "this snippet touches the platform DOM or storage". */
const DOM_API_IDENTIFIERS = new Set([
  "document",
  "window",
  "localStorage",
  "alert",
  "fetch",
  "form",
  "console",
]);

/** Built-in array methods whose spelling is the drill target. */
const ARRAY_METHOD_IDENTIFIERS = new Set([
  "map",
  "filter",
  "reduce",
  "forEach",
  "slice",
  "splice",
  "push",
  "pop",
  "shift",
  "includes",
  "indexOf",
  "join",
  "concat",
  "sort",
  "reverse",
]);

/** Promise plumbing worth tagging: tier-3-adjacent chord work. */
const PROMISE_IDENTIFIERS = new Set(["Promise", "resolve", "reject", "all"]);

const REACT_HOOK_NAMES = new Set(["useState", "useEffect", "useRef", "useMemo", "useCallback"]);

/** Regex-literal flag letters the ECMAScript grammar allows. */
const REGEX_FLAG_TAIL_RE = /^\/(?:[^/\\\n]|\\.)+\/[dgimsuvy]*$/u;

/* ------------------------------------------------------------------ helpers */

/** Deterministic ordering: by file, then by id (numeric segments compare numerically). */
const byId = (a, b) => compareIds(a.id, b.id);

/** Round to 6 places so JSON output is stable across platforms. */
const round = (n) => Math.round(n * 1e6) / 1e6;

/** Every non-whitespace character in a mix, the denominator for symbol share. */
function typedChars(chars) {
  return Object.entries(chars).reduce((sum, [cls, n]) => (cls === "whitespace" ? sum : sum + n), 0);
}

/** Span text, recovered from the map. The map stores offsets, not text. */
function spanText(map, span) {
  return map.text.slice(span.index, span.index + span.length);
}

const OPEN_BRACKETS = new Set(["(", "[", "{"]);

/**
 * The innermost still-open bracket before `index`, or null at top level.
 *
 * Used only for the `default-parameter` feature, which is detectable as "an `=`
 * inside a parameter list" and nothing else. The token map deliberately does not
 * make that distinction, and a content pipeline must not invent it: it reads the
 * same spans the map ships, so the two can never disagree about which characters
 * are brackets.
 */
function innermostOpenBracket(map, index) {
  const stack = [];
  for (const span of map.spans) {
    if (span.index >= index) break;
    if (span.class !== "bracket") continue;
    const text = spanText(map, span);
    if (OPEN_BRACKETS.has(text)) stack.push(text);
    else if (stack.length > 0) stack.pop();
  }
  return stack[stack.length - 1] ?? null;
}

/**
 * Derive feature tags from the token map.
 *
 * Every rule reads spans, never raw source text, except the two that must see
 * the literal: `template-literal` (a backtick opener) and `regex-literal` (the
 * `/…/flags` shape). Both are decided from the span's own text, so they cannot
 * be fooled by a `/` inside a comment or a backtick inside a single-quoted
 * string - those are `comment` and `string` spans respectively.
 */
function deriveFeatures(map) {
  const found = new Set();
  let hasDefaultParameter = false;

  for (const span of map.spans) {
    const text = spanText(map, span);
    switch (span.class) {
      case "keyword":
        if (text === "function") found.add("function-declaration");
        if (text === "class") found.add("class-declaration");
        if (text === "async" || text === "await") found.add("async-await");
        break;
      case "chord":
        if (text === "=>") found.add("arrow-function");
        if (text === "...") found.add("spread-rest");
        if (text === "?.") found.add("optional-chaining");
        if (text === "??") found.add("nullish-coalescing");
        break;
      case "operator":
        if (text === "=" && innermostOpenBracket(map, span.index) === "(") {
          hasDefaultParameter = true;
        }
        break;
      case "string":
        if (text === "`") found.add("template-literal");
        break;
      case "data":
        if (REGEX_FLAG_TAIL_RE.test(text)) found.add("regex-literal");
        break;
      case "comment":
        found.add(text.startsWith("/*") ? "comment-block" : "comment-line");
        break;
      case "identifier":
        if (DOM_API_IDENTIFIERS.has(text)) found.add("dom-api");
        if (ARRAY_METHOD_IDENTIFIERS.has(text)) found.add("array-method-chain");
        if (REACT_HOOK_NAMES.has(text)) found.add("react-hook");
        if (PROMISE_IDENTIFIERS.has(text) || text === "Promise") found.add("promise");
        break;
      default:
        break;
    }
  }

  if (hasDefaultParameter) found.add("default-parameter");
  return [...found].sort();
}

/** Surface tags implied by a character mix: a class is present iff it has characters. */
function deriveSurfaces(chars) {
  const present = new Set();
  for (const [cls, tag] of Object.entries(CLASS_SURFACE_TAGS)) {
    if ((chars[cls] ?? 0) > 0) present.add(tag);
  }
  return [...present].sort();
}

/** Distinct drill tiers the snippet's surfaces cover, ascending. */
function deriveTiers(surfaces) {
  const tiers = new Set();
  for (const surface of surfaces) {
    const tier = SURFACE_TIERS[surface];
    if (typeof tier === "number") tiers.add(tier);
  }
  return [...tiers].sort((a, b) => a - b);
}

/** Non-ASCII characters, with the class each landed in, so a reviewer can see they are string content. */
function nonAsciiIn(map) {
  const out = [];
  const seen = new Set();
  for (const span of map.spans) {
    const text = spanText(map, span);
    for (const ch of text) {
      if (ch.codePointAt(0) <= 126) continue;
      const key = `${ch}:${span.class}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ char: ch, class: span.class, index: span.index });
    }
  }
  return out.sort((a, b) => a.index - b.index || a.char.localeCompare(b.char));
}

/**
 * The difficulty block.
 *
 * A band appears ONLY when the content register declared one, and it is copied
 * verbatim with `source: "register"`. When nothing declared one, the band is
 * `null` with the reason attached - never inferred from length or symbol density,
 * because a guess here would be indistinguishable from a measurement downstream.
 */
function buildDifficulty(registerBand) {
  if (registerBand === null || registerBand === undefined) {
    return { band: null, source: null, reason: NO_BAND_REASON };
  }
  return { band: registerBand, source: "register", reason: null };
}

/** Everything blocking publication, recomputed rather than copied from the corpus. */
function buildPublishBlockers(licence, difficulty, defects) {
  const blockers = new Set();
  if (licence.licenseClass !== "allowed") blockers.add(`licence-${licence.licenseClass}`);
  if (!licence.declaration) blockers.add("licence-missing");
  if (!licence.shippable) blockers.add(`status-not-shippable: ${licence.registerStatus}`);
  if (difficulty.band === null) blockers.add("no-difficulty-band");
  for (const defect of defects) blockers.add(`content-defect: ${defect.code}`);
  // A Set, because an empty declaration yields `licence-missing` from BOTH the
  // class rule and the emptiness rule, and a blocker list with the same string
  // twice is a diff nobody can read.
  return [...blockers];
}

/* --------------------------------------------------------------- the records */

/**
 * Duplicate groups among snippets, keyed by CNT-01's own normalisation and
 * fingerprint so the finding means the same thing here as in the corpus.
 *
 * Recomputed from the text rather than read out of the corpus artifact's
 * `duplicates` array, so the library's duplicate finding is self-consistent: if
 * someone edits a snippet's text, this finds the new collision without the corpus
 * being regenerated first. The corpus is the source of the *text*; this is the
 * source of the *verdict about this library*.
 *
 * Takes `{ id, code }` pairs so the same function serves both the pre-record
 * pass (over corpus items) and a gate re-check (over artifact records).
 */
export function findDuplicateGroups(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (typeof entry.code !== "string") continue;
    const normalised = normaliseForDedupe(entry.code);
    if (normalised === "") continue;
    const key = sha256Hex(normalised);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => {
      const ids = members.map((m) => m.id).sort(byId);
      const normalised = normaliseForDedupe(members[0].code);
      return {
        key,
        ids,
        kept: ids[0],
        dropped: ids.slice(1),
        excerpt: normalised.length > 90 ? `${normalised.slice(0, 90)}…` : normalised,
      };
    })
    .sort((a, b) => compareIds(a.kept, b.kept));
}

/**
 * The licence block shared by every record shape, placeholders included.
 *
 * The classifier verdict is always recomputed from the declaration string rather
 * than copied from the corpus artifact, so a record whose `licenseClass` was
 * hand-edited to "allowed" over a copyleft declaration fails the gate instead of
 * sailing through.
 */
function licenceBlock(
  declaration,
  { source = "", attribution = null, registerRef = null, registerStatus = "" } = {},
) {
  const trimmed = String(declaration ?? "").trim();
  return {
    declaration: trimmed,
    licenseClass: classifyLicense(trimmed),
    /** Third-party licences whose full text must be saved before the item can ship. */
    textRequired: needsLicenseText(trimmed),
    source,
    attribution,
    registerRef,
    registerStatus,
    /** Withheld records are never shippable regardless of what the register says. */
    shippable: isShippableStatus(registerStatus),
  };
}

/**
 * A withheld record: no text, a stated reason, and an action.
 *
 * Two kinds reach here. The `CODE-JS-P0x` placeholders name real repositories
 * whose licences are confirmed but whose exact file content was never pulled at a
 * pinned commit. A duplicate id is the same `chunkArray` function under two ids.
 *
 * Both are present in the library on purpose. Omitting them would make them
 * invisible, and an invisible placeholder is one somebody later "fills in" from a
 * search engine; an invisible duplicate is one somebody later re-adds from the
 * other file. A record that says `code: null` with a reason and an action cannot
 * be filled in by accident, and cannot be deleted by accident either.
 */
function buildWithheld({
  id,
  status,
  reason,
  detail,
  code = null,
  provenance = null,
  licence,
  defectCode,
  action,
}) {
  return {
    id,
    language: "javascript",
    surface: null,
    contentType: null,
    /** Always null. That is the point: no text, so nothing to lex and nothing to type. */
    code,
    status,
    size: null,
    declaredTokenMix: null,
    tokenMap: null,
    tokenClassMix: null,
    tags: null,
    difficulty: { band: null, source: null, reason: NO_BAND_REASON },
    licence,
    provenance,
    defects: [{ code: defectCode, detail, action, needsHumanDecision: true }],
    publishBlockers: [status, reason, ...(code === null ? ["no-content-body"] : [])],
  };
}

/** The action a human must take before a withheld placeholder can become a snippet. */
export const PLACEHOLDER_ACTION =
  "clone the named repository at a pinned commit, copy the exact file, save the LICENSE file from " +
  "that same commit, then run the item through the register's second-reviewer step. Until then " +
  "this id stays withheld: its licence is confirmed but its content was never pinned, and " +
  "reconstructing it from search results is exactly the failure the register exists to catch.";

/**
 * Build the whole library from the CNT-01 corpus artifact.
 *
 * `lexSnippet(text, language)` must return the engine's token map: `{ text,
 * spans, diagnostics, language }`. It is injected so this module stays pure and so
 * the tests can drive failing directions without touching the engine.
 *
 * Returns `{ version, records, placeholders, defects, coverage, stats }` - no
 * timestamp, no commit hash, no absolute path, because a build whose output moves
 * when nothing in the content moved is a build nobody regenerates.
 */
export function buildSnippetLibrary({ corpus, licenceRows = [], lexSnippet }) {
  if (typeof lexSnippet !== "function") {
    throw new TypeError("buildSnippetLibrary requires lexSnippet (the PRG-01 token map)");
  }

  const emitted = (corpus.items ?? []).filter((item) => item.family === "CODE");
  const rejected = corpus.rejected ?? [];
  // Only CODE ids are this layer's business. A rejected PROSE or QUOTE is the
  // corpus pipeline's finding, and copying it in here would report content
  // defects this library does not hold text for.
  const codeRejected = rejected.filter((r) => r.id.startsWith("CODE-"));
  const rowById = new Map();
  for (const row of licenceRows) {
    for (const id of row.ids) if (!rowById.has(id)) rowById.set(id, row);
  }

  // Pass 1: the duplicate groups, so a record knows about its collision before
  // its own defect list is built. A record cannot report a defect it has not seen.
  const groups = findDuplicateGroups(emitted.map((item) => ({ id: item.id, code: item.text })));
  const dupById = new Map();
  for (const group of groups) {
    for (const id of group.ids) dupById.set(id, group);
  }

  const records = emitted.map((item) => {
    const map = lexSnippet(item.text, item.language);
    const surface = CONTENT_TYPE_SURFACE[item.contentType] ?? null;
    const counts = map.counts;
    const typed = typedChars(counts.chars);
    const surfaces = deriveSurfaces(counts.chars);

    const defects = [];
    // Two sources for the same collision, and both are needed. The recomputed
    // group catches a collision inside the emitted set; the corpus rejection
    // catches the case CNT-01 already resolved by dropping the twin. Without the
    // second one, the library would show `CODE-JS-001` as clean and the collision
    // would vanish from the programmer track's view entirely.
    const recomputed = dupById.get(item.id);
    const droppedTwin = codeRejected.find(
      (r) => r.reason === "duplicate-text" && item.id === r.detail.match(/identical to (\S+)/)?.[1],
    );
    const twins = new Set();
    if (recomputed) {
      for (const id of recomputed.ids) if (id !== item.id) twins.add(id);
    }
    if (droppedTwin) twins.add(droppedTwin.id);
    if (twins.size > 0) {
      defects.push({
        code: "duplicate-text",
        detail: `byte-identical to ${[...twins].sort(byId).join(", ")} after NFKC + whitespace + case normalisation`,
        twins: [...twins].sort(byId),
        needsHumanDecision: true,
      });
    }

    const difficulty = buildDifficulty(item.difficulty);
    const licence = licenceBlock(item.license, {
      source: item.source,
      attribution: item.attribution,
      registerRef: item.registerRef,
      registerStatus: item.registerStatus,
    });

    const record = {
      id: item.id,
      language: item.language,
      surface,
      contentType: item.contentType,
      code: item.text,
      status: defects.length > 0 ? "withheld-duplicate" : "library",
      size: {
        lines: item.text.split("\n").length,
        characters: item.text.length,
        maxLineLength: Math.max(...item.text.split("\n").map((line) => line.length)),
      },
      /** The author's own note from the source document, kept verbatim beside the computed mix. */
      declaredTokenMix: item.tokenMix ?? null,
      tokenMap: {
        tokenizerVersion: map.tokenizerVersion,
        language: map.language,
        /** False when the lexer reported anything at all (impl guide 6.3 step 4). */
        clean: map.diagnostics.length === 0,
        diagnostics: map.diagnostics.map((d) => ({ code: d.code, index: d.index, text: d.text })),
        tilingIssues: map.tilingIssues,
        nonAscii: nonAsciiIn(map),
      },
      tokenClassMix: {
        chars: counts.chars,
        tokens: counts.tokens,
        /** Share of non-whitespace characters that are bracket, operator or chord. */
        symbolShare:
          typed === 0
            ? 0
            : round((counts.chars.bracket + counts.chars.operator + counts.chars.chord) / typed),
        typedCharacters: typed,
      },
      tags: {
        surfaces,
        tiers: deriveTiers(surfaces),
        features:
          surface === "react" ? [...deriveFeatures(map), "jsx"].sort() : deriveFeatures(map),
      },
      difficulty,
      licence,
      provenance: item.provenance,
      defects,
      publishBlockers: [],
      /** The register's own verdict, kept so the library does not silently improve on it. */
      corpusShippable: item.shippable === true,
      corpusPublishBlockers: item.publishBlockers ?? [],
    };

    record.publishBlockers = buildPublishBlockers(licence, difficulty, defects);
    if (record.status !== "library") record.publishBlockers.push(`status-${record.status}`);
    return record;
  });

  records.sort(byId);

  // Withheld records. Two reasons, both editorial rather than a licensing or
  // safety violation, which is why they are records rather than build failures:
  //
  //   `do-not-ship`      - the `CODE-JS-P0x` placeholders. Real repositories,
  //                       confirmed licences, content never pulled.
  //   `duplicate-text`   - an id CNT-01 dropped as a duplicate. Carried here with
  //                       `code: null` so the collision is visible from both
  //                       sides without the artifact storing the same text twice
  //                       (a selector reading this file must never see two
  //                       identical items it might pick from).
  //
  // A rejected entry under any OTHER reason is a pipeline defect, and CNT-01
  // already fails the build on those. Silently absorbing one here would make this
  // layer a place where content disappears, so the reason is recorded rather than
  // filtered away.
  const withheld = codeRejected
    .filter((r) => r.reason === "do-not-ship" || r.reason === "duplicate-text")
    .map((r) => {
      const group = r.reason === "duplicate-text" ? groups.find((g) => g.ids.includes(r.id)) : null;
      return buildWithheld({
        id: r.id,
        status: r.reason === "do-not-ship" ? "withheld-do-not-ship" : "withheld-duplicate",
        reason: r.reason,
        defectCode: r.reason === "do-not-ship" ? "do-not-ship" : "duplicate-text",
        detail:
          r.reason === "do-not-ship"
            ? `${r.detail}. Licence confirmed (${rowById.get(r.id)?.license ?? "unknown"}), exact upstream content never pulled at a pinned commit.`
            : `${r.detail}. Kept id: ${group?.kept ?? "unknown"}. Carried with code: null so the artifact never stores the same text twice.`,
        provenance: r.provenance,
        licence: licenceBlock(rowById.get(r.id)?.license ?? "", {
          source: rowById.get(r.id)?.source ?? "",
          registerRef: rowById.get(r.id)?.file ?? null,
          registerStatus: rowById.get(r.id)?.status ?? "",
        }),
        action:
          r.reason === "do-not-ship"
            ? PLACEHOLDER_ACTION
            : "Reconcile the source document: keep one id for this function and delete the other. " +
              "Which id survives is an editorial decision, so the build does not decide it by sort order.",
      });
    })
    .sort(byId);

  const placeholders = withheld.filter((w) => w.status === "withheld-do-not-ship");

  // The duplicate collisions, as decisions the library hands to a human rather
  // than facts it pretends to have settled. Both sources are folded together so
  // the collision is one finding with every id attached, whether CNT-01 dropped
  // the twin or the library found the collision itself.
  const duplicateFindings = [];
  const seenFinding = new Set();
  for (const group of groups) {
    seenFinding.add(group.key);
    duplicateFindings.push(group);
  }
  for (const rejection of codeRejected.filter((r) => r.reason === "duplicate-text")) {
    const alreadyCovered = groups.some((g) => g.ids.includes(rejection.id));
    if (alreadyCovered) continue;
    const kept = rejection.detail.match(/identical to (\S+)/)?.[1] ?? null;
    duplicateFindings.push({
      key: rejection.detail.match(/\(([0-9a-f]+)\)/)?.[1] ?? "",
      ids: [kept, rejection.id].filter(Boolean).sort(byId),
      kept,
      dropped: [rejection.id],
      excerpt: "",
      fingerprint: rejection.detail.match(/\(([0-9a-f]+)\)/)?.[1] ?? null,
      fromCorpusRejection: true,
    });
  }
  duplicateFindings.sort((a, b) => compareIds(a.ids[0] ?? "", b.ids[0] ?? ""));

  const defects = duplicateFindings.map((group) => ({
    code: "duplicate-text",
    ids: group.ids,
    kept: group.kept,
    dropped: group.dropped,
    fingerprint: group.fingerprint ?? group.key,
    excerpt: group.excerpt,
    status: "needs-human-decision",
    detail:
      "Two ids carry byte-identical text. The library keeps the emitted id WITH its duplicate defect " +
      "recorded, and carries the dropped id as a withheld record with code: null - so the collision is " +
      "visible from both sides and the artifact never stores the same text twice. Which id survives is " +
      "an editorial decision about the source document, not something a build should settle by sort order.",
    decision:
      "Reconcile the source document: keep one id for this function and delete the other. The library " +
      "will then report one clean record and no defect.",
  }));

  const allSurfaceTags = [...new Set(records.flatMap((rec) => rec.tags.surfaces))].sort();
  const allFeatures = [...new Set(records.flatMap((rec) => rec.tags.features))].sort();
  const allTiers = [...new Set(records.flatMap((rec) => rec.tags.tiers))].sort((a, b) => a - b);

  const exercisedClasses = new Set();
  for (const record of records) {
    for (const [cls, chars] of Object.entries(record.tokenClassMix.chars)) {
      if (chars > 0) exercisedClasses.add(cls);
    }
  }

  const contentSurfaces = [...new Set(records.map((rec) => rec.surface).filter(Boolean))].sort();

  const coverage = {
    /** Content surfaces the register has written snippets for. */
    contentSurfacesExercised: contentSurfaces,
    contentSurfacesAbsent: CONTENT_SURFACES.filter((s) => !contentSurfaces.includes(s)),
    /** Token surface tags (what a snippet is made of), from the computed mix. */
    surfaceTagsExercised: allSurfaceTags,
    tokenClassesExercised: [...exercisedClasses].sort(),
    featuresExercised: allFeatures,
    featuresDeclaredButUnused: FEATURE_TAGS.filter((f) => !allFeatures.includes(f)),
    tiersExercised: allTiers,
    tiersUngenerated: Object.fromEntries(
      allTiers
        .filter((t) => !GENERATOR_OWNED_TIERS.includes(t))
        .map((t) => [t, UNGENERATED_TIERS[t] ?? "unclassified tier"]),
    ),
  };

  const stats = {
    records: records.length,
    placeholders: placeholders.length,
    withheldDuplicates: withheld.filter((w) => w.status === "withheld-duplicate").length,
    /** Publishable right now: no blockers. Zero today, which is the corpus's real state. */
    selectable: records.filter((rec) => rec.publishBlockers.length === 0).length,
    shippableByRegister: records.filter((rec) => rec.licence.shippable).length,
    withDeclaredBand: records.filter((rec) => rec.difficulty.band !== null).length,
    lexClean: records.filter((rec) => rec.tokenMap.clean).length,
    defects: defects.length,
    bySurface: countBy(records.filter((r) => r.surface !== null).map((r) => r.surface)),
    byBand: countBy(records.map((r) => r.difficulty.band ?? "none")),
  };

  return {
    version: LIBRARY_VERSION,
    typabilityModelVersion: TYPABILITY_MODEL_VERSION,
    sources: {
      corpus: "content/corpus.json",
      corpusVersion: corpus.version ?? null,
      tokenizer: "packages/engine/src/token-map.ts",
      licenseClassifier: "scripts/check-content-licenses.mjs",
    },
    stats,
    coverage,
    defects,
    /** Every withheld id, placeholder and duplicate alike. */
    withheld,
    /** The subset that is a real-repository placeholder. */
    placeholders,
    records,
  };
}

/** Sorted key->count map, for stable JSON. */
function countBy(values) {
  const out = {};
  for (const value of [...values].sort()) out[value] = (out[value] ?? 0) + 1;
  return out;
}

/**
 * Deterministic serialisation: key order comes from construction, never from
 * hash order, and the document ends with exactly one newline.
 */
export function serialiseSnippetLibrary(build) {
  return `${JSON.stringify(
    {
      version: build.version,
      typabilityModelVersion: build.typabilityModelVersion,
      sources: build.sources,
      stats: build.stats,
      coverage: build.coverage,
      defects: build.defects,
      withheld: build.withheld,
      placeholders: build.placeholders,
      records: build.records,
    },
    null,
    2,
  )}\n`;
}
