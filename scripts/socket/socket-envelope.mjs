import { PROTOCOL, PROTOCOL_VERSION } from "../core/constants.mjs";
import { randomId } from "../validation/ids.mjs";

export const ENVELOPE_KINDS = Object.freeze(["request", "accepted", "result", "error", "sync", "heartbeat"]);

const RECIPIENT_TOKENS = new Set(["all", "gm"]);

export function createEnvelope(input = {}) {
  return {
    protocol: PROTOCOL,
    version: PROTOCOL_VERSION,
    kind: input.kind,
    operation: input.operation,
    operationId: input.operationId ?? randomId(),
    sender: input.sender ?? null,
    recipients: input.recipients ?? "gm",
    authorityUserId: input.authorityUserId ?? null,
    authorityEpoch: Number.isFinite(input.authorityEpoch) ? input.authorityEpoch : null,
    attempt: Number.isFinite(input.attempt) ? input.attempt : 0,
    expiresAt: Number.isFinite(input.expiresAt) ? input.expiresAt : null,
    payload: input.payload ?? null
  };
}

export function isRecipientToken(value) {
  return RECIPIENT_TOKENS.has(value);
}

export function validateEnvelope(value) {
  if (!value || typeof value !== "object") return { valid: false, reason: "envelope ausente" };
  if (value.protocol !== PROTOCOL) return { valid: false, reason: "protocolo inválido" };
  if (value.version !== PROTOCOL_VERSION) return { valid: false, reason: "versão inválida" };
  if (!ENVELOPE_KINDS.includes(value.kind)) return { valid: false, reason: "kind inválido" };
  if (typeof value.operation !== "string" || value.operation.length === 0) {
    return { valid: false, reason: "operation ausente" };
  }
  if (typeof value.operationId !== "string" || value.operationId.length === 0) {
    return { valid: false, reason: "operationId ausente" };
  }
  if (typeof value.sender !== "string" || value.sender.length === 0) {
    return { valid: false, reason: "sender ausente" };
  }
  return { valid: true, reason: "" };
}

export function addressesUser(recipients, userId) {
  if (recipients === "all") return true;
  if (Array.isArray(recipients)) return recipients.includes(userId);
  return false;
}
