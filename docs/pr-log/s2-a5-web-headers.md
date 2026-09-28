# pr-log: A5 — web security headers for the static host

- **Task ID:** Session 2, Block A5
- **Branch:** task/s2-a5-web-headers
- **Files touched:** vercel.json (host headers: strict CSP + Referrer-Policy + Permissions-Policy + nosniff + XFO + HSTS), apps/web/vite.config.ts (preview server serves the vercel.json headers — single source of truth), apps/web/vitest.config.ts (web coverage gate 60% now active), apps/web/tests/security-headers.test.ts (config parse + every directive asserted), apps/web/tests/app.test.tsx (SSR-string render smoke), apps/web/package.json + tsconfig.json (test script, vitest, @types/node), e2e/playwright.config.ts (second webServer: preview on 4173; chromium-preview project), e2e/security-headers.spec.ts
- **Tests added:** 8 config-assertion tests (apps/web unit), 1 SSR smoke, 1 preview-server e2e (headers + zero CSP violations + app renders)
- **Verification:** all local gates green; the e2e spec proves the built shell loads under the strict headers with no console CSP violations. `vite preview` was confirmed (via a temporary programmatic check, deleted after) to serve exactly the vercel.json headers.
- **Bugs found during the slice:** Playwright `Response.headerValue()` is async — the first spec version forgot to await (fixed); apps/web needed @types/node for the node:fs config parse (added).
- **Default decisions relied on:** connect-src carries a placeholder API origin (https://api.realtype.example) because vercel.json is static — swapped to the real origin when the domain exists (HUMAN-ACTIONS item). Permissions-Policy disables camera, microphone, geolocation, payment, usb. HSTS max-age 2 years.
- **Deferred:** real-origin connect-src (human); hashes/nonces not needed (no inline styles/scripts in the build).
