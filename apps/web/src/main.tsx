import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ManualTestApp } from "./ManualTestApp";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <ManualTestApp />
  </StrictMode>,
);
