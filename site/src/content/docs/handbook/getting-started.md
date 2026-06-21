---
title: Getting Started
description: Install WebSketch IR and parse your first capture.
sidebar:
  order: 1
---

WebSketch IR compiles the noisy, deeply-nested HTML of any web page down to a small, fixed vocabulary of 22 UI primitives. The result is a lightweight JSON capture that an LLM can reason about directly, no vision required.

## Installation

```bash
npm install @mcptoolshop/websketch-ir
```

Zero runtime dependencies. Pure TypeScript. ~43 KB on npm. Runs anywhere Node 18+ runs.

## Parse and explore a capture

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

## Why use this instead of screenshots?

Most approaches to giving AI "eyes" on the web rely on screenshots and vision models. That works, but it's slow, expensive, and throws away all the structure that's already right there in the DOM.

WebSketch IR takes a different approach — it compiles the DOM into semantic primitives (BUTTON, NAV, CARD, FORM, INPUT) that preserve structure, geometry, interactivity, and semantics without the `<div>` soup.

## Use cases

- **AI agents** that need to understand and interact with web pages without expensive vision API calls
- **AI-driven UI tools** where an LLM maps out event handlers, reactive state, and generates or modifies layouts
- **Structural diffs** — not pixel diffs — to detect when a page actually changed in a meaningful way
- **Fingerprints** for caching, deduplication, or change detection across page captures
