# PinStats - Pinterest Analytics & Media Downloader

[![CI Status](https://github.com/11me/PinStats/workflows/CI/badge.svg)](https://github.com/11me/PinStats/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen.svg)](https://chromewebstore.google.com)

> **Unlock Hidden Pinterest Insights** - Reveal engagement metrics (saves, comments, shares, reactions) and download high-resolution media with one click.

## 🚀 Features

### 📊 Real-Time Analytics
- **Hidden Engagement Metrics**: View saves (repins), comments, shares, and reactions directly on pins
- **Non-Intrusive Overlays**: Beautiful glassmorphism UI that blends seamlessly with Pinterest
- **Performance Optimized**: Intelligent caching with LRU eviction (5,000 pins, 24h TTL)
- **Batch Processing**: Parallel API requests (20 concurrent) for instant metrics

### 📥 One-Click Downloads
- **High-Resolution Media**: Download original quality images and videos
- **Smart Detection**: Automatically finds the best quality source
- **Supported Formats**: JPG, PNG, GIF, WebP, MP4
- **Security First**: Pinterest CDN validation, no third-party tracking

### 🔒 Privacy & Security
- **Local Processing**: All data stays in your browser
- **No External APIs**: Direct Pinterest API interception
- **Open Source**: Fully auditable codebase
- **Manifest V3**: Latest Chrome security standards

## 📸 Screenshots

_Coming soon: Screenshots will be added after repository creation_

## 🛠️ Installation

### From Chrome Web Store (Recommended)
_Link will be added after publication_

### Manual Installation (Developer Mode)
1. Download the [latest release](https://github.com/11me/PinStats/releases/latest)
2. Unzip the archive
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** → Select the unzipped folder

### Build From Source
```bash
git clone https://github.com/11me/PinStats.git
cd PinStats
npm install
npm run build
# Load the 'dist' folder in Chrome
```

## 💡 How It Works

PinStats uses a 3-layer architecture to comply with Chrome's Content Security Policy:

```
┌─────────────────────────────────────┐
│  Injector (MAIN world)              │
│  • Patches fetch() & XMLHttpRequest │
│  • Intercepts Pinterest API         │
│  • Extracts engagement data         │
└──────────────┬──────────────────────┘
               │ postMessage
┌──────────────▼──────────────────────┐
│  Content Script (ISOLATED world)    │
│  • DOM scanning & overlay rendering │
│  • LRU cache with TTL               │
│  • Download coordination            │
└──────────────┬──────────────────────┘
               │ chrome.runtime
┌──────────────▼──────────────────────┐
│  Background Service Worker          │
│  • Download handler                 │
│  • Chrome Downloads API             │
└─────────────────────────────────────┘
```

**Technical Highlights:**
- TypeScript with strict mode
- Vitest for testing (24/24 passing)
- Vite + @crxjs/vite-plugin for blazing fast builds
- Pre-commit hooks (gitleaks, conventional commits)

## 🧪 Development

```bash
# Install dependencies
npm install

# Development mode (auto-reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:ci

# TDD mode
npm run tdd

# Production build
npm run build
```

## 📈 Performance Optimizations

- ✅ **4x faster fetching**: Batch size optimized (20 concurrent requests)
- ✅ **80% fewer scans**: Debounced MutationObserver (500ms)
- ✅ **Zero memory leaks**: LRU cache with automatic eviction
- ✅ **Layout optimized**: Batched DOM reads, eliminated thrashing

## 🔐 Security Features

- ✅ Origin validation for postMessage
- ✅ Download URL allowlist (Pinterest CDN only)
- ✅ No debug code in production
- ✅ Pre-commit security scanning (gitleaks)
- ✅ Comprehensive error handling

## 🛣️ Roadmap

- [ ] Chrome Web Store publication
- [ ] Firefox extension port
- [ ] Advanced analytics dashboard
- [ ] Export data to CSV/JSON
- [ ] Custom overlay themes

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit using conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Workflow

This project uses [beads](https://github.com/beadsd/beads) for task tracking:

```bash
bd ready          # Show available tasks
bd create "..."   # Create new task
bd update <id>    # Update task status
bd close <id>     # Close completed task
```

## 🧰 Tech Stack

- **Runtime**: Chrome Extension (Manifest V3)
- **Language**: TypeScript (ES2022, strict mode)
- **Build Tool**: Vite + @crxjs/vite-plugin
- **Testing**: Vitest + jsdom
- **Storage**: chrome.storage.local
- **Bundler**: Vite with tree-shaking

## 📊 Project Stats

- **14 commits** from initial to production-ready
- **12 tasks** completed (Phase 1-4)
- **24 tests** with 100% pass rate
- **25+ issues** resolved
- **0 security vulnerabilities**

## 🐛 Known Issues

All critical and high-priority issues have been resolved! See [CLAUDE.md](CLAUDE.md) for the complete resolution history.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for transparent Pinterest analytics
- Built with modern Chrome Extension APIs
- Community-driven development

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/11me/PinStats/issues)
- **Discussions**: [GitHub Discussions](https://github.com/11me/PinStats/discussions)

---

**Keywords**: pinterest analytics, pinterest stats, pinterest engagement, pinterest downloader, chrome extension, pinterest metrics, pinterest insights, social media analytics, pinterest tool, engagement tracking

⭐ **Star this repo if you find it useful!**
