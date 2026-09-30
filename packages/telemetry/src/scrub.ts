/**
 * Error scrubber (M0-07) — allowlist-based, per keystroke-privacy skill.
 *
 * The keep-list is EXACTLY: error name, sanitized stack (absolute filesystem
 * paths and query strings stripped), release, environment, route, HTTP
 * status, request id. Everything else — messages, headers, request bodies,
 * breadcrumbs, causes, any field matching BLOCKED_FIELD_RE — is dropped,
 * at any nesting depth. When unsure, drop the field.
 */

/**
 * Field names that must never survive scrubbing, at any depth
 * (case-insensitive). Deliberately over-broad: "userInput", "requestBody",
 * "eventLog", "keystrokeTimings", "textContent", … all match.
 */
export const BLOCKED_FIELD_RE = /text|typed|log|events|keystrokes|content|body|input/i;

const ALLOWED_KEYS = [
  "name",
  "stack",
  "release",
  "environment",
  "route",
  "status",
  "request_id",
] as const;

export const ENVIRONMENTS = ["dev", "staging", "prod", "test"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

const NAME_RE = /^[A-Za-z][A-Za-z0-9_$]{0,127}$/;
const RELEASE_RE = /^\d+\.\d+\.\d+$/;
/**
 * Routes must be lowercase path segments (kebab-case, digits, slashes, plus a
 * leading slash) — the shapes this app's own router generates. Anything else
 * (query strings, uppercase, underscores, absolute URLs) is dropped, which
 * also blocks arbitrary alphanumeric content posing as a route.
 */
const ROUTE_RE = /^\/[a-z0-9/-]{0,127}$/;
/**
 * Request ids must look machine-generated: lowercase alnum + hyphens, 4-64
 * chars, starting alnum (uuids, ulids-lowercased, counter ids all fit).
 */
const REQUEST_ID_RE = /^[0-9a-z][0-9a-z-]{3,63}$/;
const FRAME_RE = /^\s*at\s/;
const QUERY_RE = /\?[^\s()[\]]*/g;
const WIN_PATH_RE = /(?:file:\/\/)?[A-Za-z]:[\\/][^\s()[\]]*/g;
const POSIX_PATH_RE = /([\s([])\/(?:home|Users|root|var|tmp|opt|srv|app|mnt)\/[^\s()[\]]*/g;
const MAX_FRAMES = 50;
const MAX_DEPTH = 4;
const MAX_KEYS_PER_OBJECT = 100;

/**
 * Brand proving an error object came out of scrubError — nothing else may
 * be handed to a sink's captureError (compile-time guarantee; the runtime
 * object is exactly what scrubError returned).
 */
declare const scrubbedBrand: unique symbol;

export type ScrubbedError = {
  readonly [scrubbedBrand]: true;
  readonly name?: string;
  readonly stack?: string;
  readonly release?: string;
  readonly environment?: Environment;
  readonly route?: string;
  readonly status?: number;
  readonly request_id?: string;
};

/** Explicit context a caller (e.g. an HTTP error handler) may attach. */
export type ScrubContext = {
  release?: string;
  environment?: Environment;
  route?: string;
  status?: number;
  request_id?: string;
};

type FieldBag = {
  name?: string;
  stack?: string;
  release?: string;
  environment?: Environment;
  route?: string;
  status?: number;
  request_id?: string;
};

export function isValidName(value: unknown): string | undefined {
  return typeof value === "string" && NAME_RE.test(value) ? value : undefined;
}

export function isValidRelease(value: unknown): string | undefined {
  return typeof value === "string" && RELEASE_RE.test(value) ? value : undefined;
}

export function isValidEnvironment(value: unknown): Environment | undefined {
  return typeof value === "string" && (ENVIRONMENTS as readonly string[]).includes(value)
    ? (value as Environment)
    : undefined;
}

export function isValidRoute(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const withoutQuery = value.includes("?") ? value.slice(0, value.indexOf("?")) : value;
  return ROUTE_RE.test(withoutQuery) ? withoutQuery : undefined;
}

export function isValidStatus(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
}

export function isValidRequestId(value: unknown): string | undefined {
  return typeof value === "string" && REQUEST_ID_RE.test(value) ? value : undefined;
}

/**
 * Sanitized-stack rule: keep only lines that look like stack frames
 * (`    at ...`), which drops the leading `Error: <message>` line; within
 * kept frames replace absolute filesystem paths (Windows, file:// and POSIX
 * home-rooted) with "<path>" and strip query strings. Cap at MAX_FRAMES.
 */
export function sanitizeStack(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const frames = raw
    .split(/\r?\n/)
    .filter((line) => FRAME_RE.test(line))
    .slice(0, MAX_FRAMES)
    .map((line) =>
      line.replace(QUERY_RE, "").replace(WIN_PATH_RE, "<path>").replace(POSIX_PATH_RE, "$1<path>"),
    );
  return frames.length === 0 ? undefined : frames.join("\n");
}

/**
 * Recursively collect allowlisted fields from an arbitrary value. Blocked
 * field names are never entered; non-allowlisted objects/arrays are walked
 * (depth- and breadth-capped, cycle-safe) so allowlisted data hidden in
 * nested context still survives while everything else does not.
 */
function collect(value: unknown, found: FieldBag, seen: WeakSet<object>, depth: number): void {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) return;
  seen.add(obj);

  if (value instanceof Error) {
    if (found.name === undefined) found.name = isValidName((value as Error).name);
    if (found.stack === undefined) found.stack = sanitizeStack((value as Error).stack);
  }

  let keys: string[];
  try {
    keys = Object.keys(obj);
  } catch {
    return;
  }
  for (const key of keys.slice(0, MAX_KEYS_PER_OBJECT)) {
    if (BLOCKED_FIELD_RE.test(key)) continue;
    const v = obj[key];
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      collect(v, found, seen, depth + 1);
      continue;
    }
    switch (key) {
      case "name":
        if (found.name === undefined) found.name = isValidName(v);
        break;
      case "stack":
        if (found.stack === undefined) found.stack = sanitizeStack(v);
        break;
      case "release":
        if (found.release === undefined) found.release = isValidRelease(v);
        break;
      case "environment":
        if (found.environment === undefined) found.environment = isValidEnvironment(v);
        break;
      case "route":
        if (found.route === undefined) found.route = isValidRoute(v);
        break;
      case "status":
        if (found.status === undefined) found.status = isValidStatus(v);
        break;
      case "request_id":
        if (found.request_id === undefined) found.request_id = isValidRequestId(v);
        break;
    }
  }
}

function applyContext(found: FieldBag, context: ScrubContext): void {
  const release = isValidRelease(context.release);
  if (release !== undefined) found.release = release;
  const environment = isValidEnvironment(context.environment);
  if (environment !== undefined) found.environment = environment;
  const route = isValidRoute(context.route);
  if (route !== undefined) found.route = route;
  const status = isValidStatus(context.status);
  if (status !== undefined) found.status = status;
  const requestId = isValidRequestId(context.request_id);
  if (requestId !== undefined) found.request_id = requestId;
}

/**
 * Scrub an error (or arbitrary value) down to the allowlist. Never throws on
 * dirty input; returns null when nothing keepable remains.
 */
export function scrubError(err: unknown, context?: ScrubContext): ScrubbedError | null {
  const found: FieldBag = {};
  collect(err, found, new WeakSet(), 0);
  if (context !== undefined) applyContext(found, context);
  const hasAny = ALLOWED_KEYS.some((key) => found[key] !== undefined);
  if (!hasAny) return null;
  return found as ScrubbedError;
}
