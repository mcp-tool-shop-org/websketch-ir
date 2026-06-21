# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | Yes       |
| 1.0.x   | No        |

## Reporting a Vulnerability

Email: **64996768+mcp-tool-shop@users.noreply.github.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Version affected
- Potential impact

### Response timeline

| Action | Target |
|--------|--------|
| Acknowledge report | 48 hours |
| Assess severity | 7 days |
| Release fix | 30 days |

## Scope

WebSketch IR is an **npm library** providing grammar-based intermediate representation for web UI structure.

- **Data touched:** WebSketch IR JSON captures (in-memory parsing, validation, rendering, diffing, fingerprinting)
- **Data NOT touched:** No telemetry, no analytics, no network calls, no filesystem access, no credential storage
- **Permissions:** Pure library — no filesystem, no network, no side effects
- **No telemetry** is collected or sent
