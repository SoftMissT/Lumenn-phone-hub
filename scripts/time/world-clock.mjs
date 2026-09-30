import { MODULE_ID, SETTINGS_KEYS, WORLD_CLOCK_ERA_MAX } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { getZonedParts, resolveTimezone } from "./timezone.mjs";

export function normalizeClockSettings(raw = {}) {
  const displayYear = Number(raw?.displayYear);
  const era = typeof raw?.era === "string" ? raw.era.trim().slice(0, WORLD_CLOCK_ERA_MAX) : "";
  return {
    timezone: typeof raw?.timezone === "string" ? raw.timezone.trim() : "",
    displayYear: Number.isFinite(displayYear) && displayYear > 0 ? Math.trunc(displayYear) : 0,
    era
  };
}

export function computeWorldClock(date, settings, locale) {
  const normalized = normalizeClockSettings(settings);
  const { timezone, fellBack } = resolveTimezone(normalized.timezone);
  const parts = getZonedParts(date, timezone);
  const year = normalized.displayYear > 0 ? normalized.displayYear : parts.year;

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone
  }).format(date);

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timezone
  }).format(date);

  return {
    timezone,
    timezoneRequested: normalized.timezone,
    timezoneFellBack: fellBack,
    time,
    date: dateLabel,
    weekday: parts.weekday,
    day: parts.day,
    month: parts.month,
    realYear: parts.year,
    year,
    hasNarrativeYear: normalized.displayYear > 0,
    era: normalized.era
  };
}

export function getClockSettings() {
  try {
    return normalizeClockSettings({
      timezone: game.settings.get(MODULE_ID, SETTINGS_KEYS.TIMEZONE),
      displayYear: game.settings.get(MODULE_ID, SETTINGS_KEYS.DISPLAY_YEAR),
      era: game.settings.get(MODULE_ID, SETTINGS_KEYS.ERA)
    });
  } catch (error) {
    Logger.debug("Settings de relógio indisponíveis:", error);
    return normalizeClockSettings({});
  }
}

export function getWorldClock(date = new Date()) {
  const locale = globalThis.game?.i18n?.lang ?? undefined;
  return computeWorldClock(date, getClockSettings(), locale);
}

export function formatYearLabel(year) {
  const i18n = globalThis.game?.i18n;
  if (!i18n) return String(year);
  return i18n.format("LPH.Clock.Year", { year });
}
