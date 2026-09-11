# @monti/embed-vue

```vue
<script setup lang="ts">
import { MontiEmbedVue } from "@monti/embed-vue";
</script>

<template>
  <MontiEmbedVue
    embed-key="emb_YOUR_KEY"
    api-base="https://monti.devclub.dev/"
    @error="(error) => console.error(error)"
  />
</template>
```

Events: `open`, `close`, `ready`, `error`, `destroy`, and `update:open`. `createMontiEmbedPlugin({ apiBase })` can register `<MontiEmbed>` globally and provide a default API base.
