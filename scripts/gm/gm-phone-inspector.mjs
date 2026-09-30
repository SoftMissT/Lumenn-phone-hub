import { ERROR_CODES } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { isGM } from "../compat/foundry-compat.mjs";
import { PhoneController } from "../phone/phone-controller.mjs";

export async function gmResetPin(actorUuid) {
  if (!isGM()) fail(ERROR_CODES.NO_AUTHORITY, "Apenas o GM pode redefinir o PIN.");
  return PhoneController.resetPin(actorUuid);
}

export async function gmResetWallpaper(actorUuid) {
  if (!isGM()) fail(ERROR_CODES.NO_AUTHORITY, "Apenas o GM pode redefinir o wallpaper.");
  return PhoneController.patchPhone(actorUuid, { wallpaper: null });
}

export function gmListCharacters() {
  return (globalThis.game?.actors?.contents ?? [])
    .filter((actor) => typeof actor?.uuid === "string")
    .map((actor) => ({ uuid: actor.uuid, name: actor.name ?? actor.uuid }));
}
