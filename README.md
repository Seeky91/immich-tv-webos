# Immich TV (LG webOS)

**Immich TV** A read-only client for [Immich](https://immich.app/) designed for LG webOS TVs. Built with the **Enact** framework and **Sandstone** UI library.

---

## 🚀 Key Features

* **Timeline Height Calculation**: Uses Immich API metadata to calculate total content height upfront for a stable scrollbar.
* **Virtualized Grid**: Implementation of `VirtualGridList` for DOM node recycling.
* **Native Focus Management**: Integration with the webOS Spotlight (D-pad) navigation system.
* **Justified Grid**: Layout that respects original aspect ratios while maintaining aligned rows.
* **Authentication**: Supports API Key and login credentials.
* **Video Playback**: Support for video files using Sandstone media components.

---

## 🛠️ Technical Stack

| Technology | Usage |
| :--- | :--- |
| **Enact Framework** | LG's React-based framework optimized for webOS |
| **Sandstone UI** | Native TV component library for premium look & feel |
| **TypeScript** | Strict typing for codebase robustness and reliability |
| **TanStack Query (v5)** | Server state management, caching, and infinite scroll logic |
| **Immich API** | Direct integration with the Immich "Internal" API endpoints |

---

## 📦 Installation & Development

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or v20 recommended)
* [Enact CLI](https://enactjs.com/docs/developer-tools/cli/): ```bash npm install -g @enact/cli ```
* [webOS CLI (Ares)](https://webostv.developer.lge.com/develop/tools/cli-installation/): ```bash npm install -g @webosose/ares-cli ```

### Project Setup
```bash
git clone https://github.com/your-repo/immich-tv-webos.git
cd immich-tv-webos
npm install
```

### Development (PC)
To bypass CORS issues during local development, use the configured proxy or launch your browser with security disabled.
```bash
npm run serve
```

### Deployment to TV
1. Ensure your TV is in **Developer Mode** and on the same network.
2. Build the production package:
Call your device "lg-tv" (or modify the name in the Makefile) and do:
```bash
make pack
make install
make launch
```

---

## 🏗️ Project Architecture

* `src/api/`: Immich API client and strict type definitions.
* `src/hooks/`: Data logic (`useAssets`, `useAuth`) powered by React Query.
* `src/views/`: Primary screens (Login, Main/Timeline, Viewer).
* `src/components/`: Atomic UI units (AssetCard, Header).
* `src/utils/`: **Height Map** calculation logic (Justified Layout engine).



---

## ⚖️ Disclaimer

This is an unofficial third-party client. It is not affiliated with the official Immich development team. The application is provided "as is," optimized for personal use on LG Smart TVs.

---

**Built with ❤️ for the Immich community.**