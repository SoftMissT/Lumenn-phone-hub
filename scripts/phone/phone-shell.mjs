import {
  HOOKS,
  MODULE_ID,
  PIN_LENGTH,
  SETTINGS_KEYS,
  TEMPLATE_PARTIALS,
} from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import {
  confirmDialog,
  getApplicationBase,
  isGM,
} from "../compat/foundry-compat.mjs";
import { preloadTemplates } from "../compat/application-compat.mjs";
import { LumennRepository } from "../persistence/repository.mjs";
import { verifyPin } from "../lock/pin-kdf.mjs";
import { LockoutService } from "../lock/lockout-service.mjs";
import { AppRegistry } from "../apps/app-registry.mjs";
import { formatYearLabel, getWorldClock } from "../time/world-clock.mjs";
import { getResolvedWallpaper } from "../wallpaper/wallpaper-service.mjs";
import { NOTIFICATION_STATUS } from "../notifications/notification-model.mjs";
import { syncUnreadBadge } from "../notifications/notification-service.mjs";
import { PhoneController } from "./phone-controller.mjs";
import { gmResetPin, gmResetWallpaper } from "../gm/gm-phone-inspector.mjs";
import { isAppEnabled, resolveTheme } from "../core/preferences.mjs";
import { playKeypressSound } from "../ui/keypress-audio.mjs";

const AppBase = getApplicationBase();

const VIEWS = Object.freeze({
  LOCK: "lock",
  PIN: "pin",
  HOME: "home",
  APP: "app",
});

const PHONE_ASPECT = 360 / 720;
const PHONE_MIN_WIDTH = 280;

function localize(key, fallback) {
  return globalThis.game?.i18n?.localize(key) ?? fallback ?? key;
}

function format(key, data, fallback) {
  return globalThis.game?.i18n?.format(key, data) ?? fallback ?? key;
}

export class PhoneShell extends AppBase {
  static _instance = null;

  constructor(options = {}) {
    super(options);
    this.actorUuid =
      options.actorUuid ?? globalThis.game?.user?.character?.uuid ?? null;
    this.currentView = VIEWS.LOCK;
    this.pinBuffer = "";
    this.errorMessage = "";
    this.activeApp = null;
    this.activeAppContent = "";
    this.phoneState = null;
    this.notifications = [];
    this.gmMode = false;
    this.gmCharacterName = "";
    this._clockTimer = null;
    this._markingViewed = false;
    this._renderAbort = null;
  }

  static get instance() {
    if (!this._instance) this._instance = new PhoneShell();
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: "lumenn-phone-shell",
    classes: ["lumenn-phone-app-window"],
    tag: "div",
    window: {
      frame: false,
      positioned: true,
      title: "LPH.Title",
      icon: "fas fa-mobile-alt",
      resizable: true
    },
    position: { width: 360, height: 720 },
    actions: {
      "prompt-unlock": PhoneShell.#onPromptUnlock,
      "cancel-pin": PhoneShell.#onCancelPin,
      "backspace-pin": PhoneShell.#onBackspacePin,
      "go-home": PhoneShell.#onGoHome,
      "launch-app": PhoneShell.#onLaunchApp,
    },
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/phone/phone-shell.hbs` },
  };

  async _preFirstRender(context, options) {
    await super._preFirstRender?.(context, options);
    await preloadTemplates(TEMPLATE_PARTIALS);
  }

  _onPosition(position) {
    super._onPosition?.(position);
    this.#lockPortraitRatio(position);
  }

  #lockPortraitRatio(position) {
    if (this._applyingRatio) return;
    const height = Math.round(Number(position?.height ?? 0));
    const width = Math.round(Number(position?.width ?? 0));
    if (!height || !width) return;

    const target = Math.max(PHONE_MIN_WIDTH, Math.round(height * PHONE_ASPECT));
    if (Math.abs(target - width) < 2) return;

    this._applyingRatio = true;
    try {
      this.setPosition({ ...this.position, width: target });
    } finally {
      this._applyingRatio = false;
    }
  }

  open() {
    if (this.gmMode) {
      this.currentView = VIEWS.HOME;
      this.pinBuffer = "";
      this.errorMessage = "";
    }
    this.render(true);
    this.bringToFront?.();
    Hooks.callAll(HOOKS.PHONE_OPENED, this);
    return this;
  }

  async close(options) {
    this.#clearClock();
    this.currentView = VIEWS.LOCK;
    this.pinBuffer = "";
    this.errorMessage = "";
    this.gmMode = false;
    this.gmCharacterName = "";
    this.activeApp?.onClose?.(this);
    this.activeApp = null;
    this.activeAppContent = "";
    Hooks.callAll(HOOKS.PHONE_CLOSED, this);
    return super.close?.(options);
  }

  async _prepareContext(options) {
    const context = (await super._prepareContext?.(options)) ?? {};
    if (!this.actorUuid)
      this.actorUuid = globalThis.game?.user?.character?.uuid ?? null;

    if (this.actorUuid) {
      this.phoneState = await LumennRepository.getPhone(this.actorUuid);
      this.notifications = await LumennRepository.listNotifications(
        this.actorUuid,
      );
      syncUnreadBadge(
        this.notifications.filter(
          (entry) => entry.status === NOTIFICATION_STATUS.UNREAD,
        ).length,
      );
    } else {
      this.phoneState = null;
      this.notifications = [];
    }

    const lockout = this.actorUuid
      ? LockoutService.getLockoutState(this.actorUuid)
      : { isLocked: false, remainingMs: 0 };

    const clock = getWorldClock();
    const base = {
      ...context,
      themeClass: this.#themeClass(),
      hasCharacter: Boolean(this.actorUuid),
      noCharacterMessage: localize("LPH.Phone.NoCharacter"),
      currentView: this.currentView,
      time: clock.time,
      date: clock.date,
      yearLabel: formatYearLabel(clock.year),
      era: clock.era,
      wallpaperUrl: getResolvedWallpaper(this.phoneState),
      isBlurWallpaper:
        this.currentView === VIEWS.PIN || this.currentView === VIEWS.APP,
      pinLength: this.pinBuffer.length,
      errorMessage: this.errorMessage,
      isLocked: lockout.isLocked,
      lockoutRemaining: Math.ceil(lockout.remainingMs / 1000),
      notifications: this.notifications,
      apps: this.#mapApps({ includeGm: true }),
      dockApps: this.#mapApps({ dockEligible: true }),
      gmMode: this.gmMode,
      gmModeLabel: this.gmMode
        ? format("LPH.GM.Mode", { name: this.gmCharacterName })
        : "",
      activeApp: this.activeApp,
      activeAppTitle: this.activeApp
        ? localize(this.activeApp.name, this.activeApp.id)
        : "",
      activeAppContent: this.activeAppContent,
    };

    if (this.currentView === VIEWS.APP && this.activeApp?.render) {
      try {
        this.activeAppContent = await this.activeApp.render({
          shell: this,
          context: base,
        });
      } catch (error) {
        Logger.error("Falha ao renderizar conteúdo do app:", error);
        this.activeAppContent = "";
      }
    }
    base.activeAppContent = this.activeAppContent;

    return base;
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    if (!root) return;

    this._renderAbort?.abort();
    const signal =
      typeof AbortController === "function"
        ? (this._renderAbort = new AbortController()).signal
        : undefined;
    const listen = (element, type, handler) => {
      element?.addEventListener(type, handler, signal ? { signal } : undefined);
    };

    root.querySelectorAll(".lph-pin-btn[data-key]").forEach((button) => {
      listen(button, "click", (event) =>
        this.#handlePinInput(event.currentTarget.dataset.key),
      );
    });

    root.querySelectorAll("[data-action]").forEach((element) => {
      if (element.tagName === "BUTTON") return;
      element.setAttribute("role", "button");
      if (!element.hasAttribute("tabindex"))
        element.setAttribute("tabindex", "0");
      listen(element, "keydown", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "Spacebar"
        ) {
          event.preventDefault();
          element.click();
        }
      });
    });

    root.querySelectorAll("[data-lph-gm-action]").forEach((button) => {
      listen(button, "click", () => {
        const action = button.dataset.lphGmAction;
        if (action === "reset-pin") this.#gmResetPin();
        if (action === "reset-wallpaper") this.#gmResetWallpaper();
      });
    });

    root
      .querySelectorAll(
        'input[type="text"], input[type="url"], input[type="password"], input[type="search"], textarea',
      )
      .forEach((field) => {
        listen(field, "input", () => playKeypressSound());
      });

    listen(root, "keydown", (event) => this.#handleKeydown(event));

    if (this.currentView === VIEWS.APP && this.activeApp?.onOpen) {
      try {
        this.activeApp.onOpen(this);
      } catch (error) {
        Logger.error("Falha no onOpen do app:", error);
      }
    }

    this.#startClock(root);

    if (this.currentView === VIEWS.PIN) {
      root.querySelector(".lph-pin-btn[data-key]")?.focus?.();
    }

    if (this.currentView === VIEWS.LOCK) this.#markViewed();
  }

  #handleKeydown(event) {
    if (this.currentView !== VIEWS.PIN) return;
    const InputCtor = globalThis.HTMLInputElement;
    const TextAreaCtor = globalThis.HTMLTextAreaElement;
    if (InputCtor && event.target instanceof InputCtor) return;
    if (TextAreaCtor && event.target instanceof TextAreaCtor) return;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.#handlePinInput(event.key);
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      PhoneShell.#onBackspacePin();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      PhoneShell.#onCancelPin();
    }
  }

  async #gmResetPin() {
    if (!this.gmMode || !this.actorUuid) return;
    const confirmed = await confirmDialog({
      title: localize("LPH.GM.ResetPin"),
      content: format("LPH.GM.ResetPinConfirm", { name: this.gmCharacterName }),
    });
    if (!confirmed) return;
    try {
      await gmResetPin(this.actorUuid);
      await this.render(true);
    } catch (error) {
      Logger.error("Falha ao redefinir PIN:", error);
    }
  }

  async #gmResetWallpaper() {
    if (!this.gmMode || !this.actorUuid) return;
    const confirmed = await confirmDialog({
      title: localize("LPH.GM.ResetWallpaper"),
      content: format("LPH.GM.ResetWallpaperConfirm", {
        name: this.gmCharacterName,
      }),
    });
    if (!confirmed) return;
    try {
      await gmResetWallpaper(this.actorUuid);
      await this.render(true);
    } catch (error) {
      Logger.error("Falha ao redefinir wallpaper:", error);
    }
  }

  async #markViewed() {
    if (this._markingViewed || !this.actorUuid) return;
    const unread = this.notifications
      .filter((entry) => entry.status === NOTIFICATION_STATUS.UNREAD)
      .map((entry) => entry.id);
    if (unread.length === 0) return;

    this._markingViewed = true;
    try {
      await PhoneController.markNotificationsRead(this.actorUuid, unread);
      syncUnreadBadge(0);
    } catch (error) {
      Logger.debug("Falha ao marcar notificações como lidas:", error);
    } finally {
      this._markingViewed = false;
    }
  }

  #themeClass() {
    return resolveTheme() === "light" ? "lph-theme-light" : "lph-theme-dark";
  }

  #mapApps(filter = {}) {
    const gm = isGM();
    return AppRegistry.list({})
      .filter((app) => {
        if (filter.dockEligible === true && !app.dockEligible) return false;
        if (app.playerVisible) return true;
        return Boolean(filter.includeGm) && app.gmPanel && gm;
      })
      .filter((app) => !app.playerVisible || isAppEnabled(app.id))
      .map((app) => ({
        id: app.id,
        icon: app.icon,
        title: localize(app.name, app.id),
      }));
  }

  #startClock(root) {
    if (this._clockTimer) return;
    this._clockTimer = setInterval(() => {
      const clock = root.querySelector(".lph-clock-time");
      if (!clock) return;
      clock.textContent = getWorldClock().time;
    }, 10000);
  }

  #clearClock() {
    if (this._clockTimer) {
      clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
  }

  static #onPromptUnlock() {
    const shell = PhoneShell.instance;
    if (!shell.phoneState && !shell.actorUuid) return;
    if (shell.phoneState?.pinVerifier) {
      shell.currentView = VIEWS.PIN;
      shell.pinBuffer = "";
      shell.errorMessage = "";
    } else {
      shell.currentView = VIEWS.HOME;
    }
    shell.render(true);
  }

  static #onCancelPin() {
    const shell = PhoneShell.instance;
    shell.currentView = VIEWS.LOCK;
    shell.pinBuffer = "";
    shell.errorMessage = "";
    shell.render(true);
  }

  static #onBackspacePin() {
    const shell = PhoneShell.instance;
    if (shell.pinBuffer.length > 0) {
      playKeypressSound();
      shell.pinBuffer = shell.pinBuffer.slice(0, -1);
      shell.render(true);
    }
  }

  static #onGoHome() {
    const shell = PhoneShell.instance;
    if (shell.currentView !== VIEWS.APP) return;
    shell.activeApp?.onClose?.(shell);
    shell.currentView = VIEWS.HOME;
    shell.activeApp = null;
    shell.activeAppContent = "";
    shell.render(true);
  }

  static #onLaunchApp(event, target) {
    const shell = PhoneShell.instance;
    const appId =
      target?.dataset?.appId ??
      target?.closest?.("[data-app-id]")?.dataset?.appId;
    const app = AppRegistry.get(appId);
    if (!app) return;
    shell.currentView = VIEWS.APP;
    shell.activeApp = app;
    shell.render(true);
  }

  async #handlePinInput(digit) {
    if (this.pinBuffer.length >= PIN_LENGTH || !/^\d$/.test(String(digit)))
      return;

    playKeypressSound();

    if (this.actorUuid) {
      const lockout = LockoutService.getLockoutState(this.actorUuid);
      if (lockout.isLocked) {
        this.errorMessage = format("LPH.Phone.TryAgainIn", {
          seconds: Math.ceil(lockout.remainingMs / 1000),
        });
        this.render(true);
        return;
      }
    }

    this.pinBuffer += digit;
    this.render(true);

    if (this.pinBuffer.length === PIN_LENGTH) await this.#submitPin();
  }

  async #submitPin() {
    const pin = this.pinBuffer;
    const verifier = this.phoneState?.pinVerifier;
    this.pinBuffer = "";

    if (!verifier) {
      this.currentView = VIEWS.HOME;
      this.render(true);
      return;
    }

    let valid = false;
    try {
      valid = await verifyPin(pin, verifier);
    } catch (error) {
      Logger.error("Falha ao verificar PIN:", error);
    }

    if (valid) {
      if (this.actorUuid) LockoutService.recordSuccess(this.actorUuid);
      this.currentView = VIEWS.HOME;
      this.errorMessage = "";
    } else if (this.actorUuid) {
      const lockout = LockoutService.recordFailure(this.actorUuid);
      this.errorMessage = lockout.isLocked
        ? format("LPH.Phone.TryAgainIn", {
            seconds: Math.ceil(lockout.remainingMs / 1000),
          })
        : localize("LPH.Phone.IncorrectPin");
    } else {
      this.errorMessage = localize("LPH.Phone.IncorrectPin");
    }
    this.render(true);
  }
}

Hooks.on(HOOKS.NOTIFICATION_RECEIVED, (notification) => {
  const shell = PhoneShell._instance;
  if (!shell?.rendered) return;
  const actorUuid = globalThis.game?.user?.character?.uuid ?? null;
  if (
    notification?.targetActorUuid === "all" ||
    notification?.targetActorUuid === actorUuid
  ) {
    shell.render(true);
  }
});
