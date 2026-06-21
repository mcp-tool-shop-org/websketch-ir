---
title: API Reference
description: Every export from @mcptoolshop/websketch-ir.
sidebar:
  order: 3
---

## Parsing and validation

| Function | Signature | Description |
|----------|-----------|-------------|
| `parseCapture` | `(json: string, limits?: Partial<WebSketchLimits>) => WebSketchCapture` | Parse and validate a JSON capture string. Throws `WebSketchException` on error. |
| `validateCapture` | `(data: unknown, limits?: Partial<WebSketchLimits>) => WebSketchValidationIssue[]` | Validate a capture object against the schema. Returns an array of issues (empty = valid). Does not throw. |
| `isSupportedSchemaVersion` | `(version: unknown) => version is string` | Check whether a schema version string is supported by this library. |

## Rendering

| Function | Signature | Description |
|----------|-----------|-------------|
| `renderAscii` | `(capture: WebSketchCapture, options?: AsciiRenderOptions) => string` | Render a capture as an ASCII wireframe (default 80x24 grid with box-drawing borders). |
| `renderNodeAscii` | `(node: UINode, options?: AsciiRenderOptions) => string` | Render a single node subtree to ASCII without capture metadata. |
| `renderForLLM` | `(capture: WebSketchCapture) => string` | LLM-optimized view with URL, viewport header, ASCII body, and legend footer. |
| `renderStructure` | `(capture: WebSketchCapture, width?: number, height?: number) => string` | Compact structure-only view (no text, no semantics, ASCII-style borders). |
| `generateLegend` | `() => string` | Generate a compact legend mapping role abbreviations to full names. |
| `renderJSON` | `(capture: WebSketchCapture, options?: RenderJSONOptions) => string` | Minimal JSON tree for LLM tool-calling. Strips internal fields, keeps role/bbox/text/interactive. Available from main entry and `/codegen`. |
| `renderMarkdown` | `(capture: WebSketchCapture, options?: RenderMarkdownOptions) => string` | Readable Markdown mapping roles to idiomatic constructs (headings, tables, blockquotes). Available from `/codegen`. |

### AsciiRenderOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | `80` | Grid width in characters |
| `height` | `number` | `24` | Grid height in characters |
| `showRoles` | `UIRole[]` | Important roles | Which roles to render |
| `showSemantics` | `boolean` | `true` | Show semantic labels |
| `showTextLen` | `boolean` | `true` | Show text length indicators |
| `borderStyle` | `"box" \| "ascii" \| "none"` | `"box"` | Border drawing style |
| `showLegend` | `boolean` | `false` | Append role abbreviation legend |

## Diffing

| Function | Signature | Description |
|----------|-----------|-------------|
| `diff` | `(a: WebSketchCapture, b: WebSketchCapture, options?: DiffOptions) => DiffResult` | Structural diff between two captures. Matches by geometry + role + semantics. |
| `formatDiff` | `(result: DiffResult) => string` | Human-readable diff report with change counts and top changes. |
| `formatDiffJson` | `(result: DiffResult) => string` | Machine-readable JSON diff report. |
| `formatDiffForLLM` | `(result: DiffResult) => string` | Concise one-line change summary for LLM context windows. Available from `@mcptoolshop/websketch-ir/codegen`. |
| `prepareDiff` | `(capture: WebSketchCapture) => PreparedCapture` | Pre-flatten and pre-fingerprint a capture for repeated diffing against many variants. |

### PreparedCapture

Returned by `prepareDiff`. Contains the original capture, a pre-computed flat node list, and its fingerprint. Pass to `diff()` instead of a raw capture to skip redundant work.

### DiffOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeText` | `boolean` | `true` | Include text hash in matching |
| `includeName` | `boolean` | `true` | Include name hash in matching |
| `matchThreshold` | `number` | `0.5` | Minimum similarity to consider a match |
| `topChangesLimit` | `number` | `10` | Max changes in `topChanges` |
| `moveThreshold` | `number` | `0.01` | Bbox movement below this is noise |
| `resizeThreshold` | `number` | `0.01` | Bbox resize below this is noise |

## Fingerprinting and hashing

| Function | Signature | Description |
|----------|-----------|-------------|
| `fingerprintCapture` | `(capture: WebSketchCapture) => string` | Full structural fingerprint -- roles + geometry + text + viewport aspect. |
| `fingerprintLayout` | `(capture: WebSketchCapture) => string` | Layout-only fingerprint that ignores text content changes. |
| `hashNodeShallow` | `(node: UINode, options?: HashOptions) => string` | Hash a single node without children. |
| `hashNodeDeep` | `(node: UINode, options?: HashOptions) => string` | Hash a node and its entire subtree. |
| `generateNodeId` | `(node: UINode, parentPath?: string) => string` | Generate a content-addressed node ID. |
| `assignNodeIds` | `(node: UINode, parentPath?: string) => void` | Assign IDs to all nodes in a tree (mutates in place). |
| `nodeSimilarity` | `(a: UINode, b: UINode) => number` | Compute similarity score (0-1) between two nodes. |
| `bboxSimilarity` | `(a: BBox01, b: BBox01) => number` | Compute IoU-like overlap between two bounding boxes. |
| `quantizeBbox` | `(bbox: BBox01, step?: number) => BBox01` | Quantize bbox values to reduce subpixel noise. |
| `bboxToString` | `(bbox: BBox01, precision?: number) => string` | Serialize bbox for hashing. |

## Text processing

| Function | Signature | Description |
|----------|-----------|-------------|
| `normalizeText` | `(text: string) => string` | Trim, collapse whitespace, lowercase, strip invisible characters. |
| `sha256` | `(text: string) => Promise<string>` | Async SHA-256 hash (browser SubtleCrypto or Node crypto). |
| `hashSync` | `(text: string) => string` | Synchronous FNV-1a 64-bit hash for structural fingerprinting. |
| `classifyText` | `(normalizedText: string) => TextKind` | Classify text as `none`, `short`, `sentence`, or `paragraph`. |
| `isMixedContent` | `(rawText: string) => boolean` | Check if text contains multiple paragraphs. |
| `createTextSignal` | `(rawText: string) => Promise<TextSignal>` | Generate a TextSignal from raw text (async). |
| `createTextSignalSync` | `(rawText: string) => TextSignal` | Generate a TextSignal from raw text (sync). |
| `isMeaningfulText` | `(text: string) => boolean` | Check if text has at least one alphanumeric character. |

## Error handling

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatWebSketchError` | `(err: WebSketchError) => string` | Multi-line, human-readable error string with code, message, details, and hint. |
| `isWebSketchException` | `(err: unknown) => err is WebSketchException` | Type guard for `WebSketchException`. |

## Codegen exports

```typescript
import { emitHTML, emitNodeHTML, roleToElement } from '@mcptoolshop/websketch-ir/codegen';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `emitHTML` | `(capture: WebSketchCapture, options?: EmitHTMLOptions) => string` | Generate semantic HTML from a capture with `data-wsk-*` attributes. |
| `emitNodeHTML` | `(node: UINode, options?: EmitHTMLOptions) => string` | Generate HTML for a single node and its children. |
| `roleToElement` | `(role: UIRole) => string` | Get the HTML element name mapped to a UIRole. |

### EmitHTMLOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indent` | `string` | `"  "` | Indentation string (2 spaces) |
| `includeBbox` | `boolean` | `true` | Include `data-wsk-bbox` geometry attributes |
| `includeHandlers` | `boolean` | `true` | Emit `data-wsk-on-*` for event handlers |
| `includeBindings` | `boolean` | `true` | Emit `data-wsk-bind-*` for reactive bindings |
| `includeState` | `boolean` | `true` | Emit `data-wsk-state` for state signals |
| `includeStyle` | `boolean` | `true` | Emit `data-wsk-style` for visual intent |
| `includePattern` | `boolean` | `true` | Emit `data-wsk-pattern` for recognized patterns |
| `includeSemantics` | `boolean` | `true` | Emit `data-wsk-semantic` for semantic hints |
| `includeRoleClass` | `boolean` | `true` | Include CSS class with role name (e.g., `wsk-button`) |
| `fullDocument` | `boolean` | `false` | Wrap output in full HTML document with head/body |

## Import sub-paths

The main entry point re-exports everything you need for typical usage:

```typescript
// Main entry point — parsing, rendering, diffing, fingerprinting, errors
import { parseCapture, renderAscii, diff, WebSketchException } from '@mcptoolshop/websketch-ir';
```

Optional sub-path imports are available for tree-shaking or when you only need a specific module:

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML, roleToElement } from '@mcptoolshop/websketch-ir/codegen';

// Error types only (also re-exported from the main entry point)
import { WebSketchException, isWebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

## Exported constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CURRENT_SCHEMA_VERSION` | `"0.1"` | Schema version produced by this library |
| `SUPPORTED_SCHEMA_VERSIONS` | `Set(["0.1"])` | All versions this library can read |
| `DEFAULT_LIMITS` | `{ maxNodes: 10000, maxDepth: 50, maxStringLength: 10000 }` | Default resource limits for validation |
| `MAX_DEPTH` | `8` | Maximum tree depth |
| `MAX_CHILDREN` | `200` | Maximum children per node |
| `BBOX_QUANT_STEP` | `0.001` | Quantization step for bbox hashing |
| `COLLAPSE_TOLERANCE` | `0.002` | Collapse tolerance for near-equal bboxes |
| `VALID_EVENT_TYPES` | `ReadonlySet<string>` | All valid `EventType` values (`click`, `hover`, `focus`, `blur`, `submit`, `change`, `input`, `keydown`, `scroll`, `drag`, `custom`) |
| `VALID_STATE_ACCESS_KINDS` | `ReadonlySet<string>` | All valid `StateAccessKind` values (`read`, `write`, `readwrite`, `condition`) |
| `VALID_STATE_SCOPES` | `ReadonlySet<string>` | All valid state scope values (`local`, `global`, `url`) |
| `VALID_STYLE_INTENT_TOKENS` | `ReadonlySet<string>` | All valid `StyleIntentToken` values |
| `VALID_DENSITIES` | `ReadonlySet<string>` | Valid density values (`compact`, `normal`, `spacious`) |
| `VALID_SIZES` | `ReadonlySet<string>` | Valid size values (`xs`, `sm`, `md`, `lg`, `xl`) |
| `VALID_PATTERN_KINDS` | `ReadonlySet<string>` | All valid `PatternKind` values |
