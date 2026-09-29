/**
 * Scripted capture scenarios (Block B2). The human types exactly the prompt
 * text, following the one-line instruction. Never type personal content.
 */

export interface Scenario {
  id: string;
  title: string;
  instruction: string;
  /** The text to type, exactly. */
  prompt: string;
  /** Scenario only applies if the layout has these features. */
  requires?: "dead-keys";
}

export const SCENARIOS: Scenario[] = [
  {
    id: "R01",
    title: "Careful, even typing",
    instruction: "Type slowly and evenly, at a comfortable careful pace.",
    prompt: "the cat sat on the mat",
  },
  {
    id: "R02",
    title: "One typo, corrected",
    instruction:
      "Type the same text, make exactly one deliberate typo, then fix it with Backspace and continue.",
    prompt: "the cat sat on the mat",
  },
  {
    id: "R03",
    title: "Key overlap (rollover)",
    instruction: 'Type "fj" repeatedly with deliberate overlap: press j before releasing f.',
    prompt: "fj fj fj fj fj",
  },
  {
    id: "R04",
    title: "Fast alternate-hand passage",
    instruction: "Type as fast as you can, letting the words alternate between your hands.",
    prompt: "a lass taps a star and a salamander salutes",
  },
  {
    id: "R05",
    title: "Mid-test pause",
    instruction:
      "Type the first half, then rest with your hands off the keyboard for at least 8 seconds, then finish.",
    prompt: "one two three four five six seven eight nine ten",
  },
  {
    id: "R06",
    title: "Key hold (OS key repeat)",
    instruction: "Press and HOLD the letter a for about one second, then release.",
    prompt: "hold aaaaaaaaa",
  },
  {
    id: "R07",
    title: "Caps Lock on",
    instruction: "Turn Caps Lock ON first, then type this lowercase sentence without fixing it.",
    prompt: "this sentence should look wrong",
  },
  {
    id: "R08",
    title: "Symbol line",
    instruction: "Type the symbol line exactly, using Shift where needed.",
    prompt: "( ) [ ] { } = + - _ ! @ # $ % ^ & *",
  },
  {
    id: "R09",
    title: "Fast and sloppy",
    instruction: "Type fast and sloppy with several mistakes; correct as many as you like.",
    prompt: "the quick brown fox jumps over the lazy dog",
  },
  {
    id: "R10",
    title: "Tab switch mid-test",
    instruction:
      "Start typing, switch to another tab or window for about 10 seconds mid-sentence, come back, and finish.",
    prompt: "keep typing this line until you leave and come back",
  },
  {
    id: "R11",
    title: "Accented character (dead keys)",
    instruction: "ONLY if your keyboard layout has dead keys: type the word with its accent.",
    prompt: "café",
    requires: "dead-keys",
  },
];
