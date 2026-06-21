# WebSketch IR Handbook

A deep-dive guide to the grammar model, API surface, and integration patterns for `@mcptoolshop/websketch-ir`.

---

## Table of Contents

1. [What is WebSketch IR?](#what-is-websketch-ir)
2. [Why not screenshots or DOM dumps?](#why-not-screenshots-or-dom-dumps)
3. [The grammar model](#the-grammar-model)
4. [How captures work](#how-captures-work)
5. [API reference](#api-reference)
6. [Rendering modes](#rendering-modes)
7. [Diffing algorithm](#diffing-algorithm)
8. [Fingerprinting](#fingerprinting)
9. [Error handling](#error-handling)
10. [Resource limits](#resource-limits)
11. [Integration patterns](#integration-patterns)
12. [FAQ](#faq)

---

## What is WebSketch IR?

WebSketch IR is a structured intermediate representation of web page UI. It transforms complex DOM trees into a compact grammar of semantic primitives -- roles like `BUTTON`, `NAV`, `CARD`, and `INPUT` -- with normalized bounding-box geometry, text signals, and interactivity flags.

The result is a machine-readable artifact that captures what a page *does* (layout, interactive elements, semantic structure) without carrying what a page *says* (raw text content, styles, pixel data).

Think of it as a blueprint: architects share blueprints, not photographs, because blueprints encode structure and intent in a way that is easy to compare, version, and reason about. WebSketch IR does the same for web UI.

### Core principles

1. **Rendered layout is truth.** Positions come from `getBoundingClientRect`, not DOM order.
2. **UI intent over DOM structure.** A `<div class="btn">` and a `<button>` both compile to `BUTTON`.
3. **Normalize aggressively.** Strip stylistic noise; keep geometry, interactivity, and semantics.
4. **Stable under div soup.** Wrapper `<div>` elements that add no semantic value collapse away.

---

## Why not screenshots or DOM dumps?

### Screenshots

| Concern | Screenshot | WebSketch IR |
|---------|-----------|-------------|
| Token cost | Thousands of vision tokens per image | Tens of text tokens per node |
| Determinism | Pixel-level variation across renders | Deterministic from same DOM state |
| Diffability | Pixel-diff is noisy and expensive | Structural diff with semantic labels |
| Interactivity | Not captured | Explicit `interactive` and `focusable` flags |
| Privacy | May contain PII in rendered text | Text stored as hashes, not content |

Screenshots require a vision model, cost significantly more tokens, and cannot distinguish between a button that *looks like* a link and one that *is* a link.

### DOM dumps

| Concern | Raw DOM | WebSketch IR |
|---------|---------|-------------|
| Size | Tens of thousands of nodes | Hundreds of semantic primitives |
| Noise | Framework wrappers, style attrs, SVG paths | Compiled to fixed vocabulary |
| Stability | Class names and IDs change between deploys | Geometry + role is deploy-stable |
| Portability | Framework-specific (React fiber, Angular zones) | Framework-agnostic |

A typical React app emits dozens of `<div>` wrappers per visible component. WebSketch IR collapses these into the smallest tree that preserves layout meaning.

---

## The grammar model

### UIRole -- the primitive vocabulary

Every node in the tree is assigned exactly one role from a fixed set of 22 primitives:

**Layout containers:**
`PAGE`, `NAV`, `HEADER`, `FOOTER`, `SECTION`, `CARD`, `LIST`, `TABLE`

**Overlays:**
`MODAL`, `TOAST`, `DROPDOWN`

**Interactive primitives:**
`FORM`, `INPUT`, `BUTTON`, `LINK`, `CHECKBOX`, `RADIO`, `ICON`

**Content:**
`IMAGE`, `TEXT`

**Pagination:**
`PAGINATION`

**Fallback:**
`UNKNOWN`

This vocabulary is intentionally small. It covers approximately 95% of real-world UI patterns. The goal is *intent*, not HTML element type -- a `<div role="button">` and a `<button>` both become `BUTTON`.

### BBox01 -- viewport-relative geometry

Every node carries a bounding box normalized to the viewport:

```
type BBox01 = readonly [x: number, y: number, w: number, h: number]
```

All values are in the range `[0, 1]` where `(0, 0)` is the top-left corner of the viewport. This normalization makes coordinates invariant across device pixel ratios, so the same page captured on a Retina display and a standard display produces the same geometry.

### UINode -- the core primitive

A `UINode` is the fundamental building block:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Stable ID within capture (content-addressed or path-based) |
| `role` | `UIRole` | Yes | Semantic primitive type |
| `bbox` | `BBox01` | Yes | Viewport-relative bounding box |
| `interactive` | `boolean` | Yes | Can receive user interaction |
| `visible` | `boolean` | Yes | Currently visible in viewport |
| `semantic` | `string` | No | Coarse semantic hint (e.g., `"login"`, `"search"`, `"primary_cta"`) |
| `name_hash` | `string` | No | Hash of aria-label/name/id (not the actual value) |
| `text` | `TextSignal` | No | Text content signal (hash + length + classification) |
| `z` | `number` | No | Coarse z-index bucket (0-10) |
| `enabled` | `boolean` | No | Not disabled |
| `focusable` | `boolean` | No | Can receive keyboard focus |
| `children` | `UINode[]` | No | Child nodes (semantic grouping) |
| `flags` | `UINodeFlags` | No | Behavior/state flags (`sticky`, `scrollable`, `repeated`) |

### TextSignal -- content without content

Text is never stored as raw content. Instead, each node carries a `TextSignal`:

| Field | Type | Description |
|-------|------|-------------|
| `hash` | `string` | SHA-256 hash of normalized text |
| `len` | `number` | Character length of normalized text |
| `kind` | `TextKind` | Classification: `"none"`, `"short"`, `"sentence"`, `"paragraph"`, `"mixed"` |

This preserves enough information for structural comparison and diff detection while keeping the representation privacy-safe and compact.

### ViewportMeta

The viewport at the time of capture:

| Field | Type | Description |
|-------|------|-------------|
| `w_px` | `number` | Viewport width in CSS pixels |
| `h_px` | `number` | Viewport height in CSS pixels |
| `aspect` | `number` | Aspect ratio (`w_px / h_px`) |
| `scroll_y01` | `number` | Scroll position normalized to `[0, 1]` (optional) |

### Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `MAX_DEPTH` | `8` | Maximum tree depth |
| `MAX_CHILDREN` | `200` | Maximum children per node (overflow is summarized) |
| `BBOX_QUANT_STEP` | `0.001` | Quantization step for bbox hashing (~1px at 1000px viewport) |
| `COLLAPSE_TOLERANCE` | `0.002` | Nodes within this bbox difference are considered equal (~2px at 1000px) |

---

## How captures work

A `WebSketchCapture` is the top-level serializable artifact produced by the Chrome extension (or any compatible compiler):

```json
{
  "version": "0.1",
  "url": "https://example.com",
  "timestamp_ms": 1708300000000,
  "viewport": {
    "w_px": 1280,
    "h_px": 720,
    "aspect": 1.78
  },
  "compiler": {
    "name": "websketch-ir",
    "version": "0.3.1",
    "options_hash": "a1b2c3d4"
  },
  "root": {
    "id": "page_root",
    "role": "PAGE",
    "bbox": [0, 0, 1, 1],
    "interactive": false,
    "visible": true,
    "children": [
      {
        "id": "nav_01",
        "role": "NAV",
        "bbox": [0, 0, 1, 0.08],
        "interactive": false,
        "visible": true,
        "semantic": "main_nav",
        "children": []
      }
    ]
  }
}
```

### Schema versioning

The `version` field tracks the capture schema, not the library version. Current version is `"0.1"`.

- **Patch changes** (0.1 stays 0.1): new optional fields only.
- **Minor changes** (0.1 to 0.2): new required fields may appear, but old captures remain valid via defaults.
- **Major changes** (0.x to 1.0): breaking. Old captures may not validate.

Forward compatibility rule: unknown fields are ignored. Consumers MUST tolerate fields they do not recognize.

---

## API reference

### parseCapture(json, limits?)

Parse a JSON string into a validated `WebSketchCapture`. Throws `WebSketchException` on any error.

```typescript
function parseCapture(json: string, limits?: Partial<WebSketchLimits>): WebSketchCapture
```

Error mapping:
- `SyntaxError` becomes `WS_INVALID_JSON`
- Schema violations become `WS_INVALID_CAPTURE` (with an `issues` array)
- Unsupported version becomes `WS_UNSUPPORTED_VERSION`
- Exceeded limits become `WS_LIMIT_EXCEEDED`

### validateCapture(data, limits?)

Validate a parsed object against the `WebSketchCapture` schema. Returns an array of validation issues (empty array means valid). Does not throw.

```typescript
function validateCapture(data: unknown, limits?: Partial<WebSketchLimits>): WebSketchValidationIssue[]
```

Each issue contains `path`, `expected`, `received`, and `message` fields for precise diagnostics.

### renderAscii(capture, options?)

Render a capture to a fixed-size ASCII wireframe grid.

```typescript
function renderAscii(capture: WebSketchCapture, options?: AsciiRenderOptions): string
```

Options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | `80` | Grid width in characters |
| `height` | `number` | `24` | Grid height in characters |
| `showRoles` | `UIRole[]` | Important roles | Which roles to render |
| `showSemantics` | `boolean` | `true` | Show semantic labels |
| `showTextLen` | `boolean` | `true` | Show text length indicators |
| `borderStyle` | `"box" \| "ascii" \| "none"` | `"box"` | Border drawing style |
| `showLegend` | `boolean` | `false` | Append role abbreviation legend |

### renderForLLM(capture)

Render an LLM-optimized view with URL, viewport, timestamp header, full-detail ASCII body, and role legend footer.

```typescript
function renderForLLM(capture: WebSketchCapture): string
```

### renderStructure(capture, width?, height?)

Render a minimal structure-only view. No semantics, no text indicators, ASCII-style borders. Useful for quick visual comparison.

```typescript
function renderStructure(capture: WebSketchCapture, width?: number, height?: number): string
```

### diff(captureA, captureB, options?)

Compute a structural diff between two captures. Returns a `DiffResult` with summary counts, all changes, and the top N most significant changes ranked by visual area.

```typescript
function diff(captureA: WebSketchCapture, captureB: WebSketchCapture, options?: DiffOptions): DiffResult
```

Options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeText` | `boolean` | `true` | Include text hash in matching |
| `includeName` | `boolean` | `true` | Include name hash in matching |
| `matchThreshold` | `number` | `0.5` | Minimum similarity to consider a match |
| `topChangesLimit` | `number` | `10` | Max changes in `topChanges` |
| `moveThreshold` | `number` | `0.01` | Bbox movement below this is noise |
| `resizeThreshold` | `number` | `0.01` | Bbox resize below this is noise |

### formatDiff(result) / formatDiffJson(result)

Format a `DiffResult` as human-readable text or JSON.

```typescript
function formatDiff(result: DiffResult): string
function formatDiffJson(result: DiffResult): string
```

### fingerprintCapture(capture)

Compute a full structural fingerprint of a capture. Includes roles, geometry, text hashes, and viewport aspect ratio.

```typescript
function fingerprintCapture(capture: WebSketchCapture): string
```

### fingerprintLayout(capture)

Compute a layout-only fingerprint. Ignores text content and name hashes. Useful for detecting structural changes while ignoring content updates.

```typescript
function fingerprintLayout(capture: WebSketchCapture): string
```

### isSupportedSchemaVersion(version)

Check whether a schema version string is supported by this version of the library.

```typescript
function isSupportedSchemaVersion(version: unknown): version is string
```

### formatWebSketchError(err)

Format a `WebSketchError` as a multi-line, human-readable string with code, message, details, path, expected/received, hint, and cause.

```typescript
function formatWebSketchError(err: WebSketchError): string
```

### isWebSketchException(err)

Type guard for `WebSketchException`.

```typescript
function isWebSketchException(err: unknown): err is WebSketchException
```

---

## Rendering modes

WebSketch IR ships three rendering functions, each optimized for a different consumer.

### ASCII wireframe (`renderAscii`)

The default renderer. Produces a fixed-size grid (80x24 by default) with box-drawing borders for containers and bracket labels for interactive elements.

Role abbreviations keep labels compact: `BTN` for `BUTTON`, `INP` for `INPUT`, `NAV` for `NAV`, and so on. Semantic hints appear after a colon (`[BTN:login]`). Text length is indicated with dots (`.` for short, `..` for sentence, `...` for paragraph).

Nodes are rendered with priority: modals and toasts draw on top of navigation, which draws on top of sections. This mirrors visual z-ordering.

### LLM view (`renderForLLM`)

Wraps the ASCII wireframe with structured context: the source URL, viewport dimensions, capture timestamp, and a role abbreviation legend. This gives an LLM everything it needs to reason about a page layout in a single text block.

### Structure view (`renderStructure`)

A stripped-down view with no semantic labels, no text indicators, and ASCII-style borders (`+`, `-`, `|`). Produces a smaller grid (60x16 by default). Useful for quick structural comparison where you only care about layout topology.

---

## Diffing algorithm

The diff engine answers the question: "What changed between these two captures?"

### How it works

1. **Flatten.** Both capture trees are flattened into lists of nodes with path information and shallow hashes.

2. **Match.** Nodes from capture A are matched to nodes in capture B using a greedy algorithm. For each candidate pair, a similarity score (0-1) is computed based on:
   - **Role match** (weight 3): same role is a strong signal
   - **Bbox proximity** (weight 2): IoU-like overlap metric
   - **Interactivity match** (weight 1)
   - **Semantic match** (weight 2, if present)
   - **Text hash match** (weight 1)

   Pairs are sorted by similarity, and the highest-scoring pairs are matched first. A pair must exceed the `matchThreshold` (default 0.5) to be considered.

3. **Classify.** For each matched pair, changes are classified:
   - `moved` -- bbox position shifted beyond `moveThreshold`
   - `resized` -- bbox size changed beyond `resizeThreshold`
   - `text_changed` -- text hash differs
   - `interactive_changed` -- interactivity flag flipped
   - `role_changed` -- role differs (rare but important)
   - `children_changed` -- child count differs

4. **Collect unmatched.** Nodes in B with no match are `added`. Nodes in A with no match are `removed`.

5. **Rank.** All changes are sorted by visual area (bbox width times height) to produce `topChanges`.

### Layout-only mode

Set `includeText: false` and `includeName: false` in `DiffOptions` to diff only the structural layout, ignoring content changes. This is useful for detecting reflows and layout regressions without noise from copy updates.

### The DiffResult shape

```typescript
interface DiffResult {
  summary: {
    counts: Record<ChangeType, number>;
    identical: boolean;
    fingerprintsMatch: boolean;
    layoutFingerprintsMatch: boolean;
    nodeCountA: number;
    nodeCountB: number;
  };
  changes: NodeChange[];
  topChanges: NodeChange[];
  metadata: {
    urlChanged: boolean;
    viewportChanged: boolean;
    compilerVersionMatch: boolean;
  };
}
```

---

## Fingerprinting

Fingerprints are content-addressed hashes of capture structure. They provide constant-time equality checks without running a full diff.

### Structural fingerprint (`fingerprintCapture`)

Hashes the entire tree recursively: every node's role, quantized bbox, interactivity, visibility, semantic hint, text hash, and name hash. Children are sorted by position (y, then x) before hashing for deterministic ordering regardless of DOM insertion order.

The viewport aspect ratio is included, so the same page at different viewport widths produces different fingerprints.

Use this when you need to detect *any* change, including text content updates.

### Layout fingerprint (`fingerprintLayout`)

Same algorithm, but excludes text hashes and name hashes. Two captures with identical structure but different text content will produce the same layout fingerprint.

Use this when you want to detect structural/layout regressions while ignoring content changes (e.g., A/B test copy variants, dynamic data).

### When to use which

| Scenario | Function |
|----------|----------|
| "Has this page changed at all?" | `fingerprintCapture` |
| "Has the layout changed?" | `fingerprintLayout` |
| "What exactly changed?" | `diff` |

### Node-level hashing

For lower-level use cases, the library exports:

- `hashNodeShallow(node, options?)` -- hash a single node without children
- `hashNodeDeep(node, options?)` -- hash a node and its entire subtree
- `generateNodeId(node, parentPath?)` -- generate a content-addressed node ID
- `assignNodeIds(node, parentPath?)` -- assign IDs to all nodes in a tree (mutates in place)
- `nodeSimilarity(a, b)` -- compute similarity score (0-1) between two nodes
- `bboxSimilarity(a, b)` -- compute IoU-like overlap between two bounding boxes
- `quantizeBbox(bbox, step?)` -- quantize bbox values to reduce subpixel noise
- `bboxToString(bbox, precision?)` -- serialize bbox for hashing

---

## Error handling

### WebSketchException

All errors thrown by the library are instances of `WebSketchException`, which extends `Error` and carries a structured `WebSketchError` payload on the `.ws` property.

```typescript
try {
  const capture = parseCapture(badJson);
} catch (err) {
  if (isWebSketchException(err)) {
    console.error(err.ws.code);    // "WS_INVALID_JSON"
    console.error(err.ws.message); // "Failed to parse JSON"
    console.error(err.ws.hint);    // actionable suggestion
  }
}
```

### Error codes

| Code | When |
|------|------|
| `WS_INVALID_JSON` | Input string is not valid JSON |
| `WS_INVALID_CAPTURE` | Parsed object fails schema validation |
| `WS_UNSUPPORTED_VERSION` | Capture `version` field is not in `SUPPORTED_SCHEMA_VERSIONS` |
| `WS_LIMIT_EXCEEDED` | Node count or tree depth exceeds configured limits |
| `WS_INVALID_ARGS` | Missing or invalid function arguments |
| `WS_NOT_FOUND` | Referenced file does not exist (CLI/MCP) |
| `WS_IO_ERROR` | Filesystem read/write failure (CLI/MCP) |
| `WS_PERMISSION_DENIED` | Insufficient filesystem permissions (CLI/MCP) |
| `WS_INTERNAL` | Unexpected internal error |

### WebSketchError shape

Every error carries these fields:

| Field | Type | Always present | Description |
|-------|------|---------------|-------------|
| `code` | `WebSketchErrorCode` | Yes | Machine-readable error code |
| `message` | `string` | Yes | Human-readable summary |
| `details` | `string` | No | Extended explanation |
| `path` | `string` | No | JSON path where error occurred |
| `expected` | `string` | No | What was expected |
| `received` | `string` | No | What was received |
| `hint` | `string` | No | Actionable suggestion for the caller |
| `cause` | `{ name, message }` | No | Underlying error |

### formatWebSketchError

For logging or CLI output, `formatWebSketchError` renders a multi-line string:

```
[WS_INVALID_CAPTURE] Invalid capture: 2 validation issues found
  Details: root.role: Invalid UI role: "CONTAINER"; root.bbox: ...
  Hint: Check the capture JSON against the WebSketchCapture schema.
```

### JSON envelope (CLI and MCP)

The CLI (`--json` flag) and MCP tools wrap all responses in a JSON envelope:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "WS_...", "message": "..." } }
```

This makes it safe to parse responses programmatically without try/catch on the caller side.

---

## Resource limits

Validation enforces resource limits to prevent unbounded processing of adversarial or accidentally huge captures.

| Limit | Default | Description |
|-------|---------|-------------|
| `maxNodes` | `10,000` | Maximum total nodes in the tree |
| `maxDepth` | `50` | Maximum tree depth |
| `maxStringLength` | `10,000` | Maximum string length for any single field |

Override defaults by passing a partial `WebSketchLimits` to `parseCapture` or `validateCapture`:

```typescript
const capture = parseCapture(json, {
  maxNodes: 50_000,  // allow larger captures
  maxDepth: 100,
});
```

Validation stops collecting issues after 100 are found to avoid runaway diagnostics on badly malformed input.

---

## Integration patterns

### Embedding in LLM context

Use `renderForLLM` to produce a self-contained text block suitable for inclusion in a system or user message:

```typescript
const context = renderForLLM(capture);
const prompt = `Here is the current page layout:\n\n${context}\n\nWhat interactive elements are visible?`;
```

The output includes URL, viewport dimensions, a timestamped header, the ASCII wireframe, and a role legend -- everything an LLM needs to reason about the page without additional context.

### CI pipeline integration

Use fingerprints for fast regression detection in CI:

```typescript
// In your test suite
const baseline = fingerprintLayout(baselineCapture);
const current = fingerprintLayout(currentCapture);

if (baseline !== current) {
  const result = diff(baselineCapture, currentCapture);
  console.error('Layout regression detected:');
  console.error(formatDiff(result));
  process.exit(1);
}
```

This pattern is especially useful for catching unintended layout shifts after CSS or component changes.

---

## FAQ

**Q: Why hashes instead of raw text?**
Two reasons. First, privacy: the IR never contains the actual text content of a page, so it can be stored and shared without leaking user data. Second, compactness: a hash is a fixed-size token regardless of the original text length.

**Q: Can I reconstruct the page from a capture?**
No. The IR is lossy by design. It captures *structure and intent*, not appearance. You cannot render a pixel-perfect replica from a capture. This is a feature, not a limitation -- it means the representation is compact and stable.

**Q: What happens if a capture has more nodes than `maxNodes`?**
Validation stops and returns a `WS_LIMIT_EXCEEDED` error. The capture is not partially processed. Increase the limit via the `limits` parameter if you need to handle larger pages.

**Q: How stable are fingerprints across library versions?**
Fingerprints use `hashSync` (FNV-1a 64-bit) internally. The hash algorithm is fixed and will not change within a major version. However, if the hashing inputs change (e.g., new fields are included), fingerprints may change across minor versions. Always compare fingerprints generated by the same library version.

**Q: Can I use the grammar types without pulling in runtime code?**
Yes. Import from the `@mcptoolshop/websketch-ir/grammar` sub-path to get only the TypeScript type definitions and constants, with no runtime dependencies.

**Q: What is the `UNKNOWN` role for?**
It is a fallback for DOM elements that the compiler cannot classify into any of the other 21 roles. A well-tuned compiler should rarely produce `UNKNOWN` nodes. If you see many, the compiler heuristics may need adjustment.

**Q: How does the diff engine handle re-ordered lists?**
The matching algorithm is position-aware: it uses bbox similarity as a strong signal. If list items are re-ordered but keep the same geometry (e.g., a sort operation that does not change item sizes), they will be matched by content and flagged as `moved`. If items change both position and content, they may appear as `removed` + `added` pairs.

**Q: Does the library have runtime dependencies?**
No. Zero runtime dependencies. It uses the Web Crypto API (browser) or Node.js `crypto` module for SHA-256 hashing, and djb2 for fast structural hashing. Everything else is hand-rolled.
