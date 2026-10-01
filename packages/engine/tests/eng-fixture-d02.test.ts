import { runFixture } from "./fixture-runner.js";

import * as mod from "../fixtures/d02.js";

// ENG-FIXTURE-D02-stop-on-error-halt: the run halts at the first error and the
// scored duration freezes there. Expected values are recomputed independently
// in the fixture's own doc comment — see fixtures/PROVENANCE.md.
runFixture(mod);
