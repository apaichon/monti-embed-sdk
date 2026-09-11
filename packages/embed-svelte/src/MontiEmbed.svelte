<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import {
    MontiEmbed,
    type EmbedError,
    type EmbedPosition,
    type EmbedResolveResult,
  } from "@libratech/embed-core";

  export let embedKey: string;
  export let apiBase: string;
  export let parentOrigin: string | undefined = undefined;
  export let position: EmbedPosition = "bottom-right";
  export let agentId: string | undefined = undefined;
  export let theme: string | undefined = undefined;
  export let locale: string | undefined = undefined;
  export let open = false;
  export let inline = false;
  export let skipResolve = false;

  const dispatch = createEventDispatcher<{
    open: void;
    close: void;
    ready: EmbedResolveResult | undefined;
    error: EmbedError;
    destroy: void;
  }>();

  let host: HTMLDivElement;
  let embed: MontiEmbed | null = null;
  let mounted = false;
  let mountToken = 0;

  async function remount(): Promise<void> {
    const token = ++mountToken;
    embed?.destroy();

    const instance = new MontiEmbed({
      embedKey,
      apiBase,
      parentOrigin,
      position,
      agentId,
      theme,
      locale,
      open,
      skipResolve,
      container: inline ? host : null,
      onOpen: () => dispatch("open"),
      onClose: () => dispatch("close"),
      onReady: (result) => dispatch("ready", result),
      onError: (error) => dispatch("error", error),
      onDestroy: () => dispatch("destroy"),
    });
    embed = instance;
    await instance.mount();
    if (token !== mountToken) instance.destroy();
  }

  onMount(() => {
    mounted = true;
  });

  onDestroy(() => {
    mounted = false;
    mountToken += 1;
    embed?.destroy();
    embed = null;
  });

  $: identity = [
    embedKey,
    apiBase,
    parentOrigin,
    position,
    agentId,
    theme,
    locale,
    inline,
    skipResolve,
  ];
  $: if (mounted && identity) void remount();

  $: if (mounted && embed) {
    if (open) embed.open();
    else embed.close();
  }

  export function openEmbed(): void {
    embed?.open();
  }

  export function closeEmbed(): void {
    embed?.close();
  }

  export function toggleEmbed(): void {
    embed?.toggle();
  }

  export function destroyEmbed(): void {
    mountToken += 1;
    embed?.destroy();
    embed = null;
  }

  export function getInstance(): MontiEmbed | null {
    return embed;
  }
</script>

<div
  bind:this={host}
  data-monti-embed-svelte="1"
  style={inline ? "width:100%;min-height:480px;height:100%" : "display:contents"}
></div>
