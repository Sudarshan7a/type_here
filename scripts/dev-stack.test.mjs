import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkDevStack, readWorkspacePackages } from "./dev-stack.mjs";
import { portIsFree } from "../apps/api/scripts/preflight-port.mjs";

/**
 * Unit tests for the dev-stack validation (F1/F9) and the API port preflight
 * (the F3 fix).
 *
 * The integration half of this work lives in scripts/check-dev-stack.mjs, which
 * proves the failing behaviour by occupying real ports. That is the only thing
 * that can prove it — the actual defect was that a real `pnpm dev` reported
 * success — but it takes ~40s and needs free ports, so it is not a unit test
 * and is not run on every save.
 *
 * These tests cover what CAN be isolated: the validation logic, on fixtures, in
 * both directions, plus one check against the real repository. As with
 * scripts/check-policies.test.mjs, most assertions are deliberately about the
 * FAILING direction. A dev-stack check that has only ever passed is
 * indistinguishable from the `--filter` allowlist it replaced, which is exactly
 * the defect that went unnoticed here.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The real shape of the workspace, trimmed to the fields checkDevStack reads.
 * Mirrors the actual packages: two dev servers under apps/, and a standalone
 * tool that also has a dev script but is NOT part of the dev stack.
 */
const WORKSPACE = [
  { dir: "apps/api", name: "@realtype/api", hasDev: true },
  { dir: "apps/web", name: "@realtype/web", hasDev: true },
  { dir: "packages/engine", name: "@realtype/engine", hasDev: false },
  { dir: "packages/schemas", name: "@realtype/schemas", hasDev: false },
  { dir: "tools/fixture-recorder", name: "@realtype/fixture-recorder", hasDev: true },
];

/**
 * Validation with an EXPLICIT declared list. Note that passing `declared` at all
 * puts the check in subset mode, which deliberately skips the F9 completeness
 * check — so the F9 tests below call checkDevStack directly with no `declared`,
 * which is how the real launcher invokes it.
 */
const problems = (overrides = {}) =>
  checkDevStack({
    declared: ["@realtype/api", "@realtype/web"],
    workspacePackages: WORKSPACE,
    ...overrides,
  });

/** Validation with NO declared list: the real `pnpm dev` path, completeness on. */
const fullStack = (workspacePackages) => checkDevStack({ workspacePackages });

describe("F1 — a mistyped dev filter must be rejected, not silently ignored", () => {
  it("passes when every declared filter matches a package with a dev script", () => {
    assert.deepEqual(problems(), []);
  });

  it("fails on a typo'd filter name", () => {
    // The real defect: pnpm printed "No projects matched the filters" and then
    // started everything else, exit 0.
    const found = problems({ declared: ["@realtype/webb", "@realtype/api"] });
    assert.equal(found.length, 1);
    assert.match(found[0], /@realtype\/webb/);
    assert.match(found[0], /matches no workspace package/);
  });

  it("names the packages that do exist, so a typo is obvious next to the real list", () => {
    const found = problems({ declared: ["@realtype/webb"] });
    assert.match(found[0], /@realtype\/web/);
    assert.match(found[0], /@realtype\/api/);
  });

  it("fails when every filter is wrong, not just a subset", () => {
    assert.equal(problems({ declared: ["@realtype/nope"] }).length, 1);
  });

  it("fails when a filter matches a package that has no dev script", () => {
    // A renamed or removed `dev` script would otherwise be a silent no-op: the
    // filter matches, and the service just never starts.
    const found = problems({ declared: ["@realtype/engine"] });
    assert.equal(found.length, 1);
    assert.match(found[0], /packages\/engine/);
    assert.match(found[0], /no "dev" script/);
  });

  it("reports every problem, not just the first", () => {
    assert.equal(problems({ declared: ["@realtype/webb", "@realtype/nope2"] }).length, 2);
  });

  it("returns nothing for an empty workspace rather than throwing", () => {
    // A gate that fires on "nothing to check" trains people to ignore it.
    assert.deepEqual(checkDevStack({ declared: [], workspacePackages: [] }), []);
  });

  it("tolerates a missing repository shape rather than throwing", () => {
    assert.doesNotThrow(() => checkDevStack());
  });
});

describe("F9 — a new service must not be silently omitted from the dev stack", () => {
  it("fails when a package under apps/ has a dev script but is not declared", () => {
    // The failure mode being removed: adding apps/admin with its own dev server
    // and forgetting the filter list produced a dev stack that was quietly
    // missing a service, with nothing to say so.
    const withNewService = [
      ...WORKSPACE,
      { dir: "apps/admin", name: "@realtype/admin", hasDev: true },
    ];
    const found = fullStack(withNewService);
    assert.equal(found.length, 1);
    assert.match(found[0], /@realtype\/admin/);
    assert.match(found[0], /apps\/admin/);
    assert.match(found[0], /DEV_STACK/);
  });

  it("ignores a library package that has no dev script", () => {
    // packages/* are libraries. Demanding they be in the dev stack would fire on
    // every package that is not a server, which is most of them.
    const found = fullStack([
      ...WORKSPACE,
      { dir: "packages/ui", name: "@realtype/ui", hasDev: false },
    ]);
    assert.deepEqual(found, []);
  });

  it("ignores a tool with a dev script, because apps/ is the scope of the stack", () => {
    // tools/fixture-recorder really does have `"dev": "vite"` in the repository.
    // It is a standalone tool, not part of `pnpm dev`, and F9 must not make it
    // one. This test is the reason the completeness check is scoped to apps/.
    assert.ok(WORKSPACE.some((p) => p.hasDev && !p.dir.startsWith("apps/")));
    assert.deepEqual(fullStack(WORKSPACE), []);
  });

  it("does not demand completeness when a subset was requested on purpose", () => {
    // `pnpm dev --filter @realtype/web` is a legitimate request for one
    // service. Complaining that the stack is incomplete would be noise.
    const withNewService2 = [
      ...WORKSPACE,
      { dir: "apps/admin", name: "@realtype/admin", hasDev: true },
    ];
    const found = checkDevStack({
      declared: ["@realtype/web"],
      workspacePackages: withNewService2,
    });
    assert.deepEqual(found, []);
  });

  it("still rejects a mistyped filter in subset mode", () => {
    const found = checkDevStack({ declared: ["@realtype/webb"], workspacePackages: WORKSPACE });
    assert.equal(found.length, 1);
  });
});

describe("the real repository", () => {
  const packages = readWorkspacePackages(ROOT);

  it("reads every workspace package that has a package.json", () => {
    for (const name of [
      "@realtype/api",
      "@realtype/web",
      "@realtype/engine",
      "@realtype/schemas",
      "@realtype/telemetry",
      "@realtype/e2e",
      "@realtype/fixture-recorder",
    ]) {
      assert.ok(
        packages.some((p) => p.name === name),
        `expected to read ${name} from the workspace`,
      );
    }
  });

  it("agrees that both apps have a dev script", () => {
    assert.ok(packages.find((p) => p.name === "@realtype/api")?.hasDev);
    assert.ok(packages.find((p) => p.name === "@realtype/web")?.hasDev);
  });

  it("passes the dev-stack check as the repository stands", () => {
    // The GOOD direction on real input: if this ever fails, `pnpm dev` is
    // refusing to start for a reason nobody asked for.
    assert.deepEqual(checkDevStack({ workspacePackages: packages }), []);
  });

  it("fails on the same repository the moment a real filter is mistyped", () => {
    // The BAD direction on real input. This is the exact input that made pnpm
    // exit 0 and start half a stack, run against the actual package list.
    const found = checkDevStack({
      declared: ["@realtype/webb", "@realtype/api"],
      workspacePackages: packages,
    });
    assert.equal(found.length, 1);
    assert.match(found[0], /@realtype\/webb/);
  });

  it("fails on the same repository when a new apps/ service is not declared", () => {
    // The BAD direction for F9, on real input: pretend apps/admin landed.
    const withNewService = [
      ...packages,
      { dir: "apps/admin", name: "@realtype/admin", hasDev: true },
    ];
    const found = checkDevStack({ workspacePackages: withNewService });
    assert.equal(found.length, 1);
    assert.match(found[0], /@realtype\/admin/);
  });

  it("still accepts a deliberate subset on the real repository", () => {
    assert.deepEqual(
      checkDevStack({ declared: ["@realtype/web"], workspacePackages: packages }),
      [],
    );
  });
});

describe("the API port preflight (the F3 fix)", () => {
  // The preflight is what turns "the API died silently" into "the API said why".
  // It binds a real socket, because a mocked bind would test nothing about
  // EADDRINUSE.

  const servers = [];

  function occupy(port) {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.once("error", reject);
      server.listen({ port, host: "0.0.0.0", exclusive: true }, () => {
        servers.push(server);
        resolve(server);
      });
    });
  }

  after(async () => {
    await Promise.all(servers.map((s) => new Promise((r) => s.close(() => r()))));
  });

  // High, rarely-used ports so the test never collides with a real dev server
  // or with CI.
  const FREE = 39217;
  const TAKEN = 39218;

  it("reports a free port as free, so a good start is never blocked", async () => {
    assert.equal(await portIsFree(FREE), true);
  });

  it("reports an occupied port as busy, and does not throw", async () => {
    // The F3 case at the unit level: this is the assertion that makes the
    // preflight exit 1 and short-circuit `tsx watch` out of ever starting.
    await occupy(TAKEN);
    assert.equal(await portIsFree(TAKEN), false);
  });

  it("frees the probe again so the preflight does not hold the port it checked", async () => {
    // If the probe kept its socket open, the server it was protecting could
    // never start. The dev stack would go from "silently dead" to "always
    // broken", which is not a fix.
    assert.equal(await portIsFree(FREE), true);
    await occupy(FREE);
    assert.equal(await portIsFree(FREE), false);
  });
});

/**
 * The hole owner-proxy review 1 found in this file's own validation.
 *
 * `checkDevStack` used to answer "does every name I was given resolve to a
 * workspace package with a dev script?" — and that is the wrong question. The
 * launcher starts `DEV_STACK.filter(...)`, so what actually matters is whether
 * the name resolves to a service the launcher knows how to RUN.
 *
 * `--filter @realtype/fixture-recorder` is a package that exists and does have a
 * `dev` script, so every old check passed. It is not in DEV_STACK, so
 * `services` came back empty, nothing started, and the launcher exited 0.
 *
 * That is F1, F2 and F3's exact failure shape — "the tool said it was fine"
 * while nothing was running — reached through the one path the validation was
 * written to permit.
 *
 * Each test below is paired: it fails if the guard is removed. Asserting only
 * that the good path still passes would be exactly the vacuous test this
 * programme keeps finding.
 */
describe("a --filter the launcher cannot run must be rejected", () => {
  it("rejects a package that has a dev script but is not in the dev stack", () => {
    // WORKSPACE already models this exactly: tools/fixture-recorder is a real
    // workspace package with a real dev script.
    const found = checkDevStack({
      declared: ["@realtype/fixture-recorder"],
      workspacePackages: WORKSPACE,
    });
    assert.equal(found.length, 1, "exactly one problem, not a pile of near-duplicates");
    assert.match(found[0], /fixture-recorder/);
    assert.match(found[0], /not in the dev stack/);
  });

  it("names the services it CAN start, so the fix is obvious", () => {
    const found = checkDevStack({
      declared: ["@realtype/fixture-recorder"],
      workspacePackages: WORKSPACE,
    });
    assert.match(found[0], /@realtype\/api, @realtype\/web/);
  });

  it("still rejects a package with no dev script, and says that instead", () => {
    const found = checkDevStack({
      declared: ["@realtype/engine"],
      workspacePackages: WORKSPACE,
    });
    assert.equal(found.length, 1);
    assert.match(found[0], /no "dev" script/);
    // The weaker, wrong message must not be what the reader is left with.
    assert.doesNotMatch(found[0], /not in the dev stack/);
  });

  it("still rejects a name matching nothing at all, and says that instead", () => {
    const found = checkDevStack({
      declared: ["@realtype/webb"],
      workspacePackages: WORKSPACE,
    });
    assert.equal(found.length, 1);
    assert.match(found[0], /matches no workspace package/);
    assert.doesNotMatch(found[0], /not in the dev stack/);
  });

  it("accepts a real service, so the guard is not simply rejecting everything", () => {
    assert.deepEqual(
      checkDevStack({ declared: ["@realtype/api"], workspacePackages: WORKSPACE }),
      [],
    );
    assert.deepEqual(
      checkDevStack({ declared: ["@realtype/api", "@realtype/web"], workspacePackages: WORKSPACE }),
      [],
    );
  });

  it("accepts the real repository's own declared stack", () => {
    assert.deepEqual(checkDevStack({ workspacePackages: readWorkspacePackages(ROOT) }), []);
  });
});
