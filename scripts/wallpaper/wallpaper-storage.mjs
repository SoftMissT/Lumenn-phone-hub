import {
  BUNDLED_WALLPAPER_PATH,
  ERROR_CODES,
  MODULE_ID,
  SETTINGS_KEYS,
} from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { Logger } from "../core/logger.mjs";
import { isGM } from "../compat/foundry-compat.mjs";
import { PhoneController } from "../phone/phone-controller.mjs";
import { validateSourceUrl } from "./wallpaper-validator.mjs";

export function getWorldDefaultWallpaper() {
  try {
    const value = game.settings.get(MODULE_ID, SETTINGS_KEYS.DEFAULT_WALLPAPER);
    if (typeof value !== "string" || value.trim().length === 0) return null;
    return validateSourceUrl(value).valid ? value.trim() : null;
  } catch (error) {
    Logger.debug("Wallpaper padrão indisponível:", error);
    return null;
  }
}

export async function setWorldDefaultWallpaper(value) {
  if (!isGM())
    fail(ERROR_CODES.NO_AUTHORITY, "Somente o GM define o wallpaper padrão.");
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized) {
    const validation = validateSourceUrl(normalized);
    if (!validation.valid)
      fail(ERROR_CODES.INVALID_WALLPAPER, validation.reason);
  }
  await game.settings.set(
    MODULE_ID,
    SETTINGS_KEYS.DEFAULT_WALLPAPER,
    normalized,
  );
  return normalized;
}

export async function savePhoneWallpaper(actorUuid, wallpaper) {
  return PhoneController.patchPhone(actorUuid, { wallpaper });
}

export function resolveWallpaperUrl(phoneState, worldDefault = null) {
  // O wallpaper do personagem vence, depois o padrão do mundo e, por último, o
  // que vem no próprio módulo — sem isso um mundo novo abria o celular sem
  // imagem nenhuma até o GM escolher uma.
  return (
    phoneState?.wallpaper?.url ??
    phoneState?.wallpaperUrl ??
    worldDefault ??
    BUNDLED_WALLPAPER_PATH
  );
}
