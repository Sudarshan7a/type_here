# Spike S6 — Hidden-tab behavior

## Question

When the page becomes hidden or loses focus mid-test, does the scored duration
correctly exclude the paused span in practice mode, and does the attempt become
invalid in verified mode?

## Method

- `model.ts` — a small, dependency-free model of the §4.10 state-machine rows
  from `docs/chapter-4-deep-dive-typing-engine-part2.md` (running + blur/hidden
  → paused in practice, invalid in verified; paused + refocus → running with the
  span excluded; paused > 10 min → idle auto-abandon). The clock is injected,
  so Node drives it with a fake clock and the page passes `performance.now()`.
  The same file is loaded by `page.html` as a classic script and by
  `model.spec.ts` as a side-effect import.
- `model.spec.ts` — five deterministic state-machine checks with a fake clock,
  including the §4.10 worked example (type 3000 ms, alt-tab 10 000 ms, type
  2000 ms → scored 5000 ms, wall 15 000 ms).
- `page.spec.ts` — the same behavior through the actual page wiring, using real
  short waits while `document.visibilityState`/`document.hidden` are
  overridden and `visibilitychange` / `blur` / `focus` events are dispatched.
- `manual.html` — for the human: start, type, switch tabs ~10 s, return, stop;
  it shows wall-clock vs scored duration and offers a JSON download. No
  network (CSP `connect-src 'none'`), no storage.

## Result

**PASS — LAB PROXY (Chromium only), model semantics verified deterministically.**

- Model checks: 5/5 pass, including scored = 5000 ms / wall = 15 000 ms for the
  §4.10 example, idempotent pause/resume, verified-mode invalidation with
  elapsed preserved, and 10-minute auto-abandon.
- Page checks: 3/3 pass. Measured: practice-mode hidden span excluded
  (wall 1490.9 ms / scored 779.1 ms / excluded 711.8 ms); blur/focus pause
  excluded (wall 974.6 ms / scored 566.5 ms); verified mode → state `invalid`,
  `valid: false`, elapsed preserved.

**REAL-DEVICE PENDING.** Synthetic events prove the state machine and the page
wiring; they cannot prove real browser background throttling (rAF/timer
throttling in a backgrounded tab). Firefox/WebKit: **PENDING** (browser
download failures in this environment — see `playwright.config.ts`).

## Evidence

Console output from `pnpm --dir spikes/s6-hidden-tab test`:

```
[S6][practice] wall=1490.9ms scored=779.1ms excludedPause=711.8ms keystrokes=4 state=finished
[S6][blur]    wall=974.6ms  scored=566.5ms excludedPause=408.1ms state=finished
[S6][verified] state=invalid valid=false scored=296.5ms wall=305.5ms
8 passed
```

## Risks

- Verified-mode invalidation on tab switch is a **product decision with a
  cost**: legitimate users who alt-tab will lose verified status. The
  string-table copy for this case exists (`error.session.invalidVerified`); the
  threshold itself is a product call, not an engineering one.
- Throttling behavior differs across browsers and OSes; only the human's
  manual run on a real laptop settles it.
- The 10-minute auto-abandon is read from §4.10 as written; if the real spec
  says something different, this model changes with it.

## Recommendation

Adopt the §4.10 state-machine rows as the model of record, keep the
deterministic model checks as unit tests in the engine package when the state
machine is implemented (M1-06), and have the human run `manual.html` to
confirm real throttling. Do not ship any verified-mode invalidation threshold
without the human's confirmation of the user-facing cost.
