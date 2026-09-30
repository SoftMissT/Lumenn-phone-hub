import { LumennError, fail } from "../core/errors.mjs";
import { ERROR_CODES } from "../core/constants.mjs";

export function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function requiredString(value, name = "value") {
  if (typeof value !== "string" || value.length === 0) {
    fail(ERROR_CODES.INVALID_ARGUMENT, `${name} deve ser uma string não vazia.`, { name });
  }
  return value;
}

export function optionalString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function clampInt(value, min, max, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

export function assert(condition, code = ERROR_CODES.INVALID_ARGUMENT, message = "", details) {
  if (!condition) throw new LumennError(code, message, details);
}

export function assertPlainObject(value, name = "value") {
  if (!isPlainObject(value)) {
    fail(ERROR_CODES.INVALID_ARGUMENT, `${name} deve ser um objeto simples.`, { name });
  }
  return value;
}
