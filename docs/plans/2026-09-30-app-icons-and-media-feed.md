# App Icons & Media Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dar logo e cor de marca aos apps na tela inicial e transformar Instagram, Fotos, Notícias e Spotify em apps de mídia de verdade, com upload de imagem na Central do GM.

**Architecture:** Um primitivo — `image` em `normalizeNotification` — desbloqueia os quatro apps de mídia. Nada de store novo por app: todos leem o mesmo pipeline de notificações. Os logos entram como dois campos novos no contrato de app (`brand` + `tile`), renderizados como ladrilho colorido. O Instagram ganha template próprio (stories + feed + tab bar) por ser o único com estrutura visual distinta.

**Tech Stack:** Foundry VTT 14.367 · ESM nativo `.mjs` · Handlebars · Font Awesome 7 (nativo do Foundry) · `node --test` (sem framework).

---

## Pesquisa que fundamenta este plano

### Instagram (estrutura 2026)

Fontes: Social Media Today, Mashable, Engadget, Inrō (2025-09 → 2026-02).

- Navegação inferior: **Home · Reels · DMs · Busca · Perfil**. O botão "+" de postar saiu da barra e foi para o topo-esquerda.
- **Stories** ficam no topo do feed, em círculos com anel em gradiente.
- Post de feed é **imagem 4:5 (1080×1350)**; carrossel 3:4 (1080×1440); Reels 9:16 (1080×1920).
- Meta declara Reels + DMs como ~50% do tempo no app — mas **não há pipeline de vídeo neste módulo**, então Reels fica fora de escopo.

**Consequência de projeto:** o app precisa de **mídia**, não de lista de texto.

### Logo dos apps

Verificado localmente em `D:\Foundry vtt app data\Foundry Virtual Tabletop\resources\app\public\`:

- `fonts\fontawesome\webfonts\fa-brands-400.woff2` — 110.076 B
- `fonts\fontawesome\css\all.min.css` linha 9 → `--fa-family-brands:"Font Awesome 7 Brands"`

Ou seja: `fa-brands fa-instagram` e `fa-brands fa-spotify` funcionam **nativamente**, sem asset novo.

Mas glifo sozinho não é logo. Ícone real de celular = **quadrado arredondado + cor da marca + glifo branco**. Daí os campos `brand` (glifo) e `tile` (fundo).

### Infraestrutura reaproveitada (não reescrever)

| O que | Onde |
|---|---|
| Upload de arquivo | `scripts/compat/file-picker-compat.mjs` → `uploadFile`, `canUploadFiles` |
| Padrão de upload comprovado | `scripts/wallpaper/wallpaper-service.mjs:136-168` |
| Validação de imagem (tipo, bytes, dimensões) | `validateFile` em `wallpaper-service.mjs:74` |
| Validação de URL/caminho | `validateSourceUrl` em `wallpaper-validator.mjs:155` |
| Diretório de destino | `WALLPAPER_DIRECTORY = "lumenn-phone-hub"` |
| Recibo de leitura | `PhoneController.markNotificationsRead(actorUuid, ids)` em `phone-controller.mjs:23` |

### Armadilha conhecida

`scripts/apps/app-contract.mjs:33` monta o objeto final **na mão** (whitelist). Todo campo novo precisa entrar em `APP_CONTRACT_FIELDS` **e** no `Object.freeze({...})`, senão é descartado em silêncio.

---

## Convenções globais

| Regra | Como |
|---|---|
| Gate antes de cada commit | `node tools/gate.mjs` → espera `GATE VERDE` |
| Commits | pt-BR **com acentos**, convencional: `feat:`, `fix:`, `test:` |
| Testes | `node --test tests/<arquivo>.test.mjs` |
| Nunca | enfraquecer teste para passar; mover tag publicada |
| Corrigir | a causa raiz, não o sintoma |

---

## Pipeline de execução (paralelismo)

Frentes só são paralelizáveis quando **não escrevem nos mesmos arquivos**.

**Onda 1 — 3 agentes paralelos (arquivos disjuntos):**

| Agente | Escopo | Arquivos |
|---|---|---|
| A | Gate único | `tools/gate.mjs` |
| B | Campo `image` | `notification-model.mjs`, `tests/notification-model.test.mjs` |
| C | Logos e ladrilhos | `content-catalog.mjs`, `app-contract.mjs`, `settings-app.mjs`, `content-app.mjs`, `phone-shell.mjs`, `home-screen.hbs`, `lumenn-phone.css`, `tests/content-catalog.test.mjs` |

**Onda 2 — 2 agentes paralelos (arquivos disjuntos):**

| Agente | Escopo | Arquivos |
|---|---|---|
| D | Mídia + Instagram (JS/templates) | `content-app.hbs`, `templates/apps/instagram.hbs`, `content-app.mjs`, `content-catalog.mjs`, `tests/content-store.test.mjs` |
| E | Central do GM + todo o CSS | `gm-central-app.mjs`, `control-center.hbs`, `lang/*.json`, `styles/lumenn-phone.css` |

**Onda 3 — serializado (depende de D):**

- Recibo de leitura (`content-app.mjs`) — Task 8
- Gate completo, commit, smoke test no Foundry vivo, decisão de release

---

### Task 1: Gate único do projeto

Hoje o gate existe só como bloco PowerShell colado no chat — é fácil pular. Vira um arquivo.

**Files:** Create `tools/gate.mjs`

```js
#!/usr/bin/env node
// Gate único: sintaxe, JSON, paridade i18n, CSS/HBS balanceados, testes.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  FALHA: ${msg}`); };

function walk(dir, ext, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, ext, out);
    else if (path.endsWith(ext)) out.push(path);
  }
  return out;
}

console.log("1/5 sintaxe");
const sources = [...walk(join(root, "scripts"), ".mjs"), ...walk(join(root, "tests"), ".mjs")];
for (const file of sources) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); }
  catch (error) { fail(`${file}\n${error.stderr}`); }
}
console.log(`  ${sources.length} arquivos`);

console.log("2/5 JSON");
for (const rel of ["module.json", "lang/en.json", "lang/pt-BR.json"]) {
  try { JSON.parse(readFileSync(join(root, rel), "utf8")); console.log(`  ok: ${rel}`); }
  catch (error) { fail(`${rel}: ${error.message}`); }
}

console.log("3/5 i18n");
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flat(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
const pt = new Set(flat(JSON.parse(readFileSync(join(root, "lang/pt-BR.json"), "utf8"))));
const en = new Set(flat(JSON.parse(readFileSync(join(root, "lang/en.json"), "utf8"))));
for (const key of pt) if (!en.has(key)) fail(`só em pt-BR: ${key}`);
for (const key of en) if (!pt.has(key)) fail(`só em en: ${key}`);
console.log(`  ${pt.size} chaves`);

console.log("4/5 CSS/HBS");
const css = readFileSync(join(root, "styles/lumenn-phone.css"), "utf8");
const opens = (css.match(/\{/g) ?? []).length;
const closes = (css.match(/\}/g) ?? []).length;
if (opens !== closes) fail(`CSS ${opens} abre / ${closes} fecha`);
for (const file of walk(join(root, "templates"), ".hbs")) {
  const src = readFileSync(file, "utf8");
  const o = (src.match(/\{\{#(if|each|unless|with)[^}]*\}\}/g) ?? []).length;
  const c = (src.match(/\{\{\/(if|each|unless|with)\}\}/g) ?? []).length;
  if (o !== c) fail(`${file} ${o} abre / ${c} fecha`);
}
console.log("  ok");

console.log("5/5 testes");
try { execFileSync(process.execPath, ["--test"], { stdio: "inherit", cwd: root }); }
catch { failures += 1; }

console.log(failures === 0 ? "\nGATE VERDE" : `\nGATE VERMELHO (${failures})`);
process.exit(failures === 0 ? 0 : 1);
```

Run: `node tools/gate.mjs` → `GATE VERDE`

---

### Task 2: Catálogo com marca e cor do ladrilho

**Files:** Modify `scripts/apps/content/content-catalog.mjs` · Create `tests/content-catalog.test.mjs`

Adicionar `brand` e `tile` em cada entrada, mantendo `icon` como fallback:

| app | `brand` | `tile` |
|---|---|---|
| messages | `fas fa-comment-dots` | `#22C55E` |
| instagram | `fa-brands fa-instagram` | `linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)` |
| photos | `fas fa-images` | `linear-gradient(135deg,#F59E0B,#EA580C)` |
| bank | `fas fa-landmark` | `#1A56DB` |
| news | `fas fa-newspaper` | `#E03131` |
| spotify | `fa-brands fa-spotify` | `#1DB954` |

Testes: todo app tem `brand` (classe FA) e `tile` (hex ou gradiente); Instagram/Spotify usam `fa-brands`; nenhum ladrilho branco (glifo sumiria).

---

### Task 3: Contrato de app aceita `brand` e `tile`

**Files:** Modify `app-contract.mjs`, `settings-app.mjs`, `content-app.mjs`, `phone-shell.mjs`, `home-screen.hbs`, `styles/lumenn-phone.css`

`APP_CONTRACT_FIELDS` ganha `"brand"` e `"tile"`; `normalizeAppDefinition` os normaliza (`brand` cai no `icon` quando ausente → apps legados continuam funcionando).

`#mapApps` em `phone-shell.mjs` passa `icon: app.brand ?? app.icon` e `tile: app.tile ?? null`.

`home-screen.hbs` aplica o fundo: `style="background:{{this.tile}}"` quando presente.

Settings ganha `brand: "fas fa-cog"`, `tile: "#6B7280"`.

CSS: `.lph-app-glyph.lph-app-tile { color:#fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 2px 6px rgba(0,0,0,.35); }`

---

### Task 4: Campo `image` na notificação

**Files:** Modify `notification-model.mjs:53` · Test `tests/notification-model.test.mjs`

`image` passa pelo `validateSourceUrl` já existente — caminho do Foundry ou https terminando em extensão de imagem. Qualquer outra coisa vira `null` em vez de virar vetor no `<img src>`.

Testes: guarda imagem válida; rejeita `javascript:`, link de página `.html`, string vazia, ausente.

---

### Task 5: Upload de imagem na Central do GM

**Files:** Modify `gm-central-app.mjs`, `control-center.hbs`, `lang/pt-BR.json`, `lang/en.json`

Campo `<input type="file" accept="image/png,image/jpeg,image/webp,image/avif">` após o Sender. Handler reusa `validateFile` + `canUploadFiles` + `uploadFile` (path `WALLPAPER_DIRECTORY`, `source: "data"`, `notify: false`). O `imageUrl` resultante entra no `payload.image` e é zerado no `form.reset()`.

i18n: `LPH.GM.Image` = `"Imagem (opcional)"` / `"Image (optional)"`.

---

### Task 6: Cards com imagem + Fotos em grade + Spotify com capa

**Files:** Modify `templates/apps/content-app.hbs`, `styles/lumenn-phone.css`

`{{#if this.image}}<img class="lph-card-image" src="{{this.image}}" alt="" loading="lazy">{{/if}}` após `.lph-card-head`.

CSS por app via `[data-lph-content="..."]` (o hook já existe no template): photos = grade 3 colunas só com imagem; news = 16:9; spotify = capa 72px ao lado do texto.

---

### Task 7: Instagram de verdade

**Files:** Create `templates/apps/instagram.hbs` · Modify `content-catalog.mjs`, `content-app.mjs`, `lumenn-phone.css` · Test `tests/content-store.test.mjs`

- `buildStories(items, limit = 8)` — remetentes com imagem, deduplicados, máximo 8. Exportada para teste.
- Spec do Instagram ganha `template: "apps/instagram.hbs"` e `stories: true`.
- `render` usa `${spec.template ?? "apps/content-app.hbs"}`.
- Template: stories bar (anel em gradiente), post (avatar + nome + mídia 4:5 + ações + legenda), tab bar sticky no pé (Home · Reels · DMs · Busca · Perfil).

---

### Task 8: Recibo de leitura

**Files:** Modify `content-app.mjs` (`onOpen`)

Ao abrir o app, os itens `unread` daquele app viram lidos via `PhoneController.markNotificationsRead`. GM executa direto; jogador roteia por socket (`lph-mark-read`). Falha não bloqueia a UI.

---

### Task 9: Smoke test no Foundry vivo + decisão de release

O gate **não prova runtime** — foi esse buraco que deixou o `v0.0.1` sair 12/12 verde e não abrir.

1. Backup: copiar a instalação do operador para `.orig`
2. Copiar o módulo (robocopy `/MIR`, excluindo `.git`, `.gitnexus`, `.playwright-mcp`, `node_modules`)
3. Checklist manual via Playwright em `http://26.89.241.33:30000/`: ladrilhos coloridos, upload, Instagram com stories e mídia, Fotos em grade, Spotify com capa, badge zerando, caso sem imagem, console limpo
4. Restaurar `.orig` se algo quebrar
5. Commit final e perguntar sobre o release (o operador pediu para esperar os apps)

---

## Escopo recusado (YAGNI)

| Item | Motivo |
|---|---|
| Reels / vídeo | Não existe pipeline de vídeo; seria invenção nova |
| Curtir/comentar de verdade | Nenhum requisito; chrome visual |
| DM dentro do Instagram | App Mensagens já cobre conversas |
| Postar pelo jogador | O GM é quem publica neste módulo |
| Avatar por personagem | Exigiria campo novo + fetch de arte |
