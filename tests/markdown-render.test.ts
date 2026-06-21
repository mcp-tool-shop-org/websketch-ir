/**
 * Tests for the Markdown renderer.
 *
 * Covers: renderMarkdown output, role-specific formatting,
 * maxDepth truncation, includeMetadata header, full captures.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../src/render/markdown.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";

// =============================================================================
// Helpers
// =============================================================================

/** Build a capture with a HEADER child. */
function headerCapture() {
  return makeCapture(
    makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("HEADER", [0, 0, 1, 0.1] as const, {
          semantic: "Site Header",
        }),
      ],
    }),
  );
}

/** Build a capture with a LIST and items. */
function listCapture() {
  return makeCapture(
    makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("LIST", [0.1, 0.1, 0.8, 0.5] as const, {
          semantic: "Navigation",
          children: [
            makeNode("LINK", [0.1, 0.1, 0.3, 0.05] as const, {
              semantic: "Home",
            }),
            makeNode("LINK", [0.1, 0.2, 0.3, 0.05] as const, {
              semantic: "About",
            }),
            makeNode("LINK", [0.1, 0.3, 0.3, 0.05] as const, {
              semantic: "Contact",
            }),
          ],
        }),
      ],
    }),
  );
}

/** Build a capture with BUTTONs. */
function buttonCapture() {
  return makeCapture(
    makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.3, 0.4, 0.2, 0.08] as const, {
          interactive: true,
          semantic: "Submit",
        }),
        makeNode("BUTTON", [0.6, 0.4, 0.2, 0.08] as const, {
          interactive: true,
          semantic: "Cancel",
        }),
      ],
    }),
  );
}

/** Build a capture with LINKs. */
function linkCapture() {
  return makeCapture(
    makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("LINK", [0.1, 0.1, 0.2, 0.05] as const, {
          semantic: "Read more",
        }),
      ],
    }),
  );
}

/** Build a multi-role capture for full render test. */
function fullCapture() {
  return makeCapture(
    makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("HEADER", [0, 0, 1, 0.1] as const, {
          semantic: "Main Header",
          children: [
            makeNode("NAV", [0, 0, 1, 0.1] as const, {
              semantic: "Main Nav",
              children: [
                makeNode("LINK", [0.1, 0.02, 0.15, 0.06] as const, {
                  semantic: "Home",
                }),
                makeNode("LINK", [0.3, 0.02, 0.15, 0.06] as const, {
                  semantic: "About",
                }),
              ],
            }),
          ],
        }),
        makeNode("SECTION", [0, 0.1, 1, 0.7] as const, {
          semantic: "Content Area",
          children: [
            makeNode("BUTTON", [0.4, 0.5, 0.2, 0.08] as const, {
              interactive: true,
              semantic: "Sign Up",
            }),
          ],
        }),
        makeNode("FOOTER", [0, 0.9, 1, 0.1] as const, {
          semantic: "Footer",
        }),
      ],
    }),
  );
}

/** Build a deeply nested capture for maxDepth testing. */
function deepCapture() {
  const innermost = makeNode("BUTTON", [0.4, 0.4, 0.2, 0.08] as const, {
    interactive: true,
    semantic: "Deep Button",
  });
  const level3 = makeNode("CARD", [0.2, 0.2, 0.6, 0.6] as const, {
    children: [innermost],
  });
  const level2 = makeNode("SECTION", [0.1, 0.1, 0.8, 0.8] as const, {
    children: [level3],
  });
  const level1 = makeNode("HEADER", [0, 0, 1, 0.9] as const, {
    semantic: "Top",
    children: [level2],
  });
  return makeCapture(
    makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [level1],
    }),
  );
}

// =============================================================================
// Basic output
// =============================================================================

describe("renderMarkdown basic output", () => {
  it("produces non-empty string containing markdown syntax", () => {
    const output = renderMarkdown(headerCapture());
    expect(output.length).toBeGreaterThan(0);
    // Should contain markdown heading syntax
    expect(output).toContain("#");
  });

  it("ends with a newline", () => {
    const output = renderMarkdown(headerCapture());
    expect(output.endsWith("\n")).toBe(true);
  });
});

// =============================================================================
// Headers render as ##
// =============================================================================

describe("renderMarkdown headers", () => {
  it("renders HEADER role as ## heading", () => {
    const output = renderMarkdown(headerCapture());
    expect(output).toContain("## Site Header");
  });

  it("renders SECTION role as ### heading", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("SECTION", [0, 0.1, 1, 0.8] as const, {
            semantic: "Details",
          }),
        ],
      }),
    );
    const output = renderMarkdown(capture);
    expect(output).toContain("### Details");
  });
});

// =============================================================================
// Lists render as bullets
// =============================================================================

describe("renderMarkdown lists", () => {
  it("renders LIST children as bullet items", () => {
    const output = renderMarkdown(listCapture());
    expect(output).toContain("- Home");
    expect(output).toContain("- About");
    expect(output).toContain("- Contact");
  });

  it("includes list label when semantic is set", () => {
    const output = renderMarkdown(listCapture());
    expect(output).toContain("**Navigation**");
  });
});

// =============================================================================
// Buttons render as bold
// =============================================================================

describe("renderMarkdown buttons", () => {
  it("renders BUTTON as bold bracketed text", () => {
    const output = renderMarkdown(buttonCapture());
    expect(output).toContain("**[Submit]**");
    expect(output).toContain("**[Cancel]**");
  });
});

// =============================================================================
// Links render as Markdown links
// =============================================================================

describe("renderMarkdown links", () => {
  it("renders LINK as Markdown link syntax", () => {
    const output = renderMarkdown(linkCapture());
    expect(output).toContain("[Read more](#)");
  });
});

// =============================================================================
// maxDepth option truncates
// =============================================================================

describe("renderMarkdown maxDepth", () => {
  it("truncates deeply nested nodes beyond maxDepth", () => {
    const full = renderMarkdown(deepCapture());
    const shallow = renderMarkdown(deepCapture(), { maxDepth: 2 });

    // Full render includes the deep button
    expect(full).toContain("Deep Button");
    // Shallow render should NOT include the button at depth 4
    expect(shallow).not.toContain("Deep Button");
  });

  it("maxDepth 0 produces minimal output", () => {
    const output = renderMarkdown(deepCapture(), { maxDepth: 0 });
    // With maxDepth 0, only depth-0 nodes render (PAGE just passes to children at same depth)
    // Children of PAGE are at depth 0, their children at depth 1 should be cut
    expect(output.length).toBeLessThan(renderMarkdown(deepCapture()).length);
  });
});

// =============================================================================
// includeMetadata adds header
// =============================================================================

describe("renderMarkdown includeMetadata", () => {
  it("includes URL and viewport metadata when enabled", () => {
    const output = renderMarkdown(headerCapture(), { includeMetadata: true });
    expect(output).toContain("**URL:**");
    expect(output).toContain("https://example.com");
    expect(output).toContain("**Viewport:**");
    expect(output).toContain("1920x1080");
    expect(output).toContain("**Captured:**");
  });

  it("omits metadata by default", () => {
    const output = renderMarkdown(headerCapture());
    expect(output).not.toContain("**URL:**");
    expect(output).not.toContain("**Viewport:**");
  });
});

// =============================================================================
// Full capture produces valid Markdown
// =============================================================================

describe("renderMarkdown full capture", () => {
  it("produces valid Markdown covering multiple roles", () => {
    const output = renderMarkdown(fullCapture(), { includeMetadata: true });

    // Contains metadata
    expect(output).toContain("**URL:**");

    // Contains header
    expect(output).toContain("## Main Header");

    // Contains nav items as bullets
    expect(output).toContain("- Home");
    expect(output).toContain("- About");

    // Contains section heading
    expect(output).toContain("### Content Area");

    // Contains button
    expect(output).toContain("**[Sign Up]**");

    // Contains footer separator
    expect(output).toContain("---");

    // Ends with newline
    expect(output.endsWith("\n")).toBe(true);
  });
});
