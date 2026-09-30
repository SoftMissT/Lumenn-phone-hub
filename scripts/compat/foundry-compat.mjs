export { features } from "./features.mjs";
export {
  getApplicationBase,
  createPhoneApplication,
  renderTemplate,
  mergeObject,
  deepClone,
  escapeHTML,
  confirmDialog
} from "./application-compat.mjs";
export {
  installControlsEntry,
  verifyControlsEntry,
  registerControlsEntry,
  isControlsInstalled
} from "./controls-compat.mjs";
export { preloadSound, playSound } from "./audio-compat.mjs";
export { openFilePicker, getFilePickerClass, uploadFile, canUploadFiles } from "./file-picker-compat.mjs";

export function getFoundryVersionInfo() {
  const game = globalThis.game ?? {};
  const version = game.version ?? "0";
  const release = game.release ?? {};
  const parts = String(version).split(".");
  const generation = Number(release.generation ?? parts[0]) || 0;
  const build = Number(release.build ?? parts[1]) || 0;
  const revision = Number(release.revision ?? parts[2]) || 0;
  return {
    version,
    generation,
    build,
    revision,
    isV13: generation === 13,
    isV14: generation >= 14
  };
}

export function getCurrentUser() {
  return globalThis.game?.user ?? null;
}

export function getAssignedCharacter() {
  return globalThis.game?.user?.character ?? null;
}

export function getAssignedActorUuid() {
  return getAssignedCharacter()?.uuid ?? null;
}

export function isGM() {
  return globalThis.game?.user?.isGM === true;
}

export function resolveActorByUuid(uuid) {
  if (typeof globalThis.fromUuidSync === "function") return globalThis.fromUuidSync(uuid, { strict: false });
  const parts = String(uuid ?? "").split(".");
  if (parts.length >= 2 && globalThis.game?.actors) return globalThis.game.actors.get(parts[1]) ?? null;
  return null;
}
