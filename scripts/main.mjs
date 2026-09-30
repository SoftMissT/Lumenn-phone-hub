import { Logger } from "./core/logger.mjs";
import { registerLifecycle } from "./core/lifecycle.mjs";
import { getFoundryVersionInfo } from "./compat/foundry-compat.mjs";

Logger.info(`Carregando (Foundry ${getFoundryVersionInfo().version}).`);
registerLifecycle();
