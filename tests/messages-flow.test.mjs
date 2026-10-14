import assert from "node:assert/strict";
import { test } from "node:test";
import {
  conversationThread,
  otherParticipant,
  pendingThread,
} from "../scripts/apps/content/content-app.mjs";
import { authorizeRequest } from "../scripts/socket/socket-envelope.mjs";

const KAEL = "Actor.kael";
const MIRA = "Actor.mira";
const USER = { character: { uuid: KAEL, name: "Kael" } };

test("otherParticipant devolve o outro lado de uma conversa par", () => {
  const thread = conversationThread(KAEL, MIRA);
  assert.equal(otherParticipant(thread, KAEL), MIRA);
  assert.equal(otherParticipant(thread, MIRA), KAEL);
  assert.equal(otherParticipant(thread, "Actor.outro"), null);
});

test("otherParticipant ignora threads que não são par de personagens", () => {
  assert.equal(otherParticipant(`gm::${MIRA}`, KAEL), null);
  assert.equal(otherParticipant("um-id-solto", KAEL), null);
  assert.equal(otherParticipant(null, KAEL), null);
  assert.equal(otherParticipant(conversationThread(KAEL, MIRA), null), null);
});

test("pendingThread abre conversa vazia para contato novo e ignora o resto", () => {
  const recipients = [{ uuid: MIRA, name: "Mira", initial: "M", hue: 10 }];
  const thread = pendingThread(
    [],
    conversationThread(KAEL, MIRA),
    KAEL,
    recipients,
  );
  assert.equal(thread.id, conversationThread(KAEL, MIRA));
  assert.equal(thread.pending, true);
  assert.equal(thread.last.sender, "Mira");
  assert.deepEqual(thread.lines, []);
  assert.equal(thread.unread, 0);

  // Thread já existente não vira pendente; par inexistente também não.
  assert.equal(
    pendingThread([thread], thread.id, KAEL, recipients),
    null,
  );
  assert.equal(
    pendingThread([], `gm::${MIRA}`, KAEL, recipients),
    null,
  );
  assert.equal(
    pendingThread([], conversationThread(KAEL, MIRA), null, recipients),
    null,
  );
});

test("authorizeRequest: jogador só fala pelo próprio personagem", () => {
  const incoming = {
    fromActorUuid: KAEL,
    toActorUuid: MIRA,
    sender: "Prefeito",
    body: "oi",
  };
  const ok = authorizeRequest("lph-send-message", incoming, USER, false);
  assert.equal(ok.allowed, true);
  // O nome exibido vem do usuário, nunca do cliente.
  assert.equal(ok.payload.sender, "Kael");

  const spoof = authorizeRequest(
    "lph-send-message",
    { ...incoming, fromActorUuid: MIRA },
    USER,
    false,
  );
  assert.equal(spoof.allowed, false);

  const noChar = authorizeRequest("lph-send-message", incoming, {}, false);
  assert.equal(noChar.allowed, false);
});

test("authorizeRequest: notificação de jogador é do próprio celular; Instagram é a exceção", () => {
  const own = authorizeRequest(
    "lph-create-notification",
    { app: "photos", targetActorUuid: KAEL },
    USER,
    false,
  );
  assert.equal(own.allowed, true);

  const other = authorizeRequest(
    "lph-create-notification",
    { app: "photos", targetActorUuid: MIRA },
    USER,
    false,
  );
  assert.equal(other.allowed, false);

  const post = authorizeRequest(
    "lph-create-notification",
    { app: "instagram", targetActorUuid: MIRA, sender: "Falso" },
    USER,
    false,
  );
  assert.equal(post.allowed, true);
  assert.equal(post.payload.sender, "Kael");
});

test("authorizeRequest: telefone (patch/leitura/dispensa) é só o do usuário", () => {
  for (const op of ["lph-update-phone", "lph-mark-read", "lph-dismiss"]) {
    const ok = authorizeRequest(op, { actorUuid: KAEL }, USER, false);
    assert.equal(ok.allowed, true, op);
    const nope = authorizeRequest(op, { actorUuid: MIRA }, USER, false);
    assert.equal(nope.allowed, false, op);
  }
});

test("authorizeRequest: GM passa sem restrição e não é reescrito", () => {
  const payload = { targetActorUuid: MIRA, sender: "Narrador" };
  const ok = authorizeRequest(
    "lph-create-notification",
    payload,
    { isGM: true },
    true,
  );
  assert.equal(ok.allowed, true);
  assert.equal(ok.payload.sender, "Narrador");
});
