---
title: Diffing & Fingerprinting
description: Structural comparison and change detection.
sidebar:
  order: 4
---

## Diffing

The diff engine compares two captures by matching nodes based on geometry, role, and semantics — not DOM identity.

```typescript
import { diff, formatDiff } from '@mcptoolshop/websketch-ir';

const result = diff(captureA, captureB, {
  matchThreshold: 0.5,   // min similarity to count as a match
  moveThreshold: 0.01,   // bbox movement below this is noise
  resizeThreshold: 0.01, // bbox resize below this is noise
});

console.log(formatDiff(result));
// result.summary.counts: { added, removed, moved, resized, text_changed, ... }
```

### Change types

- **added** — Node exists in B but not in A
- **removed** — Node exists in A but not in B
- **moved** — Same node, different position (beyond `moveThreshold`)
- **resized** — Same node, different dimensions (beyond `resizeThreshold`)
- **text_changed** — Same node, different text content hash
- **interactive_changed** — Interactivity flag flipped (e.g., button became disabled)
- **role_changed** — Role differs between matched nodes (rare but important)
- **children_changed** — Child count differs between matched nodes

Changes are ranked by visual area (bbox width times height) so the most impactful changes surface first.

## Fingerprinting

Content-addressed hashing produces stable fingerprints for fast structural equality checks. Uses FNV-1a 64-bit hashing for extremely low collision probability.

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

### When to use which

- **fingerprintCapture** — Full equality check. Use when you care about text content changes.
- **fingerprintLayout** — Structural check only. Use when you want to detect layout shifts but ignore copy changes.
