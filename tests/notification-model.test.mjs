import assert from "node:assert";
import { test } from "node:test";
import {
  isAddressedTo,
  isExpired,
  normalizeNotification,
  NOTIFICATION_STATUS,
  validateLimits
} from "../scripts/notifications/notification-model.mjs";

console.log("Executando testes: Notification Model...");

const actor = "Actor.ABCDEF0123456789";
const notification = normalizeNotification({
  targetActorUuid: actor,
  sender: "GM",
  title: "Oi",
  body: "linha1\nlinha2"
}, { now: 1000, id: "abc" });

assert.strictEqual(notification.id, "abc");
assert.strictEqual(notification.targetActorUuid, actor);
assert.strictEqual(notification.title, "Oi");
assert.strictEqual(notification.status, NOTIFICATION_STATUS.UNREAD);
assert.strictEqual(notification.createdAt, 1000);
assert.ok(notification.expiresAt > 1000);

assert.strictEqual(normalizeNotification({}, { now: 0 }).targetActorUuid, "all");

const long = normalizeNotification({ title: "x".repeat(200), body: "y".repeat(1000) }, { now: 0 });
assert.strictEqual(long.title.length, 80);
assert.strictEqual(long.body.length, 500);

const multiline = normalizeNotification(
  { body: Array.from({ length: 30 }, (_value, index) => `l${index}`).join("\n") },
  { now: 0 }
);
assert.ok(multiline.body.split("\n").length <= 20);

assert.deepStrictEqual(validateLimits({ title: "a".repeat(81), body: "b" }), {
  titleOverflow: true,
  bodyOverflow: false
});

assert.strictEqual(isExpired({ expiresAt: 5 }, 6), true);
assert.strictEqual(isExpired({ expiresAt: 5 }, 4), false);
assert.strictEqual(isExpired({}, 999), false);

assert.strictEqual(isAddressedTo({ targetActorUuid: "all" }, null), true);
assert.strictEqual(isAddressedTo({ targetActorUuid: actor }, actor), true);
assert.strictEqual(isAddressedTo({ targetActorUuid: actor }, "Actor.OTHER00000000"), false);
assert.strictEqual(isAddressedTo({ targetActorUuid: actor }, null), false);

console.log("✅ Notification Model: todos os testes passaram.");

test("normalizeNotification guarda imagem válida", () => {
  const note = normalizeNotification({ image: "lumenn-phone-hub/post.png" });
  assert.equal(note.image, "lumenn-phone-hub/post.png");
});

test("normalizeNotification rejeita protocolo proibido e link de página", () => {
  assert.equal(normalizeNotification({ image: "javascript:alert(1)" }).image, null);
  assert.equal(normalizeNotification({ image: "https://evil.example/a.html" }).image, null);
  assert.equal(normalizeNotification({ image: "" }).image, null);
  assert.equal(normalizeNotification({}).image, null);
});
