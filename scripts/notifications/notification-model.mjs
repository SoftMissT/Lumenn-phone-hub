import {
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_DEFAULT_TTL_MS,
  NOTIFICATION_MAX_LINES,
  NOTIFICATION_TITLE_MAX,
  SETTINGS_KEYS,
} from "../core/constants.mjs";
import { getLimit } from "../core/preferences.mjs";
import { randomId } from "../validation/ids.mjs";
import {
  countGraphemes,
  prepareNotificationText,
} from "../validation/text.mjs";

const DEFAULT_TTL_DAYS = Math.round(NOTIFICATION_DEFAULT_TTL_MS / 86400000);

function ttlMs() {
  return getLimit(SETTINGS_KEYS.LIMIT_TTL_DAYS, DEFAULT_TTL_DAYS) * 86400000;
}

export const NOTIFICATION_STATUS = Object.freeze({
  UNREAD: "unread",
  READ: "read",
  DISMISSED: "dismissed",
  EXPIRED: "expired",
});

const STATUS_VALUES = Object.freeze(Object.values(NOTIFICATION_STATUS));

export function normalizeNotification(input = {}, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  return {
    id: typeof options.id === "string" && options.id ? options.id : randomId(),
    targetActorUuid:
      typeof input.targetActorUuid === "string" && input.targetActorUuid
        ? input.targetActorUuid
        : "all",
    sender: prepareNotificationText(
      input.sender ?? "",
      NOTIFICATION_TITLE_MAX,
      1,
    ),
    title: prepareNotificationText(
      input.title ?? "",
      NOTIFICATION_TITLE_MAX,
      1,
    ),
    body: prepareNotificationText(
      input.body ?? "",
      NOTIFICATION_BODY_MAX,
      NOTIFICATION_MAX_LINES,
    ),
    icon: typeof input.icon === "string" && input.icon ? input.icon : null,
    app: typeof input.app === "string" && input.app ? input.app : "system",
    createdAt: now,
    status: STATUS_VALUES.includes(input.status)
      ? input.status
      : NOTIFICATION_STATUS.UNREAD,
    expiresAt: Number.isFinite(input.expiresAt)
      ? input.expiresAt
      : now + ttlMs(),
  };
}

export function validateLimits(input = {}) {
  return {
    titleOverflow: countGraphemes(input.title ?? "") > NOTIFICATION_TITLE_MAX,
    bodyOverflow: countGraphemes(input.body ?? "") > NOTIFICATION_BODY_MAX,
  };
}

export function isExpired(notification, now = Date.now()) {
  return (
    Number.isFinite(notification?.expiresAt) && notification.expiresAt <= now
  );
}

export function isAddressedTo(notification, actorUuid) {
  if (notification?.targetActorUuid === "all") return true;
  return Boolean(actorUuid) && notification?.targetActorUuid === actorUuid;
}
