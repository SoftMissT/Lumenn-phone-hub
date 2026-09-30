import {
  WALLPAPER_MAX_BYTES,
  WALLPAPER_MAX_DIMENSION,
  WALLPAPER_MAX_PIXELS
} from "../core/constants.mjs";
import { isAllowedWallpaperUrl, getUrlProtocol, isForbiddenProtocol } from "../validation/urls.mjs";

export const ALLOWED_EXTENSIONS = Object.freeze(["png", "jpg", "jpeg", "webp", "avif"]);
export const REJECTED_EXTENSIONS = Object.freeze(["svg", "gif", "apng", "bmp", "tiff", "tif"]);

let avifSupported = false;

export function setAvifSupported(value) {
  avifSupported = value === true;
}

export function isAvifSupported() {
  return avifSupported;
}

export function detectAvifSupport() {
  try {
    const canvas = globalThis.document?.createElement?.("canvas");
    if (!canvas) {
      setAvifSupported(false);
      return false;
    }
    canvas.width = 1;
    canvas.height = 1;
    const data = canvas.toDataURL("image/avif");
    const supported = typeof data === "string" && data.startsWith("data:image/avif");
    setAvifSupported(supported);
    return supported;
  } catch {
    setAvifSupported(false);
    return false;
  }
}

export function extensionOf(name) {
  const clean = String(name ?? "").split(/[?#]/)[0].toLowerCase();
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1);
}

export function normalizeFormat(extension) {
  return extension === "jpg" ? "jpeg" : extension;
}

export function validateExtension(name) {
  const ext = extensionOf(name);
  if (!ext) return { valid: false, reason: "Arquivo sem extensão reconhecível." };
  if (REJECTED_EXTENSIONS.includes(ext)) return { valid: false, reason: `Formato não suportado: .${ext}` };
  if (!ALLOWED_EXTENSIONS.includes(ext)) return { valid: false, reason: `Extensão não permitida: .${ext}` };
  if (ext === "avif" && !avifSupported) return { valid: false, reason: "AVIF não disponível neste navegador." };
  return { valid: true, reason: "", format: normalizeFormat(ext) };
}

export function validateSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return { valid: false, reason: "Tamanho de arquivo inválido." };
  if (value > WALLPAPER_MAX_BYTES) {
    return { valid: false, reason: `Arquivo maior que ${Math.round(WALLPAPER_MAX_BYTES / 1048576)} MiB.` };
  }
  return { valid: true, reason: "" };
}

export function validateDimensions(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { valid: false, reason: "Dimensões inválidas." };
  }
  if (w > WALLPAPER_MAX_DIMENSION || h > WALLPAPER_MAX_DIMENSION) {
    return { valid: false, reason: `Dimensão máxima excedida (${WALLPAPER_MAX_DIMENSION}px).` };
  }
  if (w * h > WALLPAPER_MAX_PIXELS) {
    return { valid: false, reason: `Área decodificada acima de ${WALLPAPER_MAX_PIXELS / 1048576} MP.` };
  }
  return { valid: true, reason: "" };
}

export function detectImageFormat(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "avif" || brand === "avis" || brand === "av01") return "avif";
  }
  return null;
}

export function validateSourceUrl(source) {
  if (typeof source !== "string" || source.trim().length === 0) {
    return { valid: false, reason: "Informe um caminho ou URL." };
  }
  const value = source.trim();
  if (isForbiddenProtocol(value)) return { valid: false, reason: "Protocolo não permitido." };
  const protocol = getUrlProtocol(value);
  if (protocol && protocol !== "https:" && !value.startsWith("http://localhost")) {
    return { valid: false, reason: "Somente https:// ou caminhos do Foundry." };
  }
  if (!isAllowedWallpaperUrl(value)) return { valid: false, reason: "Caminho ou URL não permitido." };
  const ext = extensionOf(value);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return { valid: false, reason: "Extensão de imagem não permitida." };
  if (ext === "avif" && !avifSupported) return { valid: false, reason: "AVIF não disponível neste navegador." };
  return { valid: true, reason: "", format: normalizeFormat(ext) };
}

export function sanitizeFilename(name) {
  const ext = extensionOf(name) || "png";
  const base = String(name ?? "").split(/[?#]/)[0].replace(/\.[^.]+$/, "");
  const slug = base
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .toLowerCase() || "wallpaper";
  return `${slug}.${ext}`;
}
