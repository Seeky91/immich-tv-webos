# Immich TV (LG webOS)

**Immich TV** A read-only client for [Immich](https://immich.app/) designed for LG webOS TVs. Built with the **Enact** framework and **Sandstone** UI library.

---

## 🚀 Key Features

* **Timeline View**: Infinite-scrolling photo/video timeline grouped by date.
* **Albums**: Browse your Immich albums and explore each one with a date-grouped timeline.
* **Search**: Smart text search powered by Immich's ML backend, plus face/person search via a People ribbon.
* **Justified Grid**: Layout that respects original aspect ratios while maintaining aligned rows.
* **Virtualized List**: DOM node recycling via `VirtualList` for smooth performance on large libraries.
* **Timeline Height Calculation**: Uses Immich API metadata to pre-calculate total content height for a stable scrollbar.
* **NavigationRail**: Collapsible left sidebar (expands on D-pad focus) for switching between Photos, Albums, and Search.
* **Native Focus Management**: Integration with the webOS Spotlight (D-pad) navigation system.
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
* [Enact CLI](https://enactjs.com/docs/developer-tools/cli/): ``` npm install -g @enact/cli ```
* [webOS CLI (Ares)](https://webostv.developer.lge.com/develop/tools/cli-installation/): ``` npm install -g @webos-tools/cli ```

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
2. Call your device "lg-tv" (or modify the name in the Makefile), then:
```bash
make install   # builds and deploys the .ipk to the TV
make launch    # launches the app
```

---

## 🏗️ Project Architecture

* `src/api/` — HTTP client, auth header injection, Immich API calls, and strict type definitions.
* `src/hooks/` — All data and UI logic:
  * Auth: `useAuth`
  * Asset data: `useInfiniteGroupedAssets`, `useAllAssets`, `useBuckets`
  * Albums: `useAlbums`, `useAlbumDetails`
  * Search: `useImmichSearchResults`, `useImmichPeople`
  * Performance: `useHeightMap`, `useScrollPagination`
  * webOS: `useWebOSKeys` (D-pad remote key handling)
* `src/views/` — Primary screens: `LoginPanel`, `AppLayout`, `MainPanel` (timeline), `AlbumsPanel`, `AlbumView`, `SearchPanel`.
* `src/components/` — Atomic UI units: `AssetCard`, `AlbumCard`, `NavigationRail`, `GroupedTimeline`, `MediaViewer`, `PeopleRibbon`, `DateHeader`.
* `src/utils/` — Justified layout engine, height map calculation, date/duration formatting, localStorage helpers.

---

## ⚖️ Disclaimer

This is an unofficial third-party client. It is not affiliated with the official Immich development team. The application is provided "as is," optimized for personal use on LG Smart TVs.

---


**Built with ❤️ for the Immich community.**
