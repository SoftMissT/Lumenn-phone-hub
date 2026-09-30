import { TEMPLATE_ROOT, WALLPAPER_DIRECTORY } from "../../core/constants.mjs";
import { Logger } from "../../core/logger.mjs";
import {
  canUploadFiles,
  isGM,
  renderTemplate,
  uploadFile,
} from "../../compat/foundry-compat.mjs";
import { validateFile } from "../../wallpaper/wallpaper-service.mjs";
import {
  listGmAddressableCharacters,
  sendNotificationAsGM,
} from "../../gm/gm-notification-service.mjs";
import { CONTENT_APPS } from "../content/content-catalog.mjs";

function localize(key, fallback) {
  const i18n = globalThis.game?.i18n;
  const value = i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

// O GM escolhe o app de destino: é o campo que decide em qual dos seis a
// mensagem aparece. "system" só dispara a notificação, sem caixa de entrada.
function appChoices() {
  return CONTENT_APPS.map((app) => ({
    id: app.id,
    label: localize(app.name, app.id),
  }));
}

async function render() {
  if (!isGM()) return "";
  return renderTemplate(`${TEMPLATE_ROOT}/gm/control-center.hbs`, {
    characters: listGmAddressableCharacters(),
    apps: appChoices(),
  });
}

function buildPreview(form) {
  const sender = String(form.elements.sender?.value ?? "").trim();
  const title = String(form.elements.title?.value ?? "").trim();
  const body = String(form.elements.body?.value ?? "").trim();
  const targetMode = String(form.elements.targetMode?.value ?? "all");
  const target =
    targetMode === "all"
      ? localize("LPH.GM.TargetAll", "All")
      : (form.elements.targetActorUuid?.selectedOptions?.[0]?.textContent ??
        "");
  const appId = String(form.elements.app?.value ?? "system");
  const appLabel =
    appId === "system"
      ? localize("LPH.GM.AppSystem", "System")
      : (form.elements.app?.selectedOptions?.[0]?.textContent ?? appId);
  return [
    `${localize("LPH.GM.Sender", "Sender")}: ${sender || ""}`,
    `${localize("LPH.GM.App", "App")}: ${appLabel}`,
    `${localize("LPH.GM.Targets", "Recipients")}: ${target}`,
    `${localize("LPH.GM.TitleLabel", "Title")}: ${title || ""}`,
    body,
  ].join("\n");
}

function onOpen(shell) {
  const root = shell?.element;
  const form = root?.querySelector("[data-lph-gm-central-form]");
  if (!form) return;

  const status = form.querySelector("[data-lph-gm-central-status]");
  const preview = form.querySelector("[data-lph-gm-preview]");
  const singleField = form.querySelector("[data-lph-gm-single]");
  const imageInput = form.querySelector("[data-lph-gm-image]");
  let imageUrl = "";

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

  imageInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const validation = await validateFile(file);
      if (!validation.valid) throw new Error(validation.reason);
      if (!canUploadFiles())
        throw new Error("Você não tem permissão para enviar arquivos.");
      const response = await uploadFile({
        source: "data",
        path: WALLPAPER_DIRECTORY,
        file,
        notify: false,
      });
      imageUrl = response?.path ?? response?.url ?? "";
      if (!imageUrl) throw new Error("O upload não retornou um caminho.");
      setStatus("", "");
      refreshPreview();
    } catch (error) {
      imageUrl = "";
      event.target.value = "";
      setStatus(error.message ?? "Erro", "error");
    }
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
      app: String(form.elements.app?.value ?? "system"),
      image: imageUrl,
      targetActorUuid:
        targetMode === "single"
          ? String(form.elements.targetActorUuid?.value ?? "all")
          : "all",
    };
    try {
      await sendNotificationAsGM(payload);
      setStatus(localize("LPH.GM.Sent", "Notification sent."), "ok");
      form.reset();
      imageUrl = "";
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
  onOpen,
};
