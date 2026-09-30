import { HOOKS, MODULE_ID } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { getUnreadNotifications, setUnreadNotifications } from "../core/runtime-state.mjs";
import { isAddressedTo } from "./notification-model.mjs";
import { showBanner } from "./notification-banner.mjs";
import { playNotificationSound, preloadNotificationAudio } from "./notification-audio.mjs";

let initialized = false;
let lastBadge = -1;

export function openPhoneFromNotification() {
  globalThis.game?.modules?.get(MODULE_ID)?.api?.openPhone?.();
}

export function refreshControlsBadge() {
  try {
    globalThis.ui?.controls?.render?.();
  } catch (error) {
    Logger.debug("Não foi possível atualizar o contador nos controles:", error);
  }
}

export function syncUnreadBadge(count) {
  const next = setUnreadNotifications(count);
  if (next !== lastBadge) {
    lastBadge = next;
    refreshControlsBadge();
  }
  return next;
}

function ensureLiveRegion() {
  const doc = globalThis.document;
  if (!doc?.body) return null;
  let element = doc.getElementById("lph-live-region");
  if (!element) {
    element = doc.createElement("div");
    element.id = "lph-live-region";
    element.className = "lph-sr-only";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    doc.body.appendChild(element);
  }
  return element;
}

export function announceNotification(text) {
  const element = ensureLiveRegion();
  if (element) element.textContent = String(text ?? "");
}

function handleReceived(notification) {
  const actorUuid = globalThis.game?.user?.character?.uuid ?? null;
  if (!isAddressedTo(notification, actorUuid)) return;
  syncUnreadBadge(getUnreadNotifications() + 1);
  showBanner(notification, { onOpen: openPhoneFromNotification });
  playNotificationSound();
  announceNotification(`${notification?.sender ? `${notification.sender}: ` : ""}${notification?.title ?? ""}`);
}

export function initNotifications() {
  if (initialized) return true;
  globalThis.Hooks?.on?.(HOOKS.NOTIFICATION_RECEIVED, handleReceived);
  ensureLiveRegion();
  preloadNotificationAudio();
  initialized = true;
  Logger.info("Serviço de notificações inicializado.");
  return true;
}
