import {
  DEFAULT_DEVICE_MODEL,
  LIMIT_RANGES,
  MODULE_ID,
  NOTIFICATION_DEFAULT_TTL_MS,
  NOTIFICATION_STORE_LIMIT,
  SETTINGS_KEYS,
} from "./constants.mjs";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS_KEYS.STORE_REF, {
    name: "LPH.Settings.StoreRef",
    hint: "LPH.Settings.StoreRefHint",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.THEME, {
    name: "LPH.Settings.Theme",
    hint: "LPH.Settings.ThemeHint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "": "LPH.Settings.ThemeWorldDefault",
      light: "LPH.Settings.ThemeLight",
      dark: "LPH.Settings.ThemeDark",
    },
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.NOTIFICATION_SOUND, {
    name: "LPH.Settings.NotificationSound",
    hint: "LPH.Settings.NotificationSoundHint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "": "LPH.Settings.SoundWorldDefault",
      on: "LPH.Settings.SoundOn",
      off: "LPH.Settings.SoundOff",
    },
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.REDUCED_EFFECTS, {
    name: "LPH.Settings.ReducedEffects",
    hint: "LPH.Settings.ReducedEffectsHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  // Curtidas do Instagram. Estado do jogador no cliente: cada um curte o que
  // quiser, sem virar dado do mundo nem do personagem.
  game.settings.register(MODULE_ID, SETTINGS_KEYS.LIKED_POSTS, {
    name: "LPH.Apps.LikedPosts",
    scope: "client",
    config: false,
    type: Object,
    default: {},
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEBUG_LOGGING, {
    name: "LPH.Settings.DebugLogging",
    hint: "LPH.Settings.DebugLoggingHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.TIMEZONE, {
    name: "LPH.Settings.Timezone",
    hint: "LPH.Settings.TimezoneHint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DISPLAY_YEAR, {
    name: "LPH.Settings.DisplayYear",
    hint: "LPH.Settings.DisplayYearHint",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.ERA, {
    name: "LPH.Settings.Era",
    hint: "LPH.Settings.EraHint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEFAULT_WALLPAPER, {
    name: "LPH.Settings.DefaultWallpaper",
    hint: "LPH.Settings.DefaultWallpaperHint",
    scope: "world",
    config: true,
    type: String,
    filePicker: true,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEFAULT_THEME, {
    name: "LPH.Settings.DefaultTheme",
    hint: "LPH.Settings.DefaultThemeHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "": "LPH.Settings.ThemeWorldDefault",
      light: "LPH.Settings.ThemeLight",
      dark: "LPH.Settings.ThemeDark",
    },
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEFAULT_NOTIFICATION_SOUND, {
    name: "LPH.Settings.DefaultNotificationSound",
    hint: "LPH.Settings.DefaultNotificationSoundHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.LIMIT_STORE, {
    name: "LPH.Settings.LimitStore",
    hint: "LPH.Settings.LimitStoreHint",
    scope: "world",
    config: true,
    type: Number,
    range: LIMIT_RANGES.store,
    default: NOTIFICATION_STORE_LIMIT,
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.LIMIT_TTL_DAYS, {
    name: "LPH.Settings.LimitTtlDays",
    hint: "LPH.Settings.LimitTtlDaysHint",
    scope: "world",
    config: true,
    type: Number,
    range: LIMIT_RANGES.ttlDays,
    default: Math.round(NOTIFICATION_DEFAULT_TTL_MS / 86400000),
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.FLAG_KEYPRESS_SOUND, {
    name: "LPH.Settings.FlagKeypressSound",
    hint: "LPH.Settings.FlagKeypressSoundHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.FLAG_NOTIFICATION_BANNER, {
    name: "LPH.Settings.FlagNotificationBanner",
    hint: "LPH.Settings.FlagNotificationBannerHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(
    MODULE_ID,
    SETTINGS_KEYS.FLAG_PLAYER_WALLPAPER_UPLOAD,
    {
      name: "LPH.Settings.FlagPlayerWallpaperUpload",
      hint: "LPH.Settings.FlagPlayerWallpaperUploadHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
    },
  );

  // Símbolo da moeda do app Banco. Vazio formata os valores sem símbolo.
  game.settings.register(MODULE_ID, SETTINGS_KEYS.CURRENCY_SYMBOL, {
    name: "LPH.Settings.CurrencySymbol",
    hint: "LPH.Settings.CurrencySymbolHint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS_KEYS.ENABLED_APPS, {
    name: "LPH.Settings.EnabledApps",
    hint: "LPH.Settings.EnabledAppsHint",
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  // Modelo do aparelho: só aparência da casca.
  game.settings.register(MODULE_ID, SETTINGS_KEYS.DEVICE_MODEL, {
    name: "LPH.Settings.DeviceModel",
    hint: "LPH.Settings.DeviceModelHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      pearphone: "LPH.Devices.PearPhone",
      xiaomi: "LPH.Devices.Xiaomi",
      oppo: "LPH.Devices.Oppo",
      samsung: "LPH.Devices.Samsung",
      nokiaflip: "LPH.Devices.NokiaFlip",
    },
    default: DEFAULT_DEVICE_MODEL,
  });
}
