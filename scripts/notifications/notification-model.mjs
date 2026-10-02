import {
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_DEFAULT_TTL_MS,
  NOTIFICATION_MAX_LINES,
  NOTIFICATION_TITLE_MAX,
  SETTINGS_KEYS,
} from "../core/constants.mjs";
import { getLimit } from "../core/preferences.mjs";
import { randomId } from "../validation/ids.mjs";
import {
  countGraphemes,
  prepareNotificationText,
} from "../validation/text.mjs";
import { validateSourceUrl } from "../wallpaper/wallpaper-validator.mjs";
import { isAllowedWallpaperUrl, isForbiddenProtocol } from "../validation/urls.mjs";

const DEFAULT_TTL_DAYS = Math.round(NOTIFICATION_DEFAULT_TTL_MS / 86400000);

function ttlMs() {
  return getLimit(SETTINGS_KEYS.LIMIT_TTL_DAYS, DEFAULT_TTL_DAYS) * 86400000;
}

export const NOTIFICATION_STATUS = Object.freeze({
  UNREAD: "unread",
  READ: "read",
  DISMISSED: "dismissed",
  EXPIRED: "expired",
});

const STATUS_VALUES = Object.freeze(Object.values(NOTIFICATION_STATUS));

// Imagem do post/foto/capa. Passa pelo mesmo validador do wallpaper: caminho
// do Foundry ou https terminando em extensão de imagem. Qualquer outra coisa
// vira null em vez de virar vetor de injeção no <img src>.
function normalizeImage(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim();
  return validateSourceUrl(url).valid ? url : null;
}

const AUDIO_EXTENSIONS = new Set(["mp3", "ogg", "wav", "webm"]);

function normalizeAudio(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const source = value.trim();
  if (isForbiddenProtocol(source) || !isAllowedWallpaperUrl(source)) return null;
  const extension = source.split(/[?#]/)[0].toLowerCase().split(".").pop();
  return AUDIO_EXTENSIONS.has(extension) ? source : null;
}

export function normalizeNotification(input = {}, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  return {
    id: typeof options.id === "string" && options.id ? options.id : randomId(),
    targetActorUuid:
      typeof input.targetActorUuid === "string" && input.targetActorUuid
        ? input.targetActorUuid
        : "all",
    sender: prepareNotificationText(
      input.sender ?? "",
      NOTIFICATION_TITLE_MAX,
      1,
    ),
    title: prepareNotificationText(
      input.title ?? "",
      NOTIFICATION_TITLE_MAX,
      1,
    ),
    body: prepareNotificationText(
      input.body ?? "",
      NOTIFICATION_BODY_MAX,
      NOTIFICATION_MAX_LINES,
    ),
    icon: typeof input.icon === "string" && input.icon ? input.icon : null,
    image: normalizeImage(input.image),
    audio: normalizeAudio(input.audio),
    // Foto de perfil de quem enviou (o "contato" do app de mensagens). Sem ela,
    // a interface desenha a inicial do nome em um círculo colorido.
    avatar: normalizeImage(input.avatar),
    app: typeof input.app === "string" && input.app ? input.app : "system",
    // Agrupa itens em conversa. Mensagens usam um thread por NPC; os outros
    // apps deixam nulo e cada item vira sua própria linha.
    thread:
      typeof input.thread === "string" && input.thread
        ? input.thread.slice(0, 64)
        : null,
    // Valor monetário do app Banco. Crédito positivo, débito negativo. Só
    // número finito entra; ausente ou inválido vira null e a linha aparece
    // sem valor em vez de mostrar um "0" que ninguém lançou.
    amount: Number.isFinite(input.amount) ? input.amount : null,
    createdAt: now,
    status: STATUS_VALUES.includes(input.status)
      ? input.status
      : NOTIFICATION_STATUS.UNREAD,
    expiresAt: Number.isFinite(input.expiresAt)
      ? input.expiresAt
      : now + ttlMs(),
  };
}

export function validateLimits(input = {}) {
  return {
    titleOverflow: countGraphemes(input.title ?? "") > NOTIFICATION_TITLE_MAX,
    bodyOverflow: countGraphemes(input.body ?? "") > NOTIFICATION_BODY_MAX,
  };
}

export function isExpired(notification, now = Date.now()) {
  return (
    Number.isFinite(notification?.expiresAt) && notification.expiresAt <= now
  );
}

export function isAddressedTo(notification, actorUuid) {
  if (notification?.targetActorUuid === "all") return true;
  return Boolean(actorUuid) && notification?.targetActorUuid === actorUuid;
}
