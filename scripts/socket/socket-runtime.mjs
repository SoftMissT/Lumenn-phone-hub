import {
  ERROR_CODES,
  HOOKS,
  SOCKET_NAMESPACE,
  SOCKET_TIMEOUT_MS,
} from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { LumennError } from "../core/errors.mjs";
import {
  createEnvelope,
  validateEnvelope,
  addressesUser,
} from "./socket-envelope.mjs";
import { LumennRepository } from "../persistence/repository.mjs";

const pending = new Map();
let initialized = false;

async function handleOperation(operation, payload = {}) {
  switch (operation) {
    case "lph-update-phone":
      return LumennRepository.updatePhone(payload.actorUuid, payload.patch);
    case "lph-create-notification":
      return LumennRepository.createNotification(payload);
    case "lph-mark-read":
      return LumennRepository.markNotificationRead(
        payload.actorUuid,
        payload.ids,
      );
    case "lph-dismiss":
      return LumennRepository.dismissNotification(
        payload.actorUuid,
        payload.ids,
      );
    default:
      throw new LumennError(
        ERROR_CODES.INVALID_ARGUMENT,
        `Operação desconhecida: ${operation}`,
      );
  }
}

export function socketRequest(
  operation,
  payload,
  timeoutMs = SOCKET_TIMEOUT_MS,
) {
  if (globalThis.game?.user?.isGM === true)
    return handleOperation(operation, payload);
  const socket = globalThis.game?.socket;
  if (!socket) {
    return Promise.reject(
      new LumennError(ERROR_CODES.NO_AUTHORITY, "Sockets indisponíveis."),
    );
  }

  return new Promise((resolve, reject) => {
    const envelope = createEnvelope({
      kind: "request",
      operation,
      payload,
      recipients: "gm",
      sender: globalThis.game.user.id,
    });

    const timer = setTimeout(() => {
      pending.delete(envelope.operationId);
      reject(
        new LumennError(
          ERROR_CODES.SOCKET_TIMEOUT,
          `Timeout na operação ${operation}.`,
        ),
      );
    }, timeoutMs);

    pending.set(envelope.operationId, { resolve, reject, timer });
    socket.emit(SOCKET_NAMESPACE, envelope);
  });
}

function broadcastNotification(notification) {
  const socket = globalThis.game?.socket;
  if (!socket || globalThis.game?.user?.isGM !== true) return;
  socket.emit(
    SOCKET_NAMESPACE,
    createEnvelope({
      kind: "sync",
      operation: "lph-notification-created",
      payload: notification,
      recipients: "all",
      sender: globalThis.game.user.id,
      authorityUserId: globalThis.game.user.id,
    }),
  );
}

async function handleRequest(envelope) {
  const socket = globalThis.game.socket;
  const senderUser = globalThis.game?.users?.get(envelope.sender);
  if (!senderUser) {
    Logger.warn("Requisição de remetente desconhecido ignorada.");
    return;
  }
  try {
    const result = await handleOperation(
      envelope.operation,
      envelope.payload ?? {},
    );
    socket.emit(
      SOCKET_NAMESPACE,
      createEnvelope({
        kind: "result",
        operation: envelope.operation,
        operationId: envelope.operationId,
        payload: result,
        recipients: [envelope.sender],
        sender: globalThis.game.user.id,
        authorityUserId: globalThis.game.user.id,
      }),
    );
  } catch (error) {
    Logger.error("Erro ao processar requisição:", error);
    socket.emit(
      SOCKET_NAMESPACE,
      createEnvelope({
        kind: "error",
        operation: envelope.operation,
        operationId: envelope.operationId,
        payload: { message: error?.message ?? "Erro remoto." },
        recipients: [envelope.sender],
        sender: globalThis.game.user.id,
        authorityUserId: globalThis.game.user.id,
      }),
    );
  }
}

function resolvePending(envelope) {
  const entry = pending.get(envelope.operationId);
  if (!entry) return false;
  if (!addressesUser(envelope.recipients, globalThis.game.user.id)) return true;
  pending.delete(envelope.operationId);
  clearTimeout(entry.timer);
  if (envelope.kind === "error")
    entry.reject(new Error(envelope.payload?.message ?? "Erro remoto."));
  else entry.resolve(envelope.payload);
  return true;
}

async function onMessage(envelope) {
  const { valid, reason } = validateEnvelope(envelope);
  if (!valid) {
    Logger.debug("Envelope ignorado:", reason);
    return;
  }

  if (envelope.kind === "result" || envelope.kind === "error") {
    resolvePending(envelope);
    return;
  }

  if (envelope.kind === "sync") {
    if (envelope.operation === "lph-notification-created") {
      globalThis.Hooks?.callAll?.(
        HOOKS.NOTIFICATION_RECEIVED,
        envelope.payload,
      );
    }
    return;
  }

  // Só o GM ATIVO responde. Um evento de socket chega em TODOS os clientes, e
  // o Foundry permite vários GMs logados ao mesmo tempo: sem a eleição, cada
  // cliente de GM processava o mesmo pedido e uma mensagem virava quatro
  // notificações (uma por GM, vezes cada destinatário).
  // game.user.isActiveGM é o GM que o próprio Foundry elege.
  if (envelope.kind === "request" && globalThis.game?.user?.isActiveGM === true) {
    await handleRequest(envelope);
  }
}

function onLocalNotification(notification) {
  broadcastNotification(notification);
  globalThis.Hooks?.callAll?.(HOOKS.NOTIFICATION_RECEIVED, notification);
}

export function initSocket() {
  if (initialized) return true;
  const socket = globalThis.game?.socket;
  if (!socket) {
    Logger.warn("game.socket indisponível; operando sem sincronização.");
    return false;
  }
  socket.on(SOCKET_NAMESPACE, onMessage);
  globalThis.Hooks?.on?.(HOOKS.NOTIFICATION_CREATED, onLocalNotification);
  initialized = true;
  Logger.info("Socket runtime V1 inicializado.");
  return true;
}
