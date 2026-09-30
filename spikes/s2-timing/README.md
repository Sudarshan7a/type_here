# Spike S2 — Timing capture (keydown/keyup ordering, rollover, repeat flag, replay)

## Question

Can we reliably capture keydown/keyup ordering, rollover (overlap), and the OS repeat flag, and
does a captured log replay to the exact final text?

## Method

- `page.html` (file:// loadable): a tabindex capture surface that records
  `{code, key, type: down|up, t, mods, repeat, isTrusted}` for every keydown/keyup (`t` is
  `performance.now()` relative to the first captured event), exposes the log on
  `window.__keyLog`, and echoes typed characters visually (display only; repeats and
  ctrl/alt/meta combos are not echoed).
- `capture.spec.ts` (Playwright, headless Chromium 153 via Chrome-for-Testing) drives REAL
  synthetic sequences with `page.keyboard`:
  1. simple typing — every key has its down before its up, `t` ordering is monotonic;
  2. ROLLOVER — `down("f")`, then `down("j")` BEFORE `up("f")`, then the two ups — the log must
     show the overlap (`j.down.t < f.up.t`);
  3. REPEAT FLAG — a synthetic `KeyboardEvent` with `repeat: true` is dispatched via
     `page.evaluate` (Playwright's keyboard cannot produce OS repeat; synthetic dispatch is
     acceptable to prove the CAPTURE records the flag) and the log must carry `repeat: true`;
  4. REPLAY — `replay.ts` (spike-local, NOT the engine) applies the captured log's characters
     (respecting Backspace, ignoring pure modifier events, repeats, and combos) and must
     reproduce exactly the text the page displayed.
- Synthetic events prove the CAPTURE and REPLAY logic only. The real-hardware half — true OS
  key repeat, true mechanical rollover, human timing jitter, real-device `isTrusted` — is
  covered by the human's recorder fixtures (tools/fixture-recorder, already built): record B2
  sessions on real keyboards and replay these same assertions against those logs. Until those
  recordings exist, real-hardware behavior is REAL-DEVICE PENDING.

## Result

PASS — LAB PROXY (Chromium headless only; synthetic and CDP-trusted input) for capture/replay
logic; real-hardware behavior evidenced by the human's B2 recordings (REAL-DEVICE PENDING until
those exist). LAB PROXY (Chromium only) — Firefox/WebKit PENDING: browser downloads failed
(CDN 30 s timeouts); retry next session.

## Evidence

- `pnpm --dir spikes/s2-timing test` → 4 passed, exit code 0 (Playwright 1.63.0, Chromium
  153.0.8010.12 / playwright chromium v1243, headless).
- Rollover overlap (`f.up.t − j.down.t`) measured **62.80 ms** (40 ms hold + dispatch overhead);
  dispatch order in the log: `KeyF:down, KeyJ:down, KeyF:up, KeyJ:up` — overlap ordering captured.
- Simple typing ("cat"): 6 events (3 down + 3 up), every key down before its up, global `t`
  non-decreasing, all events `isTrusted: true`.
- Repeat flag: synthetic keydown dispatched with `repeat: true` is recorded as `repeat: true`,
  `isTrusted: false`, and echoes no character.
- Replay: `replay(log) === displayed text === "Hello"` (sequence: Shift+H, "elo", Backspace,
  "lo" — covers shifted characters, pure-modifier events, and Backspace).
- `pnpm --dir spikes/s2-timing typecheck` (tsc 6.0.3, strict) → exit code 0.

## Risks

- Chromium-only: engine-specific event timing/repeat behavior in Firefox/WebKit is unverified
  (browser downloads failed).
- Headless CDP input is trusted but not real hardware: OS auto-repeat intervals, HID rollover
  limits (n-key vs 2-key), and browser-vs-HID timestamp offsets can only be validated with
  tools/fixture-recorder recordings on physical keyboards.
- `performance.now()` resolution (~100 µs in Chromium): equal timestamps for sub-resolution
  down/up pairs are possible under load, so the simple-typing assertion tolerates
  `down.t <= up.t` and relies on dispatch order for strict sequencing.
- The 40 ms hold in the rollover test inflates the measured overlap vs natural human rollover
  (typically ~10–50 ms); the assertion checks ordering, not magnitude.

## Recommendation

Proceed. The KeyEvent capture shape (`{code, key, type, t, mods, repeat, isTrusted}`) and
log-replay reconstruction are sound for the engine; implement the engine capture against this
contract. Validate real-hardware behavior with tools/fixture-recorder recordings (B2) before
treating rollover/repeat metrics as real-device PASS. Re-run this spike on Firefox/WebKit when
browser downloads succeed.
