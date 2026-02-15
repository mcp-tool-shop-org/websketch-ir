<p align="center">
  <img src=".github/websketch-logo.png" alt="WebSketch" width="400">
</p>

# WebSketch IR

[![CI](https://github.com/mcp-tool-shop-org/websketch-ir/actions/workflows/ci.yml/badge.svg)](https://github.com/mcp-tool-shop-org/websketch-ir/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@mcptoolshop/websketch-ir.svg)](https://www.npmjs.com/package/@mcptoolshop/websketch-ir)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**WebSketch IR** is a grammar-based intermediate representation for capturing web page UI structure as semantic primitives. It provides a compact, LLM-friendly format for describing UI layouts, interactive elements, and visual hierarchy.

## Overview

WebSketch IR transforms complex DOM structures into a minimal grammar that captures:

- **Layout primitives** - Containers, grids, flex layouts
- **Interactive elements** - Buttons, inputs, links, forms
- **Visual hierarchy** - Headers, sections, navigation
- **Semantic meaning** - Purpose and relationships between elements

## Ecosystem

WebSketch IR is the core library for the WebSketch family of tools:

| Package | Description |
|---------|-------------|
| **websketch-ir** | Core IR grammar and serialization (this repo) |
| [websketch-cli](https://github.com/mcp-tool-shop-org/websketch-cli) | Command-line tool for rendering, fingerprinting, and diffing |
| [websketch-extension](https://github.com/mcp-tool-shop-org/websketch-extension) | Chrome extension for capturing pages |
| [websketch-mcp](https://github.com/mcp-tool-shop-org/websketch-mcp) | MCP server for LLM agent integration |
| [websketch-demo](https://github.com/mcp-tool-shop-org/websketch-demo) | Interactive demo and visualization |

## Getting Started

WebSketch captures web UI as a compact grammar for LLMs. The typical workflow:

1. **Capture** -- Use the [Chrome extension](https://github.com/mcp-tool-shop-org/websketch-extension) to capture a page
2. **Validate** -- `websketch validate capture.json` (CLI) or `websketch_validate` (MCP)
3. **Visualize** -- Paste into the [demo](https://mcptoolshop.com) or `websketch render capture.json`
4. **Diff** -- `websketch diff before.json after.json` to compare captures
5. **Bundle** -- `websketch bundle a.json b.json -o bundle.ws.json` to share

**JSON envelope** (CLI `--json` and MCP tools):
```json
{ "ok": true, ... }
{ "ok": false, "error": { "code": "WS_...", "message": "..." } }
```

## Installation

```bash
npm install @mcptoolshop/websketch-ir
```

## Usage

```typescript
import {
  parseCapture,
  renderAscii,
  diff,
  fingerprintCapture,
  validateCapture,
  isSupportedSchemaVersion,
  CURRENT_SCHEMA_VERSION,
} from '@mcptoolshop/websketch-ir';

// Parse and validate a capture (throws WebSketchException on error)
const capture = parseCapture(jsonString);

// Render to ASCII wireframe
const ascii = renderAscii(capture);

// Generate a structural fingerprint
const fp = fingerprintCapture(capture);

// Compare two captures
const result = diff(captureA, captureB);

// Check schema version compatibility
isSupportedSchemaVersion("0.1"); // true
```

## Schema Versioning

WebSketch IR uses semantic versioning for the capture schema:

- **Current version**: `0.1`
- **Forward compat**: unknown fields are ignored (consumers MUST tolerate them)
- **Backward compat**: validators accept any version in `SUPPORTED_SCHEMA_VERSIONS`
- **Version check**: `isSupportedSchemaVersion(v)` returns `true` for supported versions
- **Unsupported version**: validators return `WS_UNSUPPORTED_VERSION`

## Error Codes

| Code | Meaning |
|------|---------|
| `WS_INVALID_JSON` | Input is not valid JSON |
| `WS_INVALID_CAPTURE` | Capture fails schema validation |
| `WS_UNSUPPORTED_VERSION` | Capture version not supported |
| `WS_LIMIT_EXCEEDED` | Node count or depth exceeds limits |
| `WS_INVALID_ARGS` | Missing or invalid arguments |
| `WS_NOT_FOUND` | File not found |
| `WS_IO_ERROR` | Filesystem I/O error |
| `WS_PERMISSION_DENIED` | Insufficient permissions |
| `WS_INTERNAL` | Unexpected internal error |

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
