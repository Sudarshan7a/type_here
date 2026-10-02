import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkPolicies, readRepo } from "./check-policies.mjs";

// The three `[Policy]` rows in the ledger are not features; they are rules about
// what may never ship. `INT-10`, `BIZ-06` and `RET-21` carry the tag `UNTAGGED`
// because the source documents literally write `[Policy]` after the ID, and no
// MVP/V1 tag exists for them.
//
// Two of the three can be enforced by a machine, which is the only kind of
// enforcement that survives contact with a deadline. The third cannot, and is
// recorded as review-enforced — pretending a review checklist is a test would be
// worse than saying so plainly.
//
// Most of these tests assert the FAILING direction on purpose. A policy gate that
// has only ever passed is indistinguishable from no gate at all.

const REPO = {
  ledgerRows: [
    { id: "INT-05", flag: "—", status: "DONE-VERIFIED" },
    { id: "INT-06", flag: "—", status: "DONE-VERIFIED" },
    { id: "INT-07", flag: "—", status: "DONE-VERIFIED" },
    { id: "INT-08", flag: "—", status: "DONE-VERIFIED" },
    { id: "CMP-01", flag: "OFF", status: "NOT STARTED" },
    { id: "CMP-02", flag: "OFF", status: "NOT STARTED" },
  ],
  sourceFiles: {
    "apps/web/src/TypingSurface.tsx": "export const x = 1;\n",
    "apps/web/src/copy.ts": 'export const COPY = { hintRestart: "Press Tab to restart" };\n',
  },
  ethicsRecords: [],
};

const problemsFor = (repo, prefix) => checkPolicies(repo).filter((p) => p.startsWith(prefix));

describe("INT-10 — no public leaderboards before the integrity layer exists", () => {
  it("passes when the competitive rows are flag-OFF", () => {
    assert.deepEqual(problemsFor(REPO, "INT-10"), []);
  });

  it("fails when a competitive row loses its OFF flag", () => {
    const broken = {
      ...REPO,
      ledgerRows: REPO.ledgerRows.map((r) => (r.id === "CMP-01" ? { ...r, flag: "—" } : r)),
    };
    const problems = problemsFor(broken, "INT-10");
    assert.ok(problems.length > 0, "losing the OFF flag must fail the policy");
    assert.match(problems.join(" "), /CMP-01/);
  });

  it("does not complain merely because the integrity layer is incomplete", () => {
    // Everything OFF and NOT STARTED while INT-05..08 are unbuilt IS the
    // compliant state — it is how the program is meant to sit until they land.
    const incomplete = {
      ...REPO,
      ledgerRows: [
        { id: "INT-05", flag: "—", status: "NOT STARTED" },
        ...REPO.ledgerRows.filter((r) => !r.id.startsWith("INT-")),
      ],
    };
    assert.deepEqual(problemsFor(incomplete, "INT-10"), []);
  });

  it("fails when a competitive row is worked on while the integrity layer is missing", () => {
    const broken = {
      ...REPO,
      ledgerRows: [
        { id: "INT-05", flag: "—", status: "NOT STARTED" },
        ...REPO.ledgerRows.filter((r) => !r.id.startsWith("INT-")),
        { id: "CMP-01", flag: "OFF", status: "IN PROGRESS" },
        { id: "CMP-02", flag: "OFF", status: "NOT STARTED" },
      ],
    };
    assert.match(problemsFor(broken, "INT-10").join(" "), /INT-05/);
  });

  it("fails on an ungated leaderboard source file", () => {
    const broken = {
      ...REPO,
      sourceFiles: {
        ...REPO.sourceFiles,
        "apps/api/src/routes/leaderboard.ts": "export const rank = 1;\n",
      },
    };
    assert.match(problemsFor(broken, "INT-10").join(" "), /leaderboard\.ts/);
  });

  it("allows a leaderboard file that documents its own gate in its source", () => {
    // The policy is not "never write the file", it is "never let it run". A file
    // that states the gate in its own header is the shape the roadmap wants, so a
    // bare filename ban would be the wrong check.
    const gated = {
      ...REPO,
      sourceFiles: {
        ...REPO.sourceFiles,
        "apps/api/src/routes/leaderboard.ts":
          "// INT-10: behind a launch flag, OFF by default. Requires INT-05..INT-08.\nexport const flag = false;\n",
      },
    };
    assert.deepEqual(problemsFor(gated, "INT-10"), []);
  });
});

describe("BIZ-06 — no dark patterns", () => {
  it("passes on a repository with no paywall and clean copy", () => {
    assert.deepEqual(problemsFor(REPO, "BIZ-06"), []);
  });

  it("fails on guilt-based loss framing", () => {
    const broken = {
      ...REPO,
      sourceFiles: {
        "apps/web/src/copy.ts":
          'export const x = "We miss you! Come back before it is too late!";\n',
      },
    };
    assert.ok(problemsFor(broken, "BIZ-06").length > 0);
  });

  it("fails on hidden-trial or surprise-renewal copy", () => {
    const hidden = {
      ...REPO,
      sourceFiles: {
        "apps/web/src/copy.ts": 'export const x = "Your trial ends silently tomorrow";\n',
      },
    };
    assert.ok(problemsFor(hidden, "BIZ-06").length > 0);
  });

  it("fails when a paywall or checkout surface appears in the app", () => {
    const broken = {
      ...REPO,
      sourceFiles: { ...REPO.sourceFiles, "apps/web/src/Checkout.tsx": "export const C = 1;\n" },
    };
    assert.ok(problemsFor(broken, "BIZ-06").length > 0);
  });

  it("does not fire on 'streak', which the product legitimately uses", () => {
    // A blanket keyword ban would have flagged "streak" the day the streak
    // feature landed, and a check that cries wolf on real product vocabulary
    // gets switched off.
    const ok = {
      ...REPO,
      sourceFiles: {
        "apps/web/src/copy.ts": 'export const x = "Your weekly streak is still open";\n',
      },
    };
    assert.deepEqual(problemsFor(ok, "BIZ-06"), []);
  });
});

describe("RET-21 — the ethics checklist, enforced in review", () => {
  it("passes when no engagement row has started", () => {
    const repo = {
      ...REPO,
      ledgerRows: [...REPO.ledgerRows, { id: "RET-01", flag: "OFF", status: "NOT STARTED" }],
    };
    assert.deepEqual(problemsFor(repo, "RET-21"), []);
  });

  it("fails when an engagement row is in progress with no checklist record", () => {
    const repo = {
      ...REPO,
      ledgerRows: [...REPO.ledgerRows, { id: "RET-03", flag: "OFF", status: "IN PROGRESS" }],
    };
    const problems = problemsFor(repo, "RET-21");
    assert.match(problems.join(" "), /RET-03/);
    assert.match(problems.join(" "), /retention-and-mastery-playbook/);
  });

  it("passes when the checklist record exists for that row", () => {
    const repo = {
      ...REPO,
      ledgerRows: [...REPO.ledgerRows, { id: "RET-03", flag: "OFF", status: "IN PROGRESS" }],
      ethicsRecords: ["RET-03"],
    };
    assert.deepEqual(problemsFor(repo, "RET-21"), []);
  });

  it("does not require RET-21 to produce a record of its own", () => {
    // RET-21 IS the rule, so applying the rule to it would be circular: the
    // checklist would have to be satisfied in order to permit the row that
    // defines the checklist. Found by running the gate against the real ledger.
    const repo = {
      ...REPO,
      ledgerRows: [...REPO.ledgerRows, { id: "RET-21", flag: "—", status: "IN PROGRESS" }],
      ethicsRecords: [],
    };
    assert.deepEqual(problemsFor(repo, "RET-21"), []);
  });

  it("still requires a record for every OTHER engagement row", () => {
    const repo = {
      ...REPO,
      ledgerRows: [
        ...REPO.ledgerRows,
        { id: "RET-21", flag: "—", status: "IN PROGRESS" },
        { id: "RET-04", flag: "—", status: "IN PROGRESS" },
      ],
      ethicsRecords: [],
    };
    assert.match(problemsFor(repo, "RET-21").join(" "), /RET-04/);
  });

  it("requires a record for every status past NOT STARTED, not just IN PROGRESS", () => {
    for (const status of ["DONE-VERIFIED", "LAUNCH-GATED", "BLOCKED-EXTERNAL"]) {
      const repo = {
        ...REPO,
        ledgerRows: [...REPO.ledgerRows, { id: "RET-07", flag: "OFF", status }],
      };
      assert.ok(
        problemsFor(repo, "RET-21").length > 0,
        `${status} must require a checklist record`,
      );
    }
  });
});

describe("the policy gate itself", () => {
  it("reports nothing for an empty repository, so an empty input is not an error", () => {
    // A gate that fires on "nothing to check" trains people to ignore it.
    assert.deepEqual(checkPolicies({ ledgerRows: [], sourceFiles: {}, ethicsRecords: [] }), []);
  });

  it("names the policy in every message, so a failure says which rule broke", () => {
    const broken = {
      ...REPO,
      sourceFiles: { "apps/web/src/copy.ts": 'export const x = "We miss you!";\n' },
    };
    for (const problem of checkPolicies(broken)) {
      assert.match(problem, /^(INT-10|BIZ-06|RET-21|CUS-01)\b/);
    }
  });

  it("tolerates a missing repository shape rather than throwing", () => {
    assert.doesNotThrow(() => checkPolicies({}));
  });
});

/**
 * CUS-01 — AGENTS.md rule 1. Nothing may interrupt the typing surface.
 *
 * This rule exists because the previous enforcement was a blocklist of nine
 * selector names in AC6 and the SSR test, and owner-proxy review 1 (REVIEW-1.md,
 * H1) defeated both by rendering a `promo-banner` div carrying `aria-modal="true"`.
 * The string `aria-modal` was not on the list, so the test passed on an overlay.
 *
 * A blocklist is not a rule. It is a list of the names someone already thought
 * of. So this gate matches the CONSTRUCT — dialog, showModal, popover,
 * aria-modal, a dialog role, or an overlay component name — which does not
 * depend on what anybody decided to call the thing.
 *
 * Most tests below assert the FAILING direction. A gate that has only ever
 * passed is indistinguishable from no gate at all.
 */
describe("CUS-01 — nothing may interrupt the typing surface", () => {
  const surface = (body) => ({
    ...REPO,
    sourceFiles: { "apps/web/src/TypingSurface.tsx": body },
  });
  const cus01 = (repo) => problemsFor(repo, "CUS-01");

  it("passes on surface source with no overlay construct", () => {
    assert.deepEqual(cus01(surface("export const x = 1;\n")), []);
  });

  it("catches the exact overlay that defeated the old blocklist", () => {
    // Verbatim the mutation from REVIEW-1.md H1. If this passes, the gate is
    // repeating the mistake it was written to fix.
    const found = cus01(
      surface(
        'export const Banner = () => <div className="promo-banner" aria-modal="true">Sign up</div>;\n',
      ),
    );
    assert.equal(found.length, 1);
    assert.match(found[0], /aria-modal/);
    assert.match(found[0], /apps\/web\/src\/TypingSurface\.tsx:\d+/);
  });

  it("catches a <dialog> element whatever it is called", () => {
    assert.equal(
      cus01(surface('const D = () => <dialog className="anything">x</dialog>;\n')).length,
      1,
    );
  });

  it("catches showModal(), which is how a dialog is opened at runtime", () => {
    assert.equal(cus01(surface("const open = (d) => d.showModal();\n")).length, 1);
  });

  it("catches the popover attribute and role=dialog without a class at all", () => {
    assert.equal(cus01(surface("const X = () => <div popover>x</div>;\n")).length, 1);
    assert.equal(cus01(surface('const X = () => <section role="dialog">x</section>;\n')).length, 1);
    assert.equal(cus01(surface('const X = () => <div role="alertdialog">x</div>;\n')).length, 1);
  });

  it("catches an overlay component by name, so the shape is discouraged too", () => {
    assert.equal(cus01(surface('import { SignupModal } from "./SignupModal";\n')).length, 1);
  });

  it("ignores a line comment explaining the rule — a comment is not a violation", () => {
    // Otherwise the only way to document the rule on the surface is to not
    // document it, which is the wrong incentive to build a gate into.
    assert.deepEqual(
      cus01(surface("// never render a dialog or aria-modal here: AGENTS.md rule 1\n")),
      [],
    );
  });

  it("covers the whole web src tree, because today all of it is the typing surface", () => {
    // The scope is `apps/web/src/`, deliberately coarse. Today that is exactly
    // right: the MVP web app IS the typing surface, so every module in src/ is
    // reachable from the field. This test pins that fact so the day a settings
    // screen appears and this becomes too broad, the change is deliberate rather
    // than a surprise failure nobody can explain.
    const repo = {
      ...REPO,
      sourceFiles: {
        "apps/web/src/TypingSurface.tsx": "export const x = 1;\n",
        "apps/web/src/SettingsDialog.tsx": 'const D = () => <dialog role="dialog">x</dialog>;\n',
      },
    };
    assert.equal(cus01(repo).length, 1);
  });

  it("does not reach outside apps/web/src at all", () => {
    // The api, the engine and the recorder are not on the typing field. An
    // overlay in an api route is a different product's decision.
    const repo = {
      ...REPO,
      sourceFiles: {
        "apps/web/src/TypingSurface.tsx": "export const x = 1;\n",
        "apps/api/src/routes/admin-dialog.ts": "const D = () => <dialog>x</dialog>;\n",
      },
    };
    assert.deepEqual(cus01(repo), []);
  });

  it("does not inspect test files", () => {
    const repo = {
      ...REPO,
      sourceFiles: {
        "apps/web/src/TypingSurface.tsx": "export const x = 1;\n",
        "apps/web/tests/overlay-fixture.tsx": "const D = () => <dialog>x</dialog>;\n",
      },
    };
    assert.deepEqual(cus01(repo), []);
  });

  it("holds on the real repository, which has an overlay-free surface", () => {
    assert.deepEqual(cus01(readRepo()), []);
  });
});
