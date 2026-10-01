import {
  DEFAULT_DEVICE_MODEL,
  DEVICE_MODELS,
  MODULE_ID,
  SETTINGS_KEYS,
  TEMPLATE_ROOT,
} from "../../core/constants.mjs";
import { isLumennError, toUserMessage } from "../../core/errors.mjs";
import { Logger } from "../../core/logger.mjs";
import { renderTemplate } from "../../compat/foundry-compat.mjs";
import {
  applyWallpaperFromFile,
  applyWallpaperFromSource,
  getResolvedWallpaper,
  pickWallpaperFromFoundry,
  resetWallpaper,
} from "../../wallpaper/wallpaper-service.mjs";
import { createPinRecord, verifyPin } from "../../lock/pin-kdf.mjs";
import { PhoneController } from "../../phone/phone-controller.mjs";
import {
  isFeatureEnabled,
  resolveSoundEnabled,
  resolveTheme,
} from "../../core/preferences.mjs";

const THEMES = ["light", "dark"];

const DEVICE_LABELS = Object.freeze({
  iphone: "LPH.Devices.IPhone",
  xiaomi: "LPH.Devices.Xiaomi",
  oppo: "LPH.Devices.Oppo",
  samsung: "LPH.Devices.Samsung",
});

function localize(key, fallback) {
  const i18n = globalThis.game?.i18n;
  const value = i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key
    ? value
    : (fallback ?? key);
}

async function setClientSetting(key, value) {
  try {
    await globalThis.game?.settings?.set(MODULE_ID, key, value);
    return true;
  } catch (error) {
    Logger.warn(`Falha ao gravar setting de cliente "${key}":`, error);
    return false;
  }
}

function actorUuidOf(shell) {
  return shell?.actorUuid ?? globalThis.game?.user?.character?.uuid ?? null;
}

function deviceModel() {
  try {
    const value = globalThis.game?.settings?.get(
      MODULE_ID,
      SETTINGS_KEYS.DEVICE_MODEL,
    );
    return DEVICE_MODELS.includes(value) ? value : DEFAULT_DEVICE_MODEL;
  } catch {
    return DEFAULT_DEVICE_MODEL;
  }
}

function setWallpaperError(shell, message) {
  const element = shell?.element?.querySelector?.("[data-lph-wallpaper-error]");
  if (element) element.textContent = message ?? "";
}

async function runWallpaperAction(shell, action) {
  setWallpaperError(shell, "");
  try {
    await action();
    await shell.render(true);
  } catch (error) {
    const message = isLumennError(error)
      ? toUserMessage(error.code, error.message)
      : (error?.message ?? toUserMessage(undefined));
    setWallpaperError(shell, message);
    Logger.debug("Ação de wallpaper falhou:", error);
  }
}

export const settingsApp = {
  id: "settings",
  name: "LPH.Apps.Settings",
  icon: "fas fa-cog",
  brand: "fas fa-cog",
  tile: "#6B7280",
  order: 10,
  dockEligible: true,
  playerVisible: true,
  gmPanel: false,

  async render({ shell } = {}) {
    const phoneState = shell?.phoneState ?? null;
    const resolved = getResolvedWallpaper(phoneState);
    return renderTemplate(`${TEMPLATE_ROOT}/apps/settings.hbs`, {
      theme: resolveTheme(),
      deviceModel: deviceModel(),
      deviceOptions: DEVICE_MODELS.map((id) => ({
        id,
        label: localize(DEVICE_LABELS[id], id),
      })),
      canChangeDevice: globalThis.game?.user?.isGM === true,
      soundEnabled: resolveSoundEnabled(),
      canUploadWallpaper: isFeatureEnabled("playerWallpaperUpload"),
      hasCustomWallpaper: Boolean(phoneState?.wallpaper?.url),
      wallpaperSource: resolved ?? "",
      hasPin: Boolean(phoneState?.pinVerifier),
      version: globalThis.game?.modules?.get(MODULE_ID)?.version ?? "0.0.0",
    });
  },

  onOpen(shell) {
    const root = shell?.element;
    if (!root) return;

    root.querySelectorAll("[data-lph-theme]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const theme = event.currentTarget.dataset.lphTheme;
        if (!THEMES.includes(theme)) return;
        await setClientSetting(SETTINGS_KEYS.THEME, theme);
        await shell.render(true);
      });
    });

    root
      .querySelector("[data-lph-device-model]")
      ?.addEventListener("change", async (event) => {
        if (globalThis.game?.user?.isGM !== true) return;
        const value = String(event.currentTarget.value ?? "");
        if (!DEVICE_MODELS.includes(value)) return;
        try {
          await globalThis.game.settings.set(
            MODULE_ID,
            SETTINGS_KEYS.DEVICE_MODEL,
            value,
          );
          await shell.render(true);
        } catch (error) {
          Logger.warn("Falha ao trocar modelo do aparelho:", error);
        }
      });

    const sound = root.querySelector("[data-lph-sound]");
    sound?.addEventListener("change", async (event) => {
      await setClientSetting(
        SETTINGS_KEYS.NOTIFICATION_SOUND,
        event.currentTarget.checked === true ? "on" : "off",
      );
    });

    const fileInput = root.querySelector("[data-lph-wallpaper-file]");

    root
      .querySelector('[data-lph-wallpaper="browse"]')
      ?.addEventListener("click", () => {
        runWallpaperAction(shell, () =>
          pickWallpaperFromFoundry(
            actorUuidOf(shell),
            getResolvedWallpaper(shell?.phoneState),
          ),
        );
      });

    root
      .querySelector('[data-lph-wallpaper="upload"]')
      ?.addEventListener("click", () => fileInput?.click());

    fileInput?.addEventListener("change", (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      runWallpaperAction(shell, () =>
        applyWallpaperFromFile(actorUuidOf(shell), file),
      );
      event.currentTarget.value = "";
    });

    root
      .querySelector('[data-lph-wallpaper="url"]')
      ?.addEventListener("click", () => {
        const input = root.querySelector("[data-lph-wallpaper-url]");
        const value = input?.value?.trim();
        if (!value) return;
        runWallpaperAction(shell, () =>
          applyWallpaperFromSource(actorUuidOf(shell), value),
        );
      });

    root
      .querySelector('[data-lph-wallpaper="default"]')
      ?.addEventListener("click", () => {
        runWallpaperAction(shell, () => resetWallpaper(actorUuidOf(shell)));
      });

    const pinForm = root.querySelector("[data-lph-pin-form]");
    const pinStatus = root.querySelector("[data-lph-pin-status]");
    let pinMode = null;

    const setPinStatus = (text, kind = "") => {
      if (!pinStatus) return;
      pinStatus.textContent = text ?? "";
      pinStatus.dataset.kind = kind;
    };

    const showPinForm = (mode) => {
      if (!pinForm) return;
      pinMode = mode;
      pinForm.hidden = false;
      pinForm.reset();
      pinForm.querySelector("[data-lph-pin-current]").hidden =
        mode === "create";
      pinForm.querySelector("[data-lph-pin-new]").hidden = mode === "remove";
      pinForm.querySelector("[data-lph-pin-confirm]").hidden =
        mode === "remove";
      setPinStatus("");
      pinForm.querySelector("input:not([hidden])")?.focus?.();
    };

    root.querySelectorAll("[data-lph-pin-action]").forEach((button) => {
      button.addEventListener("click", () =>
        showPinForm(button.dataset.lphPinAction),
      );
    });

    pinForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!pinMode) return;

      const actorUuid = actorUuidOf(shell);
      const verifier = shell?.phoneState?.pinVerifier ?? null;
      const data = new FormData(pinForm);
      const current = String(data.get("current") ?? "");
      const next = String(data.get("next") ?? "");
      const confirmation = String(data.get("confirm") ?? "");

      try {
        if (pinMode !== "create") {
          if (!verifier) {
            setPinStatus(localize("LPH.Errors.LPH_INVALID_PIN"), "error");
            return;
          }
          const valid = await verifyPin(current, verifier);
          if (!valid) {
            setPinStatus(localize("LPH.Settings.PinWrong"), "error");
            return;
          }
        }

        if (pinMode === "remove") {
          await PhoneController.patchPhone(actorUuid, { pinVerifier: null });
          setPinStatus(localize("LPH.Settings.PinRemoved"), "ok");
          await shell.render(true);
          return;
        }

        if (next !== confirmation) {
          setPinStatus(localize("LPH.Settings.PinMismatch"), "error");
          return;
        }

        setPinStatus(localize("LPH.Settings.PinWorking"));
        const record = await createPinRecord(next);
        await PhoneController.patchPhone(actorUuid, { pinVerifier: record });
        setPinStatus(
          localize(
            pinMode === "create"
              ? "LPH.Settings.PinCreated"
              : "LPH.Settings.PinChanged",
          ),
          "ok",
        );
        await shell.render(true);
      } catch (error) {
        Logger.debug("Falha na operação de PIN:", error);
        setPinStatus(
          isLumennError(error)
            ? toUserMessage(error.code, error.message)
            : (error?.message ?? "Erro"),
          "error",
        );
      }
    });
  },
};
