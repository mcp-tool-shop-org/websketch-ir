<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/websketch-ir/readme.png" alt="WebSketch IR" width="500"></p>

<p align="center"><strong>Stop treating webpages like pictures.<br>A grammar-based IR that turns messy DOM into clean, typed UI primitives — built for LLMs.</strong></p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/websketch-ir/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/websketch-ir/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@mcptoolshop/websketch-ir"><img src="https://img.shields.io/npm/v/@mcptoolshop/websketch-ir.svg" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-20%2B-brightgreen.svg" alt="node 20+"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.3-blue.svg" alt="TypeScript"></a>
  <a href="https://mcp-tool-shop-org.github.io/websketch-ir/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

---

## 这是什么？

目前，大多数赋予人工智能“视觉”能力的网络方法都依赖于截图和视觉模型。这种方法有效，但速度慢、成本高，并且会丢弃 DOM 中已经存在的结构信息。

**WebSketch IR** 采用了一种不同的方法。它将任何网页中杂乱且嵌套很深的 HTML 代码编译成一个小型、固定的包含 22 个 UI 原语的词汇表——例如 `BUTTON`、`NAV`、`CARD`、`FORM`、`INPUT`。结果是一个轻量级的 JSON 数据，大型语言模型可以直接理解它，无需视觉能力。

可以把它看作是用于 Web UI 的“汇编语言”。您可以获得结构、几何形状、交互性和语义——而无需使用 `<div>` 标签。

## 我为什么要使用这个？

- **您正在构建 AI 代理**，这些代理需要理解和与网页进行交互，而无需进行昂贵的视觉 API 调用。
- **您正在设计基于 AI 的 UI 工具**，其中大型语言模型会映射事件处理程序、响应式状态，然后生成或修改布局。
- **您希望获得结构差异**——而不是像素差异——以检测页面是否真正发生了有意义的更改。
- **您需要指纹**，用于缓存、去重或跨页面捕获进行更改检测。

## 主要功能

| 功能 | 它能做什么 |
|---------|-------------|
| **22 个 UI 原语** | 将任何 DOM 编译为 `PAGE`、`BUTTON`、`NAV`、`CARD`、`INPUT`、`MODAL`、`TABLE` 以及其他 15 个——更注重意图而非实现。 |
| **Event Handlers** | `HandlerSignal` 捕获节点响应的事件及其原因（例如，`click → navigate`、`submit → validate_form`）。 |
| **Reactive State** | `StateSignal` 跟踪每个节点读取、写入或基于的状态——跨本地、全局和 URL 范围。 |
| **Visual Intent** | `StyleIntent` 令牌（如 `primary`、`destructive`、`elevated`、`ghost`）描述了事物呈现出当前样式的*原因*，而不是 CSS。 |
| **Pattern Recognition** | `PatternSignal` 识别可重用的组合：`search_bar`、`auth_form`、`product_card`、`wizard_step`、`dashboard_widget` 等。 |
| **HTML Codegen** | 从任何捕获中生成语义 HTML——将角色映射到适当的元素，并使用 `data-wsk-*` 属性来表示处理程序、状态、样式和模式。 |
| **ASCII Wireframes** | 以基于文本的线框图的形式呈现捕获内容，大型语言模型无需视觉能力即可读取这些内容。 |
| **Structural Diffing** | 通过角色 + 几何形状 + 语义进行比较，而不是 DOM 标识。 |
| **64 位指纹** | FNV-1a 64 位哈希算法，用于快速进行相等性检查，且碰撞概率极低。 |
| **Zero Dependencies** | 纯 TypeScript 代码——无需运行时依赖，没有间接依赖。可在任何支持 Node 20 及更高版本的环境中运行。 |

## 入门

```bash
npm install @mcptoolshop/websketch-ir
```

### 解析捕获内容并进行探索

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

### 从捕获内容生成 HTML

```typescript
import { emitHTML } from '@mcptoolshop/websketch-ir/codegen';

// Semantic HTML with data-wsk-* attributes for handlers, state, style, patterns
const html = emitHTML(capture, {
  includeHandlers: true,
  includeState: true,
  includeStyle: true,
  includePattern: true,
});
```

输出将角色映射到适当的 HTML 元素（`BUTTON` → `<button>`、`NAV` → `<nav>`、`CARD` → `<article>`），并将所有信号作为数据属性呈现：

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

### 大型语言模型的渲染模式

```typescript
import { renderAscii, renderForLLM, renderStructure } from '@mcptoolshop/websketch-ir';

// Full wireframe (80×24 grid with box-drawing characters)
const wireframe = renderAscii(capture);

// LLM-optimized view with URL/viewport header and legend
const llmView = renderForLLM(capture);

// ...or tune it: scale the grid, drop the timestamp (keeps prompt caching
// stable), suppress the legend once the model has seen it, or filter roles
const focused = renderForLLM(capture, {
  width: 120,
  includeTimestamp: false,
  includeLegend: false,
  showRoles: ['BUTTON', 'LINK', 'INPUT'],
});

// Compact structure-only view (no text, no semantics)
const structure = renderStructure(capture, 60, 16);
```

### 差异比较

```typescript
import { diff, prepareDiff, formatDiff } from '@mcptoolshop/websketch-ir';

const result = diff(captureA, captureB, {
  matchThreshold: 0.5,   // min similarity to count as a match
  moveThreshold: 0.01,   // bbox movement below this is noise
  resizeThreshold: 0.01, // bbox resize below this is noise
});

console.log(formatDiff(result));
// result.summary.counts: { added, removed, moved, resized, text_changed, ... }

// Pre-process a capture for repeated diffs against multiple targets
const prepared = prepareDiff(captureA);
```

### 指纹识别

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

### 导入子路径

您可以仅导入所需内容，以保持轻量级：

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### 树遍历和构建器

```typescript
import {
  flattenNodes,   // Collect every node into a flat array
  walkNodes,      // Depth-first visitor (callback per node)
  filterNodes,    // Return nodes matching a predicate
  createNode,     // Build a UINode with sensible defaults
  createCapture,  // Build a WebSketchCapture wrapper
  ROLES,          // All 22 role strings as a readonly array
} from '@mcptoolshop/websketch-ir';
```

### 查询助手

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### 可寻址性和包含性

ID 是库在跨捕获中使用的稳定句柄（它们会出现在差异比较结果和生成的 IR 中）。将 ID 解析回节点，或分析结构：

```typescript
import { findById, getParent, findAncestor, queryWithin } from '@mcptoolshop/websketch-ir';

// Resolve a content-addressed id back to its node
const node   = findById(capture.root, '/a1b2c3d4e5f6_42_80');

// Walk relationships (computed from root — no parent pointers stored)
const parent = getParent(capture.root, node);
const form   = findAncestor(capture.root, node, (n) => n.role === 'FORM');

// "the INPUTs inside this FORM" in one line
const fields = queryWithin(capture.root, (n) => n.role === 'FORM', 'INPUT');
```

### Markdown 渲染

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### JSON 渲染器和大型语言模型差异摘要

```typescript
import {
  renderJSON,        // Minimal JSON tree (opt-in includePath / includeId handles)
  renderJSONFlat,    // Flat array of interactive nodes with stable path handles
  formatDiffForLLM,  // One-paragraph natural-language diff summary
} from '@mcptoolshop/websketch-ir';

// renderJSONFlat is the natural shape for a tool-call menu: each entry carries a
// stable `path` the agent can hand straight back to a downstream tool.
const menu = renderJSONFlat(capture);
// → [{ path: 'PAGE/FORM[1]/BUTTON[0]', role: 'BUTTON', bbox: [...], interactive: true }, ...]
```

`RENDERERS` 注册表（`{ html, ascii, llm, json, markdown }`）仍然可以从 `@mcptoolshop/websketch-ir/codegen` 子路径中获取。

## 语法概览

每个捕获的页面都成为一个 `UINode` 对象的树。以下是每个节点可以包含的内容：

| 字段 | 类型 | 用途 |
|-------|------|---------|
| `role` | `UIRole` | 22 个原语之一：`PAGE`、`BUTTON`、`NAV`、`CARD`、`INPUT`、`MODAL` 等。 |
| `bbox` | `BBox01` | 相对于视口的位置边界框 `[x, y, w, h]`，范围为 `[0, 1]`。 |
| `text` | `TextSignal` | 文本形状：哈希值、长度、分类（`short`、`sentence`、`paragraph`）——而不是实际内容。 |
| `handlers` | `HandlerSignal[]` | 事件 → 意图映射：`{ event: "click", intent: "toggle_menu" }`。 |
| `bindings` | `BindingSignal[]` | 响应式绑定：`{ property: "value", expression: "state.email" }`。 |
| `state` | `StateSignal[]` | 状态跟踪：`{ key: "cart.items", access: "read", scope: "global" }`。 |
| `style` | `StyleIntent` | 视觉意图令牌：`primary`、`destructive`、`elevated`、`muted`、`ghost` 等。 |
| `pattern` | `PatternSignal` | 可重用的模式：`{ kind: "auth_form", variant: "login", slot: "header" }`。 |
| `semantic` | `string` | 粗略的提示，例如 `"login"`、`"search"`、`"checkout"`。 |
| `interactive` | `boolean` | 用户是否可以单击/在其中键入？ |
| `visible` | `boolean` | 它实际上显示在屏幕上吗？ |
| `children` | `UINode[]` | 嵌套子节点（语义分组，而不是 DOM 子节点）。 |

### 模式类型

模式使大型语言模型能够识别超出单个角色的更高层次的组合：

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`。

### 样式意图令牌

设计系统级别的视觉标记（而不是 CSS）：

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`。

## 模式版本控制

- **当前版本**：`0.1`
- **向前兼容**：未知的字段将被静默忽略。
- **版本检查**：`isSupportedSchemaVersion("0.1")` → `true`。
- **不支持的输入**：抛出 `WS_UNSUPPORTED_VERSION` 错误。

## 错误处理

此库中的每个错误都是一个 `WebSketchException`，它携带一个结构化的 `WebSketchError` 有效负载和一个规范的错误代码：

| 代码 | 发生时间 |
|------|-----------------|
| `WS_INVALID_JSON` | 输入不是有效的 JSON |
| `WS_INVALID_CAPTURE` | 捕获失败，未通过模式验证 |
| `WS_UNSUPPORTED_VERSION` | 不支持的捕获版本 |
| `WS_LIMIT_EXCEEDED` | 节点过多或深度过大 |
| `WS_INVALID_ARGS` | 缺少或错误的参数 |
| `WS_NOT_FOUND` | 找不到资源 |
| `WS_IO_ERROR` | I/O 失败 |
| `WS_PERMISSION_DENIED` | 权限不足 |
| `WS_INTERNAL` | 发生了一些意外错误 |

```typescript
import {
  parseCapture,          // Parse JSON string → validated WebSketchCapture (throws on invalid)
  validateCapture,       // Validate an already-parsed object (returns issues array)
  WebSketchException,    // Structured error class with code/message/hint
  isWebSketchException,
  formatWebSketchError,
} from '@mcptoolshop/websketch-ir';

try {
  const capture = parseCapture(untrustedJson);
} catch (err) {
  if (isWebSketchException(err)) {
    console.error(formatWebSketchError(err.ws));
    // [WS_INVALID_CAPTURE] Invalid capture: 3 validation issues found
    //   Details: root.bbox: Node bbox must have exactly 4 elements; ...
  }
}

// Or validate without throwing
const issues = validateCapture(parsedObject);
if (issues.length > 0) { /* handle issues */ }
```

## 安全与数据范围

这是一个纯计算库。明确说明它能做什么和不能做什么是值得的：

- **不进行任何网络调用**——所有操作都在本地运行，完全离线
- **不访问文件系统**——它只处理您提供的数据
- **不收集遥测数据**——不会收集任何数据，也不会发送到任何地方
- **不使用凭据**——它绝不会触及身份验证令牌、cookie 或密钥
- **原型污染防护**——在解析之前会对不受信任的 JSON 进行清理

有关负责任地披露漏洞的详细信息，请参阅 [SECURITY.md](SECURITY.md)。

## 文档

| 文档 | 内容 |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | 深入了解：语法模型、完整的 API 参考、差异化策略、指纹识别、集成模式 |
| [CHANGELOG.md](CHANGELOG.md) | 发布历史和迁移说明 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 如何贡献 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 社区规范 |
| [SECURITY.md](SECURITY.md) | 漏洞报告 |
| [SHIP_GATE.md](SHIP_GATE.md) | 发布检查清单 |

## 许可证

MIT——请参阅 [LICENSE](LICENSE)。

[MCP Tool Shop](https://mcptoolshop.com) 的一部分。
