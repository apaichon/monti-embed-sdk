import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type App,
  type PropType,
} from "vue";
import {
  MontiEmbed,
  type EmbedError,
  type EmbedPosition,
  type EmbedResolveResult,
} from "@libratech/embed-core";

export type { EmbedError, EmbedPosition, EmbedResolveResult };
export { MontiEmbed };

export const MontiEmbedVue = defineComponent({
  name: "MontiEmbedVue",
  props: {
    embedKey: { type: String, required: true },
    apiBase: { type: String, default: undefined },
    parentOrigin: { type: String, default: undefined },
    position: { type: String as PropType<EmbedPosition>, default: "bottom-right" },
    agentId: { type: String, default: undefined },
    theme: { type: String, default: undefined },
    locale: { type: String, default: undefined },
    open: { type: Boolean, default: false },
    inline: { type: Boolean, default: false },
    skipResolve: { type: Boolean, default: false },
  },
  emits: {
    open: () => true,
    close: () => true,
    ready: (_result?: EmbedResolveResult) => true,
    error: (_error: EmbedError) => true,
    destroy: () => true,
    "update:open": (_open: boolean) => true,
  },
  setup(props, { emit, expose }) {
    const providedApiBase = inject<string>(MONTI_API_BASE, "");
    const host = ref<HTMLElement | null>(null);
    let embed: MontiEmbed | null = null;
    let mountToken = 0;

    const effectiveApiBase = () => props.apiBase?.trim() || providedApiBase;

    async function remount(): Promise<void> {
      const token = ++mountToken;
      embed?.destroy();
      embed = null;

      const instance = new MontiEmbed({
        embedKey: props.embedKey,
        apiBase: effectiveApiBase(),
        parentOrigin: props.parentOrigin,
        position: props.position,
        agentId: props.agentId,
        theme: props.theme,
        locale: props.locale,
        open: props.open,
        skipResolve: props.skipResolve,
        container: props.inline ? host.value : null,
        onOpen: () => {
          emit("open");
          emit("update:open", true);
        },
        onClose: () => {
          emit("close");
          emit("update:open", false);
        },
        onReady: (result) => emit("ready", result),
        onError: (error) => emit("error", error),
        onDestroy: () => emit("destroy"),
      });
      embed = instance;
      await instance.mount();
      if (token !== mountToken) instance.destroy();
    }

    onMounted(() => void remount());
    onBeforeUnmount(() => {
      mountToken += 1;
      embed?.destroy();
      embed = null;
    });

    watch(
      () => [
        props.embedKey,
        props.apiBase,
        props.parentOrigin,
        props.position,
        props.agentId,
        props.theme,
        props.locale,
        props.inline,
        props.skipResolve,
      ],
      () => void remount(),
    );

    watch(
      () => props.open,
      (open) => {
        if (open) embed?.open();
        else embed?.close();
      },
    );

    expose({
      open: () => embed?.open(),
      close: () => embed?.close(),
      toggle: () => embed?.toggle(),
      destroy: () => {
        mountToken += 1;
        embed?.destroy();
        embed = null;
      },
      getInstance: () => embed,
    });

    return () =>
      h("div", {
        ref: host,
        "data-monti-embed-vue": "1",
        style: props.inline
          ? { width: "100%", minHeight: "480px", height: "100%" }
          : { display: "contents" },
      });
  },
});

export const MONTI_API_BASE = Symbol("monti-embed-api-base");

export interface MontiEmbedPluginOptions {
  apiBase?: string;
}

export function createMontiEmbedPlugin(defaults: MontiEmbedPluginOptions = {}) {
  return {
    install(app: App): void {
      app.component("MontiEmbed", MontiEmbedVue);
      if (defaults.apiBase) app.provide(MONTI_API_BASE, defaults.apiBase);
    },
  };
}

export default MontiEmbedVue;
