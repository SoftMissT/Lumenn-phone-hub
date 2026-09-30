import { TEMPLATE_ROOT } from "../../core/constants.mjs";
import { Logger } from "../../core/logger.mjs";
import { renderTemplate } from "../../compat/foundry-compat.mjs";
import { LumennRepository } from "../../persistence/repository.mjs";
import { PhoneController } from "../../phone/phone-controller.mjs";
import { groupByThread } from "../../notifications/notification-store.mjs";
import { CONTENT_APPS } from "./content-catalog.mjs";

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

function actorUuidOf(shell) {
  return shell?.actorUuid ?? globalThis.game?.user?.character?.uuid ?? null;
}

async function loadItems(actorUuid, appId) {
  if (!actorUuid) return [];
  try {
    const store = await LumennRepository.listNotifications(actorUuid);
    return store.filter((item) => item.app === appId);
  } catch (error) {
    Logger.debug(`Falha ao listar conteúdo de "${appId}":`, error);
    return [];
  }
}

// Stories = remetentes com imagem, no máximo 8. Sem vídeo: a "story" aqui é a
// foto mais recente de cada personagem. Sem imagem, não há story.
export function buildStories(items = [], limit = 8) {
  const seen = new Map();
  for (const item of items) {
    if (!item?.image) continue;
    const key = item.sender || item.id;
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()].slice(0, limit);
}

function createContentApp(spec) {
  return {
    id: spec.id,
    name: spec.name,
    icon: spec.icon,
    brand: spec.brand ?? spec.icon,
    tile: spec.tile ?? null,
    order: spec.order,
    dockEligible: spec.id === "messages",
    playerVisible: true,
    gmPanel: false,

    async render({ shell } = {}) {
      const items = await loadItems(actorUuidOf(shell), spec.id);
      const threads = spec.threaded ? groupByThread(items) : null;
      const stories = spec.stories ? buildStories(items) : null;
      return renderTemplate(
        `${TEMPLATE_ROOT}/${spec.template ?? "apps/content-app.hbs"}`,
        {
          appId: spec.id,
          appLabel: localize(spec.name, spec.id),
          threaded: spec.threaded,
          threads,
          items,
          stories,
          total: items.length,
          emptyText: localize(spec.emptyKey, ""),
        },
      );
    },

    onOpen(shell) {
      const root = shell?.element;
      if (!root) return;
      const body = root.querySelector(`[data-lph-content="${spec.id}"]`);
      if (!body) return;

      // Abrir um thread revela as mensagens; o título do thread é o rótulo.
      body.querySelectorAll("[data-lph-thread]").forEach((node) => {
        const toggle = () => node.classList.toggle("is-open");
        node
          .querySelector("[data-lph-thread-head]")
          ?.addEventListener("click", toggle);
        node
          .querySelector("[data-lph-thread-head]")
          ?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggle();
          });
      });

      // Recibo de leitura: abrir o app limpa o badge daquele app. Solto de
      // propósito — se o socket do jogador falhar, o conteúdo continua na tela.
      const actorUuid = actorUuidOf(shell);
      if (!actorUuid) return;
      void loadItems(actorUuid, spec.id)
        .then((items) => {
          const unread = items.filter((item) => item.status === "unread");
          if (!unread.length) return null;
          return PhoneController.markNotificationsRead(
            actorUuid,
            unread.map((item) => item.id),
          );
        })
        .catch((error) => Logger.debug("Falha ao marcar como lido:", error));
    },
  };
}

export const contentApps = CONTENT_APPS.map(createContentApp);

export function registerContentApps(registry) {
  for (const app of contentApps) registry.register(app);
  return contentApps.length;
}
