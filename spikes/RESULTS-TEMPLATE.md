# Spike results — real-device runs (for the human)

Headless/synthetic runs are **LAB PROXY** only. The rows below are the
real-device confirmations that Phase 0 needs. Copy the relevant section, fill it
in, and commit it next to the spike (e.g. `spikes/s1-latency/results/manual-<date>-<machine>.json`
plus the filled README Result line).

---

## S1 — Input latency (real keyboard, foreground browser)

- Date: ____________
- Machine / OS: ____________
- Browser + version: ____________
- Keyboard: ____________
- Page: `spikes/s1-latency/manual.html`, type the prompt at your normal pace
  (aim 300+ characters)
- Instructions: type the text shown **once**, at a comfortable everyday pace.
  Do not rush; do not hold keys. Click Stop when done.

| Metric | Measured | Budget | Verdict |
|---|---|---|---|
| keystrokes measured | | ≥ 300 | |
| p50 keydown→paint (ms) | | — | — |
| **p95 keydown→paint (ms)** | | **≤ 16** | PASS / FAIL |
| max (ms) | | — | — |
| long tasks > 50 ms | | 0 | |

- Downloaded JSON saved to: `spikes/s1-latency/results/manual-__________.json`
- Notes (background apps open? battery saver? plugged in?): ____________

---

## S6 — Hidden-tab behavior (real browser tab switch)

- Date: ____________
- Machine / OS / Browser: ____________
- Page: `spikes/s6-hidden-tab/manual.html`

| Step | Expected | Observed | Verdict |
|---|---|---|---|
| Start, type ~10 s, switch to another tab for ~10 s, return, type ~10 s, Stop | scored ≈ wall − hidden span | | PASS / FAIL |
| wall-clock duration (ms) | | | — |
| scored duration (ms) | | | — |
| excluded pause (ms) | ≈ 10 000 ± slack | | |

- Does the browser visibly throttle the backgrounded page? (rAF/timers) ____________
- Downloaded JSON saved to: `spikes/s6-hidden-tab/results/manual-__________.json`
- Notes: ____________

---

## Summary for BUILD-LOG.md

- S1 real-device p95: ________ ms (budget 16 ms) → PASS / FAIL
- S6 real-device pause exclusion: verified / not verified
- Anything that changes a Phase 0 assumption (write "PHASE 0 RISK" in
  BUILD-LOG.md with the numbers): ____________
