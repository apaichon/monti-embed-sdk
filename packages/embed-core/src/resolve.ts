import type { EmbedError, EmbedResolveResult } from "./types.js";

export function normalizeApiBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, "");
}

function baseUrl(apiBase: string): URL {
  const normalized = normalizeApiBase(apiBase);
  try {
    return new URL(normalized);
  } catch {
    throw toEmbedError({
      code: "invalid_api_base",
      message: `apiBase must be an absolute URL: ${apiBase}`,
    });
  }
}

export function buildEmbedIframeUrl(options: {
  apiBase: string;
  embedKey: string;
  parentOrigin?: string;
  agentId?: string;
  theme?: string;
  locale?: string;
}): string {
  const base = baseUrl(options.apiBase);
  const url = new URL(`${base.pathname.replace(/\/$/, "")}/embed`, base.origin);
  url.searchParams.set("key", options.embedKey);
  if (options.parentOrigin) url.searchParams.set("parent_origin", options.parentOrigin);
  if (options.agentId) url.searchParams.set("agent", options.agentId);
  if (options.theme) url.searchParams.set("theme", options.theme);
  if (options.locale) url.searchParams.set("locale", options.locale);
  return url.toString();
}

export function buildResolveUrl(
  apiBase: string,
  embedKey: string,
  parentOrigin?: string,
): string {
  const base = baseUrl(apiBase);
  const path = `${base.pathname.replace(/\/$/, "")}/api/public/embed/${encodeURIComponent(embedKey)}`;
  const url = new URL(path, base.origin);
  if (parentOrigin) url.searchParams.set("parent_origin", parentOrigin);
  return url.toString();
}

export async function resolveEmbed(options: {
  apiBase: string;
  embedKey: string;
  parentOrigin?: string;
  fetch?: typeof fetch;
}): Promise<EmbedResolveResult> {
  const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetcher) {
    throw toEmbedError({ code: "network_error", message: "fetch is not available" });
  }

  let response: Response;
  try {
    response = await fetcher(
      buildResolveUrl(options.apiBase, options.embedKey, options.parentOrigin),
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit",
      },
    );
  } catch (error) {
    if (isEmbedError(error)) throw error;
    throw toEmbedError({
      code: "network_error",
      message: error instanceof Error ? error.message : "Network error resolving embed",
    });
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const code =
      stringValue(payload.code) ??
      (response.status === 404
        ? "embed_not_found"
        : response.status === 403
          ? "origin_not_allowed"
          : "resolve_failed");
    const message = stringValue(payload.error) ?? stringValue(payload.message) ?? code;
    throw toEmbedError({ code, message, status: response.status });
  }

  return payload as unknown as EmbedResolveResult;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export function isEmbedError(value: unknown): value is EmbedError {
  return Boolean(
    value &&
      typeof value === "object" &&
      "code" in value &&
      typeof (value as EmbedError).code === "string" &&
      "message" in value &&
      typeof (value as EmbedError).message === "string",
  );
}

export function toEmbedError(error: EmbedError): EmbedError {
  return {
    code: error.code,
    message: error.message || String(error.code),
    ...(error.status === undefined ? {} : { status: error.status }),
  };
}
