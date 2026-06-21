import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: '@mcptoolshop/websketch-ir',
  description: 'Grammar-based intermediate representation for capturing web page UI as semantic primitives.',
  logoBadge: 'WS',
  brandName: 'WebSketch IR',
  repoUrl: 'https://github.com/mcp-tool-shop-org/websketch-ir',
  npmUrl: 'https://www.npmjs.com/package/@mcptoolshop/websketch-ir',
  footerText: 'MIT Licensed — built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'v2.3.0 · 22 UI primitives · zero runtime deps',
    headline: 'WebSketch IR',
    headlineAccent: 'stop treating webpages like pictures.',
    description: 'A grammar-based intermediate representation that compiles DOM soup into a small, fixed vocabulary of semantic UI primitives. LLMs reason about layouts without vision.',
    primaryCta: { href: '#usage', label: 'Get started' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Parse', code: 'const capture = parseCapture(json);' },
      { label: 'Render', code: 'const ascii = renderAscii(capture);' },
      { label: 'Diff', code: 'const changes = diff(a, b);' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'Why WebSketch',
      subtitle: 'Structured UI understanding for language models.',
      features: [
        { title: 'Grammar-based', desc: 'Compiles DOM into 22 fixed UI primitives — BUTTON, NAV, CARD, INPUT, and more. No ambiguity, no DOM noise.' },
        { title: 'LLM-friendly', desc: 'ASCII wireframe rendering lets language models reason about page layouts without vision capabilities.' },
        { title: 'Diffable', desc: 'Structural diff engine matches nodes by geometry + role + semantics, not DOM identity. Track real UI changes.' },
      ],
    },
    {
      kind: 'features',
      id: 'capabilities',
      title: 'Core Capabilities',
      features: [
        { title: 'Typed', desc: 'Full TypeScript types for every node, capture, and option. Zero runtime dependencies.' },
        { title: 'Fingerprintable', desc: 'Content-addressed hashing produces stable fingerprints for fast structural equality checks.' },
        { title: 'Versioned Schema', desc: 'Semantic versioning for the capture schema with forward and backward compatibility guarantees.' },
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Usage',
      cards: [
        { title: 'Parse & render', code: `import { parseCapture, renderAscii, renderForLLM } from '@mcptoolshop/websketch-ir';

const capture = parseCapture(jsonString);
const wireframe = renderAscii(capture);   // 80x24 ASCII grid
const llmView = renderForLLM(capture);    // URL + viewport + legend` },
        { title: 'Diff & fingerprint', code: `import { diff, formatDiff, fingerprintCapture } from '@mcptoolshop/websketch-ir';

const result = diff(captureA, captureB);
console.log(formatDiff(result));
// { added: 2, removed: 1, moved: 0, resized: 3 }

const fp = fingerprintCapture(capture);` },
      ],
    },
    {
      kind: 'data-table',
      id: 'errors',
      title: 'Error Codes',
      subtitle: 'Structured errors with typed codes.',
      columns: ['Code', 'Meaning'],
      rows: [
        ['WS_INVALID_JSON', 'Input is not valid JSON'],
        ['WS_INVALID_CAPTURE', 'Capture fails schema validation'],
        ['WS_UNSUPPORTED_VERSION', 'Capture version not supported'],
        ['WS_LIMIT_EXCEEDED', 'Node count or depth exceeds limits'],
        ['WS_INVALID_ARGS', 'Missing or invalid arguments'],
      ],
    },
    {
      kind: 'api',
      id: 'api',
      title: 'API Reference',
      subtitle: 'Core exports from @mcptoolshop/websketch-ir.',
      apis: [
        { signature: 'parseCapture(json: string): WebSketchCapture', description: 'Parse and validate a JSON capture string. Throws WebSketchException on error.' },
        { signature: 'renderAscii(capture, width?, height?): string', description: 'Render a capture as an 80x24 ASCII wireframe with box-drawing borders.' },
        { signature: 'renderForLLM(capture): string', description: 'LLM-optimized view with URL + viewport header and legend footer.' },
        { signature: 'diff(a, b, options?): DiffResult', description: 'Structural diff between two captures. Matches by geometry + role + semantics.' },
        { signature: 'formatDiff(result): string', description: 'Human-readable diff report with change counts and top changes.' },
        { signature: 'fingerprintCapture(capture): string', description: 'Full structural fingerprint — roles + geometry + text + viewport aspect.' },
        { signature: 'fingerprintLayout(capture): string', description: 'Layout-only fingerprint that ignores text content changes.' },
        { signature: 'validateCapture(input): ValidationResult', description: 'Validate a capture object against the schema without throwing.' },
      ],
    },
  ],
};
