# Monti Embed SDK

Small, typed packages for embedding the Monti Call Center in vanilla JavaScript, a Web Component, React, Vue 3, or Svelte. Every adapter uses the same `@monti/embed-core` lifecycle and the same Monti `/embed` experience.

Using the SDK before npm publication? See [Install from Git](docs/INSTALL_FROM_GIT.md).

## Packages

| Package | Use it for |
| --- | --- |
| `@monti/embed-core` | Shared typed lifecycle and advanced integrations |
| `@monti/embed-vanilla` | Plain JavaScript or TypeScript |
| `@monti/embed-web-component` | HTML, Angular, or any Custom Elements host |
| `@monti/embed-react` | React 18+ component and hook |
| `@monti/embed-vue` | Vue 3 component and plugin |
| `@monti/embed-svelte` | Svelte 4/5 component and imperative helper |

The public embed key comes from **Tenant → Embed**. In production, use an HTTPS `apiBase` and add the exact host-site origin to Monti's allowed origins.

## Web Component

```bash
npm install @monti/embed-web-component
```

```html
<script type="module">
  import "@monti/embed-web-component";
</script>

<monti-embed
  embed-key="emb_YOUR_KEY"
  api-base="https://monti.devclub.dev/"
  position="bottom-right"
></monti-embed>

<script>
  const el = document.querySelector("monti-embed");
  el.addEventListener("monti-open", () => console.log("open"));
  el.addEventListener("monti-close", () => console.log("close"));
  el.addEventListener("monti-error", (event) => console.error(event.detail));
</script>
```

`base-url` is accepted as a backwards-compatible alias for the older demo integration, but new code should use `api-base`.

## Vue 3

```bash
npm install @monti/embed-vue vue
```

```vue
<script setup lang="ts">
import { MontiEmbedVue } from "@monti/embed-vue";
</script>

<template>
  <MontiEmbedVue
    embed-key="emb_YOUR_KEY"
    api-base="https://monti.devclub.dev/"
    position="bottom-right"
    @open="() => {}"
    @close="() => {}"
    @error="(error) => console.error(error)"
  />
</template>
```

## React

```bash
npm install @monti/embed-react react react-dom
```

```tsx
import { MontiEmbedReact } from "@monti/embed-react";

export function SupportWidget() {
  return (
    <MontiEmbedReact
      embedKey="emb_YOUR_KEY"
      apiBase="https://monti.devclub.dev/"
      position="bottom-right"
      onError={(error) => console.error(error.code, error.message)}
    />
  );
}
```

## Svelte

```bash
npm install @monti/embed-svelte svelte
```

```svelte
<script lang="ts">
  import MontiEmbed from "@monti/embed-svelte/MontiEmbed.svelte";
</script>

<MontiEmbed
  embedKey="emb_YOUR_KEY"
  apiBase="https://monti.devclub.dev/"
  on:error={(event) => console.error(event.detail)}
/>
```

## Vanilla JavaScript

```bash
npm install @monti/embed-vanilla
```

```js
import { mountMontiEmbed } from "@monti/embed-vanilla";

const monti = mountMontiEmbed({
  embedKey: "emb_YOUR_KEY",
  apiBase: "https://monti.devclub.dev/",
  position: "bottom-right",
  onError: (error) => console.error(error.code, error.message),
});

// monti.open(); monti.close(); monti.toggle(); monti.destroy();
```

## Common options

| Option | Required | Description |
| --- | --- | --- |
| `embedKey` | yes | Public `emb_...` key from Monti |
| `apiBase` | yes | Monti origin, without requiring a trailing slash |
| `position` | no | `bottom-right`, `bottom-left`, `top-right`, or `top-left` |
| `parentOrigin` | no | Defaults to the current page origin |
| `agentId` | no | Preselect an agent |
| `theme`, `locale` | no | Forwarded to the embedded call-center UI |
| `open` | no | Start open or control open state in framework adapters |
| `inline` | no | Render inside the component instead of as a floating launcher |
| `skipResolve` | no | Skip the helpful public config check and mount immediately |

Lifecycle events/callbacks are `open`, `close`, `ready`, `error`, and `destroy`. Errors have `{ code, message, status? }`.

## Develop and publish

```bash
npm install
npm run verify
npm run pack:check
```

Publish `@monti/embed-core` first, followed by the five adapters. All packages are configured for public scoped publishing and ESM consumption.
