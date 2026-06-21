<p align="center"><img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/websketch-ir/readme.png" alt="WebSketch IR" width="500"></p>

<p align="center"><strong>Stop treating webpages like pictures.<br>A grammar-based IR that turns messy DOM into clean, typed UI primitives — built for LLMs.</strong></p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/websketch-ir/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/websketch-ir/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@mcptoolshop/websketch-ir"><img src="https://img.shields.io/npm/v/@mcptoolshop/websketch-ir.svg" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-20%2B-brightgreen.svg" alt="node 20+"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.3-blue.svg" alt="TypeScript"></a>
  <a href="https://mcp-tool-shop-org.github.io/websketch-ir/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

---

## What is this?

Most approaches to giving AI "eyes" on the web rely on screenshots and vision models. That works, but it's slow, expensive, and throws away all the structure that's already right there in the DOM.

**WebSketch IR** takes a different approach. It compiles the noisy, deeply-nested HTML of any web page down to a small, fixed vocabulary of 22 UI primitives — things like `BUTTON`, `NAV`, `CARD`, `FORM`, `INPUT`. The result is a lightweight JSON capture that an LLM can reason about directly, no vision required.

Think of it as an "assembly language" for web UIs. You get the structure, the geometry, the interactivity, and the semantics — without the `<div>` soup.

## Why would I use this?

- **You're building AI agents** that need to understand and interact with web pages without expensive vision API calls
- **You're designing AI-driven UI tools** where an LLM maps out event handlers, reactive state, and then generates or modifies layouts
- **You want structural diffs** — not pixel diffs — to detect when a page actually changed in a meaningful way
- **You need fingerprints** for caching, deduplication, or change detection across page captures

## Key Features

| Feature | What it does |
|---------|-------------|
| **22 UI Primitives** | Compiles any DOM into `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, `TABLE`, and 15 more — intent over implementation |
| **Event Handlers** | `HandlerSignal` captures what events a node responds to and why (e.g., `click → navigate`, `submit → validate_form`) |
| **Reactive State** | `StateSignal` tracks which state each node reads, writes, or conditions on — across local, global, and URL scopes |
| **Visual Intent** | `StyleIntent` tokens like `primary`, `destructive`, `elevated`, `ghost` describe *why* something looks the way it does, not the CSS |
| **Pattern Recognition** | `PatternSignal` identifies reusable compositions: `search_bar`, `auth_form`, `product_card`, `wizard_step`, `dashboard_widget`, and more |
| **HTML Codegen** | Emit semantic HTML from any capture — maps roles to proper elements with `data-wsk-*` attributes for handlers, state, style, and patterns |
| **ASCII Wireframes** | Render captures as text-based wireframes that LLMs can read without vision |
| **Structural Diffing** | Compare two captures by role + geometry + semantics, not DOM identity |
| **64-bit Fingerprinting** | FNV-1a 64-bit hashing for fast equality checks with extremely low collision probability |
| **Zero Dependencies** | Pure TypeScript, no runtime deps. ~43 KB on npm. Runs anywhere Node 20+ runs. |

## The Ecosystem

WebSketch IR is the core library. It's designed to slot into a larger toolchain:

| Package | What it's for |
|---------|--------------|
| **websketch-ir** *(this repo)* | Core grammar, validation, hashing, diffing, rendering, codegen |
| [websketch-vscode](https://github.com/mcp-tool-shop-org/websketch-vscode) | Capture pages right from VS Code |
| [websketch-cli](https://github.com/mcp-tool-shop-org/websketch-cli) | CLI for rendering, fingerprinting, and diffing captures |
| [websketch-extension](https://github.com/mcp-tool-shop-org/websketch-extension) | Chrome extension for in-browser capture |
| [websketch-mcp](https://github.com/mcp-tool-shop-org/websketch-mcp) | MCP server so LLM agents can capture and reason about pages |
| [websketch-demo](https://github.com/mcp-tool-shop-org/websketch-demo) | Interactive playground and visualization |

## Getting Started

```bash
npm install @mcptoolshop/websketch-ir
```

### Parse a capture and explore it

```typescript
import { parseCapture, renderAscii, fingerprintCapture, diff } from '@mcptoolshop/websketch-ir';

// Parse JSON into a validated capture (throws on invalid input)
const capture = parseCapture(jsonString);

// See it as an ASCII wireframe
console.log(renderAscii(capture));

// Get a stable fingerprint for caching or dedup
const fp = fingerprintCapture(capture);

// Compare two captures structurally
const changes = diff(captureA, captureB);
```

### Generate HTML from a capture

```typescript
import { emitHTML } from '@mcptoolshop/websketch-ir/codegen';

// Semantic HTML with data-wsk-* attributes for handlers, state, style, patterns
const html = emitHTML(capture, {
  includeHandlers: true,
  includeState: true,
  includeStyle: true,
  includePattern: true,
});
```

The output maps roles to proper HTML elements (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) and surfaces all signals as data attributes:

```html
<form class="wsk-form"
      data-wsk-pattern="auth_form"
      data-wsk-pattern-variant="login"
      data-wsk-state="form.email:readwrite@local; form.password:readwrite@local"
      data-wsk-on-submit="validate_form">
  <input class="wsk-input" type="text" data-wsk-bind-value="form.email" />
  <button class="wsk-button" data-wsk-style="primary" data-wsk-on-click="submit_form">
    Log In
  </button>
</form>
```

### Rendering modes for LLMs

```typescript
import { renderAscii, renderForLLM, renderStructure } from '@mcptoolshop/websketch-ir';

// Full wireframe (80×24 grid with box-drawing characters)
const wireframe = renderAscii(capture);

// LLM-optimized view with URL/viewport header and legend
const llmView = renderForLLM(capture);

// Compact structure-only view (no text, no semantics)
const structure = renderStructure(capture, 60, 16);
```

### Diffing

```typescript
import { diff, prepareDiff, formatDiff } from '@mcptoolshop/websketch-ir';

const result = diff(captureA, captureB, {
  matchThreshold: 0.5,   // min similarity to count as a match
  moveThreshold: 0.01,   // bbox movement below this is noise
  resizeThreshold: 0.01, // bbox resize below this is noise
});

console.log(formatDiff(result));
// result.summary.counts: { added, removed, moved, resized, text_changed, ... }

// Pre-process a capture for repeated diffs against multiple targets
const prepared = prepareDiff(captureA);
```

### Fingerprinting

```typescript
import { fingerprintCapture, fingerprintLayout } from '@mcptoolshop/websketch-ir';

// Full fingerprint (roles + geometry + text + handlers + state + patterns + viewport)
const fp = fingerprintCapture(capture);

// Layout-only (ignores text changes — useful for detecting structural shifts)
const layoutFp = fingerprintLayout(capture);

if (fingerprintCapture(a) === fingerprintCapture(b)) {
  console.log('Structurally identical');
}
```

### Import sub-paths

You can import just what you need to keep things light:

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### Tree traversal & builders

```typescript
import {
  flattenNodes,   // Collect every node into a flat array
  walkNodes,      // Depth-first visitor (callback per node)
  filterNodes,    // Return nodes matching a predicate
  createNode,     // Build a UINode with sensible defaults
  createCapture,  // Build a WebSketchCapture wrapper
  ROLES,          // All 22 role strings as a readonly array
} from '@mcptoolshop/websketch-ir';
```

### Query helpers

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### Markdown rendering

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### JSON renderer & LLM diff summary

Available from the `codegen` sub-path:

```typescript
import {
  renderJSON,        // Minimal JSON tree for LLM tool-calling
  formatDiffForLLM,  // One-paragraph natural-language diff summary
  RENDERERS,         // Registry: { html, ascii, llm, json, markdown }
} from '@mcptoolshop/websketch-ir/codegen';
```

## The Grammar at a Glance

Every captured page becomes a tree of `UINode` objects. Here's what each node can carry:

| Field | Type | Purpose |
|-------|------|---------|
| `role` | `UIRole` | One of 22 primitives: `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, etc. |
| `bbox` | `BBox01` | Viewport-relative bounding box `[x, y, w, h]` in `[0, 1]` range |
| `text` | `TextSignal` | Text shape: hash, length, classification (`short`, `sentence`, `paragraph`) — not the actual content |
| `handlers` | `HandlerSignal[]` | Event → intent mappings: `{ event: "click", intent: "toggle_menu" }` |
| `bindings` | `BindingSignal[]` | Reactive bindings: `{ property: "value", expression: "state.email" }` |
| `state` | `StateSignal[]` | State tracking: `{ key: "cart.items", access: "read", scope: "global" }` |
| `style` | `StyleIntent` | Visual intent tokens: `primary`, `destructive`, `elevated`, `muted`, `ghost`, etc. |
| `pattern` | `PatternSignal` | Reusable pattern: `{ kind: "auth_form", variant: "login", slot: "header" }` |
| `semantic` | `string` | Coarse hint like `"login"`, `"search"`, `"checkout"` |
| `interactive` | `boolean` | Can the user click/type on this? |
| `visible` | `boolean` | Is it actually on screen? |
| `children` | `UINode[]` | Nested child nodes (semantic grouping, not DOM children) |

### Pattern Kinds

Patterns let LLMs recognize higher-level compositions beyond individual roles:

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`

### Style Intent Tokens

Design-system-level visual markers (not CSS):

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`

## Schema Versioning

- **Current version**: `0.1`
- **Forward compatible**: unknown fields are silently ignored
- **Version check**: `isSupportedSchemaVersion("0.1")` → `true`
- **Unsupported input**: throws `WS_UNSUPPORTED_VERSION`

## Error Handling

Every error from this library is a `WebSketchException` carrying a structured `WebSketchError` payload with a canonical error code:

| Code | When it happens |
|------|-----------------|
| `WS_INVALID_JSON` | Input isn't valid JSON |
| `WS_INVALID_CAPTURE` | Capture fails schema validation |
| `WS_UNSUPPORTED_VERSION` | Capture version isn't supported |
| `WS_LIMIT_EXCEEDED` | Too many nodes or too deep |
| `WS_INVALID_ARGS` | Missing or bad arguments |
| `WS_NOT_FOUND` | Resource not found |
| `WS_IO_ERROR` | I/O failure |
| `WS_PERMISSION_DENIED` | Insufficient permissions |
| `WS_INTERNAL` | Something unexpected went wrong |

```typescript
import {
  parseCapture,          // Parse JSON string → validated WebSketchCapture (throws on invalid)
  validateCapture,       // Validate an already-parsed object (returns issues array)
  WebSketchException,    // Structured error class with code/message/hint
  isWebSketchException,
  formatWebSketchError,
} from '@mcptoolshop/websketch-ir';

try {
  const capture = parseCapture(untrustedJson);
} catch (err) {
  if (isWebSketchException(err)) {
    console.error(formatWebSketchError(err.ws));
    // [WS_INVALID_CAPTURE] Invalid capture: 3 validation issues found
    //   Details: root.bbox: Node bbox must have exactly 4 elements; ...
  }
}

// Or validate without throwing
const issues = validateCapture(parsedObject);
if (issues.length > 0) { /* handle issues */ }
```

## Security & Data Scope

This is a pure computational library. It's worth being explicit about what it does and doesn't do:

- **No network calls** — everything runs locally, fully offline
- **No filesystem access** — it only processes data you hand it
- **No telemetry** — nothing is collected, nothing is sent anywhere
- **No credentials** — it never touches auth tokens, cookies, or secrets
- **Prototype pollution guards** — untrusted JSON is sanitized before parsing

See [SECURITY.md](SECURITY.md) for responsible disclosure details.

## Docs

| Document | What's in it |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | Deep dive: grammar model, full API reference, diffing strategies, fingerprinting, integration patterns |
| [CHANGELOG.md](CHANGELOG.md) | Release history and migration notes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |
| [SHIP_GATE.md](SHIP_GATE.md) | Release checklist |

## License

MIT — see [LICENSE](LICENSE).

Part of [MCP Tool Shop](https://mcptoolshop.com).
