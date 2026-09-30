import assert from "node:assert";
import {
  listForActor,
  pruneExpired,
  pruneToLimit,
  unreadCount,
  withStatus
} from "../scripts/notifications/notification-store.mjs";

console.log("Executando testes: Notification Store...");

const notifications = {
  a: { id: "a", targetActorUuid: "Actor.A", title: "A1", createdAt: 100, expiresAt: 100000 },
  b: { id: "b", targetActorUuid: "all", title: "B1", createdAt: 200, expiresAt: 100000 },
  c: { id: "c", targetActorUuid: "Actor.C", title: "C1", createdAt: 300, expiresAt: 100000 },
  d: { id: "d", targetActorUuid: "Actor.A", title: "expired", createdAt: 400, expiresAt: 500 }
};
const now = 1000;

assert.deepStrictEqual(listForActor(notifications, "Actor.A", {}, { now }).map((n) => n.id), ["b", "a"]);
assert.strictEqual(unreadCount(notifications, "Actor.A", {}, { now }), 2);

const read = withStatus({}, ["a"], "read");
assert.strictEqual(listForActor(notifications, "Actor.A", read, { now }).find((n) => n.id === "a").status, "read");
assert.strictEqual(unreadCount(notifications, "Actor.A", read, { now }), 1);

const dismissed = withStatus({}, ["a", "b"], "dismissed");
assert.deepStrictEqual(listForActor(notifications, "Actor.A", dismissed, { now }).map((n) => n.id), []);
assert.strictEqual(unreadCount(notifications, "Actor.A", dismissed, { now }), 0);

assert.deepStrictEqual(
  listForActor(notifications, "Actor.C", {}, { now }).map((n) => n.id),
  ["c", "b"]
);

assert.deepStrictEqual(Object.keys(pruneExpired(notifications, now)).sort(), ["a", "b", "c"]);

const limited = pruneToLimit({
  ...notifications,
  e: { id: "e", createdAt: 500, expiresAt: 100000 },
  f: { id: "f", createdAt: 600, expiresAt: 100000 }
}, 4);
assert.strictEqual(Object.keys(limited).length, 4);
assert.ok(Object.prototype.hasOwnProperty.call(limited, "f"));
assert.ok(!Object.prototype.hasOwnProperty.call(limited, "a"));

assert.deepStrictEqual(withStatus(undefined, "x", "read"), { x: "read" });
assert.deepStrictEqual(withStatus({ y: "unread" }, ["x", "y"], "dismissed"), { y: "dismissed", x: "dismissed" });

console.log("✅ Notification Store: todos os testes passaram.");
