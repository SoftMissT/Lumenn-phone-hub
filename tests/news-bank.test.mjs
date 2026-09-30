import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildConversationLines,
  computeBalance,
  conversationThread,
  formatAmount,
  headlineExcerpt,
  isCredit,
} from "../scripts/apps/content/content-app.mjs";
import { normalizeNotification } from "../scripts/notifications/notification-model.mjs";

// formatAmount: sinal obrigatório, símbolo opcional prefixado ao número.
// Crédito é "+", débito é "-", zero é "±" (não é nem um nem outro).
test("formatAmount assina o valor e prefixa o símbolo quando houver", () => {
  assert.equal(formatAmount(12.5, "$", "pt-BR"), "+$12,50");
  assert.equal(formatAmount(-3.25, "$", "pt-BR"), "-$3,25");
  assert.equal(formatAmount(1000, "", "pt-BR"), "+1.000,00");
  assert.equal(formatAmount(-0.5, "", "pt-BR"), "-0,50");
});

test("formatAmount trata zero como ± e valor ausente/inválido como vazio", () => {
  assert.equal(formatAmount(0, "", "pt-BR"), "±0,00");
  assert.equal(formatAmount(0, "$", "pt-BR"), "±$0,00");
  assert.equal(formatAmount(null, "$"), "");
  assert.equal(formatAmount(undefined, "$"), "");
  assert.equal(formatAmount(NaN, "$"), "");
  assert.equal(formatAmount(Infinity, "$"), "");
});

test("formatAmount arredonda para duas casas, sem perder o inteiro", () => {
  assert.equal(formatAmount(12.345, "$", "pt-BR"), "+$12,35");
  assert.equal(formatAmount(-12.344, "$", "pt-BR"), "-$12,34");
  assert.equal(formatAmount(7, "$", "pt-BR"), "+$7,00");
});

// computeBalance: soma só os valores finitos; sem nenhum valor, null (não 0),
// para a interface não mostrar um saldo que não existe.
test("computeBalance soma os amounts válidos e ignora o resto", () => {
  assert.equal(computeBalance([{ amount: 10 }, { amount: -4.5 }]), 5.5);
  assert.equal(computeBalance([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
  assert.equal(computeBalance([{ amount: 10 }, { amount: null }, {}]), 10);
});

test("computeBalance devolve null sem nenhum valor e zero normal sem -0", () => {
  assert.equal(computeBalance([]), null);
  assert.equal(computeBalance(), null);
  assert.equal(computeBalance([{ amount: null }, { amount: "x" }, {}]), null);
  assert.ok(Object.is(computeBalance([{ amount: 10 }, { amount: -10 }]), 0));
});

test("isCredit é true só para valor positivo finito", () => {
  assert.equal(isCredit(10), true);
  assert.equal(isCredit(0.01), true);
  assert.equal(isCredit(0), false);
  assert.equal(isCredit(-1), false);
  assert.equal(isCredit(null), false);
  assert.equal(isCredit(NaN), false);
});

// headlineExcerpt: trecho de uma linha, cortado em limite de palavra.
test("headlineExcerpt devolve o texto inteiro quando cabe", () => {
  assert.equal(headlineExcerpt("Uma frase curta", 50), "Uma frase curta");
});

test("headlineExcerpt corta na última palavra inteira antes do limite", () => {
  assert.equal(
    headlineExcerpt("Governo anuncia nova política de transporte para a capital", 24),
    "Governo anuncia nova…",
  );
});

test("headlineExcerpt não corta palavra no meio quando há espaço", () => {
  const body = "A prefeitura anunciou hoje um novo plano de mobilidade urbana";
  const excerpt = headlineExcerpt(body, 30);
  assert.ok(excerpt.endsWith("…"));
  const head = excerpt.slice(0, -1);
  assert.ok(body.startsWith(head));
  assert.equal(body[head.length], " ");
});

test("headlineExcerpt colapsa espaços e quebras de linha em uma linha só", () => {
  assert.equal(headlineExcerpt("linha\ncom   espaços", 100), "linha com espaços");
});

test("headlineExcerpt lida com vazio e com palavra única maior que o limite", () => {
  assert.equal(headlineExcerpt("", 10), "");
  assert.equal(headlineExcerpt(null, 10), "");
  assert.equal(headlineExcerpt("supercalifragilisticoespialidoso", 10), "supercalif…");
});

// O modelo ganha amount: número finito ou null.
test("normalizeNotification guarda amount finito e normaliza o resto para null", () => {
  assert.equal(normalizeNotification({ amount: 12.5 }).amount, 12.5);
  assert.equal(normalizeNotification({ amount: 0 }).amount, 0);
  assert.equal(normalizeNotification({ amount: -30 }).amount, -30);
  assert.equal(normalizeNotification({ amount: "12" }).amount, null);
  assert.equal(normalizeNotification({ amount: NaN }).amount, null);
  assert.equal(normalizeNotification({ amount: Infinity }).amount, null);
  assert.equal(normalizeNotification({}).amount, null);
});

test("formatAmount responde a lingua pedida (separador de milhar e decimal)", () => {
  assert.equal(formatAmount(1234.5, "$", "pt-BR"), "+$1.234,50");
  assert.equal(formatAmount(1234.5, "$", "en-US"), "+$1,234.50");
  assert.equal(formatAmount(1000, "R$", "pt-BR"), "+R$1.000,00");
});

// A conversa entre dois personagens tem que cair no MESMO balde nos dois
// celulares. Sem simetria, remetente e destinatário veriam duas conversas
// separadas - cada um falando sozinho.
test("conversationThread e simetrico e estavel", () => {
  const a = "Actor.aaa";
  const b = "Actor.bbb";
  assert.equal(conversationThread(a, b), conversationThread(b, a));
  assert.equal(conversationThread(a, b), conversationThread(a, b));
  assert.notEqual(conversationThread(a, b), conversationThread(a, "Actor.ccc"));
  assert.ok(conversationThread(a, b).includes(a));
  assert.ok(conversationThread(a, b).includes(b));
});

test("conversationThread nao quebra com ator ausente", () => {
  assert.equal(typeof conversationThread(null, "Actor.bbb"), "string");
  assert.equal(typeof conversationThread(undefined, undefined), "string");
});

// O chat precisa de separador quando o dia vira, e de avatar/nome so quando a
// pessoa muda - repetir em rajada polui, e faltando o nome ninguem sabe quem
// falou depois de um separador.
test("buildConversationLines separa por dia e agrupa por remetente", () => {
  const clockOf = (createdAt) => ({
    date: String(createdAt).slice(0, 10),
    time: "12:00",
  });
  const msgs = [
    { id: "1", sender: "Ana", body: "oi", createdAt: "2026-09-30T10:00:00Z" },
    { id: "2", sender: "Ana", body: "tudo bem?", createdAt: "2026-09-30T10:01:00Z" },
    { id: "3", sender: "Bia", body: "oi", createdAt: "2026-09-30T10:02:00Z" },
    { id: "4", sender: "Ana", body: "voltei", createdAt: "2026-10-01T09:00:00Z" },
  ];
  const lines = buildConversationLines(msgs, "Bia", clockOf);
  const datas = lines.filter((l) => l.isDate).map((l) => l.label);
  assert.deepEqual(datas, ["2026-09-30", "2026-10-01"]);

  const ms = lines.filter((l) => !l.isDate);
  assert.equal(ms.length, 4);
  assert.equal(ms[0].opensGroup, true, "primeira fala abre o grupo");
  assert.equal(ms[1].opensGroup, false, "rajada da mesma pessoa nao repete");
  assert.equal(ms[2].mine, true, "Bia sou eu");
  assert.equal(ms[2].opensGroup, true, "eu sempre abro grupo");
  assert.equal(ms[3].opensGroup, true, "depois do separador o nome volta");
  assert.equal(ms[3].time, "12:00");
  assert.equal(ms[0].initial, "A");
});

test("buildConversationLines tolera lista vazia e mensagem sem data", () => {
  assert.deepEqual(buildConversationLines([], "Bia", () => null), []);
  const semData = buildConversationLines(
    [{ id: "x", sender: "Ana", body: "oi" }],
    "Bia",
    () => null,
  );
  assert.equal(semData.length, 1);
  assert.equal(semData[0].time, "");
  assert.equal(semData.filter((l) => l.isDate).length, 0);
});
