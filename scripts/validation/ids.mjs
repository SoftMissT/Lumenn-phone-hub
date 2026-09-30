const HEX = "0123456789abcdef";
const ACTOR_UUID_RE = /^Actor\.[A-Za-z0-9]{16}$/;
const DOCUMENT_UUID_RE = /^[A-Za-z]+\.[A-Za-z0-9]{16}(\.[A-Za-z0-9]{1,})*$/;

export function isActorUuid(value) {
  return typeof value === "string" && ACTOR_UUID_RE.test(value);
}

export function isDocumentUuid(value) {
  return typeof value === "string" && DOCUMENT_UUID_RE.test(value);
}

export function randomId(length = 16) {
  const size = Math.max(1, Math.trunc(length));
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const bytes = new Uint8Array(size);
    cryptoObj.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < size; i += 1) out += HEX[bytes[i] & 15];
    return out;
  }
  let out = "";
  for (let i = 0; i < size; i += 1) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}
