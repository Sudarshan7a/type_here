/**
 * Capture the typing surface and the finished panel, for docs/visual-evidence/.
 *
 * LAB PROXY. These are headless-Chromium renders of the production build with
 * synthetic keystrokes. They are evidence that the build LAYOUTS as specified and
 * that the tokens resolve — they are not REAL-DEVICE CONFIRMED, they say nothing
 * about a real keyboard, and "looks like the concept" is not verification of the
 * design direction. That remains the owner's call (STEER-2 §4).
 *
 * Run from the repo root with the preview server up:
 *   pnpm --dir apps/web build
 *   pnpm --dir e2e exec playwright ... (this script starts its own server)
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "docs", "visual-evidence");
const BASE = "http://localhost:4173";

/** Start the production preview and wait for it to answer. */
async function startPreview(): Promise<() => Promise<void>> {
  const child = spawn("pnpm", ["--dir", resolve(HERE, "..", "apps", "web"), "preview"], {
    shell: true,
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(BASE);
      if (response.ok) {
        return async () => {
          child.kill();
        };
      }
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`the preview server never came up on ${BASE}`);
}

/** PROSE-01-004, the passage the e2e specs type. */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

interface Shot {
  name: string;
  scheme: "dark" | "light";
  /** What to type before the shot. "all" finishes the test. */
  typed: string;
  /** ms between keystrokes. Real cadence, so the figures in the shot are real. */
  delay: number;
  width: number;
  height: number;
  concept: string;
  what: string;
}

/**
 * The passage as the browser has actually laid it out, read back from the DOM
 * immediately before the shutter opens.
 *
 * This exists because a PNG alone is not evidence. The first pass of this script
 * used `fullPage: true` for the narrow shot, and Chromium implements that by
 * resizing the viewport to the full content height — which re-lays the page out
 * from scratch. The 360px capture came back showing seven wrapped lines where the
 * live page had six, with a different character advance, and nothing in the image
 * said so. Shipping a screenshot that quietly disagrees with the layout it claims
 * to document is the same as fabricating it, just less obviously.
 *
 * So: no `fullPage` anywhere (see `capture`), and every shot records what it
 * measured, so a reader can check the picture against the numbers.
 */
async function measuredLayout(page: import("@playwright/test").Page) {
  return page.getByTestId("surface").evaluate((surface) => {
    const el = surface as HTMLElement;
    const style = getComputedStyle(el);
    const contentLeft =
      el.getBoundingClientRect().left + el.clientLeft + parseFloat(style.paddingLeft);
    const boxes = [...el.querySelectorAll("[data-char-state]")].map((char) => ({
      char: char.textContent ?? "",
      left: char.getBoundingClientRect().left,
      outsideWordBox: char.parentElement?.className !== "word",
    }));
    const lines: string[] = [];
    for (const box of boxes) {
      const current = lines.at(-1);
      const startsLine = Math.abs(box.left - contentLeft) < 1.5;
      if (current === undefined || startsLine) {
        const prefix = box.char.trim() === "" ? "␠" : box.char;
        lines.push(prefix);
      } else {
        lines[lines.length - 1] += box.char.trim() === "" ? "␠" : box.char;
      }
    }

    /*
     * DID THE FONT ACTUALLY LOAD, or did we capture a picture of a fallback?
     *
     * STEER-6 asks the evidence to record the computed font family so it proves
     * the fonts loaded. The computed `fontFamily` alone does NOT prove that: it
     * reports the declared stack verbatim, and it reports exactly the same
     * string when the .woff2 404s and the browser silently substitutes whatever
     * the machine has. A screenshot that recorded only the family string would
     * have been captioned "JetBrains Mono" while showing Consolas — which is
     * what every capture in this directory actually did until the faces were
     * self-hosted in Session 9.
     *
     * So the evidence records the `FontFace` objects themselves. A face appears
     * in `document.fonts` only because an @font-face rule declared it, and its
     * `status` is the browser's own answer to whether the bytes arrived. That
     * is the difference between "the page asked for this font" and "this font
     * is on screen", and only the second is worth putting in a README.
     */
    const faces = [...document.fonts].map((f) => ({
      family: f.family.replaceAll('"', ""),
      weight: f.weight,
      status: f.status,
    }));

    return {
      lines,
      leadingSpaces: lines.filter((l) => l.startsWith("␠")).length,
      charsOutsideAWordBox: boxes.filter((b) => b.outsideWordBox).length,
      advancePx:
        Number.parseFloat(style.fontSize) > 0
          ? Number((boxes[1]!.left - boxes[0]!.left).toFixed(2))
          : 0,
      /** The stack the stylesheet asked for — what the tokens resolved to. */
      declaredFontFamily: style.fontFamily,
      /** What the browser actually has, from the FontFace objects. */
      faces,
      loadedFamilies: [...new Set(faces.filter((f) => f.status === "loaded").map((f) => f.family))],
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      clipped: document.documentElement.scrollHeight > window.innerHeight,
    };
  });
}

/**
 * Wait for the faces the shot will be taken with.
 *
 * `document.fonts.ready` alone is not enough: it resolves once the fonts that
 * are ALREADY in flight settle, and a face that has only just been discovered
 * by a stylesheet may not have started. An explicit `load()` for the two faces
 * this app declares is what forces the fetch. Without this, the first shot of a
 * run is a picture of the fallback and the rest are not — evidence that varies
 * by warm-up state, which is the kind of evidence that cannot be trusted.
 */
async function fontsSettled(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('400 28px "JetBrains Mono"'),
      document.fonts.load('400 16px "Geist Sans"'),
    ]);
    await document.fonts.ready;
  });
}

const SHOTS: Shot[] = [
  {
    name: "typing-surface-dark-idle",
    scheme: "dark",
    typed: "",
    delay: 200,
    width: 1440,
    height: 900,
    concept: "10 §3 typing stage · 09 §1 Night Ink roles · 09 §3 type scale",
    what:
      "The unfocused field. The prompt sits BELOW the text, not over it — 10 §3 asks for a " +
      "blurred scrim, which STEER-2 bug (b) overrides. 68ch field, 28px mono at 1.65 leading, " +
      "2px --pace caret at the first character.",
  },
  {
    name: "typing-surface-light-idle",
    scheme: "light",
    typed: "",
    delay: 200,
    width: 1440,
    height: 900,
    concept: "09 §1 Daylight roles · 10 §3 typing stage",
    what:
      "The same field in the Daylight theme. The theme is driven entirely by the custom " +
      "properties in tokens.css; no component rule names a colour.",
  },
  {
    name: "typing-surface-dark-mid-test",
    scheme: "dark",
    typed: PASSAGE.slice(0, 34),
    delay: 200,
    width: 1440,
    height: 900,
    concept: "09 §1 character states · 10 §5 live readout",
    what:
      "Partway through. Correct characters are plain --text, pending are dimmer --text-pending, " +
      "and the live readout below carries the figures. The caret sits ON the target character.",
  },
  {
    name: "typing-surface-dark-errors",
    scheme: "dark",
    // "Xinner's reazdy" instead of "Dinner's ready": the first character wrong,
    // a transposition-style pair mid-word, and a wrong letter before the caret.
    // Free error mode paints every one of them `incorrect`, which is exactly the
    // state 09 §1 specifies a 2px underline for.
    typed: "Xinner's reazdy whenever you are.",
    delay: 200,
    width: 1440,
    height: 900,
    concept: "09 §1 error states · 13 §1 non-colour cues",
    what:
      "Same field with wrong characters typed into it. Each error state carries a distinct " +
      "NON-COLOUR cue — a 2px underline for wrong, a dotted strikethrough for extra, a dashed " +
      "underline for missed — so the states are separable in greyscale and in forced-colours " +
      "mode. Colour is reinforcement, never the signal.",
  },
  {
    name: "results-dark",
    scheme: "dark",
    typed: "all",
    delay: 200,
    width: 1440,
    height: 900,
    concept: "10 §6 results panel · 09 §3 --t-kpi · 08 §9 centred KPIs",
    what:
      "The finished panel. Net WPM at --t-kpi in the display font, accuracy beside it, actions " +
      "below. The live readout is GONE, so nothing on this screen contradicts the headline, and " +
      "the caret is hidden.",
  },
  {
    name: "results-light",
    scheme: "light",
    typed: "all",
    delay: 200,
    width: 1440,
    height: 900,
    concept: "09 §1 Daylight roles · 10 §6 results panel",
    what: "The results panel in the Daylight theme.",
  },
  {
    name: "typing-surface-narrow-360",
    scheme: "dark",
    typed: PASSAGE.slice(0, 18),
    delay: 200,
    width: 360,
    // 960, not 900. This was raised in Session 9 and the reason is the fonts,
    // not a layout regression. JetBrains Mono has an advance width of exactly
    // 0.6em; the system fallback this shot used to render in had a different
    // one, so the passage re-wrapped and the page grew from under 900px to
    // 903px. The clip guard caught it and refused to write the file, which is
    // the guard working. A real phone at 360×780 scrolls vertically, and that
    // is not a defect — the guard exists so the PNG is not cropped, not to
    // insist the page fits.
    height: 960,
    concept: "13 §1 360px breakpoint · 16 §layout",
    what:
      "The narrowest breakpoint the design pack names. The field is capped at 68ch and shrinks " +
      "with the viewport; the page does not scroll horizontally. 960px tall rather than a " +
      "phone's 780, so the whole page fits the viewport and the capture never has to resize it.",
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const stopPreview = await startPreview();
  const browser = await chromium.launch();
  const written: Array<{
    row: string;
    name: string;
    lines: string[];
    leadingSpaces: number;
    charsOutsideAWordBox: number;
    advancePx: number;
    declaredFontFamily: string;
    loadedFamilies: string[];
  }> = [];

  for (const shot of SHOTS) {
    const page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      colorScheme: shot.scheme,
      deviceScaleFactor: 2,
    });
    await page.goto(BASE);
    // Before the first keystroke and before the shutter: a shot of a fallback
    // face is not evidence of the type, it is evidence of the absence of the
    // network.
    await fontsSettled(page);
    await page.getByTestId("surface").click();
    if (shot.typed !== "") {
      if (shot.typed === "all") {
        await page.keyboard.type(PASSAGE, { delay: shot.delay });
        await page.getByTestId("finished").waitFor({ timeout: 15_000 });
      } else {
        await page.keyboard.type(shot.typed, { delay: shot.delay });
        // The 80ms caret move has to finish before the frame is captured, or the
        // shot shows a caret in flight rather than at rest.
        await page.waitForTimeout(200);
      }
    }
    await page.waitForTimeout(150);

    // Read the layout BEFORE the shutter, so the numbers in the README describe
    // the picture that follows rather than a later reflow.
    const layout = await measuredLayout(page);
    if (!layout.loadedFamilies.includes("JetBrains Mono")) {
      throw new Error(
        `${shot.name}: the typing face did not load, so this capture shows a ` +
          `fallback and must not be filed.\n` +
          `  declared stack: ${layout.declaredFontFamily}\n` +
          `  faces seen:     ${
            layout.faces.length === 0
              ? "(none — no @font-face rule resolved at all)"
              : layout.faces.map((f) => `${f.family} ${f.weight}: ${f.status}`).join(", ")
          }`,
      );
    }
    if (layout.clipped) {
      throw new Error(
        `${shot.name}: the content is ${layout.scrollHeight}px tall in a ` +
          `${layout.viewportHeight}px viewport. Raise the shot's height — a capture ` +
          `that clips the page, or resizes the viewport to avoid clipping, is not ` +
          `evidence of the layout the user sees.`,
      );
    }

    const file = resolve(OUT, `${shot.name}.png`);
    // NEVER `fullPage`. Chromium satisfies it by resizing the viewport to the full
    // content height, which re-lays the page out: the same 360px page measured
    // six wrapped lines before the shutter and seven after it. Every viewport
    // above is sized so the content fits, which is what makes a plain capture
    // both faithful and complete.
    await page.screenshot({ path: file });

    // Re-read afterwards and require it to be identical. If the capture perturbs
    // the layout, the shot is dropped rather than filed.
    const after = await measuredLayout(page);
    if (JSON.stringify(after.lines) !== JSON.stringify(layout.lines)) {
      throw new Error(
        `${shot.name}: taking the screenshot re-laid the page out.\n` +
          `  before: ${layout.lines.join(" / ")}\n` +
          `  after:  ${after.lines.join(" / ")}`,
      );
    }

    written.push({
      row: `| ${shot.name} | ${shot.concept} | ${shot.what} |`,
      name: shot.name,
      lines: layout.lines,
      leadingSpaces: layout.leadingSpaces,
      charsOutsideAWordBox: layout.charsOutsideAWordBox,
      advancePx: layout.advancePx,
      declaredFontFamily: layout.declaredFontFamily,
      loadedFamilies: layout.loadedFamilies,
    });
    console.log(
      `captured ${shot.name} — ${layout.lines.length} lines, ${layout.advancePx}px advance, ` +
        `fonts [${layout.loadedFamilies.join(", ")}]`,
    );
    await page.close();
  }

  await browser.close();
  await stopPreview();

  await writeFile(
    resolve(OUT, "README.md"),
    `# Visual evidence — typing surface and finished panel (Session 8, STEER-2)

${new Date().toISOString().slice(0, 10)} · generated by \`e2e/capture-visual-evidence.mts\`

**LAB PROXY.** Headless Chromium, production build, synthetic keystrokes. These show that
the build lays out as the design pack describes and that the design tokens resolve in
both themes. They are not REAL-DEVICE CONFIRMED and they say nothing about a physical
keyboard, a keyboard layout, an IME or a screen reader.

**These are not verification of the design direction.** STEER-2 §4 is explicit that
"looks like the concept" is not verification, and that owner approval remains EXTERNAL
EVIDENCE. Each shot below is paired with the section of \`docs/design/\` it implements so
the comparison can be made by a person, not asserted by a script.

The design pack is written prose, not rendered comps, so "side by side" here means the
screenshot beside the written concept it is meant to satisfy.

| Screenshot | Concept it implements | What to look at |
| --- | --- | --- |
${written.map((w) => w.row).join("\n")}

## What each shot measured

A picture cannot be checked against anything. Each shot records the layout read
back from the DOM immediately before the shutter, so the numbers and the image can
be compared. "␠" is a space. Every shot must satisfy all four invariants or the
capture throws and no file is written:

- **no line begins with ␠** — STEER-2 bug (d)
- **every character lives inside a \`word\` box** — the structure that makes both
  bug (d) and the mid-word breaks of bug (f) impossible rather than merely rare
- **the layout is identical immediately after the capture** — so the picture is of
  the layout, not of a reflow the capture caused
- **JetBrains Mono is a loaded \`FontFace\`, not just a declared family name** — see
  the note below; every capture before Session 9 failed this and had to be
  regenerated

${written
  .map(
    (w) =>
      `**${w.name}** — ${w.lines.length} lines, ${w.advancePx}px character advance, ` +
      `${w.leadingSpaces} line(s) starting with a space, ` +
      `${w.charsOutsideAWordBox} character(s) outside a word box, ` +
      `font \`${w.declaredFontFamily}\` — loaded: ${w.loadedFamilies.length === 0 ? "**none**" : w.loadedFamilies.map((f) => `\`${f}\``).join(", ")}\n\n` +
      w.lines.map((l, i) => `  ${i + 1}. \`${l}\``).join("\n"),
  )
  .join("\n\n")}

## How the fonts are proven to have loaded

STEER-6 asks this file to record the computed font family so the evidence proves the
fonts loaded. Recording the *computed family* does not do that, and the difference is
worth being explicit about, because the wrong version is easy to write and looks
correct:

\`getComputedStyle(el).fontFamily\` returns the declared **stack**, verbatim, whether
or not the webfont arrived. It said \`"JetBrains Mono", "Geist Mono", ui-monospace,\`
in every capture this directory held before Session 9, while the pixels were
Consolas — the browser had quietly fallen back, and the string the file recorded was
indistinguishable from the string it would have recorded on success.

So each shot records the \`FontFace\` objects instead. A face is present in
\`document.fonts\` only because an \`@font-face\` rule declared it, and its \`status\` is
the browser's own report on whether the bytes arrived. \`loadedFamilies\` above is the
set of faces with \`status === "loaded"\`, and the capture **throws** if JetBrains Mono
is not in it — no file is written and the shot is not filed. A picture of a fallback
face is not weak evidence, it is evidence of the opposite claim.

The captures also force the faces to settle (\`document.fonts.load()\`) before the
shutter rather than hoping the network beat the screenshot. Otherwise the first shot
of a run shows a fallback and the rest do not, which is evidence that varies with
warm-up state.

## How these were captured, and what went wrong first

The first pass used Playwright's \`fullPage: true\` for the narrow shot. Chromium
satisfies that by resizing the viewport to the full content height, which re-lays
the page out from scratch: the same 360px page measured six wrapped lines before
the shutter and seven after it, and the PNG recorded the seven. Nothing in the image
said so, and read alone the PNG looked like the layout. A screenshot that quietly
disagrees with the layout it claims to document is fabricated evidence, so the
script now sizes every viewport so the content fits, never passes \`fullPage\`, and
throws if the layout moves between the two reads.

That investigation also turned up a real defect the width sweep had missed at the
one width it happened to be tested at: the space after a word was its own atomic
inline box, and CSS Text permits a line break before it, so a wrapped line could
open with a space. It was being corrected by measuring which spaces had been pushed
to a line start and collapsing them — a fixed-point search that settled on the wrong
side whenever the wrap sat within a couple of pixels of fitting, which was every
width from 367px to 442px. The fix is structural: a word box now owns the space that
follows it, so there is no break opportunity in front of a space at all.

## What these shots do not cover

- No hover, focus, pressed or error-banner states beyond those listed.
- No theme switcher UI — the theme is set by \`data-theme\` or the OS preference, and the
  switcher itself is Phase 3.
- **The display face is still not self-hosted.** JetBrains Mono (typing) and Geist Sans
  (UI) ship as woff2 under \`apps/web/public/fonts/\` with their OFL licences committed
  beside them; the \`loadedFamilies\` line above is the proof they resolved. Bricolage
  Grotesque — 09 §3's \`--font-display\`, used on the app title and the results KPI — is
  **not** shipped, so those two elements render in the system fallback in every capture
  here. Its licence would permit shipping it and it is 22,364 B; the owner approved
  "the two fonts", so the third was left for them to decide. Recorded as FONT-03 in
  \`docs/content-license-register.md\` §3a and in HUMAN-ACTIONS.md.
- Only weight 400 ships for each face, so the results KPI's \`font-weight: 600\` is
  browser-synthesised rather than drawn from a shipped cut.
- Latin subsets only for the UI face; Geist Sans publishes no Latin-ext subset upstream
  (09 §3 asks for Latin + Latin-ext, which JetBrains Mono does provide).
`,
    "utf8",
  );
  console.log(`wrote ${written.length} screenshots`);
}

await main();
