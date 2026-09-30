let cache = null;

export function features() {
  if (cache) return cache;
  const f = globalThis.foundry ?? {};
  const appsApi = f.applications?.api ?? {};

  cache = Object.freeze({
    applicationV2: typeof appsApi.ApplicationV2 === "function",
    handlebarsMixin: typeof appsApi.HandlebarsApplicationMixin === "function",
    sceneControlsHook: typeof globalThis.Hooks?.on === "function",
    handlebarsRenderTemplate: typeof f.applications?.handlebars?.renderTemplate === "function",
    handlebarsLoadTemplates: typeof f.applications?.handlebars?.loadTemplates === "function",
    legacyRenderTemplate: typeof globalThis.renderTemplate === "function",
    legacyLoadTemplates: typeof globalThis.loadTemplates === "function",
    audioHelper: typeof (f.audio?.AudioHelper ?? globalThis.AudioHelper)?.play === "function",
    filePicker: Boolean(f.applications?.apps?.FilePicker ?? globalThis.FilePicker),
    subtleCrypto: Boolean(globalThis.crypto?.subtle),
    intlSegmenter: typeof globalThis.Intl?.Segmenter === "function",
    socket: Boolean(globalThis.game?.socket)
  });
  return cache;
}

export function resetFeatureCache() {
  cache = null;
}
