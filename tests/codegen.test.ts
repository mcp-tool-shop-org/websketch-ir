import { describe, it, expect } from "vitest";
import { emitHTML, emitNodeHTML, roleToElement } from "../src/index.js";
import { makeCapture, makeNode } from "./fixtures/index.js";
import type { UIRole } from "../src/index.js";

// =============================================================================
// roleToElement
// =============================================================================

describe("roleToElement", () => {
  it("maps BUTTON to <button>", () => {
    expect(roleToElement("BUTTON")).toBe("button");
  });

  it("maps NAV to <nav>", () => {
    expect(roleToElement("NAV")).toBe("nav");
  });

  it("maps HEADER to <header>", () => {
    expect(roleToElement("HEADER")).toBe("header");
  });

  it("maps FORM to <form>", () => {
    expect(roleToElement("FORM")).toBe("form");
  });

  it("maps INPUT to <input>", () => {
    expect(roleToElement("INPUT")).toBe("input");
  });

  it("maps CARD to <article>", () => {
    expect(roleToElement("CARD")).toBe("article");
  });

  it("maps MODAL to <dialog>", () => {
    expect(roleToElement("MODAL")).toBe("dialog");
  });

  it("maps IMAGE to <img>", () => {
    expect(roleToElement("IMAGE")).toBe("img");
  });

  it("maps UNKNOWN to <div>", () => {
    expect(roleToElement("UNKNOWN")).toBe("div");
  });

  it("maps LIST to <ul>", () => {
    expect(roleToElement("LIST")).toBe("ul");
  });

  it("maps TABLE to <table>", () => {
    expect(roleToElement("TABLE")).toBe("table");
  });

  const allRoles: UIRole[] = [
    "PAGE", "NAV", "HEADER", "FOOTER", "SECTION", "CARD", "LIST", "TABLE",
    "MODAL", "TOAST", "DROPDOWN", "FORM", "INPUT", "BUTTON", "LINK",
    "CHECKBOX", "RADIO", "ICON", "IMAGE", "TEXT", "PAGINATION", "UNKNOWN",
  ];

  it("every UIRole has a mapping", () => {
    for (const role of allRoles) {
      expect(roleToElement(role)).toBeTruthy();
    }
  });
});

// =============================================================================
// emitNodeHTML — basic element rendering
// =============================================================================

describe("emitNodeHTML basic rendering", () => {
  it("renders a button with role class", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<button");
    expect(html).toContain('class="wsk-button"');
    expect(html).toContain("</button>");
  });

  it("renders a self-closing input", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<input");
    expect(html).toContain("/>");
    expect(html).not.toContain("</input>");
  });

  it("renders a self-closing image", () => {
    const node = makeNode("IMAGE", [0.0, 0.0, 0.5, 0.5] as const);
    const html = emitNodeHTML(node);
    expect(html).toContain("<img");
    expect(html).toContain("/>");
  });

  it("includes bbox data attribute by default", () => {
    const node = makeNode("TEXT", [0.1, 0.2, 0.3, 0.4] as const);
    const html = emitNodeHTML(node);
    expect(html).toContain("data-wsk-bbox=");
    expect(html).toContain("0.100,0.200,0.300,0.400");
  });

  it("excludes bbox when includeBbox: false", () => {
    const node = makeNode("TEXT", [0.1, 0.2, 0.3, 0.4] as const);
    const html = emitNodeHTML(node, { includeBbox: false });
    expect(html).not.toContain("data-wsk-bbox");
  });

  it("includes semantic data attribute", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      semantic: "login",
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-semantic="login"');
  });

  it("renders disabled attribute for non-enabled nodes", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      enabled: false,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('disabled="disabled"');
  });
});

// =============================================================================
// emitNodeHTML — role-specific attributes
// =============================================================================

describe("emitNodeHTML role-specific attributes", () => {
  it("LINK gets href attribute", () => {
    const node = makeNode("LINK", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('href="#"');
  });

  it("CHECKBOX gets type=checkbox", () => {
    const node = makeNode("CHECKBOX", [0.1, 0.1, 0.05, 0.05] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('type="checkbox"');
  });

  it("RADIO gets type=radio", () => {
    const node = makeNode("RADIO", [0.1, 0.1, 0.05, 0.05] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('type="radio"');
  });

  it("INPUT gets type=text", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('type="text"');
  });

  it("MODAL gets open attribute", () => {
    const node = makeNode("MODAL", [0.2, 0.2, 0.6, 0.6] as const);
    const html = emitNodeHTML(node);
    expect(html).toContain('open="open"');
  });
});

// =============================================================================
// emitNodeHTML — handlers as data attributes
// =============================================================================

describe("emitNodeHTML handler data attributes", () => {
  it("includes handler intent as data-wsk-on-click", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit_form" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-on-click="submit_form"');
  });

  it("includes handler target in value", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "toggle", target: "menu_1" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-on-click="toggle:menu_1"');
  });

  it("includes multiple handlers as separate attributes", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      handlers: [
        { event: "click", intent: "submit_form" },
        { event: "hover", intent: "show_tooltip" },
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-on-click="submit_form"');
    expect(html).toContain('data-wsk-on-hover="show_tooltip"');
  });

  it("omits handler attributes when includeHandlers: false", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit_form" }],
    });
    const html = emitNodeHTML(node, { includeHandlers: false });
    expect(html).not.toContain("data-wsk-on-");
  });
});

// =============================================================================
// emitNodeHTML — bindings as data attributes
// =============================================================================

describe("emitNodeHTML binding data attributes", () => {
  it("includes binding as data-wsk-bind-*", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      bindings: [{ property: "value", expression: "state.username" }],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-bind-value="state.username"');
  });

  it("omits binding attributes when includeBindings: false", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      bindings: [{ property: "value", expression: "state.username" }],
    });
    const html = emitNodeHTML(node, { includeBindings: false });
    expect(html).not.toContain("data-wsk-bind-");
  });
});

// =============================================================================
// emitNodeHTML — tree structure
// =============================================================================

describe("emitNodeHTML tree rendering", () => {
  it("renders nested children with indentation", () => {
    const node = makeNode("NAV", [0, 0, 1, 0.1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.02, 0.15, 0.06] as const, {
          interactive: true,
          semantic: "home",
        }),
        makeNode("BUTTON", [0.3, 0.02, 0.15, 0.06] as const, {
          interactive: true,
          semantic: "about",
        }),
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<nav");
    expect(html).toContain("</nav>");
    // Two buttons inside
    const buttonCount = (html.match(/<button/g) ?? []).length;
    expect(buttonCount).toBe(2);
  });

  it("LIST children are wrapped in <li>", () => {
    const node = makeNode("LIST", [0, 0, 1, 0.5] as const, {
      children: [
        makeNode("CARD", [0, 0, 1, 0.15] as const),
        makeNode("CARD", [0, 0.2, 1, 0.15] as const),
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<ul");
    const liCount = (html.match(/<li>/g) ?? []).length;
    expect(liCount).toBe(2);
    expect(html).toContain("</li>");
  });

  it("TABLE children are wrapped in <tr><td>", () => {
    const node = makeNode("TABLE", [0, 0, 1, 0.5] as const, {
      children: [
        makeNode("TEXT", [0, 0, 0.5, 0.1] as const),
        makeNode("TEXT", [0, 0.1, 0.5, 0.1] as const),
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("<table");
    const trCount = (html.match(/<tr>/g) ?? []).length;
    expect(trCount).toBe(2);
  });
});

// =============================================================================
// emitHTML — full capture
// =============================================================================

describe("emitHTML capture rendering", () => {
  it("renders a minimal capture", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("HEADER", [0, 0, 1, 0.1] as const),
        makeNode("SECTION", [0, 0.1, 1, 0.8] as const),
        makeNode("FOOTER", [0, 0.9, 1, 0.1] as const),
      ],
    });
    const html = emitHTML(makeCapture(root));
    expect(html).toContain("<main");
    expect(html).toContain("<header");
    expect(html).toContain("<section");
    expect(html).toContain("<footer");
    expect(html).toContain("</main>");
  });

  it("fullDocument wraps in <!DOCTYPE html>", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const);
    const html = emitHTML(makeCapture(root), { fullDocument: true });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</html>");
  });

  it("fullDocument includes viewport meta", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const);
    const html = emitHTML(makeCapture(root), { fullDocument: true });
    expect(html).toContain("width=1920");
    expect(html).toContain("height=1080");
  });

  it("renders complex tree with handlers and bindings", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("NAV", [0, 0, 1, 0.08] as const, {
          children: [
            makeNode("BUTTON", [0.01, 0.01, 0.1, 0.06] as const, {
              interactive: true,
              semantic: "menu",
              handlers: [{ event: "click", intent: "toggle_menu", target: "sidebar" }],
            }),
          ],
        }),
        makeNode("FORM", [0.2, 0.3, 0.6, 0.4] as const, {
          semantic: "login",
          children: [
            makeNode("INPUT", [0.25, 0.35, 0.5, 0.05] as const, {
              interactive: true,
              semantic: "username",
              bindings: [{ property: "value", expression: "state.username" }],
            }),
            makeNode("INPUT", [0.25, 0.42, 0.5, 0.05] as const, {
              interactive: true,
              semantic: "password",
              bindings: [{ property: "value", expression: "state.password" }],
            }),
            makeNode("BUTTON", [0.35, 0.5, 0.3, 0.06] as const, {
              interactive: true,
              semantic: "submit",
              handlers: [{ event: "click", intent: "submit_form" }],
            }),
          ],
        }),
      ],
    });
    const html = emitHTML(makeCapture(root));
    expect(html).toContain('data-wsk-on-click="toggle_menu:sidebar"');
    expect(html).toContain('data-wsk-bind-value="state.username"');
    expect(html).toContain('data-wsk-on-click="submit_form"');
    expect(html).toContain('data-wsk-semantic="login"');
  });
});

// =============================================================================
// Options: includeRoleClass
// =============================================================================

describe("emitNodeHTML includeRoleClass option", () => {
  it("excludes class when includeRoleClass: false", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    const html = emitNodeHTML(node, { includeRoleClass: false });
    expect(html).not.toContain("class=");
  });
});

// =============================================================================
// HTML escaping
// =============================================================================

describe("emitNodeHTML escaping", () => {
  it("escapes special characters in semantic attribute", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      semantic: 'say "hello" & <bye>',
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("&quot;hello&quot;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;bye&gt;");
  });
});
