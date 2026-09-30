import { MODULE_ID, SETTINGS_KEYS } from "./constants.mjs";

export const FEATURE_FLAGS = Object.freeze({
  keypressSound: SETTINGS_KEYS.FLAG_KEYPRESS_SOUND,
  notificationBanner: SETTINGS_KEYS.FLAG_NOTIFICATION_BANNER,
  playerWallpaperUpload: SETTINGS_KEYS.FLAG_PLAYER_WALLPAPER_UPLOAD,
});

function read(key, fallback) {
  try {
    const value = globalThis.game?.settings?.get(MODULE_ID, key);
    return value === undefined || value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function resolveTheme() {
  const client = read(SETTINGS_KEYS.THEME, "");
  if (client === "light" || client === "dark") return client;
  const world = read(SETTINGS_KEYS.DEFAULT_THEME, "");
  return world === "light" || world === "dark" ? world : "dark";
}

export function resolveSoundEnabled() {
  const client = read(SETTINGS_KEYS.NOTIFICATION_SOUND, "");
  if (client === "on" || client === true) return true;
  if (client === "off" || client === false) return false;
  return read(SETTINGS_KEYS.DEFAULT_NOTIFICATION_SOUND, true) !== false;
}

export function resolveReducedEffects() {
  return read(SETTINGS_KEYS.REDUCED_EFFECTS, false) === true;
}

export function isFeatureEnabled(name) {
  const key = FEATURE_FLAGS[name];
  return key ? read(key, true) !== false : true;
}

// ponytail: sem UI para habilitar/desabilitar apps ainda — so "settings" e
// visivel ao jogador hoje, e desligar Ajustes nao faz sentido. O filtro ja
// funciona e a API publica alcanca; tela propria quando houver 3+ apps.
export function isAppEnabled(id) {
  const enabled = read(SETTINGS_KEYS.ENABLED_APPS, {});
  if (!enabled || typeof enabled !== "object") return true;
  return enabled[id] !== false;
}

export function getLimit(key, fallback) {
  return read(key, fallback);
}
