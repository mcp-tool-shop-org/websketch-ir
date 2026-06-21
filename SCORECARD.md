# Scorecard

> Score a repo before remediation. Fill this out first, then use SHIP_GATE.md to fix.

**Repo:** websketch-ir
**Date:** 2026-02-27
**Type tags:** [npm]

## Pre-Remediation Assessment

| Category | Score | Notes |
|----------|-------|-------|
| A. Security | 5/10 | No SECURITY.md, no threat model in README. Clean — no secrets or telemetry. |
| B. Error Handling | 9/10 | WebSketchException with WS_ codes, formatWebSketchError. Excellent. |
| C. Operator Docs | 9/10 | Excellent README, CHANGELOG, LICENSE, HANDBOOK. Missing threat model. |
| D. Shipping Hygiene | 8/10 | validate script, CI, engines.node, publishConfig. Missing SHIP_GATE/SCORECARD. |
| E. Identity (soft) | 8/10 | Logo, landing page, badges. No translations yet. |
| **Overall** | **39/50** | |

## Key Gaps

1. No SECURITY.md — no vulnerability reporting process
2. No threat model in README — data scope not documented
3. Missing SHIP_GATE.md and SCORECARD.md for audit trail

## Remediation Priority

| Priority | Item | Estimated effort |
|----------|------|-----------------|
| 1 | Add SECURITY.md with report email and response timeline | 5 min |
| 2 | Add Security & Data Scope section to README | 5 min |
| 3 | Add SHIP_GATE.md + SCORECARD.md | 10 min |

## Post-Remediation

| Category | Before | After |
|----------|--------|-------|
| A. Security | 5/10 | 10/10 |
| B. Error Handling | 9/10 | 10/10 |
| C. Operator Docs | 9/10 | 10/10 |
| D. Shipping Hygiene | 8/10 | 10/10 |
| E. Identity (soft) | 8/10 | 10/10 |
| **Overall** | **39/50** | **50/50** |

## Current Status

All gaps from the original pre-remediation assessment have been addressed. SECURITY.md added, threat model documented in README, SHIP_GATE.md and SCORECARD.md in place. Score: 50/50.
