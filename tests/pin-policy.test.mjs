import assert from "node:assert";
import { validatePinPolicy, PIN_BLOCKLIST } from "../scripts/lock/pin-kdf.mjs";

console.log("Executando testes: PIN Policy & Blocklist...");

// 1. Testa PINs válidos
assert.strictEqual(validatePinPolicy("948201").valid, true);
assert.strictEqual(validatePinPolicy("081923").valid, true);

// 2. Testa tamanho incorreto
assert.strictEqual(validatePinPolicy("12345").valid, false);
assert.strictEqual(validatePinPolicy("1234567").valid, false);

// 3. Testa caracteres não numéricos
assert.strictEqual(validatePinPolicy("12345a").valid, false);
assert.strictEqual(validatePinPolicy("abcdef").valid, false);

// 4. Testa blocklist
for (const badPin of PIN_BLOCKLIST) {
    assert.strictEqual(validatePinPolicy(badPin).valid, false, `Falha ao bloquear PIN trivial: ${badPin}`);
}

console.log("✅ Todos os testes de PIN Policy passaram!");
