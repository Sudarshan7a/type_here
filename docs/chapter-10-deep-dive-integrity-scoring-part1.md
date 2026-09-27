# Chapter 10 (Deep-Dive) — Integrity Scoring: Plausibility Checks, Timing-Distribution Tests, Worked Examples

**Extends:** Implementation Guide §9.6 (Anti-Cheat Design) and the `integrity-anti-cheat` skill. Consumes Chapter 4's metrics definitions (IKI, rollover, KSPC) directly — integrity scoring is built entirely on top of the same engine primitives, which is why this chapter comes last: it needs everything before it.
**Purpose:** same treatment as Chapters 4, 8, and 9 — every abstract rule ("plausibility checks," "timing-distribution tests," "risk scoring") gets worked numbers, a named decision, and a testable threshold, because "detect cheating" is exactly the kind of instruction that produces nothing usable without concrete math behind it.

---

## 10.1 Why this has to be worked in real numbers, not left abstract

The master spec says: "physical key-rate limits, minimum IKIs, impossible rollover, timing-distribution tests, machine-like regularity." Each of those five phrases is a genuine algorithm, not a checkbox. An implementer (human or AI) given only that sentence will either under-build (a single crude threshold that both lets bots through AND flags real fast typists) or over-build (an opaque black box nobody can explain to an appeals reviewer, violating the spec's own transparency requirement). This chapter builds each of the five checks with real, worked, defensible numbers.

---

## 10.2 Check 1 — Physical key-rate limits, worked

### 10.2.1 The physical floor

**Fact this is based on:** human finger movement has a hard physical floor — no human can press two different keys with the same finger faster than roughly 60-80ms apart under any real-world circumstance (typing champions' peak single-key repeat rates are well documented and don't go below this range), and even alternating-hand rollover (Chapter 4 §4.6) rarely drops under ~40-50ms between keys for sustained sequences (isolated single fast pairs can go a bit lower, but SUSTAINED sequences at extreme speed are what indicate automation).

### 10.2.2 Worked threshold and worked test case

**Rule (a `[proposal]`, stated as an exact number so it's testable):** flag any window of **10 or more consecutive keystrokes** where the **mean inter-key interval is below 45ms** (implying a sustained rate faster than roughly 267 WPM-equivalent — a rate that would represent a genuinely world-record-shattering sustained pace, if real).

**Worked test case — a scripted bot:** a naive auto-typer script fires keystrokes at a fixed 20ms interval (a common, lazy bot implementation — just loop and send characters with a small fixed delay). Over any 10-keystroke window, mean interval = 20ms, which is **far below the 45ms floor** → **flagged immediately**, on the very first window checked.

**Worked test case — a genuine elite typist:** a real, verified 150+ WPM competitive typist's fastest recorded 10-keystroke burst (drawn from realistic published elite-typist burst data) might show intervals like: 52, 48, 61, 55, 47, 58, 50, 53, 49, 56ms — **mean = 52.9ms**, comfortably above the 45ms floor → **correctly NOT flagged**, even though this person is genuinely one of the fastest typists alive. **This worked comparison is the single most important number in this whole check**: the 45ms floor must sit clearly below the fastest known genuine human sustained bursts (52.9ms in this worked example) while sitting clearly above trivially-lazy bot timing (20ms) — a floor set carelessly (e.g., at 50ms) would risk flagging genuine elite typists, which is exactly the false-positive harm the integrity program's own stated goal ("keep false positives very low") is designed to prevent.

**Test name:** `INT-FIXTURE-001-physical-floor-worked` — hardcode both the 20ms-bot and 52.9ms-elite-typist sequences; assert the bot sequence is flagged and the elite-typist sequence is NOT flagged, with the exact 45ms threshold as the dividing line, explicitly documenting the safety margin (52.9 - 45 = 7.9ms, or about 18% headroom) between the two.

---

## 10.3 Check 2 — Minimum IKI outlier detection, worked (distinct from Check 1's sustained-rate check)

**Why this is a SEPARATE check from Check 1:** Check 1 looks at SUSTAINED rate over a whole window. This check looks at INDIVIDUAL keystroke pairs that are impossibly fast even as isolated events, catching a different failure mode: a bot that mostly types at a believable, human-like pace but occasionally (perhaps due to a scripting artifact, like two characters being sent in the same event-loop tick) produces one or two genuinely impossible single-pair intervals buried inside otherwise-normal-looking data.

### 10.3.1 Worked example

**Rule:** flag any SINGLE inter-key interval below **15ms** between two different physical keys typed by different fingers (this is near the absolute floor of human neuromuscular response time for a two-handed alternation, and well below even genuine sustained-rollover pairs), OR below **35ms** between two keys that would require the SAME finger (same-finger movement has a higher physical floor than cross-hand movement, since the same finger must physically release one key and travel to press another).

**Worked example — a real (non-bot) log with one anomalous pair:** a user's otherwise-normal 200 keystrokes include one pair with an interval of **4ms** between two same-finger keys (physically implausible — even the fastest same-finger repeated key rate is well above 4ms). **This single 4ms pair is flagged as an outlier event**, even though the surrounding 199 keystrokes look completely normal — this is exactly the scenario Check 1 (which looks at 10-keystroke window averages) would MISS, since one 4ms outlier buried among otherwise-normal ~150ms intervals wouldn't meaningfully drag down a 10-keystroke window's mean. **This is why both checks are needed together, not just one** — they catch genuinely different failure signatures.

**What causes this in practice (useful context, not just a hypothetical):** this kind of single-outlier pattern is a known artifact of certain bot/automation approaches that inject synthetic keystrokes via browser automation tools, where two events can occasionally get dispatched in the same JavaScript event-loop tick due to how the automation script batches its input, producing a near-zero recorded interval that a real human keyboard could never produce for that specific same-finger pair.

**Test name:** `INT-FIXTURE-002-single-outlier-detection` — construct a 200-keystroke log that is otherwise fully human-plausible (per Check 1) but contains exactly one 4ms same-finger pair; assert Check 1 alone does NOT flag it (proving the gap), but Check 2 DOES flag it (proving the two checks are complementary, not redundant).

---

## 10.4 Check 3 — Impossible rollover patterns, worked

**Recap:** rollover (Chapter 4 §4.6) is normal and even desirable in fast typists. This check is specifically about rollover patterns that are structurally impossible for a human hand, not merely "a lot of rollover."

### 10.4.1 The specific impossible pattern

**Rule:** flag rollover between two keys that are **both assigned to the exact same finger** on the user's declared layout/finger-map, with an overlap duration exceeding a small threshold. **Reasoning:** a human finger is a single physical object — it CANNOT be pressing key A down (not yet released) while simultaneously beginning to press key B down, if A and B are both assigned to that same finger, because one finger cannot occupy two key positions at once. Genuine rollover is a real phenomenon between DIFFERENT fingers (often different hands), never within the same finger.

### 10.4.2 Worked example

**Scenario:** on a standard QWERTY finger map, both `f` and `r` might be commonly assigned to the same finger (left index) in many touch-typing schemes (the left index finger typically covers multiple keys in its "home" column and reaches). Suppose a log shows: `f` keydown at 1000ms, `f` keyup at 1080ms, `r` keydown at 1050ms (BEFORE `f`'s keyup at 1080ms) — this means the system is claiming the left index finger was simultaneously holding down `f` AND pressing `r`, a physical impossibility for one finger.

**Rule applied:** this is flagged as an **impossible same-finger rollover event**, a much stronger integrity signal than ordinary cross-hand rollover, since there is no plausible innocent explanation (unlike Check 2's single-outlier timing, which could theoretically arise from an unusual but genuine keyboard/OS quirk, a same-finger physical overlap has essentially zero legitimate explanation).

**Important caveat, stated explicitly (a real edge case worth naming):** **this check depends entirely on the finger-map being accurate for the user's actual layout and actual hand anatomy** — a user with an atypical finger-to-key mapping (due to hand size, an old injury, or simply an unconventional self-taught typing style, which Chapter "science facts" SC-5 already establishes is common and legitimate) might trigger a false same-finger-overlap flag purely because our ASSUMED finger map doesn't match their REAL finger usage. **Mitigation (a `[proposal]`):** this specific check contributes only a MODERATE weight to the overall risk score (see §10.6), never a standalone auto-flag on its own, specifically because of this known false-positive risk from atypical (but legitimate) finger usage.

**Test name:** `INT-FIXTURE-003-same-finger-rollover-worked` — hardcode the exact `f`/`r` overlap timing above using a QWERTY finger map where both are assigned to the same finger; assert this is flagged as a same-finger impossible-rollover event, and assert it contributes only partial (not full/automatic) weight to the overall risk score, per the caveat above.

---

## 10.5 Check 4 — Timing-distribution tests (bigram-dependence check), worked in real detail

**This is the most sophisticated of the five checks and deserves the most worked detail**, since the master spec's own language ("human IKI depends on bigram type and skill; bots that ignore this or show unnaturally low variance stand out") is a real statistical claim that needs to be made concrete.

### 10.5.1 The real underlying fact this check exploits

**From Chapter "Weakness Model" science facts (Chapter 8's foundations) and the original 136M-keystroke research:** real human typists show **systematically different IKI depending on the TYPE of bigram** — cross-hand bigrams are measurably faster than same-hand bigrams, which are in turn faster than same-finger bigrams, and this pattern holds consistently across real human data. **A bot that generates uniform or near-uniform timing regardless of bigram type is missing this entirely human signature.**

### 10.5.2 Worked example — computing the check on real vs. bot data

**Worked "real human" scenario:** a 300-keystroke sample from a genuine typist, bucketed by bigram type, with mean IKI per bucket:
- Cross-hand bigrams (e.g., `t→h` on QWERTY): mean IKI = **165ms**, n=80 samples
- Same-hand, different-finger bigrams (e.g., `a→s`): mean IKI = **195ms**, n=90 samples
- Same-finger bigrams (e.g., `f→r` if same-fingered): mean IKI = **240ms**, n=40 samples

**Compute the "bigram-dependence spread":**
```
spread = (same_finger_mean - cross_hand_mean) / cross_hand_mean
       = (240 - 165) / 165
       = 75 / 165
       = 0.455 (45.5% slower for same-finger vs cross-hand)
```
This 45.5% spread is **consistent with genuine human data** (real typists reliably show a meaningful, non-trivial gap between these bigram categories — a spread anywhere roughly in the 20-60% range, a `[proposal]` band informed by the general pattern, would look human).

**Worked "bot" scenario:** a bot that generates timing from a single random distribution regardless of which keys are involved (a common, simple bot design — just add random jitter within a fixed range to every keystroke, with no awareness of which physical keys are being pressed) produces, across the same three bigram-type buckets:
- Cross-hand: mean IKI = **178ms**, n=80
- Same-hand: mean IKI = **182ms**, n=90
- Same-finger: mean IKI = **175ms**, n=40

```
spread = (175 - 178) / 178 = -0.017 (-1.7%, essentially flat, even slightly reversed)
```
**This near-zero (or reversed) spread is the tell** — a real human's same-finger bigrams should be noticeably slower than cross-hand ones (per the 45.5% worked example above), and a bot that ignores physical key layout entirely produces flat, undifferentiated timing regardless of bigram difficulty. **This is exactly the signature the master spec's language is pointing at**, now made concrete and computable.

**Test name:** `INT-FIXTURE-004-bigram-dependence-spread` — hardcode both the human-like (45.5% spread) and bot-like (-1.7% spread) worked datasets; assert a threshold rule (e.g., "flag if spread is below 10%, since genuine human data essentially never shows a same-finger bigram as fast as or faster than cross-hand") correctly separates the two, with the human case passing and the bot case flagged.

### 10.5.3 The "unnaturally low variance" sub-check, worked separately

**A second, related but distinct signal** also mentioned in the spec: even a bot that DOES vary its bigram timing by type (a more sophisticated bot, deliberately built to evade the check in §10.5.2) might still show **suspiciously LOW variance within each bucket** — because injecting genuinely human-like variability (not just a different mean per bucket, but realistic spread/noise around each mean) is a harder thing for a bot author to get right than just picking three different fixed delays.

**Worked comparison:** the genuine human's cross-hand bigram samples (n=80, mean=165ms) might have a standard deviation of around **35-40ms** (real human typing has real variability, moment to moment, even for the "same" type of transition). A sophisticated bot faking three different means per bucket, but generating each sample from a narrow fixed range (e.g., always exactly 165ms ± 3ms), would show a standard deviation of only **~2ms** for the same bucket — **an order of magnitude less variable than genuine human data**.

**Rule:** flag if the standard deviation within any bigram-type bucket (with sufficient sample size, e.g., n≥20) is below roughly **15% of that bucket's own mean** (a `[proposal]` coefficient-of-variation floor) — worked: genuine human 40ms/165ms = 24.2% (comfortably above the 15% floor, not flagged); sophisticated-bot 2ms/165ms = 1.2% (far below the 15% floor, flagged despite having gotten the MEAN right).

**Test name:** `INT-FIXTURE-005-low-variance-sophisticated-bot` — hardcode both datasets; assert the sophisticated bot (correct means, unnaturally tight variance) is still caught by this variance-specific check even though it would PASS the mean-spread check in §10.5.2, demonstrating why both sub-checks are needed together to catch increasingly sophisticated evasion attempts.

---

*(Continues in Part 2: the overall risk-scoring combination formula worked with real numbers across all five checks, the appeals/false-positive-rate worked calculation, session-signing and replay-attack worked scenarios, and a consolidated test catalog.)*
