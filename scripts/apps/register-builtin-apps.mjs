import { AppRegistry } from "./app-registry.mjs";
import { settingsApp } from "./settings/settings-app.mjs";
import { gmCentralApp } from "./gm/gm-central-app.mjs";
import { gmInspectorApp } from "./gm/gm-inspector-app.mjs";
import { registerContentApps } from "./content/content-app.mjs";

export function registerBuiltinApps() {
  AppRegistry.register(settingsApp);
  AppRegistry.register(gmCentralApp);
  AppRegistry.register(gmInspectorApp);
  registerContentApps(AppRegistry);
  return AppRegistry.list();
}
