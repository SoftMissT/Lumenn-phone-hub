import { ERROR_CODES } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { isGM } from "../compat/foundry-compat.mjs";
import { LumennRepository } from "../persistence/repository.mjs";

export async function sendNotificationAsGM(data) {
  if (!isGM()) fail(ERROR_CODES.NO_AUTHORITY, "Apenas o GM pode enviar notificações.");
  return LumennRepository.createNotification(data);
}

export function listGmAddressableCharacters() {
  return (globalThis.game?.actors?.contents ?? [])
    .filter((actor) => typeof actor?.uuid === "string")
    .map((actor) => ({ uuid: actor.uuid, name: actor.name ?? actor.uuid }));
}
