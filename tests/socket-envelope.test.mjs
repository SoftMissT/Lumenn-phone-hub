import assert from "node:assert";
import {
  addressesUser,
  createEnvelope,
  ENVELOPE_KINDS,
  validateEnvelope
} from "../scripts/socket/socket-envelope.mjs";

console.log("Executando testes: Socket Envelope V1...");

const envelope = createEnvelope({
  kind: "request",
  operation: "lph-update-phone",
  sender: "user-1",
  payload: { actorUuid: "Actor.ABCDEF0123456789" }
});

assert.strictEqual(envelope.protocol, "lumenn");
assert.strictEqual(envelope.version, 1);
assert.strictEqual(envelope.kind, "request");
assert.strictEqual(envelope.recipients, "gm");
assert.strictEqual(envelope.attempt, 0);
assert.strictEqual(envelope.sender, "user-1");
assert.strictEqual(typeof envelope.operationId, "string");
assert.strictEqual(envelope.operationId.length, 16);

assert.deepStrictEqual([...ENVELOPE_KINDS], ["request", "accepted", "result", "error", "sync", "heartbeat"]);
assert.strictEqual(validateEnvelope(envelope).valid, true);

assert.strictEqual(validateEnvelope(null).valid, false);
assert.strictEqual(validateEnvelope({}).valid, false);
assert.strictEqual(validateEnvelope({ ...envelope, protocol: "other" }).valid, false);
assert.strictEqual(validateEnvelope({ ...envelope, version: 2 }).valid, false);
assert.strictEqual(validateEnvelope({ ...envelope, kind: "nope" }).valid, false);
assert.strictEqual(validateEnvelope({ ...envelope, operation: "" }).valid, false);
assert.strictEqual(validateEnvelope({ ...envelope, operationId: "" }).valid, false);
assert.strictEqual(validateEnvelope({ ...envelope, sender: "" }).valid, false);

assert.strictEqual(addressesUser("all", "anyone"), true);
assert.strictEqual(addressesUser(["user-1"], "user-1"), true);
assert.strictEqual(addressesUser(["user-2"], "user-1"), false);
assert.strictEqual(addressesUser("gm", "user-1"), false);

const reused = createEnvelope({ kind: "result", operation: "op", sender: "gm", operationId: envelope.operationId });
assert.strictEqual(reused.operationId, envelope.operationId);

console.log("✅ Socket Envelope: todos os testes passaram.");
