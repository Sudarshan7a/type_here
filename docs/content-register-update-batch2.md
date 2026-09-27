# Content Library — Register Update (Prose & Quotes Closed to Target)

**Append this to `content-license-register.md` as its new Section 6.** This file exists separately so the original register isn't re-transmitted in full; merge by hand or with a script.

---

## Section 6: What changed in this round

| Content type | Before this round | Added this round | New total | Target | Status |
|---|---|---|---|---|---|
| Original prose passages | 180 (Batches 01-03) | +120 (Batches 04-05) | **300** | ~300 | ✅ **Target met** |
| Original quote-style lines | 90 (Batch 1) | +90 (Batch 2) | **180** | (part of ~300) | Continues to grow |
| Verified public-domain quotes | 40 (Batch 1: Franklin, Aesop) | +10 (Batch 2: Marcus Aurelius/Long) | **50** | (part of ~300) | Continues to grow |
| **Combined quotes total** | 130 | +100 | **230** | ~300 | 77% — genuine gap remains, honestly stated below |
| Code snippets, license-confirmed | 3 (pending, DO NOT SHIP) | +0 | **3, still pending** | ~100/language | **Blocked — see below, not closed this round** |
| Levels 31-60 content | 0 | +0 | **0** | n/a | **Deliberately not built — validation gate, see below** |

## New register rows (append to Section 1 and Section 2 of the main register)

| item_id range | type | source | license | status |
|---|---|---|---|---|
| PROSE-04-001 to 060 | prose | original (relationships/social domain) | original work — ours | draft |
| PROSE-05-001 to 060 | prose | original (news/explanatory + travel domains) | original work — ours | draft |
| QUOTE-ORIG-091 to 180 | quote-original | original | original work — ours | draft |
| QUOTE-PD-041 to 050 | quote-public-domain | Marcus Aurelius, Meditations, trans. George Long, 1862 | public domain (verified) | reviewed |

## Why code snippets are still not closed — restated plainly, not glossed over

This was flagged clearly in the earlier `content-code-snippets-javascript.md` file and remains true: **verifying a repository's license is something I can do through search; pulling an exact, byte-for-byte file at a pinned commit hash is not** — that requires direct filesystem/repository access I don't have in this context. Writing more "original, lodash-style" utilities (like `CODE-JS-001`) doesn't close this gap — it would just be more original content mislabeled as solving a problem it doesn't solve. **The honest state remains: 3 real repositories with confirmed licenses, 0 additional snippets with verified exact content, against a ~100-per-language target.** The fix is mechanical (someone or something with real repo access runs the Tier 3 pipeline already fully specified in that file) — not something more writing in this format can produce.

## Why Levels 31-60 remain at zero — restated plainly

This is **deliberate, not an oversight**, and reversing it without evidence would contradict the project's own validation gate (Implementation Guide §7.8 / §10.11): *"Before building L31+: evidence that L1-30 gets weekly use and interviews show P2 demand."* No interviews have happened. Building Tiers 7-12 content now would mean investing real effort (vocabulary banks, generation parameters, boss content — the same volume of work as `levels-01` and `levels-02` combined, or more, since Tiers 7-12 include harder-to-generate content like terminal commands and full editor tasks) into a track that might not be wanted. **The responsible choice is to hold this at zero until Week 0-2's interviews and the beta's usage data say otherwise** — this is a case where "more content" would actually be a worse decision than the current gap, not a better one.

## What a genuinely complete content library still needs (unchanged assessment)

1. **~70 more quotes** to close the 230→300 gap — achievable by continuing exactly what Batches 1-2 already did (more original lines, or one more rigorously-verified primary source).
2. **Real code-snippet repository access** — a capability gap, not a content gap.
3. **A second-reviewer human pass** on all 300 prose passages and 230 quotes (still zero of this has happened — every item remains `draft`, not `reviewed`, except the public-domain quotes which had their own built-in cross-verification).
4. **Levels 31-60** — intentionally deferred pending real user demand evidence.
5. **Re-running the classic-mode word-list derivation** against the full 300-passage corpus (it was only run against 78 passages previously).
