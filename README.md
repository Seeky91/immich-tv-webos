<p align="center">
  <img src="assets/icon-source.png" width="128" alt="Immich TV icon">
</p>

<h1 align="center">📺 Immich TV (LG webOS)</h1>

<p align="center">
  A read-only <a href="https://immich.app/">Immich</a> client for LG webOS TVs — browse your<br>
  self-hosted photo and video library from the couch, navigated with the TV remote.
</p>

<p align="center">
  Built with <a href="https://enactjs.com/">Enact</a> + <a href="https://enactjs.com/docs/modules/sandstone/">Sandstone</a> &nbsp;·&nbsp; available on the <a href="https://repo.webosbrew.org/apps/com.seeky91.immichtv">webOS Homebrew Channel</a>
</p>

---

## ✨ Features

- 📱 **Sign in with your phone** — scan a QR code and enter your credentials on your phone instead of typing them with the remote. Pairing happens entirely on your home network: the TV runs a small local service, your password is used for one login call and never stored, and nothing goes through any third-party server.
- 🖼️ **Timeline** — infinite-scrolling photo & video timeline grouped by date, laid out in a justified grid that preserves original aspect ratios.
- 📁 **Albums** — browse your Immich albums, each with its own date-grouped timeline.
- 🔎 **Search** — smart text search powered by Immich's ML backend, plus face/person browsing through a People ribbon.
- 👥 **Multiple accounts** — add several Immich servers or accounts and switch between them.
- ▶️ **Video playback** — plays video assets with TV-friendly controls that auto-hide during playback.
- 🎮 **Remote-first** — full D-pad navigation through the webOS Spotlight focus system; no mouse or touch assumed.

---

## 🧩 Compatibility

Immich TV targets **webOS 5.0 and newer** — LG TVs from 2018 onward, including the 2020 OLED CX line.

The production bundle is transpiled down to Chromium 68 with a runtime polyfill set, which sets that floor. Older firmwares (webOS 4 / Chromium 53 and below) ship browser engines too old to run the app.

---

## 📥 Installation

### Homebrew Channel (recommended)

Immich TV is published in the [webOS Homebrew Channel](https://www.webosbrew.org/).

1. Install the Homebrew Channel on your TV — see the [webosbrew install guide](https://www.webosbrew.org/pages/install.html).
2. Open it, find **[Immich TV](https://repo.webosbrew.org/apps/com.seeky91.immichtv)** in the app list, and install.
3. Launch it from your TV's app launcher.

Updates are delivered automatically through the channel.

### Manual sideload (.ipk)

For a specific build, or if you don't use the Homebrew Channel:

1. Enable **Developer Mode** on your TV (LG's Developer Mode app) and register it with the ares CLI.
2. Download the latest `.ipk` from the [Releases page](https://github.com/Seeky91/immich-tv-webos/releases), or build it yourself (see [Building from source](#-building-from-source)).
3. Install and launch:

```bash
ares-install com.seeky91.immichtv_<version>_all.ipk
ares-launch com.seeky91.immichtv
```

---

## 🌐 Immich server setup (CORS)

The app runs from a `file://` origin and calls the Immich API cross-origin. Immich ships no `Access-Control-Allow-Origin` headers by default, so whether it works out of the box depends on your TV's firmware:

- **webOS 10.x and newer** silently bypass CORS for installed apps — it just works, no server changes needed.
- **Older firmwares** enforce CORS like any browser. Immich will log the request as `200 OK`, but the TV blocks the response, and the login screen shows:

  > Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS).

`appinfo.json` ships `vendorExtension.allowCrossDomain: true` as a hint to LG's WAM runtime. The stronger `trustLevel: "netcast"` flag — which some webosbrew apps use to force a WAM-level CORS bypass — is deliberately **not** shipped: it disables `window.PalmServiceBridge` and breaks the on-screen keyboard on webOS 10.x.

If you hit the error above, allow this app's requests server-side. With nginx in front of Immich:

```nginx
add_header Access-Control-Allow-Origin  "*" always;
add_header Access-Control-Allow-Headers "Authorization, x-api-key, Content-Type" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;

if ($request_method = OPTIONS) {
    return 204;
}
```

The equivalent directives work for Caddy, Traefik, or any reverse proxy. The app authenticates with `Authorization` / `x-api-key` headers and uses no cookies, so a wildcard origin is safe here.

---

## 🛠️ Building from source

### Prerequisites

- **[Node.js](https://nodejs.org/)** 18 or 20
- **[Enact CLI](https://enactjs.com/docs/developer-tools/cli/)** — `npm install -g @enact/cli`
- **[webOS CLI (ares)](https://webostv.developer.lge.com/develop/tools/cli-installation/)** — `npm install -g @webos-tools/cli@3.2.3`
  > Pin `3.2.3`: version `3.2.4` ships a rimraf 6 regression that breaks `ares-package`.

### Setup

```bash
git clone https://github.com/Seeky91/immich-tv-webos.git
cd immich-tv-webos
npm install
```

### Develop

```bash
npm run serve      # dev server with hot reload
```

The dev server runs from `http://localhost`, so the cross-origin rules above still apply. There is no bundled proxy — either configure CORS on your Immich server, or launch Chrome with `--disable-web-security --user-data-dir=/tmp/immich-dev` for local testing.

### Quality gates

```bash
npm run lint       # ESLint (CI treats warnings as errors)
npm run typecheck  # tsc --noEmit — must pass before committing
npm run test       # unit tests
```

### Package & deploy

```bash
npm run pack-p     # production build (Enact pack + legacy transpile pass)
make pack          # build the .ipk
make install       # deploy it to a TV registered as "lg-tv"
make launch        # launch the app
make inspect       # open remote devtools
```

---

## 🏗️ Architecture

Immich TV is a layered, dependency-injected React app:

- **`src/domain/`** — a `PhotoRepository` interface and a `RepositoryContext` provider. Hooks depend on this abstraction, never on HTTP directly.
- **`src/api/`** — the concrete `ImmichRepository`, the HTTP client, and the Immich response types.
- **`src/hooks/`** — [TanStack Query](https://tanstack.com/query) wrappers for data (assets, albums, search, people, accounts) plus webOS UI hooks (D-pad keys, layout, media viewer).
- **`src/views/` & `src/components/`** — the TV UI, built on Enact + Sandstone and navigated entirely through the webOS Spotlight (D-pad) focus system.
- **`service/`** — a small webOS JS service (Node, zero dependencies) bundled in the `.ipk` that powers phone sign-in: it serves the pairing page over the local network and performs the Immich login on the TV, so self-signed HTTPS and no-CORS servers work. The app talks to it over the Luna bus; run `node service/dev.js` to develop against it in a desktop browser, and `npm run test-service` for its test suite.

One webOS-specific build detail worth calling out: the production bundle is post-processed by `tools/transpile-legacy.mjs`, which re-targets it to Chromium 68 with esbuild. Enact's Babel pass excludes `node_modules`, so dependencies shipping modern syntax (e.g. `??=`) would otherwise reach the bundle untransformed and fail to parse on older webOS engines — leaving a black screen. See `CLAUDE.md` for the full pipeline.

---

## ⚖️ Disclaimer

Immich TV is an unofficial, third-party client. It is not affiliated with or endorsed by the Immich project. Provided as-is for personal use on LG Smart TVs.

---

## 📄 License

MIT © [Quentin Jean-Amans](https://github.com/Seeky91). See [LICENSE](LICENSE).

---

## 💸 Support

If Immich TV is useful to you, you can leave a tip in Bitcoin — entirely optional, the project is and will remain free and open-source.

```
bc1qvxczfmurlglff6zmkgysnxy2yglvwspalcd373
```
