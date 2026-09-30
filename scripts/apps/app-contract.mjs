import { ERROR_CODES } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";

const APP_ID_RE = /^[a-z][a-z0-9-]{1,31}$/;

export const APP_CONTRACT_FIELDS = Object.freeze([
  "id",
  "name",
  "icon",
  "brand",
  "tile",
  "order",
  "dockEligible",
  "playerVisible",
  "gmPanel",
  "render",
  "onOpen",
  "onClose",
  "permissions",
]);

function fnOrNull(value) {
  return typeof value === "function" ? value : null;
}

export function normalizeAppDefinition(input) {
  if (!input || typeof input !== "object") {
    fail(ERROR_CODES.INVALID_APP, "Definição de app inválida.");
  }
  if (typeof input.id !== "string" || !APP_ID_RE.test(input.id)) {
    fail(ERROR_CODES.INVALID_APP, `id de app inválido: ${String(input.id)}`, {
      id: input.id,
    });
  }
  return Object.freeze({
    id: input.id,
    name: typeof input.name === "string" && input.name ? input.name : input.id,
    icon:
      typeof input.icon === "string" && input.icon ? input.icon : "fas fa-cube",
    brand:
      typeof input.brand === "string" && input.brand ? input.brand : input.icon,
    tile: typeof input.tile === "string" && input.tile ? input.tile : null,
    order: Number.isFinite(input.order) ? Math.trunc(input.order) : 100,
    dockEligible: input.dockEligible === true,
    playerVisible: input.playerVisible !== false,
    gmPanel: input.gmPanel === true,
    render: fnOrNull(input.render),
    onOpen: fnOrNull(input.onOpen),
    onClose: fnOrNull(input.onClose),
    permissions: Array.isArray(input.permissions)
      ? Object.freeze([...input.permissions])
      : Object.freeze([]),
  });
}
