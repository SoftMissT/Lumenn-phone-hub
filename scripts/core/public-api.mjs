import { ERROR_CODES, MODULE_ID } from "./constants.mjs";
import { Logger } from "./logger.mjs";
import { fail } from "./errors.mjs";
import { PhoneShell } from "../phone/phone-shell.mjs";
import { LumennRepository } from "../persistence/repository.mjs";
import { AppRegistry } from "../apps/app-registry.mjs";

export function exposePublicApi() {
  const api = {
    openPhone(options = {}) {
      const shell = PhoneShell.instance;
      const actorUuid = typeof options === "string" ? options : options?.actorUuid;
      if (actorUuid) shell.actorUuid = actorUuid;
      shell.open();
      return shell;
    },

    closePhone() {
      return PhoneShell.instance.close();
    },

    openPhoneAsGM(actorUuid) {
      if (globalThis.game?.user?.isGM !== true) {
        fail(ERROR_CODES.NO_AUTHORITY, "Apenas o GM pode abrir o celular de outro personagem.");
      }
      const shell = PhoneShell.instance;
      const actorId = String(actorUuid ?? "").split(".")[1];
      const actor = actorId ? globalThis.game?.actors?.get?.(actorId) : null;
      shell.actorUuid = actorUuid ?? null;
      shell.gmMode = true;
      shell.gmCharacterName = actor?.name ?? "";
      shell.open();
      return shell;
    },

    notifications: {
      send(data) {
        return LumennRepository.createNotification(data);
      },

      list(actorUuid) {
        return LumennRepository.listNotifications(actorUuid);
      }
    },

    apps: {
      register(definition) {
        return AppRegistry.register(definition);
      },

      get(id) {
        return AppRegistry.get(id);
      },

      list(filter) {
        return AppRegistry.list(filter);
      }
    }
  };

  const module = game.modules.get(MODULE_ID);
  if (!module) {
    Logger.warn("Módulo não encontrado ao expor API pública.");
    return null;
  }
  module.api = api;
  Logger.info("API pública exposta.");
  return api;
}
