import { Logger } from "../core/logger.mjs";
import { escapeHTML } from "../compat/foundry-compat.mjs";
import { truncateGraphemes } from "../validation/text.mjs";

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

export function showBanner(notification, options = {}) {
  const notifications = globalThis.ui?.notifications;
  if (!notifications || typeof notifications.info !== "function") return null;

  const sender = notification?.sender
    ? `<strong>${escapeHTML(truncateGraphemes(notification.sender, 32))}</strong>: `
    : "";
  const title = escapeHTML(truncateGraphemes(notification?.title ?? "", 60));

  // Botão explícito: o toast inteiro já era clicável, mas nada dizia isso e o
  // Foundry o dispensa sozinho — na prática não havia como abrir o celular.
  const openLabel = escapeHTML(localize("LPH.Notifications.Open", "Abrir"));
  const message =
    `<span class="lph-banner-text">${sender}${title}</span>` +
    `<button type="button" class="lph-banner-open">${openLabel}</button>`;

  let element = null;
  try {
    element = notifications.info(message, { console: false });
  } catch (error) {
    Logger.debug("Banner de notificação indisponível:", error);
    return null;
  }

  if (!element || typeof options.onOpen !== "function") return element ?? null;

  const open = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      options.onOpen();
      element.remove?.();
    } catch (error) {
      Logger.debug("Falha ao abrir o celular pelo banner:", error);
    }
  };

  try {
    element.classList?.add("lph-banner");
    element.style.cursor = "pointer";
    element.querySelector(".lph-banner-open")?.addEventListener("click", open);
    element.addEventListener("click", open);
  } catch (error) {
    Logger.debug("Não foi possível tornar o banner clicável:", error);
  }

  return element ?? null;
}
