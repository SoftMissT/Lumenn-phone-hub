import { Logger } from "./core/logger.mjs";
import { registerLifecycle } from "./core/lifecycle.mjs";
import { getFoundryVersionInfo } from "./compat/foundry-compat.mjs";

// game.version só é preenchido no init. Lido no topo do módulo, registrava
// "[Lumenn] Carregando (Foundry 0)." — a linha de boot do módulo mentia.
Hooks.once("init", () => {
  const { version, generation } = getFoundryVersionInfo();
  Logger.info(`Carregando (Foundry ${version}, geração ${generation}).`);
});

registerLifecycle();
