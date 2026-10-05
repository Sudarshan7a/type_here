/**
 * Loads the PRG-01 token map (packages/engine) into a plain-ESM Node script.
 *
 * WHY THIS FILE EXISTS AT ALL.
 *
 * Every other file in `scripts/` is dependency-free plain ESM, and so are these.
 * But CNT-04 has to run the *authoritative* lexer — the whole point of the token
 * validation is that a second opinion about "is this snippet lexable" is worth
 * nothing. `packages/engine` ships TypeScript source (`main: src/index.ts`) and
 * the workspace root has no dependency on it, so `import "@realtype/engine"`
 * cannot resolve from here, and a bare relative import of a `.ts` file fails on
 * the engine's own internal `./language-profiles.js` specifiers.
 *
 * Three ways out, and why this one:
 *
 *   1. Import `packages/engine/dist/**` instead. Rejected: it makes the content
 *      gate depend on `pnpm build` having run first, so the same command passes
 *      or fails depending on what someone ran before it. `check:corpus`
 *      deliberately has no such dependency, and so does this.
 *   2. Vendor a second lexer into `scripts/`. Rejected: it is precisely the
 *      "second opinion that drifts" failure AGENTS.md rule 3 forbids.
 *   3. Load the source. Node 24 (`.nvmrc`) strips TypeScript types natively, so
 *      the only missing piece is resolving the engine's `./x.js` specifiers to
 *      the `./x.ts` files that are actually on disk. That is a ~12-line
 *      synchronous resolve hook.
 *
 * The hook is deliberately minimal and total: it rewrites a relative `.js`
 * specifier to `.ts` **only** when the `.js` file does not exist and the `.ts`
 * file does. If either condition fails, Node's own resolution runs unchanged.
 * There is no source transformation and no aliasing, so the code that validates
 * a snippet is byte-for-byte the code the browser types against.
 *
 * NO EXECUTION (AGENTS.md rule 5). This module loads exactly four engine
 * functions — `tokenize`, `tokenClassCounts`, `validateTokenMap`,
 * `sanitizeSnippet` — plus the `TOKEN_CLASSES` taxonomy constant. All four are
 * pure: `tokenize` is a character scanner, `tokenClassCounts` sums its spans,
 * `validateTokenMap` re-checks the tiling invariant, `sanitizeSnippet` is a
 * string escaper. Nothing here compiles, evaluates, imports-by-value or spawns.
 * `scripts/snippet-no-execution.test.mjs` proves that mechanically rather than
 * asserting it in a comment.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Rewrite an extensionless-resolution `.js` specifier to the `.ts` file that
 * exists, and otherwise stay out of the way completely.
 */
function resolveTypeScriptSource(specifier, context, nextResolve) {
  const isRelativeJs = specifier.endsWith(".js");
  if (isRelativeJs && context.parentURL) {
    const asWritten = new URL(specifier, context.parentURL);
    if (!existsSync(asWritten)) {
      const asTypeScript = new URL(`${specifier.slice(0, -3)}.ts`, asWritten);
      if (existsSync(asTypeScript)) return nextResolve(asTypeScript.href, context);
    }
  }
  return nextResolve(specifier, context);
}

registerHooks({ resolve: resolveTypeScriptSource });

const tokenMap = await import("../packages/engine/src/token-map.ts");
const tokenClass = await import("../packages/engine/src/token-class.ts");
const sanitize = await import("../packages/engine/src/sanitize.ts");

/** §7.1's twelve classes, in spec order. The mix in the artifact is built from this. */
export const TOKEN_CLASSES = tokenClass.TOKEN_CLASSES;

/** The classification rules' version, stored per snippet so a stored map can be re-derived. */
export const TOKENIZER_VERSION = tokenMap.TOKENIZER_VERSION;

/**
 * Classify `text` as `language`. Returns the engine's own token map, including
 * its `diagnostics` (unterminated string/template/comment, unrecognised
 * character). Diagnostics are the "fails the item if the grammar reports errors"
 * rule from implementation guide §6.3, step 4.
 */
export function tokenize(text, language) {
  return tokenMap.tokenize(text, language);
}

/**
 * The one function `snippet-library.mjs` consumes: tokenize, re-check the tiling
 * invariant, and attach the per-class totals.
 *
 * `tilingIssues` is `validateTokenMap` re-run on the map the engine just built.
 * `tokenize` already asserts tiling internally, so this is normally empty - which
 * is the point. It is recorded per record rather than assumed, because the tiling
 * invariant (D-M5-2) is what every per-class statistic downstream rests on, and
 * an artifact that stores a mix computed from a non-tiling map would be wrong in
 * a way no later consumer could detect.
 */
export function lexSnippet(text, language) {
  const map = tokenMap.tokenize(text, language);
  return {
    text: map.text,
    tokenizerVersion: map.tokenizerVersion,
    language: map.language,
    spans: map.spans,
    diagnostics: map.diagnostics,
    tilingIssues: tokenMap.validateTokenMap(map),
    counts: tokenMap.tokenClassCounts(map),
  };
}

/** Per-class character and token totals, every class present and zero-filled. */
export function tokenClassCounts(map) {
  return tokenMap.tokenClassCounts(map);
}

/** Re-check D-M5-2 tiling (no gaps, no overlaps) on a map that came from anywhere. */
export function validateTokenMap(map) {
  return tokenMap.validateTokenMap(map);
}

/**
 * The engine's display-only escaper (PRG-04). Re-exported so the content gate
 * can assert the render contract holds for every library record — the library
 * stores raw text precisely because rendering goes through this.
 */
export function sanitizeSnippet(text) {
  return sanitize.sanitizeSnippet(text);
}

/**
 * The language profile id a language name resolves to. A snippet declaring an
 * unknown language silently falls back to `generic` inside `tokenize`, which
 * would make the validation weaker than it looks; the gate uses this to reject
 * that instead of accepting it.
 */
export function resolvedLanguage(language) {
  return tokenMap.tokenize("", language).language;
}

/** Absolute path to the engine source this loader reads, for diagnostics only. */
export const ENGINE_SOURCE = fileURLToPath(
  new URL("../packages/engine/src/token-map.ts", import.meta.url),
);
