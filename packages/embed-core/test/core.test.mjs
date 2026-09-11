import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MontiEmbed,
  buildEmbedIframeUrl,
  buildResolveUrl,
  normalizeApiBase,
  resolveEmbed,
} from "../dist/index.js";

describe("URL helpers", () => {
  it("normalizes the API base and preserves a base path", () => {
    assert.equal(normalizeApiBase(" https://monti.example.com/gateway/// "), "https://monti.example.com/gateway");

    const iframeUrl = new URL(
      buildEmbedIframeUrl({
        apiBase: "https://monti.example.com/gateway/",
        embedKey: "emb_abc",
        parentOrigin: "https://shop.example",
        agentId: "ava",
        theme: "dark",
        locale: "th",
      }),
    );
    assert.equal(iframeUrl.pathname, "/gateway/embed");
    assert.equal(iframeUrl.searchParams.get("key"), "emb_abc");
    assert.equal(iframeUrl.searchParams.get("parent_origin"), "https://shop.example");
    assert.equal(iframeUrl.searchParams.get("agent"), "ava");
    assert.equal(iframeUrl.searchParams.get("theme"), "dark");
    assert.equal(iframeUrl.searchParams.get("locale"), "th");

    const resolveUrl = new URL(
      buildResolveUrl("https://monti.example.com/gateway", "emb_x/y", "https://shop.example"),
    );
    assert.equal(resolveUrl.pathname, "/gateway/api/public/embed/emb_x%2Fy");
    assert.equal(resolveUrl.searchParams.get("parent_origin"), "https://shop.example");
  });

  it("does not add a custom origin header that would force a CORS preflight", async () => {
    let requestInit;
    await resolveEmbed({
      apiBase: "https://monti.example.com",
      embedKey: "emb_ok",
      parentOrigin: "https://shop.example",
      fetch: async (_url, init) => {
        requestInit = init;
        return jsonResponse({ tenant_id: "tenant-1", enabled: true });
      },
    });
    assert.deepEqual(requestInit.headers, { Accept: "application/json" });
  });
});

describe("MontiEmbed", () => {
  it("mounts, queues open state, emits lifecycle events, and destroys its DOM", async () => {
    const dom = installDom();
    const events = [];
    const embed = new MontiEmbed({
      embedKey: "emb_test",
      apiBase: "https://monti.devclub.dev/",
      fetch: async () => jsonResponse({ tenant_id: "demo", name: "Demo", enabled: true }),
      onReady: () => events.push("ready"),
      onOpen: () => events.push("open"),
      onClose: () => events.push("close"),
      onDestroy: () => events.push("destroy"),
    });

    embed.open();
    await embed.mount();
    assert.equal(embed.isOpen, true);
    assert.deepEqual(events, ["ready", "open"]);
    assert.equal(dom.body.children.length, 1);

    embed.close();
    embed.close();
    assert.equal(embed.isOpen, false);
    assert.deepEqual(events, ["ready", "open", "close"]);

    embed.destroy();
    embed.destroy();
    assert.equal(embed.isDestroyed, true);
    assert.equal(dom.body.children.length, 0);
    assert.deepEqual(events, ["ready", "open", "close", "destroy"]);
    dom.restore();
  });

  it("surfaces public resolve errors and does not mount an iframe", async () => {
    const dom = installDom();
    let receivedError;
    const embed = new MontiEmbed({
      embedKey: "emb_bad",
      apiBase: "https://monti.devclub.dev/",
      fetch: async () => jsonResponse({ code: "origin_not_allowed", error: "Origin denied" }, 403),
      onError: (error) => {
        receivedError = error;
      },
    });

    await embed.mount();
    assert.equal(receivedError.code, "origin_not_allowed");
    assert.equal(receivedError.status, 403);
    assert.equal(dom.body.children.length, 1);
    assert.equal(dom.body.children[0].dataset.montiEmbed, "error");
    embed.destroy();
    dom.restore();
  });

  it("does not leak DOM when destroyed during an async resolve", async () => {
    const dom = installDom();
    let finishResolve;
    const response = new Promise((resolve) => {
      finishResolve = resolve;
    });
    const embed = new MontiEmbed({
      embedKey: "emb_slow",
      apiBase: "https://monti.devclub.dev/",
      fetch: async () => response,
    });

    const mounting = embed.mount();
    embed.destroy();
    finishResolve(jsonResponse({ tenant_id: "demo", enabled: true }));
    await mounting;
    assert.equal(dom.body.children.length, 0);
    dom.restore();
  });

  it("mounts immediately when resolve is skipped", async () => {
    const dom = installDom();
    let fetchCalls = 0;
    const embed = new MontiEmbed({
      embedKey: "emb_fast",
      apiBase: "https://monti.devclub.dev/",
      skipResolve: true,
      fetch: async () => {
        fetchCalls += 1;
        return jsonResponse({});
      },
    });
    await embed.mount();
    assert.equal(fetchCalls, 0);
    assert.equal(dom.body.children.length, 1);
    embed.destroy();
    dom.restore();
  });
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installDom() {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  function element(tagName) {
    const listeners = new Map();
    const node = {
      tagName: tagName.toUpperCase(),
      children: [],
      dataset: {},
      style: { cssText: "", display: "" },
      parentNode: null,
      innerHTML: "",
      textContent: "",
      title: "",
      allow: "",
      src: "",
      type: "",
      setAttribute() {},
      appendChild(child) {
        child.parentNode = node;
        node.children.push(child);
        return child;
      },
      addEventListener(name, handler) {
        listeners.set(name, handler);
      },
      removeEventListener(name) {
        listeners.delete(name);
      },
      click() {
        listeners.get("click")?.();
      },
      remove() {
        if (!node.parentNode) return;
        const index = node.parentNode.children.indexOf(node);
        if (index >= 0) node.parentNode.children.splice(index, 1);
        node.parentNode = null;
      },
    };
    return node;
  }

  const body = element("body");
  globalThis.document = {
    body,
    createElement: (tagName) => element(tagName),
  };
  globalThis.window = {
    location: { origin: "https://shop.example", href: "https://shop.example/" },
  };

  return {
    body,
    restore() {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}
