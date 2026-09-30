import { KEYBOARD_SOUND_PATH } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { isFeatureEnabled, resolveSoundEnabled } from "../core/preferences.mjs";
import { preloadSound, playSound } from "../compat/foundry-compat.mjs";

const MIN_INTERVAL_MS = 40;
let lastPlayedAt = 0;

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

export function playKeypressSound() {
  if (!isPhoneSoundEnabled()) return Promise.resolve(false);

  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return Promise.resolve(false);
  lastPlayedAt = now;

  return playSound(KEYBOARD_SOUND_PATH, {
    volume: 0.25,
    onlyOnce: false,
  }).catch((error) => {
    Logger.debug("Som de digitação indisponível:", error);
    return false;
  });
}
