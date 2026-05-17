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

### Compatibility
Tested on webOS 5.0+ (LG TVs from 2018 onward, including the OLED CX 2020 line). Earlier firmwares (webOS 4 / Chromium 53 and below) are not currently supported — they ship Chromium engines too old for our minimum runtime polyfill set.

### Cross-origin requests (CORS)
The app loads from `file://` and fetches the Immich API cross-origin. Immich does not ship CORS headers by default, so without help every browser blocks the response.

The `appinfo.json` ships `trustLevel: "netcast"` + `vendorExtension.allowCrossDomain: true`. These are LG-WAM-specific flags (undocumented by LG, well-known in the webosbrew community — same combo used by `youtube-webos`) that disable CORS validation for installed retail apps. They are silently ignored on webOS OSE / non-retail builds, and recent retail webOS (10.x+) doesn't need them, so adding them is safe across the board.

If the bypass still doesn't apply for your firmware (you'll see "Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS)" in the login panel), configure CORS server-side: add `Access-Control-Allow-Origin: *` to every Immich API response and answer `OPTIONS` with `204` (typically via the Caddy/Nginx/Traefik proxy in front of Immich).

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or v20 recommended)
* [Enact CLI](https://enactjs.com/docs/developer-tools/cli/): ``` npm install -g @enact/cli ```
* [webOS CLI (Ares)](https://webostv.developer.lge.com/develop/tools/cli-installation/): ``` npm install -g @webos-tools/cli ```

### Project Setup
```bash
git clone https://github.com/Seeky91/immich-tv-webos.git
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

## 💸 Support

If this app is useful to you and you'd like to drop a tip, you can send Bitcoin to:

```
bc1qvxczfmurlglff6zmkgysnxy2yglvwspalcd373
```

Totally optional — the project is and will remain free and open-source.

---


**Built with ❤️ for the Immich community.**
