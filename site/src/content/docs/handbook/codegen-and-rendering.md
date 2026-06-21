---
title: Codegen & Rendering
description: HTML output, ASCII wireframes, and LLM views.
sidebar:
  order: 5
---

## HTML codegen

Generate semantic HTML from any capture. Roles map to proper HTML elements (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) with all signals surfaced as `data-wsk-*` attributes.

```typescript
import { emitHTML, emitNodeHTML, roleToElement } from '@mcptoolshop/websketch-ir/codegen';

const html = emitHTML(capture, {
  includeHandlers: true,
  includeBindings: true,
  includeState: true,
  includeStyle: true,
  includePattern: true,
  includeSemantics: true,
  includeBbox: true,
  includeRoleClass: true,
});

// Render a single node subtree
const nodeHtml = emitNodeHTML(someNode);

// Look up what HTML element a role maps to
roleToElement("BUTTON"); // "button"
roleToElement("CARD");   // "article"
roleToElement("MODAL");  // "dialog"
```

### Example output

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

## ASCII rendering

Three rendering modes for different contexts:

```typescript
import { renderAscii, renderForLLM, renderStructure } from '@mcptoolshop/websketch-ir';

// Full wireframe (80×24 grid with box-drawing characters)
const wireframe = renderAscii(capture);

// LLM-optimized view with URL/viewport header and legend
const llmView = renderForLLM(capture);

// Compact structure-only view (no text, no semantics)
const structure = renderStructure(capture, 60, 16);
```

### When to use which

- **renderAscii** — General-purpose wireframe for terminals and documentation
- **renderForLLM** — Feed directly into an LLM context window with full metadata
- **renderStructure** — Minimal view when you only need the layout skeleton

## Ecosystem

| Package | Role |
|---------|------|
| [websketch-cli](https://github.com/mcp-tool-shop-org/websketch-cli) | CLI for rendering, fingerprinting, and diffing |
| [websketch-extension](https://github.com/mcp-tool-shop-org/websketch-extension) | Chrome extension for capture |
| [websketch-vscode](https://github.com/mcp-tool-shop-org/websketch-vscode) | VS Code extension |
| [websketch-mcp](https://github.com/mcp-tool-shop-org/websketch-mcp) | MCP server for LLM agents |
