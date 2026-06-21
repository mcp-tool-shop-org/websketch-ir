<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

## O que é isto?

A maioria das abordagens para fornecer "olhos" à IA na web dependem de capturas de tela e modelos de visão. Isso funciona, mas é lento, caro e descarta toda a estrutura que já está presente no DOM.

O **WebSketch IR** adota uma abordagem diferente. Ele compila o HTML ruidoso e profundamente aninhado de qualquer página da web em um pequeno vocabulário fixo de 22 primitivas de UI — elementos como `BUTTON`, `NAV`, `CARD`, `FORM`, `INPUT`. O resultado é uma captura JSON leve que um LLM pode analisar diretamente, sem necessidade de visão computacional.

Pense nisso como uma "linguagem de montagem" para interfaces de usuário da web. Você obtém a estrutura, a geometria, a interatividade e a semântica — sem a sopa de elementos `<div`.

## Por que eu usaria isso?

- **Você está criando agentes de IA** que precisam entender e interagir com páginas da web sem chamadas caras à API de visão computacional.
- **Você está projetando ferramentas de UI baseadas em IA**, onde um LLM mapeia manipuladores de eventos, estado reativo e, em seguida, gera ou modifica layouts.
- **Você deseja diferenças estruturais** — não diferenças de pixels — para detectar quando uma página realmente mudou de forma significativa.
- **Você precisa de impressões digitais** para armazenamento em cache, desduplicação ou detecção de alterações entre capturas de página.

## Principais recursos

| Recurso | O que ele faz |
|---------|-------------|
| **22 Primitivas de UI** | Compila qualquer DOM em `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, `TABLE` e mais 15 — priorizando a intenção sobre a implementação. |
| **Event Handlers** | `HandlerSignal` captura quais eventos um nó responde e por quê (por exemplo, `click → navigate`, `submit → validate_form`). |
| **Reactive State** | `StateSignal` rastreia qual estado cada nó lê, grava ou condiciona — em escopos local, global e de URL. |
| **Visual Intent** | Os tokens `StyleIntent`, como `primary`, `destructive`, `elevated`, `ghost`, descrevem *por que* algo tem a aparência que tem, não o CSS. |
| **Pattern Recognition** | `PatternSignal` identifica composições reutilizáveis: `search_bar`, `auth_form`, `product_card`, `wizard_step`, `dashboard_widget` e muito mais. |
| **HTML Codegen** | Emite HTML semântico de qualquer captura — mapeia funções para elementos apropriados com atributos `data-wsk-*` para manipuladores, estado, estilo e padrões. |
| **ASCII Wireframes** | Renderiza capturas como wireframes baseados em texto que os LLMs podem ler sem visão computacional. |
| **Structural Diffing** | Compara duas capturas por função + geometria + semântica, não pela identidade do DOM. |
| **Impressão Digital de 64 bits** | Hashing FNV-1a de 64 bits para verificações rápidas de igualdade com probabilidade extremamente baixa de colisão. |
| **Zero Dependencies** | TypeScript puro – sem dependências em tempo de execução, e sem dependências transitivas. Funciona em qualquer ambiente onde o Node 20 ou superior esteja instalado. |

## Primeiros passos

```bash
npm install @mcptoolshop/websketch-ir
```

### Analise uma captura e explore-a

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

### Gere HTML a partir de uma captura

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

A saída mapeia funções para elementos HTML apropriados (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) e expõe todos os sinais como atributos de dados:

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

### Modos de renderização para LLMs

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

### Comparação (Diffing)

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

### Impressão digital

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

### Importe subcaminhos

Você pode importar apenas o que precisa para manter tudo leve:

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### Travessia de árvore e construtores

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

### Auxiliares de consulta

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### Endereçamento e contenção

Os IDs são o identificador estável da biblioteca para capturas (eles aparecem nas comparações e no IR emitido). Resolva um ID para obter um nó ou analise a estrutura:

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

### Renderização em Markdown

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### Renderizador JSON e resumo de comparação para LLM

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

O registro `RENDERERS` (`{ html, ascii, llm, json, markdown }`) permanece disponível no subcaminho `@mcptoolshop/websketch-ir/codegen`.

## A gramática em resumo

Cada página capturada se torna uma árvore de objetos `UINode`. Aqui está o que cada nó pode conter:

| Campo | Tipo | Finalidade |
|-------|------|---------|
| `role` | `UIRole` | Um dos 22 primitivos: `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, etc. |
| `bbox` | `BBox01` | Caixa delimitadora relativa à viewport `[x, y, w, h]` na faixa de `[0, 1]`. |
| `text` | `TextSignal` | Forma do texto: hash, comprimento, classificação (`short`, `sentence`, `paragraph`) — não o conteúdo real. |
| `handlers` | `HandlerSignal[]` | Mapeamentos de evento para intenção: `{ event: "click", intent: "toggle_menu" }`. |
| `bindings` | `BindingSignal[]` | Ligações reativas: `{ property: "value", expression: "state.email" }`. |
| `state` | `StateSignal[]` | Rastreamento de estado: `{ key: "cart.items", access: "read", scope: "global" }`. |
| `style` | `StyleIntent` | Tokens de intenção visual: `primary`, `destructive`, `elevated`, `muted`, `ghost`, etc. |
| `pattern` | `PatternSignal` | Padrão reutilizável: `{ kind: "auth_form", variant: "login", slot: "header" }`. |
| `semantic` | `string` | Dica geral, como `"login"`, `"search"`, `"checkout"`. |
| `interactive` | `boolean` | O usuário pode clicar/digitar neste elemento? |
| `visible` | `boolean` | Ele está realmente visível na tela? |
| `children` | `UINode[]` | Nós filhos aninhados (agrupamento semântico, não nós filhos do DOM). |

### Tipos de padrões

Os padrões permitem que os LLMs reconheçam composições de nível superior além de funções individuais:

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`.

### Tokens de intenção de estilo

Marcadores visuais em nível de sistema de design (não CSS):

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`.

## Versionamento de esquema

- **Versão atual**: `0.1`
- **Compatibilidade futura**: campos desconhecidos são ignorados silenciosamente.
- **Verificação de versão**: `isSupportedSchemaVersion("0.1")` → `true`.
- **Entrada não suportada**: lança `WS_UNSUPPORTED_VERSION`.

## Tratamento de erros

Cada erro desta biblioteca é um `WebSketchException` que contém uma carga útil estruturada `WebSketchError` com um código de erro canônico:

| Código | Quando ocorre |
|------|-----------------|
| `WS_INVALID_JSON` | A entrada não é um JSON válido |
| `WS_INVALID_CAPTURE` | Falha na validação do esquema durante a captura |
| `WS_UNSUPPORTED_VERSION` | A versão de captura não é suportada |
| `WS_LIMIT_EXCEEDED` | Número excessivo de nós ou profundidade muito grande |
| `WS_INVALID_ARGS` | Argumentos ausentes ou inválidos |
| `WS_NOT_FOUND` | Recurso não encontrado |
| `WS_IO_ERROR` | Falha de E/S |
| `WS_PERMISSION_DENIED` | Permissões insuficientes |
| `WS_INTERNAL` | Ocorreu um erro inesperado |

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

## Segurança e escopo dos dados

Esta é uma biblioteca puramente computacional. É importante esclarecer o que ela faz e o que não faz:

- **Sem chamadas de rede** — tudo é executado localmente, totalmente offline
- **Sem acesso ao sistema de arquivos** — processa apenas os dados fornecidos
- **Sem telemetria** — nada é coletado, nada é enviado para lugar nenhum
- **Sem credenciais** — nunca acessa tokens de autenticação, cookies ou segredos
- **Proteção contra poluição de protótipos** — JSON não confiável é higienizado antes da análise

Consulte [SECURITY.md](SECURITY.md) para obter detalhes sobre como relatar vulnerabilidades de forma responsável.

## Documentação

| Documento | O que contém |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | Análise aprofundada: modelo gramatical, referência completa da API, estratégias de comparação, identificação de padrões, padrões de integração |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de lançamentos e notas de migração |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Padrões da comunidade |
| [SECURITY.md](SECURITY.md) | Relato de vulnerabilidades |
| [SHIP_GATE.md](SHIP_GATE.md) | Lista de verificação para lançamento |

## Licença

MIT — consulte [LICENSE](LICENSE).

Parte do [MCP Tool Shop](https://mcptoolshop.com).
