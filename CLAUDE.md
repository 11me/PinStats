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

## Release Process

**For Maintainers:**

### Publishing a New Version

1. **Update version** in `manifest.json`:
   ```json
   "version": "1.2.0"
   ```

2. **Commit** the version bump:
   ```bash
   git commit -m "chore: bump version to 1.2.0"
   ```

3. **Create tag** (must match manifest version):
   ```bash
   git tag v1.2.0
   ```

4. **Push** commits and tags:
   ```bash
   git push && git push --tags
   ```

5. **CI automatically**:
   - Validates tag matches manifest version
   - Runs tests and builds extension
   - Creates GitHub release with ZIP artifact
   - Publishes to Chrome Web Store

### Troubleshooting

- **Version mismatch error**: Ensure git tag (e.g., `v1.2.0`) matches `manifest.json` version (`1.2.0`)
- **CWS publish fails**: Check GitHub Actions logs for API errors
- **Service Account not authorized**: Verify Service Account email is added to Chrome Web Store Developer Dashboard (Account → Service Accounts)
- **Manual fallback**: If CWS automation fails, GitHub release ZIP is available for manual upload at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Prerequisites (One-Time Setup)

Before automated CWS publishing works, you need:
1. Extension ID from Chrome Web Store (requires initial manual submission)
2. Google Cloud Service Account with JSON key
3. Service Account added to Chrome Web Store Developer Dashboard
4. GitHub Secrets configured: `CWS_SERVICE_ACCOUNT_JSON`, `CWS_EXTENSION_ID`

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
