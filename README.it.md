<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## Cos'è questo?

La maggior parte degli approcci per fornire all'IA "occhi" sul web si basano su screenshot e modelli di visione. Funziona, ma è lento, costoso e scarta tutta la struttura che è già presente nel DOM.

**WebSketch IR** adotta un approccio diverso. Compila l'HTML rumoroso e profondamente nidificato di qualsiasi pagina web in un piccolo vocabolario fisso di 22 elementi UI di base (ad esempio, `BUTTON`, `NAV`, `CARD`, `FORM`, `INPUT`). Il risultato è una rappresentazione JSON leggera che un LLM può analizzare direttamente, senza la necessità di visione artificiale.

Consideralo come un "linguaggio assembly" per le interfacce utente web. Si ottiene la struttura, la geometria, l'interattività e la semantica, il tutto senza il "brodo" di elementi `<div>`.

## Perché dovrei usarlo?

- **Stai creando agenti AI** che devono comprendere e interagire con le pagine web senza costose chiamate alle API di visione artificiale.
- **Stai progettando strumenti UI basati sull'IA**, in cui un LLM mappa i gestori di eventi, lo stato reattivo e quindi genera o modifica i layout.
- **Vuoi differenze strutturali** (non differenze a livello di pixel) per rilevare quando una pagina è effettivamente cambiata in modo significativo.
- **Hai bisogno di impronte digitali** per la memorizzazione nella cache, la deduplicazione o il rilevamento delle modifiche tra le acquisizioni di pagine.

## Caratteristiche principali

| Funzionalità | Cosa fa |
|---------|-------------|
| **22 elementi UI di base** | Compila qualsiasi DOM in `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, `TABLE` e altri 15 elementi, dando priorità all'intento piuttosto che all'implementazione. |
| **Event Handlers** | `HandlerSignal` cattura a quali eventi un nodo risponde e perché (ad esempio, `click → navigate`, `submit → validate_form`). |
| **Reactive State** | `StateSignal` tiene traccia di quale stato ogni nodo legge, scrive o condiziona, sia a livello locale che globale, comprese le URL. |
| **Visual Intent** | I token `StyleIntent` come `primary`, `destructive`, `elevated`, `ghost` descrivono *perché* qualcosa ha un determinato aspetto, non il CSS. |
| **Pattern Recognition** | `PatternSignal` identifica composizioni riutilizzabili: `search_bar`, `auth_form`, `product_card`, `wizard_step`, `dashboard_widget` e altro ancora. |
| **HTML Codegen** | Emette HTML semantico da qualsiasi acquisizione, mappando i ruoli agli elementi appropriati con attributi `data-wsk-*` per gestori, stato, stile e modelli. |
| **ASCII Wireframes** | Renderizza le acquisizioni come wireframe basati su testo che gli LLM possono leggere senza visione artificiale. |
| **Structural Diffing** | Confronta due acquisizioni in base al ruolo + geometria + semantica, non all'identità del DOM. |
| **Impronta digitale a 64 bit** | Hashing FNV-1a a 64 bit per controlli di uguaglianza rapidi con una probabilità di collisione estremamente bassa. |
| **Zero Dependencies** | TypeScript puro: nessuna dipendenza in fase di esecuzione, nessun effetto a cascata sulle dipendenze. Funziona ovunque funzioni Node versione 20 o successiva. |

## Iniziare

```bash
npm install @mcptoolshop/websketch-ir
```

### Analizza un'acquisizione ed esplorala

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

### Genera HTML da un'acquisizione

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

L'output mappa i ruoli agli elementi HTML appropriati (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) e rende disponibili tutti i segnali come attributi dati.

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

### Modalità di rendering per gli LLM

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

### Differenziazione

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

### Impronta digitale

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

### Importa sottopercorsi

Puoi importare solo ciò di cui hai bisogno per mantenere le cose leggere:

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### Attraversamento dell'albero e generatori

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

### Helper per le query

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### Indirizzabilità e contenimento

Gli ID sono l'handle stabile della libreria tra le acquisizioni (appaiono nelle differenze e nell'IR emesso). Risolvi uno di essi in un nodo o analizza la struttura:

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

### Rendering Markdown

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### Renderer JSON e riepilogo delle differenze per LLM

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

Il registro `RENDERERS` (`{ html, ascii, llm, json, markdown }`) rimane disponibile dal sottopercorso `@mcptoolshop/websketch-ir/codegen`.

## La grammatica in sintesi

Ogni pagina acquisita diventa un albero di oggetti `UINode`. Ecco cosa può contenere ogni nodo:

| Campo | Tipo | Scopo |
|-------|------|---------|
| `role` | `UIRole` | Uno dei 22 elementi di base: `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, ecc. |
| `bbox` | `BBox01` | Rettangolo delimitatore relativo alla finestra (`[x, y, w, h]`) nell'intervallo `[0, 1]` |
| `text` | `TextSignal` | Forma del testo: hash, lunghezza, classificazione (`short`, `sentence`, `paragraph`) - non il contenuto effettivo. |
| `handlers` | `HandlerSignal[]` | Mappature evento → intento: `{ event: "click", intent: "toggle_menu" }` |
| `bindings` | `BindingSignal[]` | Binding reattivi: `{ property: "value", expression: "state.email" }` |
| `state` | `StateSignal[]` | Tracciamento dello stato: `{ key: "cart.items", access: "read", scope: "global" }` |
| `style` | `StyleIntent` | Token di intento visivo: `primary`, `destructive`, `elevated`, `muted`, `ghost`, ecc. |
| `pattern` | `PatternSignal` | Modello riutilizzabile: `{ kind: "auth_form", variant: "login", slot: "header" }` |
| `semantic` | `string` | Suggerimento generico come `"login"`, `"search"`, `"checkout"` |
| `interactive` | `boolean` | L'utente può fare clic/digitare su questo? |
| `visible` | `boolean` | È effettivamente visibile sullo schermo? |
| `children` | `UINode[]` | Nodi figlio nidificati (raggruppamento semantico, non elementi figlio del DOM) |

### Tipi di modelli

I modelli consentono agli LLM di riconoscere composizioni di livello superiore oltre ai singoli ruoli:

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`

### Token di intento di stile

Indicatori visivi a livello di design system (non CSS):

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`

## Versioning dello schema

- **Versione corrente**: `0.1`
- **Compatibilità in avanti**: i campi sconosciuti vengono ignorati silenziosamente
- **Controllo della versione**: `isSupportedSchemaVersion("0.1")` → `true`
- **Input non supportato**: genera un errore `WS_UNSUPPORTED_VERSION`

## Gestione degli errori

Ogni errore proveniente da questa libreria è un `WebSketchException` che contiene un payload strutturato `WebSketchError` con un codice di errore standard:

| Codice | Quando si verifica |
|------|-----------------|
| `WS_INVALID_JSON` | L'input non è un JSON valido |
| `WS_INVALID_CAPTURE` | La fase di acquisizione fallisce la validazione dello schema |
| `WS_UNSUPPORTED_VERSION` | La versione di acquisizione non è supportata |
| `WS_LIMIT_EXCEEDED` | Troppi nodi o profondità eccessiva |
| `WS_INVALID_ARGS` | Argomenti mancanti o errati |
| `WS_NOT_FOUND` | Risorsa non trovata |
| `WS_IO_ERROR` | Errore di I/O |
| `WS_PERMISSION_DENIED` | Permessi insufficienti |
| `WS_INTERNAL` | Si è verificato un errore imprevisto |

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

## Sicurezza e ambito dei dati

Questa è una libreria puramente computazionale. È importante specificare chiaramente cosa fa e cosa non fa:

- **Nessuna chiamata di rete:** tutto viene eseguito localmente, completamente offline
- **Nessun accesso al file system:** elabora solo i dati che gli vengono forniti
- **Nessuna telemetria:** nulla viene raccolto o inviato da nessuna parte
- **Nessuna credenziale:** non accede mai a token di autenticazione, cookie o segreti
- **Protezione contro la contaminazione del prototipo:** il JSON non attendibile viene sanificato prima dell'analisi

Per i dettagli sulla divulgazione responsabile, consultare [SECURITY.md](SECURITY.md).

## Documentazione

| Documento | Contenuto |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | Analisi approfondita: modello grammaticale, riferimento completo all'API, strategie di confronto, fingerprinting, modelli di integrazione |
| [CHANGELOG.md](CHANGELOG.md) | Cronologia delle versioni e note sulla migrazione |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Come contribuire |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Standard della comunità |
| [SECURITY.md](SECURITY.md) | Segnalazione di vulnerabilità |
| [SHIP_GATE.md](SHIP_GATE.md) | Lista di controllo per il rilascio |

## Licenza

MIT — vedere [LICENSE](LICENSE).

Parte di [MCP Tool Shop](https://mcptoolshop.com).
