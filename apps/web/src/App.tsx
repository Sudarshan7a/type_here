/**
 * The RealType app shell.
 *
 * Deliberately thin: it owns which passage is loaded and nothing else. Every
 * decision about the test itself — character states, metrics, error modes, the
 * clock — belongs to packages/engine, and the surface is the only thing that
 * talks to it.
 */
import { useCallback, useState } from "react";
import type { ErrorMode } from "@realtype/engine";

import { TypingSurface } from "./TypingSurface";
import { PASSAGES, type Passage } from "./passages";

export function App() {
  const [passage, setPassage] = useState<Passage>(PASSAGES[0]!);
  // Free mode is the only error mode exposed for now; the contract carries five
  // (CONTRACT_VERSION 1.3.0) and the settings UI is a later slice. A hard-coded
  // constant is honest about that; a mode bar with one working option is not.
  const errorMode: ErrorMode = "free";

  const newPassage = useCallback(() => {
    setPassage((current) => {
      const index = PASSAGES.findIndex((p) => p.id === current.id);
      const next = PASSAGES[(index + 1) % PASSAGES.length];
      return next ?? PASSAGES[0]!;
    });
  }, []);

  return (
    <main>
      <h1 data-testid="app-title">RealType</h1>

      <div className="controls">
        <label htmlFor="passage">Passage</label>
        <select
          id="passage"
          value={passage.id}
          data-testid="passage-select"
          onChange={(event) => {
            const next = PASSAGES.find((p) => p.id === event.target.value);
            if (next !== undefined) setPassage(next);
          }}
        >
          {PASSAGES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
      </div>

      <TypingSurface
        // Remounting on a passage change is deliberate: it resets every ref, the
        // capture and the offsets in one step, instead of relying on an effect to
        // remember to undo the previous attempt.
        key={passage.id}
        passage={passage}
        errorMode={errorMode}
        onNewPassage={newPassage}
      />

      <p className="banner" role="note">
        Practice surface. Every score comes from the RealType engine in this repository — nothing is
        sent anywhere and nothing is saved.
      </p>
    </main>
  );
}
