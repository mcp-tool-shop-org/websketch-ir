<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## Qu'est-ce que c'est ?

La plupart des approches pour doter l'IA d'"yeux" sur le web reposent sur des captures d'écran et des modèles de vision. Cela fonctionne, mais c'est lent, coûteux, et cela supprime toute la structure qui est déjà présente dans le DOM.

**WebSketch IR** adopte une approche différente. Il compile le HTML bruyant et profondément imbriqué de n'importe quelle page web en un petit vocabulaire fixe de 22 primitives d'interface utilisateur (UI) — des éléments tels que `BUTTON`, `NAV`, `CARD`, `FORM`, `INPUT`. Le résultat est une capture JSON légère qu'un LLM peut analyser directement, sans nécessiter de vision.

Considérez cela comme un "langage d'assemblage" pour les interfaces utilisateur web. Vous obtenez la structure, la géométrie, l'interactivité et la sémantique — sans le "pot-pourri" de `<div`.

## Pourquoi utiliserais-je ceci ?

- **Vous créez des agents d'IA** qui doivent comprendre et interagir avec les pages web sans avoir recours à des appels coûteux aux API de vision.
- **Vous concevez des outils d'interface utilisateur basés sur l'IA**, où un LLM mappe les gestionnaires d'événements, l'état réactif, puis génère ou modifie les mises en page.
- **Vous souhaitez obtenir des différences structurelles** — et non des différences de pixels — pour détecter quand une page a réellement changé de manière significative.
- **Vous avez besoin d'empreintes digitales** pour la mise en cache, la déduplication ou la détection des modifications entre les captures de pages.

## Fonctionnalités clés

| Fonctionnalité | Ce qu'elle fait |
|---------|-------------|
| **22 primitives d'interface utilisateur** | Compile n'importe quel DOM en `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, `TABLE` et 15 autres — l'intention prime sur l'implémentation. |
| **Event Handlers** | `HandlerSignal` capture les événements auxquels un nœud répond et pourquoi (par exemple, `click → navigate`, `submit → validate_form`). |
| **Reactive State** | `StateSignal` suit l'état que chaque nœud lit, écrit ou conditionne — dans les portées locale, globale et URL. |
| **Visual Intent** | Les jetons `StyleIntent` tels que `primary`, `destructive`, `elevated`, `ghost` décrivent *pourquoi* quelque chose a l'apparence qu'il a, et non le CSS. |
| **Pattern Recognition** | `PatternSignal` identifie les compositions réutilisables : `search_bar`, `auth_form`, `product_card`, `wizard_step`, `dashboard_widget`, etc. |
| **HTML Codegen** | Génère du HTML sémantique à partir de n'importe quelle capture — mappe les rôles aux éléments appropriés avec des attributs `data-wsk-*` pour les gestionnaires, l'état, le style et les modèles. |
| **ASCII Wireframes** | Affiche les captures sous forme de maquettes textuelles que les LLM peuvent lire sans vision. |
| **Structural Diffing** | Compare deux captures par rôle + géométrie + sémantique, et non par identité DOM. |
| **Empreinte digitale 64 bits** | Hachage FNV-1a 64 bits pour des vérifications d'égalité rapides avec une probabilité de collision extrêmement faible. |
| **Zero Dependencies** | TypeScript pur — pas de dépendances au moment de l'exécution, zéro dépendance transitive. Fonctionne partout où Node 20+ fonctionne. |

## Premiers pas

```bash
npm install @mcptoolshop/websketch-ir
```

### Analysez une capture et explorez-la

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

### Générez du HTML à partir d'une capture

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

La sortie mappe les rôles aux éléments HTML appropriés (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) et expose tous les signaux sous forme d'attributs de données :

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

### Modes de rendu pour les LLM

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

### Différenciation

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

### Empreinte digitale

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

### Importation de sous-chemins

Vous pouvez importer uniquement ce dont vous avez besoin pour que le tout reste léger :

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### Parcours d'arbres et constructeurs

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

### Aides à la requête

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### Adressabilité et inclusion

Les identifiants sont les références stables de la bibliothèque entre les captures (ils apparaissent dans les différences et l'IR généré). Résolvez un identifiant pour qu'il renvoie un nœud, ou analysez la structure :

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

### Rendu Markdown

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### Générateur JSON et résumé des différences pour LLM

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

Le registre `RENDERERS` (`{ html, ascii, llm, json, markdown }`) reste disponible à partir du sous-chemin `@mcptoolshop/websketch-ir/codegen`.

## La grammaire en bref

Chaque page capturée devient un arbre d'objets `UINode`. Voici ce que chaque nœud peut contenir :

| Champ | Type | Objectif |
|-------|------|---------|
| `role` | `UIRole` | Une des 22 primitives : `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, etc. |
| `bbox` | `BBox01` | Boîte englobante relative à la zone d'affichage `[x, y, w, h]` dans la plage `[0, 1]`. |
| `text` | `TextSignal` | Forme du texte : hachage, longueur, classification (`short`, `sentence`, `paragraph`) — et non le contenu réel. |
| `handlers` | `HandlerSignal[]` | Mappages événement → intention : `{ event: "click", intent: "toggle_menu" }`. |
| `bindings` | `BindingSignal[]` | Liaisons réactives : `{ property: "value", expression: "state.email" }`. |
| `state` | `StateSignal[]` | Suivi de l'état : `{ key: "cart.items", access: "read", scope: "global" }`. |
| `style` | `StyleIntent` | Jetons d'intention visuelle : `primary`, `destructive`, `elevated`, `muted`, `ghost`, etc. |
| `pattern` | `PatternSignal` | Modèle réutilisable : `{ kind: "auth_form", variant: "login", slot: "header" }`. |
| `semantic` | `string` | Indication générale comme `"login"`, `"search"`, `"checkout"`. |
| `interactive` | `boolean` | L'utilisateur peut-il cliquer/taper sur cet élément ? |
| `visible` | `boolean` | Est-ce que l'élément est réellement affiché à l'écran ? |
| `children` | `UINode[]` | Nœuds enfants imbriqués (groupement sémantique, et non enfants DOM). |

### Types de modèles

Les modèles permettent aux LLM de reconnaître des compositions de niveau supérieur au-delà des rôles individuels :

`search_bar` · `auth_form` · `product_card` · `nav_menu` · `data_table` · `wizard_step` · `media_player` · `chat_thread` · `dashboard_widget` · `custom`.

### Jetons d'intention de style

Marqueurs visuels au niveau du système de conception (et non CSS) :

`primary` · `secondary` · `destructive` · `success` · `warning` · `info` · `muted` · `elevated` · `outlined` · `ghost` · `inverted` · `highlight` · `truncated` · `monospace` · `custom`.

## Versioning du schéma

- **Version actuelle :** `0.1`.
- **Compatibilité ascendante :** les champs inconnus sont ignorés silencieusement.
- **Vérification de la version :** `isSupportedSchemaVersion("0.1")` → `true`.
- **Entrée non prise en charge :** lève une exception `WS_UNSUPPORTED_VERSION`.

## Gestion des erreurs

Chaque erreur de cette bibliothèque est une exception `WebSketchException` qui contient une charge utile structurée `WebSketchError` avec un code d’erreur standard :

| Code | Quand cela se produit |
|------|-----------------|
| `WS_INVALID_JSON` | L’entrée n’est pas un JSON valide |
| `WS_INVALID_CAPTURE` | Échec de la validation du schéma lors de la capture |
| `WS_UNSUPPORTED_VERSION` | La version de capture n’est pas prise en charge |
| `WS_LIMIT_EXCEEDED` | Trop de nœuds ou trop de profondeur |
| `WS_INVALID_ARGS` | Arguments manquants ou incorrects |
| `WS_NOT_FOUND` | Ressource introuvable |
| `WS_IO_ERROR` | Échec d’entrée/sortie |
| `WS_PERMISSION_DENIED` | Permissions insuffisantes |
| `WS_INTERNAL` | Une erreur inattendue s’est produite |

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

## Sécurité et portée des données

Il s’agit d’une bibliothèque de calcul pur. Il est important de préciser ce qu’elle fait et ne fait pas :

- **Aucun appel réseau** — tout s’exécute localement, en mode hors ligne complet
- **Aucun accès au système de fichiers** — elle traite uniquement les données que vous lui fournissez
- **Aucune télémétrie** — rien n’est collecté, rien n’est envoyé nulle part
- **Aucun identifiant** — elle ne touche jamais aux jetons d’authentification, aux cookies ou aux secrets
- **Protection contre la pollution du prototype** — les données JSON non fiables sont nettoyées avant l’analyse

Consultez le fichier [SECURITY.md](SECURITY.md) pour connaître les détails concernant la divulgation responsable.

## Documentation

| Document | Contenu |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | Analyse approfondie : modèle de grammaire, référence complète de l’API, stratégies de comparaison, empreinte numérique, modèles d’intégration |
| [CHANGELOG.md](CHANGELOG.md) | Historique des versions et notes sur la migration |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Comment contribuer |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Normes communautaires |
| [SECURITY.md](SECURITY.md) | Signalement des vulnérabilités |
| [SHIP_GATE.md](SHIP_GATE.md) | Liste de contrôle pour la publication |

## Licence

MIT — voir [LICENSE](LICENSE).

Fait partie de [MCP Tool Shop](https://mcptoolshop.com).
