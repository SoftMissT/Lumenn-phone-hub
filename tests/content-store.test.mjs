import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupByThread,
  listByApp,
} from "../scripts/notifications/notification-store.mjs";
import {
  avatarHue,
  avatarInitial,
  buildStories,
} from "../scripts/apps/content/content-app.mjs";

const ACTOR = "Actor.abc";

function item(id, overrides = {}) {
  return {
    id,
    app: "system",
    targetActorUuid: "all",
    createdAt: 0,
    expiresAt: Number.MAX_SAFE_INTEGER,
    sender: "",
    title: id,
    body: "",
    ...overrides,
  };
}

test("listByApp recorta o store pelo app, sem duplicar nada", () => {
  const store = {
    a: item("a", { app: "messages" }),
    b: item("b", { app: "bank" }),
    c: item("c", { app: "messages" }),
  };
  const messages = listByApp(store, ACTOR, "messages");
  assert.equal(messages.length, 2);
  assert.deepEqual(
    messages.map((entry) => entry.id).sort(),
    ["a", "c"],
  );
  assert.equal(listByApp(store, ACTOR, "spotify").length, 0);
});

test("listByApp respeita o destinatário", () => {
  const store = {
    mine: item("mine", { app: "news", targetActorUuid: ACTOR }),
    other: item("other", { app: "news", targetActorUuid: "Actor.zzz" }),
  };
  const visible = listByApp(store, ACTOR, "news");
  assert.deepEqual(
    visible.map((entry) => entry.id),
    ["mine"],
  );
});

test("groupByThread agrupa, ordena dentro do thread e poe o recente no topo", () => {
  const items = [
    item("m1", { thread: "kael", createdAt: 100 }),
    item("m2", { thread: "kael", createdAt: 300 }),
    item("m3", { thread: "kael", createdAt: 200 }),
    item("m4", { thread: "mira", createdAt: 400 }),
  ];
  const threads = groupByThread(items);

  assert.equal(threads.length, 2);
  assert.deepEqual(
    threads.map((thread) => thread.id),
    ["mira", "kael"],
  );

  const kael = threads.find((thread) => thread.id === "kael");
  assert.deepEqual(
    kael.messages.map((entry) => entry.id),
    ["m1", "m3", "m2"],
  );
  assert.equal(kael.last.id, "m2");
});

test("groupByThread deixa item sem thread sozinho", () => {
  const threads = groupByThread([
    item("solo"),
    item("t1", { thread: "kael", createdAt: 10 }),
  ]);
  assert.equal(threads.length, 2);
  const solo = threads.find((thread) => thread.id === "solo");
  assert.equal(solo.messages.length, 1);
  assert.equal(solo.last.id, "solo");
});

test("groupByThread lida com lista vazia", () => {
  assert.deepEqual(groupByThread([]), []);
  assert.deepEqual(groupByThread(), []);
});

test("buildStories pega no máximo 8 itens com imagem, deduplicando por remetente", () => {
  const items = [
    { id: "1", sender: "kael", image: "a.png" },
    { id: "2", sender: "kael", image: "b.png" },
    { id: "3", sender: "mira", image: "c.png" },
    { id: "4", sender: "ana", image: null },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `x${i}`,
      sender: `npc${i}`,
      image: "i.png",
    })),
  ];
  const stories = buildStories(items);
  assert.equal(stories.length, 8);
  assert.equal(new Set(stories.map((s) => s.sender)).size, stories.length);
  assert.ok(stories.every((s) => s.image));
});

test("buildStories ignora itens sem imagem e lida com lista vazia", () => {
  assert.deepEqual(buildStories([]), []);
  assert.deepEqual(buildStories(), []);
  assert.equal(buildStories([{ id: "a", sender: "x", image: null }]).length, 0);
});

test("avatarInitial usa a primeira letra e tolera nome vazio", () => {
  assert.equal(avatarInitial("kael"), "K");
  assert.equal(avatarInitial("  mira"), "M");
  assert.equal(avatarInitial("Átila"), "Á");
  assert.equal(avatarInitial(""), "?");
  assert.equal(avatarInitial(null), "?");
});

test("avatarHue é estável, fica na faixa de matiz e separa nomes diferentes", () => {
  assert.equal(avatarHue("Kael"), avatarHue("Kael"));
  assert.ok(avatarHue("Kael") >= 0 && avatarHue("Kael") < 360);
  assert.notEqual(avatarHue("Kael"), avatarHue("Mira"));
  assert.equal(avatarHue(""), 0);
});
