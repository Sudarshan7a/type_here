/**
 * PRG-04 display-only snippet sanitizer (open-core, MIT).
 *
 * Contract: ALL snippet rendering — present and future — MUST pass through
 * {@link sanitizeSnippet} before the text reaches the DOM. The output is safe
 * only for *text-content* sinks (e.g. `textContent`, or `innerHTML` receiving
 * exclusively this function's return value). It is NOT safe for attribute,
 * URL, CSS, or script sinks: never interpolate it into a template string that
 * forms markup. Snippets are display-only; nothing here ever executes code.
 *
 * Why hand-rolled instead of DOMPurify: DOMPurify needs a DOM (it cannot run
 * in Node, where the engine must stay runnable for server-side recompute) and
 * would add a dependency plus a license review for a ~30-line pure escaper.
 * This module is dependency-free and DOM-free by construction.
 *
 * Pipeline (order matters):
 * 1. Drop C0 controls and DEL, keeping `\n` and `\t` (typing content is
 *    multi-line; `\r` is dropped so `\r\n` normalises to `\n`).
 * 2. Strip event-handler attributes (`on*=`), including quote-breakout and
 *    slash-separated shapes, so no markup can "slip through" even if a future
 *    renderer mishandles the escaped text.
 * 3. Neutralise `javascript:` and `data:` URLs inside URL attributes to `#`.
 *    Bare occurrences elsewhere (prose, code samples mentioning the scheme)
 *    are preserved and rendered as inert text.
 * 4. Escape `& < > " ' \`` with entity-aware `&` handling so already-encoded
 *    entities (`&lt;`, `&amp;`, …) are NOT double-encoded — which is what makes
 *    the function idempotent: `sanitize(sanitize(x)) === sanitize(x)`.
 *
 * Pure function, no DOM, no network, no randomness.
 */

/** C0 controls + DEL, except `\n` (\u000A) and `\t` (\u0009) which content keeps. */
const CONTROL_CHARS_RE = new RegExp(
  "[" + "\u0000-\u0008" + "\u000B\u000C\u000D" + "\u000E-\u001F" + "\u007F" + "]",
  "g",
);

/**
 * Event-handler attribute: `on<name>=<value>` with a double-quoted,
 * single-quoted, or unquoted value. It must be preceded by the start of the
 * string or a separator (`<`, `/`, whitespace, quote, backtick, `;`) so that
 * ordinary property assignments such as `obj.onerror = h` (preceded by `.`)
 * survive while markup attributes and quote-breakouts do not.
 */
const EVENT_HANDLER_RE = /(^|[\s"'`;/<])on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`>]*)/gi;

/** URL-carrying attributes whose value must never be an executable scheme. */
const URL_ATTR_RE =
  /\b(href|src|xlink:href|action|formaction|poster|data)\s*=\s*("[^"]*"|'[^']*'|[^\s"'`>]*)/gi;

/** `&` that does NOT already start an entity reference (`&lt;`, `&#65;`, …). */
const BARE_AMP_RE = /&(?!(?:[a-zA-Z][a-zA-Z0-9]+|#[0-9]+|#[xX][0-9a-fA-F]+);)/g;

/**
 * Replace a `javascript:` or `data:` URL-attribute value with `#`.
 * Whitespace (including tabs/newlines, which browsers strip from schemes) is
 * ignored for the scheme test so `java\tscript:` cannot sneak through.
 */
function neutralizeUrlAttribute(attrName: string, rawValue: string): string {
  let inner = rawValue;
  const first = rawValue.charAt(0);
  const last = rawValue.charAt(rawValue.length - 1);
  if ((first === '"' || first === "'") && last === first && rawValue.length >= 2) {
    inner = rawValue.slice(1, -1);
  }
  const compact = inner
    .replace(new RegExp("[" + "\\s" + "\u0000-\u001F" + "\u007F" + "]+", "g"), "")
    .toLowerCase();
  if (compact.startsWith("javascript:") || compact.startsWith("data:")) {
    return `${attrName}="#"`;
  }
  return `${attrName}=${rawValue}`;
}

/**
 * Sanitize a code snippet for display-only rendering. See the module header
 * for the contract.
 */
export function sanitizeSnippet(input: string): string {
  if (typeof input !== "string") {
    throw new TypeError("sanitizeSnippet expects a string");
  }
  const withoutControls = input.replace(CONTROL_CHARS_RE, "");
  const withoutHandlers = withoutControls.replace(EVENT_HANDLER_RE, "");
  const safeUrls = withoutHandlers.replace(URL_ATTR_RE, (match, attrName, rawValue) =>
    neutralizeUrlAttribute(String(attrName), String(rawValue)),
  );
  return safeUrls
    .replace(BARE_AMP_RE, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/`/g, "&#x60;");
}
