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

test("Instagram usa o pacote de marcas; musica usa glifo generico", () => {
  const byId = (id) => CONTENT_APPS.find((app) => app.id === id);
  // Instagram continua sendo Instagram, entao usa o pacote de marcas.
  assert.equal(byId("instagram").brand, "fa-brands fa-instagram");
  // Musica nao e integracao Spotify: nao existe login, nem player, nem
  // reproducao - e um cartao "tocando agora" alimentado por notificacao.
  // Manter o logo da Spotify prometeria uma integracao inexistente e usaria
  // marca de terceiro sem uso real.
  assert.equal(byId("spotify").brand, "fas fa-music");
  assert.doesNotMatch(byId("spotify").brand, /fa-brands/);
});

test("nenhum ladrilho é branco ou cinza claro (glifo branco sumiria)", () => {
  for (const app of CONTENT_APPS) {
    assert.doesNotMatch(app.tile, /#f{3,8}\b/i, `${app.id}: ladrilho claro demais`);
  }
});
