const ALLOWED_PROTOCOLS = new Set(["https:"]);
const FORBIDDEN_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "vbscript:",
]);
const WALLPAPER_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
]);

export function getUrlProtocol(value) {
  if (typeof value !== "string" || value.length === 0) return "";
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(value.trim());
  return match ? `${match[1].toLowerCase()}:` : "";
}

export function isForbiddenProtocol(value) {
  return FORBIDDEN_PROTOCOLS.has(getUrlProtocol(value));
}

export function isFoundryRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  if (value.startsWith("/")) return false;
  if (value.includes("..")) return false;
  return true;
}

export function isAllowedWallpaperUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (isForbiddenProtocol(value)) return false;
  const protocol = getUrlProtocol(value);
  if (protocol === "https:") {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  if (protocol === "") return isFoundryRelativePath(value);
  if (protocol === "http:") return value.startsWith("http://localhost");
  return false;
}

export function hasAllowedWallpaperExtension(value) {
  if (typeof value !== "string") return false;
  const clean = value.split(/[?#]/)[0].toLowerCase();
  for (const ext of WALLPAPER_EXTENSIONS) {
    if (clean.endsWith(ext)) return true;
  }
  return false;
}

export function isAllowedLink(value) {
  const protocol = getUrlProtocol(value);
  return ALLOWED_PROTOCOLS.has(protocol);
}
