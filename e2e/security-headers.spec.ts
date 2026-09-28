import { expect, test } from "@playwright/test";

/**
 * Block A5: run against the PREVIEW server (built assets served with the
 * production security headers from vercel.json). Project: chromium-preview.
 * Proves the web shell loads with zero CSP violations under the strict host
 * headers — no inline scripts, no eval, no external origins needed.
 */
test("web shell loads clean under the strict host headers (A5)", async ({ page }) => {
  const cspViolations: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && text.includes("Content Security Policy")) {
      cspViolations.push(text);
    }
  });
  page.on("pageerror", (err) => {
    cspViolations.push(String(err));
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  const csp = (await response?.headerValue("content-security-policy")) ?? "";
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");

  const referrerPolicy = (await response?.headerValue("referrer-policy")) ?? "";
  expect(referrerPolicy).toBe("strict-origin-when-cross-origin");

  const permissionsPolicy = (await response?.headerValue("permissions-policy")) ?? "";
  expect(permissionsPolicy).toContain("camera=()");

  const nosniff = (await response?.headerValue("x-content-type-options")) ?? "";
  expect(nosniff).toBe("nosniff");

  await expect(page.getByTestId("app-title")).toBeVisible();
  expect(cspViolations).toEqual([]);
});
