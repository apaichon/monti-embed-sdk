import type { EmbedPosition } from "./types.js";

const POSITIONS: Record<
  EmbedPosition,
  { right: string; bottom: string; left: string; top: string }
> = {
  "bottom-right": { right: "20px", bottom: "20px", left: "auto", top: "auto" },
  "bottom-left": { right: "auto", bottom: "20px", left: "20px", top: "auto" },
  "top-right": { right: "20px", bottom: "auto", left: "auto", top: "20px" },
  "top-left": { right: "auto", bottom: "auto", left: "20px", top: "20px" },
};

const IFRAME_ALLOW =
  "microphone *; autoplay *; camera *; clipboard-write *; display-capture *";

export interface WidgetHandles {
  root: HTMLElement;
  panel: HTMLElement;
  iframe: HTMLIFrameElement;
  openButton: HTMLButtonElement | null;
  closeButton: HTMLButtonElement | null;
  setOpen(open: boolean): void;
  destroy(): void;
}

export function createFloatingWidget(options: {
  iframeSrc: string;
  position: EmbedPosition;
  zIndex: number;
  onOpenClick(): void;
  onCloseClick(): void;
}): WidgetHandles {
  const position = POSITIONS[options.position] ?? POSITIONS["bottom-right"];
  const root = document.createElement("div");
  root.id = "monti-embed-root";
  root.dataset.montiEmbed = "floating";
  root.style.cssText = `all:initial;position:fixed;z-index:${options.zIndex};font-family:system-ui,sans-serif`;

  const panel = document.createElement("div");
  panel.style.cssText = [
    "display:none",
    "position:fixed",
    `right:${position.right}`,
    `bottom:${position.bottom}`,
    `left:${position.left}`,
    `top:${position.top}`,
    "width:min(400px,calc(100vw - 24px))",
    "height:min(680px,calc(100vh - 40px))",
    "border-radius:16px",
    "overflow:hidden",
    "box-shadow:0 16px 48px rgba(0,0,0,.35)",
    "border:1px solid rgba(0,183,255,.35)",
    "background:#05101f",
    `z-index:${options.zIndex + 1}`,
  ].join(";");

  const iframe = createIframe(options.iframeSrc);
  panel.appendChild(iframe);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close Monti chat");
  closeButton.textContent = "✕";
  closeButton.style.cssText = [
    "position:absolute",
    "top:10px",
    "right:10px",
    "z-index:3",
    "display:none",
    "width:32px",
    "height:32px",
    "padding:0",
    "border:1px solid rgba(0,183,255,.4)",
    "border-radius:50%",
    "background:rgba(8,20,36,.92)",
    "color:#f7fbff",
    "font:14px/1 system-ui,sans-serif",
    "cursor:pointer",
    "box-shadow:0 4px 12px rgba(0,0,0,.35)",
  ].join(";");
  panel.appendChild(closeButton);

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.setAttribute("aria-label", "Open Monti chat");
  openButton.textContent = "💬";
  openButton.style.cssText = [
    "position:fixed",
    `right:${position.right}`,
    `bottom:${position.bottom}`,
    `left:${position.left}`,
    `top:${position.top}`,
    "width:56px",
    "height:56px",
    "padding:0",
    "border:0",
    "border-radius:50%",
    "background:linear-gradient(135deg,#0084ff,#00b7ff)",
    "color:#fff",
    "font:22px/1 system-ui,sans-serif",
    "cursor:pointer",
    "box-shadow:0 8px 24px rgba(0,120,255,.45)",
    `z-index:${options.zIndex + 2}`,
  ].join(";");

  const onOpen = () => options.onOpenClick();
  const onClose = () => options.onCloseClick();
  openButton.addEventListener("click", onOpen);
  closeButton.addEventListener("click", onClose);

  root.appendChild(panel);
  root.appendChild(openButton);
  document.body.appendChild(root);

  return {
    root,
    panel,
    iframe,
    openButton,
    closeButton,
    setOpen(open) {
      panel.style.display = open ? "block" : "none";
      closeButton.style.display = open ? "block" : "none";
      openButton.style.display = open ? "none" : "block";
    },
    destroy() {
      openButton.removeEventListener("click", onOpen);
      closeButton.removeEventListener("click", onClose);
      root.remove();
    },
  };
}

export function createInlineWidget(options: {
  container: HTMLElement;
  iframeSrc: string;
}): WidgetHandles {
  const root = document.createElement("div");
  root.dataset.montiEmbed = "inline";
  root.style.cssText = "width:100%;height:100%;min-height:480px;position:relative";

  const panel = document.createElement("div");
  panel.style.cssText =
    "display:block;position:absolute;inset:0;border-radius:16px;overflow:hidden;" +
    "border:1px solid rgba(0,183,255,.35);background:#05101f";

  const iframe = createIframe(options.iframeSrc);
  panel.appendChild(iframe);
  root.appendChild(panel);
  options.container.appendChild(root);

  return {
    root,
    panel,
    iframe,
    openButton: null,
    closeButton: null,
    setOpen() {
      // Inline embeds remain visible.
    },
    destroy() {
      root.remove();
    },
  };
}

function createIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.title = "Monti AI Assistant";
  iframe.setAttribute("allow", IFRAME_ALLOW);
  iframe.allow = IFRAME_ALLOW;
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  iframe.style.cssText = "width:100%;height:100%;border:0;display:block;background:#05101f";
  iframe.src = src;
  return iframe;
}

export function warnInsecureMontiHost(apiBase: string): void {
  try {
    const url = new URL(apiBase);
    const host = url.hostname.toLowerCase();
    const secure =
      url.protocol === "https:" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".localhost");
    if (!secure) {
      console.warn(
        `[monti-embed] Voice and microphone access require HTTPS; current Monti origin is ${url.origin}.`,
      );
    }
  } catch {
    // Invalid URLs are surfaced by the core lifecycle.
  }
}
