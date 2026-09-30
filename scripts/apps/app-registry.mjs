import { HOOKS } from "../core/constants.mjs";
import { normalizeAppDefinition } from "./app-contract.mjs";

const registry = new Map();

function sortApps(apps) {
  return apps.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export const AppRegistry = {
  register(definition) {
    const app = normalizeAppDefinition(definition);
    registry.set(app.id, app);
    globalThis.Hooks?.callAll?.(HOOKS.APP_REGISTERED, app);
    return app;
  },

  unregister(id) {
    return registry.delete(id);
  },

  get(id) {
    return registry.get(id) ?? null;
  },

  has(id) {
    return registry.has(id);
  },

  list(filter = {}) {
    let apps = [...registry.values()];
    if (filter.playerVisible === true)
      apps = apps.filter((app) => app.playerVisible);
    if (filter.dockEligible === true)
      apps = apps.filter((app) => app.dockEligible);
    if (filter.gmPanel === true) apps = apps.filter((app) => app.gmPanel);
    return sortApps(apps);
  },

  clear() {
    registry.clear();
  },

  count() {
    return registry.size;
  },
};
