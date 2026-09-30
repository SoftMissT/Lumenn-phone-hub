import { Logger } from "../core/logger.mjs";
import { escapeHTML } from "../compat/foundry-compat.mjs";
import { truncateGraphemes } from "../validation/text.mjs";

export function showBanner(notification, options = {}) {
  const notifications = globalThis.ui?.notifications;
  if (!notifications || typeof notifications.info !== "function") return null;

  const sender = notification?.sender
    ? `<strong>${escapeHTML(truncateGraphemes(notification.sender, 32))}</strong>: `
    : "";
  const title = escapeHTML(truncateGraphemes(notification?.title ?? "", 60));
  const message = `${sender}${title}`;

  let element = null;
  try {
    element = notifications.info(message, { console: false });
  } catch (error) {
    Logger.debug("Banner de notificação indisponível:", error);
    return null;
  }

  if (element && typeof options.onOpen === "function") {
    try {
      element.style.cursor = "pointer";
      element.addEventListener("click", () => options.onOpen());
    } catch (error) {
      Logger.debug("Não foi possível tornar o banner clicável:", error);
    }
  }

  return element ?? null;
}
