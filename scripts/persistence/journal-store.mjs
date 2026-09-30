import { FLAG_KEY, FLAG_NAMESPACE, JOURNAL_NAME, MODULE_ID, SETTINGS_KEYS } from "../core/constants.mjs";
import { Logger } from "../core/logger.mjs";
import { createDefaultStore, isValidStore } from "./schemas.mjs";

export class JournalStore {
  static async getEntry() {
    const storeRef = globalThis.game?.settings?.get(MODULE_ID, SETTINGS_KEYS.STORE_REF) ?? "";
    const isGM = globalThis.game?.user?.isGM === true;
    let journal = storeRef ? globalThis.game?.journal?.get(storeRef) : null;

    if (!journal) {
      journal = globalThis.game?.journal?.find((entry) => entry.name === JOURNAL_NAME) ?? null;
    }

    if (journal && isGM && storeRef !== journal.id) {
      await globalThis.game.settings.set(MODULE_ID, SETTINGS_KEYS.STORE_REF, journal.id);
    }

    if (!journal && isGM) {
      Logger.info("Criando JournalEntry de persistência canônica.");
      journal = await JournalEntry.create({
        name: JOURNAL_NAME,
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: { [FLAG_NAMESPACE]: { [FLAG_KEY]: createDefaultStore() } }
      });
      await globalThis.game.settings.set(MODULE_ID, SETTINGS_KEYS.STORE_REF, journal.id);
    }

    return journal;
  }

  static async readStore() {
    const journal = await this.getEntry();
    if (!journal) {
      Logger.debug("Store indisponível; retornando default.");
      return createDefaultStore();
    }
    const raw = journal.getFlag(FLAG_NAMESPACE, FLAG_KEY);
    if (!isValidStore(raw)) {
      Logger.warn("Store corrompido ou ausente; retornando default.");
      return createDefaultStore();
    }
    return raw;
  }

  static async writeStore(store) {
    if (globalThis.game?.user?.isGM !== true) {
      Logger.error("Somente o GM pode gravar diretamente no JournalStore.");
      return false;
    }
    const journal = await this.getEntry();
    if (!journal) throw new Error("JournalStore não encontrado para escrita.");
    store.updatedAt = Date.now();
    store.revision = (store.revision || 0) + 1;
    await journal.setFlag(FLAG_NAMESPACE, FLAG_KEY, store);
    return true;
  }
}
