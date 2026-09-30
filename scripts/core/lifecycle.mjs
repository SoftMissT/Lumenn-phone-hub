import { HOOKS, MODULE_ID, SETTINGS_KEYS, TEMPLATE_PARTIALS } from "./constants.mjs";
import { Logger } from "./logger.mjs";
import { registerSettings } from "./settings.mjs";
import { exposePublicApi } from "./public-api.mjs";
import { preloadTemplates } from "../compat/application-compat.mjs";
import { installControlsEntry, verifyControlsEntry } from "../compat/controls-compat.mjs";
import { registerBuiltinApps } from "../apps/register-builtin-apps.mjs";
import { initSocket } from "../socket/socket-runtime.mjs";
import { LumennRepository } from "../persistence/repository.mjs";
import { detectAvifSupport } from "../wallpaper/wallpaper-validator.mjs";
import { initNotifications } from "../notifications/notification-service.mjs";
import { preloadKeypressAudio } from "../ui/keypress-audio.mjs";

let runtimeReady = false;

async function runStep(name, step) {
  try {
    await step();
    return true;
  } catch (error) {
    Logger.error(`Etapa "${name}" falhou:`, error);
    return false;
  }
}

function applyDebugSetting() {
  try {
    const enabled = game.settings.get(MODULE_ID, SETTINGS_KEYS.DEBUG_LOGGING) === true;
    Logger.setDebug(enabled);
  } catch (error) {
    Logger.debug("Setting de debug indisponível:", error);
  }
}

export function registerLifecycle() {
  Hooks.once("init", async () => {
    Logger.info("init");
    registerSettings();
    registerBuiltinApps();
    installControlsEntry();
    await runStep("templates", () => preloadTemplates(TEMPLATE_PARTIALS));
  });

  Hooks.once("setup", () => {
    Logger.info("setup");
    verifyControlsEntry();
    exposePublicApi();
  });

  Hooks.once("ready", async () => {
    Logger.info("ready");
    applyDebugSetting();
    detectAvifSupport();
    preloadKeypressAudio();
    await runStep("socket", () => initSocket());
    await runStep("notifications", () => initNotifications());
    await runStep("repository", () => LumennRepository.init());
    runtimeReady = true;
    Hooks.callAll(HOOKS.READY, getRuntimeStatus());
  });
}

export function isRuntimeReady() {
  return runtimeReady;
}

export function getRuntimeStatus() {
  return { moduleId: MODULE_ID, ready: runtimeReady };
}
