import { ERROR_CODES } from "../core/constants.mjs";
import { fail } from "../core/errors.mjs";
import { Logger } from "../core/logger.mjs";
import { features } from "./features.mjs";

let baseClass = null;

export function getApplicationBase() {
  if (baseClass) return baseClass;
  const api = globalThis.foundry?.applications?.api ?? {};
  if (typeof api.ApplicationV2 === "function") {
    baseClass = typeof api.HandlebarsApplicationMixin === "function"
      ? api.HandlebarsApplicationMixin(api.ApplicationV2)
      : api.ApplicationV2;
    return baseClass;
  }
  if (typeof globalThis.Application === "function") {
    Logger.warn("ApplicationV2 indisponível; recorrendo à Application legada.");
    baseClass = globalThis.Application;
    return baseClass;
  }
  fail(ERROR_CODES.UNSUPPORTED_VERSION, "Nenhuma classe de Application Foundry disponível.");
}

export function createPhoneApplication() {
  return getApplicationBase();
}

export async function renderTemplate(path, context = {}) {
  const f = globalThis.foundry ?? {};
  if (features().handlebarsRenderTemplate) {
    return f.applications.handlebars.renderTemplate(path, context);
  }
  if (features().legacyRenderTemplate) {
    return globalThis.renderTemplate(path, context);
  }
  fail(ERROR_CODES.UNSUPPORTED_VERSION, "renderTemplate indisponível nesta versão do Foundry.");
}

export function mergeObject(original, other, options = {}) {
  const utils = globalThis.foundry?.utils;
  if (typeof utils?.mergeObject === "function") return utils.mergeObject(original, other, options);
  return Object.assign(options.inplace ? original : { ...original }, other);
}

export function deepClone(value) {
  const utils = globalThis.foundry?.utils;
  if (typeof utils?.deepClone === "function") return utils.deepClone(value);
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function escapeHTML(value) {
  const utils = globalThis.foundry?.utils;
  if (typeof utils?.escapeHTML === "function") return utils.escapeHTML(String(value ?? ""));
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export function confirmDialog({ title = "", content = "" } = {}) {
  const api = globalThis.foundry?.applications?.api;
  if (typeof api?.DialogV2?.confirm === "function") {
    return api.DialogV2.confirm({
      window: { title: escapeHTML(title) },
      content: `<p>${escapeHTML(content)}</p>`,
      modal: true
    });
  }
  const fallback = globalThis.confirm;
  if (typeof fallback === "function") {
    return Promise.resolve(fallback(`${title}\n\n${content}`) === true);
  }
  return Promise.resolve(false);
}
