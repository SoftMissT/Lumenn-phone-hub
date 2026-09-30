import assert from "node:assert/strict";
import { test } from "node:test";
import { toggleLikedMap } from "../scripts/core/preferences.mjs";

test("toggleLikedMap curte, descurte e não muta o mapa original", () => {
  const start = {};

  const first = toggleLikedMap(start, "a");
  assert.deepEqual(first.liked, { a: true });
  assert.equal(first.isLiked, true);
  assert.deepEqual(start, {}, "mutou o objeto original");

  const second = toggleLikedMap(first.liked, "a");
  assert.deepEqual(second.liked, {});
  assert.equal(second.isLiked, false);

  const third = toggleLikedMap(first.liked, "b");
  assert.deepEqual(third.liked, { a: true, b: true });
});

test("toggleLikedMap tolera mapa ausente", () => {
  assert.deepEqual(toggleLikedMap(undefined, "x").liked, { x: true });
  assert.deepEqual(toggleLikedMap(null, "x").liked, { x: true });
  assert.deepEqual(toggleLikedMap({}, "x").liked, { x: true });
});

test("toggleLikedMap não quebra com id ausente (quem filtra é o chamador)", () => {
  assert.doesNotThrow(() => toggleLikedMap({}, ""));
  assert.doesNotThrow(() => toggleLikedMap({}, undefined));
});
