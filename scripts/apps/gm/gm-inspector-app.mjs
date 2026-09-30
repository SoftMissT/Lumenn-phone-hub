import { MODULE_ID, TEMPLATE_ROOT } from "../../core/constants.mjs";
import { Logger } from "../../core/logger.mjs";
import {
  confirmDialog,
  isGM,
  renderTemplate,
} from "../../compat/foundry-compat.mjs";
import {
  gmListCharacters,
  gmResetPin,
  gmResetWallpaper,
} from "../../gm/gm-phone-inspector.mjs";

function localize(key, fallback) {
  const i18n = globalThis.game?.i18n;
  const value = i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

function format(key, data, fallback) {
  const i18n = globalThis.game?.i18n;
  const value = i18n?.format?.(key, data);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

async function render() {
  if (!isGM()) return "";
  return renderTemplate(`${TEMPLATE_ROOT}/gm/phone-inspector.hbs`, {
    characters: gmListCharacters(),
  });
}

function onOpen(shell) {
  const root = shell?.element;
  const container = root?.querySelector("[data-lph-gm-inspector]");
  if (!container) return;

  const select = container.querySelector("[data-lph-gm-actor]");
  const status = container.querySelector("[data-lph-gm-inspector-status]");
  const selected = () => select?.value ?? null;
  const selectedName = () => select?.selectedOptions?.[0]?.textContent ?? "";

  const setStatus = (text, kind = "") => {
    if (!status) return;
    status.textContent = text ?? "";
    status.dataset.kind = kind;
  };

  const runAction = async (action) => {
    const actorUuid = selected();
    if (!actorUuid) {
      setStatus(
        localize("LPH.GM.NoCharacter", "No character available."),
        "error",
      );
      return;
    }
    setStatus("");
    try {
      if (action === "open") {
        globalThis.game?.modules
          ?.get(MODULE_ID)
          ?.api?.openPhoneAsGM?.(actorUuid);
        setStatus(localize("LPH.GM.Done", "Done."), "ok");
        return;
      }
      const name = selectedName();
      const confirmed = await confirmDialog({
        title:
          action === "reset-pin"
            ? localize("LPH.GM.ResetPin", "Reset PIN")
            : localize("LPH.GM.ResetWallpaper", "Reset wallpaper"),
        content: format(
          action === "reset-pin"
            ? "LPH.GM.ResetPinConfirm"
            : "LPH.GM.ResetWallpaperConfirm",
          { name },
          `${name}?`,
        ),
      });
      if (!confirmed) return;
      if (action === "reset-pin") await gmResetPin(actorUuid);
      else await gmResetWallpaper(actorUuid);
      setStatus(localize("LPH.GM.Done", "Done."), "ok");
    } catch (error) {
      Logger.error("Ação de GM falhou:", error);
      setStatus(error?.message ?? "Erro", "error");
    }
  };

  container.querySelectorAll("[data-lph-gm-inspect]").forEach((button) => {
    button.addEventListener("click", (event) => {
      runAction(event.currentTarget.dataset.lphGmInspect);
    });
  });
}

export const gmInspectorApp = {
  id: "gm-inspector",
  name: "LPH.GM.Inspector",
  icon: "fas fa-user-shield",
  order: 2,
  dockEligible: false,
  playerVisible: false,
  gmPanel: true,
  render,
  onOpen,
};
