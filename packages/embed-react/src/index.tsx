import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  MontiEmbed,
  type EmbedError,
  type EmbedPosition,
  type EmbedResolveResult,
} from "@libratech/embed-core";

export type { EmbedError, EmbedPosition, EmbedResolveResult };
export { MontiEmbed };

export interface MontiEmbedProps {
  embedKey: string;
  apiBase: string;
  parentOrigin?: string;
  position?: EmbedPosition;
  agentId?: string;
  theme?: string;
  locale?: string;
  /** Controlled open state for a floating embed. */
  open?: boolean;
  /** Initial open state when `open` is uncontrolled. */
  defaultOpen?: boolean;
  inline?: boolean;
  skipResolve?: boolean;
  className?: string;
  style?: CSSProperties;
  onOpen?: () => void;
  onClose?: () => void;
  onReady?: (result?: EmbedResolveResult) => void;
  onError?: (error: EmbedError) => void;
  onDestroy?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export interface MontiEmbedHandle {
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
  getInstance(): MontiEmbed | null;
}

export const MontiEmbedReact = forwardRef<MontiEmbedHandle, MontiEmbedProps>(
  function MontiEmbedReact(props, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const embedRef = useRef<MontiEmbed | null>(null);
    const [error, setError] = useState<EmbedError | null>(null);
    const callbacks = useLatestCallbacks(props);

    const {
      embedKey,
      apiBase,
      parentOrigin,
      position = "bottom-right",
      agentId,
      theme,
      locale,
      open,
      defaultOpen = false,
      inline = false,
      skipResolve = false,
      className,
      style,
    } = props;

    useEffect(() => {
      let active = true;
      setError(null);
      const embed = new MontiEmbed({
        embedKey,
        apiBase,
        parentOrigin,
        position,
        agentId,
        theme,
        locale,
        open: open ?? defaultOpen,
        skipResolve,
        container: inline ? hostRef.current : null,
        onOpen: () => {
          callbacks.current.onOpen?.();
          callbacks.current.onOpenChange?.(true);
        },
        onClose: () => {
          callbacks.current.onClose?.();
          callbacks.current.onOpenChange?.(false);
        },
        onReady: (result) => callbacks.current.onReady?.(result),
        onError: (nextError) => {
          if (active) setError(nextError);
          callbacks.current.onError?.(nextError);
        },
        onDestroy: () => callbacks.current.onDestroy?.(),
      });
      embedRef.current = embed;
      void embed.mount();

      return () => {
        active = false;
        embed.destroy();
        if (embedRef.current === embed) embedRef.current = null;
      };
    }, [
      embedKey,
      apiBase,
      parentOrigin,
      position,
      agentId,
      theme,
      locale,
      inline,
      skipResolve,
      defaultOpen,
      callbacks,
    ]);

    useEffect(() => {
      if (open === undefined) return;
      if (open) embedRef.current?.open();
      else embedRef.current?.close();
    }, [open]);

    useImperativeHandle(
      ref,
      () => ({
        open: () => embedRef.current?.open(),
        close: () => embedRef.current?.close(),
        toggle: () => embedRef.current?.toggle(),
        destroy: () => {
          embedRef.current?.destroy();
          embedRef.current = null;
        },
        getInstance: () => embedRef.current,
      }),
      [],
    );

    const hostStyle: CSSProperties = inline
      ? { width: "100%", minHeight: 480, height: "100%", ...style }
      : { display: "contents", ...style };

    return (
      <div
        ref={hostRef}
        data-monti-embed-react="1"
        data-error={error?.code}
        className={className}
        style={hostStyle}
      />
    );
  },
);

export function useMontiEmbed(
  options: Omit<MontiEmbedProps, "className" | "style" | "inline"> & {
    container?: HTMLElement | null;
    enabled?: boolean;
  },
): {
  embed: MontiEmbed | null;
  error: EmbedError | null;
  open(): void;
  close(): void;
  toggle(): void;
} {
  const embedRef = useRef<MontiEmbed | null>(null);
  const [embed, setEmbed] = useState<MontiEmbed | null>(null);
  const [error, setError] = useState<EmbedError | null>(null);
  const callbacks = useLatestCallbacks(options);
  const enabled = options.enabled !== false;

  useEffect(() => {
    if (!enabled) {
      embedRef.current?.destroy();
      embedRef.current = null;
      setEmbed(null);
      return;
    }

    let active = true;
    setError(null);
    const instance = new MontiEmbed({
      embedKey: options.embedKey,
      apiBase: options.apiBase,
      parentOrigin: options.parentOrigin,
      position: options.position,
      agentId: options.agentId,
      theme: options.theme,
      locale: options.locale,
      open: options.open ?? options.defaultOpen,
      skipResolve: options.skipResolve,
      container: options.container ?? null,
      onOpen: () => callbacks.current.onOpen?.(),
      onClose: () => callbacks.current.onClose?.(),
      onReady: (result) => callbacks.current.onReady?.(result),
      onError: (nextError) => {
        if (active) setError(nextError);
        callbacks.current.onError?.(nextError);
      },
      onDestroy: () => callbacks.current.onDestroy?.(),
    });
    embedRef.current = instance;
    setEmbed(instance);
    void instance.mount();

    return () => {
      active = false;
      instance.destroy();
      if (embedRef.current === instance) embedRef.current = null;
      setEmbed((current) => (current === instance ? null : current));
    };
  }, [
    enabled,
    options.embedKey,
    options.apiBase,
    options.parentOrigin,
    options.position,
    options.agentId,
    options.theme,
    options.locale,
    options.skipResolve,
    options.container,
    callbacks,
  ]);

  useEffect(() => {
    if (options.open === undefined) return;
    if (options.open) embedRef.current?.open();
    else embedRef.current?.close();
  }, [options.open]);

  return {
    embed,
    error,
    open: useCallback(() => embedRef.current?.open(), []),
    close: useCallback(() => embedRef.current?.close(), []),
    toggle: useCallback(() => embedRef.current?.toggle(), []),
  };
}

function useLatestCallbacks(props: Partial<MontiEmbedProps>) {
  const callbacks = useRef({
    onOpen: props.onOpen,
    onClose: props.onClose,
    onReady: props.onReady,
    onError: props.onError,
    onDestroy: props.onDestroy,
    onOpenChange: props.onOpenChange,
  });
  callbacks.current = {
    onOpen: props.onOpen,
    onClose: props.onClose,
    onReady: props.onReady,
    onError: props.onError,
    onDestroy: props.onDestroy,
    onOpenChange: props.onOpenChange,
  };
  return callbacks;
}

export default MontiEmbedReact;
