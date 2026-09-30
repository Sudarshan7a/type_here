import { runFixture } from "./fixture-runner.js";

import * as mod from "../fixtures/d01.js";

// Named fixture test: the chapter-4 deep-dive fixture id is carried by the
// fixture module (ENG-FIXTURE-*-*). Expected values are recomputed
// independently — see fixtures/PROVENANCE.md.
runFixture(mod);
