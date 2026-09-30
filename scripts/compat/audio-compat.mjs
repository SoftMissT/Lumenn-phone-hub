import { Logger } from "../core/logger.mjs";

function audioHelper() {
  return (
    globalThis.foundry?.audio?.AudioHelper ?? globalThis.AudioHelper ?? null
  );
}

export async function preloadSound(src) {
  const helper = audioHelper();
  if (typeof helper?.preloadSound !== "function" || !src) return false;
  try {
    await helper.preloadSound(src);
    return true;
  } catch (error) {
    Logger.warn("Falha ao pré-carregar som:", error);
    return false;
  }
}

export function playSound(src, options = {}) {
  const helper = audioHelper();
  if (typeof helper?.play !== "function" || !src) return Promise.resolve(false);
  try {
    const result = helper.play(
      { src, volume: 0.35, autoplay: true, loop: false, ...options },
      options.onlyOnce ?? true,
    );
    return Promise.resolve(result)
      .then(() => true)
      .catch((error) => {
        Logger.warn("Playback de som bloqueado ou indisponível:", error);
        return false;
      });
  } catch (error) {
    Logger.warn("Playback de som bloqueado ou indisponível:", error);
    return Promise.resolve(false);
  }
}
