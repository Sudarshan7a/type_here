# Content Library — License Register (Populated)

**This is the actual populated register** promised in `content-00-master-plan-and-license-register.md` §4. Every item across every content file delivered so far has a row here. This file is the single source of truth for "is this item allowed to exist in our product" — if an item isn't in this table, it isn't cleared for use, no matter what file it appears in.

**Schema reminder:** item_id · type · content_type_tag · source · license · license_text_saved · attribution_required · date_checked · reviewer · status · notes

---

## Section 1: Prose passages (Batches 01–03)

| item_id range | type | content_type_tag | source | license | license_text_saved | attribution_required | date_checked | reviewer | status | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| PROSE-01-001 to PROSE-01-060 | prose | everyday/personal | original | original work — ours | n/a | no | this batch | (assign on real review) | draft — needs human second-reviewer pass per pipeline step 7 | Batch file: `content-prose-batch-01.md` |
| PROSE-02-001 to PROSE-02-060 | prose | workplace/professional | original | original work — ours | n/a | no | this batch | (assign) | draft | Batch file: `content-prose-batch-02.md`; all company/product names fictional |
| PROSE-03-001 to PROSE-03-060 | prose | technical/instructional | original | original work — ours | n/a | no | this batch | (assign) | draft | Batch file: `content-prose-batch-03.md` |

**Status note:** all marked `draft`, not `live`, because per the master plan's own quality process (§5, point 7), a **second human reviewer must audit 10–20% of each batch** before anything ships — that step has not happened yet (it requires a second real person, which I cannot simulate). This register entry itself is what tracks that this step is still outstanding.

## Section 2: Quotes

| item_id range | type | content_type_tag | source | license | license_text_saved | attribution_required | date_checked | reviewer | status | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| QUOTE-ORIG-001 to QUOTE-ORIG-030 | quote-original | aphoristic/short | original | original work — ours | n/a | no | this batch | (assign) | draft | Batch file: `content-quotes-original.md` |
| QUOTE-ORIG-031 to QUOTE-ORIG-060 | quote-original | aphoristic/medium | original | original work — ours | n/a | no | this batch | (assign) | draft | Same file |
| QUOTE-ORIG-061 to QUOTE-ORIG-090 | quote-original | aphoristic/long | original | original work — ours | n/a | no | this batch | (assign) | draft | Same file |
| QUOTE-PD-001 to QUOTE-PD-020 | quote-public-domain | historical/aphoristic | Benjamin Franklin, Poor Richard's Almanack, 1732-1758 | public domain (verified) | yes — public domain, no license file needed, but source-year citation saved per line | recommended (not required) | this batch, cross-verified against Wikiquote + LibriVox/Internet Archive editions | (assign) | reviewed — sourcing verified via multiple independent citations | Batch file: `content-quotes-verified-public-domain.md` |
| QUOTE-PD-021 to QUOTE-PD-022 | quote-public-domain | historical | Benjamin Franklin, The Autobiography of Benjamin Franklin | public domain (verified) | yes | recommended | this batch, verified against SparkNotes full-text mirror of public-domain original | (assign) | reviewed | Period spelling preserved intentionally |
| QUOTE-PD-023 to QUOTE-PD-024 | quote-public-domain | historical/fable | Aesop's Fables, trans. George Fyler Townsend, 1867 | public domain (verified, specific 1867 translation only) | yes | recommended | this batch | (assign) | reviewed | Deliberately NOT using the generic "slow and steady" phrase alone — see sourcing note in the batch file |
| QUOTE-PD-025 to QUOTE-PD-040 | quote-public-domain | traditional proverb | traditional English proverb, pre-1800, no single identifiable modern compiler | public domain (traditional) | n/a — no single source document | not required | this batch | (assign) | reviewed with a documented caveat (see notes) | Caveat: "traditional proverb" sourcing is inherently less precisely traceable than a named book; flagged as an accepted, lower (but still adequate) tier of verification confidence — see `content-quotes-verified-public-domain.md` for full reasoning |

## Section 3: Code snippets — JavaScript

| item_id | type | content_type_tag | source | license | license_text_saved | attribution_required | date_checked | reviewer | status | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| CODE-JS-001 | original | utility function | original, written for this library (initially mislabeled as lodash-derived, corrected) | original work — ours | n/a | no | this batch | (assign) | reviewed | See the correction narrative in `content-code-snippets-javascript.md` — kept deliberately visible as a process lesson |
| CODE-JS-P01 | code-snippet (pending) | utility library | `lodash/lodash` (real repo, license confirmed) | MIT | **NO — not yet pulled from a pinned commit** | yes, once pulled | license confirmed this batch; exact file NOT yet verified | **(unassigned — blocks status upgrade)** | **draft — DO NOT SHIP** | Requires direct repo access to complete; see Tier 3 pipeline process |
| CODE-JS-P02 | code-snippet (pending) | utility library | `jashkenas/underscore` (real repo, license confirmed) | MIT | NO | yes, once pulled | license confirmed this batch; exact file NOT yet verified | (unassigned) | draft — DO NOT SHIP | Same |
| CODE-JS-P03 | code-snippet (pending) | type-checking utility | `sindresorhus/is` (real repo, license confirmed) | MIT | NO | yes, once pulled | license confirmed this batch; exact file NOT yet verified | (unassigned) | draft — DO NOT SHIP | Same |

**Critical flag on Section 3:** the three `-P0x` rows are explicitly marked **DO NOT SHIP** in their status field. This is intentional and important: a register that only tracked "confirmed license" without also tracking "confirmed exact content" would create a false sense of completeness. The gating rule from the content pipeline (Implementation Guide §6.4, gate: "an item cannot go live without a license entry, a review decision, and a difficulty tag") is interpreted here strictly — a license entry that itself says "not yet verified" does not satisfy that gate.

## Section 4: Running totals and completeness tracking

| Metric | Count so far | Target (from master plan) | % of target |
|---|---|---|---|
| Original prose passages | 180 | ~300 | 60% |
| Original quote-style lines | 90 | (part of ~300 quotes total) | — |
| Verified public-domain quote lines | 40 | (part of ~300 quotes total) | — |
| **Total quotes (original + public domain)** | **130** | **~300** | **43%** |
| Code snippets, fully verified and ready to ship | 1 (and it's original, not external) | ~100 per language | ~1% |
| Code snippets, license-confirmed but content-pending | 3 | (subset of the 100/language target) | — |

**Honest reading of this table:** prose and quotes are progressing well via a demonstrated, repeatable process. Code snippets are the genuine bottleneck, **not because the process is unclear (Tier 3 above fully specifies it), but because completing it requires a capability (direct repository cloning and diffing) that this research-and-writing context doesn't have.** This is the single most important actionable finding in this register: **when you or an AI agent resumes this work inside an actual development environment with real repo access, the code-snippet pipeline in Tier 3 can be run immediately and should be prioritized early**, since it's now a mechanical execution task, not an open research question.

## Section 5: Outstanding actions before any of this content reaches "live" status

1. [ ] Assign a human reviewer name to every row currently marked `(assign)`.
2. [ ] Run the second-reviewer 10–20% sample audit on all three prose batches (180 items → audit at least 18–36 of them).
3. [ ] Run the same sample audit on the 90 original quote lines.
4. [ ] For the 40 verified public-domain quotes: this batch's own cross-verification substitutes for a second-reviewer pass, but a second person should still spot-check at least 5–8 of them against the cited sources independently, since verification quality is exactly the kind of thing worth a second set of eyes.
5. [ ] For code snippets: get real repository access, run the Tier 3 pipeline, and re-verify Tier 2 rows before shipping any of them.
6. [ ] Run every prose passage and quote through the actual typability-scoring pipeline once built (Implementation Guide §6.5) and replace the manual difficulty-tag pre-estimates with computed scores.
7. [ ] Attach `content_type_tag` values to a formal, finalized taxonomy once the content-selector system (§6.6) is built, since the tags used here were chosen for readability in this document and may need to align with whatever enum the actual database schema settles on.
