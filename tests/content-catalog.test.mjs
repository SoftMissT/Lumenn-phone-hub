import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTENT_APPS } from "../scripts/apps/content/content-catalog.mjs";

const TILE = /^(#[0-9A-Fa-f]{3,8}|(linear|radial)-gradient\()/;

test("os seis apps têm glifo de marca e cor de ladrilho", () => {
  assert.equal(CONTENT_APPS.length, 6);
  for (const app of CONTENT_APPS) {
    assert.equal(typeof app.brand, "string", `${app.id}.brand ausente`);
    assert.ok(app.brand.includes("fa-"), `${app.id}.brand não é classe FA`);
    assert.match(app.tile, TILE, `${app.id}.tile inválido`);
  }
});

test("Instagram e Spotify usam o pacote de marcas do Foundry", () => {
  const byId = (id) => CONTENT_APPS.find((app) => app.id === id);
  assert.equal(byId("instagram").brand, "fa-brands fa-instagram");
  assert.equal(byId("spotify").brand, "fa-brands fa-spotify");
});

test("nenhum ladrilho é branco ou cinza claro (glifo branco sumiria)", () => {
  for (const app of CONTENT_APPS) {
    assert.doesNotMatch(app.tile, /#f{3,8}\b/i, `${app.id}: ladrilho claro demais`);
  }
});
