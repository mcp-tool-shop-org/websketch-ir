<p align="center">
  <img src=".github/websketch-logo.png" alt="WebSketch" width="400">
</p>

# WebSketch IR

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

## Installation

```bash
npm install websketch-ir
```

## Usage

```javascript
const { parse, serialize, fingerprint } = require('websketch-ir');

// Parse a WebSketch IR string
const ir = parse(websketchString);

// Serialize back to string
const output = serialize(ir);

// Generate a content-addressable fingerprint
const hash = fingerprint(ir);
```

## Grammar

WebSketch IR uses a compact grammar to represent UI structure:

```
container[grid:2x3] {
  header { nav { link[href=/home] "Home" } }
  main {
    section { heading[1] "Title" paragraph "Content..." }
    form { input[type=text,name=email] button[submit] "Send" }
  }
  footer { text "© 2026" }
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
