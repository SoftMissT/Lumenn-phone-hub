import { STORE_SCHEMA_VERSION } from "../core/constants.mjs";

export const SCHEMA_VERSION = STORE_SCHEMA_VERSION;

export function createDefaultStore() {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    phones: {},
    notifications: {},
  };
}

export function createDefaultPhoneState() {
  return {
    wallpaper: null,
    pinVerifier: null,
    notificationState: {},
    settings: {
      theme: "dark",
      notificationsEnabled: true,
      haptics: true,
      sound: true,
    },
  };
}

export function isValidStore(store) {
  if (!store || typeof store !== "object") return false;
  if (typeof store.schemaVersion !== "number") return false;
  if (typeof store.revision !== "number") return false;
  if (typeof store.phones !== "object" || store.phones === null) return false;
  if (typeof store.notifications !== "object" || store.notifications === null)
    return false;
  return true;
}

export function normalizeStore(store) {
  if (!isValidStore(store)) return createDefaultStore();
  return {
    ...store,
    phones: { ...store.phones },
    notifications: { ...store.notifications },
  };
}
