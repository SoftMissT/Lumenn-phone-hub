let cachedBrowserTimezone = null;

export function isValidTimezone(timezone) {
  if (typeof timezone !== "string" || timezone.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function browserTimezone() {
  if (cachedBrowserTimezone) return cachedBrowserTimezone;
  try {
    cachedBrowserTimezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    cachedBrowserTimezone = "UTC";
  }
  return cachedBrowserTimezone;
}

export function resolveTimezone(requested) {
  if (isValidTimezone(requested))
    return { timezone: requested, fellBack: false };
  return {
    timezone: browserTimezone(),
    fellBack: typeof requested === "string" && requested.length > 0,
  };
}

export function listTimezones() {
  try {
    if (typeof Intl.supportedValuesOf === "function")
      return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
  return [];
}

export function getZonedParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday ?? "",
  };
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
