# @monti/embed-svelte

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

For a component-free integration, import `mountMontiEmbedSvelte` from the package root.
