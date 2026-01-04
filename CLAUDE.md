# PinStats

> **New session?** Run: `bd prime` · `bd ready`

## Key Commands

| Command | Purpose |
|---------|---------|
| `bd ready` | Available tasks |
| `bd update <id> --status in_progress` | Start task |
| `bd close <id>` | Complete task |
| `/commit` | Create commit |

## Stack

- **Runtime:** Chrome Extension (Manifest V3)
- **Language:** TypeScript (ES2022, strict mode)
- **Build:** Vite + @crxjs/vite-plugin
- **Testing:** Vitest + jsdom
- **Storage:** chrome.storage.local

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Development mode
npm run build        # Production build
npm test             # Run tests with watch
npm run test:ci      # CI tests with coverage
npm run tdd          # TDD mode
```

## Architecture

3-layer pattern for CSP compliance:

```
MAIN World (injector.ts)     → Patches fetch/XHR, extracts Pinterest API data
        ↓ postMessage
ISOLATED World (content.ts)  → DOM manipulation, caching, overlays
        ↓ chrome.runtime.sendMessage
Background (background.ts)   → Download handler
```

### Key Files

| File | Purpose |
|------|---------|
| `src/injector.ts` | Fetch/XHR interception, API data extraction |
| `src/content.ts` | Pin detection, overlay rendering, cache management |
| `src/background.ts` | Download handler via Chrome Downloads API |
| `src/utils/statsCache.ts` | 3-layer cache (memory + storage + DOM) |
| `src/types/pinterest.ts` | Pinterest API type definitions |
| `src/types/messages.ts` | Inter-script message protocols |

### Data Flow

1. `injector.ts` patches `fetch()` and `XMLHttpRequest`
2. Intercepts Pinterest API responses matching patterns
3. Extracts engagement data (saves, comments, shares, reactions)
4. Sends to `content.ts` via `postMessage`
5. `content.ts` creates glassmorphism overlays on pins
6. Download requests go to `background.ts` via `chrome.runtime`

## Resolved Issues ✅

All critical and high-priority issues from initial code review have been resolved:

### Phase 1: Critical Fixes (Completed)
- ✅ Debug `cache.clearAll()` removed
- ✅ `fetchedPins` Set memory leak fixed
- ✅ Page unload cleanup handlers added
- ✅ LRU cache with 5,000 entry limit + 24h TTL

### Phase 2: Security Hardening (Completed)
- ✅ postMessage origin validation (window.origin, not `'*'`)
- ✅ Download URL allowlist (Pinterest CDN only)
- ✅ Unused modules removed (domObserver, rateLimiter)

### Phase 3: Performance & Quality (Completed)
- ✅ Batch size unified (5→20)
- ✅ MutationObserver debounce improved (100ms→500ms)
- ✅ Duplicate constants extracted
- ✅ Comprehensive error handling in init()

### Phase 4: Layout Optimization (Completed)
- ✅ Layout thrashing eliminated (batch DOM reads)
- ✅ Test fixtures using correct PinData type

**Status:** Production-ready! All 12 beads tasks closed, 24/24 tests passing.

## Rules

- Use `PinData` type (not legacy `PinStats`)
- Validate URLs before download (Pinterest CDN only)
- Add cleanup handlers for timers/observers
- Keep batch size consistent between content/injector
- Update README.md for user-facing changes
- Update CLAUDE.md for workflow changes
