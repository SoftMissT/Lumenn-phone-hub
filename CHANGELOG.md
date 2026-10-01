# Changelog

Todas as mudanças relevantes deste módulo são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adere a [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.0.10] — 2026-10-01

**Correção do shell, modelos e apps do celular.**

### Corrigido

- Removidos os perfis fictícios PearPhone e Nokia Flip; os modelos agora são iPhone, Xiaomi, Oppo e Samsung.
- Wallpapers deixam de ser cobertos pelos gradientes dos perfis Oppo, Samsung e Xiaomi.
- Mensagens passa a ocupar toda a tela útil, com histórico rolável e composer preso ao rodapé da conversa.
- Notificações da tela de bloqueio podem ser limpas individualmente ou em lote.
- Instagram agora mantém uma HUD reconhecível mesmo sem publicações, com cabeçalho, stories, feed vazio e navegação inferior.

### Validação

- Gate local: 60/60 testes.
- `git diff --check` limpo.
- QA visual/runtime do Foundry fica para o operador.

## [0.0.9] — 2026-10-01

**Refino visual e correção do fluxo de Mensagens.**

### Alterado

- Home com perfis visuais distintos para PearPhone, Xiaomi, Samsung, Oppo e Nokia Flip.
- Shell com tipografia de sistema, safe-area visual, superfícies mais discretas, contraste e alvos de toque maiores.
- Cabeçalho de apps e Ajustes alinhados ao padrão de navegação iOS, preservando Handlebars/CSS puro e a arquitetura do Foundry.

### Corrigido

- Mensagens não usa mais uma linha `role="button"` contendo outro botão; abrir conversa e voltar agora são controles nativos separados para clique e teclado.
- Apps do dock não aparecem duplicados na grade.
- Modelo do aparelho no Ajustes é aplicado imediatamente aos shells abertos quando alterado pelo GM.

### Validação

- Gate local: 60/60 testes.
- QA visual/runtime do Foundry fica para o operador; esta release não declara essa validação.

## [0.0.5] — 2026-09-30

**Correções de runtime.** Quatro defeitos relatados no QA real.

### Corrigido

- **Não havia como fechar o celular.** O shell é frameless, então o Foundry não desenha botão de janela nenhum — e nenhuma das ações do telefone fechava a janela. Adicionado um botão de fechar no canto direito da barra de status, visível em todas as telas (bloqueio, início e app).
- **O som de digitação empilhava e não parava.** Duas causas somadas: o asset `keyboard.mp3` tem **22,7 segundos** (um clique deveria ter ~80 ms), e o `playSound` passava `onlyOnce: false`, o que faz o Foundry **guardar** cada instância. Agora a instância anterior é parada antes de a nova tocar, o que impede o empilhamento com qualquer asset. A troca do arquivo por um clique curto segue recomendada.
- **`onlyOnce` vazava para dentro do objeto de áudio** do Foundry (o espalhamento de `options` o levava junto). Agora é separado da carga útil.
- **Link de página do Imgur/Pinterest era rejeitado com mensagem genérica.** O validador exige extensão de imagem, o que está correto — o navegador baixaria HTML. Agora ele **reconhece link de página** e diz exatamente o que fazer: copiar o endereço direto da imagem (`i.imgur.com/...`, `i.pinimg.com/...`).

### Alterado

- `compatibility.maximum` passa a ser `"14.999"`. Sem ele, o Foundry acusava risco de compatibilidade em qualquer versão acima da verificada. O `verified` continua `14.356`.

## [0.0.4] — 2026-09-30

**Correção de posicionamento da janela.** O celular quebrava a HUD do Foundry e não ficava centralizado.

### Corrigido

- **A janela era renderizada fora da interface e encolhia a HUD.** Com `window.frame: false`, o core **não adiciona a classe `application`** ao elemento raiz — e é essa classe que carrega `position` no `foundry2.css`. Sem ela, o elemento caía no layout flex do `body.game`, virava sibling da `#interface` (que perdia os 360px da janela), ancorava no canto superior-direito e **ignorava o `left/top` centralizado que o próprio Foundry calculava**.
  - Medido em runtime no v14.367, viewport 1920×945: a janela abria em `x=1560, y=0` e a `#interface` caía de 1920 para 1560px.
  - Correção: uma regra para `.lumenn-phone-app-window` com `position: fixed` e `z-index: var(--z-index-window)`. **Sem JS** — o `_updatePosition` do core já calcula o centro; faltava o elemento ter `position` para o `left/top` valer.
  - Depois da correção: `x=780, y=113` (centro exato) e `#interface` intacta em 1920px.

### Removido

- **Código morto da trava de proporção** — o `_onPosition`, o método privado da trava 1:2 e as constantes — e o `resizable: true`. Com `frame: false` o core **nunca insere o handle de resize**; redimensionamento por arrasto é impossível nesse modo e a trava jamais executava.

> [!NOTE]
> **Este defeito existe desde o `0.0.1`.** O `0.0.2` "funcionou" no sentido de que o telefone passou a abrir; o posicionamento nunca foi exercitado porque o QA em runtime estava pendente. A afirmação de "janela redimensionável" publicada no `0.0.3` era incorreta e foi corrigida na entrada daquela versão.

## [0.0.3] — 2026-09-29

**Configuração do GM e responsividade.**

### Adicionado

**Configuração do GM** — o mundo passa de 5 para **12 opções**, na tela nativa do Foundry (*Configurações → Configurar Definições → Lumenn Phone Hub*):

- **Tema padrão do mundo** e **som padrão do mundo** — valem para quem ainda não escolheu o seu; a escolha do jogador continua prevalecendo.
- **Máximo de notificações** (10–2000) e **retenção em dias** (0–365) — controlam o crescimento do estado do mundo.
- **Som de digitação**, **banner de notificação** e **upload de wallpaper pelo jogador** — flags por mundo.

**Responsividade** — conforme o PDR:

- A janela mantém o formato retrato e o **min/max** de tamanho legível (`280 × 560` como mínimo).
- **Teto de altura** que impede a janela de alcançar a hotbar.
- **Aviso:** o redimensionamento pelo usuário **não** está disponível — o handle de resize do Foundry exige `window.frame: true`, e o shell é frameless de propósito. `resizable` é no-op nesse modo e não é prometido.

### Alterado

- `theme` e `notificationSoundEnabled` viraram **tri-state**: vazio significa "seguir o padrão do mundo".
- `scripts/core/preferences.mjs` concentra a resolução de preferências.
- O texto do PIN em Ajustes agora diz que a senha não protege também **contra quem administra o servidor**.
- Formatação do repositório passada por prettier, sem mudança de comportamento.

### Corrigido

- **`RF-023`**: apps desabilitados pelo GM agora saem da grade e do dock de todos os celulares. O filtro estava na spec desde o Blueprint, mas não existia no código.
- Os limites de notificação e as flags passaram a ter **efeito real** — nenhum controle da tela do GM é decorativo.

## [0.0.2] — 2026-09-29

**Correção de runtime.** O `0.0.1` não abria o telefone.

### Corrigido

- **O telefone não renderizava.** `phone-shell.hbs` inclui quatro partials (`status-bar`, `lock-screen`, `pin-pad`, `home-screen`) com `{{> "caminho"}}`, mas nada no módulo chamava `loadTemplates()` — resultando em `The partial modules/lumenn-phone-hub/templates/phone/status-bar.hbs could not be found`.
  - O `ApplicationV2` carrega automaticamente **apenas** os templates declarados em `PARTS`. Partials referenciados dentro deles exigem registro explícito.
  - `TEMPLATE_PARTIALS` centraliza a lista dos partials em `constants.mjs`.
  - `preloadTemplates()` na camada de compatibilidade: memoizado, com fallback para o `loadTemplates` global e erro contido para nunca rejeitar.
  - Pré-carga no hook `init` (aquece o cache em paralelo ao boot) e garantia em `_preFirstRender` do shell — determinístico, sem depender de timing.

> [!NOTE]
> O gate local (`node --test`, 12 suítes) **não** cobre carregamento de template: as suítes rodam em Node puro, sem Foundry, sem Handlebars. Verde local não é evidência de que o módulo abre — só o QA em runtime é.

## [0.0.1] — 2026-09-29

Primeiro release. **Fase 1 — fundação, shell e ferramentas de GM.**

### Adicionado

**Phone Shell**
- Moldura retrato com barra de status (sinal, Wi-Fi, bateria), notch genérico e indicador inferior.
- Tela de bloqueio, home screen, dock, grade de apps e navegação interna.
- Temas **claro** e **escuro**, alternáveis por jogador.
- Ponto de entrada na barra de controles de cena (grupo *Celular (Lumenn)*).

**PIN e bloqueio**
- PIN **opcional** de exatamente **6 dígitos**, guardado como hash + salt.
- Throttling e **lockout progressivo** contra tentativas repetidas.
- Política que rejeita PINs triviais.
- Interface de criar / trocar / remover em **Ajustes → Segurança**.
- Reset de PIN pelo GM.

**KDF**
- Derivador primário via WebCrypto e **fallback em JavaScript puro** (SHA-256 + HMAC-SHA-256 + PBKDF2), para ambientes onde `crypto.subtle` não está disponível.
- Fallback validado contra a WebCrypto do Node em até 80.000 iterações.

**Wallpaper**
- Wallpaper **por personagem**, com validação de tipo, tamanho e dimensões.
- Escolha pelo seletor do Foundry ou upload do computador.
- Wallpaper padrão do mundo e reset pelo GM.

**Notificações**
- Banner na tela, com som configurável.
- Badge de não lidas e notificações na tela de bloqueio.
- Estados **unread / read / dismissed**.
- Persistência narrativa com expiração padrão de 7 dias e limite de 200 por personagem.

**Relógio do mundo**
- Fuso horário IANA configurável.
- **Ano narrativo** substituível e **rótulo de era** livre.
- Formato de 12 e 24 horas.

**Ferramentas de GM**
- **Central do GM**: envio de notificações para um personagem, vários ou todos os elegíveis.
- **Modo GM**: GM abre o celular de qualquer personagem, com faixa de identificação.
- Reset de PIN e de wallpaper por personagem.

**Acessibilidade**
- Navegação completa por teclado e foco visível.
- Regiões `aria-live` para notificações.
- Suporte a `prefers-reduced-motion`, `prefers-contrast` e `forced-colors`.
- Opção **Reduzir efeitos visuais** dentro de Ajustes.

**Infraestrutura**
- Camada de compatibilidade isolando as diferenças entre Foundry **v13** e **v14**.
- **App Registry** com contrato público — apps de conteúdo se registram por API, e nenhum ícone vazio é exibido.
- Socket v1 com envelope versionado, limite de tamanho, rate limit e timeout.
- Repository e journal store com versionamento de schema e migrations.
- Camada de validação de texto, ids e URLs.
- internacionalização **en** e **pt-BR**.
- API pública exposta em `game.modules.get("lumenn-phone-hub").api`.
- Macro de abertura para uso quando a barra de controles estiver indisponível.
- Áudio diegético: som de notificação e som de digitação, ambos silenciáveis.

### Notas

- **Foundry:** mínimo `13.350`, verificado `14.356`. O QA em runtime nas duas versões **ainda está pendente** — este release é a fundação em código.
- **System-agnostic:** não exige sistema, adaptadores ou backend externo.
- **PIN:** é um lock de privacidade diegético entre jogadores. Não é autenticação forte, não criptografa dados e não protege contra o GM ou o DevTools do navegador.
- **Fora do escopo da Fase 1:** Mensagens, redes sociais, Banco, Notícias, Spotify, IA para NPCs, adaptadores por sistema, criptografia ponta-a-ponta e push fora do Foundry. A arquitetura já os acomoda via App Registry.

[0.0.10]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.10
[0.0.9]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.9
[0.0.8]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.8
[0.0.7]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.7
[0.0.6]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.6
[0.0.5]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.5
[0.0.4]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.4
[0.0.3]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.3
[0.0.2]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.2
[0.0.1]: https://github.com/SoftMissT/Lumenn-phone-hub/releases/tag/v0.0.1
