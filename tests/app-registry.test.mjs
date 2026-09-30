import assert from "node:assert";
import { AppRegistry } from "../scripts/apps/app-registry.mjs";
import { normalizeAppDefinition } from "../scripts/apps/app-contract.mjs";

console.log("Executando testes: App Registry...");

AppRegistry.clear();
assert.strictEqual(AppRegistry.count(), 0);

const settings = AppRegistry.register({
  id: "settings",
  name: "LPH.Apps.Settings",
  icon: "fas fa-cog",
  order: 10,
  dockEligible: true
});
assert.strictEqual(settings.id, "settings");
assert.ok(Object.isFrozen(settings));
assert.strictEqual(AppRegistry.count(), 1);

AppRegistry.register({ id: "messages", order: 5, playerVisible: true });
AppRegistry.register({ id: "admin", order: 1, playerVisible: false, gmPanel: true });

assert.deepStrictEqual(AppRegistry.list().map((a) => a.id), ["admin", "messages", "settings"]);
assert.deepStrictEqual(AppRegistry.list({ playerVisible: true }).map((a) => a.id), ["messages", "settings"]);
assert.deepStrictEqual(AppRegistry.list({ dockEligible: true }).map((a) => a.id), ["settings"]);
assert.deepStrictEqual(AppRegistry.list({ gmPanel: true }).map((a) => a.id), ["admin"]);

assert.strictEqual(AppRegistry.get("settings").order, 10);
assert.strictEqual(AppRegistry.get("missing"), null);
assert.strictEqual(AppRegistry.has("admin"), true);

assert.throws(() => normalizeAppDefinition({ id: "Bad Id" }), { name: "LumennError" });
assert.throws(() => normalizeAppDefinition(null), { name: "LumennError" });
assert.throws(() => AppRegistry.register({}), { name: "LumennError" });

const replacement = AppRegistry.register({ id: "messages", order: 2 });
assert.strictEqual(replacement.order, 2);
assert.strictEqual(AppRegistry.count(), 3);

assert.strictEqual(AppRegistry.unregister("messages"), true);
assert.strictEqual(AppRegistry.has("messages"), false);

AppRegistry.clear();
assert.strictEqual(AppRegistry.count(), 0);

// Regressão: normalizeAppDefinition é uma whitelist que descarta em silêncio
// qualquer campo fora de APP_CONTRACT_FIELDS — se "brand"/"tile" saírem da
// lista, o ladrilho some da UI sem nenhum erro.
const branded = AppRegistry.register({
  id: "instagram",
  brand: "fa-brands fa-instagram",
  tile: "#1DB954"
});
assert.strictEqual(branded.brand, "fa-brands fa-instagram");
assert.strictEqual(branded.tile, "#1DB954");
assert.strictEqual(
  AppRegistry.register({ id: "plain", icon: "fas fa-cog" }).brand,
  "fas fa-cog"
);
assert.strictEqual(AppRegistry.register({ id: "bare" }).tile, null);

console.log("✅ App Registry: todos os testes passaram.");
