---
title: websketch-ir
description: Grammar-based intermediate representation for web UI capture
---

# websketch-ir

A grammar-based intermediate representation for capturing web page UI structure as semantic primitives.

## What it does

websketch-ir compiles raw DOM into a small, fixed vocabulary of UI primitives (`BUTTON`, `NAV`, `CARD`, `INPUT`, and more). The result is a portable, diffable, fingerprintable snapshot that language models can reason about without vision.

## Key capabilities

- **Parse and validate** -- Ingest JSON captures and verify them against the WebSketch schema.
- **ASCII wireframe rendering** -- Render captures as box-drawing wireframes for human review or LLM consumption.
- **Structural diffing** -- Compare two captures by geometry, role, and semantics rather than DOM identity.
- **Content-addressed fingerprinting** -- Hash captures for fast equality checks and change detection.
- **Schema versioning** -- Forward-compatible schema with version negotiation.

## Quick start

```bash
npm install @mcptoolshop/websketch-ir
```

```typescript
import { parseCapture, renderAscii, diff, fingerprintCapture } from '@mcptoolshop/websketch-ir';

const capture = parseCapture(jsonString);
const wireframe = renderAscii(capture);
const fingerprint = fingerprintCapture(capture);
const changes = diff(captureA, captureB);
```

## Ecosystem

| Package | Role |
|---------|------|
| **websketch-ir** | Core IR grammar and serialization (this package) |
| [websketch-vscode](https://github.com/mcp-tool-shop-org/websketch-vscode) | VS Code extension -- capture pages from your editor |
| [websketch-cli](https://github.com/mcp-tool-shop-org/websketch-cli) | CLI for rendering, fingerprinting, and diffing |
| [websketch-extension](https://github.com/mcp-tool-shop-org/websketch-extension) | Chrome extension for capturing pages |
| [websketch-mcp](https://github.com/mcp-tool-shop-org/websketch-mcp) | MCP server for LLM agent integration |
| [websketch-demo](https://github.com/mcp-tool-shop-org/websketch-demo) | Interactive demo and visualization |

## Links

- [npm package](https://www.npmjs.com/package/@mcptoolshop/websketch-ir)
- [GitHub repository](https://github.com/mcp-tool-shop-org/websketch-ir)
- [Handbook](https://github.com/mcp-tool-shop-org/websketch-ir/blob/main/HANDBOOK.md)
- [Changelog](https://github.com/mcp-tool-shop-org/websketch-ir/blob/main/CHANGELOG.md)

## Note

This `docs/` directory is a legacy Jekyll remnant. The current documentation lives in the [Starlight handbook](../site/) and the root [HANDBOOK.md](../HANDBOOK.md).

## License

MIT
