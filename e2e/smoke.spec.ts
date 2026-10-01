import { expect, test } from "@playwright/test";

// M0-10 smoke: the web shell builds, serves, and renders the app title.
// Deterministic per the typing-e2e-testing skill: no timing-dependent
// assertions, data-testid on the key element.
//
// The title is now the product name rather than "RealType — manual engine test":
// the developer-only surface it named has been replaced by the real typing
// surface (STEER-2), which is the product rather than a harness.
test("web shell renders the RealType title (M0-10 smoke)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-title")).toBeVisible();
  await expect(page.getByTestId("app-title")).toHaveText("RealType");
});
