---
title: Recipes
description: Common use-case walkthroughs with complete code examples.
sidebar:
  order: 7
---

Practical cookbook entries for the most common WebSketch IR tasks. Each recipe is self-contained and copy-pasteable.

## Diff two captures

Parse two JSON captures from disk, validate them, compute the diff, and produce a human-readable summary suitable for feeding to an LLM.

```typescript
import { readFileSync } from "node:fs";
import {
  parseCapture,
  diff,
  formatDiff,
} from "@mcptoolshop/websketch-ir";

// parseCapture validates the JSON and throws on schema errors
const before = parseCapture(readFileSync("before.json", "utf-8"));
const after = parseCapture(readFileSync("after.json", "utf-8"));

const result = diff(before, after, {
  similarityThreshold: 0.6, // tune matching strictness (0-1)
});

// Human-readable summary
console.log(formatDiff(result));

// Quick stats
console.log(`Identical: ${result.summary.identical}`);
console.log(`Changes: ${result.changes.length}`);
for (const [type, count] of Object.entries(result.summary.counts)) {
  if (count > 0) console.log(`  ${type}: ${count}`);
}
```

The diff engine matches nodes by geometry, role, and text hash — not DOM identity — so it works across completely different builds of the same page. Change types include `added`, `removed`, `moved`, `resized`, `text_changed`, `interactive_changed`, `role_changed`, and `children_changed`.

## Find all buttons

Use `queryByRole` to locate every interactive element of a given role. This is useful for accessibility audits or extracting a page's action surface for an agent.

```typescript
import {
  parseCapture,
  queryByRole,
  queryByPredicate,
} from "@mcptoolshop/websketch-ir";

const capture = parseCapture(jsonString);

// All BUTTON-role nodes in DFS order
const buttons = queryByRole(capture.root, "BUTTON");

for (const btn of buttons) {
  console.log(
    `${btn.semantic ?? "(unlabeled)"} at ` +
    `(${(btn.bbox[0] * 100).toFixed(0)}%, ${(btn.bbox[1] * 100).toFixed(0)}%) ` +
    `interactive=${btn.interactive}`
  );
}

// Or find all interactive nodes regardless of role
const interactive = queryByPredicate(
  capture.root,
  (node) => node.interactive,
);

console.log(`Total interactive elements: ${interactive.length}`);
```

Available roles to query include `BUTTON`, `INPUT`, `LINK`, `NAV`, `HEADER`, `FOOTER`, `FORM`, `MODAL`, `CARD`, `LIST`, `TABLE`, and more — see the full `UIRole` union in the [Grammar reference](/handbook/grammar/).

## Render for an LLM prompt

Turn a capture into a text representation an LLM can reason about without vision. `renderForLLM` produces an 80x24 ASCII grid with metadata headers and a role legend.

```typescript
import {
  parseCapture,
  renderForLLM,
  renderAscii,
  renderStructure,
} from "@mcptoolshop/websketch-ir";

const capture = parseCapture(jsonString);

// Full LLM-optimized view: metadata header + 80x24 ASCII + legend
const prompt = renderForLLM(capture);
console.log(prompt);

// Or customize the ASCII output directly
const custom = renderAscii(capture, {
  width: 120,
  height: 40,
  showSemantics: true,
  showTextLen: true,
  showLegend: true,
  borderStyle: "box",
});

// Minimal structure-only view (no semantics, no text indicators)
const skeleton = renderStructure(capture, 60, 16);
```

Feed the `renderForLLM` output directly into your system prompt:

```typescript
const systemPrompt = `You are a UI analyst. Here is the current page layout:

${renderForLLM(capture)}

Describe any accessibility issues you see.`;
```

## Build a capture programmatically

Use `createNode` and `createCapture` to construct a capture from scratch. This is useful for testing, mock data, or building captures from non-browser sources.

```typescript
import {
  createNode,
  createCapture,
  validateCapture,
} from "@mcptoolshop/websketch-ir";

// createNode(role, bbox, options?)
// bbox is [x, y, w, h] in viewport-relative [0,1] coordinates

const nav = createNode("NAV", [0, 0, 1, 0.06], {
  semantic: "main-nav",
  interactive: false,
  children: [
    createNode("LINK", [0.02, 0.01, 0.08, 0.04], {
      semantic: "home",
      interactive: true,
    }),
    createNode("LINK", [0.12, 0.01, 0.1, 0.04], {
      semantic: "products",
      interactive: true,
    }),
  ],
});

const hero = createNode("REGION", [0, 0.06, 1, 0.4], {
  semantic: "hero",
  children: [
    createNode("TEXT", [0.1, 0.12, 0.8, 0.08], {
      semantic: "headline",
      text: { kind: "sentence", len: 42 },
    }),
    createNode("BUTTON", [0.35, 0.3, 0.3, 0.06], {
      semantic: "cta",
      interactive: true,
    }),
  ],
});

const page = createNode("PAGE", [0, 0, 1, 1], {
  children: [nav, hero],
});

// createCapture(root, metadata?)
const capture = createCapture(page, {
  url: "https://example.com",
  viewport: { w_px: 1280, h_px: 800 },
});

// Validate the result
const issues = validateCapture(capture);
if (issues.length === 0) {
  console.log("Capture is valid");
} else {
  for (const issue of issues) {
    console.log(`${issue.path}: ${issue.message}`);
  }
}
```

## Fingerprint a page

Use `fingerprintCapture` for fast change detection. Two captures with the same fingerprint are structurally identical. Use `fingerprintLayout` when you want to ignore text changes and detect only structural/layout shifts.

```typescript
import {
  parseCapture,
  fingerprintCapture,
  fingerprintLayout,
} from "@mcptoolshop/websketch-ir";

const current = parseCapture(currentJson);
const previous = parseCapture(previousJson);

const fpCurrent = fingerprintCapture(current);
const fpPrevious = fingerprintCapture(previous);

if (fpCurrent === fpPrevious) {
  console.log("Page unchanged (structure + content)");
} else {
  // Check if only text changed (layout stayed the same)
  const layoutCurrent = fingerprintLayout(current);
  const layoutPrevious = fingerprintLayout(previous);

  if (layoutCurrent === layoutPrevious) {
    console.log("Layout unchanged — only text/content differs");
  } else {
    console.log("Structural change detected — run a full diff");
  }
}
```

This is especially useful in monitoring pipelines: fingerprint every capture and only run the expensive `diff()` when the fingerprint changes.

```typescript
import { fingerprintCapture, diff, formatDiff } from "@mcptoolshop/websketch-ir";

// Simple change-detection loop
let lastFingerprint = "";

function checkForChanges(capture) {
  const fp = fingerprintCapture(capture);

  if (fp === lastFingerprint) return; // no change

  if (lastFingerprint && lastCapture) {
    const result = diff(lastCapture, capture);
    console.log(formatDiff(result));
  }

  lastFingerprint = fp;
  lastCapture = capture;
}
```
