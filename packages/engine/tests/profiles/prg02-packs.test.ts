import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CSS_PACK,
  FALLBACK_PACK,
  GENERIC_PACK,
  HTML_PACK,
  JAVA_PACK,
  JAVASCRIPT_PACK,
  LANGUAGE_PACKS,
  PACK_ALIASES,
  PACK_EXTENSIONS,
  PACK_IDS,
  PYTHON_PACK,
  SQL_PACK,
  describeResolution,
  extensionFor,
  knownPackIds,
  packFingerprint,
  resolveLanguageProfile,
  resolvePack,
  tokenizePacked,
  unconsumedExtensions,
  validatePack,
  type LanguagePack,
  type PackExtensionField,
} from "../../src/profiles";
import { GENERIC_PROFILE, JAVASCRIPT_PROFILE, PYTHON_PROFILE } from "../../src/language-profiles";
import { validateTokenMap } from "../../src/token-map";

/** `text:class` per span — the shape a failing expectation should read like. */
function shape(text: string, id: string): string {
  return tokenizePacked(text, id)
    .spans.map((span) => `${text.slice(span.index, span.index + span.length)}:${span.class}`)
    .join(" ");
}

/**
 * One snippet per pack, each containing that language's own hard case. The
 * "no pack is a silent copy of another" gate below lexes EVERY pack's snippet under
 * EVERY pack and requires the result to differ — so a copy, a near-copy, or a pack
 * whose only real difference is a label cannot pass.
 */
const WITNESS: Readonly<Record<string, string>> = {
  javascript: "const x = `#fff`; // #count\nthis.#count = 1;",
  python: 'p = r"\\d+"\n# comment\nif a<b: pass',
  java: "@Override public char c = ',';\nint m = x >>> 2;",
  sql: "SELECT a - b, 'x' /* c */ FROM t -- d",
  html: '<a href="#top">x</a><!-- c -->',
  css: "a { color: #fff; /* c */ margin-top: 0 !important; }",
};

/** The witness for a pack id, throwing rather than returning `undefined`: the gate
 * below must not be able to pass because a witness is missing. */
function witnessOf(packId: string): string {
  const text = WITNESS[packId];
  if (text === undefined) throw new Error(`no witness for pack ${packId}`);
  return text;
}

describe("PRG-02 language packs — the six ADR-007 settled on", () => {
  it("ships exactly six packs, in D6's priority order", () => {
    expect(PACK_IDS).toEqual(["javascript", "python", "java", "sql", "html", "css"]);
    expect(knownPackIds()).toEqual([...PACK_IDS]);
    expect(LANGUAGE_PACKS.map((pack) => pack.id)).toEqual([...PACK_IDS]);
  });

  it("declares no duplicate id and no duplicate label", () => {
    const ids = LANGUAGE_PACKS.map((pack) => pack.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = LANGUAGE_PACKS.map((pack) => pack.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("exports each pack by name, and each one's id agrees with its own field", () => {
    const byId = new Map<string, LanguagePack>(LANGUAGE_PACKS.map((pack) => [pack.id, pack]));
    for (const pack of [JAVASCRIPT_PACK, PYTHON_PACK, JAVA_PACK, SQL_PACK, HTML_PACK, CSS_PACK]) {
      expect(byId.get(pack.id)).toBe(pack);
      expect(knownPackIds()).toContain(pack.id);
    }
    expect(GENERIC_PACK.id).toBe("generic");
  });

  it("keeps the generic fallback OUT of the catalogue", () => {
    // If `generic` were a catalogue entry, a later contributor could add it as a
    // seventh language and every unknown id would silently become a "known" one.
    expect(knownPackIds()).not.toContain("generic");
    expect(LANGUAGE_PACKS).toHaveLength(6);
  });

  it("gives every pack a structurally valid definition", () => {
    for (const pack of [...LANGUAGE_PACKS, GENERIC_PACK]) {
      expect(validatePack(pack), `pack ${pack.id} must be structurally valid`).toEqual([]);
    }
  });

  it("reuses PRG-01's JavaScript and Python data rather than forking it", () => {
    // The packs are spreads of PRG-01's profiles, so the two cannot drift into
    // disagreeing about the same language. Every classifier field is compared by
    // value; a fork (an edited copy of the keyword set) fails here.
    const shared: readonly (keyof LanguagePack)[] = [
      "lineComments",
      "blockComments",
      "strings",
      "keywords",
      "literals",
      "chords",
      "operators",
      "brackets",
      "regexLiteral",
      "numberPrefixes",
      "digitSeparator",
      "hashMeaning",
      "identifierExtra",
    ] as const;
    for (const [pack, original] of [
      [JAVASCRIPT_PACK, JAVASCRIPT_PROFILE],
      [PYTHON_PACK, PYTHON_PROFILE],
    ] as const) {
      for (const field of shared) {
        const fromPack = pack[field] as unknown;
        const fromOriginal = (original as LanguagePack)[field] as unknown;
        expect(fromPack, `${pack.id}.${field} must match PRG-01's ${original.id}`).toEqual(
          fromOriginal,
        );
      }
    }
  });

  it("falls back to PRG-01's generic profile object, not a look-alike", () => {
    expect(GENERIC_PACK.id).toBe(GENERIC_PROFILE.id);
    expect(FALLBACK_PACK.id).toBe("generic");
    expect(resolvePack("klingon").profile).toBe(GENERIC_PACK);
  });
});

describe("PRG-02 — no pack is a silent copy of another", () => {
  it("gives every pair of packs a different fingerprint", () => {
    const prints = LANGUAGE_PACKS.map((pack) => pack.id + " " + packFingerprint(pack));
    expect(new Set(prints).size).toBe(prints.length);
  });

  it("gives every pack a fingerprint different from the generic fallback", () => {
    const genericPrint = packFingerprint(GENERIC_PACK);
    for (const pack of LANGUAGE_PACKS) {
      expect(packFingerprint(pack), `${pack.id} must not be the generic profile`).not.toBe(
        genericPrint,
      );
    }
  });

  it("classifies every pack's own witness differently under every other pack", () => {
    for (const pack of LANGUAGE_PACKS) {
      const witness = witnessOf(pack.id);
      const mine = shape(witness, pack.id);
      for (const other of LANGUAGE_PACKS) {
        if (other.id === pack.id) continue;
        expect(
          shape(witness, other.id),
          `${pack.id} and ${other.id} classify ${JSON.stringify(witness)} identically`,
        ).not.toBe(mine);
      }
    }
  });

  it("is order-independent, so a copy cannot hide by re-sorting, and covers every field", () => {
    const reordered: LanguagePack = {
      ...JAVASCRIPT_PACK,
      keywords: new Set([...JAVASCRIPT_PACK.keywords].reverse()),
      operators: [...JAVASCRIPT_PACK.operators].reverse(),
    };
    expect(packFingerprint(reordered)).toBe(packFingerprint(JAVASCRIPT_PACK));
    // …and the control that gives the equality above meaning: EVERY field that can
    // change a classification must move the fingerprint. Checking one field is not
    // enough — a fingerprint missing a field would still pass a single-field probe.
    const mutations: readonly [string, LanguagePack][] = [
      ["hashMeaning", { ...JAVASCRIPT_PACK, hashMeaning: "colour" }],
      ["digitSeparator", { ...JAVASCRIPT_PACK, digitSeparator: "" }],
      ["identifierExtra", { ...JAVASCRIPT_PACK, identifierExtra: "" }],
      ["identifierGlue", { ...JAVASCRIPT_PACK, identifierGlue: "-" }],
      ["regexLiteral", { ...JAVASCRIPT_PACK, regexLiteral: false }],
      [
        "markupScan",
        { ...JAVASCRIPT_PACK, markupScan: { tagOpen: "<", tagClose: ">", embedded: {} } },
      ],
      [
        "stringPrefixes",
        { ...JAVASCRIPT_PACK, stringPrefixes: [{ letters: "r", interpolation: false }] },
      ],
      ["lineComments", { ...JAVASCRIPT_PACK, lineComments: ["--"] }],
      ["blockComments", { ...JAVASCRIPT_PACK, blockComments: [] }],
      [
        "strings",
        {
          ...JAVASCRIPT_PACK,
          strings: [
            { open: "'", close: "'", escapes: true, interpolation: false, multiline: false },
          ],
        },
      ],
      ["keywords", { ...JAVASCRIPT_PACK, keywords: new Set(["banana"]) }],
      ["literals", { ...JAVASCRIPT_PACK, literals: new Set(["banana"]) }],
      ["chords", { ...JAVASCRIPT_PACK, chords: ["<=>"] }],
      ["operators", { ...JAVASCRIPT_PACK, operators: ["@"] }],
      ["brackets", { ...JAVASCRIPT_PACK, brackets: ["(", ")"] }],
      ["numberPrefixes", { ...JAVASCRIPT_PACK, numberPrefixes: ["0x"] }],
    ];
    for (const [field, mutated] of mutations) {
      expect(packFingerprint(mutated), `${field} must move the fingerprint`).not.toBe(
        packFingerprint(JAVASCRIPT_PACK),
      );
    }
  });
});

describe("PRG-02 — every declared pack round-trips", () => {
  for (const pack of LANGUAGE_PACKS) {
    it(`${pack.id} tiles its witness exactly, twice, with no diagnostics lost`, () => {
      const text = witnessOf(pack.id);
      const first = tokenizePacked(text, pack.id);
      expect(first.language).toBe(pack.id);
      expect(first.length).toBe(text.length);
      expect(first.spans.map((s) => text.slice(s.index, s.index + s.length)).join("")).toBe(text);
      expect(validateTokenMap(first)).toEqual([]);
      // Determinism: a stored token map must be reproducible byte-for-byte by the
      // server recompute, so two runs have to be identical objects in content.
      expect(tokenizePacked(text, pack.id)).toEqual(first);
    });
  }

  it("uses the same tokenizer version for every pack, so one stamp re-tokenizes all", () => {
    const versions = new Set(
      LANGUAGE_PACKS.map((pack) => tokenizePacked(witnessOf(pack.id), pack.id).tokenizerVersion),
    );
    expect(versions.size).toBe(1);
  });
});

describe("PRG-02 — the profile-resolution rule", () => {
  it("resolves a canonical id as `exact`", () => {
    for (const id of PACK_IDS) {
      const resolution = resolvePack(id);
      expect(resolution.reason).toBe("exact");
      expect(resolution.canonicalId).toBe(id);
      expect(resolution.profile).toBe(resolveLanguageProfile(id));
    }
  });

  it("resolves a declared alias as `alias` and names the pack it landed on", () => {
    expect(resolvePack("jsx")).toMatchObject({ canonicalId: "javascript", reason: "alias" });
    expect(resolvePack("ts")).toMatchObject({ canonicalId: "javascript", reason: "alias" });
    expect(resolvePack("py")).toMatchObject({ canonicalId: "python", reason: "alias" });
    expect(resolvePack("postgresql")).toMatchObject({ canonicalId: "sql", reason: "alias" });
    expect(resolvePack("htm")).toMatchObject({ canonicalId: "html", reason: "alias" });
  });

  it("resolves a mis-cased or padded id as `normalised` rather than failing", () => {
    expect(resolvePack("  JavaScript ")).toMatchObject({
      canonicalId: "javascript",
      reason: "normalised",
    });
    expect(resolvePack("CSS")).toMatchObject({ canonicalId: "css", reason: "normalised" });
  });

  it("gives every alias a real target and lets no alias shadow a canonical id", () => {
    for (const [alias, target] of Object.entries(PACK_ALIASES)) {
      expect(PACK_IDS, `alias ${alias} points at a non-pack`).toContain(target);
      expect(knownPackIds()).not.toContain(alias);
      expect(resolvePack(alias).profile.id).toBe(target);
    }
  });

  it("resolves an unknown id to generic, never to javascript and never by throwing", () => {
    for (const id of ["klingon", "c++", "rust", "", "   ", "javascripts", "ts!", "html5"]) {
      const resolution = resolvePack(id);
      expect(resolution.reason).toBe("unknown");
      expect(resolution.canonicalId).toBeNull();
      expect(resolution.profile).toBe(GENERIC_PACK);
      expect(resolution.profile.id).not.toBe("javascript");
      expect(resolution.aliases).toEqual([]);
    }
  });

  it("resolves a non-string id (hand-edited content JSON) to generic", () => {
    for (const value of [undefined, null, 7, {}, []]) {
      const resolution = resolvePack(value as unknown as string);
      expect(resolution.reason).toBe("unknown");
      expect(resolution.profile).toBe(GENERIC_PACK);
    }
  });

  it("reports every id that shares a pack, so an alias is never a dead entry", () => {
    const js = resolvePack("javascript");
    expect(js.aliases).toContain("javascript");
    expect(js.aliases).toContain("jsx");
    expect(js.aliases).toContain("ts");
    expect(js.aliases).toEqual([...js.aliases].sort());
    for (const alias of js.aliases) expect(resolvePack(alias).profile).toBe(js.profile);
  });

  it("describes a resolution without ever quoting the snippet's text", () => {
    expect(describeResolution(resolvePack("javascript"))).toBe("javascript -> javascript (exact)");
    expect(describeResolution(resolvePack("tsx"))).toBe("tsx -> javascript (alias)");
    expect(describeResolution(resolvePack("klingon"))).toBe(
      'no language pack for "klingon"; using generic',
    );
  });
});

describe("PRG-02 — the model extensions", () => {
  it("declares exactly three extension fields, each with a named lexer requirement", () => {
    expect(PACK_EXTENSIONS.map((ext) => ext.field)).toEqual([
      "stringPrefixes",
      "identifierGlue",
      "markupScan",
    ]);
    for (const ext of PACK_EXTENSIONS) {
      expect(ext.why.length).toBeGreaterThan(20);
      expect(ext.lexerRequirement.length).toBeGreaterThan(20);
      expect(ext.declaredBy.length).toBeGreaterThan(0);
      for (const packId of ext.declaredBy) expect(knownPackIds()).toContain(packId);
      expect(extensionFor(ext.field)).toBe(ext);
    }
  });

  it("rejects an unknown extension name rather than returning undefined", () => {
    expect(() => extensionFor("nope" as PackExtensionField)).toThrow(/unknown pack extension/);
  });

  it("reports a pack's unconsumed extensions, so nothing is silently ignored", () => {
    // This is the assertion that keeps a pack honest: a field the lexer does not read
    // must be DECLARED as unconsumed, in the doc and in the report. Flipping a
    // `honouredByLexer` flag fails here rather than quietly changing nothing.
    expect(unconsumedExtensions(JAVASCRIPT_PACK)).toEqual([]);
    expect(unconsumedExtensions(PYTHON_PACK)).toEqual(["stringPrefixes"]);
    expect(unconsumedExtensions(CSS_PACK)).toEqual(["identifierGlue"]);
    expect(unconsumedExtensions(HTML_PACK)).toEqual(["identifierGlue", "markupScan"]);
    expect(unconsumedExtensions(JAVA_PACK)).toEqual([]);
    expect(unconsumedExtensions(SQL_PACK)).toEqual([]);
  });

  it("agrees with its own extension table about which packs declare what", () => {
    for (const ext of PACK_EXTENSIONS) {
      for (const pack of LANGUAGE_PACKS) {
        const declared = pack[ext.field] !== undefined;
        expect(declared, `${pack.id} vs ${ext.field}`).toBe(ext.declaredBy.includes(pack.id));
      }
    }
  });

  it("declares JavaScript as the control: a complete profile needs no extension", () => {
    const controls = LANGUAGE_PACKS.filter((pack) => unconsumedExtensions(pack).length === 0);
    expect(controls.map((pack) => pack.id)).toEqual(["javascript", "java", "sql"]);
  });

  it("names the embedded language of an HTML element by pack id, so it always resolves", () => {
    const embedded = HTML_PACK.markupScan?.embedded ?? {};
    expect(Object.keys(embedded).sort()).toEqual(["script", "style"]);
    for (const target of Object.values(embedded)) {
      expect(resolvePack(target).reason).not.toBe("unknown");
    }
  });
});

describe("PRG-02 — validatePack catches a broken pack (the control)", () => {
  // A gate that cannot fail is not a gate. Every fault below is a real mistake the
  // six packs could have made, and each is asserted to be REPORTED.
  const faults: readonly {
    readonly what: string;
    readonly pack: LanguagePack;
    readonly expect: RegExp;
  }[] = [
    {
      what: "a single-character chord (matched as an operator instead)",
      pack: { ...SQL_PACK, chords: ["::", ":"] },
      expect: /chord : must be 2\+ characters/,
    },
    {
      what: "a multi-character bracket (never matched — the lexer tests one char)",
      pack: { ...SQL_PACK, brackets: ["(", ")", "<<"] },
      expect: /bracket << must be one character/,
    },
    {
      what: "a single-character line comment opener (it would swallow the file)",
      pack: { ...SQL_PACK, lineComments: ["-"] },
      expect: /line comment - must be 2\+ chars/,
    },
    {
      what: "a language with no comment form anywhere",
      pack: { ...CSS_PACK, lineComments: [], blockComments: [], hashMeaning: "private-field" },
      expect: /no comment form at all/,
    },
    {
      what: "a pack with no human label (the language picker has nothing to show)",
      pack: { ...SQL_PACK, label: "   " },
      expect: /label must not be empty/,
    },
    {
      what: "a keyword the profile's own identifier rules cannot spell",
      pack: { ...SQL_PACK, keywords: new Set(["+select"]) },
      expect: /\+select cannot be lexed as an identifier/,
    },
    {
      what: "a keyword that only `identifierGlue` could start",
      pack: { ...SQL_PACK, keywords: new Set(["-select"]) },
      expect: /-select cannot be lexed as an identifier/,
    },
    {
      what: "an upper-case radix prefix (the lexer lower-cases the source before matching)",
      pack: { ...SQL_PACK, numberPrefixes: ["0X", "0b"] },
      expect: /radix prefix 0X/,
    },
    {
      what: "a multi-character digit separator (the field is one character)",
      pack: { ...SQL_PACK, digitSeparator: "__" },
      expect: /digitSeparator must be empty or one character/,
    },
    {
      what: "a pack with no string descriptor at all",
      pack: { ...SQL_PACK, strings: [] },
      expect: /no string descriptor/,
    },
    {
      what: "a string descriptor with an empty delimiter",
      pack: {
        ...SQL_PACK,
        strings: [{ open: "", close: "'", escapes: true, interpolation: false, multiline: true }],
      },
      expect: /a string delimiter must be non-empty/,
    },
    {
      what: "a block comment with no close delimiter",
      pack: { ...SQL_PACK, blockComments: [{ open: "/*", close: "" }] },
      expect: /has no close/,
    },
    {
      what: "a block comment whose opener is one character (it would open everywhere)",
      pack: { ...SQL_PACK, blockComments: [{ open: "*", close: "*/" }] },
      expect: /block comment open \* must be 2\+ chars/,
    },
    {
      what: "identifier glue longer than the two characters it could ever need",
      pack: { ...CSS_PACK, identifierGlue: "::-" },
      expect: /identifierGlue must be at most two characters/,
    },
    {
      what: "a string prefix that is also a comment opener (unreachable)",
      pack: { ...PYTHON_PACK, lineComments: ["r"] },
      expect: /prefix r is also a line comment opener/,
    },
    {
      what: "a non-letter string prefix (it would collide with a delimiter)",
      pack: { ...PYTHON_PACK, stringPrefixes: [{ letters: 'r"', interpolation: false }] },
      expect: /string prefix r" must be lower-case a-z only/,
    },
    {
      what: "the same string prefix declared twice",
      pack: {
        ...PYTHON_PACK,
        stringPrefixes: [
          { letters: "r", interpolation: false },
          { letters: "r", interpolation: false },
        ],
      },
      expect: /prefix r declared twice/,
    },
    {
      what: "an interpolating single-line delimiter",
      pack: {
        ...SQL_PACK,
        strings: [{ open: '"', close: '"', escapes: true, interpolation: true, multiline: false }],
      },
      expect: /claims interpolation without multiline/,
    },
    {
      what: "a markup region with no tag close delimiter",
      pack: { ...HTML_PACK, markupScan: { tagOpen: "<", tagClose: "", embedded: {} } },
      expect: /markupScan needs both a tagOpen and a tagClose/,
    },
  ];

  for (const fault of faults) {
    it(`reports ${fault.what}`, () => {
      const issues = validatePack({ ...fault.pack, id: "broken" });
      expect(issues.join("\n")).toMatch(fault.expect);
    });
  }

  it("accepts every shipped pack, which is what makes the faults above meaningful", () => {
    expect(validatePack(SQL_PACK)).toEqual([]);
    expect(validatePack(PYTHON_PACK)).toEqual([]);
    // PRG-01's own profiles, which this layer must not find fault with.
    expect(validatePack({ ...JAVASCRIPT_PROFILE })).toEqual([]);
    expect(validatePack({ ...PYTHON_PROFILE })).toEqual([]);
    expect(validatePack({ ...GENERIC_PROFILE })).toEqual([]);
  });
});

describe("PRG-02 — the pack layer is pure (no clock, no randomness, no I/O)", () => {
  const sourceDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "profiles");

  it("contains no non-determinism or I/O in any pack module", () => {
    const files = readdirSync(sourceDir).filter((name) => name.endsWith(".ts"));
    expect(files.sort()).toEqual(["catalog.ts", "index.ts", "model.ts", "resolve.ts"]);
    // AGENTS.md rule 1 and D-M5-2's reproducibility: a stored token map must be
    // re-derivable years later, so nothing here may read a clock or a random source.
    const forbidden = [
      /\bDate\.now\b/u,
      /\bnew Date\b/u,
      /\bperformance\.now\b/u,
      /\bMath\.random\b/u,
      /\bcrypto\b/u,
      /\bprocess\b/u,
      /\bBuffer\b/u,
      /\bIntl\b/u,
      // A `node:` module specifier, not the word: the alias table legitimately has
      // a `"node"` entry for JavaScript.
      /["']node:[a-z_]/u,
      /\bfetch\b/u,
    ];
    for (const name of files) {
      const source = readFileSync(join(sourceDir, name), "utf8");
      for (const pattern of forbidden) {
        expect(pattern.test(source), `${name} must not use ${String(pattern)}`).toBe(false);
      }
    }
  });

  it("resolves and tokenizes identically twice in a row, for every id in the table", () => {
    const ids = [...PACK_IDS, ...Object.keys(PACK_ALIASES), "klingon", "", "GENERIC"];
    const once = ids.map((id) => `${id}=${shape("x = 1;", id)}`);
    const twice = ids.map((id) => `${id}=${shape("x = 1;", id)}`);
    expect(twice).toEqual(once);
  });
});
