# Movewiz Frontend


The frontend makes direct calls to the backend. The backend URL is set via `VITE_BACKEND_BASE_URL` and embedded in the JS bundle at build time.

```
Browser → nginx:80 (static files, SPA fallback)
Browser → backend (direct API calls)
```

**Prerequisite:** The backend must enable CORS (`Access-Control-Allow-Origin`) for the frontend's origin.

## Project Setup

```sh
npm install
```

### Environment

Copy `.env.example` to `.env` and set the backend URL:

```
VITE_BACKEND_BASE_URL=http://localhost:3033
```

- **Local dev:** `.env` is read by Vite automatically.
- **Docker:** pass `VITE_BACKEND_BASE_URL` as a build arg in `docker-compose.yml`. Changing the URL requires a rebuild.

### Development

```sh
npm run dev
```

### Production (Docker)

```sh
docker compose up --build
```

This builds the frontend with the backend URL from `docker-compose.yml` and serves it on port `8088`. To change the backend target, update the `VITE_BACKEND_BASE_URL` build arg in `docker-compose.yml` and rebuild.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).
