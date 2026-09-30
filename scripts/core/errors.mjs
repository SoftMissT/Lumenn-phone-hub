import { ERROR_CODES } from "./constants.mjs";

export class LumennError extends Error {
  constructor(code, message, details = {}) {
    super(message || code);
    this.name = "LumennError";
    this.code = code;
    this.details = details;
  }
}

export function isLumennError(value) {
  return value instanceof LumennError;
}

export function fail(code, message, details) {
  throw new LumennError(code, message, details);
}

export function toUserMessage(code, fallback = "") {
  const i18n = globalThis.game?.i18n;
  if (i18n) {
    const key = `LPH.Errors.${code}`;
    const localized = i18n.localize(key);
    if (typeof localized === "string" && localized && localized !== key)
      return localized;
  }
  return fallback || code || ERROR_CODES.INVALID_ARGUMENT;
}
