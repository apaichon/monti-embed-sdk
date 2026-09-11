import {
  MontiEmbed,
  type EmbedError,
  type EmbedPosition,
  type EmbedResolveResult,
} from "@monti/embed-core";

export type { EmbedError, EmbedPosition, EmbedResolveResult };
export { MontiEmbed };

const IDENTITY_ATTRIBUTES = [
  "embed-key",
  "api-base",
  "base-url",
  "parent-origin",
  "position",
  "agent-id",
  "theme",
  "locale",
  "inline",
  "skip-resolve",
] as const;

const OBSERVED_ATTRIBUTES = [...IDENTITY_ATTRIBUTES, "open"] as const;

const HTMLElementBase = (globalThis.HTMLElement ?? class {}) as typeof HTMLElement;

export class MontiEmbedElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES];
  }

  private embed: MontiEmbed | null = null;
  private host: HTMLDivElement | null = null;
  private mountToken = 0;

  connectedCallback(): void {
    if (!this.host) {
      this.host = document.createElement("div");
      this.appendChild(this.host);
    }
    this.updateHostStyle();
    void this.remount();
  }

  disconnectedCallback(): void {
    this.teardown();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return;
    if (name === "open" && this.embed) {
      if (this.boolAttribute("open")) this.embed.open();
      else this.embed.close();
      return;
    }
    this.updateHostStyle();
    void this.remount();
  }

  open(): void {
    this.setAttribute("open", "");
    this.embed?.open();
  }

  close(): void {
    this.removeAttribute("open");
    this.embed?.close();
  }

  toggle(): void {
    if (this.hasAttribute("open")) this.close();
    else this.open();
  }

  destroy(): void {
    this.teardown();
  }

  getInstance(): MontiEmbed | null {
    return this.embed;
  }

  private teardown(): void {
    this.mountToken += 1;
    this.embed?.destroy();
    this.embed = null;
  }

  private updateHostStyle(): void {
    if (!this.host) return;
    const inline = this.boolAttribute("inline");
    this.host.style.cssText = inline
      ? "display:block;width:100%;min-height:480px;height:100%"
      : "display:contents";
  }

  private attribute(name: string): string {
    return (this.getAttribute(name) ?? "").trim();
  }

  private boolAttribute(name: string): boolean {
    if (!this.hasAttribute(name)) return false;
    return !["false", "0", "no"].includes(this.attribute(name).toLowerCase());
  }

  private async remount(): Promise<void> {
    const token = ++this.mountToken;
    this.embed?.destroy();
    this.embed = null;

    const embedKey = this.attribute("embed-key");
    const apiBase = this.attribute("api-base") || this.attribute("base-url");
    if (!embedKey || !apiBase) {
      this.dispatch("monti-error", {
        code: embedKey ? "missing_api_base" : "missing_embed_key",
        message: embedKey ? "api-base is required" : "embed-key is required",
      } satisfies EmbedError);
      return;
    }

    const embed = new MontiEmbed({
      embedKey,
      apiBase,
      parentOrigin: this.attribute("parent-origin") || undefined,
      position: (this.attribute("position") || "bottom-right") as EmbedPosition,
      agentId: this.attribute("agent-id") || undefined,
      theme: this.attribute("theme") || undefined,
      locale: this.attribute("locale") || undefined,
      open: this.boolAttribute("open"),
      skipResolve: this.boolAttribute("skip-resolve"),
      container: this.boolAttribute("inline") ? this.host : null,
      onOpen: () => {
        if (!this.hasAttribute("open")) this.setAttribute("open", "");
        this.dispatch("monti-open");
      },
      onClose: () => {
        if (this.hasAttribute("open")) this.removeAttribute("open");
        this.dispatch("monti-close");
      },
      onReady: (result) => this.dispatch("monti-ready", result),
      onError: (error) => this.dispatch("monti-error", error),
      onDestroy: () => this.dispatch("monti-destroy"),
    });
    this.embed = embed;
    await embed.mount();

    if (token !== this.mountToken || !this.isConnected) {
      embed.destroy();
      if (this.embed === embed) this.embed = null;
    }
  }

  private dispatch(name: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        ...(detail === undefined ? {} : { detail }),
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "monti-embed": MontiEmbedElement;
  }
}

export function defineMontiEmbedElement(tagName = "monti-embed"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;
  customElements.define(tagName, MontiEmbedElement);
}

defineMontiEmbedElement();

export default MontiEmbedElement;
