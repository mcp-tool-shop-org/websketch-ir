<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## これは何ですか？

AIにウェブ上で「目」を与えるための多くの手法は、スクリーンショットとビジョンモデルに依存しています。それは機能しますが、遅く、高価であり、DOM内にすでに存在するすべての構造を捨ててしまいます。

**WebSketch IR** は異なるアプローチを採用します。あらゆるウェブページのノイズが多く、深くネストされたHTMLを、22種類のUIプリミティブという小さく固定された語彙に変換します。例えば、`BUTTON`、`NAV`、`CARD`、`FORM`、`INPUT`などです。その結果として得られるのは、軽量なJSON形式のデータであり、LLM（大規模言語モデル）はこれを使用して直接推論を行うことができ、ビジョン機能は必要ありません。

これをウェブUIのための「アセンブリ言語」と考えるとわかりやすいでしょう。構造、形状、インタラクティブ性、セマンティクスが得られ、`<div>`の乱雑なコードは不要です。

## なぜこれを使うべきなのでしょうか？

- 高価なビジョンAPI呼び出しなしでウェブページを理解し、操作する必要がある**AIエージェントを構築している場合**
- LLMがイベントハンドラー、リアクティブな状態をマッピングし、レイアウトを生成または変更する**AI駆動のUIツールを設計している場合**
- ページが実際に意味のある方法で変更されたかどうかを検出するために、**ピクセルごとの差ではなく、構造的な差が必要な場合**
- キャッシュ、重複排除、またはページキャプチャ全体での変更検出のために、**フィンガープリントが必要な場合**

## 主な機能

| 機能 | その機能 |
|---------|-------------|
| **22種類のUIプリミティブ** | あらゆるDOMを`PAGE`、`BUTTON`、`NAV`、`CARD`、`INPUT`、`MODAL`、`TABLE`など、さらに15種類に変換します。実装ではなく意図を重視します。 |
| **Event Handlers** | `HandlerSignal`は、ノードがどのイベントに応答し、その理由をキャプチャします（例：`click → navigate`、`submit → validate_form`）。 |
| **Reactive State** | `StateSignal`は、各ノードが読み取り、書き込み、または条件とする状態を追跡します。ローカル、グローバル、およびURLの範囲にわたります。 |
| **Visual Intent** | `StyleIntent`トークン（例：`primary`、`destructive`、`elevated`、`ghost`）は、CSSではなく、何がどのように見えるかの*理由*を記述します。 |
| **Pattern Recognition** | `PatternSignal`は、再利用可能な構成要素を識別します：`search_bar`、`auth_form`、`product_card`、`wizard_step`、`dashboard_widget`など。 |
| **HTML Codegen** | あらゆるキャプチャからセマンティックなHTMLを出力します。ハンドラー、状態、スタイル、およびパターン用に`data-wsk-*`属性を持つ適切な要素に役割をマッピングします。 |
| **ASCII Wireframes** | LLMがビジョン機能なしで読み取れるように、キャプチャをテキストベースのワイヤーフレームとしてレンダリングします。 |
| **Structural Diffing** | DOM IDではなく、役割+形状+セマンティクスによって2つのキャプチャを比較します。 |
| **64ビットフィンガープリント** | 非常に低い衝突確率で高速な等価性チェックを行うためのFNV-1a 64ビットハッシュ。 |
| **Zero Dependencies** | 純粋なTypeScript — ランタイム依存関係はなく、推移的な依存関係もありません。Node 20+が実行できる場所であればどこでも動作します。 |

## 使い始めるには

```bash
npm install @mcptoolshop/websketch-ir
```

### キャプチャを解析して確認する

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

### キャプチャからHTMLを生成する

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

出力は、役割を適切なHTML要素（`BUTTON` → `<button>`、`NAV` → `<nav>`、`CARD` → `<article>`）にマッピングし、すべてのシグナルをデータ属性として公開します。

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

### LLM用のレンダリングモード

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

### 差分検出

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

### フィンガープリント

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

### サブパスのインポート

必要なものだけをインポートして、軽量に保つことができます。

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### ツリートラバーサルとビルダー

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

### クエリヘルパー

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### アドレス指定可能性と包含性

IDはライブラリの安定したクロスキャプチャハンドルであり（差分や出力されたIRに表示されます）。IDを使用してノードに戻すか、構造について推論します。

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

### Markdownレンダリング

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### JSONレンダラーとLLMによる差分サマリー

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

`RENDERERS`レジストリ（`{ html, ascii, llm, json, markdown }`）は、`@mcptoolshop/websketch-ir/codegen`サブパスから引き続き利用できます。

## 概要としての文法

キャプチャされたすべてのページは、`UINode`オブジェクトのツリーになります。各ノードが持つことができるのは次のとおりです。

| フィールド | 型 | 目的 |
|-------|------|---------|
| `role` | `UIRole` | 22種類のプリミティブのうちの1つ：`PAGE`、`BUTTON`、`NAV`、`CARD`、`INPUT`、`MODAL`など。 |
| `bbox` | `BBox01` | ビューポート相対のバウンディングボックス `[x, y, w, h]`（範囲は`[0, 1]`）。 |
| `text` | `TextSignal` | テキスト形状：ハッシュ、長さ、分類（`short`、`sentence`、`paragraph`）—実際のコンテンツではありません。 |
| `handlers` | `HandlerSignal[]` | イベント→意図のマッピング：`{ event: "click", intent: "toggle_menu" }` |
| `bindings` | `BindingSignal[]` | リアクティブなバインディング：`{ property: "value", expression: "state.email" }` |
| `state` | `StateSignal[]` | 状態の追跡：`{ key: "cart.items", access: "read", scope: "global" }` |
| `style` | `StyleIntent` | 視覚的な意図トークン：`primary`、`destructive`、`elevated`、`muted`、`ghost`など。 |
| `pattern` | `PatternSignal` | 再利用可能なパターン：`{ kind: "auth_form", variant: "login", slot: "header" }` |
| `semantic` | `string` | 「ログイン」、「検索」、「チェックアウト」などの大まかなヒント。 |
| `interactive` | `boolean` | ユーザーがクリックまたは入力できますか？ |
| `visible` | `boolean` | 実際に画面に表示されていますか？ |
| `children` | `UINode[]` | ネストされた子ノード（セマンティックなグループ化、DOMの子ではありません）。 |

### パターンの種類

パターンを使用すると、LLMは個々の役割を超えて、より高次の構成を認識できます。

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`

### スタイル意図トークン

デザインシステムレベルの視覚的なマーカー（CSSではありません）。

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`

## スキーマバージョン管理

- **現在のバージョン**：`0.1`
- **前方互換性**：不明なフィールドは無視されます。
- **バージョンチェック**：`isSupportedSchemaVersion("0.1")` → `true`
- **サポートされていない入力**：`WS_UNSUPPORTED_VERSION`をスローします。

## エラー処理

このライブラリから発生するすべてのエラーは、標準的なエラーコードを含む構造化された `WebSketchError` ペイロードを伴う `WebSketchException` です。

| コード | 発生状況 |
|------|-----------------|
| `WS_INVALID_JSON` | 入力が有効な JSON ではない |
| `WS_INVALID_CAPTURE` | キャプチャのスキーマ検証に失敗 |
| `WS_UNSUPPORTED_VERSION` | キャプチャバージョンがサポートされていない |
| `WS_LIMIT_EXCEEDED` | ノード数が多すぎる、または深すぎる |
| `WS_INVALID_ARGS` | 引数が不足しているか無効 |
| `WS_NOT_FOUND` | リソースが見つからない |
| `WS_IO_ERROR` | I/O 処理の失敗 |
| `WS_PERMISSION_DENIED` | 権限が不十分 |
| `WS_INTERNAL` | 予期しないエラーが発生した |

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

## セキュリティとデータ範囲

これは純粋な計算ライブラリです。何を行い、何を行わないかを明確に説明します。

- **ネットワークへのアクセスなし** — すべてローカルで実行され、完全にオフラインで使用可能
- **ファイルシステムへのアクセスなし** — 渡されたデータのみを処理する
- **テレメトリなし** — 何も収集せず、どこにも送信しない
- **認証情報なし** — 認証トークン、Cookie、または秘密情報を一切使用しない
- **プロトタイプ汚染対策** — 信頼できない JSON は解析前にサニタイズされる

責任ある情報開示の詳細については、[SECURITY.md](SECURITY.md) を参照してください。

## ドキュメント

| ドキュメント | 内容 |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | 詳細：文法モデル、完全な API リファレンス、差分検出戦略、フィンガープリンティング、統合パターン |
| [CHANGELOG.md](CHANGELOG.md) | リリース履歴と移行に関する注記 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 貢献方法 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | コミュニティの標準 |
| [SECURITY.md](SECURITY.md) | 脆弱性の報告 |
| [SHIP_GATE.md](SHIP_GATE.md) | リリースチェックリスト |

## ライセンス

MIT — [LICENSE](LICENSE) を参照。

[MCP Tool Shop](https://mcptoolshop.com) の一部です。
