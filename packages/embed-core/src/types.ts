export type EmbedPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface EmbedResolveResult {
  tenant_id: string;
  slug?: string;
  name?: string;
  embed_key?: string;
  enabled?: boolean;
  default_agent_id?: string;
  agents?: Array<{ id: string; name: string; role?: string }>;
  [key: string]: unknown;
}

export type EmbedErrorCode =
  | "missing_embed_key"
  | "missing_api_base"
  | "invalid_api_base"
  | "embed_not_found"
  | "embed_disabled"
  | "origin_not_allowed"
  | "resolve_failed"
  | "network_error"
  | "not_browser"
  | "destroyed";

export interface EmbedError {
  code: EmbedErrorCode | (string & {});
  message: string;
  status?: number;
}

export interface EmbedEventMap {
  open: void;
  close: void;
  ready: EmbedResolveResult | undefined;
  error: EmbedError;
  destroy: void;
}

export type EmbedEventName = keyof EmbedEventMap;

export interface EmbedOptions {
  /** Public `emb_...` key from Tenant → Embed. */
  embedKey: string;
  /** Monti origin, for example `https://monti.example.com`. */
  apiBase: string;
  /** Host-site origin used by Monti's allowlist. Defaults to `window.location.origin`. */
  parentOrigin?: string;
  position?: EmbedPosition;
  agentId?: string;
  theme?: string;
  locale?: string;
  /** Start the floating panel open. */
  open?: boolean;
  /** Render inline inside this element instead of creating a floating launcher. */
  container?: HTMLElement | null;
  /** Skip the public resolve request. The iframe still validates the embed. */
  skipResolve?: boolean;
  /** Optional fetch implementation, primarily useful for tests and non-browser hosts. */
  fetch?: typeof fetch;
  zIndex?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onReady?: (result?: EmbedResolveResult) => void;
  onError?: (error: EmbedError) => void;
  onDestroy?: () => void;
}
