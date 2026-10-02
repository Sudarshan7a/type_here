# REVIEW-1 — Session 8 (HALT-H3-3, PRs #8–#11)

**Reviewed:** `docs/halt/HALT-H3-3.md`, `docs/sessions/SESSION-8-REPORT.md`, `HUMAN-ACTIONS.md`,
`BUILD-LOG.md`, `docs/FEATURE-LEDGER.md`, `docs/handoff/STEER-1..4.md`, PRs #8–#11, `main` @ `334a6c1`.
**Reviewer:** owner-proxy (AI). **Not the human owner.** Every decision below is reversible and
labelled `DECIDED BY OWNER-PROXY (AI)`.

**I am the same model as the Builder** (`stealth/space-bunny-alpha`). That is a real limitation on
this review and it is why almost everything below is settled by a command I ran rather than by
reasoning about code. `owner spot-check due` is item 8 in `OWNER-QUEUE.md`.

---

## 0. What I don't know

- I do not know whether the redesign is *good*. I measured that it is internally consistent and
  that its assertions hold. Whether it looks like the owner's concept is owner judgement and I have
  no standing to make it.
- I do not know real-device latency, and no command I can run will tell me.
- I could not use the Kimi WebBridge: the daemon started and the extension connected, but
  `list_tabs` returned `[]` and `navigate` returned `{"error":"No current window"}`; the logs then
  showed `refused extension fldmhcel client b4579e42 — slot held by extension fldmhcel client
  74c6881a`. Two extension copies are fighting for the slot and no browser window is open. Per the
  bridge's own failure protocol I stopped rather than touching the browser or the extensions, and
  fell back to Playwright. **Confidence HIGH** — quoted verbatim from the tool.
- One measurement of mine was wrong and I discarded it. My first caret probe reported `dy: 138.56`
  after a resize, which would have been a live BUG-a defect. It was my script choosing a target
  character from the wrong line. A second probe that compares against a known index reports
  `dx: 0, dy: 0` in all four conditions. The product is fine; my first script was not.

---

## 1. Baseline re-run — every number in the halt file reproduces

Clean worktree at `origin/main` (`334a6c1`), `pnpm install --frozen-lockfile`, then each gate:

| Gate | Builder's claim | What I got | Diff |
|---|---|---|---|
| `pnpm lint` | 0 | 0 | — |
| `pnpm format:check` | clean | clean | — |
| `pnpm typecheck` | 0 | 0 | — |
| `pnpm test` | 356, 0 failures | **356 passed, exit 0** — engine 127, web 44, telemetry 101, schemas 69, fixture-recorder 11, api 4 | — |
| coverage | engine 95.5% stmts, web 81.4% | engine 95.52/93.04/91.56/96.77, web 81.39/75/72.72/80.48 | — |
| `pnpm build` | 0 | 0, `index-CCty1Lab.js` 237.91 kB / 75.05 kB gzip | — |
| `pnpm check:bundle` | 75.3 KB gzip / 200 KB | **75.3 KB gzip / 200 KB** | — |
| `pnpm e2e` | 19/19 | **19 passed (56.7s)**, exit 0 | count yes; see **M2** |

**No discrepancy in the final-state numbers. Confidence HIGH.** The Builder's Session 8 numbers are
accurate as numbers. The problems below are about what the numbers are *labelled* and about one
cited test that does not test what its row says it tests.

I also re-ran `node e2e/capture-visual-evidence.mts` on a fresh checkout: **exit 0**, seven shots
written, a uniform `15.69px` character advance on every shot, and the 360px shot at six wrapped
lines. The self-checking capture did not throw, so its three invariants — no line opens with a
space, every character lives inside a `word` box, the layout is unchanged across the shutter — held
on a build I did not produce. **The visual-evidence pipeline is real. Confidence HIGH.**

---

## 2. Ledger audit by mutation — the required check

Three `DONE-VERIFIED` rows broken in a scratch worktree at `334a6c1`. A test that stays green under
a broken feature is **vacuous** and the row must be demoted.

| Row | Mutation | Cited evidence | Result | Verdict |
|---|---|---|---|---|
| `NFR-16` "Bundle budget enforced in CI" | 300 KB incompressible asset added to `apps/web/public/` | `pnpm check:bundle` | `Total shipped: 375.4 KB gzip (budget 200 KB)` → `FAIL`, **exit 1**. Gate confirmed present in `.github/workflows/ci.yml`, after `pnpm build`. | **ACCEPT** |
| `ENG-01` "high-res timestamps" | `t: Math.round(this.relative(at) / 16) * 16` in `apps/web/src/input-adapter.ts:162` | `apps/web/tests/input-adapter.test.ts` | **1 failed** | **ACCEPT** |
| `ENG-01` "order preserved" | `events: [...this.captured].reverse()` at `input-adapter.ts:125` | same | **2 failed** | **ACCEPT** |
| `CUS-01` "no ads/popups/modals" | `<div className="toast">Saved to your profile</div>` on the typing surface | `e2e/typing-surface.spec.ts` AC6 | AC6 **red** — fires | fires |
| `CUS-01` "no ads/popups/modals" | `<div className="promo-banner" aria-modal="true">Congrats! Sign up to save your streak.</div>` | `e2e/typing-surface.spec.ts` AC6 | **AC6 GREEN** | **VACUOUS for its claim** |

Note on the first `NFR-16` attempt: 300 KB of `0x07` bytes gzipped to 0.3 KB and the gate correctly
passed. I had to use incompressible bytes to move the number. The gate measures gzip, which is the
right metric; that is not a finding.

**Result: 2 of 3 rows verified non-vacuous; `CUS-01` is not.** See **H1**.

I also checked that `ENG-01`'s other cited evidence is real rather than a name. `ENG-FIXTURE-E01`,
`E02` and `E03` are declared as `FIXTURE_ID` constants in `packages/engine/fixtures/e0{1,2,3}.ts`
and are executed by `packages/engine/tests/eng-fixture-e01.test.ts` and by
`e2e/parity/parity.spec.ts:12`. My first grep scoped to `packages/engine/tests` alone suggested
E02/E03 were unexecuted; that was wrong. **Confidence HIGH** — the label is accurate.

---

## 3. Protocol compliance

| Rule | Result |
|---|---|
| Halt file exists, correct type | **PASS.** `HALT-H3-3.md`, Type H3, names STEER-4 as driver and the three commits. |
| Counted-task claims are real | **PASS.** One counted task, and it moved `CUS-02` and added 16 unit + 6 e2e tests. The halt file says so plainly rather than inflating it. |
| Test commit precedes implementation | **PASS.** `728dcf1` (tests) → `68d8fcf` (implementation) → `e03b2e7` (docs). |
| No test weakened, skipped or deleted | **PASS — and better than pass.** See below. |
| Each merge after CI finished green | **3 of 4.** PR #9 merged 17 s before its CI finished. Self-disclosed by the Builder; I confirmed it independently. |
| Evidence labels honest | **PASS.** No `REAL-DEVICE CONFIRMED` claim anywhere; every mention is a denial, a definition, or an explicit "still required". |
| No anti-goal built | **PASS.** |
| Model ID recorded | **PASS.** `stealth/space-bunny-alpha` in the session report. |

**No test was weakened.** The one test that disappeared,
`it("tolerates markers that arrive out of order")`, was **replaced by two stronger ones**: the
renamed successor now asserts an exact `durationMs === 5000` where the old one asserted
`>= 12000`, and a new hostile-marker property test asserts `0 <= durationMs <= 4000` and a finite
net WPM across four marker lists including negative and out-of-order ones. Separately, hand-written
`"1.0.0"` version literals in `packages/engine/tests/fixture-runner.ts` were replaced with the
`ENGINE_MODEL_VERSION` constant, which removes a copy that had already drifted once. Both changes
are strengthenings and both say why in a comment. **Confidence HIGH.**

### Merge-order evidence

| PR | head sha | `pull_request` CI run | CI concluded | merged | Verdict |
|---|---|---|---|---|---|
| #8 | `e03b2e7` | 36968859585 | 05:26:54Z success | 05:27:02Z | 8 s after — correct |
| #9 | `f7081bb` | 36969037162 | 05:29:25Z success | 05:29:08Z | **17 s before — wrong** |
| #10 | `a4c32a6` | 36969298073 | 05:32:41Z success | 05:32:57Z | 16 s before — correct |
| #11 | `34cdaf0` | 36969815721 | 05:39:21Z success | 05:39:48Z | 27 s before — correct |

The Builder's account of PR #9 in "What I got wrong this session" is **accurate**. Credit where it
is due; the fix is in `STEER-5.md`.

### Effort allocation

Lines changed across the session, `728dcf1~1..e03b2e7`: **product source 1769**, tests/fixtures/
gates 420, docs 514. Product work dominated at 65%. **PASS** — nowhere near the half-session
tooling threshold.

---

## 4. UI verification — measured, not impression

Browser bridge unavailable (§0), so Playwright against `pnpm --dir apps/web dev` in a scratch
worktree at `334a6c1`. Values are read from the DOM.

**Caret alignment.** The caret was compared against the next character to be typed, by index, so
there is no inference about which character is the target.

| Condition | `dx` | `dy` |
|---|---|---|
| @1440, line 1, 29 chars typed | 0.00 | 0.00 |
| @1440, after wrapping | 0.00 | 0.00 |
| @360, immediately after resize, no typing | 0.00 | 0.00 |
| @360, after one more keystroke | 0.00 | 0.00 |
| @1440, after resizing back | 0.00 | 0.00 |

**BUG-a is genuinely fixed**, including the resize path that caused it. Caret `2.00px` wide,
`46.19px` tall against a computed `line-height` of `46.2px` — the caret is the full line, not the
font's box, which is the stated design. **Confidence HIGH.**

**Overlays, in positive form.** I did not ask "is there a `.toast`?" I asked "is any visible,
non-zero-size element in the document a `dialog`/`[role=dialog]`/`[role=alertdialog]`/`[popover]`/
`[aria-modal]`, or a fixed-position element that is not the caret?" — **at 1440px and 360px, idle,
mid-test and on the results panel: `[]` every time.** The shipped build has nothing interrupting the
typing surface. **Confidence HIGH.** This is a stronger check than AC6 performs, and it passes.

**Character state cues.** `untyped` is `rgb(90,101,140)`, no decoration; `correct` is
`rgb(18,24,43)`, no decoration; `incorrect` is `rgb(204,33,73)` with `text-decoration-line:
underline`, `style: solid`, `thickness: 2px`, plus a `rgba(204,33,73,0.1)` background. The two
colours are distinguishable in greyscale (`90,101,140` vs `18,24,43` is a large lightness gap) *and*
the wrong state carries a non-colour cue. **PASS for the states I could produce.** I did **not**
produce `extra` or `missed` states, so I have not verified the dotted-strikethrough and dashed-
underline cues the report describes. **UNKNOWN, MED confidence** — a gap in my check, not a defect.

**Other measurements.** No horizontal overflow at 360px (`scrollWidth 360 == clientWidth 360`); no
vertical clipping (`scrollHeight 900 == innerHeight 900`); caret `transition-duration: 0s` under
`prefers-reduced-motion: reduce` and `transform 0.08s` otherwise; caret `visibility: hidden` after
the test finishes, which is the correct mechanism (assistive technology and Playwright agree it is
gone, unlike `opacity: 0`).

---

## 5. Verdicts on the Builder's claims

| # | Claim | Verdict |
|---|---|---|
| 1 | Halt file exists, correct type, names driver and commits | **ACCEPT** |
| 2 | Ledger headline `MVP 6/97 DONE-VERIFIED` | **REJECT** — see **H2** |
| 3 | No row moved to `DONE-VERIFIED`, with the four open-work reasons named | **ACCEPT.** This is the programme's own discipline applied against the Builder's interest. |
| 4 | One counted task, within STEER-4's cap of one | **ACCEPT** |
| 5 | Progress events 1–8 (design pass, both root causes, the sixth defect, the structural fix, BUG-f, three vacuous tests caught, self-checking evidence) | **ACCEPT** — independently confirmed in §1 and §4 |
| 6 | Verification-at-close table | **ACCEPT** as an accurate session-end state; **M1** is a disclosure gap, not a false table |
| 7 | Evidence labels: everything LAB PROXY, no REAL-DEVICE claimed | **ACCEPT** |
| 8 | `pnpm e2e` — "19/19 across four browser projects" | **ACCEPT the 19**, **REJECT "four browser projects"** — see **M2** |
| 9 | S8-B reviewed, accept with changes, three fixes required | **ACCEPT.** I independently confirmed finding 1: `check:devstack` and `dev-stack.test.mjs` appear nowhere in `.github/workflows/ci.yml`, so all 26 tests are manually-invoked only. |
| 10 | Three design-vs-spec conflicts, requirement kept, visual adapted, each logged and reversible | **ACCEPT.** Correct handling, and squarely inside my own authority — the rule is that the requirement wins and the visual adapts. |
| 11 | Model ID recorded | **ACCEPT** |
| 12 | "What I got wrong this session" | **ACCEPT**, and note it is unusually complete — including the PR #9 slip, which I confirmed is accurately described |

---

## 6. Findings

### HIGH

**H1 — `CUS-01` is `DONE-VERIFIED` on evidence that does not establish it. Confidence HIGH.**

`CUS-01` is "Instant start; no ads/popups/modals on the typing surface", and it cites
`e2e/typing-surface.spec.ts AC4/AC6`. AC6's popup check is a blocklist of eight selectors:

```js
const selectors = ["dialog", "[role=dialog]", "[role=alert]", "[role=alertdialog]",
                   "[popover]", ".modal", ".popup", ".toast", ".tooltip"];
```

I put `<div className="promo-banner" aria-modal="true">Congrats! Sign up to save your streak.</div>`
into `apps/web/src/App.tsx` and **AC6 passed**. An upsell banner with `aria-modal="true"` on the
typing surface is exactly what AGENTS.md rule 1 forbids, and the test the row cites cannot see it.

The requirement is unconditional ("no popups, modals, ads"). The evidence is a list of class names
someone happened to think of. `check:policies` scans 98 files for exactly this shape of problem in
`BIZ-06`; the same positive-form approach applies here.

**What I am not saying.** The product is clean — §4 verifies that in positive form, and found
nothing. `CUS-01` was not moved to `DONE-VERIFIED` this session. What is false is the *verification*,
not the feature: a `DONE-VERIFIED` row must rest on evidence that establishes its requirement, and
this does not. Given that this programme has a history of 14 rows claimed and 9 false, I am not
willing to leave a `DONE-VERIFIED` row standing on evidence I have personally shown to be
insufficient. **Decision in `STEER-5.md`: demote to `IN PROGRESS`, rebuild the assertion, do not
re-verify until a mutation with a non-blocklisted overlay name goes red.** This is a demotion, not
a deletion — the row is one good test away from being right again.

**H2 — the halt file's headline count is wrong. `Confidence HIGH`.**

`HALT-H3-3.md` line 9: `MVP 6/97 DONE-VERIFIED`. Parsing the status column directly:

```
ENG-01 [MVP]   ENG-04 [MVP]   ENG-05 [MVP]   CUS-01 [MVP]   OPS-13 [MVP]   NFR-16 [UNTAGGED]
```

**MVP-tagged `DONE-VERIFIED` is 5/97.** `NFR-16` ("Bundle budget enforced in CI") carries the tag
`UNTAGGED`, not `MVP`. The overall figure is 6/216. The correct headline is
`MVP 5/97 DONE-VERIFIED | UNTAGGED 1/20 | overall 6/216`. The same wrong number is in
`SESSION-8-REPORT.md` and in `BUILD-LOG.md`. Inherited from Session 7's phrasing, so this is a
recurrence rather than a new error, but it is the number a reader takes away.

### MEDIUM

**M1 — an implementation commit was pushed with CI red, and the halt file does not say so. `Confidence HIGH`.**

`68d8fcf` is an ancestor of the PR #8 merge commit, so it was pushed. Run `36968224668` on it
concluded **`failure`**:

```
quality  Lint  ##[error]  65:25  error  Irregular whitespace not allowed  no-irregular-whitespace
quality  Lint  ##[error]  71:83  error  Irregular whitespace not allowed  no-irregular-whitespace
quality  Lint  ##[error]  81:49  error  Irregular whitespace not allowed  no-irregular-whitespace
quality  Lint  ✖ 3 problems (3 errors, 0 warnings)
```

It was fixed in `e03b2e7`, whose run `36968859585` succeeded, so **`main` was never red** — §1's
merge table confirms all four merges were of green commits. And the "Verification at close" table
does describe the session-*end* state accurately. So this is not a false table.

It is still a protocol breach and an undisclosed one. The halt file has a "What I got wrong this
session" section that discloses a far smaller slip (PR #9) with more care than this deserves.

**M2 — "19/19 across four browser projects" is wrong on both the number and the implication. `Confidence HIGH`.**

`e2e/playwright.config.ts` defines **three** projects — `chromium`, `chromium-preview`, `parity` —
and all three carry `browserName: "chromium"`. The config's own header comment says Playwright's
Firefox and WebKit downloads have failed in this environment. So there is no cross-engine coverage,
and the same halt file's "External dependencies" section lists "Firefox/WebKit e2e" as still
outstanding. **19 tests is correct; "across four browser projects" is not, and the phrase implies
coverage the repository explicitly says it does not have.**

**M3 — the visual-evidence script leaks an orphaned server on Windows. `Confidence HIGH`.**

I ran `node e2e/capture-visual-evidence.mts` on a clean checkout. It exited 0, wrote seven shots —
and left `:4173` held by PID 19216. `stopPreview` calls `child.kill()` on a spawn made with
`shell: true`, which kills the shell and not the `pnpm` grandchild underneath it. The Builder found
this exact bug class *during this session*, wrote it up in "What I got wrong", and then wrote the
same pattern into a new file.

It also bit me, which is the more useful half. After my baseline e2e run, an orphaned `vite dev`
on `:5173` kept serving the **base** checkout. My first `CUS-01` mutation came back green — a
mutation that had already failed correctly once I forced a fresh server. I only trusted the result
after `netstat` found PID 15660 and I re-ran with `CI=true` (`reuseExistingServer` is `!CI`). Had I
not checked, I would have reported the strongest finding in this review as a vacuous-test pass,
which is the opposite of what happened.

### LOW

**L1 — stale TODO in CI config.** The last lines of `.github/workflows/ci.yml` still read:
`TODO (M0-10): bundle-size check … and Playwright e2e smoke on Chromium. Both stages activate when
the web shell is scaffolded and produces a real build artifact.` Both stages exist and have for
several sessions. A future reader looking for a missing gate will find this comment and stop
looking.

**L2 — state-name drift.** `SESSION-8-REPORT.md` and `docs/visual-evidence/README.md` call the
pending state `--text-pending` / "pending". The DOM attribute is `data-char-state="untyped"`. The
token name and the state name are not the same thing and the docs conflate them.

**L3 — `reuseExistingServer` has no checkout check.** `e2e/playwright.config.ts` reuses whatever is
on `:5173` locally with no assertion that it is serving the current working tree. CI is unaffected
(`CI=true`), so this cannot produce a wrong CI result — it can only mislead a local run, which is
what happened to me.

---

## 7. What the Builder got right, specifically

Recording these because the standing instruction is to assume overclaiming, and the evidence says
otherwise in several places.

- **Three tests were caught being vacuous and rewritten**, two of them after the Builder had already
  declared them proven. The report names them rather than shipping the green run.
- **A measurement-based fix was abandoned for a structural one**, with the search, the tolerance,
  the pass cap and the attribute all deleted. This is the correct instinct: a fix whose correctness
  depends on measuring the thing it corrects is not finished when its test goes green.
- **The visual-evidence pipeline was made self-checking** after a screenshot was found to disagree
  with the DOM it claimed to document. I re-ran it end to end on a build I did not produce and it
  passed its own invariants.
- **Nothing was moved to `DONE-VERIFIED` this session**, and the four reasons are named with the
  open work spelled out. Against the incentive, that is the right call.
- **The S8-B review was delegated and the reviewer's findings were accepted without deflection**,
  including the one that indicts the Builder's own delegation (CI wiring was not in the acceptance
  criteria).

The pattern across the session is a Builder that distrusts its own green checks. That is the
opposite of the failure mode this role exists to catch, and it is why H1 is a narrow finding about
one blocklist rather than a systemic one.

---

`[RULES BROKEN]`: none. I wrote no product code — the two measurement scripts
(`review-measure.mjs`, `probe-resize.mjs`) were reviewer instrumentation, lived only in the scratch
worktree `.proxy/mut`, and were deleted with it; the committed change is docs-only. I ran two
mutations in that scratch worktree and reverted both; I did not commit, push or merge any product
change. I did start and stop the local dev server and kill two orphaned listeners (PIDs 19216 and
15660) that my own runs had created.