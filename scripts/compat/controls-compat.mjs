import { CONTROL_GROUP_ID, CONTROL_TOOL_ID, MODULE_ID } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { getUnreadNotifications } from "../core/runtime-state.mjs";

let hookRegistered = false;

function localize(key, fallback) {
  const i18n = globalThis.game?.i18n;
  const value = i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

function toolTitle() {
  const base = localize("LPH.Controls.Open", "Open the phone");
  const unread = getUnreadNotifications();
  return unread > 0 ? `${base} (${unread})` : base;
}

export function registerControlsEntry(controls) {
  if (!controls || typeof controls !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(controls, CONTROL_GROUP_ID)) {
    Logger.warn(`Colisão de control "${CONTROL_GROUP_ID}"; instalação abortada em favor de API/macro.`);
    return false;
  }

  controls[CONTROL_GROUP_ID] = {
    name: CONTROL_GROUP_ID,
    order: 90,
    title: localize("LPH.Controls.Title", "Phone (Lumenn)"),
    icon: "fas fa-mobile-alt",
    visible: true,
    tools: {
      [CONTROL_TOOL_ID]: {
        name: CONTROL_TOOL_ID,
        order: 0,
        title: toolTitle(),
        icon: "fas fa-mobile-alt",
        button: true,
        onChange: () => {
          const api = globalThis.game?.modules?.get(MODULE_ID)?.api;
          if (typeof api?.openPhone === "function") api.openPhone();
        }
      }
    }
  };

  Logger.debug("Botão da barra de controles registrado.");
  return true;
}

export function installControlsEntry() {
  if (hookRegistered) return true;
  if (typeof globalThis.Hooks?.on !== "function") {
    Logger.warn("Hooks indisponível; usando somente API/macro como entrada.");
    return false;
  }
  globalThis.Hooks.on("getSceneControlButtons", registerControlsEntry);
  hookRegistered = true;
  Logger.info("Entrada nativa da barra de controles instalada.");
  return true;
}

export function verifyControlsEntry() {
  return hookRegistered;
}

export function isControlsInstalled() {
  return hookRegistered;
}
