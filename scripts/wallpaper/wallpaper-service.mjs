import { ERROR_CODES, WALLPAPER_DIRECTORY } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { Logger } from "../core/logger.mjs";
import { canUploadFiles, openFilePicker, uploadFile } from "../compat/foundry-compat.mjs";
import { randomId } from "../validation/ids.mjs";
import {
  detectImageFormat,
  isAvifSupported,
  sanitizeFilename,
  validateDimensions,
  validateExtension,
  validateSize,
  validateSourceUrl
} from "./wallpaper-validator.mjs";
import { getWorldDefaultWallpaper, resolveWallpaperUrl, savePhoneWallpaper } from "./wallpaper-storage.mjs";

export function getResolvedWallpaper(phoneState) {
  return resolveWallpaperUrl(phoneState, getWorldDefaultWallpaper());
}

export async function hashReference(value) {
  const text = String(value ?? "");
  try {
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);
    }
  } catch (error) {
    Logger.debug("Hash com Web Crypto indisponível:", error);
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function loadImageMetadata(url) {
  return new Promise((resolve) => {
    try {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = url;
    } catch {
      resolve(null);
    }
  });
}

async function dimensionsFromFile(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImageMetadata(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateFile(file) {
  const extension = validateExtension(file?.name);
  if (!extension.valid) return extension;

  const size = validateSize(file?.size);
  if (!size.valid) return size;

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { valid: false, reason: "Não foi possível ler o arquivo." };
  }
  const format = detectImageFormat(bytes);
  if (!format) return { valid: false, reason: "Assinatura de imagem não reconhecida." };
  if (format !== extension.format) {
    return { valid: false, reason: "A extensão não corresponde ao conteúdo do arquivo." };
  }
  if (format === "avif" && !isAvifSupported()) {
    return { valid: false, reason: "AVIF não disponível neste navegador." };
  }

  const dimensions = await dimensionsFromFile(file);
  if (!dimensions) return { valid: false, reason: "Não foi possível decodificar a imagem." };
  const dims = validateDimensions(dimensions.width, dimensions.height);
  if (!dims.valid) return dims;

  return { valid: true, reason: "", format, size: file.size, width: dimensions.width, height: dimensions.height };
}

export async function applyWallpaperFromSource(actorUuid, source) {
  const validation = validateSourceUrl(source);
  if (!validation.valid) fail(ERROR_CODES.INVALID_WALLPAPER, validation.reason);
  const url = source.trim();
  const dimensions = await loadImageMetadata(url);
  if (dimensions) {
    const dims = validateDimensions(dimensions.width, dimensions.height);
    if (!dims.valid) fail(ERROR_CODES.INVALID_WALLPAPER, dims.reason);
  }
  const wallpaper = {
    url,
    format: validation.format,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    size: null,
    hash: await hashReference(url)
  };
  return savePhoneWallpaper(actorUuid, wallpaper);
}

export async function applyWallpaperFromFile(actorUuid, file) {
  const validation = await validateFile(file);
  if (!validation.valid) fail(ERROR_CODES.INVALID_WALLPAPER, validation.reason);
  if (!canUploadFiles()) fail(ERROR_CODES.UNAUTHORIZED, "Você não tem permissão para enviar arquivos.");

  const filename = `${randomId(8)}-${sanitizeFilename(file.name)}`;
  const response = await uploadFile({ source: "data", path: WALLPAPER_DIRECTORY, file, notify: false });
  const url = response?.path ?? response?.url;
  if (!url) fail(ERROR_CODES.INVALID_WALLPAPER, "O upload não retornou um caminho válido.");

  const wallpaper = {
    url,
    format: validation.format,
    width: validation.width,
    height: validation.height,
    size: validation.size,
    hash: await hashReference(url)
  };
  return savePhoneWallpaper(actorUuid, wallpaper);
}

export async function pickWallpaperFromFoundry(actorUuid, current = null) {
  const picked = await openFilePicker({
    type: "image",
    current,
    callback: undefined
  });
  if (!picked) return null;
  return applyWallpaperFromSource(actorUuid, picked);
}

export async function resetWallpaper(actorUuid) {
  return savePhoneWallpaper(actorUuid, null);
}
