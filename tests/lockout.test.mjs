import assert from "node:assert";
import { LockoutService } from "../scripts/lock/lockout-service.mjs";

console.log("Executando testes: Lockout Service...");

const actorUuid = "Actor.test123456";

// Estado inicial: sem bloqueio
const initial = LockoutService.getLockoutState(actorUuid);
assert.strictEqual(initial.isLocked, false);
assert.strictEqual(initial.attemptCount, 0);

// Falha 1: 500 ms cooldown
const f1 = LockoutService.recordFailure(actorUuid);
assert.strictEqual(f1.isLocked, true);
assert.strictEqual(f1.attemptCount, 1);
assert.strictEqual(f1.remainingMs, 500);

// Falha 5: 30s
LockoutService.recordFailure(actorUuid);
LockoutService.recordFailure(actorUuid);
LockoutService.recordFailure(actorUuid);
const f5 = LockoutService.recordFailure(actorUuid);
assert.strictEqual(f5.attemptCount, 5);
assert.strictEqual(f5.remainingMs, 30000);

// Sucesso reseta tudo
LockoutService.recordSuccess(actorUuid);
const afterSuccess = LockoutService.getLockoutState(actorUuid);
assert.strictEqual(afterSuccess.isLocked, false);
assert.strictEqual(afterSuccess.attemptCount, 0);

console.log("✅ Todos os testes de Lockout Service passaram!");
