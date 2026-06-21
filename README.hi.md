<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## यह क्या है?

वेब पर एआई को "आंखें" देने के अधिकांश तरीकों में स्क्रीनशॉट और विज़न मॉडल का उपयोग किया जाता है। यह काम करता है, लेकिन यह धीमा, महंगा है, और उस सभी संरचना को त्याग देता है जो पहले से ही DOM में मौजूद है।

**वेबस्केच आईआर** एक अलग दृष्टिकोण अपनाता है। यह किसी भी वेब पेज के शोरगुल वाले, गहराई से नेस्टेड HTML को 22 UI प्रिमिटिव्स की एक छोटी, निश्चित शब्दावली में संकलित करता है - जैसे `BUTTON`, `NAV`, `CARD`, `FORM`, `INPUT`। परिणाम एक हल्का JSON कैप्चर है जिसके बारे में एक LLM सीधे तर्क कर सकता है, इसके लिए किसी विज़न की आवश्यकता नहीं है।

इसे वेब यूआई के लिए "असेंबली भाषा" के रूप में सोचें। आपको संरचना, ज्यामिति, इंटरैक्टिविटी और सिमेंटिक्स मिलते हैं - `<div>` के ढेर के बिना।

## मैं इसका उपयोग क्यों करूंगा?

- **आप एआई एजेंट बना रहे हैं** जिन्हें महंगे विज़न एपीआई कॉल के बिना वेब पेजों को समझने और उनके साथ इंटरैक्ट करने की आवश्यकता है।
- **आप एआई-संचालित यूआई टूल डिज़ाइन कर रहे हैं** जहां एक LLM इवेंट हैंडलर, प्रतिक्रियाशील स्थिति का मानचित्रण करता है, और फिर लेआउट उत्पन्न या संशोधित करता है।
- **आपको संरचनात्मक अंतरों** - पिक्सेल अंतरों की नहीं - की आवश्यकता है ताकि यह पता लगाया जा सके कि कोई पृष्ठ वास्तव में किसी सार्थक तरीके से कब बदला है।
- **आपको फ़िंगरप्रिंट्स** की आवश्यकता है जो पेज कैप्चर में कैशिंग, डुप्लिकेट हटाने या परिवर्तन का पता लगाने के लिए उपयोग किए जा सकते हैं।

## मुख्य विशेषताएं

| सुविधा | यह क्या करता है |
|---------|-------------|
| **22 यूआई प्रिमिटिव्स** | किसी भी DOM को `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, `TABLE` और 15 अन्य में संकलित करता है - कार्यान्वयन से अधिक इरादे पर ध्यान केंद्रित। |
| **Event Handlers** | `HandlerSignal` कैप्चर करता है कि कोई नोड किन घटनाओं का जवाब देता है और क्यों (उदाहरण के लिए, `click → navigate`, `submit → validate_form`) |
| **Reactive State** | `StateSignal` ट्रैक करता है कि प्रत्येक नोड किस स्थिति को पढ़ता है, लिखता है या उस पर निर्भर करता है - स्थानीय, वैश्विक और यूआरएल स्कोप में। |
| **Visual Intent** | `StyleIntent` टोकन जैसे `primary`, `destructive`, `elevated`, `ghost` यह बताते हैं कि किसी चीज़ का स्वरूप कैसा दिखता है, न कि CSS। |
| **Pattern Recognition** | `PatternSignal` पुन: प्रयोज्य रचनाओं की पहचान करता है: `search_bar`, `auth_form`, `product_card`, `wizard_step`, `dashboard_widget`, और अन्य। |
| **HTML Codegen** | किसी भी कैप्चर से सिमेंटिक HTML उत्पन्न करें - हैंडलर, स्थिति, शैली और पैटर्न के लिए `data-wsk-*` विशेषताओं के साथ भूमिकाओं को उचित तत्वों पर मैप करता है। |
| **ASCII Wireframes** | कैप्चर को टेक्स्ट-आधारित वायरफ्रेम के रूप में प्रस्तुत करें जिन्हें LLM विज़न के बिना पढ़ सकते हैं। |
| **Structural Diffing** | दो कैप्चर की तुलना भूमिका + ज्यामिति + सिमेंटिक्स द्वारा करें, न कि DOM पहचान द्वारा। |
| **64-बिट फिंगरप्रिंटिंग** | अत्यधिक कम टकराव संभावना के साथ तेज़ समानता जांच के लिए FNV-1a 64-बिट हैशिंग। |
| **Zero Dependencies** | शुद्ध टाइपस्क्रिप्ट - कोई रनटाइम निर्भरता नहीं, शून्य पारगमन निर्भरताएं। जहां भी नोड 20+ चलता है, वहां चलता है। |

## शुरू करना

```bash
npm install @mcptoolshop/websketch-ir
```

### एक कैप्चर को पार्स करें और उसका अन्वेषण करें

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

### किसी कैप्चर से HTML उत्पन्न करें

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

आउटपुट भूमिकाओं को उचित HTML तत्वों (`BUTTON` → `<button>`, `NAV` → `<nav>`, `CARD` → `<article>`) पर मैप करता है और सभी संकेतों को डेटा विशेषताओं के रूप में प्रस्तुत करता है:

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

### LLM के लिए रेंडरिंग मोड

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

### अंतर निकालना

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

### फिंगरप्रिंटिंग

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

### उप-पथ आयात करें

आप केवल वही आयात कर सकते हैं जिसकी आपको आवश्यकता है ताकि चीजें सरल रहें:

```typescript
// Types only — no runtime code pulled in
import type { UINode, UIRole, PatternSignal, HandlerSignal } from '@mcptoolshop/websketch-ir/grammar';

// Just the codegen module
import { emitHTML, emitNodeHTML } from '@mcptoolshop/websketch-ir/codegen';

// Just error types and validation
import { parseCapture, WebSketchException } from '@mcptoolshop/websketch-ir/errors';
```

### ट्री ट्रैवर्सल और बिल्डर्स

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

### क्वेरी हेल्पर

```typescript
import { queryByRole, findFirst, findByRole } from '@mcptoolshop/websketch-ir';

// Get every BUTTON node in the tree (DFS order)
const buttons = queryByRole(capture.root, 'BUTTON');

// First node matching a custom predicate (stops early)
const firstVisible = findFirst(capture.root, (n) => n.visible === true);

// First node with a given role (shorthand for findFirst + role check)
const nav = findByRole(capture.root, 'NAV');
```

### पता लगाने की क्षमता और समावेशन

आईडी लाइब्रेरी का स्थिर क्रॉस-कैप्चर हैंडल है (ये अंतरों और उत्सर्जित आईआर में दिखाई देते हैं)। किसी नोड पर वापस जाएं, या संरचना के बारे में तर्क करें:

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

### मार्कडाउन रेंडरिंग

```typescript
import { renderMarkdown } from '@mcptoolshop/websketch-ir/codegen';

// Clean Markdown view of the capture (with optional metadata header)
const md = renderMarkdown(capture, { includeMetadata: true });
```

### JSON रेंडरर और LLM अंतर सारांश

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

`RENDERERS` रजिस्ट्री (`{ html, ascii, llm, json, markdown }`) `@mcptoolshop/websketch-ir/codegen` उप-पथ से उपलब्ध रहता है।

## एक नज़र में व्याकरण

प्रत्येक कैप्चर किए गए पृष्ठ `UINode` वस्तुओं का एक पेड़ बन जाता है। यहां प्रत्येक नोड क्या रख सकता है:

| फ़ील्ड | प्रकार | उद्देश्य |
|-------|------|---------|
| `role` | `UIRole` | 22 प्रिमिटिव्स में से एक: `PAGE`, `BUTTON`, `NAV`, `CARD`, `INPUT`, `MODAL`, आदि। |
| `bbox` | `BBox01` | व्यूपोर्ट-सापेक्ष बाउंडिंग बॉक्स `[x, y, w, h]` `[0, 1]` रेंज में |
| `text` | `TextSignal` | टेक्स्ट आकार: हैश, लंबाई, वर्गीकरण (`short`, `sentence`, `paragraph`) - वास्तविक सामग्री नहीं |
| `handlers` | `HandlerSignal[]` | इवेंट → इरादे मैपिंग: `{ event: "click", intent: "toggle_menu" }` |
| `bindings` | `BindingSignal[]` | प्रतिक्रियाशील बाइंडिंग: `{ property: "value", expression: "state.email" }` |
| `state` | `StateSignal[]` | स्थिति ट्रैकिंग: `{ key: "cart.items", access: "read", scope: "global" }` |
| `style` | `StyleIntent` | दृश्य इरादे टोकन: `primary`, `destructive`, `elevated`, `muted`, `ghost`, आदि। |
| `pattern` | `PatternSignal` | पुन: प्रयोज्य पैटर्न: `{ kind: "auth_form", variant: "login", slot: "header" }` |
| `semantic` | `string` | मोटे संकेत जैसे `"login"`, `"search"`, `"checkout"` |
| `interactive` | `boolean` | क्या उपयोगकर्ता इस पर क्लिक/टाइप कर सकता है? |
| `visible` | `boolean` | क्या यह वास्तव में स्क्रीन पर है? |
| `children` | `UINode[]` | नेस्टेड चाइल्ड नोड्स (सिमेंटिक समूहीकरण, DOM बच्चे नहीं) |

### पैटर्न के प्रकार

पैटर्न LLM को व्यक्तिगत भूमिकाओं से परे उच्च-स्तरीय रचनाओं को पहचानने देते हैं:

`search_bar · auth_form · product_card · nav_menu · data_table · wizard_step · media_player · chat_thread · dashboard_widget · custom`

### शैली इरादे टोकन

डिज़ाइन-सिस्टम-स्तरीय दृश्य मार्कर (CSS नहीं):

`primary · secondary · destructive · success · warning · info · muted · elevated · outlined · ghost · inverted · highlight · truncated · monospace · custom`

## स्कीमा संस्करण

- **वर्तमान संस्करण**: `0.1`
- **आगे संगत**: अज्ञात फ़ील्ड को चुपचाप अनदेखा किया जाता है
- **संस्करण जांच**: `isSupportedSchemaVersion("0.1")` → `true`
- **असमर्थित इनपुट**: `WS_UNSUPPORTED_VERSION` त्रुटि उत्पन्न करता है

## त्रुटि प्रबंधन

इस लाइब्रेरी से होने वाली हर त्रुटि एक `WebSketchException` है, जिसमें एक संरचित `WebSketchError` पेलोड होता है और इसमें एक मानक त्रुटि कोड शामिल होता है:

| कोड | यह कब होता है |
|------|-----------------|
| `WS_INVALID_JSON` | इनपुट मान्य JSON नहीं है |
| `WS_INVALID_CAPTURE` | कैप्चर विफल, स्कीमा सत्यापन में त्रुटि |
| `WS_UNSUPPORTED_VERSION` | कैप्चर संस्करण समर्थित नहीं है |
| `WS_LIMIT_EXCEEDED` | बहुत अधिक नोड या बहुत गहरा |
| `WS_INVALID_ARGS` | गुम या गलत तर्क |
| `WS_NOT_FOUND` | संसाधन नहीं मिला |
| `WS_IO_ERROR` | I/O विफलता |
| `WS_PERMISSION_DENIED` | अपर्याप्त अनुमतियाँ |
| `WS_INTERNAL` | अपेक्षित से अलग कुछ गलत हुआ |

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

## सुरक्षा और डेटा दायरा

यह एक शुद्ध कम्प्यूटेशनल लाइब्रेरी है। यह स्पष्ट करना महत्वपूर्ण है कि यह क्या करती है और क्या नहीं:

- **कोई नेटवर्क कॉल नहीं** — सब कुछ स्थानीय रूप से, पूरी तरह से ऑफ़लाइन चलता है
- **फ़ाइल सिस्टम तक कोई पहुंच नहीं** — यह केवल आपके द्वारा प्रदान किए गए डेटा को संसाधित करता है
- **कोई टेलीमेट्री नहीं** — कुछ भी एकत्र नहीं किया जाता है, कुछ भी कहीं भी नहीं भेजा जाता है
- **कोई क्रेडेंशियल नहीं** — यह कभी भी प्रमाणीकरण टोकन, कुकीज़ या गुप्त जानकारी तक नहीं पहुंचता है
- **प्रोटोटाइप प्रदूषण सुरक्षा** — अविश्वसनीय JSON को पार्स करने से पहले उसे साफ किया जाता है

जिम्मेदार प्रकटीकरण विवरण के लिए [SECURITY.md](SECURITY.md) देखें।

## दस्तावेज़

| दस्तावेज़ | इसमें क्या है |
|----------|-------------|
| [HANDBOOK.md](HANDBOOK.md) | गहरा अध्ययन: व्याकरण मॉडल, पूर्ण API संदर्भ, अंतर रणनीतियाँ, फिंगरप्रिंटिंग, एकीकरण पैटर्न |
| [CHANGELOG.md](CHANGELOG.md) | रिलीज़ इतिहास और माइग्रेशन नोट्स |
| [CONTRIBUTING.md](CONTRIBUTING.md) | योगदान कैसे करें |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | समुदाय मानक |
| [SECURITY.md](SECURITY.md) | भेद्यता रिपोर्टिंग |
| [SHIP_GATE.md](SHIP_GATE.md) | रिलीज़ चेकलिस्ट |

## लाइसेंस

MIT — [LICENSE](LICENSE) देखें।

[MCP Tool Shop](https://mcptoolshop.com) का हिस्सा।
