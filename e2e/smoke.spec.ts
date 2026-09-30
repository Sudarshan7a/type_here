import { expect, test } from "@playwright/test";

// M0-10 smoke: the web shell builds, serves, and renders the app title.
// Deterministic per the typing-e2e-testing skill: no timing-dependent
// assertions, data-testid on the key element.
test("web shell renders the RealType title (M0-10 smoke)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-title")).toBeVisible();
  await expect(page.getByTestId("app-title")).toHaveText("RealType — manual engine test");
});
