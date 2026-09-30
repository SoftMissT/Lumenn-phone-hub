import { NOTIFICATION_STORE_LIMIT, SETTINGS_KEYS } from "../core/constants.mjs";
import { getLimit } from "../core/preferences.mjs";
import { isExpired, NOTIFICATION_STATUS } from "./notification-model.mjs";

function storeLimit() {
  return getLimit(SETTINGS_KEYS.LIMIT_STORE, NOTIFICATION_STORE_LIMIT);
}

export function listForActor(
  notifications,
  actorUuid,
  state = {},
  options = {},
) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  return Object.values(notifications ?? {})
    .filter(
      (notification) =>
        notification.targetActorUuid === actorUuid ||
        notification.targetActorUuid === "all",
    )
    .map((notification) => {
      const perActor = state?.[notification.id];
      const fallback = isExpired(notification, now)
        ? NOTIFICATION_STATUS.EXPIRED
        : NOTIFICATION_STATUS.UNREAD;
      return { ...notification, status: perActor ?? fallback };
    })
    .filter(
      (notification) =>
        notification.status !== NOTIFICATION_STATUS.DISMISSED &&
        notification.status !== NOTIFICATION_STATUS.EXPIRED,
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, storeLimit());
}

export function unreadCount(
  notifications,
  actorUuid,
  state = {},
  options = {},
) {
  return listForActor(notifications, actorUuid, state, options).filter(
    (notification) => notification.status === NOTIFICATION_STATUS.UNREAD,
  ).length;
}

export function withStatus(state, ids, status) {
  const next = { ...(state ?? {}) };
  for (const id of [].concat(ids ?? [])) {
    if (typeof id === "string" && id) next[id] = status;
  }
  return next;
}

export function pruneExpired(notifications, now = Date.now()) {
  const result = {};
  for (const [id, notification] of Object.entries(notifications ?? {})) {
    if (!isExpired(notification, now)) result[id] = notification;
  }
  return result;
}

export function pruneToLimit(notifications, limit = storeLimit()) {
  const entries = Object.entries(notifications ?? {})
    .sort((a, b) => (b[1]?.createdAt ?? 0) - (a[1]?.createdAt ?? 0))
    .slice(0, limit);
  return Object.fromEntries(entries);
}
