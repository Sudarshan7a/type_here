import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
// The stylesheet has to be imported here. It used to live in src/ with nothing
// referencing it and no <link> in index.html, so the whole app shipped unstyled
// and every class name in the components was decoration. See the note in
// styles.css: the character-state cues and the reduced-motion rule only work if
// this line exists.
import "./styles.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
