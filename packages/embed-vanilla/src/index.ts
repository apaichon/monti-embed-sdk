import { MontiEmbed, type EmbedOptions } from "monti-embed-sdk-core";

export * from "monti-embed-sdk-core";

/** Start mounting immediately and return the controllable SDK instance. */
export function mountMontiEmbed(options: EmbedOptions): MontiEmbed {
  const embed = new MontiEmbed(options);
  void embed.mount();
  return embed;
}

export default MontiEmbed;
