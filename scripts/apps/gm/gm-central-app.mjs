import { TEMPLATE_ROOT } from "../../core/constants.mjs";
import { Logger } from "../../core/logger.mjs";
import { isGM, renderTemplate } from "../../compat/foundry-compat.mjs";
import { listGmAddressableCharacters, sendNotificationAsGM } from "../../gm/gm-notification-service.mjs";

function localize(key, fallback) {
  const i18n = globalThis.game?.i18n;
  const value = i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

async function render() {
  if (!isGM()) return "";
  return renderTemplate(`${TEMPLATE_ROOT}/gm/control-center.hbs`, {
    characters: listGmAddressableCharacters()
  });
}

function buildPreview(form) {
  const sender = String(form.elements.sender?.value ?? "").trim();
  const title = String(form.elements.title?.value ?? "").trim();
  const body = String(form.elements.body?.value ?? "").trim();
  const targetMode = String(form.elements.targetMode?.value ?? "all");
  const target = targetMode === "all"
    ? localize("LPH.GM.TargetAll", "All")
    : (form.elements.targetActorUuid?.selectedOptions?.[0]?.textContent ?? "");
  return [
    `${localize("LPH.GM.Sender", "Sender")}: ${sender || "—"}`,
    `${localize("LPH.GM.Targets", "Recipients")}: ${target}`,
    `${localize("LPH.GM.TitleLabel", "Title")}: ${title || "—"}`,
    body
  ].join("\n");
}

function onOpen(shell) {
  const root = shell?.element;
  const form = root?.querySelector("[data-lph-gm-central-form]");
  if (!form) return;

  const status = form.querySelector("[data-lph-gm-central-status]");
  const preview = form.querySelector("[data-lph-gm-preview]");
  const singleField = form.querySelector("[data-lph-gm-single]");

  const setStatus = (text, kind = "") => {
    if (!status) return;
    status.textContent = text ?? "";
    status.dataset.kind = kind;
  };

  const refreshPreview = () => {
    if (preview) preview.textContent = buildPreview(form);
  };

  const syncTargetVisibility = () => {
    if (!singleField) return;
    singleField.hidden = form.elements.targetMode?.value !== "single";
  };

  form.addEventListener("input", refreshPreview);
  form.addEventListener("change", () => {
    syncTargetVisibility();
    refreshPreview();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = String(form.elements.title?.value ?? "").trim();
    if (!title) {
      setStatus(localize("LPH.GM.NeedsTitle", "Enter a title."), "error");
      return;
    }
    const targetMode = String(form.elements.targetMode?.value ?? "all");
    const payload = {
      sender: String(form.elements.sender?.value ?? "").trim(),
      title,
      body: String(form.elements.body?.value ?? "").trim(),
      targetActorUuid: targetMode === "single"
        ? String(form.elements.targetActorUuid?.value ?? "all")
        : "all"
    };
    try {
      await sendNotificationAsGM(payload);
      setStatus(localize("LPH.GM.Sent", "Notification sent."), "ok");
      form.reset();
      syncTargetVisibility();
      refreshPreview();
    } catch (error) {
      Logger.error("Falha ao enviar notificação:", error);
      setStatus(error?.message ?? "Erro", "error");
    }
  });

  syncTargetVisibility();
  refreshPreview();
}

export const gmCentralApp = {
  id: "gm-central",
  name: "LPH.GM.Central",
  icon: "fas fa-satellite-dish",
  order: 1,
  dockEligible: false,
  playerVisible: false,
  gmPanel: true,
  render,
  onOpen
};
