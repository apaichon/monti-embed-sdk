import { MontiEmbed, type EmbedOptions } from "@libratech/embed-core";

export * from "@libratech/embed-core";

/** Start mounting immediately and return the controllable SDK instance. */
export function mountMontiEmbed(options: EmbedOptions): MontiEmbed {
  const embed = new MontiEmbed(options);
  void embed.mount();
  return embed;
}

export default MontiEmbed;
