import { NOTIFICATION_SOUND_PATH } from "../core/constants.mjs";
import { resolveSoundEnabled } from "../core/preferences.mjs";
import { preloadSound, playSound } from "../compat/foundry-compat.mjs";

export function isNotificationSoundEnabled() {
  try {
    return resolveSoundEnabled();
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
