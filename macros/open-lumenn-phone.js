/**
 * Macro: Abrir Lumenn Phone
 * Abre a interface do smartphone para o personagem selecionado ou controlado.
 */
(async () => {
  const module = game.modules.get("lumenn-phone-hub");
  if (!module?.api) {
    ui.notifications.warn(
      "O módulo Lumenn Phone Hub ainda não está carregado.",
    );
    return;
  }

  const speaker = ChatMessage.getSpeaker();
  let actor = null;
  if (speaker.actor) actor = game.actors.get(speaker.actor);
  if (!actor && game.user.character) actor = game.user.character;

  module.api.openPhone({ actorUuid: actor ? actor.uuid : null });
})();
