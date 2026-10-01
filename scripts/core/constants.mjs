export const MODULE_ID = "lumenn-phone-hub";
export const MODULE_TITLE = "Lumenn Phone Hub";
export const SOCKET_NAMESPACE = `module.${MODULE_ID}`;
export const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;
export const TEMPLATE_PARTIALS = Object.freeze([
  `${TEMPLATE_ROOT}/phone/status-bar.hbs`,
  `${TEMPLATE_ROOT}/phone/lock-screen.hbs`,
  `${TEMPLATE_ROOT}/phone/pin-pad.hbs`,
  `${TEMPLATE_ROOT}/phone/home-screen.hbs`,
]);
export const CONTROL_GROUP_ID = "lumennPhone";
export const CONTROL_TOOL_ID = "openPhone";
export const LOG_PREFIX = "[Lumenn]";
export const PROTOCOL = "lumenn";
export const PROTOCOL_VERSION = 1;

export const STORE_SCHEMA_VERSION = 1;
export const FLAG_NAMESPACE = MODULE_ID;
export const FLAG_KEY = "store";
export const JOURNAL_NAME = "[Internal] Lumenn Phone Hub Store";

export const PIN_LENGTH = 6;

export const NOTIFICATION_TITLE_MAX = 80;
export const NOTIFICATION_BODY_MAX = 500;
export const NOTIFICATION_MAX_LINES = 20;
export const NOTIFICATION_STORE_LIMIT = 200;
export const NOTIFICATION_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const NOTIFICATION_SOUND_PATH = `modules/${MODULE_ID}/assets/audio/notification.mp3`;
export const KEYBOARD_SOUND_PATH = `modules/${MODULE_ID}/assets/audio/keyboard.mp3`;

export const WALLPAPER_MAX_BYTES = 10 * 1024 * 1024;
export const WALLPAPER_MAX_DIMENSION = 8192;
export const WALLPAPER_MAX_PIXELS = 16 * 1024 * 1024;
export const WALLPAPER_DIRECTORY = "lumenn-phone-hub";
export const BUNDLED_WALLPAPER_PATH = `modules/${MODULE_ID}/assets/wallpaper.webp`;

export const WORLD_CLOCK_ERA_MAX = 32;

export const LIMIT_RANGES = Object.freeze({
  store: Object.freeze({ min: 10, max: 2000, step: 10 }),
  ttlDays: Object.freeze({ min: 0, max: 365, step: 1 }),
});

export const SOCKET_TIMEOUT_MS = 5000;
export const SOCKET_ENVELOPE_MAX_BYTES = 64 * 1024;
export const SOCKET_RATE_LIMIT_PER_SECOND = 10;

export const ERROR_CODES = Object.freeze({
  NO_CHARACTER: "LPH_NO_CHARACTER",
  NO_AUTHORITY: "LPH_NO_AUTHORITY",
  UNAUTHORIZED: "LPH_UNAUTHORIZED",
  INVALID_PIN: "LPH_INVALID_PIN",
  PIN_LOCKED: "LPH_PIN_LOCKED",
  PIN_POLICY: "LPH_PIN_POLICY",
  INVALID_WALLPAPER: "LPH_INVALID_WALLPAPER",
  STORE_UNAVAILABLE: "LPH_STORE_UNAVAILABLE",
  SOCKET_TIMEOUT: "LPH_SOCKET_TIMEOUT",
  REVISION_CONFLICT: "LPH_REVISION_CONFLICT",
  UNSUPPORTED_VERSION: "LPH_UNSUPPORTED_VERSION",
  INVALID_APP: "LPH_INVALID_APP",
  INVALID_ARGUMENT: "LPH_INVALID_ARGUMENT",
  CONTROLS_UNAVAILABLE: "LPH_CONTROLS_UNAVAILABLE",
  NOT_IMPLEMENTED: "LPH_NOT_IMPLEMENTED",
});

export const HOOKS = Object.freeze({
  READY: "lumennPhoneReady",
  NOTIFICATION_CREATED: "lumennNotificationCreated",
  NOTIFICATION_RECEIVED: "lumennNotificationReceived",
  APP_REGISTERED: "lumennAppRegistered",
  PHONE_OPENED: "lumennPhoneOpened",
  PHONE_CLOSED: "lumennPhoneClosed",
  DEVICE_MODEL_CHANGED: "lumennPhoneDeviceModelChanged",
});

export const SETTINGS_KEYS = Object.freeze({
  STORE_REF: "storeRef",
  THEME: "theme",
  NOTIFICATION_SOUND: "notificationSoundEnabled",
  REDUCED_EFFECTS: "reducedVisualEffects",
  DEBUG_LOGGING: "debugLogging",
  TIMEZONE: "timezone",
  DISPLAY_YEAR: "displayYear",
  ERA: "era",
  DEFAULT_WALLPAPER: "defaultWallpaper",
  DEFAULT_THEME: "defaultTheme",
  DEFAULT_NOTIFICATION_SOUND: "defaultNotificationSound",
  LIMIT_STORE: "limitNotificationStore",
  LIMIT_TTL_DAYS: "limitNotificationTtlDays",
  FLAG_KEYPRESS_SOUND: "flagKeypressSound",
  FLAG_NOTIFICATION_BANNER: "flagNotificationBanner",
  FLAG_PLAYER_WALLPAPER_UPLOAD: "flagPlayerWallpaperUpload",
    LIKED_POSTS: "likedPosts",
    ENABLED_APPS: "enabledApps",
    CURRENCY_SYMBOL: "currencySymbol",
    DEVICE_MODEL: "deviceModel",
  });

export const THEMES = Object.freeze(["light", "dark"]);

// Modelos de aparelho. É só aparência: muda recorte de tela, câmera, moldura e,
// no caso do flip, o teclado embaixo. Nenhum deles dobra - o Flip é a concha
// aberta, parada.
export const DEVICE_MODELS = Object.freeze([
  "pearphone",
  "xiaomi",
  "oppo",
  "samsung",
  "nokiaflip",
]);

export const DEFAULT_DEVICE_MODEL = "pearphone";

// Teclado do flip: decorativo, mas sem ele o aparelho não lê como concha.
export const FLIP_KEYS = Object.freeze([
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "*", "0", "#",
]);
