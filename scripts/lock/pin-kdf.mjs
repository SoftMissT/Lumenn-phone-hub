/**
 * Lumenn Phone Hub - PIN & KDF Security Module
 * Implementa validação, hashing (PBKDF2-HMAC-SHA-256) e verificação de PIN de 6 dígitos.
 */

export const PIN_BLOCKLIST = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
]);

import { PIN_LENGTH, ERROR_CODES } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { LumennError } from "../core/errors.mjs";
import { pbkdf2HmacSha256 } from "./pin-kdf-fallback.mjs";

export const KDF_CONFIG = {
  iterations: 600000,
  dkLen: 32,
  saltLen: 16,
};

/**
 * Converte Uint8Array para Base64URL string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converte Base64URL string para Uint8Array.
 * @param {string} b64u
 * @returns {Uint8Array}
 */
export function fromBase64Url(b64u) {
  let base64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Valida se um PIN atende a política de segurança de 6 dígitos e não está na blocklist.
 * @param {string} pin
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePinPolicy(pin) {
  if (typeof pin !== "string") {
    return {
      valid: false,
      code: ERROR_CODES.INVALID_PIN,
      reason: "PIN inválido.",
    };
  }
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    return {
      valid: false,
      code: ERROR_CODES.INVALID_PIN,
      reason: `O PIN deve conter exatamente ${PIN_LENGTH} dígitos numéricos.`,
    };
  }
  if (PIN_BLOCKLIST.has(pin)) {
    return {
      valid: false,
      code: ERROR_CODES.PIN_POLICY,
      reason: "Este PIN é muito comum e inseguro. Escolha outro.",
    };
  }
  return { valid: true, code: null, reason: "" };
}

/**
 * Deriva a chave usando SubtleCrypto quando disponível, ou implementação adaptada.
 * @param {string} pin
 * @param {Uint8Array} salt
 * @param {number} iterations
 * @returns {Promise<Uint8Array>}
 */
async function deriveKey(pin, salt, iterations) {
  const pinBytes = new TextEncoder().encode(pin);

  if (globalThis.crypto && globalThis.crypto.subtle) {
    try {
      const keyMaterial = await globalThis.crypto.subtle.importKey(
        "raw",
        pinBytes,
        { name: "PBKDF2" },
        false,
        ["deriveBits"],
      );

      const derived = await globalThis.crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt,
          iterations,
          hash: "SHA-256",
        },
        keyMaterial,
        KDF_CONFIG.dkLen * 8,
      );

      return new Uint8Array(derived);
    } catch (error) {
      Logger.warn("Web Crypto PBKDF2 falhou; usando fallback puro JS.", error);
    }
  } else {
    Logger.warn(
      "crypto.subtle indisponível (contexto HTTP sem SSL). Usando fallback PBKDF2 puro em JS.",
    );
  }

  return pbkdf2HmacSha256(pinBytes, salt, iterations, KDF_CONFIG.dkLen);
}

/**
 * Cria o registro hash/verificador para um novo PIN.
 * @param {string} pin
 * @returns {Promise<PinRecord>}
 */
export async function createPinRecord(pin) {
  const validation = validatePinPolicy(pin);
  if (!validation.valid) {
    throw new LumennError(
      validation.code ?? ERROR_CODES.INVALID_PIN,
      validation.reason,
    );
  }

  const salt = new Uint8Array(KDF_CONFIG.saltLen);
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    globalThis.crypto.getRandomValues(salt);
  } else {
    for (let i = 0; i < salt.length; i++)
      salt[i] = Math.floor(Math.random() * 256);
  }

  const derived = await deriveKey(pin, salt, KDF_CONFIG.iterations);

  return {
    v: 1,
    kdf: "PBKDF2-HMAC-SHA-256",
    saltB64u: toBase64Url(salt),
    iterations: KDF_CONFIG.iterations,
    dkLen: KDF_CONFIG.dkLen,
    verifierB64u: toBase64Url(derived),
  };
}

/**
 * Valida um PIN digitado contra o registro salvo.
 * @param {string} pin
 * @param {PinRecord} pinRecord
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin, pinRecord) {
  if (!pinRecord || !pinRecord.saltB64u || !pinRecord.verifierB64u) {
    return false;
  }

  const salt = fromBase64Url(pinRecord.saltB64u);
  const expected = fromBase64Url(pinRecord.verifierB64u);
  const actual = await deriveKey(
    pin,
    salt,
    pinRecord.iterations || KDF_CONFIG.iterations,
  );

  if (actual.byteLength !== expected.byteLength) return false;

  // Comparação em tempo constante
  let diff = 0;
  for (let i = 0; i < actual.byteLength; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}
