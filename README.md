# yeegames

This template should help get you started developing with Vue 3 in Vite.

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

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## Socket.IO Server Deployment on Render

The Vue frontend runs on Vercel, but the Socket.IO server must run as a separate Node.js web service.

Render Web Service settings:

- Language: Node
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

The Render UI may show `server/ $ npm start` when the root directory is set to `server`. Enter only `npm start` as the start command.

After deployment, open the Render URL in a browser:

```text
https://yeegames.onrender.com
```

If the server is running, the page should show:

```text
Yut Socket Server OK
```

Then set this Vercel environment variable for the frontend:

```env
VITE_SOCKET_URL=https://yeegames.onrender.com
```

Redeploy the Vercel project after changing the environment variable.

Notes:

- `localhost:4000` is only for local development.
- The deployed frontend must use the Render URL in `VITE_SOCKET_URL`.
- Render free instances can sleep after inactivity, so the first request may be slow.
