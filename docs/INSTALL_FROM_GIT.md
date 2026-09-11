# Install Monti Embed SDK from Git

This guide shows how to use the SDK directly from a Git checkout before the `monti-embed-sdk*` packages are published to npm.

Because this repository is an npm monorepo, install the individual package directories rather than installing the repository root as one dependency.

## 1. Clone and build the SDK

Requirements: Node.js 18 or newer and npm 9 or newer.

```bash
git clone <YOUR_MONTI_EMBED_SDK_GIT_URL> monti-embed-sdk
cd monti-embed-sdk
npm ci
npm run verify
```

To install a specific release or branch:

```bash
git clone --branch v0.1.0 --depth 1 <YOUR_MONTI_EMBED_SDK_GIT_URL> monti-embed-sdk
```

Replace the Git URL with either an HTTPS or SSH URL, for example:

```text
https://github.com/your-org/monti-embed-sdk.git
git@github.com:your-org/monti-embed-sdk.git
```

## 2. Install an adapter in your application

Every adapter uses `monti-embed-sdk-core`. From your application directory, install the core and one adapter using their local paths.

Assuming this layout:

```text
projects/
├── monti-embed-sdk/
└── your-application/
```

Choose the command for your application:

```bash
# Vanilla JavaScript
npm install ../monti-embed-sdk/packages/embed-core \
  ../monti-embed-sdk/packages/embed-vanilla

# Web Component
npm install ../monti-embed-sdk/packages/embed-core \
  ../monti-embed-sdk/packages/embed-web-component

# React
npm install ../monti-embed-sdk/packages/embed-core \
  ../monti-embed-sdk/packages/embed-react

# Vue 3
npm install ../monti-embed-sdk/packages/embed-core \
  ../monti-embed-sdk/packages/embed-vue

# Svelte
npm install ../monti-embed-sdk/packages/embed-core \
  ../monti-embed-sdk/packages/embed-svelte
```

You can also record the Git checkout as local dependencies in your application's `package.json`:

```json
{
  "dependencies": {
    "monti-embed-sdk-core": "file:../monti-embed-sdk/packages/embed-core",
    "monti-embed-sdk-react": "file:../monti-embed-sdk/packages/embed-react"
  }
}
```

Change `embed-react` to the adapter your application uses. Keep the SDK checkout built before running `npm install` in the application.

## 3. Configure Monti

Before loading the widget:

1. Open **Tenant → Embed** in Monti.
2. Enable web embedding and copy the public `emb_...` key.
3. Add the exact application origin to **Allowed origins**, including its scheme and port.
4. Use the Monti server origin as `apiBase`.

Local example:

```text
Embed key:     emb_YOUR_KEY
API base:      https://monti.devclub.dev/
Allowed origin: http://localhost:5173
```

Use HTTPS for both the application and Monti in production so browser microphone and voice features are available.

## 4. Integration examples

### Vanilla JavaScript or TypeScript

```js
import { mountMontiEmbed } from "monti-embed-sdk";

const monti = mountMontiEmbed({
  embedKey: "emb_YOUR_KEY",
  apiBase: "https://monti.devclub.dev/",
  position: "bottom-right",
  onOpen: () => console.log("Monti opened"),
  onClose: () => console.log("Monti closed"),
  onReady: (config) => console.log("Monti ready", config),
  onError: (error) => console.error(error.code, error.message),
});

// Optional imperative controls:
// monti.open();
// monti.close();
// monti.toggle();

window.addEventListener("beforeunload", () => monti.destroy());
```

For an inline call-center panel:

```html
<div id="monti-support" style="height: 680px"></div>
```

```js
const monti = mountMontiEmbed({
  embedKey: "emb_YOUR_KEY",
  apiBase: "https://monti.devclub.dev/",
  container: document.querySelector("#monti-support"),
});
```

### Web Component

```html
<script type="module">
  import "monti-embed-sdk-web-component";
</script>

<monti-embed
  embed-key="emb_YOUR_KEY"
  api-base="https://monti.devclub.dev/"
  position="bottom-right"
></monti-embed>

<script>
  const monti = document.querySelector("monti-embed");

  monti.addEventListener("monti-ready", (event) => {
    console.log("Monti ready", event.detail);
  });
  monti.addEventListener("monti-open", () => console.log("Monti opened"));
  monti.addEventListener("monti-close", () => console.log("Monti closed"));
  monti.addEventListener("monti-error", (event) => {
    console.error(event.detail.code, event.detail.message);
  });

  // Optional: monti.open(); monti.close(); monti.toggle();
</script>
```

The Web Component accepts `base-url` as an alias for the old demos, but new integrations should use `api-base`.

### React

```tsx
import { MontiEmbedReact } from "monti-embed-sdk-react";

export function SupportWidget() {
  return (
    <MontiEmbedReact
      embedKey="emb_YOUR_KEY"
      apiBase="https://monti.devclub.dev/"
      position="bottom-right"
      onOpen={() => console.log("Monti opened")}
      onClose={() => console.log("Monti closed")}
      onReady={(config) => console.log("Monti ready", config)}
      onError={(error) => console.error(error.code, error.message)}
    />
  );
}
```

For Vite environment variables:

```dotenv
VITE_MONTI_EMBED_KEY=emb_YOUR_KEY
VITE_MONTI_API_BASE=https://monti.devclub.dev/
```

```tsx
<MontiEmbedReact
  embedKey={import.meta.env.VITE_MONTI_EMBED_KEY}
  apiBase={import.meta.env.VITE_MONTI_API_BASE}
/>
```

For Next.js App Router, place the component in a file beginning with `"use client"`.

### Vue 3

```vue
<script setup lang="ts">
import { MontiEmbedVue } from "monti-embed-sdk-vue";

const handleError = (error: { code: string; message: string }) => {
  console.error(error.code, error.message);
};
</script>

<template>
  <MontiEmbedVue
    embed-key="emb_YOUR_KEY"
    api-base="https://monti.devclub.dev/"
    position="bottom-right"
    @open="console.log('Monti opened')"
    @close="console.log('Monti closed')"
    @error="handleError"
  />
</template>
```

Optional global registration with a default API base:

```ts
import { createApp } from "vue";
import { createMontiEmbedPlugin } from "monti-embed-sdk-vue";
import App from "./App.vue";

createApp(App)
  .use(createMontiEmbedPlugin({ apiBase: "https://monti.devclub.dev/" }))
  .mount("#app");
```

The globally registered component can then omit `api-base`:

```vue
<MontiEmbed embed-key="emb_YOUR_KEY" />
```

### Svelte

```svelte
<script lang="ts">
  import MontiEmbed from "monti-embed-sdk-svelte/MontiEmbed.svelte";

  function handleError(event: CustomEvent<{ code: string; message: string }>) {
    console.error(event.detail.code, event.detail.message);
  }
</script>

<MontiEmbed
  embedKey="emb_YOUR_KEY"
  apiBase="https://monti.devclub.dev/"
  position="bottom-right"
  on:open={() => console.log("Monti opened")}
  on:close={() => console.log("Monti closed")}
  on:error={handleError}
/>
```

## 5. Common optional settings

All adapters support the same configuration:

```ts
{
  embedKey: "emb_YOUR_KEY",
  apiBase: "https://monti.example.com",
  position: "bottom-right", // bottom-left, top-right, top-left
  parentOrigin: "https://shop.example.com", // normally detected automatically
  agentId: "ava",
  theme: "dark",
  locale: "th",
  open: false,
  skipResolve: false
}
```

Normally, do not set `parentOrigin`: the SDK uses `window.location.origin`. The public resolve request checks the key, enabled state, and origin before mounting the iframe.

## 6. Update the Git installation

Update and rebuild the SDK checkout:

```bash
cd ../monti-embed-sdk
git pull --ff-only
npm ci
npm run verify
```

Then refresh the local packages in your application:

```bash
cd ../your-application
npm install ../monti-embed-sdk/packages/embed-core \
  ../monti-embed-sdk/packages/embed-react
```

Use your chosen adapter in place of `embed-react`.

## Troubleshooting

| Error or symptom | What to check |
| --- | --- |
| `origin_not_allowed` | Add the exact browser origin to the tenant's allowed origins |
| `embed_not_found` | Confirm the `emb_...` key and tenant |
| `embed_disabled` | Enable embedding in Tenant → Embed |
| `network_error` | Confirm `apiBase` is reachable from the browser |
| Widget does not update after a Git pull | Rebuild the SDK and reinstall the local packages |
| Voice or microphone unavailable | Use HTTPS in production or localhost during development |

Do not expose tenant admin tokens or private API credentials in frontend code. The `emb_...` public embed key is the only key intended for the browser.
