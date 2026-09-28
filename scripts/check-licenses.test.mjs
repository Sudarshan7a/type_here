import assert from "node:assert/strict";
import { test } from "node:test";

import { findCopyleftOffenders } from "./check-licenses.mjs";

// Block A2: prove the copyleft gate fails on bad fixture input without
// installing any unsafe dependency. Fixture shapes mirror license-checker's
// JSON output ({ packageName -> { licenses } }).

const CLEAN = {
  "react@19.3.0": { licenses: "MIT" },
  "fastify@5.12.5": { licenses: "MIT" },
  "typescript@6.0.3": { licenses: "Apache-2.0" },
  "some-bsd@1.0.0": { licenses: "BSD-3-Clause" },
  "some-isc@1.0.0": { licenses: "ISC" },
};

const POISONED = {
  ...CLEAN,
  "evil-gpl@1.0.0": { licenses: "GPL-3.0" },
  "evil-agpl@2.0.0": { licenses: "AGPL-3.0-only" },
  "evil-lgpl@1.2.3": { licenses: "LGPL-2.1" },
  "evil-spdx-or@1.0.0": { licenses: "MIT OR GPL-2.0" },
};

test("clean fixture: no offenders (gate passes)", () => {
  assert.deepEqual(findCopyleftOffenders("apps/web", CLEAN), []);
});

test("poisoned fixture: every copyleft license is caught (gate fails)", () => {
  const offenders = findCopyleftOffenders("apps/web", POISONED);
  assert.equal(offenders.length, 4);
  assert.ok(offenders.some((o) => o.includes("evil-gpl@1.0.0") && o.includes("GPL-3.0")));
  assert.ok(offenders.some((o) => o.includes("evil-agpl@2.0.0") && o.includes("AGPL-3.0-only")));
  assert.ok(offenders.some((o) => o.includes("evil-lgpl@1.2.3") && o.includes("LGPL-2.1")));
  assert.ok(offenders.some((o) => o.includes("evil-spdx-or@1.0.0") && o.includes("GPL-2.0")));
});

test("unknown license fields are flagged as UNKNOWN, not silently passed", () => {
  const offenders = findCopyleftOffenders("packages/engine", {
    "mystery@0.0.1": {},
  });
  assert.equal(offenders.length, 1);
  assert.ok(offenders[0].includes("UNKNOWN"));
});

test("missing input behaves as empty, not as a crash", () => {
  assert.deepEqual(findCopyleftOffenders("apps/api", undefined), []);
});
