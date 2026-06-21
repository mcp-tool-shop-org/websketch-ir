---
title: For Beginners
description: New to WebSketch IR? Start here for a gentle introduction.
sidebar:
  order: 1
---

## What is this tool?

WebSketch IR is a TypeScript library that transforms messy DOM trees into a compact, typed representation of web page UI. Instead of working with raw HTML (thousands of nested `<div>` elements, framework wrappers, and inline styles), you get a clean tree of 22 semantic primitives like `BUTTON`, `NAV`, `CARD`, and `INPUT`.

The "IR" stands for Intermediate Representation -- it sits between the raw DOM and whatever you want to do with it (feed it to an LLM, diff two page states, generate code, or fingerprint a layout).

Most approaches to giving AI "eyes" on the web rely on screenshots and vision models. That works, but it is slow, expensive, and throws away all the structure already present in the DOM. WebSketch IR solves this by compiling the DOM into semantic primitives that preserve structure, geometry, interactivity, and meaning -- without the `<div>` soup.

### Key idea

A web page captured as WebSketch IR preserves *what the page does* (layout, interactive elements, semantic structure) without carrying *what it says* (raw text content, CSS values, pixel data). Text is stored as hashes, positions are normalized to `[0, 1]` viewport coordinates, and every node is classified by its UI role rather than its HTML tag.

## Who is this for?

- **AI agent developers** building tools that navigate and interact with web pages without expensive vision API calls
- **UI testing teams** that need structural diffs instead of pixel diffs for regression detection
- **LLM tool builders** who want to give their models a lightweight, structured view of any web page
- **Frontend developers** exploring how to represent UI structure for code generation or design system analysis

If you are building anything that needs to programmatically understand the layout and interactivity of a web page, this library is for you.

## Prerequisites

Before you start, make sure you have:

- **Node.js 18** or later installed (`node --version` to check)
- **npm** (or any compatible package manager like pnpm or yarn)
- Basic familiarity with TypeScript or JavaScript (you should be comfortable with imports, async/await, and JSON)
- A terminal or command prompt you can run commands in
- No runtime dependencies are required -- the library is self-contained (~43 KB on npm)

## Your first 5 minutes

Follow these steps to go from zero to a working capture in under five minutes.

**Step 1: Install the library**

```bash
npm install @mcptoolshop/websketch-ir
```

The library is pure ESM. If you are using CommonJS, you will need a dynamic `import()` call, or set `"type": "module"` in your `package.json`.

**Step 2: Create a capture by hand**

In a real project, captures come from the [Chrome extension](https://github.com/mcp-tool-shop-org/websketch-extension) or [MCP server](https://github.com/mcp-tool-shop-org/websketch-mcp). For this walkthrough, build one manually:

```typescript
import {
  parseCapture,
  renderAscii,
  fingerprintCapture,
  diff,
  formatDiff,
} from '@mcptoolshop/websketch-ir';

const captureJson = JSON.stringify({
  version: '0.1',
  url: 'https://example.com',
  timestamp_ms: Date.now(),
  viewport: { w_px: 1280, h_px: 720, aspect: 1.78 },
  compiler: { name: 'websketch-ir', version: '2.0.1', options_hash: 'demo' },
  root: {
    id: 'page',
    role: 'PAGE',
    bbox: [0, 0, 1, 1],
    interactive: false,
    visible: true,
    children: [
      {
        id: 'nav',
        role: 'NAV',
        bbox: [0, 0, 1, 0.08],
        interactive: false,
        visible: true,
        semantic: 'main_nav',
        children: [
          { id: 'logo', role: 'IMAGE', bbox: [0.01, 0.01, 0.1, 0.06], interactive: false, visible: true },
          { id: 'login', role: 'BUTTON', bbox: [0.85, 0.02, 0.12, 0.04], interactive: true, visible: true, semantic: 'login' },
        ],
      },
      {
        id: 'hero',
        role: 'SECTION',
        bbox: [0, 0.08, 1, 0.5],
        interactive: false,
        visible: true,
        semantic: 'hero',
      },
    ],
  },
});
```

**Step 3: Parse and render**

```typescript
const capture = parseCapture(captureJson);

// ASCII wireframe -- see the page layout in your terminal
console.log(renderAscii(capture));
```

**Step 4: Fingerprint it**

```typescript
const fp = fingerprintCapture(capture);
console.log('Fingerprint:', fp);
// A 16-character hex string that changes only when the structure changes
```

**Step 5: Diff two captures**

```typescript
const modified = JSON.parse(captureJson);
modified.root.children[0].children[1].bbox = [0.80, 0.02, 0.15, 0.04];

const captureB = parseCapture(JSON.stringify(modified));
const result = diff(capture, captureB);

console.log(formatDiff(result));
// Shows that the BUTTON moved and resized
```

## Common mistakes

**Forgetting required fields on nodes.** Every `UINode` must have `id`, `role`, `bbox`, `interactive`, and `visible`. Omitting any of these produces a `WS_INVALID_CAPTURE` error. The error message includes an `issues` array pointing to exactly which fields failed.

**Using CommonJS `require()` instead of ESM `import`.** WebSketch IR is ESM-only. If your project uses CommonJS, either switch to `"type": "module"` in your `package.json` or use dynamic `import()`:

```typescript
const { parseCapture } = await import('@mcptoolshop/websketch-ir');
```

**Expecting identical fingerprints across different viewport sizes.** Fingerprints include the viewport aspect ratio. If you captured the same page at 1280x720 and 1920x1080, the fingerprints will differ. Use `fingerprintLayout` if you want to ignore text changes, but note that viewport differences still produce different hashes.

**Passing raw objects instead of JSON strings to `parseCapture`.** The function expects a JSON string, not a parsed object. If you already have a JavaScript object, stringify it first: `parseCapture(JSON.stringify(myObj))`.

**Exceeding node limits on complex pages.** Very large pages may hit the default limit of 10,000 nodes. Pass custom limits to raise the threshold:

```typescript
const capture = parseCapture(json, { maxNodes: 50_000, maxDepth: 100 });
```

## Next steps

Now that you have parsed your first capture, explore these handbook pages to go deeper:

- [Getting Started](/websketch-ir/handbook/getting-started/) -- more detail on installation and use cases
- [Grammar](/websketch-ir/handbook/grammar/) -- the full set of 22 UI primitives, signals, and patterns
- [API Reference](/websketch-ir/handbook/api-reference/) -- every function, type, and option
- [Diffing & Fingerprinting](/websketch-ir/handbook/diffing-and-fingerprinting/) -- structural comparison strategies
- [Codegen & Rendering](/websketch-ir/handbook/codegen-and-rendering/) -- HTML output, ASCII wireframes, LLM views

For real-world capture workflows, check out the ecosystem tools:

| Tool | What it does |
|------|-------------|
| [websketch-cli](https://github.com/mcp-tool-shop-org/websketch-cli) | CLI for rendering, fingerprinting, and diffing captures |
| [websketch-extension](https://github.com/mcp-tool-shop-org/websketch-extension) | Chrome extension for in-browser capture |
| [websketch-mcp](https://github.com/mcp-tool-shop-org/websketch-mcp) | MCP server so LLM agents can capture pages |
| [websketch-vscode](https://github.com/mcp-tool-shop-org/websketch-vscode) | Capture pages right from VS Code |

## Glossary

- **Bbox (BBox01)** -- Bounding box normalized to viewport coordinates. Four numbers `[x, y, w, h]` where each value is in the range `[0, 1]`. `(0, 0)` is the top-left corner of the viewport.
- **Capture (WebSketchCapture)** -- The top-level artifact containing a URL, viewport metadata, compiler info, and a tree of UI nodes rooted at a `PAGE` node.
- **Codegen** -- Code generation. The process of emitting semantic HTML (or other formats) from a capture tree.
- **Fingerprint** -- A 16-character hex string produced by FNV-1a 64-bit hashing of the capture's structural content. Used for fast equality checks and deduplication.
- **Handler signal** -- Describes what event a node responds to and the intent behind it (e.g., `click` with intent `navigate`).
- **IR (Intermediate Representation)** -- A structured format between the raw DOM and downstream consumers. WebSketch IR is the specific IR defined by this library.
- **Pattern signal** -- Identifies a node as part of a reusable UI composition like `auth_form`, `search_bar`, or `product_card`.
- **Role (UIRole)** -- One of 22 fixed primitives (`PAGE`, `BUTTON`, `NAV`, `CARD`, etc.) that classify what a node does, regardless of its HTML tag.
- **Signal** -- Optional metadata attached to a node describing behavior, state, visual intent, text shape, or patterns.
- **State signal** -- Describes what reactive state a node reads, writes, or conditions its behavior on.
- **Style intent** -- Design-system-level visual tokens like `primary`, `destructive`, or `ghost` that describe *why* something looks the way it does, not the CSS behind it.
- **UINode** -- A single primitive in the layout tree. Not a DOM node -- it is a compiled representation of UI intent.
