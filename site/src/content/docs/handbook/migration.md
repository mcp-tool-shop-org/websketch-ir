---
title: Migration Guide (v1 → v2)
sidebar:
  order: 8
---

This guide covers everything you need to update when moving from `@mcptoolshop/websketch-ir` v1.x to v2.x.

## Breaking: 64-bit hashing

The most impactful change in v2 is the switch from **djb2 (32-bit)** to **FNV-1a (64-bit)** hashing. `hashSync()` now returns **16-character hex strings** instead of 8-character strings.

**What this means:**

- Every fingerprint, node hash, and content-addressed ID produced by v2 is different from v1.
- If you stored hashes externally (databases, caches, snapshot files), they will no longer match.
- There is no automatic migration path -- you must regenerate all stored hashes with v2.

```ts
// v1: 8-char hex (djb2 32-bit)
hashSync("hello"); // → "4f9f2cab"

// v2: 16-char hex (FNV-1a 64-bit)
hashSync("hello"); // → "a430d84680aabd0b"
```

**Action required:** Re-run `fingerprintCapture()` and `fingerprintLayout()` against your captures to produce v2 hashes. Update any hash comparisons or lookups in your code.

## Deprecated: `sha256Sync`

`sha256Sync` was always a misnomer -- it never used SHA-256. In v2 it is formally deprecated and is now a plain alias for `hashSync`.

```diff
- import { sha256Sync } from "@mcptoolshop/websketch-ir";
+ import { hashSync } from "@mcptoolshop/websketch-ir";
```

`sha256Sync` still works in v2 but will be removed in v3.

## Deprecated: schema version helpers in `compat.ts`

The following exports are deprecated since v2.0 (removal target: v3.0):

| Deprecated export              | Replacement                         |
|-------------------------------|-------------------------------------|
| `CURRENT_SCHEMA_VERSION`       | Import from the versioned module    |
| `SUPPORTED_SCHEMA_VERSIONS`    | Import from the versioned module    |
| `isSupportedSchemaVersion()`   | Import from the versioned module    |

These still work in v2 but will emit deprecation warnings in a future minor release.

## New: PatternSignal

v2 adds a `pattern` field on `UINode` for identifying reusable UI compositions like search bars, auth forms, product cards, and navigation menus.

```ts
import type { PatternSignal, PatternKind } from "@mcptoolshop/websketch-ir";

const pattern: PatternSignal = {
  kind: "search_bar",
  name: "GlobalSearch",
  variant: "collapsed",
  slot: "header",
};
```

Valid `PatternKind` values: `search_bar`, `auth_form`, `product_card`, `nav_menu`, `data_table`, `wizard_step`, `media_player`, `chat_thread`, `dashboard_widget`, `custom`.

**Hashing:** Pattern data is included in `hashNodeShallow()` and `hashNodeDeep()` by default. Disable with `{ includePattern: false }`.

**HTML codegen:** Patterns emit as `data-wsk-pattern`, `data-wsk-pattern-name`, `data-wsk-pattern-variant`, and `data-wsk-pattern-slot` attributes.

**Similarity:** `nodeSimilarity()` now factors pattern data into its score.

## New: validation and parsing APIs

These APIs were added in v0.3.0 but are worth highlighting for anyone jumping from an early v1 release:

- **`validateCapture(data, limits?)`** -- validates a parsed object against the `WebSketchCapture` schema. Returns an array of issues (empty means valid). Supports resource limits (`maxNodes`, `maxDepth`, `maxStringLength`).
- **`parseCapture(json, limits?)`** -- parses a JSON string and validates in one step. Throws `WebSketchException` with structured error codes (`WS_INVALID_JSON`, `WS_INVALID_CAPTURE`, `WS_UNSUPPORTED_VERSION`, `WS_LIMIT_EXCEEDED`).
- **`formatWebSketchError(err)`** -- formats any `WebSketchError` for human-readable display.
- **`isWebSketchException(err)`** -- type guard for catch blocks.

## New: text signal helpers

Also added pre-v2 but commonly missed:

- `createTextSignal(text)` -- async, uses SHA-256 for the hash field
- `createTextSignalSync(text)` -- sync, uses FNV-1a (v2 behavior)
- `classifyText(text)` -- returns the `TextKind`
- `isMeaningfulText(text)` -- filters boilerplate

## Quick migration checklist

1. Update your dependency: `npm install @mcptoolshop/websketch-ir@^2.0.0`
2. Replace `sha256Sync` imports with `hashSync`
3. Regenerate any stored fingerprints or node hashes
4. Update hash comparison logic to expect 16-char hex strings
5. Replace deprecated `compat.ts` imports if you use them directly
6. (Optional) Add `pattern` data to nodes for richer UI classification
