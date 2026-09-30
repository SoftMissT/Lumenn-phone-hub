import assert from "node:assert";
import { webcrypto } from "node:crypto";
import { hmacSha256, pbkdf2HmacSha256, sha256 } from "../scripts/lock/pin-kdf-fallback.mjs";

console.log("Executando testes: KDF Fallback (SHA-256 / HMAC / PBKDF2)...");

const subtle = webcrypto.subtle;
const encoder = new TextEncoder();

async function subtleSha256(bytes) {
  const buffer = await subtle.digest("SHA-256", bytes);
  return new Uint8Array(buffer);
}

async function subtleHmac(key, data) {
  const cryptoKey = await subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

async function subtlePbkdf2(password, salt, iterations, dkLen) {
  const cryptoKey = await subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const out = await subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    cryptoKey,
    dkLen * 8
  );
  return new Uint8Array(out);
}

const shaVectors = ["", "abc", "The quick brown fox jumps over the lazy dog", "a", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"];
for (const value of shaVectors) {
  const expected = await subtleSha256(encoder.encode(value));
  assert.deepStrictEqual(sha256(encoder.encode(value)), expected, `SHA-256 mismatch for: ${value.slice(0, 32)}`);
}

const hmacVectors = [
  { key: encoder.encode("key"), data: encoder.encode("The quick brown fox jumps over the lazy dog") },
  { key: encoder.encode("Jefe"), data: encoder.encode("what do ya want for nothing?") },
  { key: new Uint8Array(64), data: encoder.encode("") }
];
for (const vector of hmacVectors) {
  const expected = await subtleHmac(vector.key, vector.data);
  assert.deepStrictEqual(hmacSha256(vector.key, vector.data), expected, "HMAC-SHA-256 mismatch");
}

const pbkdfVectors = [
  { password: "password", salt: "salt", iterations: 1, dkLen: 20 },
  { password: "Password", salt: "NaCl", iterations: 2, dkLen: 32 },
  { password: "passwordPASSWORDpassword", salt: "saltSALTsaltSALTsaltSALTsaltSALTsalt", iterations: 4096, dkLen: 40 },
  { password: "pass\0word", salt: "sa\0lt", iterations: 100, dkLen: 32 },
  { password: "Password", salt: "NaCl", iterations: 80000, dkLen: 64 }
];
for (const vector of pbkdfVectors) {
  const expected = await subtlePbkdf2(vector.password, encoder.encode(vector.salt), vector.iterations, vector.dkLen);
  const actual = pbkdf2HmacSha256(encoder.encode(vector.password), encoder.encode(vector.salt), vector.iterations, vector.dkLen);
  assert.deepStrictEqual(actual, expected, `PBKDF2 mismatch (iter=${vector.iterations}, dkLen=${vector.dkLen})`);
}

assert.throws(() => pbkdf2HmacSha256(encoder.encode("p"), encoder.encode("s"), 0, 32), /iterations/);
assert.throws(() => pbkdf2HmacSha256(encoder.encode("p"), encoder.encode("s"), 1, 0), /dkLen/);

console.log("✅ KDF Fallback: SHA-256, HMAC-SHA-256 e PBKDF2-HMAC-SHA-256 coincidem com Web Crypto.");
