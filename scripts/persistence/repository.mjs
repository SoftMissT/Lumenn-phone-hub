import { ERROR_CODES, HOOKS } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { deepClone, isGM, mergeObject } from "../compat/foundry-compat.mjs";
import {
  NOTIFICATION_STATUS,
  normalizeNotification,
} from "../notifications/notification-model.mjs";
import {
  listForActor,
  pruneExpired,
  pruneToLimit,
  unreadCount as countUnread,
  withStatus,
} from "../notifications/notification-store.mjs";
import { JournalStore } from "./journal-store.mjs";
import { createDefaultPhoneState } from "./schemas.mjs";

function requireGM(action) {
  if (!isGM())
    fail(ERROR_CODES.NO_AUTHORITY, `Ação "${action}" requer autoridade do GM.`);
}

function emitNotification(notification) {
  globalThis.Hooks?.callAll?.(HOOKS.NOTIFICATION_CREATED, notification);
}

async function readPhoneContext(actorUuid) {
  const store = await JournalStore.readStore();
  const phone = store.phones?.[actorUuid] ?? createDefaultPhoneState();
  return { store, phone, state: phone.notificationState ?? {} };
}

export class LumennRepository {
  static async init() {
    if (!isGM()) return false;
    await JournalStore.getEntry();
    return true;
  }

  static async getPhone(actorUuid) {
    if (!actorUuid) return createDefaultPhoneState();
    const store = await JournalStore.readStore();
    const existing = store.phones[actorUuid];
    return existing ? deepClone(existing) : createDefaultPhoneState();
  }

  static async updatePhone(actorUuid, patch) {
    if (!actorUuid)
      fail(ERROR_CODES.INVALID_ARGUMENT, "actorUuid é obrigatório.");
    requireGM("updatePhone");
    const store = await JournalStore.readStore();
    const current = store.phones[actorUuid] ?? createDefaultPhoneState();
    const updated = mergeObject(current, patch, { inplace: false });
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (value === null) delete updated[key];
    }
    store.phones[actorUuid] = updated;
    await JournalStore.writeStore(store);
    return deepClone(updated);
  }

  static async listNotifications(actorUuid) {
    if (!actorUuid) return [];
    const { store, state } = await readPhoneContext(actorUuid);
    return listForActor(store.notifications, actorUuid, state);
  }

  static async unreadCount(actorUuid) {
    if (!actorUuid) return 0;
    const { store, state } = await readPhoneContext(actorUuid);
    return countUnread(store.notifications, actorUuid, state);
  }

  // Uma leitura e uma escrita para o lote inteiro: N participantes não custam
  // N ciclos de read-modify-write no JournalEntry.
  static async createNotifications(inputs = []) {
    requireGM("createNotifications");
    const now = Date.now();
    const notifications = (inputs ?? []).map((input) =>
      normalizeNotification(input, { now }),
    );
    if (!notifications.length) return [];
    const store = await JournalStore.readStore();
    const merged = { ...(store.notifications ?? {}) };
    for (const notification of notifications) {
      merged[notification.id] = notification;
    }
    store.notifications = pruneToLimit(pruneExpired(merged));
    await JournalStore.writeStore(store);
    for (const notification of notifications) emitNotification(notification);
    return notifications.map((notification) => deepClone(notification));
  }

  static async createNotification(data = {}) {
    const [notification] = await this.createNotifications([data]);
    return notification;
  }

  // Conversa: escreve a cópia do destinatário e a do remetente no MESMO write.
  // Quem PODE pedir isso, e com que nome, é decidido na autorização do socket
  // (`authorizeRequest`), não aqui.
  static async createMessage({
    fromActorUuid,
    toActorUuid,
    thread = null,
    sender = "",
    title = "",
    body = "",
  } = {}) {
    if (!fromActorUuid)
      fail(ERROR_CODES.INVALID_ARGUMENT, "fromActorUuid é obrigatório.");
    const targets =
      toActorUuid && toActorUuid !== fromActorUuid
        ? [toActorUuid, fromActorUuid]
        : [fromActorUuid];
    return this.createNotifications(
      targets.map((target) => ({
        app: "messages",
        thread,
        targetActorUuid: target,
        sender,
        title,
        body,
      })),
    );
  }

  static async markNotificationRead(actorUuid, ids) {
    if (!actorUuid)
      fail(ERROR_CODES.INVALID_ARGUMENT, "actorUuid é obrigatório.");
    requireGM("markNotificationRead");
    const { store, phone } = await readPhoneContext(actorUuid);
    phone.notificationState = withStatus(
      phone.notificationState,
      ids,
      NOTIFICATION_STATUS.READ,
    );
    store.phones[actorUuid] = phone;
    await JournalStore.writeStore(store);
    return true;
  }

  static async dismissNotification(actorUuid, ids) {
    if (!actorUuid)
      fail(ERROR_CODES.INVALID_ARGUMENT, "actorUuid é obrigatório.");
    requireGM("dismissNotification");
    const { store, phone } = await readPhoneContext(actorUuid);
    phone.notificationState = withStatus(
      phone.notificationState,
      ids,
      NOTIFICATION_STATUS.DISMISSED,
    );
    store.phones[actorUuid] = phone;
    await JournalStore.writeStore(store);
    return true;
  }
}
