---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Describe the Bug
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Import '@mcptoolshop/websketch-ir'
2. Call function with '...'
3. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
What actually happened. Include error messages if any.

## Code Sample
```typescript
import { fingerprintCapture } from '@mcptoolshop/websketch-ir';

const capture = { ... };
const result = fingerprintCapture(capture);
// Error or unexpected result
```

## Environment
- **Node version**: [e.g., 18.0.0]
- **@mcptoolshop/websketch-ir version**: [e.g., 0.1.0]
- **TypeScript version** (if applicable): [e.g., 5.3.0]
- **OS**: [e.g., macOS 14, Ubuntu 22.04, Windows 11]

## Capture Data (if relevant)
```json
{
  "version": "0.1",
  "root": { ... }
}
```

## Stack Trace
```
Error: ...
    at ...
```

## Additional Context
Add any other context about the problem here.
