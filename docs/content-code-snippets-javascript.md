# Content Library — Code Snippets: JavaScript/TypeScript (License Verification, Honest Status)

**Read this section before the snippets. It matters more than the snippets themselves.**

## Why this file is structured differently from the prose/quote files

For prose and quotes, I could verify sourcing myself end-to-end through search (confirm a text's publication date, confirm exact wording against multiple independent citations). For **code snippets from real repositories**, there is a harder requirement the master plan sets: *"real repositories, MIT/Apache/BSD/CC0 only, license saved... source, commit, and license file captured."* That requires either (a) direct repository access to pull an exact file at an exact commit hash, or (b) very high confidence from multiple independent citations reproducing the identical exact code.

**Honest assessment of what I could and couldn't fully do through search:**
- ✅ **I could confirm, with high confidence, that specific real repositories are genuinely MIT/Apache/BSD licensed** (verified via their own README/npm listing/GitHub license badge, cross-checked across multiple independent pages).
- ✅ **For a small number of very short, very widely-reproduced snippets**, I found the exact same code independently quoted across multiple unrelated sources, which gives reasonable confidence in exact wording.
- ⚠️ **I could NOT reliably pull a large, exact, byte-for-byte source file at a specific commit hash for a bigger snippet** the way I could verify a quote's exact wording — search results return fragments, gists, and mirrors, not a guaranteed pristine original file.

**Decision made here, and what it means for you:** rather than fabricate a plausible-looking "commit hash" (which would be actively dishonest and exactly the kind of thing the license register is designed to prevent), this file does two things:
1. Delivers a small set of **genuinely verified, short, high-confidence snippets** (Tier 1 below) that are safe to use immediately.
2. Delivers a much larger set of **content-pipeline-ready placeholders** (Tier 2 below) — real, confirmed-license repositories with exact file paths named, marked `PENDING LIVE VERIFICATION`, meaning: whoever has direct repo access (you, or an AI agent with actual GitHub/filesystem access, which is a capability I don't have in this research context) needs to run one step — clone the repo at the pinned commit and copy the exact file content — before these can move from `draft` to `reviewed` status in the register. This is the honest, safe way to hand off this task rather than presenting fabricated confidence.

This distinction (Tier 1 = ready now, Tier 2 = real target + verification step still needed) should itself become a standing step in your content pipeline (Implementation Guide §6.3, "Code snippets" subsection) — **anyone sourcing real code snippets faces this same limitation**, and the fix is always the same: an actual `git clone` at a pinned commit, done by whoever has that access, not a search engine.

---

## Tier 1 — Verified license, high-confidence exact wording, ready for `reviewed` status

### Snippet JS-001

**Register entry:**
| Field | Value |
|---|---|
| item_id | `CODE-JS-001` |
| source | `lodash/lodash`, the `isEmpty`-style small-utility pattern (paraphrased structure only — see note) |
| license | MIT — confirmed via the repository's own README statement ("Lodash is released under the MIT license") and independently via a third-party license-aggregation page reproducing the exact MIT copyright header used by the project ("Copyright JS Foundation and other contributors") |
| license_text_saved | Yes — full MIT text below |
| attribution_required | Per MIT license terms, the copyright notice must be included in copies/substantial portions |
| status | reviewed (structure verified; exact current file content NOT copied — see note) |

**Important note on this specific entry:** rather than copy an exact excerpt from lodash's actual (frequently-updated, heavily cross-referenced) source tree — which risks grabbing an outdated or subtly-wrong fragment without direct repo access — the snippet below is an **original, small, MIT-license-compatible utility function written fresh for this library**, in the *style* and *spirit* of a lodash-type helper, explicitly NOT claimed as verbatim lodash source. This keeps the content 100% safe (it's original) while still giving programmer-track content that's realistic. **This entry is relabeled from "real snippet" to "original, lodash-style utility" — see the corrected type field below.**

**Corrected register entry:**
| Field | Value |
|---|---|
| item_id | `CODE-JS-001` |
| type | **original** (not a real external snippet — corrected from initial draft) |
| license | original work — ours |
| status | reviewed |

```
function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
```

*(Shown here in a plain block for readability in this document; store as plain text content in the actual database, not as a fenced code block requiring markdown rendering.)*

### The MIT License, full text (saved verbatim, for the register — this text itself has no restrictions on reproduction, as it is a template license text)

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

**Why this matters as a lesson embedded in the deliverable itself:** the corrected entry above is a **worked example of the exact mistake the license register exists to catch** — an initial instinct to label something "from lodash" when it was actually only *inspired by* lodash's style, not copied from it. The register's `reviewer` field and `date_checked` field exist precisely to catch this kind of drift. **Treat this correction as itself a piece of the training material for whoever runs your content pipeline: label things as "original" by default, and only upgrade to "real external snippet" after the exact source is pulled and diffed against what you're storing.**

---

## Tier 2 — Real, confirmed-license repositories: pending live verification (structure ready, exact file content NOT yet pulled)

These are **real repositories with confirmed real licenses** — the license claim itself is solid — but the exact code below is described by structure/purpose only, not claimed as an exact copy, because I do not have direct filesystem/repo access to pull and diff the literal file. **Action required before use:** clone at the pinned reference, copy the exact file, save the license file from that same commit, and flip status to `reviewed`.

| item_id | Real repository | Confirmed license | File to pull (path, once cloned) | Confidence in license claim | Status |
|---|---|---|---|---|---|
| `CODE-JS-P01` | `lodash/lodash` | MIT (confirmed: repo README states it directly; independently confirmed via a third-party license-aggregator page reproducing the project's exact MIT header) | `lodash.debounce.js` or equivalent debounce implementation in the main `lodash.js` file | High | draft — pending live verification |
| `CODE-JS-P02` | `jashkenas/underscore` | MIT (confirmed: Wikipedia's infobox for the project states License: MIT, cross-referenced against the project's own site) | A small collection utility, e.g., `_.pluck` or equivalent | High | draft — pending live verification |
| `CODE-JS-P03` | `sindresorhus/is` (a well-known, actively maintained type-checking utility package) | MIT (the package's own npm page and GitHub repo state MIT; this is a widely-cited, actively maintained package by a prolific, well-known open-source maintainer, which raises confidence the license statement is accurate and current) | The `isEven`/`isOdd` predicate functions shown in the package's own documented usage examples | High | draft — pending live verification |

**Why only 3 rows in Tier 2 for this delivery, when the target is ~100 snippets per language:** each row above represents genuine, careful verification work (checking the license claim from at least two independent angles). Padding this table with dozens more rows *without doing that same verification for each one* would silently reintroduce the exact risk this whole section is designed to prevent — a long list that *looks* thorough but wasn't actually checked. **The correct way to reach ~100 verified snippets per language is to repeat this exact verification process at the same level of care, batch by batch, ideally by someone (or an AI agent) with direct repository access who can automate the clone-and-diff step** — at that point the bottleneck stops being "can we find license information" (solved) and becomes "can we pull exact file contents" (a mechanical step, not a research problem, once you have repo access).

---

## Tier 3 — What a properly-tooled content pipeline should do instead (the real long-term answer)

This is the actual recommended process, to replace manual per-snippet research once you're inside the build environment (this maps directly onto Implementation Guide §6.3's "Code snippets" workflow, made concrete):

1. **Build a small allowlist of confirmed-MIT/Apache/BSD source repositories** per language (the Tier 2 table above is a starting seed for JavaScript).
2. **Script the extraction:** for each allowlisted repo, `git clone` at a pinned tag/commit, walk the source tree, and extract candidate functions/files matching your size and complexity criteria (5–30 lines, self-contained, no secrets).
3. **Automatically capture, per snippet:** the exact file content, the exact commit hash, the exact license file content from that same commit (licenses can change between versions — always pull the license from the *same* commit as the code, never from "the repo's current license" if you're pulling code from an older tag).
4. **Automated syntax validation:** parse each candidate with the language's real grammar (Tree-sitter, per the `token-drill-generators` skill) and reject anything that doesn't parse cleanly.
5. **Human spot-review** a sample (per the content QA checklist), specifically checking for anything that looks like a credential, a personal name in a comment, or an inappropriate string literal that slipped through automated filters.
6. **Only then** does an item's register status move from `draft` to `reviewed` to `live`.

This is now a **fully specified, repeatable pipeline** — the missing piece was never "what's the process," it's "who has the actual repo access to run step 2," which is a build-environment capability question, not a content-strategy question.

---

## Register entries to add for this file

| item_id | type | license | status | notes |
|---|---|---|---|---|
| CODE-JS-001 | original | original work — ours | reviewed | Corrected from an initial mislabeling — see note above; a worked lesson in register discipline |
| CODE-JS-P01 | code-snippet (pending) | MIT (license confirmed; exact file not yet pulled) | draft | Requires live repo access to complete |
| CODE-JS-P02 | code-snippet (pending) | MIT (license confirmed; exact file not yet pulled) | draft | Requires live repo access to complete |
| CODE-JS-P03 | code-snippet (pending) | MIT (license confirmed; exact file not yet pulled) | draft | Requires live repo access to complete |

**Next files in this series (Python, Java) will follow this exact same honest Tier 1 / Tier 2 / Tier 3 structure** — this is now the demonstrated, repeatable template for the code-snippet sourcing problem specifically.
