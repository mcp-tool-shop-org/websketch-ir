import { describe, it, expect } from "vitest";
import { emitHTML, emitNodeHTML, roleToElement } from "../src/index.js";
import type { UIRole } from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";

// =============================================================================
// roleToElement mapping completeness
// =============================================================================

describe("roleToElement mapping", () => {
  const expectedMappings: [UIRole, string][] = [
    ["PAGE", "main"],
    ["NAV", "nav"],
    ["HEADER", "header"],
    ["FOOTER", "footer"],
    ["SECTION", "section"],
    ["CARD", "article"],
    ["LIST", "ul"],
    ["TABLE", "table"],
    ["MODAL", "dialog"],
    ["TOAST", "aside"],
    ["DROPDOWN", "div"],
    ["FORM", "form"],
    ["INPUT", "input"],
    ["BUTTON", "button"],
    ["LINK", "a"],
    ["CHECKBOX", "input"],
    ["RADIO", "input"],
    ["ICON", "span"],
    ["IMAGE", "img"],
    ["TEXT", "p"],
    ["PAGINATION", "nav"],
    ["UNKNOWN", "div"],
  ];

  for (const [role, expected] of expectedMappings) {
    it(`maps ${role} → <${expected}>`, () => {
      expect(roleToElement(role)).toBe(expected);
    });
  }
});

// =============================================================================
// emitHTML basic output
// =============================================================================

describe("emitHTML basic output", () => {
  it("renders a minimal capture with <main> root", () => {
    const capture = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    const html = emitHTML(capture);
    expect(html).toContain("<main");
    expect(html).toContain("</main>");
  });

  it("emitNodeHTML renders standalone node", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      semantic: "go",
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<button");
    expect(html).toContain("</button>");
    expect(html).toContain("go"); // text content from semantic
  });
});

// =============================================================================
// Void elements
// =============================================================================

describe("void elements", () => {
  it("INPUT renders as self-closing", () => {
    const html = emitNodeHTML(makeNode("INPUT", [0, 0, 0.5, 0.05] as const, { interactive: true }));
    expect(html).toContain("<input");
    expect(html).toContain("/>");
    expect(html).not.toContain("</input>");
  });

  it("IMAGE renders as self-closing <img />", () => {
    const html = emitNodeHTML(makeNode("IMAGE", [0, 0, 0.5, 0.5] as const));
    expect(html).toContain("<img");
    expect(html).toContain("/>");
    expect(html).not.toContain("</img>");
  });

  it("CHECKBOX renders as self-closing input with type=checkbox", () => {
    const html = emitNodeHTML(makeNode("CHECKBOX", [0, 0, 0.05, 0.05] as const, { interactive: true }));
    expect(html).toContain("<input");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("/>");
  });

  it("RADIO renders as self-closing input with type=radio", () => {
    const html = emitNodeHTML(makeNode("RADIO", [0, 0, 0.05, 0.05] as const, { interactive: true }));
    expect(html).toContain("<input");
    expect(html).toContain('type="radio"');
    expect(html).toContain("/>");
  });
});

// =============================================================================
// fullDocument mode
// =============================================================================

describe("fullDocument mode", () => {
  it("wraps in <!DOCTYPE html> and <html> structure", () => {
    const capture = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    const html = emitHTML(capture, { fullDocument: true });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</html>");
  });

  it("includes viewport meta in head", () => {
    const capture = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    const html = emitHTML(capture, { fullDocument: true });
    expect(html).toContain("width=1920");
    expect(html).toContain("height=1080");
  });

  it("includes URL as title", () => {
    const capture = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const), {
      url: "https://test.example.com/page",
    });
    const html = emitHTML(capture, { fullDocument: true });
    expect(html).toContain("<title>https://test.example.com/page</title>");
  });
});

// =============================================================================
// Attribute escaping with special chars
// =============================================================================

describe("attribute escaping", () => {
  it("escapes double quotes in semantic attr", () => {
    const node = makeNode("BUTTON", [0, 0, 0.3, 0.1] as const, {
      interactive: true,
      semantic: 'say "hello"',
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("&quot;hello&quot;");
  });

  it("escapes ampersand in semantic attr", () => {
    const node = makeNode("BUTTON", [0, 0, 0.3, 0.1] as const, {
      interactive: true,
      semantic: "A & B",
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("A &amp; B");
  });

  it("escapes angle brackets in semantic attr", () => {
    const node = makeNode("BUTTON", [0, 0, 0.3, 0.1] as const, {
      interactive: true,
      semantic: "<script>",
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes text content in body", () => {
    const node = makeNode("TEXT", [0, 0, 0.5, 0.1] as const, {
      semantic: "a < b & c > d",
    });
    const html = emitNodeHTML(node);
    // Text content (not attr) uses escapeHTML which escapes &, <, >
    expect(html).toContain("a &lt; b &amp; c &gt; d");
  });
});

// =============================================================================
// Handler data attributes
// =============================================================================

describe("handler data attributes", () => {
  it("single handler becomes data-wsk-on-{event}", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "do_something" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-on-click="do_something"');
  });

  it("handler with target includes target in value", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "toggle", target: "sidebar" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-on-click="toggle:sidebar"');
  });

  it("multiple handlers for same event concatenated with ;", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      handlers: [
        { event: "click", intent: "validate" },
        { event: "click", intent: "submit" },
      ],
    });
    const html = emitNodeHTML(node);
    // Both intents on same event get joined with "; "
    expect(html).toContain("data-wsk-on-click=");
    expect(html).toContain("submit");
    expect(html).toContain("validate");
  });

  it("includeHandlers: false omits handler attrs", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit" }],
    });
    const html = emitNodeHTML(node, { includeHandlers: false });
    expect(html).not.toContain("data-wsk-on-");
  });
});

// =============================================================================
// Binding data attributes
// =============================================================================

describe("binding data attributes", () => {
  it("binding renders as data-wsk-bind-{property}", () => {
    const node = makeNode("INPUT", [0, 0, 0.3, 0.05] as const, {
      interactive: true,
      bindings: [{ property: "value", expression: "state.name" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-bind-value="state.name"');
  });

  it("includeBindings: false omits binding attrs", () => {
    const node = makeNode("INPUT", [0, 0, 0.3, 0.05] as const, {
      interactive: true,
      bindings: [{ property: "value", expression: "state.name" }],
    });
    const html = emitNodeHTML(node, { includeBindings: false });
    expect(html).not.toContain("data-wsk-bind-");
  });
});

// =============================================================================
// State signal data attributes
// =============================================================================

describe("state signal data attributes", () => {
  it("state renders as data-wsk-state", () => {
    const node = makeNode("INPUT", [0, 0, 0.3, 0.05] as const, {
      interactive: true,
      state: [{ key: "form.email", access: "readwrite", scope: "local" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("data-wsk-state=");
    expect(html).toContain("form.email:readwrite@local");
  });

  it("includeState: false omits state attrs", () => {
    const node = makeNode("INPUT", [0, 0, 0.3, 0.05] as const, {
      interactive: true,
      state: [{ key: "form.email", access: "read" }],
    });
    const html = emitNodeHTML(node, { includeState: false });
    expect(html).not.toContain("data-wsk-state");
  });
});

// =============================================================================
// Style intent data attributes
// =============================================================================

describe("style intent data attributes", () => {
  it("style tokens render as data-wsk-style", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"] },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("data-wsk-style=");
    // Tokens are sorted
    expect(html).toContain("elevated primary");
  });

  it("density renders as data-wsk-density", () => {
    const node = makeNode("SECTION", [0, 0, 1, 0.5] as const, {
      style: { tokens: ["muted"], density: "compact" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-density="compact"');
  });

  it("size renders as data-wsk-size", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      style: { tokens: ["primary"], size: "lg" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-size="lg"');
  });

  it("includeStyle: false omits style attrs", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      style: { tokens: ["primary"] },
    });
    const html = emitNodeHTML(node, { includeStyle: false });
    expect(html).not.toContain("data-wsk-style");
    expect(html).not.toContain("data-wsk-density");
    expect(html).not.toContain("data-wsk-size");
  });
});

// =============================================================================
// Pattern signal data attributes
// =============================================================================

describe("pattern signal data attributes", () => {
  it("pattern kind renders as data-wsk-pattern", () => {
    const node = makeNode("FORM", [0, 0, 0.8, 0.8] as const, {
      pattern: { kind: "auth_form" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern="auth_form"');
  });

  it("pattern name renders as data-wsk-pattern-name", () => {
    const node = makeNode("FORM", [0, 0, 0.8, 0.8] as const, {
      pattern: { kind: "auth_form", name: "login-form" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern-name="login-form"');
  });

  it("pattern variant renders as data-wsk-pattern-variant", () => {
    const node = makeNode("FORM", [0, 0, 0.8, 0.8] as const, {
      pattern: { kind: "auth_form", variant: "registration" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern-variant="registration"');
  });

  it("pattern slot renders as data-wsk-pattern-slot", () => {
    const node = makeNode("SECTION", [0, 0, 0.8, 0.3] as const, {
      pattern: { kind: "wizard_step", slot: "step-2" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern-slot="step-2"');
  });

  it("includePattern: false omits pattern attrs", () => {
    const node = makeNode("FORM", [0, 0, 0.8, 0.8] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const html = emitNodeHTML(node, { includePattern: false });
    expect(html).not.toContain("data-wsk-pattern");
  });
});

// =============================================================================
// LIST wrapping
// =============================================================================

describe("LIST wrapping", () => {
  it("children of LIST are wrapped in <li>", () => {
    const node = makeNode("LIST", [0, 0, 1, 0.5] as const, {
      children: [
        makeNode("CARD", [0, 0, 1, 0.1] as const),
        makeNode("CARD", [0, 0.15, 1, 0.1] as const),
        makeNode("CARD", [0, 0.3, 1, 0.1] as const),
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<ul");
    const liCount = (html.match(/<li>/g) ?? []).length;
    expect(liCount).toBe(3);
    const liCloseCount = (html.match(/<\/li>/g) ?? []).length;
    expect(liCloseCount).toBe(3);
  });
});

// =============================================================================
// TABLE wrapping
// =============================================================================

describe("TABLE wrapping", () => {
  it("children of TABLE are wrapped in <tr><td>", () => {
    const node = makeNode("TABLE", [0, 0, 1, 0.5] as const, {
      children: [
        makeNode("TEXT", [0, 0, 0.5, 0.05] as const),
        makeNode("TEXT", [0, 0.1, 0.5, 0.05] as const),
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<table");
    const trCount = (html.match(/<tr>/g) ?? []).length;
    expect(trCount).toBe(2);
    const tdCount = (html.match(/<td>/g) ?? []).length;
    expect(tdCount).toBe(2);
  });
});

// =============================================================================
// Disabled attribute
// =============================================================================

describe("disabled attribute", () => {
  it("enabled: false renders disabled attribute", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      enabled: false,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('disabled="disabled"');
  });

  it("enabled: true does not render disabled", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
      enabled: true,
    });
    const html = emitNodeHTML(node);
    expect(html).not.toContain("disabled");
  });

  it("enabled: undefined does not render disabled", () => {
    const node = makeNode("BUTTON", [0, 0, 0.2, 0.1] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).not.toContain("disabled");
  });
});

// =============================================================================
// HTML well-formedness (balanced tags)
// =============================================================================

/**
 * Count opening and closing tags for non-void elements in an HTML string.
 * Void elements (input, img, br, hr, meta, link) are excluded.
 */
function countTags(html: string): { opening: number; closing: number } {
  const voidElements = /^(input|img|br|hr|meta|link|area|base|col|embed|source|track|wbr)$/i;
  const openingMatches = html.match(/<([a-z][a-z0-9]*)\b[^>]*(?<!\/)>/gi) ?? [];
  const closingMatches = html.match(/<\/([a-z][a-z0-9]*)\s*>/gi) ?? [];

  // Filter out void elements from opening tags
  const opening = openingMatches.filter((tag) => {
    const name = tag.match(/^<([a-z][a-z0-9]*)/i)?.[1] ?? "";
    return !voidElements.test(name);
  });

  return { opening: opening.length, closing: closingMatches.length };
}

describe("HTML well-formedness (balanced tags)", () => {
  it("simple page has balanced opening and closing tags", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("HEADER", [0, 0, 1, 0.1] as const),
          makeNode("SECTION", [0, 0.1, 1, 0.8] as const, {
            children: [
              makeNode("BUTTON", [0.1, 0.2, 0.2, 0.05] as const, { interactive: true, semantic: "go" }),
              makeNode("TEXT", [0.1, 0.3, 0.5, 0.1] as const),
            ],
          }),
          makeNode("FOOTER", [0, 0.9, 1, 0.1] as const),
        ],
      })
    );
    const html = emitHTML(capture);
    const { opening, closing } = countTags(html);
    expect(opening).toBe(closing);
    expect(opening).toBeGreaterThan(0);
  });

  it("nested list with cards has balanced tags", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("LIST", [0, 0, 1, 0.6] as const, {
            children: [
              makeNode("CARD", [0, 0, 1, 0.15] as const, {
                children: [
                  makeNode("TEXT", [0.1, 0.02, 0.8, 0.05] as const),
                  makeNode("BUTTON", [0.1, 0.08, 0.2, 0.04] as const, { interactive: true }),
                ],
              }),
              makeNode("CARD", [0, 0.2, 1, 0.15] as const),
            ],
          }),
        ],
      })
    );
    const html = emitHTML(capture);
    const { opening, closing } = countTags(html);
    expect(opening).toBe(closing);
  });

  it("fullDocument mode produces balanced tags", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.1, 0.1, 0.8, 0.5] as const, {
            children: [
              makeNode("INPUT", [0.1, 0.15, 0.6, 0.05] as const, { interactive: true }),
              makeNode("CHECKBOX", [0.1, 0.25, 0.05, 0.05] as const, { interactive: true }),
              makeNode("BUTTON", [0.3, 0.35, 0.2, 0.05] as const, { interactive: true }),
            ],
          }),
        ],
      })
    );
    const html = emitHTML(capture, { fullDocument: true });
    const { opening, closing } = countTags(html);
    expect(opening).toBe(closing);
    expect(opening).toBeGreaterThan(3); // html, head, body, main, form, button at minimum
  });
});

// =============================================================================
// Each EmitHTMLOptions flag
// =============================================================================

describe("EmitHTMLOptions flags", () => {
  it("includeBbox: false removes bbox attribute", () => {
    const node = makeNode("TEXT", [0.1, 0.2, 0.3, 0.4] as const);
    const html = emitNodeHTML(node, { includeBbox: false });
    expect(html).not.toContain("data-wsk-bbox");
  });

  it("includeSemantics: false removes semantic attribute", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      semantic: "submit",
    });
    const html = emitNodeHTML(node, { includeSemantics: false });
    expect(html).not.toContain("data-wsk-semantic");
  });

  it("includeRoleClass: false removes class", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node, { includeRoleClass: false });
    expect(html).not.toContain("class=");
  });

  it("custom indent string is respected", () => {
    const node = makeNode("NAV", [0, 0, 1, 0.1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.02, 0.15, 0.06] as const, { interactive: true }),
      ],
    });
    const html = emitNodeHTML(node, { indent: "\t" });
    expect(html).toContain("\t<button");
  });
});
