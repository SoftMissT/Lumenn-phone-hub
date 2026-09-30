import { MODULE_ID, NOTIFICATION_SOUND_PATH, SETTINGS_KEYS } from "../core/constants.mjs";
import { preloadSound, playSound } from "../compat/foundry-compat.mjs";

export function isNotificationSoundEnabled() {
  try {
    return game.settings.get(MODULE_ID, SETTINGS_KEYS.NOTIFICATION_SOUND) !== false;
  } catch {
    return true;
  }
}

export function preloadNotificationAudio() {
  return preloadSound(NOTIFICATION_SOUND_PATH);
}

export function playNotificationSound() {
  if (!isNotificationSoundEnabled()) return Promise.resolve(false);
  return playSound(NOTIFICATION_SOUND_PATH, { volume: 0.35 });
}
