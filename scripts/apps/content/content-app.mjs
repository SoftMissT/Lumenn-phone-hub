import { TEMPLATE_ROOT } from "../../core/constants.mjs";
import { Logger } from "../../core/logger.mjs";
import { escapeHTML, renderTemplate } from "../../compat/application-compat.mjs";
import { openFilePicker } from "../../compat/foundry-compat.mjs";
import { getLikedPosts, toggleLikedPost } from "../../core/preferences.mjs";
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

// Avatar do contato: sem foto, desenha a inicial do nome num círculo colorido.
// A cor vem de um hash do nome, então o mesmo NPC tem sempre a mesma cor.
export function avatarInitial(name) {
  const text = String(name ?? "").trim();
  if (!text) return "?";
  return [...text][0].toUpperCase();
}

export function avatarHue(name) {
  const text = String(name ?? "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }
  return hash;
}

function ownCharacterName() {
  return globalThis.game?.user?.character?.name ?? "";
}

function decorateThreads(threads, ownName) {
  return threads.map((thread) => ({
    ...thread,
    initial: avatarInitial(thread.last?.sender),
    avatarHue: avatarHue(thread.last?.sender),
    messages: thread.messages.map((message) => ({
      ...message,
      mine: Boolean(ownName) && message.sender === ownName,
    })),
  }));
}

// O GM precisa saber que responderam - sem isto a resposta fica só no celular
// do jogador e a conversa morre ali.
function notifyGamemaster(sender, text) {
  try {
    const ChatMessage = globalThis.ChatMessage;
    if (typeof ChatMessage?.create !== "function") return;
    ChatMessage.create({
      content: `<p><strong>${escapeHTML(sender)}</strong> respondeu: ${escapeHTML(text)}</p>`,
      whisper: ChatMessage.getWhisperRecipients?.("GM"),
      speaker: { alias: "Lumenn Phone" },
    });
  } catch (error) {
    Logger.debug("Aviso ao GM não enviado:", error);
  }
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
      const liked = getLikedPosts();
      const decorated = items.map((item) => ({
        ...item,
        liked: Boolean(liked[item.id]),
      }));
      const threads = spec.threaded
        ? decorateThreads(groupByThread(decorated), ownCharacterName())
        : null;
      const stories = spec.stories ? buildStories(decorated) : null;
      return renderTemplate(
        `${TEMPLATE_ROOT}/${spec.template ?? "apps/content-app.hbs"}`,
        {
          appId: spec.id,
          appLabel: localize(spec.name, spec.id),
          threaded: spec.threaded,
          threads,
          items: decorated,
          stories,
          total: decorated.length,
          emptyText: localize(spec.emptyKey, ""),
          canReply: spec.id === "messages",
          replyPlaceholder: localize("LPH.Apps.ReplyPlaceholder", "Reply..."),
          sendLabel: localize("LPH.Apps.ReplySend", "Send"),
          canAddPhoto: spec.id === "photos",
          addPhotoLabel: localize("LPH.Apps.AddPhoto", "Add photo"),
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

      // Curtir: alterna no lugar, sem re-renderizar - re-render perderia a
      // posição de rolagem do feed no meio da leitura.
      body.querySelectorAll("[data-lph-like]").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const id = button.dataset.lphLike;
          if (!id) return;
          try {
            const isLiked = await toggleLikedPost(id);
            button.classList.toggle("is-liked", isLiked);
            button.setAttribute("aria-pressed", isLiked ? "true" : "false");
            const glyph = button.querySelector("i");
            if (glyph) glyph.className = `${isLiked ? "fas" : "far"} fa-heart`;
          } catch (error) {
            Logger.debug("Falha ao curtir:", error);
          }
        });
      });

      // Adicionar foto: o seletor do próprio Foundry. Quem pode enviar arquivo
      // vê o botão de upload nele; quem não pode, escolhe do que já existe.
      body
        .querySelector("[data-lph-add-photo]")
        ?.addEventListener("click", async () => {
          const actorUuid = actorUuidOf(shell);
          if (!actorUuid) return;
          try {
            const picked = await openFilePicker({ type: "image", current: "" });
            if (!picked) return;
            await PhoneController.createNotification({
              app: "photos",
              targetActorUuid: actorUuid,
              sender: ownCharacterName(),
              title: "",
              body: "",
              image: picked,
            });
            await shell.render(true);
          } catch (error) {
            Logger.error("Falha ao adicionar foto:", error);
          }
        });

      // Responder: a resposta entra no mesmo thread, endereçada ao próprio
      // personagem, para sobreviver ao reload como qualquer outra mensagem.
      body.querySelectorAll("[data-lph-reply]").forEach((form) => {
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const input = form.querySelector('input[name="body"]');
          const text = String(input?.value ?? "").trim();
          if (!text) return;
          const actorUuid = actorUuidOf(shell);
          if (!actorUuid) return;
          try {
            await PhoneController.createNotification({
              app: "messages",
              thread: form.dataset.lphThreadId,
              targetActorUuid: actorUuid,
              sender: ownCharacterName(),
              title: "",
              body: text,
            });
            input.value = "";
            notifyGamemaster(ownCharacterName(), text);
            await shell.render(true);
          } catch (error) {
            Logger.error("Falha ao enviar resposta:", error);
          }
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
