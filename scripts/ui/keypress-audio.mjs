import { KEYBOARD_SOUND_PATH } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { isFeatureEnabled, resolveSoundEnabled } from "../core/preferences.mjs";
import { preloadSound, playSound } from "../compat/foundry-compat.mjs";

const MIN_INTERVAL_MS = 40;
let lastPlayedAt = 0;
let current = null;

export function isPhoneSoundEnabled() {
  try {
    return resolveSoundEnabled() && isFeatureEnabled("keypressSound");
  } catch {
    return true;
  }
}

export function preloadKeypressAudio() {
  return preloadSound(KEYBOARD_SOUND_PATH);
}

function stopCurrent() {
  if (!current || typeof current.pause !== "function") return;
  try {
    current.pause();
    current.currentTime = 0;
  } catch {
    /* instância já descartada pelo navegador */
  }
  current = null;
}

export function playKeypressSound() {
  if (!isPhoneSoundEnabled()) return Promise.resolve(false);

  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return Promise.resolve(false);
  lastPlayedAt = now;

  // ponytail: para a instância anterior antes de tocar a nova. Sem isso, um
  // asset longo empilha uma instância por tecla — o keyboard.mp3 tem 22,7s e
  // virava som contínuo. A correção de verdade é trocar o asset por um clique
  // de ~80ms; isto aqui impede o empilhamento com qualquer asset.
  stopCurrent();

  return playSound(KEYBOARD_SOUND_PATH, { volume: 0.25, onlyOnce: false })
    .then((audio) => {
      current = audio ?? null;
      return Boolean(audio);
    })
    .catch((error) => {
      Logger.debug("Som de digitação indisponível:", error);
      return false;
    });
}
