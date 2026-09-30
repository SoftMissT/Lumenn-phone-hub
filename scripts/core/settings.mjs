import { MODULE_ID, SETTINGS_KEYS } from "./constants.mjs";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS_KEYS.STORE_REF, {
    name: "LPH.Settings.StoreRef",
    hint: "LPH.Settings.StoreRefHint",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.THEME, {
    name: "LPH.Settings.Theme",
    hint: "LPH.Settings.ThemeHint",
    scope: "client",
    config: false,
    type: String,
    choices: { light: "LPH.Settings.ThemeLight", dark: "LPH.Settings.ThemeDark" },
    default: "dark"
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.NOTIFICATION_SOUND, {
    name: "LPH.Settings.NotificationSound",
    hint: "LPH.Settings.NotificationSoundHint",
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.REDUCED_EFFECTS, {
    name: "LPH.Settings.ReducedEffects",
    hint: "LPH.Settings.ReducedEffectsHint",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEBUG_LOGGING, {
    name: "LPH.Settings.DebugLogging",
    hint: "LPH.Settings.DebugLoggingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.TIMEZONE, {
    name: "LPH.Settings.Timezone",
    hint: "LPH.Settings.TimezoneHint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DISPLAY_YEAR, {
    name: "LPH.Settings.DisplayYear",
    hint: "LPH.Settings.DisplayYearHint",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.ERA, {
    name: "LPH.Settings.Era",
    hint: "LPH.Settings.EraHint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEFAULT_WALLPAPER, {
    name: "LPH.Settings.DefaultWallpaper",
    hint: "LPH.Settings.DefaultWallpaperHint",
    scope: "world",
    config: true,
    type: String,
    filePicker: true,
    default: ""
  });
}
