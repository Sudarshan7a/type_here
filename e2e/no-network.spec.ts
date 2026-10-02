import { expect, test } from "@playwright/test";

/**
 * ENG-02 [MVP]: "no network calls during a test"
 * (docs/spec/master-spec-v1.md §5 ENG-02; the AC is "no network needed to
 * complete a test").
 *
 * The listeners attach AFTER page load on purpose: the page's own boot
 * traffic (document, JS, CSS, fonts) is not the claim. The claim is about the
 * test window — first keystroke through finish plus a settle beat, during
 * which a deferred beacon, retry loop, or results POST would fire.
 *
 * LAB PROXY like the rest of this suite: synthetic keystrokes, headless
 * Chromium. It proves the app issues no traffic, not that a real device
 * couldn't (that half belongs to NFR-01's REAL-DEVICE confirmation).
 */

/** The first passage, from apps/web/src/passages.ts (PROSE-01-004). */
const PASSAGE =
  "Dinner's ready whenever you are. I made extra rice in case your brother stops by later tonight.";

test("ENG-02: completing a test makes no network calls", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surface").click();

  const requests: string[] = [];
  page.on("request", (request) => requests.push(`${request.method()} ${request.url()}`));
  const sockets: string[] = [];
  page.on("websocket", (socket) => sockets.push(socket.url()));

  await page.keyboard.type(PASSAGE, { delay: 2 });
  await expect(page.getByTestId("finished")).toBeVisible({ timeout: 15_000 });

  // Settle beat: a beacon or retry loop deferred past finish would land here.
  await page.waitForTimeout(1_000);

  expect(requests, `no HTTP traffic may leave during a test, saw: ${requests.join("; ")}`).toEqual(
    [],
  );
  expect(sockets, `no websocket may open during a test, saw: ${sockets.join("; ")}`).toEqual([]);
});
