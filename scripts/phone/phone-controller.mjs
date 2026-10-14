import { ERROR_CODES } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { isGM } from "../compat/foundry-compat.mjs";
import { socketRequest } from "../socket/socket-runtime.mjs";
import { LumennRepository } from "../persistence/repository.mjs";

export const PhoneController = {
  async patchPhone(actorUuid, patch) {
    if (!actorUuid)
      fail(ERROR_CODES.NO_CHARACTER, "Nenhum personagem atribuído a você.");
    if (isGM()) return LumennRepository.updatePhone(actorUuid, patch);
    return socketRequest("lph-update-phone", { actorUuid, patch });
  },

  async resetPin(actorUuid) {
    return this.patchPhone(actorUuid, { pinVerifier: null });
  },

  async resetWallpaper(actorUuid) {
    return this.patchPhone(actorUuid, { wallpaper: null });
  },

  async markNotificationsRead(actorUuid, ids) {
    if (!actorUuid)
      fail(ERROR_CODES.NO_CHARACTER, "Nenhum personagem atribuído a você.");
    if (isGM()) return LumennRepository.markNotificationRead(actorUuid, ids);
    return socketRequest("lph-mark-read", { actorUuid, ids });
  },

  async dismissNotifications(actorUuid, ids) {
    if (!actorUuid)
      fail(ERROR_CODES.NO_CHARACTER, "Nenhum personagem atribuído a você.");
    if (isGM()) return LumennRepository.dismissNotification(actorUuid, ids);
    return socketRequest("lph-dismiss", { actorUuid, ids });
  },

  async createNotification(data) {
    if (isGM()) return LumennRepository.createNotification(data);
    return socketRequest("lph-create-notification", data);
  },

  // Mensagem de chat: o pedido do jogador carrega só o essencial; o GM valida
  // (o remetente tem de ser o personagem de quem pediu) e escreve as duas
  // cópias de uma vez.
  async sendMessage(data) {
    if (isGM()) return LumennRepository.createMessage(data);
    return socketRequest("lph-send-message", data);
  },
};
