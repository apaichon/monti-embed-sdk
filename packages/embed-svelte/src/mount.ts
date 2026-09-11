import { MontiEmbed, type EmbedOptions } from "@libratech/embed-core";

export interface MountMontiEmbedSvelteOptions extends EmbedOptions {
  target?: HTMLElement;
  inline?: boolean;
}

export interface MontiEmbedSvelteHandle {
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
  getInstance(): MontiEmbed;
}

export async function mountMontiEmbedSvelte(
  options: MountMontiEmbedSvelteOptions,
): Promise<MontiEmbedSvelteHandle> {
  const { target, inline, ...embedOptions } = options;
  const embed = new MontiEmbed({
    ...embedOptions,
    container: inline ? (target ?? embedOptions.container ?? null) : embedOptions.container,
  });
  await embed.mount();
  return {
    open: () => embed.open(),
    close: () => embed.close(),
    toggle: () => embed.toggle(),
    destroy: () => embed.destroy(),
    getInstance: () => embed,
  };
}
