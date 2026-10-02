import { expect, test } from "@playwright/test";

/**
 * ENG-07 [MVP]: verified sessions ignore untrusted input and block
 * paste/drop/autofill at the DOM. The server-side half is the plausibility
 * backstop (`packages/engine/src/plausibility.ts`, PR #25); this spec is the
 * client half: hostile input must not reach the capture, let alone score.
 *
 * Synthetic by construction: Playwright cannot perform an OS-level paste or
 * file-drop, so these dispatch real DOM ClipboardEvent/DragEvent objects
 * through the browser's own dispatch path (React's root listener sees them
 * exactly as it would a user gesture). What this proves is the wiring —
 * the handler exists, it prevents the default, and the engine state does
 * not move — not the OS clipboard or drag pipeline.
 */

/** Fire a cancellable event of the given class on the surface; report whether any listener prevented it. */
async function dispatchCancellable(
  page: import("@playwright/test").Page,
  ctor: "ClipboardEvent" | "DragEvent",
  type: string,
): Promise<boolean> {
  return page.evaluate(
    ({ ctor, type }) => {
      const el = document.querySelector('[data-testid="surface"]');
      if (!el) return false;
      const event =
        ctor === "ClipboardEvent"
          ? new ClipboardEvent(type, { bubbles: true, cancelable: true })
          : new DragEvent(type, { bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { ctor, type },
  );
}

async function charStates(page: import("@playwright/test").Page): Promise<(string | null)[]> {
  return page
    .locator("[data-char-state]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-char-state")));
}

test("ENG-07: paste into the surface is prevented and scores nothing", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await page.keyboard.type("Dinner", { delay: 4 });

  const prevented = await dispatchCancellable(page, "ClipboardEvent", "paste");
  expect(prevented, "the paste handler must preventDefault the event").toBe(true);

  // Nothing pasted text may enter the attempt: the typed prefix is untouched
  // and every unreached character is still untyped.
  const states = await charStates(page);
  expect(states.slice(0, 6).every((s) => s === "correct")).toBe(true);
  expect(new Set(states.slice(6))).toEqual(new Set(["untyped"]));
});

test("ENG-07: drop onto the surface is prevented and scores nothing", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();
  await page.keyboard.type("Dinner", { delay: 4 });

  const prevented = await dispatchCancellable(page, "DragEvent", "drop");
  expect(prevented, "the drop handler must preventDefault the event").toBe(true);

  const states = await charStates(page);
  expect(states.slice(0, 6).every((s) => s === "correct")).toBe(true);
  expect(new Set(states.slice(6))).toEqual(new Set(["untyped"]));
});

test("ENG-07: the key sink offers autofill nothing to hook into", async ({ page }) => {
  await page.goto("/");
  const sink = page.getByTestId("surface");
  // A div key-sink is not an input, textarea, or editable field, so browser
  // autofill/autocorrect machinery has no hook. If this ever becomes an
  // <input>, an autofill-mitigation row must be added beside it.
  const tag = await sink.evaluate((el) => el.tagName.toLowerCase());
  expect(tag).toBe("div");
  await expect(sink).toHaveAttribute("spellcheck", "false");
  const editable = await sink.evaluate((el) => (el as HTMLElement).isContentEditable);
  expect(editable).toBe(false);
});
