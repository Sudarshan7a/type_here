import type { KeyEvent } from "./stats.js";

export const TARGET = "the cat sat";

// Reconstructed keystroke logs from Chapter 4 §4.2 (Worked Example A) and §4.3
// (Worked Example B). Reconstruction choices (all documented in README.md):
// - The chapter tables list keydown events only, so every entry has type "down"
//   and the logs contain no keyup events.
// - `code` uses standard KeyboardEvent.code values for a US layout
//   (KeyT, KeyH, KeyE, Space, KeyX, KeyC, KeyA, KeyS, Backspace).
// - The chapter says nothing about modifiers, so mods are all false; no key
//   repeats, so repeat is false; the chapter models a human typist, so
//   isTrusted is true.
// - `t` values are exactly the chapter's millisecond values (first keystroke 0).

function k(code: string, key: string, t: number): KeyEvent {
  return {
    code,
    key,
    type: "down",
    t,
    mods: { shift: false, ctrl: false, alt: false, meta: false },
    repeat: false,
    isTrusted: true,
  };
}

export const LOG_A: KeyEvent[] = [
  k("KeyT", "t", 0),
  k("KeyH", "h", 545),
  k("KeyE", "e", 1090),
  k("Space", " ", 1636),
  k("KeyC", "c", 2181),
  k("KeyA", "a", 2727),
  k("KeyT", "t", 3272),
  k("Space", " ", 3818),
  k("KeyS", "s", 4363),
  k("KeyA", "a", 4909),
  k("KeyT", "t", 5454),
];

export const LOG_B: KeyEvent[] = [
  k("KeyT", "t", 0),
  k("KeyH", "h", 545),
  k("KeyE", "e", 1090),
  k("Space", " ", 1636),
  k("KeyX", "x", 2181),
  k("Backspace", "Backspace", 2400),
  k("KeyC", "c", 2581),
  k("KeyA", "a", 3127),
  k("KeyT", "t", 3672),
  k("Space", " ", 4218),
  k("KeyS", "s", 4763),
  k("KeyA", "a", 5309),
  k("KeyT", "t", 5854),
];
