<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## ¿Qué es esto?

La mayoría de los enfoques para dotar a la IA de "ojos" en la web se basan en capturas de pantalla y modelos de visión. Esto funciona, pero es lento, costoso y descarta toda la estructura que ya existe en el DOM.

**WebSketch IR** adopta un enfoque diferente. Compila el HTML ruidoso y profundamente anidado de cualquier página web en un pequeño vocabulario fijo de 22 primitivas de UI (elementos de la interfaz de usuario), como `BUTTON`, `NAV`, `CARD`, `FORM`, `INPUT`. El resultado es una captura JSON ligera que un LLM puede analizar directamente, sin necesidad de visión artificial.

Piénsalo como un "lenguaje ensamblador" para las interfaces de usuario web. Obtienes la estructura, la geometría, la interactividad y la semántica, todo ello sin el "caldo" de etiquetas `<div`.

## ¿Por qué lo usaría?

- **Estás creando agentes de IA** que necesitan comprender e interactuar con las páginas web sin realizar costosas llamadas a la API de visión.
- **Estás diseñando herramientas de UI basadas en IA**, donde un LLM mapea los controladores de eventos, el estado reactivo y luego genera o modifica los diseños.
- **Necesitas diferencias estructurales** (no diferencias de píxeles) para detectar cuándo una página ha cambiado realmente de forma significativa.
- **Necesitas huellas digitales** para la caché, la desduplicación o la detección de cambios en las capturas de página.

## Características principales

| Característica | Qué hace |
|---------|-------------|
| **22 primitivas de UI** | Compila cualquier DOM en `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, `TABLE` y 15 elementos más, priorizando la intención sobre la implementación. |
| **Event Handlers** | `HandlerSignal` captura a qué eventos responde un nodo y por qué (por ejemplo, `click → navigate`, `submit → validate_form`). |
| **Reactive State** | `StateSignal` rastrea qué estado lee, escribe o condiciona cada nodo, en los ámbitos local, global y de URL. |
| **Visual Intent** | Los tokens `StyleIntent`, como `primary`, `destructive`, `elevated`, `ghost`, describen *por qué* algo tiene el aspecto que tiene, no el CSS. |
| **Pattern Recognition** | `PatternSignal` identifica composiciones reutilizables: `search_bar`, `auth_form`, `product_card`, `wizard_step`, `dashboard_widget` y más. |
| **HTML Codegen** | Genera HTML semántico a partir de cualquier captura, asignando roles a los elementos adecuados con atributos `data-wsk-*` para controladores, estado, estilo y patrones. |
| **ASCII Wireframes** | Renderiza las capturas como esquemas de alambre basados en texto que los LLM pueden leer sin necesidad de visión artificial. |
| **Structural Diffing** | Compara dos capturas por rol + geometría + semántica, no por la identidad del DOM. |
| **Huellas digitales de 64 bits** | Hashing FNV-1a de 64 bits para comprobaciones rápidas de igualdad con una probabilidad extremadamente baja de colisión. |
| **Zero Dependencies** | TypeScript puro: sin dependencias en tiempo de ejecución y sin dependencias transitivas. Funciona en cualquier entorno donde se ejecute Node 20 o superior. |

## Primeros pasos

```bash
npm install @mcptoolshop/websketch-ir
```

### Analiza una captura y explórala

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

### Genera HTML a partir de una captura

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

La salida asigna los roles a los elementos HTML adecuados (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) y muestra todas las señales como atributos de datos:

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

### Modos de renderizado para LLM

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

### Diferenciación

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

### Huellas digitales

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

### Importa subrutas

Puedes importar solo lo que necesitas para mantener todo ligero:

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### Recorrido de árbol y generadores

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

### Ayudantes de consulta

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### Direccionamiento y contención

Los ID son el identificador estable entre capturas de la biblioteca (aparecen en las diferencias y en la IR generada). Resuelve uno para volver a un nodo o analiza la estructura:

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

### Renderizado Markdown

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### Renderizador JSON y resumen de diferencias para LLM

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

El registro `RENDERERS` (`{ html, ascii, llm, json, markdown }`) sigue estando disponible desde la subruta `@mcptoolshop/websketch-ir/codegen`.

## La gramática en pocas palabras

Cada página capturada se convierte en un árbol de objetos `UINode`. Aquí tienes lo que puede contener cada nodo:

| Campo | Tipo | Propósito |
|-------|------|---------|
| `role` | `UIRole` | Una de las 22 primitivas: `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, etc. |
| `bbox` | `BBox01` | Caja delimitadora relativa a la ventana gráfica `[x, y, w, h]` en el rango `[0, 1]` |
| `text` | `TextSignal` | Forma del texto: hash, longitud, clasificación (`short`, `sentence`, `paragraph`) — no el contenido real. |
| `handlers` | `HandlerSignal[]` | Mapeos de evento a intención: `{ event: "click", intent: "toggle_menu" }` |
| `bindings` | `BindingSignal[]` | Enlaces reactivos: `{ property: "value", expression: "state.email" }` |
| `state` | `StateSignal[]` | Seguimiento del estado: `{ key: "cart.items", access: "read", scope: "global" }` |
| `style` | `StyleIntent` | Tokens de intención visual: `primary`, `destructive`, `elevated`, `muted`, `ghost`, etc. |
| `pattern` | `PatternSignal` | Patrón reutilizable: `{ kind: "auth_form", variant: "login", slot: "header" }` |
| `semantic` | `string` | Indicación general como `"login"`, `"search"`, `"checkout"` |
| `interactive` | `boolean` | ¿Puede el usuario hacer clic o escribir en esto? |
| `visible` | `boolean` | ¿Está realmente visible en la pantalla? |
| `children` | `UINode[]` | Nodos secundarios anidados (agrupación semántica, no nodos secundarios del DOM) |

### Tipos de patrones

Los patrones permiten a los LLM reconocer composiciones de nivel superior más allá de los roles individuales:

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`

### Tokens de intención de estilo

Marcadores visuales a nivel del sistema de diseño (no CSS):

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`

## Control de versiones del esquema

- **Versión actual**: `0.1`
- **Compatible con versiones futuras**: los campos desconocidos se ignoran silenciosamente
- **Comprobación de la versión**: `isSupportedSchemaVersion("0.1")` → `true`
- **Entrada no compatible**: lanza `WS_UNSUPPORTED_VERSION`

## Manejo de errores

Cada error de esta biblioteca es una `WebSketchException` que contiene una carga útil estructurada `WebSketchError` con un código de error canónico:

| Código | Cuándo ocurre |
|------|-----------------|
| `WS_INVALID_JSON` | La entrada no es un JSON válido |
| `WS_INVALID_CAPTURE` | Falla la validación del esquema durante la captura |
| `WS_UNSUPPORTED_VERSION` | La versión de captura no es compatible |
| `WS_LIMIT_EXCEEDED` | Demasiados nodos o demasiada profundidad |
| `WS_INVALID_ARGS` | Argumentos faltantes o incorrectos |
| `WS_NOT_FOUND` | Recurso no encontrado |
| `WS_IO_ERROR` | Fallo de entrada/salida |
| `WS_PERMISSION_DENIED` | Permisos insuficientes |
| `WS_INTERNAL` | Ocurrió algo inesperado |

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

## Seguridad y alcance de los datos

Esta es una biblioteca puramente computacional. Es importante ser explícito sobre lo que hace y lo que no:

- **No se realizan llamadas a la red:** todo se ejecuta localmente, completamente sin conexión.
- **No se accede al sistema de archivos:** solo procesa los datos que se le proporcionan.
- **No hay telemetría:** no se recopila nada ni se envía a ningún lugar.
- **No se utilizan credenciales:** nunca manipula tokens de autenticación, cookies o secretos.
- **Protección contra la contaminación del prototipo:** el JSON no confiable se limpia antes de analizarlo.

Consulte [SECURITY.md](SECURITY.md) para obtener detalles sobre cómo informar responsablemente sobre vulnerabilidades.

## Documentación

| Documento | Qué contiene |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | Análisis en profundidad: modelo gramatical, referencia completa de la API, estrategias de comparación, huellas digitales, patrones de integración. |
| [CHANGELOG.md](CHANGELOG.md) | Historial de versiones y notas de migración |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo contribuir |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Normas de la comunidad |
| [SECURITY.md](SECURITY.md) | Informes de vulnerabilidades |
| [SHIP_GATE.md](SHIP_GATE.md) | Lista de verificación de lanzamiento |

## Licencia

MIT: consulte [LICENSE](LICENSE).

Parte de [MCP Tool Shop](https://mcptoolshop.com).
