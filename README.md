# PinStats: Hidden Pinterest Metrics & Downloader

[![CI Status](https://github.com/11me/PinStats/workflows/CI/badge.svg)](https://github.com/11me/PinStats/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen.svg)](https://chromewebstore.google.com)

> **Unlock Hidden Pinterest Insights** — Reveal engagement metrics and download high-resolution media with one click.

---

## ⚡ Why PinStats?

Pinterest hides crucial engagement data that creators, marketers, and researchers need to make informed decisions. You can see a pin's image, but not how many people saved it, commented on it, or shared it. **This information is buried in their API.**

PinStats brings this hidden data to the surface — right on the pins you're browsing.

---

## 🤔 Who is this for?

- **Content Creators** - Track what resonates with your audience
- **Social Media Marketers** - Analyze competitor performance and trends
- **Researchers** - Gather engagement data for studies
- **Pinterest Power Users** - Make data-driven decisions about what to save

---

## ✨ Features

### 📊 Real-Time Analytics
- **Hidden Metrics Revealed**: Saves (repins), comments, shares, reactions
- **Non-Intrusive Overlays**: Glassmorphism UI blends with Pinterest
- **Instant Data**: Smart caching with 24-hour refresh

### 📥 One-Click Downloads
- **High-Resolution Media**: Original quality images and videos
- **Auto-Detection**: Finds the best quality source
- **All Formats**: JPG, PNG, GIF, WebP, MP4

### 🔒 Privacy & Security
- **Local Processing**: All data stays in your browser
- **No Tracking**: Zero external APIs or analytics
- **Open Source**: Fully auditable code
- **Manifest V3**: Latest Chrome security standards

---

## 📦 Install

### Chrome Web Store (Recommended)

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/malhpeclnalgpjglhbgpnabkmglhijbb)](https://chromewebstore.google.com/detail/malhpeclnalgpjglhbgpnabkmglhijbb)

**[Install PinStats from Chrome Web Store →](https://chromewebstore.google.com/detail/malhpeclnalgpjglhbgpnabkmglhijbb)**

### Manual Installation (For Development)
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
npm run build  # Load the 'dist' folder in Chrome
```

---

## 🚀 Usage

1. **Install the extension** (see above)
2. **Browse Pinterest** as normal
3. **Hover over any pin** to see engagement overlays
4. **Click the download button** (⬇️) to save media

### Extension Settings

Click the PinStats icon in your toolbar to:
- **Toggle extension on/off** (disable without uninstalling)
- **Clear cache** (free up storage)
- **Support development** (crypto donations)
- **Rate & review** (help others discover PinStats)
- **Report bugs** (submit issues on GitHub)

---

## ❓ FAQ

**Q: Will Pinterest ban me for using this?**
A: No. PinStats only reads data that Pinterest already sends to your browser. It doesn't scrape, bot, or violate Terms of Service.

**Q: Is my data safe?**
A: Yes. All processing happens locally in your browser. Nothing is sent to external servers.

**Q: Will this break when Pinterest updates?**
A: Pinterest occasionally changes their API. If PinStats stops working, check for updates or [report an issue](https://github.com/11me/PinStats/issues).

**Q: Can I use this on Firefox?**
A: Not yet. Firefox port is planned — see [Roadmap](#-roadmap).

---

## 🔧 How it works

PinStats uses a 3-layer architecture to comply with Chrome's Content Security Policy:

```
┌─────────────────────────────────────┐
│  Injector (MAIN world)              │
│  • Intercepts Pinterest API calls  │
│  • Extracts engagement data         │
└──────────────┬──────────────────────┘
               │ postMessage
┌──────────────▼──────────────────────┐
│  Content Script (ISOLATED world)    │
│  • Renders glassmorphism overlays  │
│  • Manages LRU cache (5K pins)     │
└──────────────┬──────────────────────┘
               │ chrome.runtime
┌──────────────▼──────────────────────┐
│  Background Service Worker          │
│  • Handles secure downloads         │
└─────────────────────────────────────┘
```

**Tech Stack**: TypeScript • Vite • Vitest • Manifest V3
For technical details, see [CLAUDE.md](CLAUDE.md).

---

## 🛠️ Development

```bash
npm install       # Install dependencies
npm run dev       # Development mode (auto-reload)
npm test          # Run tests
npm run build     # Production build
```

**Requirements**: Node.js 18+, npm 9+

**Project Structure**:
```
src/
├── injector.ts       # API interception (MAIN world)
├── content.ts        # Overlay rendering (ISOLATED world)
├── background.ts     # Download handler
├── popup.ts          # Extension popup
├── types/            # TypeScript definitions
└── utils/            # Cache, constants
```

---

## 🛣️ Roadmap

- [x] Chrome Web Store publication (CI setup complete, awaiting manual submission)
- [ ] Firefox extension port
- [ ] Export data to CSV/JSON
- [ ] Advanced analytics dashboard
- [ ] Custom overlay themes

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit using conventional commits (`feat:`, `fix:`, `docs:`, etc.)
4. Push and open a Pull Request

---

## ❤️ Support

If PinStats saves you time, consider supporting development:

| Currency | Address |
|----------|---------|
| Bitcoin (BTC) | `bc1qjs07p0qpa2taaje0044yhjry48qps4dseny4kd` |
| Ethereum (ETH) | `0x044ffd952D8525bC69E4d5e32267E9a6bac36510` |
| Solana (SOL) | `9nP1soTcZspCi2K1WWE9N7PkKPMA3eFgsdZ61vrCCKGZ` |

**Issues**: [GitHub Issues](https://github.com/11me/PinStats/issues)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

⭐ **Star this repo if you find it useful!**
