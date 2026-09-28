import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "../src/App";

// A5 smoke: the shell renders server-side to a string without any DOM
// dependency — also keeps the web coverage gate honest.
describe("web shell (A5)", () => {
  it("renders the RealType title with its test id", () => {
    const html = renderToString(<App />);
    expect(html).toContain("RealType");
    expect(html).toContain('data-testid="app-title"');
  });
});
