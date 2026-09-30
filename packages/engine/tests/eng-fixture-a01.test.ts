import { runFixture } from "./fixture-runner.js";

import * as mod from "../fixtures/a01.js";

// Chapter-4 deep-dive §4.2 — ENG-FIXTURE-A01-perfect-even-typing.
// Consistency is null (5.454 s < the documented 10 s minimum scored
// duration); everything else agrees with the chapter (see PROVENANCE.md).
runFixture(mod);
