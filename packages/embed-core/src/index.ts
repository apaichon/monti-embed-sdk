import {
  buildEmbedIframeUrl,
  isEmbedError,
  normalizeApiBase,
  resolveEmbed,
  toEmbedError,
} from "./resolve.js";
import {
  createFloatingWidget,
  createInlineWidget,
  warnInsecureMontiHost,
  type WidgetHandles,
} from "./widget.js";
import type {
  EmbedError,
  EmbedEventMap,
  EmbedEventName,
  EmbedOptions,
  EmbedPosition,
  EmbedResolveResult,
} from "./types.js";

export type {
  EmbedError,
  EmbedErrorCode,
  EmbedEventMap,
  EmbedEventName,
  EmbedOptions,
  EmbedPosition,
  EmbedResolveResult,
} from "./types.js";
export {
  buildEmbedIframeUrl,
  buildResolveUrl,
  isEmbedError,
  normalizeApiBase,
  resolveEmbed,
  toEmbedError,
} from "./resolve.js";

type Listener<K extends EmbedEventName> = (payload: EmbedEventMap[K]) => void;

/** Programmatic, framework-neutral Monti Call Center embed. */
export class MontiEmbed {
  private readonly options: EmbedOptions;
  private readonly listeners = new Map<EmbedEventName, Set<Listener<EmbedEventName>>>();
  private widget: WidgetHandles | null = null;
  private openState = false;
  private desiredOpen: boolean;
  private destroyed = false;
  private resolveResult: EmbedResolveResult | undefined;
  private lastError: EmbedError | null = null;
  private mountPromise: Promise<void> | null = null;

  constructor(options: EmbedOptions) {
    this.options = options;
    this.desiredOpen = Boolean(options.open || options.container);
    if (options.onOpen) this.on("open", options.onOpen);
    if (options.onClose) this.on("close", options.onClose);
    if (options.onReady) this.on("ready", options.onReady);
    if (options.onError) this.on("error", options.onError);
    if (options.onDestroy) this.on("destroy", options.onDestroy);
  }

  get isOpen(): boolean {
    return this.openState;
  }

  get error(): EmbedError | null {
    return this.lastError;
  }

  get resolvedConfig(): EmbedResolveResult | undefined {
    return this.resolveResult;
  }

  /** Backwards-compatible alias for `resolvedConfig`. */
  get resolve(): EmbedResolveResult | undefined {
    return this.resolveResult;
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Mount once. Concurrent calls share the same pending operation. */
  async mount(): Promise<void> {
    if (this.destroyed) {
      this.emitError(toEmbedError({ code: "destroyed", message: "Embed instance was destroyed" }));
      return;
    }
    if (this.widget) return;
    if (this.mountPromise) return this.mountPromise;

    this.mountPromise = this.doMount();
    try {
      await this.mountPromise;
    } finally {
      this.mountPromise = null;
    }
  }

  /** Open now, or queue the open until an in-flight mount finishes. */
  open(): void {
    if (this.destroyed) return;
    this.desiredOpen = true;
    if (!this.widget || this.openState || this.options.container) return;
    this.openState = true;
    this.widget.setOpen(true);
    this.emit("open", undefined);
  }

  /** Close now, or cancel a queued initial open. Inline embeds remain visible. */
  close(): void {
    if (this.destroyed) return;
    this.desiredOpen = false;
    if (!this.widget || !this.openState || this.options.container) return;
    this.openState = false;
    this.widget.setOpen(false);
    this.emit("close", undefined);
  }

  toggle(): void {
    if (this.desiredOpen) this.close();
    else this.open();
  }

  /** Remove all SDK-owned DOM and listeners. Safe to call repeatedly. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.desiredOpen = false;
    this.openState = false;
    this.widget?.destroy();
    this.widget = null;
    this.emit("destroy", undefined);
    this.listeners.clear();
  }

  on<K extends EmbedEventName>(event: K, handler: Listener<K>): () => void {
    let listeners = this.listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }
    listeners.add(handler as Listener<EmbedEventName>);
    return () => listeners?.delete(handler as Listener<EmbedEventName>);
  }

  private async doMount(): Promise<void> {
    if (typeof document === "undefined" || typeof window === "undefined") {
      this.emitError(
        toEmbedError({ code: "not_browser", message: "MontiEmbed requires a browser environment" }),
      );
      return;
    }

    const embedKey = this.options.embedKey?.trim();
    const apiBase = normalizeApiBase(this.options.apiBase ?? "");
    if (!embedKey) {
      this.emitError(toEmbedError({ code: "missing_embed_key", message: "embedKey is required" }));
      return;
    }
    if (!apiBase) {
      this.emitError(toEmbedError({ code: "missing_api_base", message: "apiBase is required" }));
      return;
    }

    const parentOrigin = this.options.parentOrigin?.trim() || window.location.origin;
    warnInsecureMontiHost(apiBase);

    if (!this.options.skipResolve) {
      try {
        this.resolveResult = await resolveEmbed({
          apiBase,
          embedKey,
          parentOrigin,
          fetch: this.options.fetch,
        });
      } catch (cause) {
        const error = isEmbedError(cause)
          ? cause
          : toEmbedError({
              code: "resolve_failed",
              message: cause instanceof Error ? cause.message : "Failed to resolve embed",
            });
        this.emitError(error);
        if (isFatalResolveError(error)) {
          if (!this.destroyed) this.mountErrorState(error);
          return;
        }
      }
    }

    if (this.destroyed) return;

    let iframeSrc: string;
    try {
      iframeSrc = buildEmbedIframeUrl({
        apiBase,
        embedKey,
        parentOrigin,
        agentId: this.options.agentId,
        theme: this.options.theme,
        locale: this.options.locale,
      });
    } catch (cause) {
      const error = isEmbedError(cause)
        ? cause
        : toEmbedError({ code: "invalid_api_base", message: "apiBase must be an absolute URL" });
      this.emitError(error);
      this.mountErrorState(error);
      return;
    }

    const container = this.options.container ?? null;
    if (container) {
      this.widget = createInlineWidget({ container, iframeSrc });
      this.openState = true;
    } else {
      this.widget = createFloatingWidget({
        iframeSrc,
        position: this.options.position ?? "bottom-right",
        zIndex: this.options.zIndex ?? 2147483000,
        onOpenClick: () => this.open(),
        onCloseClick: () => this.close(),
      });
      this.widget.setOpen(false);
    }

    this.emit("ready", this.resolveResult);
    if (!container && this.desiredOpen) this.open();
  }

  private mountErrorState(error: EmbedError): void {
    if (typeof document === "undefined" || this.destroyed) return;
    const root = document.createElement("div");
    root.dataset.montiEmbed = "error";
    root.setAttribute("role", "alert");
    root.style.cssText = this.options.container
      ? "padding:16px;border-radius:12px;border:1px solid #f66;background:#2a1010;color:#fdd;font:14px system-ui,sans-serif"
      : errorPosition(this.options.position ?? "bottom-right");
    root.innerHTML =
      '<strong style="display:block;margin-bottom:6px">Monti embed error</strong>' +
      `<span style="opacity:.9">${escapeHtml(error.message)} ` +
      `<code style="font-size:12px">(${escapeHtml(String(error.code))})</code></span>`;

    (this.options.container ?? document.body).appendChild(root);
    this.widget = errorWidget(root);
  }

  private emitError(error: EmbedError): void {
    this.lastError = error;
    this.emit("error", error);
  }

  private emit<K extends EmbedEventName>(event: K, payload: EmbedEventMap[K]): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const handler of [...listeners]) {
      try {
        (handler as Listener<K>)(payload);
      } catch (error) {
        console.error(`[monti-embed] listener error on ${event}`, error);
      }
    }
  }
}

export async function createMontiEmbed(options: EmbedOptions): Promise<MontiEmbed> {
  const embed = new MontiEmbed(options);
  await embed.mount();
  return embed;
}

function isFatalResolveError(error: EmbedError): boolean {
  return [
    "invalid_api_base",
    "embed_not_found",
    "embed_disabled",
    "origin_not_allowed",
  ].includes(error.code);
}

function errorWidget(root: HTMLElement): WidgetHandles {
  return {
    root,
    panel: root,
    iframe: document.createElement("iframe"),
    openButton: null,
    closeButton: null,
    setOpen() {},
    destroy: () => root.remove(),
  };
}

function errorPosition(position: EmbedPosition): string {
  const vertical = position.startsWith("top") ? "top:20px" : "bottom:20px";
  const horizontal = position.endsWith("left") ? "left:20px" : "right:20px";
  return [
    "position:fixed",
    vertical,
    horizontal,
    "z-index:2147483000",
    "max-width:320px",
    "padding:16px",
    "border-radius:12px",
    "border:1px solid #f66",
    "background:#2a1010",
    "color:#fdd",
    "font:14px system-ui,sans-serif",
    "box-shadow:0 8px 24px rgba(0,0,0,.4)",
  ].join(";");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
