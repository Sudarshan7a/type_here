# Content Library — Master Plan and License Register

**Purpose:** the authoritative index for every content file in the library, plus the license register every single item must appear in before it can ship. This file is the source of truth for "is this item allowed to exist in our product."

**Hard rule (from the master spec and implementation guide, restated here because it's the single most important content rule):** never copy word lists, quotes, or code from GPL/AGPL sources (Monkeytype, Keybr, and similar). Never scrape "quote collection" websites — their curation and exact wording are frequently their own copyrighted compilation even when the underlying centuries-old words are not. Only three sourcing paths are allowed:
1. **Original** — written by us, for this product. Unambiguous ownership.
2. **Public domain, individually verified** — meaning the *specific line*, not just "old sayings in general," traces to a source published before the applicable cutoff (see §1) with no identifiable living-rights-holder complication (e.g., no modern translation, no modern anthology's specific wording).
3. **Permissively licensed, with the license text saved** — for code snippets from real repositories (MIT/Apache/BSD/CC0), always with source, commit, and license file captured.

---

## 1. The public-domain cutoff, explained precisely (so nothing is sourced on a guess)

- **United States rule (the one that matters most, since it's the most restrictive commonly-cited one and a safe floor):** works are protected for 95 years from publication, so the public domain cutoff **advances by one year every January 1st**. As of the searches run for this project (late 2025), the confirmed-clear cutoff was **published before 1929**. That means as of **2026, the safe cutoff is published before 1930**, and it will become 1931 in January 2027, and so on. **This library's policy: only use text confirmed published before 1900**, a full extra 30-year buffer past the legal minimum, specifically so the content never needs re-auditing as the yearly rolling cutoff advances, and so there is zero ambiguity about "was this published in 1929 or 1930."
- **A second, independent check beyond publication date:** even a pre-1900 line can be unusable if the specific *wording we have* comes from a modern translation, modern anthology's editorial choices, or a modern "collection" site's paraphrase. **Rule: only use lines traceable to a specific pre-1900 English-language primary source** (e.g., an original English-language proverb collection, an original English-language work by a public-domain author), not a modern re-statement of a foreign or ancient saying.
- **What this policy deliberately excludes, even though it might be technically legal:** modern "inspirational quote" compilations, anything only found on quote-aggregator websites without a traceable original source, and anything where the only source is itself a 20th/21st-century book still under copyright quoting an old line (the compiler's selection and phrasing can carry its own thin copyright, and it isn't worth the legal ambiguity for a typing-practice sentence).

## 2. Sourcing decision table (what goes in each content type)

| Content type | Sourcing path | Why |
|---|---|---|
| Real-World Prose passages (emails, notes, explanations, stories) | **100% Original** | No source is old enough and natural-sounding enough to fill this role; must read like 2026 writing anyway |
| Classic/Quotes mode | **Mixed: ~70% original "quote-style" lines we write, ~30% verified pre-1900 traceable lines** | Gives variety of voice without legal risk |
| Common-word list (Classic mode word bank) | **Computed from our own frequency analysis of our own original passages** | Avoids importing anyone else's word list entirely — sidesteps the licensing question altogether |
| Numbers & symbols sets | **Generated (synthetic)** | No sourcing question — it's procedurally generated per the token-drill-generators skill |
| Code snippets | **Real repositories, MIT/Apache/BSD/CC0 only, license saved** | Needs to be real, idiomatic code; can't be "originally written" and still feel authentic |
| Recall idioms (programmer track) | **Original, written to be idiomatic** | Small enough (3–8 lines) to write cleanly without needing a real-world source |

## 3. File map for this content library batch

| File | Contents | Count delivered this batch |
|---|---|---|
| `content-prose-batch-01.md` | Original Real-World Prose passages, Set 1: everyday/personal domain | 60 passages |
| `content-prose-batch-02.md` | Original Real-World Prose passages, Set 2: workplace/professional domain | 60 passages |
| `content-prose-batch-03.md` | Original Real-World Prose passages, Set 3: technical/instructional domain | 60 passages |
| `content-quotes-original.md` | Original quote-style lines (aphoristic, short) | 90 lines |
| `content-quotes-verified-public-domain.md` | Verified pre-1900 lines with full source trail | 40 lines |
| `content-code-snippets-javascript.md` | Real MIT/Apache/BSD snippets, JavaScript/TypeScript | this batch: structure + license register + 15 verified snippets |
| `content-code-snippets-python.md` | Same, Python | next batch |
| `content-code-snippets-java.md` | Same, Java | next batch |
| `content-license-register.md` | The master register — every single item above gets one row here | populated as items are added |

**Running total after this batch:** 180 original prose passages + 90 original quote-style lines + 40 verified public-domain lines + 15 verified-license code snippets = **325 content-library items**, each with a register entry. This is the real, quality-controlled foundation. Reaching the target of ~300 prose + ~300 quotes + ~100 snippets-per-language from the spec happens by continuing this exact same batching process — the **process is now fully demonstrated and repeatable**, which is the actually valuable deliverable (an AI agent, or you, can run this same batch procedure indefinitely).

## 4. The register schema (every row in `content-license-register.md` uses this exact structure)

| Field | Meaning |
|---|---|
| `item_id` | Unique ID, format `TYPE-BATCH-###` (e.g., `PROSE-01-014`) |
| `type` | prose / quote-original / quote-public-domain / code-snippet / recall-idiom |
| `content_type_tag` | For selector/difficulty routing: everyday, workplace, technical, aphoristic, etc. |
| `source` | "original" OR the exact traceable source (author, work title, approximate year) OR (repo URL, file path, commit hash) for code |
| `license` | "original work — ours" / "public domain (pre-1900, verified)" / the SPDX license identifier (MIT, Apache-2.0, BSD-3-Clause, CC0-1.0) |
| `license_text_saved` | yes/no — for code, the actual LICENSE file content must be captured verbatim, not just referenced by URL (URLs rot) |
| `attribution_required` | yes/no, and the exact attribution string to display if yes |
| `date_checked` | when this row was verified |
| `reviewer` | who verified it |
| `status` | draft / reviewed / live / retired |
| `notes` | anything unusual about the sourcing decision |

## 5. Batch quality process actually followed for this delivery

For every passage in the batches that follow, this process was applied by hand (not just generated and dumped):
1. Written to a **specific, named scenario** (not generic filler) — e.g., not "write a sentence about work," but "a message rescheduling a Tuesday meeting because a delivery is late."
2. Checked for **length** (20–120 words), **natural punctuation**, **no PII**, **no real brand names with trademark risk** (fictional company/product names used instead), and **no offensive content**.
3. Checked for a **realistic mix of case, digits, and punctuation** so the passage is actually useful typing practice, not just grammatically correct prose (a passage that's all lowercase letters with no punctuation is a worse practice item, even if perfectly readable).
4. Read aloud (mentally) for the "does this sound like a person wrote it" test — repetitive AI phrasing patterns (starting every sentence the same way, overusing certain transition words) were caught and rewritten.
5. Tagged for difficulty **directionally** (Easy/Typical/Hard) based on the typability-scoring feature list from the spec (lowercase share, word frequency, symbol/digit share) — a full computed score requires the actual scoring pipeline (Implementation Guide §6.5); these tags are a manual pre-estimate to be replaced by computed scores once that pipeline exists.

---

*(The four content files referenced in the table above follow as separate documents. The code-snippets file below demonstrates the harder "verified real license" sourcing path in full, since it is procedurally the most demanding and most important to get exactly right.)*
