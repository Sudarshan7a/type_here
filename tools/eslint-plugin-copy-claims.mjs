/**
 * PRG-05 copy-claims enforcement: no outcome promises in user-facing copy.
 *
 * Absolute prohibition (docs/FEATURE-LEDGER.md PRG-05, AGENTS.md rule 9):
 * UI/marketing copy never promises speed gains, improved programming ability,
 * or hiring outcomes. The honest promise is only "input fluency and less
 * friction" (docs/spec/master-spec-v1.md PRG-05).
 *
 * This ONE module is the single source of truth for two enforcement layers,
 * so they cannot drift apart:
 *
 * 1. The ESLint rule `copy-claims/no-outcome-promises` below (wired into
 *    `pnpm lint` via eslint.config.mjs). It sees user-facing string literals,
 *    template quasis and JSX text/attributes in linted JS/TS. It cannot see
 *    Markdown (no processor installed, and no new dependencies allowed).
 * 2. apps/web/tests/copy-claims-corpus.test.ts, which scans
 *    docs/content-ui-copy-string-tables.md and the COPY values with the same
 *    `claimViolations` helper.
 *
 * Phrase-level, not word-level (the check-policies BIZ-06 precedent: a word
 * ban would cry wolf on legitimate product vocabulary and get switched off).
 * Bare "better" stays legal ("better company" in a passage); "better
 * programmer" does not. Bare "speed" stays legal ("Replay speed",
 * "Net WPM"); "speed gains" does not.
 */

/**
 * @typedef {"speed" | "ability" | "hireability"} ClaimCategory
 * @typedef {{ id: string, category: ClaimCategory, pattern: RegExp, description: string }} BannedPattern
 * @typedef {{ id: string, exempts: "*" | string[], pattern?: RegExp, keyPattern?: RegExp, reason: string }} AllowlistEntry
 * @typedef {{ patternId: string, category: ClaimCategory, match: string, allowlistedBy: string[] }} CopyFinding
 */

/**
 * Outcome-promising language. Every entry needs at least one offending
 * fixture in apps/web/tests/copy-claims-rule.test.ts (pinned by test), so a
 * pattern removed here fails there — the non-vacuity direction is structural.
 *
 * All patterns are non-global on purpose: global regexes carry lastIndex
 * state between .exec calls and would make the scan order-dependent.
 */
export const BANNED_PATTERNS = [
  // — Speed-gain promises —
  {
    id: "speed-faster",
    category: "speed",
    pattern: /\bfaster\b/i,
    description: "Comparative speed promises (type faster, get faster).",
  },
  {
    id: "speed-fastest",
    category: "speed",
    pattern: /\bfastest\b/i,
    description: "Superlative speed promises.",
  },
  {
    id: "speed-boost",
    category: "speed",
    pattern: /\bboost\b/i,
    description: "Boost promises (boost your WPM). No legitimate use in repo.",
  },
  {
    id: "speed-gains",
    category: "speed",
    pattern: /\bspeed\s+gains?\b/i,
    description: "Explicit speed-gain promises.",
  },
  {
    id: "speed-multiplier",
    category: "speed",
    pattern: /\b\d+\s*x\s*(?:faster|typing|wpm)\b|doubl(?:e|ing)\s+your\s+(?:speed|wpm)\b/i,
    description: "Multiplier hype (10x faster, double your speed).",
  },
  // — Ability-gain promises ("better programmer", "improve your coding") —
  {
    id: "ability-better-programmer",
    category: "ability",
    pattern: /\bbetter\s+programmers?\b/i,
    description: "Direct ability claim. Bare 'better' (better company) is fine.",
  },
  {
    id: "ability-become-better",
    category: "ability",
    pattern: /\bbecome\b.{0,32}\bbetter\s+(?:programmer|developer|coder|engineer)s?\b/i,
    description: "Transformation into a better programmer/developer.",
  },
  {
    id: "ability-improve-coding",
    category: "ability",
    pattern: /\bimprov(?:e|es|ing)\s+your\s+(?:code|coding|programming|software)\b/i,
    description: "Improve-your-coding promises.",
  },
  {
    id: "ability-10x-dev",
    category: "ability",
    pattern: /\b10x\s+(?:developer|programmer|coder|engineer)s?\b/i,
    description: "10x-developer mythology.",
  },
  // — Hireability promises ("hireable", "job-ready", "get hired", "interview-ready") —
  {
    id: "hire-hireable",
    category: "hireability",
    pattern: /\bhireab(?:le|ility)\b/i,
    description: "Hireability claims.",
  },
  {
    id: "hire-job-ready",
    category: "hireability",
    pattern: /\bjob[\s-]?ready\b/i,
    description: "Job-ready claims.",
  },
  {
    id: "hire-get-hired",
    category: "hireability",
    pattern: /\bgets?\s+hired\b|\bgot\s+hired\b/i,
    description: "Get-hired outcome promises.",
  },
  {
    id: "hire-land-job",
    category: "hireability",
    pattern: /\bland\s+(?:a|your|that|the|their)\s+(?:job|offer|dream\s+job)\b/i,
    description: "Land-a-job outcome promises.",
  },
  {
    id: "hire-interview-ready",
    category: "hireability",
    pattern: /\binterview[\s-]?ready\b|\bace\s+(?:your|the|that|their)\s+interviews?\b/i,
    description: "Interview-ready / ace-your-interview promises.",
  },
  {
    id: "hire-hiring",
    category: "hireability",
    pattern: /\bhiring\b/i,
    description: "Hiring-outcome language (repo-precedent word list).",
  },
  {
    id: "hire-career-ready",
    category: "hireability",
    pattern: /\bcareer[\s-]?ready\b|\bemployab(?:le|ility)\b/i,
    description: "Career-ready / employability claims.",
  },
];

/**
 * Narrow, documented exemptions. An entry applies to a finding only when its
 * optional `pattern` matches the SAME string (or its `keyPattern` matches the
 * table key) AND the finding's pattern id is in `exempts` ("*" = every
 * pattern). Anything else still fails. This is the opposite of a blanket
 * disable: each exemption names what it covers, what it does not, and why.
 */
export const ALLOWLIST = [
  {
    id: "past-measurement",
    exempts: ["speed-faster", "speed-fastest"],
    pattern: /(?:\d+%\s+)?faster\s+than\s+it\s+was\b|\bfaster\s+than\s+your\s+\S+\s+average\b/i,
    reason:
      "Factual report of a measured past delta (results/post-drill copy must be " +
      "able to state deltas: '18% faster than it was a minute ago'). The ban is on " +
      "future promises, not on reporting what the engine measured. Speed patterns only.",
  },
  {
    id: "ban-discourse",
    exempts: "*",
    pattern:
      /promises?\s+no\s+outcome|no\s+outcome\s+(?:is\s+)?promised|claims?\s+ban|positioning\s+guardrail|deliberately\s+does\s+not|does\s+not\s+say|explicitly\s+banned|negative\s+example|never\s+(?:claim|promise)|not\s+a\s+(?:promise|claim)|doNotUse/i,
    reason:
      "The string discusses or forbids the claim instead of making it (spec language, " +
      "table notes, test titles). Quoting the ban to forbid it is the documented allowlist.",
  },
  {
    id: "user-goal-preset",
    exempts: ["speed-faster", "speed-fastest", "speed-boost", "speed-gains", "speed-multiplier"],
    keyPattern: /onboarding\.goal\.preset/i,
    reason:
      "Goal presets answer 'what would you like to work toward?' — they elicit the " +
      "user's own aspiration with no timeline, magnitude or delivery verb, so they " +
      "state intent rather than promise a product outcome. Key-scoped to " +
      "onboarding.goal.preset rows; the same wording in shipped source (no key) " +
      "still fails the lint rule. Speed patterns only: ability/hireability " +
      "promises in a preset would still fail.",
  },
];

/**
 * Scan one string for banned patterns.
 *
 * @param {string} text the user-facing string to check
 * @param {{ key?: string }} [opts] optional string-table key (enables key-scoped exemptions)
 * @returns {CopyFinding[]} one finding per matched pattern, each annotated with
 * the allowlist entries (if any) that excuse it
 */
export function scanCopyText(text, opts = {}) {
  const key = opts.key ?? "";
  const findings = [];
  for (const banned of BANNED_PATTERNS) {
    const m = banned.pattern.exec(text);
    if (m === null) continue;
    const allowlistedBy = ALLOWLIST.filter(
      (entry) =>
        (entry.exempts === "*" || entry.exempts.includes(banned.id)) &&
        (entry.keyPattern === undefined || entry.keyPattern.test(key)) &&
        (entry.pattern === undefined || entry.pattern.test(text)),
    ).map((entry) => entry.id);
    findings.push({
      patternId: banned.id,
      category: banned.category,
      match: m[0],
      allowlistedBy,
    });
  }
  return findings;
}

/**
 * The enforcement view: findings with no applicable allowlist entry.
 *
 * @param {string} text the user-facing string to check
 * @param {{ key?: string }} [opts] optional string-table key
 * @returns {CopyFinding[]} violations; empty means the string is clean
 */
export function claimViolations(text, opts = {}) {
  return scanCopyText(text, opts).filter((finding) => finding.allowlistedBy.length === 0);
}

const EXEMPT_FILE_PATTERNS = [/\.test\.[cm]?[jt]sx?$/, /\.spec\.[cm]?[jt]sx?$/];
const EXEMPT_FILE_SUBSTRING = "tools/eslint-plugin-copy-claims.mjs";

/**
 * Files the rule never checks, by role rather than by content:
 * - *.test.* / *.spec.* must name the ban to assert it (the claims-ban tests
 *   embed banned words in regexes and titles);
 * - this registry file itself must name the ban to forbid it.
 * Enforcement on tests comes from the rule/corpus tests, not from the rule.
 *
 * @param {string} filename slash-normalised file path
 * @returns {boolean} true when the rule must stay silent for the whole file
 */
export function isExemptFile(filename) {
  if (filename.includes(EXEMPT_FILE_SUBSTRING)) return true;
  return EXEMPT_FILE_PATTERNS.some((re) => re.test(filename));
}

/** The ESLint rule: user-facing string content must not promise outcomes. */
export const copyClaimsRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "PRG-05: user-facing copy must never promise speed gains, improved programming ability, or hiring outcomes.",
    },
    schema: [],
  },
  create(context) {
    const raw = context.filename ?? context.getFilename?.() ?? "";
    const filename = String(raw).replaceAll("\\", "/");
    if (isExemptFile(filename)) return {};

    /**
     * @param {import("eslint").Rule.Node} node the node to report on
     * @param {string} text the user-facing string content
     */
    function check(node, text) {
      if (typeof text !== "string" || text.length === 0) return;
      for (const violation of claimViolations(text)) {
        context.report({
          node,
          message:
            `PRG-05 copy-claims ban ({{patternId}}, {{category}}): user-facing copy must not ` +
            `promise outcomes \u2014 matched "{{match}}". See master-spec PRG-05; claims are ` +
            `limited to input fluency and less friction.`,
          data: {
            patternId: violation.patternId,
            category: violation.category,
            match: violation.match,
          },
        });
      }
    }

    return {
      /** String literals: values only — never import sources, keys, or names. */
      Literal(node) {
        if (typeof node.value !== "string") return; //regex literals hold a RegExp, not a string
        const parent = node.parent;
        if (parent === undefined || parent === null) return;
        if (parent.type === "ImportDeclaration" && parent.source === node) return;
        if (
          (parent.type === "ExportNamedDeclaration" || parent.type === "ExportAllDeclaration") &&
          parent.source === node
        )
          return;
        if (parent.type === "ImportExpression" && parent.source === node) return;
        if (
          parent.type === "CallExpression" &&
          parent.callee.type === "Identifier" &&
          parent.callee.name === "require" &&
          parent.arguments[0] === node
        )
          return;
        if (parent.type === "Property" && parent.key === node && parent.computed === false) return;
        if (
          parent.type === "MemberExpression" &&
          parent.property === node &&
          parent.computed === false
        )
          return;
        // JSX attributes are handled by the JSXAttribute visitor below: its value
        // is a Literal, so checking here too would report every attribute twice.
        if (parent.type === "JSXAttribute") return;
        check(node, node.value);
      },
      /** JSX attribute values: user-facing copy (accessible names, titles, labels). */
      JSXAttribute(node) {
        if (node.value && typeof node.value.value === "string") {
          check(node, node.value.value);
        }
      },
      /** Template literals: each cooked quasi (interpolations are code, not copy). */
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          const cooked = quasi.value.cooked;
          if (typeof cooked === "string" && cooked.length > 0) check(node, cooked);
        }
      },
      /** JSX text: component literals are user-facing copy. */
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};

/** Local plugin object, registered in eslint.config.mjs. */
export const copyClaimsPlugin = {
  rules: {
    "no-outcome-promises": copyClaimsRule,
  },
};
