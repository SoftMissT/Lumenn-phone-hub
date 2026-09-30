import { SETTINGS_KEYS, TEMPLATE_ROOT } from "../../core/constants.mjs";
import { Logger } from "../../core/logger.mjs";
import { escapeHTML, renderTemplate } from "../../compat/application-compat.mjs";
import { canBrowseFiles, openFilePicker } from "../../compat/foundry-compat.mjs";
import {
  getLikedPosts,
  getLimit,
  toggleLikedPost,
} from "../../core/preferences.mjs";
import { LumennRepository } from "../../persistence/repository.mjs";
import { PhoneController } from "../../phone/phone-controller.mjs";
import { groupByThread } from "../../notifications/notification-store.mjs";
import { getWorldClock } from "../../time/world-clock.mjs";
import { CONTENT_APPS } from "./content-catalog.mjs";

function localize(key, fallback) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}

function actorUuidOf(shell) {
  return shell?.actorUuid ?? globalThis.game?.user?.character?.uuid ?? null;
}

// onOpen roda mais de uma vez sobre o mesmo DOM. Sem esta marca o mesmo
// listener é ligado duas vezes e um clique vale por dois - foi assim que uma
// mensagem virou quatro notificações. A chave inclui o evento porque o mesmo
// nó recebe clique E teclado.
function bindOnce(node, event, handler) {
  if (!node) return;
  const key = `lphWired_${event}`;
  if (node[key]) return;
  node[key] = true;
  node.addEventListener(event, handler);
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

// Valor do extrato: sinal sempre ("+" crédito, "-" débito, "±" zero), símbolo
// só quando o mundo define um. Não-número vira "" e a linha fica sem valor.
export function formatAmount(amount, symbol = "", locale) {
  if (!Number.isFinite(amount)) return "";
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "±";
  const number = new Intl.NumberFormat(
    locale ?? globalThis.game?.i18n?.lang,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(Math.abs(amount));
  return `${sign}${typeof symbol === "string" ? symbol : ""}${number}`;
}

export function isCredit(amount) {
  return Number.isFinite(amount) && amount > 0;
}

// Saldo do extrato: soma só os amounts finitos. Sem nenhum valor, null — a
// interface não mostra saldo nenhum (nem um "0" que ninguém lançou).
export function computeBalance(items) {
  let total = 0;
  let found = false;
  for (const item of items ?? []) {
    if (!Number.isFinite(item?.amount)) continue;
    found = true;
    total += item.amount;
  }
  if (!found) return null;
  const rounded = Math.round(total * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

// Trecho de uma linha para a lista de manchetes: corta na palavra inteira
// anterior ao limite e marca com "…". O corpo completo segue intacto no item.
export function headlineExcerpt(body, max = 140) {
  const limit = Number.isFinite(max) ? Math.trunc(max) : 140;
  const text = String(body ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || limit <= 0) return "";
  const chars = [...text];
  if (chars.length <= limit) return text;
  const head = chars.slice(0, limit).join("");
  const space = head.lastIndexOf(" ");
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`;
}

function currencySymbolOf() {
  const value = getLimit(SETTINGS_KEYS.CURRENCY_SYMBOL, "");
  return typeof value === "string" ? value : "";
}

function ownCharacterName() {
  return globalThis.game?.user?.character?.name ?? "";
}

// Uma conversa de celular não é uma lista de bolhas soltas. Tem separador de
// dia, avatar e nome em quem falou, e a hora colada em cada bolha. Devolve as
// "linhas" já prontas para o template, misturando separadores e mensagens, para
// o template não precisar de lógica.
export function buildConversationLines(
  messages,
  ownName,
  clockOf = () => null,
  locale,
) {
  const lines = [];
  let lastDay = "";
  let lastSender = "";
  for (const message of messages ?? []) {
    const clock = clockOf(message?.createdAt) ?? null;
    const day = clock?.date ?? "";
    if (day && day !== lastDay) {
      lines.push({ isDate: true, id: `date-${lines.length}`, label: day });
      lastDay = day;
      // Depois de um separador o nome volta: já não se sabe quem é.
      lastSender = "";
    }
    const mine = Boolean(ownName) && message?.sender === ownName;
    const sender = String(message?.sender ?? "");
    lines.push({
      isDate: false,
      id: message?.id,
      mine,
      sender,
      title: message?.title,
      body: message?.body,
      avatar: message?.avatar,
      initial: avatarInitial(sender),
      hue: avatarHue(sender),
      time: clock?.time ?? "",
      // Rajada da mesma pessoa não repete avatar nem nome.
      opensGroup: mine || sender !== lastSender,
    });
    lastSender = sender;
  }
  return lines;
}

function decorateThreads(threads, ownName) {
  // Hora do MUNDO, não a do computador: o módulo tem fuso, ano narrativo e era
  // configuráveis, e um carimbo em tempo real quebraria a diégese.
  const clockOf = (createdAt) => {
    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return getWorldClock(date);
  };
  return threads.map((thread) => ({
    ...thread,
    initial: avatarInitial(thread.last?.sender),
    avatarHue: avatarHue(thread.last?.sender),
    // Numa lista de conversas o que importa é a última linha e quantas não
    // lidas. O total de mensagens não diz nada e polui a linha.
    preview: headlineExcerpt(thread.last?.body, 60),
    unread: thread.messages.filter((m) => m.status === "unread").length,
    lines: buildConversationLines(thread.messages, ownName, clockOf),
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

// Destinatários possíveis: todo usuário com personagem, menos o meu. É a lista
// que o seletor de nova mensagem mostra.
function worldRecipients() {
  const selfUuid = globalThis.game?.user?.character?.uuid ?? null;
  return (globalThis.game?.users?.contents ?? [])
    .map((user) => user?.character)
    .filter((actor) => actor?.uuid && actor.uuid !== selfUuid)
    .map((actor) => ({ uuid: actor.uuid, name: actor.name }));
}

// Id de conversa determinístico a partir do par: os dois lados calculam o
// mesmo id sem combinar nada, e a conversa cai no mesmo balde dos dois lados.
export function conversationThread(a, b) {
  return [String(a ?? ""), String(b ?? "")].sort().join("::");
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
      const isBank = spec.id === "bank";
      const isNews = spec.id === "news";
      const currencySymbol = isBank ? currencySymbolOf() : "";
      const balance = isBank ? computeBalance(items) : null;
      const decorated = items.map((item) => ({
        ...item,
        liked: Boolean(liked[item.id]),
        ...(isBank && {
          credit: isCredit(item.amount),
          amountText: formatAmount(item.amount, currencySymbol),
        }),
        ...(isNews && {
          excerpt: headlineExcerpt(item.body),
          unread: item.status === "unread",
        }),
      }));
      const threads = spec.threaded
        ? decorateThreads(groupByThread(decorated), ownCharacterName())
        : null;
      const stories = spec.stories ? buildStories(decorated) : null;
      const canBrowse = canBrowseFiles();
      const canPost = spec.id === "instagram" && canBrowse;
      const recipients = spec.id === "messages" ? worldRecipients() : null;
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
          canAddPhoto: spec.id === "photos" && canBrowseFiles(),
          addPhotoLabel: localize("LPH.Apps.AddPhoto", "Add photo"),
          addPhotoHint: localize(
            "LPH.Apps.AddPhotoLocked",
            "Peça ao GM para liberar o acesso a arquivos.",
          ),
          photosNeedsPermission: spec.id === "photos" && !canBrowseFiles(),
          recipients,
          canCompose: spec.id === "messages" && Boolean(recipients?.length),
          composeToLabel: localize("LPH.Apps.ComposeTo", "To"),
          composePlaceholder: localize(
            "LPH.Apps.ComposePlaceholder",
            "Write a message...",
          ),
          backLabel: localize("LPH.Apps.Back", "Back"),
          canPost,
          postLocked: spec.id === "instagram" && !canBrowse,
          postLabel: localize("LPH.Apps.NewPost", "New post"),
          postHint: localize(
            "LPH.Apps.AddPhotoLocked",
            "Peça ao GM para liberar o acesso a arquivos.",
          ),
          captionPlaceholder: localize(
            "LPH.Apps.CaptionPlaceholder",
            "Caption...",
          ),
          isBank,
          isNews,
          balanceText:
            balance === null ? "" : formatAmount(balance, currencySymbol),
          balanceLabel: localize("LPH.Apps.Balance", "Balance"),
          newBadge: localize("LPH.Apps.NewBadge", "NEW"),
        },
      );
    },

    onOpen(shell) {
      const root = shell?.element;
      if (!root) return;
      const body = root.querySelector(`[data-lph-content="${spec.id}"]`);
      if (!body) return;

      // Mensagens em dois níveis, como qualquer messenger: a lista de conversas
      // mostra prévia e não-lidas; tocar entra na conversa com o histórico
      // inteiro e o campo de texto; a seta volta. Antes tudo era um acordeão
      // fechado, então a tela parecia uma lista de nomes sem nenhum histórico.
      body.querySelectorAll("[data-lph-thread]").forEach((node) => {
        // Um chat abre no FIM da conversa, na mensagem mais nova - abrir no
        // começo obriga a rolar toda vez. Também é o que faz a barra de
        // escrever parar de cobrir a última bolha.
        const scrollToEnd = () => {
          const scroller = shell?.element?.querySelector(".lph-app-body");
          if (!scroller) return;
          scroller.scrollTop = scroller.scrollHeight;
        };
        const open = () => {
          body.classList.add("is-in-conversation");
          node.classList.add("is-active");
          // Guarda no shell, não só no DOM: responder dispara re-render, que
          // recria os nós e expulsaria de volta para a lista de conversas.
          shell.lphActiveThread = node.dataset.lphThread;
          globalThis.requestAnimationFrame?.(scrollToEnd);
        };
        const leave = (event) => {
          event?.preventDefault();
          event?.stopPropagation();
          body.classList.remove("is-in-conversation");
          node.classList.remove("is-active");
          shell.lphActiveThread = null;
        };
        const head = node.querySelector("[data-lph-thread-head]");
        bindOnce(head, "click", open);
        bindOnce(head, "keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          open();
        });
        bindOnce(node.querySelector("[data-lph-thread-back]"), "click", leave);
        // Reabre a conversa que estava aberta antes do último render.
        if (
          shell.lphActiveThread &&
          shell.lphActiveThread === node.dataset.lphThread
        ) {
          body.classList.add("is-in-conversation");
          node.classList.add("is-active");
          globalThis.requestAnimationFrame?.(scrollToEnd);
        }
      });

      // Notícias e Banco: tocar no card abre o corpo completo ali mesmo, sem
      // trocar de tela. O estado vive só no DOM, como nos threads — o próximo
      // render fecha tudo de novo.
      body.querySelectorAll("[data-lph-expand]").forEach((node) => {
        const toggle = () => {
          const open = node.classList.toggle("is-open");
          node.setAttribute("aria-expanded", open ? "true" : "false");
        };
        bindOnce(node, "click", toggle);
        bindOnce(node, "keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggle();
        });
      });

      // Curtir: alterna no lugar, sem re-renderizar - re-render perderia a
      // posição de rolagem do feed no meio da leitura.
      body.querySelectorAll("[data-lph-like]").forEach((button) => {
        bindOnce(button, "click", async (event) => {
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
      bindOnce(body.querySelector("[data-lph-add-photo]"), "click", async () => {
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
        bindOnce(form, "submit", async (event) => {
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

      // Nova mensagem: escreve duas notificações - uma para o destinatário e
      // uma cópia para mim. O store é por personagem, então sem a cópia eu não
      // veria a minha própria mensagem depois do reload.
      // ponytail: duas escritas por mensagem; com N participantes o certo é o
      // GM fazer o fan-out no repositório.
      // AVISO: o handler do GM não valida se o pedido pode escrever no ator de
      // destino - qualquer jogador pode gravar no celular de outro. É o preço
      // de o protocolo carregar só o targetActorUuid; aceitável entre amigos,
      // mas é buraco de spoofing de remetente.
      body.querySelectorAll("[data-lph-compose]").forEach((form) => {
        bindOnce(form, "submit", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const input = form.querySelector('input[name="body"]');
          const select = form.querySelector('select[name="to"]');
          const text = String(input?.value ?? "").trim();
          const to = String(select?.value ?? "");
          if (!text || !to) return;
          const actorUuid = actorUuidOf(shell);
          if (!actorUuid) return;
          const me = ownCharacterName();
          try {
            for (const target of [to, actorUuid]) {
              await PhoneController.createNotification({
                app: "messages",
                thread: conversationThread(actorUuid, to),
                targetActorUuid: target,
                sender: me,
                title: "",
                body: text,
              });
            }
            input.value = "";
            notifyGamemaster(me, text);
            await shell.render(true);
          } catch (error) {
            Logger.error("Falha ao enviar mensagem:", error);
          }
        });
      });

      // Novo post: vai para todo personagem do mundo, não só para o meu. É uma
      // rede social - um feed onde só eu apareço não serve para nada.
      bindOnce(body.querySelector("[data-lph-new-post]"), "click", async () => {
          const actorUuid = actorUuidOf(shell);
          if (!actorUuid) return;
          const captionEl = body.querySelector("[data-lph-post-caption]");
          const caption = String(captionEl?.value ?? "").trim();
          try {
            const picked = await openFilePicker({ type: "image", current: "" });
            if (!picked) return;
            const sender = ownCharacterName();
            const targets = [actorUuid, ...worldRecipients().map((r) => r.uuid)];
            for (const target of targets) {
              await PhoneController.createNotification({
                app: "instagram",
                targetActorUuid: target,
                sender,
                title: caption,
                body: "",
                image: picked,
              });
            }
            if (captionEl) captionEl.value = "";
            notifyGamemaster(sender, caption || "(publicou uma foto)");
            await shell.render(true);
          } catch (error) {
            Logger.error("Falha ao publicar:", error);
          }
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
