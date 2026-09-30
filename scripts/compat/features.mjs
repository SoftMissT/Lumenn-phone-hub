let cache = null;

export function features() {
  if (cache) return cache;
  const f = globalThis.foundry ?? {};
  const appsApi = f.applications?.api ?? {};

  const modernRenderTemplate =
    typeof f.applications?.handlebars?.renderTemplate === "function";
  const modernLoadTemplates =
    typeof f.applications?.handlebars?.loadTemplates === "function";

  cache = Object.freeze({
    applicationV2: typeof appsApi.ApplicationV2 === "function",
    handlebarsMixin: typeof appsApi.HandlebarsApplicationMixin === "function",
    sceneControlsHook: typeof globalThis.Hooks?.on === "function",
    handlebarsRenderTemplate: modernRenderTemplate,
    handlebarsLoadTemplates: modernLoadTemplates,
    // Só toca os globais legados quando o caminho moderno não existe. No
    // Foundry 13+ lê-los dispara o getter deprecado do core (aviso por render,
    // remoção na v15); com o caminho moderno presente não precisamos deles.
    legacyRenderTemplate: modernRenderTemplate
      ? false
      : typeof globalThis.renderTemplate === "function",
    legacyLoadTemplates: modernLoadTemplates
      ? false
      : typeof globalThis.loadTemplates === "function",
    audioHelper:
      typeof (f.audio?.AudioHelper ?? globalThis.AudioHelper)?.play ===
      "function",
    filePicker: Boolean(
      f.applications?.apps?.FilePicker ?? globalThis.FilePicker,
    ),
    subtleCrypto: Boolean(globalThis.crypto?.subtle),
    intlSegmenter: typeof globalThis.Intl?.Segmenter === "function",
    socket: Boolean(globalThis.game?.socket),
  });
  return cache;
}

export function resetFeatureCache() {
  cache = null;
}
