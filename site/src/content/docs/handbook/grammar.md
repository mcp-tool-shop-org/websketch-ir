---
title: Grammar
description: The 22 UI primitives, signals, and pattern system.
sidebar:
  order: 2
---

Every captured page becomes a tree of `UINode` objects. Each node carries a role (one of 22 primitives) and optional signals that describe its behavior, state, and visual intent.

## UINode fields

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `id` | `string` | Yes | Stable ID within capture (content-addressed or path-based) |
| `role` | `UIRole` | Yes | One of 22 primitives: `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, etc. |
| `bbox` | `BBox01` | Yes | Viewport-relative bounding box `[x, y, w, h]` in `[0, 1]` range |
| `interactive` | `boolean` | Yes | Can the user click/type on this? |
| `visible` | `boolean` | Yes | Is it actually on screen? |
| `semantic` | `string` | No | Coarse hint like `"login"`, `"search"`, `"checkout"` |
| `name_hash` | `string` | No | Hash of aria-label/name/id (not the actual value) |
| `text` | `TextSignal` | No | Text shape: hash, length, classification (`short`, `sentence`, `paragraph`) |
| `z` | `number` | No | Coarse z-index bucket (0-10) |
| `enabled` | `boolean` | No | Not disabled |
| `focusable` | `boolean` | No | Can receive keyboard focus |
| `handlers` | `HandlerSignal[]` | No | Event-intent mappings: `{ event: "click", intent: "toggle_menu" }` |
| `bindings` | `BindingSignal[]` | No | Reactive bindings: `{ property: "value", expression: "state.email" }` |
| `state` | `StateSignal[]` | No | State tracking: `{ key: "cart.items", access: "read", scope: "global" }` |
| `style` | `StyleIntent` | No | Visual intent tokens: `primary`, `destructive`, `elevated`, `muted`, `ghost` |
| `pattern` | `PatternSignal` | No | Reusable pattern: `{ kind: "auth_form", variant: "login", slot: "header" }` |
| `children` | `UINode[]` | No | Nested child nodes (semantic grouping, not DOM children) |
| `flags` | `UINodeFlags` | No | Behavior/state flags (`sticky`, `scrollable`, `repeated`) |

## Pattern kinds

Patterns let LLMs recognize higher-level compositions beyond individual roles:

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`

## Style intent tokens

Design-system-level visual markers (not CSS):

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`

## Schema versioning

- **Current version**: `0.1`
- **Forward compatible**: unknown fields are silently ignored
- **Version check**: `isSupportedSchemaVersion("0.1")` returns `true`
- **Unsupported input**: throws `WS_UNSUPPORTED_VERSION`

## Error codes

| Code | When it happens |
|------|-----------------|
| `WS_INVALID_JSON` | Input isn't valid JSON |
| `WS_INVALID_CAPTURE` | Capture fails schema validation |
| `WS_UNSUPPORTED_VERSION` | Capture version isn't supported |
| `WS_LIMIT_EXCEEDED` | Too many nodes or too deep |
| `WS_INVALID_ARGS` | Missing or bad arguments |
| `WS_NOT_FOUND` | Resource not found |
| `WS_IO_ERROR` | I/O failure |
| `WS_PERMISSION_DENIED` | Insufficient permissions |
| `WS_INTERNAL` | Something unexpected went wrong |

## Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `MAX_DEPTH` | `8` | Maximum tree depth |
| `MAX_CHILDREN` | `200` | Maximum children per node (overflow is summarized) |
| `BBOX_QUANT_STEP` | `0.001` | Quantization step for bbox hashing (~1px at 1000px viewport) |
| `COLLAPSE_TOLERANCE` | `0.002` | Nodes within this bbox difference are considered equal (~2px) |
